import mongoose from "mongoose";
import db from "../models/index.js";
import { agentQueue, enqueueAgentRun } from "../queue/agentQueue.js";

const { Agent, AgentRun } = db;

export const createAgent = async (req, res) => {
	try {
		const { name, role, systemPrompt, model, tools, channels } = req.body;
		const userId = req.user.id;
		if (!name || name.trim() === "") {
			return res.status(400).json({
				error:
					"Validation Failed: 'name' is required and must be a non-empty string.",
			});
		}
		if (!role || role.trim() === "") {
			return res.status(400).json({
				error:
					"Validation Failed: 'role' is required and must be a non-empty string.",
			});
		}
		if (!systemPrompt || systemPrompt.trim() === "") {
			return res.status(400).json({
				error:
					"Validation Failed: 'systemPrompt' is required and must be a non-empty string.",
			});
		}

		const newAgent = new Agent({
			name: name.trim(),
			role: role.trim(),
			systemPrompt: systemPrompt.trim(),
			model: model || "gpt-4o-mini",
			tools: tools || [],
			channels: channels || [],
			userId,
		});

		const savedAgent = await newAgent.save();
		res.status(201).json(savedAgent);
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

export const getAgents = async (req, res) => {
	try {
		const userId = req.user.id;
		const agents = await Agent.find({
			userId,
		}).sort({ createdAt: -1 });
		res.status(200).json(agents);
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

export const updateAgent = async (req, res) => {
	try {
		const { id } = req.params;

		if (!mongoose.Types.ObjectId.isValid(id)) {
			return res.status(400).json({
				error: "Invalid Request: The provided agent ID format is invalid.",
			});
		}

		if (
			req.body.name !== undefined &&
			(!req.body.name || req.body.name.trim() === "")
		) {
			return res.status(400).json({
				error: "Validation Failed: 'name' cannot be updated to an empty value.",
			});
		}
		if (
			req.body.role !== undefined &&
			(!req.body.role || req.body.role.trim() === "")
		) {
			return res.status(400).json({
				error: "Validation Failed: 'role' cannot be updated to an empty value.",
			});
		}
		if (
			req.body.systemPrompt !== undefined &&
			(!req.body.systemPrompt || req.body.systemPrompt.trim() === "")
		) {
			return res.status(400).json({
				error:
					"Validation Failed: 'systemPrompt' cannot be updated to an empty value.",
			});
		}

		const updatedAgent = await Agent.findByIdAndUpdate(
			id,
			{ $set: req.body },
			{ returnDocument: "after", runValidators: true }
		);

		if (!updatedAgent) {
			return res.status(404).json({
				error: `Resource Not Found: No agent found matching ID ${id}`,
			});
		}

		res.status(200).json(updatedAgent);
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

export const deleteAgent = async (req, res) => {
	try {
		const { id } = req.params;

		if (!mongoose.Types.ObjectId.isValid(id)) {
			return res.status(400).json({
				error: "Invalid Request: The provided agent ID format is invalid.",
			});
		}

		const deletedAgent = await Agent.findByIdAndDelete(id);

		if (!deletedAgent) {
			return res.status(404).json({
				error: `Resource Not Found: No agent found matching ID ${id}`,
			});
		}

		res.status(200).json({
			message:
				"Agent successfully purged from configuration platform database.",
			deletedAgentId: id,
		});
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

export const playAgent = async (req, res) => {
	try {
		const { id } = req.params;
		const { inputPrompt = "", metadata = {} } = req.body || {};
		const userId = req.user?.id || "anonymous_user";

		const agent = await Agent.findById(id);
		if (!agent) {
			return res
				.status(404)
				.json({ error: "Compilation Error: Target agent profile not found." });
		}

		await Agent.findByIdAndUpdate(id, { status: "RUNNING" });

		const newRun = new AgentRun({
			agentId: id,
			userId,
			triggerType: "MANUAL",
			status: "QUEUED",
			inputPrompt: inputPrompt || null,
			logs: [
				{
					action:
						"Agent standalone execution triggered via Control Center API.",
					type: "SYSTEM",
				},
			],
		});

		await newRun.save();
		const runId = newRun._id.toString();

		await enqueueAgentRun(id, runId, inputPrompt, metadata);

		res.status(202).json({
			success: true,
			message:
				"Standalone agent turn successfully queued for background processing.",
			runId,
			agentStatus: "RUNNING",
		});
	} catch (error) {
		console.error("Play API Execution Error:", error);
		res.status(500).json({ error: error.message });
	}
};

export const pauseAgent = async (req, res) => {
	try {
		const { id } = req.params; // agentId

		const agent = await Agent.findById(id);
		if (!agent) {
			return res.status(404).json({ error: "Target agent profile not found." });
		}

		await Agent.findByIdAndUpdate(id, { status: "IDLE" });

		const activeRuns = await AgentRun.find({
			agentId: id,
			status: { $in: ["QUEUED", "RUNNING"] },
		});

		let dequeuedCount = 0;
		let activeHaltedCount = 0;

		for (const run of activeRuns) {
			const runIdStr = run._id.toString();

			const job = await agentQueue.getJob(runIdStr);

			if (job) {
				const jobState = await job.getState();

				if (jobState === "active") {
					await job.discard();
					activeHaltedCount++;
				} else if (jobState === "waiting" || jobState === "delayed") {
					await job.remove();
					dequeuedCount++;
				}
			}

			await AgentRun.findByIdAndUpdate(run._id, {
				status: "PAUSED",
				errorReason:
					"Execution terminated: Aborted by operator command from control console.",
				$push: {
					logs: {
						action: `Pipeline hard stopped by user command. State in Redis was: ${
							job ? await job.getState() : "unknown"
						}.`,
						type: "ERROR",
					},
				},
			});
		}

		res.status(200).json({
			success: true,
			message: "Agent operations successfully halted.",
			agentStatus: "IDLE",
			telemetry: {
				totalRunsIntercepted: activeRuns.length,
				dequeuedFromWaiting: dequeuedCount,
				haltedMidExecution: activeHaltedCount,
			},
		});
	} catch (error) {
		console.error("Pause API Execution Error:", error);
		res.status(500).json({ error: error.message });
	}
};
