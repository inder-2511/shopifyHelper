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

// Create → complete a draft order, then read back the resulting order so callers
// get the same shape as a plain POST /orders.json.
const createViaDraftOrder = async (shopifyApi, orderData) => {
  const { draft_order, droppedFields } = toDraftOrderPayload(orderData);

  const created = await shopifyApi.post("/draft_orders.json", { draft_order });
  const draftId = created.data.draft_order?.id;
  if (!draftId) throw new Error("Draft order was created but returned no id");

  // payment_pending=false marks the resulting order as paid, matching the
  // financial_status: "paid" the direct path sends.
  const completed = await shopifyApi.put(
    `/draft_orders/${draftId}/complete.json?payment_pending=false`
  );
  const orderId = completed.data.draft_order?.order_id;
  if (!orderId) throw new Error(`Draft order ${draftId} completed but produced no order`);

  const { data } = await shopifyApi.get(`/orders/${orderId}.json`);
  return { order: data.order, draftOrderId: draftId, viaDraftOrder: true, droppedFields };
};

const postOrder = async (shopifyApi, orderData, viaDraftOrder) => {
  if (viaDraftOrder) return createViaDraftOrder(shopifyApi, orderData);
  const response = await shopifyApi.post("/orders.json", { order: orderData });
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
