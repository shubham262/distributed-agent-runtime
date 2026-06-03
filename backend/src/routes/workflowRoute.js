import express from "express";
import {
	createWorkflow,
	deleteWorkflow,
	executeWorkflow,
	getWorkflows,
	updateWorkflow,
} from "../controllers/workflowController.js";

const router = express.Router();

router.post("/", createWorkflow);
router.get("/", getWorkflows);
router.put("/:id", updateWorkflow);
router.delete("/:id", deleteWorkflow);
router.post("/:id/execute", executeWorkflow);

export default router;
