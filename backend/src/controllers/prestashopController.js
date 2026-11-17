import { createPrestaApi } from "../config/prestashop.js";
import {
  createProductService,
  fetchProductService,
  listProductsService,
  duplicateProductService,
  deleteProductService,
} from "../services/prestashop/productService.js";
import {
  createOrderService,
  fetchOrderService,
  duplicateOrderService,
  updateOrderService,
} from "../services/prestashop/orderService.js";
import {
  testConnectionService,
  referenceDataService,
  listResourceService,
  importProductsService,
} from "../services/prestashop/storeService.js";

/**
 * Every PrestaShop endpoint takes { shopUrl, apiKey, ...args } in the body
 * (the key never goes in a URL) and returns either the service result or
 * { error, errors, sentPayload } with the store's own HTTP status.
 */
const handle = (label, service) => async (req, res) => {
  try {
    const { shopUrl, apiKey, ...args } = req.body ?? {};
    const api = createPrestaApi(shopUrl, apiKey);
    res.json(await service(api, args));
  } catch (error) {
    // Never log the API key — only what the store said.
    console.error(`PrestaShop ${label} failed:`, error.body ?? error.message);
    res.status(error.status ?? 400).json({
      error: error.message,
      errors: error.body?.errors,
      sentPayload: error.sentPayload ?? undefined,
    });
  }
};

export const testConnection = handle("connection test", (api) => testConnectionService(api));
export const referenceData = handle("reference data", (api) => referenceDataService(api));
export const listResource = handle("resource list", (api, a) => listResourceService(api, a));
export const importProducts = handle("product import", (api, a) => importProductsService(api, a));

export const createProduct = handle("product creation", (api, a) => createProductService(api, a));
export const fetchProduct = handle("product fetch", (api, a) => fetchProductService(api, a.productId));
export const listProducts = handle("product list", (api, a) => listProductsService(api, a));
export const duplicateProduct = handle("product duplication", (api, a) => duplicateProductService(api, a.productId));
export const deleteProduct = handle("product deletion", (api, a) => deleteProductService(api, a.productId));

export const createOrder = handle("order creation", (api, a) => createOrderService(api, a));
export const fetchOrder = handle("order fetch", (api, a) => fetchOrderService(api, a.orderId));
export const duplicateOrder = handle("order duplication", (api, a) => duplicateOrderService(api, a.orderId, a));
export const updateOrder = handle("order update", (api, a) => updateOrderService(api, a.order));
