import mongoose from "mongoose";

const agentSchema = new mongoose.Schema(
	{
		name: { type: String, required: true },
		role: { type: String, required: true },
		systemPrompt: { type: String, required: true },
		model: { type: String, default: "gpt-4-turbo" },
		tools: [{ type: String }], // e.g., ['search', 'calculator']
		channels: [{ type: String }], // e.g., ['telegram', 'web']
	},
	{ timestamps: true }
);

export const Agent = mongoose.model("Agent", agentSchema);
