import express from "express";
import {
	createAgent,
	getAgents,
	updateAgent,
	deleteAgent,
} from "../controllers/agentController.js";

const router = express.Router();

router.post("/", createAgent);
router.get("/", getAgents);
router.put("/:id", updateAgent);
router.delete("/:id", deleteAgent);

export default router;
