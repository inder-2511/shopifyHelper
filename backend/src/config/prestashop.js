import axios from "axios";
import { XMLParser, XMLBuilder } from "fast-xml-parser";

// ---------------------------------------------------------------------------
// PrestaShop Webservice client.
//
//  - Auth is HTTP Basic: the API key is the username, the password is empty.
//  - Reads ask for JSON (output_format=JSON). Writes MUST be sent as XML —
//    PrestaShop's webservice only accepts XML bodies on POST/PUT.
//  - Every store hosts its own API at <shop>/api, so there is no shared host.
// ---------------------------------------------------------------------------

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  parseTagValue: false, // keep "0012" / "1.50" exactly as the store sent them
  parseAttributeValue: false,
});

const builder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  format: false,
  suppressEmptyNode: false,
  // Wrap every text value in CDATA so '&', '<' in names/descriptions are safe.
  cdataPropName: "__cdata",
});

/**
 * "myshop.com", "http://localhost:8080/", "https://shop.com/api" → base URL
 * without a trailing slash or /api. Bare hosts default to https; localhost and
 * private-network hosts default to http because dev stores rarely have TLS.
 */
export const normalizeShopUrl = (raw) => {
  let v = String(raw ?? "").trim();
  if (!v) throw new Error("Shop URL is required");
  if (!/^https?:\/\//i.test(v)) {
    const isLocal = /^(localhost|127\.|10\.|192\.168\.|\[::1\])/i.test(v) || /\.(test|localhost)(:|\/|$)/i.test(v);
    v = `${isLocal ? "http" : "https"}://${v}`;
  }
  return v.replace(/\/+$/, "").replace(/\/api$/i, "");
};

/** Plain-object view of an axios error that the controller can send back. */
const parseErrorBody = (data) => {
  if (data == null || data === "") return null;
  if (typeof data === "object") return data;
  const text = String(data);
  if (/^\s*</.test(text)) {
    try {
      const xml = parser.parse(text);
      const errs = xml?.prestashop?.errors?.error;
      if (errs) {
        const list = Array.isArray(errs) ? errs : [errs];
        return {
          errors: list.map((e) => ({
            code: e.code,
            message: typeof e.message === "object" ? e.message["#text"] : e.message,
          })),
        };
      }
    } catch {
      /* fall through to raw text */
    }
    if (/<(!doctype|html)/i.test(text)) {
      return { errors: [{ code: "html", message: "Got an HTML page instead of API data — is the Webservice enabled, and is the Shop URL the store root?" }] };
    }
  }
  return { errors: [{ code: "raw", message: text.slice(0, 2000) }] };
};

export const createPrestaApi = (shopUrl, apiKey) => {
  if (!apiKey || !String(apiKey).trim()) throw new Error("API key is required");
  const base = normalizeShopUrl(shopUrl);
  const api = axios.create({
    baseURL: `${base}/api`,
    auth: { username: String(apiKey).trim(), password: "" },
    timeout: 30000,
    // Let us read the body of 4xx/5xx ourselves.
    transformResponse: [(d) => d],
  });
  api.shopBase = base;
  return api;
};

/**
 * Run one request and normalise the outcome:
 *  - success → parsed JSON (empty list responses come back as `[]` — keep as is)
 *  - failure → throws an Error that carries { status, body, sentPayload }
 */
const request = async (api, config, sentPayload) => {
  try {
    const res = await api.request(config);
    const text = typeof res.data === "string" ? res.data : JSON.stringify(res.data ?? "");
    if (!text.trim()) return { data: null, headers: res.headers };
    if (/^\s*</.test(text)) return { data: parser.parse(text), headers: res.headers, xml: true };
    try {
      return { data: JSON.parse(text), headers: res.headers };
    } catch {
      return { data: text, headers: res.headers };
    }
  } catch (e) {
    const body = parseErrorBody(e.response?.data);
    const message = body?.errors?.map((x) => x.message).join(" • ") ||
      (e.response ? e.message : `Could not reach ${api.defaults.baseURL}: ${e.code ?? e.message}`);
    const err = new Error(message);
    err.status = e.response?.status ?? 502; // no response at all = store unreachable
    err.body = body;
    err.sentPayload = sentPayload ?? null;
    err.isPrestaError = true;
    if (!e.response) err.code = e.code;
    throw err;
  }
};

