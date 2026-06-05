import { validateRule, migrateLegacyExpression } from "./ruleEvaluator.js";

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

export const getLoopBodyNodeIds = (loopNodeId, nodes, edges) => {
	const bodyEdges = getEdgesFrom(edges, loopNodeId, LOOP_HANDLES.body);
	if (bodyEdges.length !== 1) return [];

	const bodyEntryId = bodyEdges[0].target;
	const nodeMap = new Map(nodes.map((node) => [node.id, node]));
	const bodyIds = new Set();
	const queue = [bodyEntryId];

	while (queue.length > 0) {
		const currentId = queue.shift();
		if (currentId === loopNodeId || bodyIds.has(currentId)) continue;

		const currentNode = nodeMap.get(currentId);
		if (!currentNode || currentNode.type === "start" || currentNode.type === "end") {
			continue;
		}

		bodyIds.add(currentId);

		edges
			.filter((edge) => edge.source === currentId)
			.forEach((edge) => {
				if (edge.target === loopNodeId && edge.targetHandle === LOOP_HANDLES.back) {
					return;
				}
				if (!bodyIds.has(edge.target)) {
					queue.push(edge.target);
				}
			});
	}

	return [...bodyIds];
};

export const orderLoopBodyNodes = (loopNodeId, nodes, edges) => {
	const bodyIds = new Set(getLoopBodyNodeIds(loopNodeId, nodes, edges));
	const bodyEdges = edges.filter(
		(edge) => bodyIds.has(edge.source) && bodyIds.has(edge.target)
	);

	const inDegree = new Map([...bodyIds].map((id) => [id, 0]));
	bodyEdges.forEach((edge) => {
		inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
	});

	const bodyEntry = getEdgesFrom(edges, loopNodeId, LOOP_HANDLES.body)[0]?.target;
	const queue = bodyEntry ? [bodyEntry] : [];
	const ordered = [];
	const visited = new Set();

	while (queue.length > 0) {
		const current = queue.shift();
		if (visited.has(current)) continue;
		visited.add(current);
		ordered.push(current);

		bodyEdges
			.filter((edge) => edge.source === current)
			.forEach((edge) => {
				const next = inDegree.get(edge.target) - 1;
				inDegree.set(edge.target, next);
				if (next <= 0 && !visited.has(edge.target)) {
					queue.push(edge.target);
				}
			});
	}

	[...bodyIds].forEach((id) => {
		if (!visited.has(id)) ordered.push(id);
	});

	return ordered;
};

