import mongoose from "mongoose";
import db from "../models/index.js";
import { registry, toolsNameMap } from "../helpers/tools.js";

const { Agent } = db;

/**
 * Creates a new agent workspace configuration
 */
export const handleCreateAgent = async (userId, agentData) => {
	const { name, role, systemPrompt, model, tools, channels } = agentData || {};

	if (!name || name.trim() === "") {
		const error = new Error(
			"Validation Failed: 'name' is required and must be a non-empty string."
		);
		error.statusCode = 400;
		throw error;
	}
	if (!role || role.trim() === "") {
		const error = new Error(
			"Validation Failed: 'role' is required and must be a non-empty string."
		);
		error.statusCode = 400;
		throw error;
	}
	if (!systemPrompt || systemPrompt.trim() === "") {
		const error = new Error(
			"Validation Failed: 'systemPrompt' is required and must be a non-empty string."
		);
		error.statusCode = 400;
		throw error;
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

	return await newAgent.save();
};

/**
 * Retrieves all agents belonging to a specific user context
 */
export const handleGetAgents = async (userId) => {
	return await Agent.find({ userId }).sort({ createdAt: -1 });
};

/**
 * Maps the functional tools registry configuration options
 */
export const handleGetAgentsTools = async () => {
	const tools = Object.keys(registry);
	return tools.map((toolName) => ({
		value: toolName,
		label: toolsNameMap[toolName] || toolName,
	}));
};

/**
 * Updates an existing agent with validation protections
 */
export const handleUpdateAgent = async (agentId, updateData) => {
	if (!mongoose.Types.ObjectId.isValid(agentId)) {
		const error = new Error(
			"Invalid Request: The provided agent ID format is invalid."
		);
		error.statusCode = 400;
		throw error;
	}

	if (
		updateData.name !== undefined &&
		(!updateData.name || updateData.name.trim() === "")
	) {
		const error = new Error(
			"Validation Failed: 'name' cannot be updated to an empty value."
		);
		error.statusCode = 400;
		throw error;
	}
	if (
		updateData.role !== undefined &&
		(!updateData.role || updateData.role.trim() === "")
	) {
		const error = new Error(
			"Validation Failed: 'role' cannot be updated to an empty value."
		);
		error.statusCode = 400;
		throw error;
	}
	if (
		updateData.systemPrompt !== undefined &&
		(!updateData.systemPrompt || updateData.systemPrompt.trim() === "")
	) {
		const error = new Error(
			"Validation Failed: 'systemPrompt' cannot be updated to an empty value."
		);
		error.statusCode = 400;
		throw error;
	}

	// Build the payload safely
	const payload = { ...updateData };
	if (payload.name) payload.name = payload.name.trim();
	if (payload.role) payload.role = payload.role.trim();
	if (payload.systemPrompt) payload.systemPrompt = payload.systemPrompt.trim();

	const updatedAgent = await Agent.findByIdAndUpdate(
		agentId,
		{ $set: payload },
		{ returnDocument: "after", runValidators: true }
	);

	if (!updatedAgent) {
		const error = new Error(
			`Resource Not Found: No agent found matching ID ${agentId}`
		);
		error.statusCode = 404;
		throw error;
	}

	return updatedAgent;
};

/**
 * Purges an agent config from the platform tracking database
 */
export const handleDeleteAgent = async (agentId) => {
	if (!mongoose.Types.ObjectId.isValid(agentId)) {
		const error = new Error(
			"Invalid Request: The provided agent ID format is invalid."
		);
		error.statusCode = 400;
		throw error;
	}

	const deletedAgent = await Agent.findByIdAndDelete(agentId);

	if (!deletedAgent) {
		const error = new Error(
			`Resource Not Found: No agent found matching ID ${agentId}`
		);
		error.statusCode = 404;
		throw error;
	}

	return deletedAgent;
};
