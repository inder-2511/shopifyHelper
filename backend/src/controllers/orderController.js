import { createOrderService, duplicateOrderService, fetchOrderService } from "../services/orderService.js";

export const createOrder = async (req, res) => {
  try {
    // viaDraftOrder is ours, not Shopify's — keep it out of the order payload.
    const { storeUrl, token, viaDraftOrder, ...orderData } = req.body;
    const result = await createOrderService(orderData, storeUrl, token, {
      viaDraftOrder: Boolean(viaDraftOrder),
    });
    res.json(result);
  } catch (error) {
    const shopifyError = error.response?.data;
    console.error("Order creation failed:", shopifyError ?? error.message);
    res.status(error.response?.status ?? 500).json({
      error: shopifyError ?? error.message,
    });
  }
};

export const fetchOrder = async (req, res) => {
  try {
    const { storeUrl, token, orderId } = req.body;
    const result = await fetchOrderService(orderId, storeUrl, token);
    res.json(result);
  } catch (error) {
    const shopifyError = error.response?.data;
    console.error("Order fetch failed:", shopifyError ?? error.message);
    res.status(error.response?.status ?? 500).json({
      error: shopifyError ?? error.message,
    });
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
    const shopifyError = error.response?.data;
    console.error("Order duplication failed:", shopifyError ?? error.message);
    res.status(error.response?.status ?? 500).json({
      error: shopifyError ?? error.message,
    });
  }
};
