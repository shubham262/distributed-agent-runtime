import mongoose from "mongoose";
import db from "../models/index.js";
import { enqueueWorkflow } from "../queue/index.js";

const { Workflow } = db;

export const createWorkflow = async (req, res) => {
	try {
		const { name, description, uiGraph, agents, isActive } = req.body;

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

		if (agents) {
			if (!Array.isArray(agents)) {
				return res.status(400).json({
					error:
						"Validation Failed: 'agents' must be an array of referencing Agent IDs.",
				});
			}

			for (const agentId of agents) {
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
			agents: agents || [],
			isActive: isActive !== undefined ? isActive : true,
		});

		const savedWorkflow = await newWorkflow.save();
		res.status(201).json(savedWorkflow);
	} catch (error) {
		console.error("Error creating workflow:", error);
		res.status(500).json({ error: error.message });
	}
};

export const getWorkflows = async (req, res) => {
	try {
		const workflows = await Workflow.find()
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

		const updatedWorkflow = await Workflow.findByIdAndUpdate(
			id,
			{ $set: req.body },
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

		if (!mongoose.Types.ObjectId.isValid(id)) {
			return res.status(400).json({
				error: "Invalid Request: The provided workflow ID format is invalid.",
			});
		}

		const deletedWorkflow = await Workflow.findByIdAndDelete(id);

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
		await enqueueWorkflow(id, metadata);
		res.status(202).json({
			success: true,
			message: "Workflow job queued for background processing execution.",
		});
	} catch (error) {
		console.error("Error executing workflow:", error);
		res.status(500).json({ error: error.message });
	}
};
