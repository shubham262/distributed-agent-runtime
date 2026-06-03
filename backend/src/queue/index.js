import { Queue } from "bullmq";
import { connection } from "../config/redis.js";

export const workflowQueue = new Queue("workflow-execution", {
	connection,
});

export const enqueueWorkflow = async (workflowId, metadata = {}) => {
	await workflowQueue.add(
		"run-graph",
		{
			workflowId,
			metadata,
		},
		{
			attempts: 3,
			backoff: {
				type: "exponential",
				delay: 2000,
			},
		}
	);
};
