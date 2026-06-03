import { Agent } from "./agent.js";
import User from "./user.js";
import { Workflow } from "./workflow.js";
import { WorkflowRun } from "./workflowRun.js";

const db = {
	User,
	Workflow,
	Agent,
	WorkflowRun,
};

export default db;
