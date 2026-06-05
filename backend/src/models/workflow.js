import mongoose from "mongoose";

const workflowSchema = new mongoose.Schema(
	{
		name: { type: String, required: true },
		description: { type: String },
		isActive: { type: Boolean, default: true },
		userId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},

		uiGraph: { type: mongoose.Schema.Types.Mixed, required: true },

		agents: [{ type: mongoose.Schema.Types.ObjectId, ref: "Agent" }],

		schedule: {
			enabled: { type: Boolean, default: false },
			runAt: { type: Date, default: null },
			timezone: { type: String, default: "UTC" },
			status: {
				type: String,
				enum: ["IDLE", "SCHEDULED", "RUNNING", "COMPLETED", "FAILED"],
				default: "IDLE",
			},
			jobId: { type: String, default: null },
			lastRunId: { type: String, default: null },
			lastRunAt: { type: Date, default: null },
			metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
		},
	},
	{ timestamps: true }
);

export const Workflow = mongoose.model("Workflow", workflowSchema);
