import express from "express";
import {
	createWorkflow,
	deleteWorkflow,
	executeWorkflow,
	getWorkflowById,
	getWorkflowRunById,
	getWorkflowRuns,
	getWorkflows,
	scheduleWorkflow,
	updateWorkflow,
} from "../controllers/workflowController.js";
import { checkUserAuth } from "../middleware/index.js";

const router = express.Router();

router.use(checkUserAuth);

router.post("/", createWorkflow);
router.get("/", getWorkflows);
router.get("/:id/runs", getWorkflowRuns);
router.get("/runs/:runId", getWorkflowRunById);
router.get("/:id", getWorkflowById);
router.put("/:id", updateWorkflow);
router.delete("/:id", deleteWorkflow);
router.post("/:id/execute", executeWorkflow);
router.post("/:id/schedule", scheduleWorkflow);

export default router;
