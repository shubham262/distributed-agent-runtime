import { Worker } from "bullmq";
import { connection } from "../config/redis";

const worker = new Worker(
	"workflow-execution",
	async (job) => {
		const { workflowId, metadata } = job.data;
		// console.log(
		// 	`👷 Processing Job [${job.id}] for Workflow Layout: ${workflowId}`
		// );

		// // Compile the dynamic graph exactly like before
		// const executableGraph = await compileWorkflow(workflowId);

		// // Invoke the engine loop safely in the background
		// const finalResult = await executableGraph.invoke({
		// 	messages: [new HumanMessage(inputMessage)],
		// });

		// console.log(`✅ Job [${job.id}] Completed successfully.`);

		// TODO: Emit final result to Telegram or push via WebSockets to Web UI
		return finalResult;
	},
	{ connection, concurrency: 2 }
);

worker.on("completed", (job) => {
	console.log(`Job with id ${job.id} has been completed`);
});

worker.on("failed", (job, err) => {
	console.error(`🚨 Job [${job?.id}] Failed completely:`, err.message);
});
