import { Agent } from "./agent.js";
import AgentRun from "./agentRun.js";
import User from "./user.js";
import { Workflow } from "./workflow.js";
import { WorkflowRun } from "./workflowRun.js";

const db = {
	User,
	Workflow,
	Agent,
	WorkflowRun,
	AgentRun,
};

export default db;
