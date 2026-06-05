import {
	StateGraph,
	Annotation,
	START,
	END,
	MemorySaver,
} from "@langchain/langgraph";
import { AzureChatOpenAI } from "@langchain/openai";
import { SystemMessage, ToolMessage } from "@langchain/core/messages";
import db from "../models/index.js";
import { getToolByName } from "./tools.js";
import { evaluateRule } from "./ruleEvaluator.js";
import {
	validateWorkflowGraph,
	getEdgesForCompilation,
	getLoopBodyNodeIds,
	orderLoopBodyNodes,
	normalizeLoopConfig,
	normalizeConditionalConfig,
	WORKFLOW_END_NODE_ID,
} from "./graphValidator.js";

const { WorkflowRun, Workflow } = db;

const MAX_GRAPH_STEPS = 100;
const MAX_TOOL_ROUNDS = 5;

const GraphState = Annotation.Root({
	messages: Annotation({
		reducer: (left, right) => {
			const normalize = (val) => (Array.isArray(val) ? val : [val]);
			return [...normalize(left), ...normalize(right)];
		},
		default: () => [],
	}),
	user: Annotation({
		reducer: (left, right) => right,
		default: () => null,
	}),
	currentTurn: Annotation({
		reducer: (left, right) => right,
		default: () => "",
	}),
	runId: Annotation({
		reducer: (left, right) => right,
		default: () => "",
	}),
	stepCount: Annotation({
		reducer: (left, right) => right,
		default: () => 0,
	}),
	loopCounters: Annotation({
		reducer: (left, right) => ({ ...left, ...right }),
		default: () => ({}),
	}),
	activeLoopId: Annotation({
		reducer: (left, right) => right,
		default: () => "",
	}),
});

const WORKFLOW_START_NODE_TYPE = "start";
const WORKFLOW_END_NODE_TYPE = "end";

const pushRunLog = async (runId, log) => {
	if (!runId) return;
	await WorkflowRun.findByIdAndUpdate(runId, {
		$push: { logs: log },
	});
};

const incrementStep = (state, nodeLabel) => {
	const nextStep = (state.stepCount || 0) + 1;
	if (nextStep > MAX_GRAPH_STEPS) {
		throw new Error(
			`Workflow safeguard triggered while traversing node '${nodeLabel}'.`
		);
	}
	return nextStep;
};

const createPassThroughNode = (nodeConfig) => {
	return async (state) => {
		const nextStep = incrementStep(state, nodeConfig.id);

		await pushRunLog(state.runId, {
			agentId: nodeConfig.id,
			agentName: nodeConfig.data?.label || nodeConfig.type || nodeConfig.id,
			action: `Traversal node executed (${nodeConfig.type || "generic"}).`,
		});

		return {
			currentTurn: nodeConfig.id,
			stepCount: nextStep,
		};
	};
};

const createConditionalNode = (nodeConfig) => {
	const config = normalizeConditionalConfig(nodeConfig.data?.config);

	return async (state) => {
		const nextStep = incrementStep(state, nodeConfig.id);
		const result = evaluateRule(config.rule, state);

		await pushRunLog(state.runId, {
			agentId: nodeConfig.id,
			agentName: config.label || "Conditional",
			action: `Conditional rule evaluated → ${result ? "true" : "false"}.`,
		});

		return {
			currentTurn: nodeConfig.id,
			stepCount: nextStep,
			lastConditionalResult: result,
		};
	};
};

