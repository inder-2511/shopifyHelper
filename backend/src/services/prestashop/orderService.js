import {
  psGet,
  psGetById,
  psWriteXml,
  buildResourceXml,
  getLanguageIds,
  listOf,
  unwrap,
  langValue,
  randomReference,
} from "../../config/prestashop.js";
import { notFound } from "./productService.js";

// ---------------------------------------------------------------------------
// PrestaShop has no "draft order → complete" flow. An order is built from:
//   customer → address → cart (with rows) → order (pointing at the cart).
// Everything below follows that chain, creating only what's missing.
// ---------------------------------------------------------------------------

const money = (n) => Number(n || 0).toFixed(6);
const bad = (message) => Object.assign(new Error(message), { status: 400 });

const randomPassword = () =>
  `Tmp-${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 6).toUpperCase()}9`;

export const findOrder = async (api, idOrReference) => {
  const q = String(idOrReference ?? "").trim();
  if (!q) throw notFound("Enter an order ID or reference");

  if (/^\d+$/.test(q)) {
    try {
      const order = unwrap(await psGetById(api, "orders", q, { display: "full" }), "order");
      if (order) return order;
    } catch (e) {
      if (e.status !== 404) throw e;
    }
  }
  const { data } = await psGet(api, "orders", { display: "full", limit: 1, "filter[reference]": `[${q}]` });
  const [hit] = listOf(data, "orders");
  if (!hit) throw notFound(`Order "${q}" not found (tried ID and reference)`);
  return hit;
};

export const fetchOrderService = async (api, idOrReference) => ({ order: await findOrder(api, idOrReference) });

const getOrderState = async (api, id) => {
  try {
    return unwrap(await psGetById(api, "order_states", id), "order_state");
  } catch {
    return null; // key may lack access; fall back to "not paid"
  }
};

const resolveCustomer = async (api, customer = {}, languageIds) => {
  if (customer.id) {
    const found = unwrap(await psGetById(api, "customers", customer.id), "customer");
    if (!found) throw notFound(`Customer ${customer.id} not found`);
    return { customer: found, created: false };
  }
  if (!customer.email) throw bad("Customer email is required (or pick an existing customer ID)");

  const { data } = await psGet(api, "customers", { display: "full", limit: 1, "filter[email]": `[${customer.email}]` });
  const [existing] = listOf(data, "customers");
  if (existing) return { customer: existing, created: false };

  const { xml } = await buildResourceXml(
    api,
    "customers",
    {
      firstname: customer.firstname || "Test",
      lastname: customer.lastname || "Customer",
      email: customer.email,
      passwd: randomPassword(),
      active: 1,
    },
    languageIds
  );
  return { customer: unwrap(await psWriteXml(api, "POST", "customers", xml), "customer"), created: true };
};

const resolveAddress = async (api, address = {}, customer, languageIds) => {
  if (address.id) {
    const found = unwrap(await psGetById(api, "addresses", address.id), "address");
    if (!found) throw notFound(`Address ${address.id} not found`);
    return { address: found, created: false };
  }
  if (!address.address1 || !address.city || !address.id_country) {
    throw bad("Address needs street, city and country (or pick an existing address ID)");
  }
  const { xml } = await buildResourceXml(
    api,
    "addresses",
    {
      id_customer: customer.id,
      id_country: address.id_country,
      id_state: address.id_state || undefined,
      alias: address.alias || "My address",
      firstname: address.firstname || customer.firstname,
      lastname: address.lastname || customer.lastname,
      address1: address.address1,
      address2: address.address2 || undefined,
      city: address.city,
      postcode: address.postcode || undefined,
      phone: address.phone || undefined,
      company: address.company || undefined,
    },
    languageIds
  );
  return { address: unwrap(await psWriteXml(api, "POST", "addresses", xml), "address"), created: true };
};

const defaultCurrency = async (api) => {
  const { data } = await psGet(api, "currencies", { display: "full" });
  const list = listOf(data, "currencies").filter((c) => String(c.active) !== "0" && String(c.deleted) !== "1");
  return list[0] ?? null;
};

