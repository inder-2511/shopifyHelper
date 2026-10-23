import express from "express";
import {
  createOrder,
  duplicateOrder,
  fetchOrder,
  cloneTemplate,
} from "../controllers/orderController.js";

const router = express.Router();

router.post("/create", createOrder);
router.post("/duplicate", duplicateOrder);
router.post("/fetch", fetchOrder);
router.post("/clone-template", cloneTemplate);

export default router;
