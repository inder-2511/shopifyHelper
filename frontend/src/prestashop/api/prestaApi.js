import api from "../../api/axios.js";

// Every call sends the store credentials in the POST body (never in a URL).
const post = async (path, creds, body = {}) => {
  const res = await api.post(`api/presta/${path}`, {
    shopUrl: creds.shopUrl,
    apiKey: creds.apiKey,
    ...body,
  });
  return res.data;
};

export const testConnectionApi = (creds) => post("test", creds);
export const referenceDataApi = (creds) => post("reference", creds);
export const listResourceApi = (creds, opts) => post("resource", creds, opts);
export const importProductsApi = (creds, opts) => post("import-products", creds, opts);

export const createProductApi = (creds, product) => post("products/create", creds, product);
export const fetchProductApi = (creds, productId) => post("products/fetch", creds, { productId });
export const listProductsApi = (creds, opts) => post("products/list", creds, opts);
export const duplicateProductApi = (creds, productId) => post("products/duplicate", creds, { productId });
export const deleteProductApi = (creds, productId) => post("products/delete", creds, { productId });

export const createOrderApi = (creds, order) => post("orders/create", creds, order);
export const fetchOrderApi = (creds, orderId) => post("orders/fetch", creds, { orderId });
export const duplicateOrderApi = (creds, orderId, currentState) =>
  post("orders/duplicate", creds, { orderId, ...(currentState ? { currentState } : {}) });
export const updateOrderApi = (creds, order) => post("orders/update", creds, { order });
