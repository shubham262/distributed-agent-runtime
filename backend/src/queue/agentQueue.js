
import { Queue } from "bullmq";
import { connection } from "../config/redis.js";


export const agentQueue = new Queue("agent-execution", {
	connection,
});

export const enqueueAgentRun = async (
	agentId,
	runId,
	inputPrompt = null,
	metadata = {}
) => {
	await agentQueue.add(
		"run-agent-standalone",
		{
			agentId,
			runId,
			inputPrompt,
			metadata,
		},
		{
			jobId: runId,
			attempts: 3,
			backoff: {
				type: "exponential",
				delay: 2000, // Wait 2s, then 4s, then 8s
			},
		}
	);
};
