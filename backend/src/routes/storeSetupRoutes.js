import express from "express";
import { runSetupMarkets, runImportProducts, runActivatePayment } from "../controllers/storeSetupController.js";
import { setupStoreShipping } from "../controllers/shippingController.js";
import { localOnly } from "../middleware/localOnly.js";

const router = express.Router();

// REST/GraphQL-based — safe to run on the hosted backend.
router.post("/markets", runSetupMarkets);
router.post("/shipping", setupStoreShipping);
router.post("/products", runImportProducts);

// Playwright-based — only runs when DISABLE_LOCAL_FEATURES is unset.
router.post("/payment", localOnly, runActivatePayment);

export default router;
