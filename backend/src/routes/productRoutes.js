import express from "express";
import {
  createProduct,
  duplicateProduct,
  deleteProduct,
  fetchProduct,
  listProducts,
} from "../controllers/productController.js";

const router = express.Router();

router.post("/create", createProduct);
router.post("/duplicate", duplicateProduct);
router.post("/delete", deleteProduct);
router.post("/fetch", fetchProduct);
router.post("/list", listProducts);

export default router;
