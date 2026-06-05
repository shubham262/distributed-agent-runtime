import { migrateLegacyExpression } from "@/lib/ruleSchema";

export const WORKFLOW_START_NODE_ID = "workflow_start";
export const WORKFLOW_END_NODE_ID = "workflow_end";

const LOOP_HANDLES = {
	entry: "entry",
	body: "body",
	back: "back",
	exit: "exit",
};

const getEdgesTo = (edges, nodeId, targetHandle) =>
	edges.filter(
		(edge) =>
			edge.target === nodeId &&
			(targetHandle ? edge.targetHandle === targetHandle : !edge.targetHandle)
	);

const getEdgesFrom = (edges, nodeId, sourceHandle) =>
	edges.filter(
		(edge) =>
			edge.source === nodeId &&
			(sourceHandle ? edge.sourceHandle === sourceHandle : !edge.sourceHandle)
	);

export const normalizeLoopConfig = (config = {}) => ({
	label: config.label || "Loop",
	maxIterations: config.maxIterations ?? config.iterations ?? 3,
	breakRule: config.breakRule || null,
	breakOnMax: config.breakOnMax !== false,
});

export const normalizeConditionalConfig = (config = {}) => ({
	label: config.label || "Conditional",
	rule:
		config.rule ||
		(config.expression ? migrateLegacyExpression(config.expression) : null),
	trueLabel: config.trueLabel || "true",
	falseLabel: config.falseLabel || "false",
	onFalse: config.onFalse || null,
});

const hasPathToEnd = (startId, endId, edges) => {
	const adjacency = new Map();
	edges.forEach((edge) => {
		if (!adjacency.has(edge.source)) adjacency.set(edge.source, []);
		adjacency.get(edge.source).push(edge.target);
	});

	const visited = new Set([startId]);
	const queue = [startId];

	while (queue.length > 0) {
		const current = queue.shift();
		if (current === endId) return true;
		(adjacency.get(current) || []).forEach((next) => {
			if (!visited.has(next)) {
				visited.add(next);
				queue.push(next);
			}
		});
	}

	return false;
};

const validateRule = (rule, label) => {
	if (!rule?.field || !rule?.operator) {
		throw new Error(`${label}: routing rule is incomplete.`);
	}
	if (rule.value === undefined || rule.value === null || rule.value === "") {
		throw new Error(`${label}: rule value is required.`);
	}
};

export const validateWorkflowGraph = (nodes = [], edges = []) => {
	const endNode = nodes.find((node) => node.type === "end");
	if (!endNode) {
		throw new Error("Workflow must include an End node.");
	}

	nodes
		.filter((node) => node.type === "conditional")
		.forEach((node) => {
			const config = normalizeConditionalConfig(node.data?.config);
			const label = config.label || node.id;

			if (!config.rule) {
				throw new Error(`Conditional '${label}': rule is required.`);
			}
			validateRule(config.rule, `Conditional '${label}'`);

			if (edges.filter((edge) => edge.target === node.id).length !== 1) {
				throw new Error(
					`Conditional '${label}': must have exactly one incoming edge.`
				);
			}

			if (getEdgesFrom(edges, node.id, "true").length !== 1) {
				throw new Error(
					`Conditional '${label}': must have exactly one true branch edge.`
				);
			}

			if (config.onFalse !== "end" && getEdgesFrom(edges, node.id, "false").length !== 1) {
				throw new Error(
					`Conditional '${label}': connect a false branch or enable 'go to End on false'.`
				);
			}
		});

	nodes
		.filter((node) => node.type === "loop")
		.forEach((node) => {
			const config = normalizeLoopConfig(node.data?.config);
			const label = config.label || node.id;

			if (config.maxIterations < 1 || config.maxIterations > 100) {
				throw new Error(
					`Loop '${label}': max iterations must be between 1 and 100.`
				);
			}

			if (config.breakRule) {
				validateRule(config.breakRule, `Loop '${label}' break rule`);
			}

			if (getEdgesTo(edges, node.id, LOOP_HANDLES.entry).length !== 1) {
				throw new Error(`Loop '${label}': connect exactly one entry edge (top).`);
			}
			if (getEdgesFrom(edges, node.id, LOOP_HANDLES.body).length !== 1) {
				throw new Error(`Loop '${label}': connect exactly one body edge (right).`);
			}
			if (getEdgesTo(edges, node.id, LOOP_HANDLES.back).length !== 1) {
				throw new Error(`Loop '${label}': connect exactly one back edge (left).`);
			}
			if (getEdgesFrom(edges, node.id, LOOP_HANDLES.exit).length !== 1) {
				throw new Error(`Loop '${label}': connect exactly one exit edge (bottom).`);
			}
		});

	const startNode = nodes.find((node) => node.type === "start");
	if (startNode && !hasPathToEnd(startNode.id, endNode.id, edges)) {
		throw new Error("Workflow must have a path from Start to End.");
	}
};

export const isValidWorkflowConnection = (connection, nodes) => {
	if (!connection?.source || !connection?.target) return false;
	if (connection.source === connection.target) return false;

	const sourceNode = nodes.find((node) => node.id === connection.source);
	const targetNode = nodes.find((node) => node.id === connection.target);
	if (!sourceNode || !targetNode) return false;

	if (sourceNode.type === "end" || targetNode.type === "start") return false;

	if (targetNode.type === "loop") {
		const handle = connection.targetHandle;
		if (handle && handle !== LOOP_HANDLES.entry && handle !== LOOP_HANDLES.back) {
			return false;
		}
	}

	if (sourceNode.type === "loop") {
		const handle = connection.sourceHandle;
		if (handle && handle !== LOOP_HANDLES.body && handle !== LOOP_HANDLES.exit) {
			return false;
		}
	}

	if (sourceNode.type === "conditional") {
		const handle = connection.sourceHandle;
		if (handle && handle !== "true" && handle !== "false") return false;
	}

	return true;
};