export const psGet = async (api, resource, params = {}) => {
  const { data, headers } = await request(api, {
    method: "GET",
    url: `/${resource}`,
    params: { output_format: "JSON", ...params },
  });
  return { data, headers };
};

export const psGetById = async (api, resource, id, params = {}) => {
  const { data } = await request(api, {
    method: "GET",
    url: `/${resource}/${encodeURIComponent(id)}`,
    params: { output_format: "JSON", ...params },
  });
  return data;
};

export const psDelete = async (api, resource, id) => {
  const { data } = await request(api, { method: "DELETE", url: `/${resource}/${encodeURIComponent(id)}` });
  return data;
};

/** POST/PUT an XML document. Returns the created/updated resource (as JSON). */
export const psWriteXml = async (api, method, resource, xml, id) => {
  const { data } = await request(
    api,
    {
      method,
      url: id != null ? `/${resource}/${encodeURIComponent(id)}` : `/${resource}`,
      params: { output_format: "JSON" },
      data: xml,
      headers: { "Content-Type": "application/xml" },
    },
    xml
  );
  return data;
};

// ---------------------------------------------------------------------------
// Reading helpers
// ---------------------------------------------------------------------------

/** Multilang fields arrive as "x", [{id,value}] or {language:…}; reduce to one string. */
export const langValue = (v) => {
  if (v == null) return "";
  if (typeof v === "string" || typeof v === "number") return String(v);
  if (Array.isArray(v)) {
    const hit = v.find((x) => (x?.value ?? x) !== "" && (x?.value ?? x) != null) ?? v[0];
    return langValue(hit?.value ?? hit);
  }
  if (typeof v === "object") return langValue(v.value ?? v["#text"] ?? v.language);
  return "";
};

/** First element of a list response, whatever the resource key is. List responses
 *  look like { products: [...] } — or a bare [] when nothing matched. */
export const listOf = (data, key) => {
  if (!data || Array.isArray(data)) return [];
  const v = data[key];
  return Array.isArray(v) ? v : [];
};

// ---------------------------------------------------------------------------
// Writing helpers
//
// PrestaShop rejects an XML body that contains read-only fields ("parameter
// 'x' not writable. Please remove this attribute of this XML"). The synopsis
// schema tells us which fields those are, so every write goes through
// buildResourceXml(), which keeps writable fields only.
// ---------------------------------------------------------------------------

const synopsisCache = new Map();

const isReadOnly = (node) => {
  if (!node || typeof node !== "object") return false;
  const flag = node["@_read_only"] ?? node["@_readOnly"];
  return flag === "true" || flag === true;
};

const singular = (name) => {
  const special = { addresses: "address", categories: "category", cart_rows: "cart_row", order_rows: "order_row", stock_availables: "stock_available" };
  if (special[name]) return special[name];
  if (name.endsWith("ies")) return `${name.slice(0, -3)}y`;
  if (name.endsWith("s")) return name.slice(0, -1);
  return name;
};

export const getSynopsis = async (api, resource) => {
  const key = `${api.shopBase}|${api.defaults.auth.username}|${resource}`;
  if (synopsisCache.has(key)) return synopsisCache.get(key);
  const { data } = await request(api, { method: "GET", url: `/${resource}`, params: { schema: "synopsis" } });
  const root = data?.prestashop;
  const node = root && Object.entries(root).find(([k]) => !k.startsWith("@_"))?.[1];
  if (!node) throw new Error(`Could not read the "${resource}" schema — does this API key have GET access to it?`);
  const fields = {};
  for (const [name, def] of Object.entries(node)) {
    if (name.startsWith("@_")) continue;
    fields[name] = {
      readOnly: isReadOnly(def),
      multilang: def && typeof def === "object" && def.language !== undefined,
      isAssociations: name === "associations",
      required: def?.["@_required"] === "true",
    };
  }
  synopsisCache.set(key, fields);
  return fields;
};

