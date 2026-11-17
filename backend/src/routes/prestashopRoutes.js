import express from "express";
import * as c from "../controllers/prestashopController.js";

const router = express.Router();

router.post("/test", c.testConnection);
router.post("/reference", c.referenceData);
router.post("/resource", c.listResource);
router.post("/import-products", c.importProducts);

router.post("/products/create", c.createProduct);
router.post("/products/fetch", c.fetchProduct);
router.post("/products/list", c.listProducts);
router.post("/products/duplicate", c.duplicateProduct);
router.post("/products/delete", c.deleteProduct);

router.post("/orders/create", c.createOrder);
router.post("/orders/fetch", c.fetchOrder);
router.post("/orders/duplicate", c.duplicateOrder);
router.post("/orders/update", c.updateOrder);

export default router;
