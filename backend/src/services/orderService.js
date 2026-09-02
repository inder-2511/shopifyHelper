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

const postOrder = async (shopifyApi, orderData, viaDraftOrder) => {
  const patchedData = await applyLineItemWeights(shopifyApi, orderData);
  if (viaDraftOrder) return createViaDraftOrder(shopifyApi, patchedData);
  const response = await shopifyApi.post("/orders.json", { order: patchedData });
  return { order: response.data.order, viaDraftOrder: false, droppedFields: [] };
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

  const isNumeric = /^\d+$/.test(orderId.toString().trim());
  if (isNumeric) {
    const response = await shopifyApi.get(`/orders/${orderId}.json`);
    return response.data.order;
  }

  const name = orderId.toString().trim().startsWith("#") ? orderId : `#${orderId}`;
  const search = await shopifyApi.get(
    `/orders.json?name=${encodeURIComponent(name)}&status=any`
  );
  const orders = search.data.orders;
  if (!orders?.length) throw new Error(`Order ${name} not found`);
  return orders[0];
};

export const duplicateOrderService = async (
  orderName,
  storeUrl,
  token,
  { viaDraftOrder = false } = {}
) => {
  const shopifyApi = createShopifyApi(storeUrl, token);

  // Fetch source order by name (with or without #)
  const name = orderName.toString().startsWith("#") ? orderName : `#${orderName}`;
  const search = await shopifyApi.get(
    `/orders.json?name=${encodeURIComponent(name)}&status=any`
  );
  const orders = search.data.orders;
  if (!orders?.length) throw new Error(`Order ${name} not found`);

  const src = orders[0];

  const newOrder = {
    line_items: src.line_items.map((item) => ({
      variant_id: item.variant_id,
      quantity: item.quantity,
      price: item.price,
    })),
    shipping_address: src.shipping_address,
    billing_address: src.billing_address,
    email: src.email,
    financial_status: "paid",
    send_receipt: false,
    send_fulfillment_receipt: false,
  };

  const result = await postOrder(shopifyApi, newOrder, viaDraftOrder);
  return { source: src, ...result };
};
