import {
  createProductService,
  duplicateProductService,
  deleteProductService,
  fetchProductService,
  listProductsService,
} from "../services/productService.js";

const respondWithError = (res, error, label) => {
  const shopifyError = error.response?.data;
  console.error(`${label} failed:`, shopifyError ?? error.message);
  res.status(error.response?.status ?? 500).json({
    error: shopifyError ?? error.message,
  });
};

export const createProduct = async (req, res) => {
  try {
    const { storeUrl, token, ...productData } = req.body;
    const product = await createProductService(productData, storeUrl, token);
    res.json({ product });
  } catch (error) {
    respondWithError(res, error, "Product creation");
  }
};

export const fetchProduct = async (req, res) => {
  try {
    const { storeUrl, token, productId } = req.body;
    const product = await fetchProductService(productId, storeUrl, token);
    res.json({ product });
  } catch (error) {
    respondWithError(res, error, "Product fetch");
  }
};

export const listProducts = async (req, res) => {
  try {
    const { storeUrl, token, limit, pageInfo } = req.body;
    const result = await listProductsService(storeUrl, token, { limit, pageInfo });
    res.json(result);
  } catch (error) {
    respondWithError(res, error, "Product list");
  }
};

export const duplicateProduct = async (req, res) => {
  try {
    const { storeUrl, token, productId } = req.body;
    const result = await duplicateProductService(productId, storeUrl, token);
    res.json(result);
  } catch (error) {
    respondWithError(res, error, "Product duplication");
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const { storeUrl, token, productId } = req.body;
    const result = await deleteProductService(productId, storeUrl, token);
    res.json(result);
  } catch (error) {
    respondWithError(res, error, "Product deletion");
  }
};
