import express from "express";
import { handleTelegramWebhook } from "../controllers/telegramController.js";

const router = express.Router();

router.post("/webhook", handleTelegramWebhook);

export default router;
