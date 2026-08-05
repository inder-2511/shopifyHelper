import { createShopifyApi } from "../config/shopify.js";

const stripReadOnly = (product) => {
  const {
    id, admin_graphql_api_id, created_at, updated_at, published_at,
    variants = [], images = [], image, options = [], ...rest
  } = product;

  return {
    ...rest,
    variants: variants.map(({ id, product_id, inventory_item_id, admin_graphql_api_id, image_id, created_at, updated_at, ...v }) => v),
    options: options.map(({ id, product_id, ...o }) => o),
    images: images.map(({ id, product_id, admin_graphql_api_id, created_at, updated_at, variant_ids, ...i }) => i),
  };
};

export const createProductService = async (productData, storeUrl, token) => {
  const shopifyApi = createShopifyApi(storeUrl, token);
  const response = await shopifyApi.post("/products.json", { product: productData });
  return response.data.product;
};

export const fetchProductService = async (productId, storeUrl, token) => {
  const shopifyApi = createShopifyApi(storeUrl, token);
  const id = productId.toString().trim();

  if (/^\d+$/.test(id)) {
    const response = await shopifyApi.get(`/products/${id}.json`);
    return response.data.product;
  }

  // Fall back to title search
  const search = await shopifyApi.get(
    `/products.json?title=${encodeURIComponent(id)}&limit=1`
  );
  const products = search.data.products;
  if (!products?.length) throw new Error(`Product "${id}" not found`);
  return products[0];
};

export const listProductsService = async (storeUrl, token, { limit = 50, pageInfo } = {}) => {
  const shopifyApi = createShopifyApi(storeUrl, token);
  const params = new URLSearchParams({ limit: String(Math.min(limit, 250)) });
  if (pageInfo) params.set("page_info", pageInfo);

  const response = await shopifyApi.get(`/products.json?${params.toString()}`);

  // Parse Link header for cursor pagination
  const linkHeader = response.headers.link || response.headers.Link || "";
  const next = /<[^>]*[?&]page_info=([^&>]+)[^>]*>;\s*rel="next"/.exec(linkHeader)?.[1];
  const previous = /<[^>]*[?&]page_info=([^&>]+)[^>]*>;\s*rel="previous"/.exec(linkHeader)?.[1];

  return {
    products: response.data.products,
    nextPageInfo: next ? decodeURIComponent(next) : null,
    previousPageInfo: previous ? decodeURIComponent(previous) : null,
  };
};

export const duplicateProductService = async (productId, storeUrl, token) => {
  const shopifyApi = createShopifyApi(storeUrl, token);
  const source = await fetchProductService(productId, storeUrl, token);

  const clone = stripReadOnly(source);
  clone.title = `${source.title} (Copy)`;
  if (clone.handle) delete clone.handle; // Shopify auto-generates a unique one
  clone.status = "draft";

  const response = await shopifyApi.post("/products.json", { product: clone });
  return { source, product: response.data.product };
};

export const deleteProductService = async (productId, storeUrl, token) => {
  const shopifyApi = createShopifyApi(storeUrl, token);
  const id = productId.toString().trim();
  if (!/^\d+$/.test(id)) {
    // Resolve title → id first
    const resolved = await fetchProductService(id, storeUrl, token);
    await shopifyApi.delete(`/products/${resolved.id}.json`);
    return { id: resolved.id, title: resolved.title };
  }
  const source = await shopifyApi.get(`/products/${id}.json`);
  await shopifyApi.delete(`/products/${id}.json`);
  return { id: Number(id), title: source.data.product?.title };
};
