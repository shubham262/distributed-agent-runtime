import mongoose from "mongoose";
import db from "../models/index.js";
import { enqueueWorkflow, workflowQueue } from "../queue/index.js";

const { Workflow, WorkflowRun } = db;

const extractAgentIdsFromGraph = (uiGraph = {}) => {
	const nodes = Array.isArray(uiGraph.nodes) ? uiGraph.nodes : [];

	return [
		...new Set(
			nodes
				.filter(
					(node) =>
						node?.type === "agent" && node?.data?.agentId
				)
				.map((node) => node.data.agentId)
		),
	];
};

export const createWorkflow = async (req, res) => {
	try {
		const { name, description, uiGraph, agents, isActive } = req.body;
		const userId = req.user?.id;

		if (!name || name.trim() === "") {
			return res.status(400).json({
				error:
					"Validation Failed: 'name' is required and must be a non-empty string.",
			});
		}
		if (!uiGraph || Array.isArray(uiGraph)) {
			return res.status(400).json({
				error:
					"Validation Failed: 'uiGraph' is required and must be a valid JSON object representing the canvas configuration.",
			});
		}
		if (!userId) {
			return res.status(401).json({
				error: "Authentication required to create a workflow.",
			});
		}

		const derivedAgents =
			Array.isArray(agents)
				? agents
				: extractAgentIdsFromGraph(uiGraph);

		if (derivedAgents.length > 0) {
			for (const agentId of derivedAgents) {
				if (!mongoose.Types.ObjectId.isValid(agentId)) {
					return res.status(400).json({
						error: `Validation Failed: Invalid Agent ID format detected: '${agentId}'`,
					});
				}
			}
		}

		const newWorkflow = new Workflow({
			name: name.trim(),
			description: description ? description.trim() : "",
			uiGraph,
			agents: derivedAgents,
			isActive: isActive !== undefined ? isActive : true,
			userId,
		});

		const savedWorkflow = await newWorkflow.save();
		const populatedWorkflow = await savedWorkflow.populate("agents");
		res.status(201).json(populatedWorkflow);
	} catch (error) {
		console.error("Error creating workflow:", error);
		res.status(500).json({ error: error.message });
	}
};

export const getWorkflowById = async (req, res) => {
	try {
		const { id } = req.params;
		const userId = req.user?.id;

		if (!mongoose.Types.ObjectId.isValid(id)) {
			return res.status(400).json({
				error: "Invalid Request: The provided workflow ID format is invalid.",
			});
		}

		const workflow = await Workflow.findOne({
			_id: id,
			...(userId ? { userId } : {}),
		}).populate("agents");

		if (!workflow) {
			return res.status(404).json({
				error: `Resource Not Found: No workflow layout matched ID ${id}`,
			});
		}

		res.status(200).json(workflow);
	} catch (error) {
		console.error("Error fetching workflow:", error);
		res.status(500).json({ error: error.message });
	}
};

export const getWorkflows = async (req, res) => {
	try {
		const userId = req.user?.id;
		const query = userId ? { userId } : {};

		const workflows = await Workflow.find(query)
			.populate("agents")
			.sort({ createdAt: -1 });

		res.status(200).json(workflows);
	} catch (error) {
		console.error("Error fetching workflows:", error);
		res.status(500).json({ error: error.message });
	}
};

export const getAllWorkflowRuns = async (req, res) => {
	try {
		const userId = req.user?.id;

		if (!userId) {
			return res.status(401).json({
				error: "Authentication required to list workflow runs.",
			});
		}

		const runs = await WorkflowRun.find({ userId })
			.sort({ createdAt: -1 })
			.limit(100)
			.populate("workflowId", "name");

		res.status(200).json(runs);
	} catch (error) {
		console.error("Error fetching all workflow runs:", error);
		res.status(500).json({ error: error.message });
	}
};

export const getWorkflowRuns = async (req, res) => {
	try {
		const { id } = req.params;
		const userId = req.user?.id;

		if (!mongoose.Types.ObjectId.isValid(id)) {
			return res.status(400).json({
				error: "Invalid Request: The provided workflow ID format is invalid.",
			});
		}

		const runs = await WorkflowRun.find({
			workflowId: id,
			...(userId ? { userId } : {}),
		})
			.sort({ createdAt: -1 })
			.limit(50);

		res.status(200).json(runs);
	} catch (error) {
		console.error("Error fetching workflow runs:", error);
		res.status(500).json({ error: error.message });
	}
};

