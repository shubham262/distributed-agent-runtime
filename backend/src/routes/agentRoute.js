import express from "express";
import {
	createAgent,
	getAgents,
	updateAgent,
	deleteAgent,
	playAgent,
	pauseAgent,
	getAgentsTools,
} from "../controllers/agentController.js";
import { checkUserAuth } from "../middleware/index.js";

const router = express.Router();

router.post("/", checkUserAuth, createAgent);
router.get("/", checkUserAuth, getAgents);
router.get("/agents/tools", checkUserAuth, getAgentsTools);
router.put("/:id", checkUserAuth, updateAgent);
router.delete("/:id", checkUserAuth, deleteAgent);
router.post("/:id/play", checkUserAuth, playAgent);
router.post("/:id/pause", checkUserAuth, pauseAgent);

export default router;
