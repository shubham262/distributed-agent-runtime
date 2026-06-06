import mongoose from "mongoose";
import db from "../models/index.js";
import { enqueueWorkflow, workflowQueue } from "../queue/index.js";

const { Workflow, WorkflowRun } = db;

/**
 * Internal Helper: Extract unique agent IDs from a uiGraph node tree layout
 */
const extractAgentIdsFromGraph = (uiGraph = {}) => {
	const nodes = Array.isArray(uiGraph.nodes) ? uiGraph.nodes : [];
	return [
		...new Set(
			nodes
				.filter((node) => node?.type === "agent" && node?.data?.agentId)
				.map((node) => node.data.agentId)
		),
	];
};

/**
 * Creates a brand new workflow schema config
 */
export const handleCreateWorkflow = async (userId, workflowData) => {
	const { name, description, uiGraph, agents, isActive } = workflowData || {};

	if (!userId) {
		const error = new Error("Authentication required to create a workflow.");
		error.statusCode = 401;
		throw error;
	}
	if (!name || name.trim() === "") {
		const error = new Error(
			"Validation Failed: 'name' is required and must be a non-empty string."
		);
		error.statusCode = 400;
		throw error;
	}
	if (!uiGraph || Array.isArray(uiGraph)) {
		const error = new Error(
			"Validation Failed: 'uiGraph' is required and must be a valid JSON object."
		);
		error.statusCode = 400;
		throw error;
	}

	const derivedAgents = Array.isArray(agents)
		? agents
		: extractAgentIdsFromGraph(uiGraph);

	for (const agentId of derivedAgents) {
		if (!mongoose.Types.ObjectId.isValid(agentId)) {
			const error = new Error(
				`Validation Failed: Invalid Agent ID format detected: '${agentId}'`
			);
			error.statusCode = 400;
			throw error;
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
	return await savedWorkflow.populate("agents");
};

/**
 * Retrieves a single workflow by ID, safely scoped to a user
 */
export const handleGetWorkflowById = async (id, userId) => {
	if (!mongoose.Types.ObjectId.isValid(id)) {
		const error = new Error(
			"Invalid Request: The provided workflow ID format is invalid."
		);
		error.statusCode = 400;
		throw error;
	}

	const workflow = await Workflow.findOne({
		_id: id,
		...(userId ? { userId } : {}),
	}).populate("agents");

	if (!workflow) {
		const error = new Error(
			`Resource Not Found: No workflow layout matched ID ${id}`
		);
		error.statusCode = 404;
		throw error;
	}

	return workflow;
};

/**
 * Lists all workflows belonging to a user context
 */
export const handleGetWorkflows = async (userId) => {
	const query = userId ? { userId } : {};
	return await Workflow.find(query).populate("agents").sort({ createdAt: -1 });
};

/**
 * Fetches historical workflow execution instances across all layouts
 */
export const handleGetAllWorkflowRuns = async (userId) => {
	if (!userId) {
		const error = new Error("Authentication required to list workflow runs.");
		error.statusCode = 401;
		throw error;
	}
	return await WorkflowRun.find({ userId })
		.sort({ createdAt: -1 })
		.limit(100)
		.populate("workflowId", "name");
};

/**
 * Fetches all tracking runs belonging to a specific workflow template
 */
export const handleGetWorkflowRuns = async (workflowId, userId) => {
	if (!mongoose.Types.ObjectId.isValid(workflowId)) {
		const error = new Error(
			"Invalid Request: The provided workflow ID format is invalid."
		);
		error.statusCode = 400;
		throw error;
	}

	return await WorkflowRun.find({
		workflowId,
		...(userId ? { userId } : {}),
	})
		.sort({ createdAt: -1 })
		.limit(50);
};

/**
 * Inspects a discrete execution tracking document log summary details
 */
export const handleGetWorkflowRunById = async (runId, userId) => {
	if (!mongoose.Types.ObjectId.isValid(runId)) {
		const error = new Error(
			"Invalid Request: The provided run ID format is invalid."
		);
		error.statusCode = 400;
		throw error;
	}

	const run = await WorkflowRun.findOne({
		_id: runId,
		...(userId ? { userId } : {}),
	}).populate("workflowId");

	if (!run) {
		const error = new Error(
			`Resource Not Found: No workflow run matched ID ${runId}`
		);
		error.statusCode = 404;
		throw error;
	}

	return run;
};

/**
 * Updates a canvas workflow state setup configuration
 */
export const handleUpdateWorkflow = async (id, userId, updateBody) => {
	const { name, uiGraph, agents, description, isActive } = updateBody || {};

	if (!mongoose.Types.ObjectId.isValid(id)) {
		const error = new Error(
			"Invalid Request: The provided workflow ID format is invalid."
		);
		error.statusCode = 400;
		throw error;
	}
	if (name !== undefined && (!name || name.trim() === "")) {
		const error = new Error(
			"Validation Failed: 'name' cannot be updated to an empty value."
		);
		error.statusCode = 400;
		throw error;
	}
	if (
		uiGraph !== undefined &&
		(typeof uiGraph !== "object" || Array.isArray(uiGraph))
	) {
		const error = new Error(
			"Validation Failed: 'uiGraph' must be a structured JSON object."
		);
		error.statusCode = 400;
		throw error;
	}

	if (agents !== undefined) {
		if (!Array.isArray(agents)) {
			const error = new Error("Validation Failed: 'agents' must be an array.");
			error.statusCode = 400;
			throw error;
		}
		for (const agentId of agents) {
			if (!mongoose.Types.ObjectId.isValid(agentId)) {
				const error = new Error(
					`Validation Failed: Invalid Agent ID format inside references: '${agentId}'`
				);
				error.statusCode = 400;
				throw error;
			}
		}
	}

	const existingWorkflow = await Workflow.findOne({
		_id: id,
		...(userId ? { userId } : {}),
	});
	if (!existingWorkflow) {
		const error = new Error(
			`Resource Not Found: No workflow layout matched ID ${id}`
		);
		error.statusCode = 404;
		throw error;
	}

	const derivedAgents =
		Array.isArray(agents) && agents.length > 0
			? agents
			: uiGraph
			? extractAgentIdsFromGraph(uiGraph)
			: existingWorkflow.agents.map((agentId) => agentId.toString());

	for (const agentId of derivedAgents) {
		if (!mongoose.Types.ObjectId.isValid(agentId)) {
			const error = new Error(
				`Validation Failed: Invalid Agent ID format inside references: '${agentId}'`
			);
			error.statusCode = 400;
			throw error;
		}
	}

	const updatePayload = {};
	if (name !== undefined) updatePayload.name = name.trim();
	if (description !== undefined)
		updatePayload.description = description ? description.trim() : "";
	if (uiGraph !== undefined) updatePayload.uiGraph = uiGraph;
	if (agents !== undefined || uiGraph !== undefined)
		updatePayload.agents = derivedAgents;
	if (isActive !== undefined) updatePayload.isActive = isActive;

	const updatedWorkflow = await Workflow.findByIdAndUpdate(
		id,
		{ $set: updatePayload },
		{ returnDocument: "after", runValidators: true }
	).populate("agents");

	if (!updatedWorkflow) {
		const error = new Error(
			`Resource Not Found: No workflow layout matched ID ${id}`
		);
		error.statusCode = 404;
		throw error;
	}

	return updatedWorkflow;
};

/**
 * Removes a workflow layout framework and untracks active scheduled cron triggers
 */
export const handleDeleteWorkflow = async (id, userId) => {
	if (!mongoose.Types.ObjectId.isValid(id)) {
		const error = new Error(
			"Invalid Request: The provided workflow ID format is invalid."
		);
		error.statusCode = 400;
		throw error;
	}

	const workflow = await Workflow.findOne({
		_id: id,
		...(userId ? { userId } : {}),
	});
	if (!workflow) {
		const error = new Error(
			`Resource Not Found: No workflow layout matched ID ${id}`
		);
		error.statusCode = 404;
		throw error;
	}

	if (workflow.schedule?.jobId) {
		const scheduledJob = await workflowQueue.getJob(workflow.schedule.jobId);
		if (scheduledJob) {
			await scheduledJob.remove();
		}
	}

	await Workflow.deleteOne({ _id: id });
	return id;
};

/**
 * Direct programmatic trigger launching a runtime job pipeline execution sequence
 */
export const handleExecuteWorkflow = async (
	id,
	userId,
	executeOptions = {},
	userData = null
) => {
	const { metadata = {}, prompt = "" } = executeOptions;

	if (!userId) {
		const error = new Error("Authentication required to execute a workflow.");
		error.statusCode = 401;
		throw error;
	}

	const workflow = await Workflow.findOne({ _id: id, userId });
	if (!workflow) {
		const error = new Error(
			`Resource Not Found: No workflow layout matched ID ${id}`
		);
		error.statusCode = 404;
		throw error;
	}

	const newRun = new WorkflowRun({
		workflowId: id,
		userId,
		status: "QUEUED",
		logs: [{ action: "Workflow execution initialized and added to queue." }],
	});

	await newRun.save();
	const runId = newRun._id.toString();

	await enqueueWorkflow(id, runId, {
		...metadata,
		prompt,
		user: userData,
	});

	return runId;
};

/**
 * Commits a delayed scheduling rule config targeting a workflow template execution
 */
export const handleScheduleWorkflow = async (
	id,
	userId,
	scheduleOptions = {},
	userData = null
) => {
	const {
		runAt,
		timezone = "UTC",
		metadata = {},
		prompt = "",
	} = scheduleOptions;

	if (!userId) {
		const error = new Error("Authentication required to schedule a workflow.");
		error.statusCode = 401;
		throw error;
	}

	const workflow = await Workflow.findOne({ _id: id, userId });
	if (!workflow) {
		const error = new Error(
			`Resource Not Found: No workflow layout matched ID ${id}`
		);
		error.statusCode = 404;
		throw error;
	}

	const parsedRunAt = new Date(runAt);
	if (Number.isNaN(parsedRunAt.getTime())) {
		const error = new Error(
			"Validation Failed: 'runAt' must be a valid date/time value."
		);
		error.statusCode = 400;
		throw error;
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
		logs: [{ action: `Workflow scheduled for ${parsedRunAt.toISOString()}.` }],
	});
	await newRun.save();

	const runId = newRun._id.toString();

	await enqueueWorkflow(id, runId, {
		...metadata,
		prompt,
		delay,
		jobId: runId,
		scheduledAt: parsedRunAt.toISOString(),
		timezone,
		user: userData,
	});

	workflow.schedule = {
		enabled: true,
		runAt: parsedRunAt,
		timezone,
		status: "SCHEDULED",
		jobId: runId,
		lastRunId: runId,
		lastRunAt: null,
		metadata,
	};
	await workflow.save();

	return {
		runId,
		scheduledFor: parsedRunAt.toISOString(),
	};
};
