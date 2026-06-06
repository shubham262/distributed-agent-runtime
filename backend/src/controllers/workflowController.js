import * as workflowService from "../service/workflowService.js";

export const createWorkflow = async (req, res) => {
	try {
		const workflow = await workflowService.handleCreateWorkflow(
			req.user?.id,
			req.body
		);
		res.status(201).json(workflow);
	} catch (error) {
		res.status(error.statusCode || 500).json({ error: error.message });
	}
};

export const getWorkflowById = async (req, res) => {
	try {
		const workflow = await workflowService.handleGetWorkflowById(
			req.params.id,
			req.user?.id
		);
		res.status(200).json(workflow);
	} catch (error) {
		res.status(error.statusCode || 500).json({ error: error.message });
	}
};

export const getWorkflows = async (req, res) => {
	try {
		const workflows = await workflowService.handleGetWorkflows(req.user?.id);
		res.status(200).json(workflows);
	} catch (error) {
		res.status(error.statusCode || 500).json({ error: error.message });
	}
};

export const getAllWorkflowRuns = async (req, res) => {
	try {
		const runs = await workflowService.handleGetAllWorkflowRuns(req.user?.id);
		res.status(200).json(runs);
	} catch (error) {
		res.status(error.statusCode || 500).json({ error: error.message });
	}
};

export const getWorkflowRuns = async (req, res) => {
	try {
		const runs = await workflowService.handleGetWorkflowRuns(
			req.params.id,
			req.user?.id
		);
		res.status(200).json(runs);
	} catch (error) {
		res.status(error.statusCode || 500).json({ error: error.message });
	}
};

export const getWorkflowRunById = async (req, res) => {
	try {
		const run = await workflowService.handleGetWorkflowRunById(
			req.params.runId,
			req.user?.id
		);
		res.status(200).json(run);
	} catch (error) {
		res.status(error.statusCode || 500).json({ error: error.message });
	}
};

export const updateWorkflow = async (req, res) => {
	try {
		const updatedWorkflow = await workflowService.handleUpdateWorkflow(
			req.params.id,
			req.user?.id,
			req.body
		);
		res.status(200).json(updatedWorkflow);
	} catch (error) {
		res.status(error.statusCode || 500).json({ error: error.message });
	}
};

export const deleteWorkflow = async (req, res) => {
	try {
		const deletedId = await workflowService.handleDeleteWorkflow(
			req.params.id,
			req.user?.id
		);
		res.status(200).json({
			message: "Workflow layout cleanly deleted from tracking database.",
			deletedWorkflowId: deletedId,
		});
	} catch (error) {
		res.status(error.statusCode || 500).json({ error: error.message });
	}
};

export const executeWorkflow = async (req, res) => {
	try {
		const runId = await workflowService.handleExecuteWorkflow(
			req.params.id,
			req.user?.id,
			req.body,
			req.user
		);
		res.status(202).json({
			success: true,
			message: "Workflow job queued for background processing execution.",
			runId: runId,
		});
	} catch (error) {
		res.status(error.statusCode || 500).json({ error: error.message });
	}
};

export const scheduleWorkflow = async (req, res) => {
	try {
		const result = await workflowService.handleScheduleWorkflow(
			req.params.id,
			req.user?.id,
			req.body,
			req.user
		);
		res.status(202).json({
			success: true,
			message: "Workflow scheduled successfully.",
			runId: result.runId,
			scheduledFor: result.scheduledFor,
		});
	} catch (error) {
		res.status(error.statusCode || 500).json({ error: error.message });
	}
};
