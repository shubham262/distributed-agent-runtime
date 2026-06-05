import { Queue } from "bullmq";
import { connection } from "../config/redis.js";

export const workflowQueue = new Queue("workflow-execution", {
	connection,
});

export const enqueueWorkflow = async (workflowId, runId, metadata = {}) => {
	const { delay = 0, jobId, ...restMetadata } = metadata || {};
	await workflowQueue.add(
		"run-graph",
		{
			workflowId,
			runId,
			metadata: restMetadata,
		},
		{
			delay,
			jobId: jobId || runId,
			attempts: 3,
			backoff: {
				type: "exponential",
				delay: 2000,
			},
		}
	);
};