const createLoopNode = (nodeConfig, bodyNodeFns, exitTargetId) => {
	const config = normalizeLoopConfig(nodeConfig.data?.config);

	return async (state) => {
		const nextStep = incrementStep(state, nodeConfig.id);
		const loopId = nodeConfig.id;
		let currentState = {
			...state,
			activeLoopId: loopId,
			stepCount: nextStep,
		};

		await pushRunLog(state.runId, {
			agentId: loopId,
			agentName: config.label || "Loop",
			action: `Loop started (max ${config.maxIterations} iterations).`,
		});

		for (let iteration = 1; iteration <= config.maxIterations; iteration += 1) {
			currentState = {
				...currentState,
				loopCounters: {
					...currentState.loopCounters,
					[loopId]: iteration,
				},
				activeLoopId: loopId,
			};

			for (const bodyFn of bodyNodeFns) {
				const updates = await bodyFn(currentState);
				currentState = { ...currentState, ...updates };
			}

			const shouldBreak =
				config.breakRule &&
				evaluateRule(config.breakRule, {
					...currentState,
					activeLoopId: loopId,
				});

			await pushRunLog(state.runId, {
				agentId: loopId,
				agentName: config.label || "Loop",
				action: `Loop iteration ${iteration}/${config.maxIterations}${
					shouldBreak ? " — break rule matched" : ""
				}.`,
			});

			if (shouldBreak) break;
			if (config.breakOnMax !== false && iteration >= config.maxIterations)
				break;
		}

		currentState = {
			...currentState,
			currentTurn: loopId,
			activeLoopId: "",
		};

		await pushRunLog(state.runId, {
			agentId: loopId,
			agentName: config.label || "Loop",
			action: `Loop completed → routing to exit (${exitTargetId}).`,
		});

		return currentState;
	};
};

const createAgentNode = (agentConfig, nodeConfig) => {
	return async (state) => {
		const nextStep = incrementStep(state, agentConfig.name);

		console.log(
			`🤖 [Run ID: ${state.runId}] Node executing: ${agentConfig.name} (${agentConfig.role})`
		);

		await pushRunLog(state.runId, {
			agentId: agentConfig._id.toString(),
			agentName: agentConfig.name,
			action: `Node initialized execution turn.`,
		});

		const dynamicTools = [];
		if (agentConfig.tools?.length > 0) {
			agentConfig.tools.forEach((toolName) => {
				const functionalTool = getToolByName(toolName);
				if (functionalTool) dynamicTools.push(functionalTool);
			});
		}

		let model = new AzureChatOpenAI({
			azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
			azureOpenAIApiInstanceName: process.env.AZURE_OPENAI_API_INSTANCE_NAME,
			azureOpenAIApiDeploymentName: agentConfig.model || "gpt-4o-mini",
			azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION,
			temperature: 0.7,
		});

		if (dynamicTools.length > 0) {
			model = model.bindTools(dynamicTools);
		}

		const toolMap = Object.fromEntries(
			dynamicTools.map((toolDef) => [toolDef.name, toolDef])
		);
		const operatorName = state.user?.name || "System Operator";
		const operatorEmail = state.user?.email || "not-provided";

		const systemPromptMessage = new SystemMessage(
			`You are playing the role of ${agentConfig.name} (${agentConfig.role}).
     
			CURRENT ACTIVE OPERATOR CONTEXT:
			- Name: ${operatorName}
			- Email Gateway Target: ${operatorEmail}
			
			When sending notification emails or reports, personalize them for ${operatorName} and route them to ${operatorEmail}.

			Instructions:\n${agentConfig.systemPrompt}`
		);
		let conversation = [systemPromptMessage, ...state.messages];

		try {
			let llmResponse = null;

			for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
				llmResponse = await model.invoke(conversation);

				const tokenMetrics = llmResponse.usage_metadata;
				if (state.runId && tokenMetrics) {
					await WorkflowRun.findByIdAndUpdate(state.runId, {
						$inc: {
							"metrics.promptTokens": tokenMetrics.input_tokens || 0,
							"metrics.completionTokens": tokenMetrics.output_tokens || 0,
						},
					});
				}

				const toolCalls = llmResponse.tool_calls || [];
				if (toolCalls.length === 0) break;

				conversation = [...conversation, llmResponse];

				for (const toolCall of toolCalls) {
					const toolInstance = toolMap[toolCall.name];
					let toolResult;
					try {
						toolResult = toolInstance
							? await toolInstance.invoke(toolCall.args)
							: { error: `Unknown tool: ${toolCall.name}` };
					} catch (toolError) {
						toolResult = { error: toolError.message };
					}

					conversation.push(
						new ToolMessage({
							content:
								typeof toolResult === "string"
									? toolResult
									: JSON.stringify(toolResult),
							tool_call_id: toolCall.id,
						})
					);

					await pushRunLog(state.runId, {
						agentId: agentConfig._id.toString(),
						agentName: agentConfig.name,
						action: `Executed tool '${toolCall.name}'.`,
					});
				}
			}

			await pushRunLog(state.runId, {
				agentId: agentConfig._id.toString(),
				agentName: agentConfig.name,
				action: `Completed turn. Generated execution output.`,
			});

			return {
				messages: [llmResponse],
				currentTurn: agentConfig._id.toString(),
				stepCount: nextStep,
			};
		} catch (error) {
			console.error(
				`🚨 Execution failure at node [${agentConfig.name}]:`,
				error.message
			);
			await pushRunLog(state.runId, {
				agentId: agentConfig._id.toString(),
				agentName: agentConfig.name,
				action: `Execution Error: ${error.message}`,
			});
			throw error;
		}
	};
};

