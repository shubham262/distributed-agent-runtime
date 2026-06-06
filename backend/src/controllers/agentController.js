import * as agentService from "../service/agentService.js";

export const createAgent = async (req, res) => {
	try {
		const savedAgent = await agentService.handleCreateAgent(
			req.user.id,
			req.body
		);
		res.status(201).json(savedAgent);
	} catch (error) {
		res.status(error.statusCode || 500).json({ error: error.message });
	}
};

export const getAgents = async (req, res) => {
	try {
		const agents = await agentService.handleGetAgents(req.user.id);
		res.status(200).json(agents);
	} catch (error) {
		res.status(error.statusCode || 500).json({ error: error.message });
	}
};

export const getAgentsTools = async (req, res) => {
	try {
		const toolsMap = await agentService.handleGetAgentsTools();
		res.status(200).json(toolsMap);
	} catch (error) {
		res.status(error.statusCode || 500).json({ error: error.message });
	}
};

export const updateAgent = async (req, res) => {
	try {
		const updatedAgent = await agentService.handleUpdateAgent(
			req.params.id,
			req.body
		);
		res.status(200).json(updatedAgent);
	} catch (error) {
		res.status(error.statusCode || 500).json({ error: error.message });
	}
};

export const deleteAgent = async (req, res) => {
	try {
		await agentService.handleDeleteAgent(req.params.id);
		res.status(200).json({
			message:
				"Agent successfully purged from configuration platform database.",
			deletedAgentId: req.params.id,
		});
	} catch (error) {
		res.status(error.statusCode || 500).json({ error: error.message });
	}
};
