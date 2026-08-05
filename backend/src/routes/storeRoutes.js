import express from "express";
import { createStore } from "../controllers/storeController.js";
import { logBus } from "../utils/logBus.js";
import { localOnly } from "../middleware/localOnly.js";

const router = express.Router();

router.use(localOnly);

router.post("/create", createStore);

router.get("/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const send = (message) => {
    res.write(`data: ${JSON.stringify({ message })}\n\n`);
  };

  send("Connected — waiting for store creation to start...");
  logBus.on("log", send);
  req.on("close", () => logBus.off("log", send));
});

export default router;