const hasDirectedPath = (edges = [], entryId, exitId) => {
	if (!entryId || !exitId) return false;
	if (entryId === exitId) return true;

	const adjacency = new Map();
	edges.forEach((edge) => {
		if (!adjacency.has(edge.source)) adjacency.set(edge.source, new Set());
		adjacency.get(edge.source).add(edge.target);
	});

	const visited = new Set([entryId]);
	const queue = [entryId];

	while (queue.length > 0) {
		const current = queue.shift();
		if (current === exitId) return true;
		const neighbors = adjacency.get(current);
		if (!neighbors) continue;
		neighbors.forEach((nextNode) => {
			if (!visited.has(nextNode)) {
				visited.add(nextNode);
				queue.push(nextNode);
			}
		});
	}

	return false;
};

export const compileWorkflow = async (workflowId) => {
	const workflowDoc = await Workflow.findById(workflowId).populate("agents");
	if (!workflowDoc) {
		throw new Error(`Workflow layout matching ID '${workflowId}' not found.`);
	}

	const { uiGraph } = workflowDoc;
	const { nodes, edges, startNode, endNode } = validateWorkflowGraph(uiGraph);

	const graphBuilder = new StateGraph(GraphState);
	const nodeMap = new Map(nodes.map((node) => [node.id, node]));
	const agentLookup = new Map(
		workflowDoc.agents.map((agent) => [agent._id.toString(), agent])
	);

	const loopBodyContained = new Set();
	nodes
		.filter((node) => node.type === "loop")
		.forEach((loopNode) => {
			getLoopBodyNodeIds(loopNode.id, nodes, edges).forEach((id) =>
				loopBodyContained.add(id)
			);
		});

	const nodeFunctions = new Map();

	nodes.forEach((node) => {
		if (
			node.type === WORKFLOW_START_NODE_TYPE ||
			node.type === WORKFLOW_END_NODE_TYPE
		) {
			nodeFunctions.set(node.id, createPassThroughNode(node));
			return;
		}

		if (node.type === "conditional") {
			nodeFunctions.set(node.id, createConditionalNode(node));
			return;
		}

		if (node.type === "loop") {
			return;
		}

		if (node.type === "agent") {
			const agentId = node?.data?.agentId || node?.id;
			const agentConfig =
				agentLookup.get(agentId) ||
				agentLookup.get(node?.id) ||
				agentLookup.get(String(agentId));

			if (!agentConfig) {
				nodeFunctions.set(node.id, createPassThroughNode(node));
				return;
			}

			nodeFunctions.set(node.id, createAgentNode(agentConfig, node));
			return;
		}

		nodeFunctions.set(node.id, createPassThroughNode(node));
	});

	nodes
		.filter((node) => node.type === "loop")
		.forEach((loopNode) => {
			const bodyOrder = orderLoopBodyNodes(loopNode.id, nodes, edges);
			const bodyFns = bodyOrder
				.map((id) => nodeFunctions.get(id))
				.filter(Boolean);

			const exitEdge = edges.find(
				(edge) => edge.source === loopNode.id && edge.sourceHandle === "exit"
			);
			const exitTargetId = exitEdge?.target || endNode.id;

			nodeFunctions.set(
				loopNode.id,
				createLoopNode(loopNode, bodyFns, exitTargetId)
			);
		});

	nodes.forEach((node) => {
		const fn = nodeFunctions.get(node.id);
		if (fn) graphBuilder.addNode(node.id, fn);
	});

	const compilationEdges = getEdgesForCompilation(edges, nodes).map((edge) => ({
		source: edge.source,
		target: edge.target,
		sourceHandle: edge.sourceHandle,
		targetHandle: edge.targetHandle,
	}));

	const conditionalNodes = nodes.filter((node) => node.type === "conditional");

	conditionalNodes.forEach((condNode) => {
		const config = normalizeConditionalConfig(condNode.data?.config);
		const trueEdge = edges.find(
			(edge) => edge.source === condNode.id && edge.sourceHandle === "true"
		);
		const falseEdge = edges.find(
			(edge) => edge.source === condNode.id && edge.sourceHandle === "false"
		);

		const routeMap = {
			true: trueEdge?.target,
			false:
				config.onFalse === "end" ? WORKFLOW_END_NODE_ID : falseEdge?.target,
		};

		if (!routeMap.true) {
			throw new Error(
				`Conditional node '${config.label}': missing true branch target.`
			);
		}
		if (!routeMap.false) {
			throw new Error(
				`Conditional node '${config.label}': missing false branch target.`
			);
		}

		graphBuilder.addConditionalEdges(
			condNode.id,
			(state) => {
				const result =
					state.lastConditionalResult ?? evaluateRule(config.rule, state);
				return result ? "true" : "false";
			},
			routeMap
		);
	});

	const loopExitEdges = edges
		.filter((edge) => edge.sourceHandle === "exit")
		.map((edge) => ({ source: edge.source, target: edge.target }));

	const staticEdges = [
		...compilationEdges,
		...loopExitEdges.filter(
			(edge) =>
				!compilationEdges.some(
					(existing) =>
						existing.source === edge.source && existing.target === edge.target
				)
		),
	];

	const sourceNodes = new Set(staticEdges.map((edge) => edge.source));
	const targetNodes = new Set(staticEdges.map((edge) => edge.target));

	const entryNodeId = startNode.id;
	const exitNodeId = endNode.id;

	if (!hasDirectedPath(staticEdges, entryNodeId, exitNodeId)) {
		throw new Error(
			"Compilation Error: Workflow must have a valid path from Start to End."
		);
	}

	graphBuilder.addEdge(START, entryNodeId);

	staticEdges.forEach((edge) => {
		const sourceNode = nodeMap.get(edge.source);
		const targetNode = nodeMap.get(edge.target);
		if (sourceNode?.type === "conditional") return;
		if (sourceNode?.type === "loop" && edge.sourceHandle === "exit") {
			graphBuilder.addEdge(edge.source, edge.target);
			return;
		}
		if (sourceNode?.type === "loop") return;
		graphBuilder.addEdge(edge.source, edge.target);
	});

	graphBuilder.addEdge(exitNodeId, END);

	const runtimeCheckpointer = new MemorySaver();

	return graphBuilder.compile({
		checkpointer: runtimeCheckpointer,
	});
};
