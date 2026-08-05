import api from "./axios.js";

export const createProductApi = async (payload) => {
  const response = await api.post("api/products/create", payload);
  return response.data;
};

export const fetchProductApi = async (storeUrl, token, productId) => {
  const response = await api.post("api/products/fetch", { storeUrl, token, productId });
  return response.data;
};

export const listProductsApi = async (storeUrl, token, opts = {}) => {
  const response = await api.post("api/products/list", { storeUrl, token, ...opts });
  return response.data;
};

export const duplicateProductApi = async (storeUrl, token, productId) => {
  const response = await api.post("api/products/duplicate", { storeUrl, token, productId });
  return response.data;
};

export const deleteProductApi = async (storeUrl, token, productId) => {
  const response = await api.post("api/products/delete", { storeUrl, token, productId });
  return response.data;
};
