import express from "express";
import {
	createWorkflow,
	deleteWorkflow,
	executeWorkflow,
	getWorkflowById,
	getWorkflows,
	updateWorkflow,
} from "../controllers/workflowController.js";
import { checkUserAuth } from "../middleware/index.js";

const router = express.Router();

router.use(checkUserAuth);

router.post("/", createWorkflow);
router.get("/", getWorkflows);
router.get("/:id", getWorkflowById);
router.put("/:id", updateWorkflow);
router.delete("/:id", deleteWorkflow);
router.post("/:id/execute", executeWorkflow);

export default router;