export const getWorkflowRunById = async (req, res) => {
	try {
		const { runId } = req.params;
		const userId = req.user?.id;

		if (!mongoose.Types.ObjectId.isValid(runId)) {
			return res.status(400).json({
				error: "Invalid Request: The provided run ID format is invalid.",
			});
		}

		const run = await WorkflowRun.findOne({
			_id: runId,
			...(userId ? { userId } : {}),
		}).populate("workflowId");

		if (!run) {
			return res.status(404).json({
				error: `Resource Not Found: No workflow run matched ID ${runId}`,
			});
		}

		res.status(200).json(run);
	} catch (error) {
		console.error("Error fetching workflow run:", error);
		res.status(500).json({ error: error.message });
	}
};

export const updateWorkflow = async (req, res) => {
	try {
		const { id } = req.params;
		const { name, uiGraph, agents } = req.body;
		const userId = req.user?.id;

		if (!mongoose.Types.ObjectId.isValid(id)) {
			return res.status(400).json({
				error: "Invalid Request: The provided workflow ID format is invalid.",
			});
		}

		if (name !== undefined && (!name || name.trim() === "")) {
			return res.status(400).json({
				error: "Validation Failed: 'name' cannot be updated to an empty value.",
			});
		}
		if (
			uiGraph !== undefined &&
			(typeof uiGraph !== "object" || Array.isArray(uiGraph))
		) {
			return res.status(400).json({
				error: "Validation Failed: 'uiGraph' must be a structured JSON object.",
			});
		}

		if (agents !== undefined) {
			if (!Array.isArray(agents)) {
				return res
					.status(400)
					.json({ error: "Validation Failed: 'agents' must be an array." });
			}
			for (const agentId of agents) {
				if (!mongoose.Types.ObjectId.isValid(agentId)) {
					return res.status(400).json({
						error: `Validation Failed: Invalid Agent ID format inside references: '${agentId}'`,
					});
				}
			}
		}

		const existingWorkflow = await Workflow.findOne({
			_id: id,
			...(userId ? { userId } : {}),
		});

		if (!existingWorkflow) {
			return res.status(404).json({
				error: `Resource Not Found: No workflow layout matched ID ${id}`,
			});
		}

		const derivedAgents =
			Array.isArray(agents) && agents.length > 0
				? agents
				: uiGraph
				? extractAgentIdsFromGraph(uiGraph)
				: existingWorkflow.agents.map((agentId) => agentId.toString());

		if (Array.isArray(derivedAgents)) {
			for (const agentId of derivedAgents) {
				if (!mongoose.Types.ObjectId.isValid(agentId)) {
					return res.status(400).json({
						error: `Validation Failed: Invalid Agent ID format inside references: '${agentId}'`,
					});
				}
			}
		}

		const updatePayload = {};
		if (name !== undefined) updatePayload.name = name.trim();
		if (req.body.description !== undefined) {
			updatePayload.description = req.body.description
				? req.body.description.trim()
				: "";
		}
		if (uiGraph !== undefined) updatePayload.uiGraph = uiGraph;
		if (agents !== undefined || uiGraph !== undefined) {
			updatePayload.agents = derivedAgents;
		}
		if (req.body.isActive !== undefined) {
			updatePayload.isActive = req.body.isActive;
		}

		const updatedWorkflow = await Workflow.findByIdAndUpdate(
			id,
			{ $set: updatePayload },
			{ returnDocument: "after", runValidators: true }
		).populate("agents");

		if (!updatedWorkflow) {
			return res.status(404).json({
				error: `Resource Not Found: No workflow layout matched ID ${id}`,
			});
		}

		res.status(200).json(updatedWorkflow);
	} catch (error) {
		console.error("Error updating workflow:", error);
		res.status(500).json({ error: error.message });
	}
};

