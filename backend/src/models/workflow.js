import mongoose from "mongoose";

const workflowSchema = new mongoose.Schema(
	{
		name: { type: String, required: true },
		description: { type: String },
		isActive: { type: Boolean, default: true },

		uiGraph: { type: mongoose.Schema.Types.Mixed, required: true },

		agents: [{ type: mongoose.Schema.Types.ObjectId, ref: "Agent" }],
	},
	{ timestamps: true }
);

export const Workflow = mongoose.model("Workflow", workflowSchema);
