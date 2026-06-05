// src/models/AgentRun.js
import mongoose from "mongoose";

const logEntrySchema = new mongoose.Schema(
	{
		action: { type: String, required: true },
		type: {
			type: String,
			enum: ["SYSTEM", "TOOL_CALL", "LLM_RESPONSE", "ERROR"],
			default: "SYSTEM",
		},
		timestamp: { type: Date, default: Date.now },
	},
	{ _id: false }
);

const agentRunSchema = new mongoose.Schema(
	{
		agentId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Agent",
			required: true,
		},
		userId: {
			type: String,
			required: true,
		},
		triggerType: {
			type: String,
			enum: ["MANUAL", "SCHEDULED"],
			required: true,
		},
		cronExpression: {
			type: String,
			default: null, // e.g., "0 * * * *" if woken up by BullMQ repeatable engine
		},
		status: {
			type: String,
			enum: ["IDLE", "QUEUED", "RUNNING", "PAUSED", "COMPLETED", "FAILED"],
			default: "IDLE",
		},
		inputPrompt: {
			type: String,
			default: null,
		},
		output: {
			type: mongoose.Schema.Types.Mixed,
			default: null,
		},
		logs: [logEntrySchema],
		metrics: {
			promptTokens: { type: Number, default: 0 },
			completionTokens: { type: Number, default: 0 },
			executionTimeMs: { type: Number, default: 0 },
		},
		errorReason: {
			type: String,
			default: null,
		},
	},
	{ timestamps: true }
);

agentRunSchema.index({ userId: 1, createdAt: -1 });
agentRunSchema.index({ agentId: 1, status: 1 });

const AgentRun = mongoose.model("AgentRun", agentRunSchema);
export default AgentRun;
