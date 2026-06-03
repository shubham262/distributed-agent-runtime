import mongoose from "mongoose";

const workflowRunSchema = new mongoose.Schema(
	{
		workflowId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Workflow",
			required: true,
		},
		userId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},

		status: {
			type: String,
			enum: ["QUEUED", "RUNNING", "PAUSED", "COMPLETED", "FAILED"],
			default: "QUEUED",
		},

		output: { type: mongoose.Schema.Types.Mixed, default: null },
		graphState: { type: mongoose.Schema.Types.Mixed, default: {} },

		logs: [
			{
				agentId: String,
				agentName: String,
				action: String,
				timestamp: { type: Date, default: Date.now },
			},
		],

		metrics: {
			promptTokens: { type: Number, default: 0 },
			completionTokens: { type: Number, default: 0 },
			totalCostUSD: { type: Number, default: 0 },
			executionTimeMs: { type: Number, default: 0 },
		},

		errorReason: { type: String },
	},
	{ timestamps: true }
);

export const WorkflowRun = mongoose.model("WorkflowRun", workflowRunSchema);
