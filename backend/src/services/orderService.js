import { createShopifyApi } from "../config/shopify.js";

// Shopify only lets the app that created an order edit it, so orders POSTed
// straight to /orders.json can never be edited in the admin ("This order cannot
// be edited by this app"). Orders completed from a draft order are exempt — they
// stay editable in the admin and by other apps. That's the draft-order path below.
// https://shopify.dev/docs/apps/build/orders-fulfillment/order-management-apps/edit-orders

// Draft orders accept a narrower field set than the order resource.
const DRAFT_ORDER_FIELDS = [
  "line_items", "customer_id", "use_customer_default_address",
  "email", "phone", "currency", "note", "note_attributes",
  "shipping_address", "billing_address", "applied_discount",
  "tags", "tax_exempt", "taxes_included", "po_number",
];

// Order-only fields. Kept explicit so we can tell the caller what was dropped
// rather than silently discarding it.
const ORDER_ONLY_FIELDS = [
  "financial_status", "fulfillment_status", "inventory_behaviour",
  "send_receipt", "send_fulfillment_receipt", "transactions", "source_name",
];

const toDraftOrderPayload = (orderData) => {
  const draft_order = {};
  for (const key of DRAFT_ORDER_FIELDS) {
    if (orderData[key] !== undefined) draft_order[key] = orderData[key];
  }

  // The order resource takes shipping_lines[]; a draft order takes one shipping_line.
  const [shippingLine] = orderData.shipping_lines ?? [];
  if (shippingLine) draft_order.shipping_line = shippingLine;

  const droppedFields = ORDER_ONLY_FIELDS.filter((key) => orderData[key] !== undefined);
  return { draft_order, droppedFields };
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Shopify calculates draft order shipping/taxes asynchronously, so a freshly
// created draft isn't immediately completable. It signals this two ways: a 202
// with location + retry-after headers to poll, or a 422 "has not finished
// calculating" if we complete too early. Both just mean "wait".
const DRAFT_POLL_ATTEMPTS = 8;
const DRAFT_COMPLETE_ATTEMPTS = 6;

const isStillCalculating = (error) =>
  error.response?.status === 422 &&
  /not finished calculating/i.test(JSON.stringify(error.response?.data ?? ""));

// A Cloudflare bot-challenge page (or any admin web page) instead of JSON means
// we left the Admin API. Say so plainly — a bare 403 from Cloudflare otherwise
// reads as a permissions problem.
const assertJsonResponse = (response, what) => {
  const looksLikeHtml =
    typeof response.data === "string" && /^\s*<(!doctype|html)/i.test(response.data);
  if (looksLikeHtml) {
    throw new Error(
      `${what}: got an HTML page instead of JSON — the request left the Admin API ` +
      `(usually a Cloudflare challenge on admin.shopify.com). Store URL should be the ` +
      `*.myshopify.com domain.`
    );
  }
  return response;
};

const draftIdFrom = (response) => {
  const fromBody = response.data?.draft_order?.id;
  if (fromBody) return fromBody;
  // Fall back to the id embedded in the location header path.
  const location = response.headers?.location ?? response.headers?.Location ?? "";
  const [, id] = /draft_orders\/(\d+)/.exec(location) ?? [];
  return id ?? null;
};

// Honour the 202 + retry-after polling contract until the draft settles.
//
// We deliberately do NOT fetch the location header's URL as given: on some stores
// it points at the admin web UI (admin.shopify.com/store/<handle>/draft_orders/<id>),
// which answers with a Cloudflare bot challenge rather than JSON. We take only the
// draft id from it and poll our own Admin API path instead.
const awaitDraftReady = async (shopifyApi, response) => {
  let current = assertJsonResponse(response, "Creating the draft order");

  for (let attempt = 0; current.status === 202 && attempt < DRAFT_POLL_ATTEMPTS; attempt++) {
    const draftId = draftIdFrom(current);
    if (!draftId) break;
    const retryAfter = Number(current.headers?.["retry-after"]) || 1;
    await sleep(retryAfter * 1000);
    current = assertJsonResponse(
      await shopifyApi.get(`/draft_orders/${draftId}.json`),
      `Polling draft order ${draftId}`
    );
  }
  return current;
};

// payment_pending=false marks the resulting order as paid, matching the
// financial_status: "paid" the direct path sends.
const completeDraftOrder = async (shopifyApi, draftId) => {
  let delay = 700;
  for (let attempt = 1; ; attempt++) {
    try {
      return await shopifyApi.put(
        `/draft_orders/${draftId}/complete.json?payment_pending=false`
      );
    } catch (error) {
      if (attempt >= DRAFT_COMPLETE_ATTEMPTS || !isStillCalculating(error)) throw error;
      await sleep(delay);
      delay = Math.min(delay * 2, 5_000);
    }
  }
};

// Create → complete a draft order, then read back the resulting order so callers
// get the same shape as a plain POST /orders.json.
const createViaDraftOrder = async (shopifyApi, orderData) => {
  const { draft_order, droppedFields } = toDraftOrderPayload(orderData);

  const created = await awaitDraftReady(
    shopifyApi,
    await shopifyApi.post("/draft_orders.json", { draft_order })
  );
  const draftId = draftIdFrom(created);
  if (!draftId) throw new Error("Draft order was created but returned no id");

  const completed = await completeDraftOrder(shopifyApi, draftId);
  const orderId = completed.data.draft_order?.order_id;
  if (!orderId) throw new Error(`Draft order ${draftId} completed but produced no order`);

  const { data } = await shopifyApi.get(`/orders/${orderId}.json`);
  return { order: data.order, draftOrderId: draftId, viaDraftOrder: true, droppedFields };
};

// Shopify's Order / DraftOrder endpoints snapshot weight from the variant record —
// a `grams` field on a line item is ignored on write and echoed back read-only.
// So when the caller wants a specific weight, update the variant's stored weight
// first, then post the order without the per-line override.
//
// Side effect: this changes the variant's weight for every future order too, until
// something else updates it. Documented in the UI copy so users aren't surprised.
const applyLineItemWeights = async (shopifyApi, orderData) => {
  const items = orderData.line_items ?? [];
  const withWeight = items.filter(
    (item) => item?.variant_id != null && Number.isFinite(Number(item?.grams))
  );
  if (!withWeight.length) return orderData;

  // Multiple lines can reference the same variant; take the last non-empty grams.
  const byVariant = new Map();
  for (const item of withWeight) {
    byVariant.set(Number(item.variant_id), Math.round(Number(item.grams)));
  }

  for (const [variantId, grams] of byVariant) {
    await shopifyApi.put(`/variants/${variantId}.json`, {
      variant: { id: variantId, grams },
    });
  }

  return {
    ...orderData,
    // Strip the read-only override; Shopify will now snapshot from the updated variant.
    line_items: items.map(({ grams, ...rest }) => rest),
  };
};

// Attach the exact payload we sent to Shopify to any thrown error, so controllers
// can forward it in the HTTP response and the UI can show "here's what we sent".
const withSentPayload = (err, sentPayload) => {
  err.sentPayload = sentPayload;
  return err;
};

const postOrder = async (shopifyApi, orderData, viaDraftOrder) => {
  const patchedData = await applyLineItemWeights(shopifyApi, orderData);

  if (viaDraftOrder) {
    try {
      return await createViaDraftOrder(shopifyApi, patchedData);
    } catch (err) {
      // The draft-order helper already builds its own payload shape internally.
      // Surfacing the pre-transform data is still useful to the user.
      throw withSentPayload(err, { via: "draft_order", input: patchedData });
    }
  }

  try {
    const response = await shopifyApi.post("/orders.json", { order: patchedData });
    return { order: response.data.order, viaDraftOrder: false, droppedFields: [] };
  } catch (err) {
    throw withSentPayload(err, { via: "orders.json", body: { order: patchedData } });
  }
};

export const createOrderService = async (
  orderData,
  storeUrl,
  token,
  { viaDraftOrder = false } = {}
) => {
  const shopifyApi = createShopifyApi(
    storeUrl || process.env.SHOPIFY_STORE,
    token || process.env.SHOPIFY_ACCESS_TOKEN
  );
  return postOrder(shopifyApi, orderData, viaDraftOrder);
};

export const fetchOrderService = async (orderId, storeUrl, token) => {
  const shopifyApi = createShopifyApi(storeUrl, token);
  return resolveOrder(shopifyApi, orderId);
};

// Server-managed fields on an address object (ids/snapshots) that Shopify will
// reject or overwrite on create.
const stripAddress = (addr) => {
  if (!addr) return undefined;
  // eslint-disable-next-line no-unused-vars
  const { id, country_name, latitude, longitude, name, default: _d, ...rest } = addr;
  return rest;
};

// Build a POST /orders.json payload from a full source order, preserving every
// field Shopify will accept on create. Drops read-only server-managed fields
// (ids, timestamps, totals, confirmation numbers). Reproducing financial_status
// "paid" requires posting a matching transaction — just copying the string
// leaves the new order as "pending".
// Resolve a user-typed identifier to a full Shopify order.
//
// Users typically type what they see in the admin — the order *name* (e.g. "2564"
// or "#2564"), not the internal numeric ID (which is 13+ digits now). The old
// logic treated any all-digit input as an ID, so "2564" became GET /orders/2564.json
// → 404. We now:
//   • always treat a `#`-prefixed value as a name
//   • treat short numbers (< 10 digits) as names
//   • for longer numeric input, try as ID first and fall back to name search on 404
export const resolveOrder = async (shopifyApi, rawInput) => {
  const trimmed = String(rawInput ?? "").trim();
  if (!trimmed) throw new Error("Order ID or name required");

  const bare = trimmed.replace(/^#/, "");
  const isAllDigits = /^\d+$/.test(bare);

  const findByName = async () => {
    const needle = `#${bare}`;
    const search = await shopifyApi.get(
      `/orders.json?name=${encodeURIComponent(needle)}&status=any`
    );
    const found = search.data.orders?.[0];
    if (!found) throw new Error(`Order ${needle} not found`);
    return found;
  };

  if (trimmed.startsWith("#") || !isAllDigits || bare.length < 10) {
    return findByName();
  }

  // Numeric and long enough to plausibly be a real Shopify ID — try that path first.
  try {
    const { data } = await shopifyApi.get(`/orders/${bare}.json`);
    return data.order;
  } catch (err) {
    if (err.response?.status === 404) return findByName();
    throw err;
  }
};

// Order-level data that Shopify stores adjacent to the order record and does NOT
// return on the default GET /orders/{id}.json. Fetch each as its own endpoint and
// pass the lot through as `extras` to cloneOrderForCreate so they end up in the
// cloned payload.
//
// Currently covered: localization_extensions (holds Brazil CPF/CNPJ and similar
// country-specific tax IDs). The endpoint requires the `read_customers` scope.
//
// Returns `{ extras, warnings[] }` so the caller can surface non-fatal problems
// (e.g. "token lacks scope") without failing the whole duplication.
export const fetchOrderExtras = async (shopifyApi, orderIdNum) => {
  const extras = {};
  const warnings = [];

  try {
    const { data } = await shopifyApi.get(
      `/orders/${orderIdNum}/localization_extensions.json`
    );
    const list = data?.localization_extensions ?? [];
    if (list.length) {
      extras.localization_extensions = list.map((ext) => ({
        country_code: ext.country_code,
        purpose:      ext.purpose,
        title:        ext.title,
        value:        ext.value,
      }));
      console.log(
        `[extras] order ${orderIdNum}: carried over ${list.length} localization_extension(s)`
      );
    } else {
      console.log(`[extras] order ${orderIdNum}: no localization_extensions`);
    }
  } catch (err) {
    const status = err.response?.status;
    const detail =
      typeof err.response?.data === "object"
        ? JSON.stringify(err.response.data)
        : err.response?.data ?? err.message;

    if (status === 404) {
      // 404 here means the endpoint has no entries for this order — fine, skip.
      console.log(`[extras] order ${orderIdNum}: localization_extensions endpoint 404 (none)`);
    } else if (status === 403 || status === 401) {
      // Scope issue — surface so the user can add `read_customers` and retry.
      const warning =
        "Couldn't read localization_extensions (e.g. Brazil CPF/CNPJ) — the Admin API token " +
        "is missing the `read_customers` scope. Grant it in the Shopify app config and reinstall " +
        "to carry those fields over on duplicate.";
      console.warn(`[extras] order ${orderIdNum}: ${status} — ${detail}`);
      warnings.push({ kind: "missing_scope", message: warning, status });
    } else {
      // Anything else: don't fail the duplicate, but tell the caller.
      console.warn(`[extras] order ${orderIdNum}: ${status ?? "?"} — ${detail}`);
      warnings.push({
        kind: "extras_fetch_failed",
        message: `Couldn't read order extras (status ${status ?? "?"}): ${detail}`,
        status,
      });
    }
  }

  return { extras, warnings };
};

export const cloneOrderForCreate = (src, extras = {}) => {
  const line_items = (src.line_items ?? []).map((item) => {
    const li = {
      variant_id: item.variant_id,
      quantity:   item.quantity,
      price:      item.price,
    };
    if (item.grams != null && Number(item.grams) > 0) li.grams = Number(item.grams);
    if (item.title)                  li.title = item.title;
    if (item.sku)                    li.sku = item.sku;
    if (item.name)                   li.name = item.name;
    if (item.vendor)                 li.vendor = item.vendor;
    if (typeof item.requires_shipping === "boolean") li.requires_shipping = item.requires_shipping;
    if (typeof item.taxable === "boolean")           li.taxable = item.taxable;
    if (item.fulfillment_service)                    li.fulfillment_service = item.fulfillment_service;
    if (item.properties?.length)                     li.properties = item.properties;
    // tax_lines intentionally dropped — Shopify re-derives from tax config.
    return li;
  });

  const shipping_lines = (src.shipping_lines ?? []).map((sl) => {
    const line = { title: sl.title, price: sl.price };
    if (sl.code)                              line.code = sl.code;
    if (sl.source)                            line.source = sl.source;
    if (sl.carrier_identifier)                line.carrier_identifier = sl.carrier_identifier;
    if (sl.requested_fulfillment_service_id)  line.requested_fulfillment_service_id = sl.requested_fulfillment_service_id;
    return line;
  });

  // Treat empty strings as absence — Shopify rejects some fields (e.g. `tags`,
  // `source_name`) with "Required parameter missing or invalid" when they're sent
  // as empty.
  const str  = (v) => (typeof v === "string" && v.trim() ? v : undefined);
  const bool = (v) => (typeof v === "boolean" ? v : undefined);

  const payload = {
    line_items,
    shipping_address:        stripAddress(src.shipping_address),
    billing_address:         stripAddress(src.billing_address),
    email:                   str(src.email),
    phone:                   str(src.phone),
    currency:                str(src.currency),
    taxes_included:          bool(src.taxes_included),
    tax_exempt:              bool(src.tax_exempt),
    note:                    str(src.note),
    note_attributes:         src.note_attributes?.length ? src.note_attributes : undefined,
    tags:                    str(src.tags),
    po_number:               str(src.po_number),
    buyer_accepts_marketing: bool(src.buyer_accepts_marketing),
    financial_status:        str(src.financial_status),
    customer_locale:         str(src.customer_locale),
    // Default to not spamming the customer again on a duplicate. Explicit so
    // it survives any Shopify default change.
    send_receipt:              false,
    send_fulfillment_receipt:  false,
    // Deliberately NOT copied:
    //   • source_name — Shopify restricts to the creating app's own channel; copying
    //     another app's value triggers a 400 on create.
    //   • fulfillment_status — Shopify derives this from fulfillments; sending a
    //     snapshot value from the source conflicts with having zero fulfillments.
  };

  if (shipping_lines.length) payload.shipping_lines = shipping_lines;

  // Localization extensions (e.g. Brazil CPF/CNPJ) aren't on the default GET
  // response — they come from a separate fetch and are passed in via extras.
  if (extras.localization_extensions?.length) {
    payload.localization_extensions = extras.localization_extensions;
  }

  if (src.discount_codes?.length) {
    payload.discount_codes = src.discount_codes.map(({ code, amount, type }) => ({
      code, amount, type,
    }));
  }

  // Reproduce the paid status with a matching transaction. financial_status alone
  // leaves the new order "pending" unless a transaction accompanies it.
  if (src.financial_status === "paid" || src.financial_status === "partially_paid") {
    payload.transactions = [{
      kind:    "sale",
      status:  "success",
      amount:  src.total_price,
      gateway: src.payment_gateway_names?.[0] || "bogus",
    }];
  }

  for (const key of Object.keys(payload)) {
    if (payload[key] === undefined) delete payload[key];
  }

  return payload;
};

// Fetch an order by name/id and return the clean "cloneable" payload. Same
// transformation as duplicateOrderService uses — but doesn't post.
export const cloneTemplateService = async (orderId, storeUrl, token) => {
  const shopifyApi = createShopifyApi(storeUrl, token);
  const src = await resolveOrder(shopifyApi, orderId);
  const { extras, warnings } = await fetchOrderExtras(shopifyApi, src.id);

  return {
    source:   { id: src.id, name: src.name },
    template: cloneOrderForCreate(src, extras),
    warnings,
  };
};

export const duplicateOrderService = async (
  orderName,
  storeUrl,
  token,
  { viaDraftOrder = false } = {}
) => {
  const shopifyApi = createShopifyApi(storeUrl, token);
  const src = await resolveOrder(shopifyApi, orderName);
  const { extras, warnings } = await fetchOrderExtras(shopifyApi, src.id);
  const newOrder = cloneOrderForCreate(src, extras);
  const result = await postOrder(shopifyApi, newOrder, viaDraftOrder);
  return { source: src, warnings, ...result };
};