const toXmlValue = (v) => {
  if (v === null || v === undefined) return "";
  if (typeof v === "boolean") return v ? "1" : "0";
  return String(v);
};

/** A bare string/number → text node wrapped in CDATA. */
const cdata = (v) => ({ __cdata: toXmlValue(v) });

/** Multilang value → <field><language id="1">x</language>…</field>.
 *  Accepts a plain string (applied to all languages), [{id,value}] or {1:"a",2:"b"}. */
const multilangNode = (value, languageIds) => {
  let pairs;
  if (Array.isArray(value)) {
    pairs = value.map((x) => ({ id: String(x.id), value: x.value }));
  } else if (value && typeof value === "object") {
    pairs = Object.entries(value).map(([id, v]) => ({ id, value: v }));
  } else {
    pairs = languageIds.map((id) => ({ id: String(id), value: value }));
  }
  return { language: pairs.map((p) => ({ "@_id": p.id, ...cdata(p.value) })) };
};

/** associations: { order_rows: [{...}], categories: [{id}] } → nested nodes. */
const associationsNode = (assoc) => {
  const out = {};
  for (const [group, rows] of Object.entries(assoc ?? {})) {
    const list = Array.isArray(rows) ? rows : [rows];
    const item = singular(group);
    out[group] = {
      [item]: list.map((row) => {
        const node = {};
        for (const [k, v] of Object.entries(row ?? {})) node[k] = cdata(v);
        return node;
      }),
    };
  }
  return out;
};

/**
 * Build the XML body for POST/PUT of `resource` from a plain object of values.
 * Returns { xml, dropped } where `dropped` lists keys that were skipped because
 * the store marks them read-only or doesn't know them.
 */
export const buildResourceXml = async (api, resource, values, languageIds = [1]) => {
  const synopsis = await getSynopsis(api, resource);
  const body = {};
  const dropped = [];

  for (const [name, value] of Object.entries(values)) {
    if (value === undefined) continue;
    const def = synopsis[name];
    // `id` is required in the body of a PUT even though the schema may flag it.
    if (name === "id") {
      body.id = cdata(value);
      continue;
    }
    if (!def || def.readOnly) {
      dropped.push(name);
      continue;
    }
    if (def.isAssociations) {
      body.associations = associationsNode(value);
    } else if (def.multilang) {
      body[name] = multilangNode(value, languageIds);
    } else {
      body[name] = cdata(value);
    }
  }

  const singularName = singular(resource);
  const xml = builder.build({
    prestashop: {
      "@_xmlns:xlink": "http://www.w3.org/1999/xlink",
      [singularName]: body,
    },
  });
  return { xml: `<?xml version="1.0" encoding="UTF-8"?>${xml}`, dropped };
};

/** Active languages of the store, as numeric ids ([1] when unreadable). */
export const getLanguageIds = async (api) => {
  try {
    const { data } = await psGet(api, "languages", { display: "[id,active]" });
    const ids = listOf(data, "languages")
      .filter((l) => String(l.active) !== "0")
      .map((l) => Number(l.id));
    return ids.length ? ids : [1];
  } catch {
    return [1];
  }
};

/** Unwrap `{ order: {...} }` from a single-resource JSON response. */
/**
 * Pull one resource out of a response. `GET /products/12` returns { product: {...} },
 * but PrestaShop switches to the list shape ({ products: [{...}] }) as soon as a
 * `display` parameter is sent, and POST/PUT replies can differ too — accept both.
 */
export const unwrap = (data, key) => {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const direct = data[key];
  if (direct) return Array.isArray(direct) ? direct[0] ?? null : direct;
  const list = Object.values(data).find((v) => Array.isArray(v) && v.length && typeof v[0] === "object");
  return list ? list[0] : null;
};

export const randomReference = () =>
  Array.from({ length: 9 }, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join("");

export const slugify = (s) =>
  String(s ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "product";
