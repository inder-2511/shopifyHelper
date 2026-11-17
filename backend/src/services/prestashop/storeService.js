import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import csv from "csv-parser";
import { psGet, listOf, langValue } from "../../config/prestashop.js";
import { createProductService } from "./productService.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_CSV = path.resolve(__dirname, "../../../csv/products.csv");

/** Which API resources does this key see, and what PrestaShop version is it? */
export const testConnectionService = async (api) => {
  const { data, headers } = await psGet(api, "");
  const resources = Object.keys(data?.api ?? {}).sort();
  return {
    ok: true,
    shop: api.shopBase,
    version: headers?.["psws-version"] ?? null,
    resources,
  };
};

const safe = async (fn) => {
  try {
    return { items: await fn() };
  } catch (e) {
    return { items: [], error: e.message, status: e.status };
  }
};

const active = (x) => String(x.active) !== "0";

/**
 * Everything the order form needs to offer real choices. Each list is fetched
 * independently so a key without access to one resource doesn't break the rest.
 */
export const referenceDataService = async (api) => {
  const get = async (resource, params, key = resource) => listOf((await psGet(api, resource, params)).data, key);

  const [countries, zones, carriers, orderStates, currencies, languages, categories, taxGroups] = await Promise.all([
    safe(async () =>
      (await get("countries", { display: "full", limit: 400 })).map((c) => ({
        id: c.id, name: langValue(c.name), iso: c.iso_code, active: active(c),
        zoneId: c.id_zone, needZip: String(c.need_zip_code) === "1", containsStates: String(c.contains_states) === "1",
      }))
    ),
    safe(async () => (await get("zones", { display: "full" })).map((z) => ({ id: z.id, name: z.name, active: active(z) }))),
    safe(async () =>
      (await get("carriers", { display: "full" }))
        .filter((c) => String(c.deleted) !== "1")
        .map((c) => ({ id: c.id, name: c.name, active: active(c) }))
    ),
    safe(async () =>
      (await get("order_states", { display: "full" }, "order_states")).map((s) => ({
        id: s.id, name: langValue(s.name), paid: String(s.paid) === "1", shipped: String(s.shipped) === "1",
      }))
    ),
    safe(async () =>
      (await get("currencies", { display: "full" }))
        .filter((c) => String(c.deleted) !== "1")
        .map((c) => ({ id: c.id, name: langValue(c.name) || c.iso_code, iso: c.iso_code, active: active(c) }))
    ),
    safe(async () => (await get("languages", { display: "full" })).map((l) => ({ id: l.id, name: l.name, iso: l.iso_code, active: active(l) }))),
    safe(async () =>
      (await get("categories", { display: "[id,name,id_parent,active]", limit: 500 })).map((c) => ({
        id: c.id, name: langValue(c.name), parentId: c.id_parent, active: active(c),
      }))
    ),
    safe(async () => (await get("tax_rule_groups", { display: "full" })).map((g) => ({ id: g.id, name: g.name, active: active(g) }))),
  ]);

  return { countries, zones, carriers, orderStates, currencies, languages, categories, taxGroups };
};

const RESOURCE_NAME = /^[a-z_]+$/;

/** Generic read-only browser for any resource the key can see. */
export const listResourceService = async (api, { resource, limit = 25, offset = 0, filters = {}, sort }) => {
  if (!RESOURCE_NAME.test(String(resource ?? ""))) {
    throw Object.assign(new Error("Resource must be a lowercase name like `products` or `order_states`"), { status: 400 });
  }
  const take = Math.min(Number(limit) || 25, 200);
  const skip = Math.max(Number(offset) || 0, 0);
  const params = { display: "full", limit: `${skip},${take}` };
  if (sort) params.sort = `[${sort}]`;
  for (const [field, value] of Object.entries(filters)) {
    if (value !== "" && value != null && /^[a-z_]+$/.test(field)) params[`filter[${field}]`] = `[${value}]`;
  }
  const { data } = await psGet(api, resource, params);
  const rows = listOf(data, resource);
  return { rows, offset: skip, limit: take, hasMore: rows.length === take };
};

/**
 * Create products from the same products.csv the Shopify import uses.
 * PrestaShop products have no "variants" without combination setup, so each
 * variant row becomes its own simple product (named "Title (Option)").
 */
export const importProductsService = async (api, { categoryId, csvPath } = {}) => {
  const file = csvPath ? path.resolve(csvPath) : DEFAULT_CSV;
  if (!fs.existsSync(file)) throw Object.assign(new Error(`CSV not found: ${file}`), { status: 400 });

  const rows = await new Promise((resolve, reject) => {
    const out = [];
    fs.createReadStream(file).pipe(csv()).on("data", (r) => out.push(r)).on("end", () => resolve(out)).on("error", reject);
  });

  // Rows after the first of a handle only carry variant columns.
  const groups = new Map();
  for (const row of rows) {
    const handle = row.Handle;
    if (!handle) continue;
    if (!groups.has(handle)) {
      groups.set(handle, { title: row.Title, body: row["Body (HTML)"] || "", status: row.Status || "active", variants: [] });
    }
    groups.get(handle).variants.push(row);
  }

  const created = [];
  const failed = [];
  for (const [handle, g] of groups) {
    for (const v of g.variants) {
      const options = [v["Option1 Value"], v["Option2 Value"], v["Option3 Value"]].filter((o) => o && o !== "Default Title");
      const name = g.variants.length > 1 && options.length ? `${g.title} (${options.join(" / ")})` : g.title;
      try {
        const { product } = await createProductService(api, {
          name,
          price: v["Variant Price"] || 0,
          reference: v["Variant SKU"] || "",
          quantity: parseInt(v["Variant Inventory Qty"] || 0, 10),
          description: g.body,
          weight: (parseFloat(v["Variant Grams"] || 0) || 0) / 1000,
          ean13: /^\d{13}$/.test(v["Variant Barcode"] || "") ? v["Variant Barcode"] : "",
          active: g.status === "active",
          ...(categoryId ? { categoryId } : {}),
        });
        created.push({ id: product.id, name, reference: v["Variant SKU"] || "" });
      } catch (e) {
        failed.push({ handle, name, error: e.message, sentPayload: e.sentPayload });
      }
    }
  }
  return { total: created.length + failed.length, created, failed };
};