export const deleteWorkflow = async (req, res) => {
	try {
		const { id } = req.params;
		const userId = req.user?.id;

		if (!mongoose.Types.ObjectId.isValid(id)) {
			return res.status(400).json({
				error: "Invalid Request: The provided workflow ID format is invalid.",
			});
		}

		const workflow = await Workflow.findOne({
			_id: id,
			...(userId ? { userId } : {}),
		});

		if (!workflow) {
			return res.status(404).json({
				error: `Resource Not Found: No workflow layout matched ID ${id}`,
			});
		}

		if (workflow.schedule?.jobId) {
			const scheduledJob = await workflowQueue.getJob(workflow.schedule.jobId);
			if (scheduledJob) {
				await scheduledJob.remove();
			}
		}

		await Workflow.deleteOne({ _id: id });

		res.status(200).json({
			message: "Workflow layout cleanly deleted from tracking database.",
			deletedWorkflowId: id,
		});
	} catch (error) {
		console.error("Error deleting workflow:", error);
		res.status(500).json({ error: error.message });
	}
};

export const executeWorkflow = async (req, res) => {
	try {
		const { id } = req.params;
		const { metadata = {}, prompt = "" } = req.body;
		const userId = req.user?.id;

		if (!userId) {
			return res.status(401).json({
				error: "Authentication required to execute a workflow.",
			});
		}

		const workflow = await Workflow.findOne({
			_id: id,
			userId,
		});

		if (!workflow) {
			return res.status(404).json({
				error: `Resource Not Found: No workflow layout matched ID ${id}`,
			});
		}

		const newRun = new WorkflowRun({
			workflowId: id,
			userId,
			status: "QUEUED",
			logs: [{ action: "Workflow execution initialized and added to queue." }],
		});
		await newRun.save();
		const runId = newRun._id.toString();
		await enqueueWorkflow(id, runId, { ...metadata, prompt });
		res.status(202).json({
			success: true,
			message: "Workflow job queued for background processing execution.",
			runId: runId,
		});
	} catch (error) {
		console.error("Error executing workflow:", error);
		res.status(500).json({ error: error.message });
	}
};

export const scheduleWorkflow = async (req, res) => {
	try {
		const { id } = req.params;
		const { runAt, timezone = "UTC", metadata = {}, prompt = "" } = req.body || {};
		const userId = req.user?.id;

		if (!userId) {
			return res.status(401).json({
				error: "Authentication required to schedule a workflow.",
			});
		}

		const workflow = await Workflow.findOne({
			_id: id,
			userId,
		});

		if (!workflow) {
			return res.status(404).json({
				error: `Resource Not Found: No workflow layout matched ID ${id}`,
			});
		}

		const parsedRunAt = new Date(runAt);
		if (Number.isNaN(parsedRunAt.getTime())) {
			return res.status(400).json({
				error: "Validation Failed: 'runAt' must be a valid date/time value.",
			});
		}

		const delay = Math.max(parsedRunAt.getTime() - Date.now(), 0);
		if (workflow.schedule?.jobId) {
			const existingJob = await workflowQueue.getJob(workflow.schedule.jobId);
			if (existingJob) {
				await existingJob.remove();
			}
		}

		const newRun = new WorkflowRun({
			workflowId: id,
			userId,
			status: "QUEUED",
			logs: [
				{
					action: `Workflow scheduled for ${parsedRunAt.toISOString()}.`,
				},
			],
		});
		await newRun.save();

		await enqueueWorkflow(id, newRun._id.toString(), {
			...metadata,
			prompt,
			delay,
			jobId: newRun._id.toString(),
			scheduledAt: parsedRunAt.toISOString(),
			timezone,
		});

		workflow.schedule = {
			enabled: true,
			runAt: parsedRunAt,
			timezone,
			status: "SCHEDULED",
			jobId: newRun._id.toString(),
			lastRunId: newRun._id.toString(),
			lastRunAt: null,
			metadata,
		};
		await workflow.save();

		res.status(202).json({
			success: true,
			message: "Workflow scheduled successfully.",
			runId: newRun._id.toString(),
			scheduledFor: parsedRunAt.toISOString(),
		});
	} catch (error) {
		console.error("Error scheduling workflow:", error);
		res.status(500).json({ error: error.message });
	}
};
