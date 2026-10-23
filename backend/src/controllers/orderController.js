import {
  createOrderService,
  duplicateOrderService,
  fetchOrderService,
  cloneTemplateService,
} from "../services/orderService.js";

const respondWithError = (res, error, label) => {
  const shopifyError = error.response?.data;
  console.error(`${label} failed:`, shopifyError ?? error.message);
  res.status(error.response?.status ?? 500).json({
    error: shopifyError ?? error.message,
    sentPayload: error.sentPayload ?? null,
  });
};

export const createOrder = async (req, res) => {
  try {
    // viaDraftOrder is ours, not Shopify's — keep it out of the order payload.
    const { storeUrl, token, viaDraftOrder, ...orderData } = req.body;
    const result = await createOrderService(orderData, storeUrl, token, {
      viaDraftOrder: Boolean(viaDraftOrder),
    });
    res.json(result);
  } catch (error) {
    respondWithError(res, error, "Order creation");
  }
};

export const fetchOrder = async (req, res) => {
  try {
    const { storeUrl, token, orderId } = req.body;
    const result = await fetchOrderService(orderId, storeUrl, token);
    res.json(result);
  } catch (error) {
    respondWithError(res, error, "Order fetch");
  }
};

export const cloneTemplate = async (req, res) => {
  try {
    const { storeUrl, token, orderId } = req.body;
    const result = await cloneTemplateService(orderId, storeUrl, token);
    res.json(result);
  } catch (error) {
    respondWithError(res, error, "Order clone template");
  }
};

export const duplicateOrder = async (req, res) => {
  try {
    const { storeUrl, token, orderName, viaDraftOrder } = req.body;
    const result = await duplicateOrderService(orderName, storeUrl, token, {
      viaDraftOrder: Boolean(viaDraftOrder),
    });
    res.json(result);
  } catch (error) {
    respondWithError(res, error, "Order duplication");
  }
};
