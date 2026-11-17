import {
  psGet,
  psGetById,
  psDelete,
  psWriteXml,
  buildResourceXml,
  getLanguageIds,
  listOf,
  unwrap,
  langValue,
  slugify,
} from "../../config/prestashop.js";

const DEFAULT_CATEGORY = 2; // "Home" in a stock install

export const notFound = (message) =>
  Object.assign(new Error(message), {
    status: 404,
    isPrestaError: true,
    body: { errors: [{ code: "404", message }] },
  });

const money = (n) => Number(n || 0).toFixed(6);

/** Apply fn to every language value of a multilang field (string | [{id,value}]). */
const mapLang = (v, fn) =>
  Array.isArray(v) ? v.map((x) => ({ ...x, value: fn(x.value) })) : fn(v);

/**
 * Resolve "42", an SKU, or a product name to one product (full JSON).
 * Numbers are tried as an id first, then as a reference — SKUs are often numeric.
 */
export const findProduct = async (api, idOrText) => {
  const q = String(idOrText ?? "").trim();
  if (!q) throw notFound("Enter a product ID, reference or name");

  if (/^\d+$/.test(q)) {
    try {
      const product = unwrap(await psGetById(api, "products", q, { display: "full" }), "product");
      if (product) return product;
    } catch (e) {
      if (e.status !== 404) throw e;
    }
  }

  for (const filter of [{ "filter[reference]": `[${q}]` }, { "filter[name]": `%[${q}]%` }]) {
    const { data } = await psGet(api, "products", { display: "full", limit: 1, ...filter });
    const [hit] = listOf(data, "products");
    if (hit) return hit;
  }
  throw notFound(`Product "${q}" not found (tried ID, reference and name)`);
};

/** Quantity lives in a separate resource (stock_availables), not on the product. */
export const getStock = async (api, productId, combinationId = 0) => {
  const { data } = await psGet(api, "stock_availables", {
    display: "full",
    "filter[id_product]": `[${productId}]`,
    "filter[id_product_attribute]": `[${combinationId}]`,
    limit: 1,
  });
  return listOf(data, "stock_availables")[0] ?? null;
};

export const setStock = async (api, productId, quantity) => {
  const stock = await getStock(api, productId);
  if (!stock) return { updated: false, reason: "No stock_available row found (is the key allowed on stock_availables?)" };
  const { xml } = await buildResourceXml(api, "stock_availables", {
    id: stock.id,
    id_product: stock.id_product,
    id_product_attribute: stock.id_product_attribute,
    id_shop: stock.id_shop,
    id_shop_group: stock.id_shop_group,
    depends_on_stock: stock.depends_on_stock,
    out_of_stock: stock.out_of_stock,
    quantity: Number(quantity),
  });
  await psWriteXml(api, "PUT", "stock_availables", xml, stock.id);
  return { updated: true, quantity: Number(quantity) };
};

export const createProductService = async (api, input) => {
  const {
    name,
    price = 0,
    reference = "",
    quantity = 0,
    description = "",
    descriptionShort = "",
    categoryId = DEFAULT_CATEGORY,
    taxRulesGroupId = 0,
    weight = 0,
    ean13 = "",
    active = true,
  } = input;
  if (!name || !String(name).trim()) throw Object.assign(new Error("Product name is required"), { status: 400 });

  const languageIds = await getLanguageIds(api);
  const { xml, dropped } = await buildResourceXml(
    api,
    "products",
    {
      name,
      link_rewrite: slugify(name),
      description,
      description_short: descriptionShort,
      price: money(price),
      reference,
      ean13,
      weight: money(weight),
      active: active ? 1 : 0,
      state: 1,
      visibility: "both",
      condition: "new",
      available_for_order: 1,
      show_price: 1,
      minimal_quantity: 1,
      id_category_default: categoryId,
      id_tax_rules_group: taxRulesGroupId,
      associations: { categories: [{ id: categoryId }] },
    },
    languageIds
  );

  const created = unwrap(await psWriteXml(api, "POST", "products", xml), "product");
  const stock = Number(quantity) > 0 ? await setStock(api, created.id, quantity) : { updated: false, reason: "Quantity is 0" };
  return { product: created, stock, dropped };
};

export const fetchProductService = async (api, idOrText) => {
  const product = await findProduct(api, idOrText);
  const stock = await getStock(api, product.id).catch(() => null);
  return { product, quantity: stock ? Number(stock.quantity) : null };
};

export const listProductsService = async (api, { limit = 50, offset = 0, search = "" } = {}) => {
  const take = Math.min(Number(limit) || 50, 200);
  const skip = Math.max(Number(offset) || 0, 0);
  const params = {
    display: "[id,name,reference,price,active,id_category_default,date_add]",
    limit: `${skip},${take}`,
    sort: "[id_DESC]",
  };
  if (search) params["filter[name]"] = `%[${search}]%`;

  const { data } = await psGet(api, "products", params);
  const products = listOf(data, "products").map((p) => ({ ...p, name: langValue(p.name) }));
  return { products, offset: skip, limit: take, hasMore: products.length === take };
};

export const duplicateProductService = async (api, idOrText) => {
  const source = await findProduct(api, idOrText);
  const sourceStock = await getStock(api, source.id).catch(() => null);
  const languageIds = await getLanguageIds(api);

  // Fields that identify the original or describe things we deliberately don't
  // copy (images, combinations, stock rows). Read-only fields are stripped
  // automatically by buildResourceXml, so only list writable ones here.
  const { id, associations = {}, date_add, date_upd, id_default_image, id_default_combination, cache_default_attribute, ...rest } = source;

  const categories = (associations.categories ?? []).map((c) => ({ id: c.id }));
  const features = (associations.product_features ?? []).map((f) => ({ id: f.id, id_feature_value: f.id_feature_value }));

  const values = {
    ...rest,
    name: mapLang(source.name, (n) => `${n} (Copy)`),
    active: 0, // copies start as drafts, same as the Shopify duplicate
    associations: {
      ...(categories.length ? { categories } : {}),
      ...(features.length ? { product_features: features } : {}),
    },
  };

  const { xml, dropped } = await buildResourceXml(api, "products", values, languageIds);
  const created = unwrap(await psWriteXml(api, "POST", "products", xml), "product");

  const qty = sourceStock ? Number(sourceStock.quantity) : 0;
  const stock = qty > 0 ? await setStock(api, created.id, qty) : { updated: false, reason: "Source quantity is 0" };

  const skipped = [];
  if (associations.combinations?.length) skipped.push(`${associations.combinations.length} combination(s)`);
  if (associations.images?.length) skipped.push(`${associations.images.length} image(s)`);

  return { source, product: created, stock, skipped, dropped };
};

export const deleteProductService = async (api, idOrText) => {
  const source = await findProduct(api, idOrText);
  await psDelete(api, "products", source.id);
  return { id: Number(source.id), name: langValue(source.name) };
};
