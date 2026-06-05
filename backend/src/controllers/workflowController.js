import mongoose from "mongoose";
import db from "../models/index.js";
import { enqueueWorkflow } from "../queue/index.js";

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

		const deletedWorkflow = await Workflow.findOneAndDelete({
			_id: id,
			...(userId ? { userId } : {}),
		});

		if (!deletedWorkflow) {
			return res.status(404).json({
				error: `Resource Not Found: No workflow layout matched ID ${id}`,
			});
		}

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
		const { metadata = {} } = req.body;
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
		await enqueueWorkflow(id, runId, metadata);
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
