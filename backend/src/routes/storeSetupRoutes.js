import express from "express";
import { runSetupMarkets, runImportProducts, runActivatePayment } from "../controllers/storeSetupController.js";
import { setupStoreShipping } from "../controllers/shippingController.js";
import { localOnly } from "../middleware/localOnly.js";

const router = express.Router();

router.use(localOnly);

router.post("/markets", runSetupMarkets);
router.post("/shipping", setupStoreShipping);
router.post("/products", runImportProducts);
router.post("/payment", runActivatePayment);

export default router;