const hasPathToEnd = (startId, endId, edges, excludedEdgeKeys = new Set()) => {
	const adjacency = new Map();
	edges.forEach((edge) => {
		const key = `${edge.source}|${edge.target}|${edge.sourceHandle || ""}|${edge.targetHandle || ""}`;
		if (excludedEdgeKeys.has(key)) return;
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

const validateConditionalNode = (node, edges, endNodeId) => {
	const config = normalizeConditionalConfig(node.data?.config);
	const nodeId = node.id;
	const label = config.label || nodeId;

	if (!config.rule) {
		throw new Error(`Conditional node '${label}': rule is required.`);
	}
	validateRule(config.rule);

	const incoming = edges.filter((edge) => edge.target === nodeId);
	if (incoming.length !== 1) {
		throw new Error(
			`Conditional node '${label}': must have exactly one incoming edge.`
		);
	}

	const trueEdges = getEdgesFrom(edges, nodeId, "true");
	if (trueEdges.length !== 1) {
		throw new Error(
			`Conditional node '${label}': must have exactly one true branch edge.`
		);
	}

	const falseEdges = getEdgesFrom(edges, nodeId, "false");
	if (config.onFalse !== "end" && falseEdges.length !== 1) {
		throw new Error(
			`Conditional node '${label}': must have exactly one false branch edge or set onFalse to 'end'.`
		);
	}

	if (config.onFalse !== "end" && !hasPathToEnd(falseEdges[0].target, endNodeId, edges)) {
		throw new Error(
			`Conditional node '${label}': false branch must eventually reach End.`
		);
	}

	if (!hasPathToEnd(trueEdges[0].target, endNodeId, edges)) {
		throw new Error(
			`Conditional node '${label}': true branch must eventually reach End.`
		);
	}
};

const validateLoopNode = (node, nodes, edges, endNodeId) => {
	const config = normalizeLoopConfig(node.data?.config);
	const nodeId = node.id;
	const label = config.label || nodeId;

	if (
		!Number.isInteger(config.maxIterations) ||
		config.maxIterations < 1 ||
		config.maxIterations > 100
	) {
		throw new Error(
			`Loop node '${label}': maxIterations must be between 1 and 100.`
		);
	}

	if (config.breakRule) {
		validateRule(config.breakRule);
	}

	const entryEdges = getEdgesTo(edges, nodeId, LOOP_HANDLES.entry);
	if (entryEdges.length !== 1) {
		throw new Error(
			`Loop node '${label}': must have exactly one incoming entry edge.`
		);
	}

	const bodyEdges = getEdgesFrom(edges, nodeId, LOOP_HANDLES.body);
	if (bodyEdges.length !== 1) {
		throw new Error(
			`Loop node '${label}': must have exactly one outgoing body edge.`
		);
	}

	const backEdges = getEdgesTo(edges, nodeId, LOOP_HANDLES.back);
	if (backEdges.length !== 1) {
		throw new Error(
			`Loop node '${label}': must have exactly one back edge returning to the loop.`
		);
	}

	if (backEdges[0].source === nodeId) {
		throw new Error(`Loop node '${label}': back edge cannot be a self-loop.`);
	}

	const exitEdges = getEdgesFrom(edges, nodeId, LOOP_HANDLES.exit);
	if (exitEdges.length !== 1) {
		throw new Error(
			`Loop node '${label}': must have exactly one outgoing exit edge.`
		);
	}

	const bodyIds = getLoopBodyNodeIds(nodeId, nodes, edges);
	if (bodyIds.length === 0) {
		throw new Error(`Loop node '${label}': body must contain at least one node.`);
	}

	const nestedLoop = nodes.find(
		(n) => bodyIds.includes(n.id) && n.type === "loop"
	);
	if (nestedLoop) {
		throw new Error(
			`Loop node '${label}': nested loops are not supported in v1.`
		);
	}

	if (bodyIds.some((id) => id === WORKFLOW_END_NODE_ID)) {
		throw new Error(
			`Loop node '${label}': loop body cannot connect directly to End.`
		);
	}

	if (!hasPathToEnd(exitEdges[0].target, endNodeId, edges)) {
		throw new Error(`Loop node '${label}': exit branch must eventually reach End.`);
	}
};

export const validateWorkflowGraph = (uiGraph = {}) => {
	const nodes = Array.isArray(uiGraph.nodes) ? uiGraph.nodes : [];
	const edges = Array.isArray(uiGraph.edges) ? uiGraph.edges : [];

	const startNode = nodes.find((node) => node.type === "start");
	const endNode = nodes.find((node) => node.type === "end");

	if (!startNode || !endNode) {
		throw new Error("Workflow must include Start and End nodes.");
	}

	nodes
		.filter((node) => node.type === "conditional")
		.forEach((node) => validateConditionalNode(node, edges, endNode.id));

	nodes
		.filter((node) => node.type === "loop")
		.forEach((node) => validateLoopNode(node, nodes, edges, endNode.id));

	return { nodes, edges, startNode, endNode };
};

export const getEdgesForCompilation = (edges, nodes) => {
	const loopBodyNodeIds = new Set();
	const loopNodes = nodes.filter((node) => node.type === "loop");

	loopNodes.forEach((loopNode) => {
		getLoopBodyNodeIds(loopNode.id, nodes, edges).forEach((id) =>
			loopBodyNodeIds.add(id)
		);
	});

	const conditionalIds = new Set(
		nodes.filter((node) => node.type === "conditional").map((node) => node.id)
	);

	const skippedKeys = new Set();

	edges.forEach((edge) => {
		if (conditionalIds.has(edge.source)) {
			skippedKeys.add(`${edge.source}|${edge.target}|${edge.sourceHandle || ""}`);
		}

		const loopNode = loopNodes.find((node) => node.id === edge.source);
		if (
			loopNode &&
			(edge.sourceHandle === LOOP_HANDLES.body ||
				edge.sourceHandle === LOOP_HANDLES.exit)
		) {
			if (edge.sourceHandle === LOOP_HANDLES.body) {
				skippedKeys.add(`${edge.source}|${edge.target}|body`);
			}
		}

		if (
			loopNodes.some(
				(loop) =>
					edge.target === loop.id &&
					(edge.targetHandle === LOOP_HANDLES.back ||
						edge.targetHandle === LOOP_HANDLES.entry)
			)
		) {
			if (edge.targetHandle === LOOP_HANDLES.back) {
				skippedKeys.add(`${edge.source}|${edge.target}|${edge.targetHandle}`);
			}
		}

		if (loopBodyNodeIds.has(edge.source) && loopBodyNodeIds.has(edge.target)) {
			skippedKeys.add(`${edge.source}|${edge.target}|${edge.sourceHandle || ""}`);
		}

		if (loopBodyNodeIds.has(edge.target) && edge.targetHandle === LOOP_HANDLES.entry) {
			// keep entry edges from upstream
		} else if (loopBodyNodeIds.has(edge.target) && !loopNodes.find((l) => l.id === edge.target)) {
			const isLoopEntry = loopNodes.some(
				(loop) =>
					edge.target === loop.id && edge.targetHandle === LOOP_HANDLES.entry
			);
			if (!isLoopEntry) {
				skippedKeys.add(`${edge.source}|${edge.target}|${edge.targetHandle || ""}`);
			}
		}
	});

	return edges.filter((edge) => {
		const key = `${edge.source}|${edge.target}|${edge.sourceHandle || ""}`;
		const backKey = `${edge.source}|${edge.target}|${edge.targetHandle || ""}`;

		if (conditionalIds.has(edge.source)) return false;
		if (skippedKeys.has(key)) return false;
		if (skippedKeys.has(backKey)) return false;

		const loopSource = loopNodes.find((node) => node.id === edge.source);
		if (loopSource && edge.sourceHandle === LOOP_HANDLES.body) return false;

		const loopTarget = loopNodes.find((node) => node.id === edge.target);
		if (loopTarget && edge.targetHandle === LOOP_HANDLES.back) return false;

		if (loopBodyNodeIds.has(edge.source) && loopBodyNodeIds.has(edge.target)) {
			return false;
		}

		return true;
	});
};
