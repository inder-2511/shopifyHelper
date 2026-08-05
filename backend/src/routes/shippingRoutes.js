import express from "express";
import { setupStoreShipping } from "../controllers/shippingController.js";
import { localOnly } from "../middleware/localOnly.js";

const router = express.Router();

router.use(localOnly);

router.post("/setup", setupStoreShipping);

export default router;
