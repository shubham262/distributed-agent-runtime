import mongoose from "mongoose";
import db from "../models/index.js";

const { Agent } = db;

export const createAgent = async (req, res) => {
	try {
		const { name, role, systemPrompt, model, tools, channels } = req.body;

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
		});

		const savedAgent = await newAgent.save();
		res.status(201).json(savedAgent);
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

export const getAgents = async (req, res) => {
	try {
		const agents = await Agent.find().sort({ createdAt: -1 });
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