export const createOrderService = async (api, input) => {
  const {
    customer: customerIn,
    address: addressIn,
    items = [],
    carrierId,
    currentState,
    paymentModule = "ps_wirepayment",
    paymentLabel = "Bank transfer",
    currencyId,
    shippingCost = 0,
    taxRate = 0,
  } = input;

  if (!items.length) throw bad("Add at least one product");
  if (!carrierId) throw bad("Pick a carrier");
  if (!currentState) throw bad("Pick an order status");

  const languageIds = await getLanguageIds(api);
  const langId = languageIds[0];

  // 1. customer + address
  const { customer, created: customerCreated } = await resolveCustomer(api, customerIn, languageIds);
  const { address, created: addressCreated } = await resolveAddress(api, addressIn, customer, languageIds);

  // 2. products → prices
  const rate = 1 + Number(taxRate || 0) / 100;
  const lines = [];
  for (const item of items) {
    const qty = Math.max(1, Number(item.quantity) || 1);
    const product = unwrap(await psGetById(api, "products", item.productId, { display: "full" }), "product");
    if (!product) throw notFound(`Product ${item.productId} not found`);
    const excl = Number(item.priceOverride ?? product.price);
    lines.push({
      product_id: product.id,
      product_attribute_id: Number(item.combinationId) || 0,
      product_quantity: qty,
      product_name: langValue(product.name),
      product_reference: product.reference ?? "",
      product_price: money(excl),
      unit_price_tax_excl: money(excl),
      unit_price_tax_incl: money(excl * rate),
      qty,
      excl,
    });
  }

  const productsExcl = lines.reduce((s, l) => s + l.excl * l.qty, 0);
  const productsIncl = productsExcl * rate;
  const shipExcl = Number(shippingCost) || 0;
  const shipIncl = shipExcl * rate;
  const totalExcl = productsExcl + shipExcl;
  const totalIncl = productsIncl + shipIncl;

  // 3. currency + state
  const currency = currencyId
    ? unwrap(await psGetById(api, "currencies", currencyId), "currency")
    : await defaultCurrency(api);
  if (!currency) throw bad("No active currency found on the store");
  const state = await getOrderState(api, currentState);
  const paid = state ? String(state.paid) === "1" : false;
  const logable = state ? String(state.logable) === "1" : paid;

  // 4. cart
  const cartValues = {
    id_customer: customer.id,
    id_currency: currency.id,
    id_lang: langId,
    id_carrier: carrierId,
    id_address_delivery: address.id,
    id_address_invoice: address.id,
    associations: {
      cart_rows: lines.map((l) => ({
        id_product: l.product_id,
        id_product_attribute: l.product_attribute_id,
        id_address_delivery: address.id,
        quantity: l.product_quantity,
      })),
    },
  };
  const { xml: cartXml } = await buildResourceXml(api, "carts", cartValues, languageIds);
  const cart = unwrap(await psWriteXml(api, "POST", "carts", cartXml), "cart");

  // 5. order
  const orderValues = {
    reference: randomReference(),
    id_customer: customer.id,
    id_cart: cart.id,
    id_currency: currency.id,
    id_lang: langId,
    id_carrier: carrierId,
    id_address_delivery: address.id,
    id_address_invoice: address.id,
    secure_key: customer.secure_key,
    current_state: currentState,
    module: paymentModule,
    payment: paymentLabel,
    valid: logable ? 1 : 0,
    conversion_rate: currency.conversion_rate || 1,
    total_products: money(productsExcl),
    total_products_wt: money(productsIncl),
    total_shipping: money(shipIncl),
    total_shipping_tax_incl: money(shipIncl),
    total_shipping_tax_excl: money(shipExcl),
    total_discounts: money(0),
    total_discounts_tax_incl: money(0),
    total_discounts_tax_excl: money(0),
    total_wrapping: money(0),
    total_wrapping_tax_incl: money(0),
    total_wrapping_tax_excl: money(0),
    total_paid: money(totalIncl),
    total_paid_tax_incl: money(totalIncl),
    total_paid_tax_excl: money(totalExcl),
    total_paid_real: money(paid ? totalIncl : 0),
    associations: {
      order_rows: lines.map(({ qty, excl, ...row }) => row),
    },
  };
  const { xml: orderXml, dropped } = await buildResourceXml(api, "orders", orderValues, languageIds);
  const order = unwrap(await psWriteXml(api, "POST", "orders", orderXml), "order");

  return {
    order,
    created: { customer: customerCreated ? customer.id : null, address: addressCreated ? address.id : null, cart: cart.id },
    totals: { excl: money(totalExcl), incl: money(totalIncl), paid },
    dropped,
  };
};

// Fields that must not be carried over to a copy.
const ORDER_IDENTITY_FIELDS = [
  "id", "reference", "date_add", "date_upd", "invoice_number", "invoice_date",
  "delivery_number", "delivery_date", "associations", "id_cart",
];

export const duplicateOrderService = async (api, idOrReference, { currentState } = {}) => {
  const source = await findOrder(api, idOrReference);
  const languageIds = await getLanguageIds(api);
  const sourceRows = source.associations?.order_rows ?? [];
  if (!sourceRows.length) throw bad(`Order ${source.id} has no product rows to copy`);

  // Fresh cart, same customer / addresses / carrier / products.
  const { xml: cartXml } = await buildResourceXml(
    api,
    "carts",
    {
      id_customer: source.id_customer,
      id_currency: source.id_currency,
      id_lang: source.id_lang,
      id_carrier: source.id_carrier,
      id_address_delivery: source.id_address_delivery,
      id_address_invoice: source.id_address_invoice,
      associations: {
        cart_rows: sourceRows.map((r) => ({
          id_product: r.product_id,
          id_product_attribute: r.product_attribute_id,
          id_address_delivery: source.id_address_delivery,
          quantity: r.product_quantity,
        })),
      },
    },
    languageIds
  );
  const cart = unwrap(await psWriteXml(api, "POST", "carts", cartXml), "cart");

  const copy = Object.fromEntries(Object.entries(source).filter(([k]) => !ORDER_IDENTITY_FIELDS.includes(k)));
  copy.id_cart = cart.id;
  copy.reference = randomReference();
  if (currentState) copy.current_state = currentState;
  copy.associations = {
    order_rows: sourceRows.map(({ id, ...row }) => row), // drop the row ids of the original
  };

  const { xml, dropped } = await buildResourceXml(api, "orders", copy, languageIds);
  const order = unwrap(await psWriteXml(api, "POST", "orders", xml), "order");
  return { source, order, created: { cart: cart.id }, dropped };
};

/** PUT an edited order JSON back. Accepts the bare object or { order: {...} }. */
export const updateOrderService = async (api, json) => {
  const data = json?.order ?? json;
  if (!data || typeof data !== "object") throw bad("Body must be the order JSON");
  if (!data.id) throw bad('The order JSON needs an "id" so PrestaShop knows which order to update');

  const languageIds = await getLanguageIds(api);
  const { xml, dropped } = await buildResourceXml(api, "orders", data, languageIds);
  const order = unwrap(await psWriteXml(api, "PUT", "orders", xml, data.id), "order");
  return { order, dropped };
};
