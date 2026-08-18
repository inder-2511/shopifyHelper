import api from "./axios.js";

export const createOrderApi = async (orderData) => {
  const response = await api.post("api/orders/create", orderData);
  return response.data;
};

export const duplicateOrderApi = async (storeUrl, token, orderName, viaDraftOrder = false) => {
  const response = await api.post("api/orders/duplicate", { storeUrl, token, orderName, viaDraftOrder });
  return response.data;
};

export const fetchOrderApi = async (storeUrl, token, orderId) => {
  const response = await api.post("api/orders/fetch", { storeUrl, token, orderId });
  return response.data;
};
