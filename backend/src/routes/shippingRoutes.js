import express from "express";
import { setupStoreShipping } from "../controllers/shippingController.js";

const router = express.Router();

// REST/GraphQL-based — safe to run on the hosted backend.
router.post("/setup", setupStoreShipping);

export default router;
