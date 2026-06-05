import {
	StateGraph,
	Annotation,
	START,
	END,
	MemorySaver,
} from "@langchain/langgraph";
import { AzureChatOpenAI } from "@langchain/openai";
import {
	SystemMessage,
	AIMessage,
	HumanMessage,
} from "@langchain/core/messages";
import db from "../models/index.js";
import { getToolByName } from "./tools.js";

const { WorkflowRun, Workflow } = db;

const GraphState = Annotation.Root({
	messages: Annotation({
		reducer: (left, right) => {
			const normalize = (val) => (Array.isArray(val) ? val : [val]);
			return [...normalize(left), ...normalize(right)];
		},
		default: () => [],
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
});

const WORKFLOW_START_NODE_TYPE = "start";
const WORKFLOW_END_NODE_TYPE = "end";

const createPassThroughNode = (nodeConfig) => {
	return async (state) => {
		const { runId, stepCount = 0 } = state;
		const nextStep = stepCount + 1;
		if (nextStep > 30) {
			throw new Error(
				`Workflow safeguard triggered while traversing node '${nodeConfig.id}'.`
			);
		}

		if (runId) {
			await WorkflowRun.findByIdAndUpdate(runId, {
				$push: {
					logs: {
						agentId: nodeConfig.id,
						agentName: nodeConfig.data?.label || nodeConfig.type || nodeConfig.id,
						action: `Traversal node executed (${nodeConfig.type || "generic"}).`,
					},
				},
			});
		}

		return {
			currentTurn: nodeConfig.id,
			stepCount: nextStep,
		};
	};
};

const sortNodesByPosition = (nodes = []) =>
	[...nodes].sort((left, right) => {
		const leftX = left?.position?.x ?? 0;
		const rightX = right?.position?.x ?? 0;
		if (leftX !== rightX) return leftX - rightX;
		const leftY = left?.position?.y ?? 0;
		const rightY = right?.position?.y ?? 0;
		return leftY - rightY;
	});

const hasDirectedPath = (edges = [], entryId, exitId) => {
	if (!entryId || !exitId) return false;
	if (entryId === exitId) return true;

	const adjacency = new Map();
	edges.forEach((edge) => {
		if (!adjacency.has(edge.source)) {
			adjacency.set(edge.source, new Set());
		}
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

const buildFallbackLinearEdges = (nodes = []) => {
	const orderedNodes = nodes.some((node) => node?.position)
		? sortNodesByPosition(nodes)
		: [...nodes];

	return orderedNodes.slice(0, -1).map((node, index) => ({
		source: node.id,
		target: orderedNodes[index + 1].id,
	}));
};

const createAgentNode = (agentConfig, nodeConfig) => {
	return async (state) => {
		const { runId, stepCount = 0 } = state;
		const nextStep = stepCount + 1;
		if (nextStep > 30) {
			throw new Error(
				`Workflow safeguard triggered while traversing agent '${agentConfig.name}'.`
			);
		}

		console.log(
			`🤖 [Run ID: ${runId}] Node executing: ${agentConfig.name} (${agentConfig.role})`
		);

		if (runId) {
			await WorkflowRun.findByIdAndUpdate(runId, {
				$push: {
					logs: {
						agentId: agentConfig._id.toString(),
						agentName: agentConfig.name,
						action: `Node initialized execution turn.`,
					},
				},
			});
		}

		// 1. Dynamic Tool Resolution
		// Resolves string arrays like ["web-search"] into actual LangChain execution tools
		const dynamicTools = [];
		if (agentConfig.tools && agentConfig.tools.length > 0) {
			agentConfig.tools.forEach((toolName) => {
				const functionalTool = getToolByName(toolName);
				if (functionalTool) dynamicTools.push(functionalTool);
			});
		}

		// 2. Initialize Model Instance with System Guardrails
		let model = new AzureChatOpenAI({
			azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
			azureOpenAIApiInstanceName: process.env.AZURE_OPENAI_API_INSTANCE_NAME,
			azureOpenAIApiDeploymentName: agentConfig.model || "gpt-4o-mini", // Dynamically use configured model/deployment name or fallback
			azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION,
			temperature: 0.7, // Maintained creative threshold or adapt as needed
		});

		// Native Tool Binding if tools are configured for this specific agent instance
		if (dynamicTools.length > 0) {
			model = model.bindTools(dynamicTools);
		}

		// 3. Compile Conversational Context History
		const systemPromptMessage = new SystemMessage(
			`You are playing the role of ${agentConfig.name} (${agentConfig.role}).\nInstructions:\n${agentConfig.systemPrompt}`
		);
		const fullPromptContext = [systemPromptMessage, ...state.messages];

		try {
			// 4. Invoke the Brain Loop
			const llmResponse = await model.invoke(fullPromptContext);

			// Track Token Consumption metrics out of the metadata block
			const tokenMetrics = llmResponse.usage_metadata;
			if (runId && tokenMetrics) {
				await WorkflowRun.findByIdAndUpdate(runId, {
					$inc: {
						"metrics.promptTokens": tokenMetrics.input_tokens || 0,
						"metrics.completionTokens": tokenMetrics.output_tokens || 0,
					},
					$push: {
						logs: {
							agentId: agentConfig._id.toString(),
							agentName: agentConfig.name,
							action: `Completed turn. Generated execution output.`,
						},
					},
				});
			}

			// 5. Update State
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
			if (runId) {
				await WorkflowRun.findByIdAndUpdate(runId, {
					$push: {
						logs: {
							agentId: agentConfig._id.toString(),
							agentName: agentConfig.name,
							action: `Execution Error: ${error.message}`,
						},
					},
				});
			}
			throw error;
		}
	};
};

export const compileWorkflow = async (workflowId) => {
	const workflowDoc = await Workflow.findById(workflowId).populate("agents");
	if (!workflowDoc)
		throw new Error(`Workflow layout matching ID '${workflowId}' not found.`);

	const { uiGraph } = workflowDoc;
	const graphBuilder = new StateGraph(GraphState);
	const nodeEntries = Array.isArray(uiGraph?.nodes) ? uiGraph.nodes : [];
	const edgeEntries = Array.isArray(uiGraph?.edges) ? uiGraph.edges : [];
	const explicitStartNode = nodeEntries.find(
		(node) => node?.type === WORKFLOW_START_NODE_TYPE
	);
	const explicitEndNode = nodeEntries.find(
		(node) => node?.type === WORKFLOW_END_NODE_TYPE
	);
	const fallbackNodes =
		nodeEntries.length > 0
			? nodeEntries
			: workflowDoc.agents.map((agent, index) => ({
					id: agent._id.toString(),
					type: "agent",
					position: {
						x: 120 + index * 180,
						y: 220,
					},
					data: {
						agentId: agent._id.toString(),
						agent: agent.toObject(),
					},
			  }));

	const agentLookup = new Map(
		workflowDoc.agents.map((agent) => [agent._id.toString(), agent])
	);

	fallbackNodes.forEach((node) => {
		if (node?.type === "agent") {
			const agentId = node?.data?.agentId || node?.id;
			const agentConfig =
				agentLookup.get(agentId) ||
				agentLookup.get(node?.id) ||
				agentLookup.get(String(agentId));

			if (!agentConfig) {
				graphBuilder.addNode(node.id, createPassThroughNode(node));
				return;
			}

			const compiledNodeFunction = createAgentNode(agentConfig, node);
			graphBuilder.addNode(node.id, compiledNodeFunction);
			return;
		}

		graphBuilder.addNode(node.id, createPassThroughNode(node));
	});

	if (
		explicitStartNode &&
		explicitEndNode &&
		(edgeEntries.some((edge) => edge.target === explicitStartNode.id) ||
			edgeEntries.some((edge) => edge.source === explicitEndNode.id))
	) {
		throw new Error(
			"Compilation Error: Start and End anchors may only act as workflow boundaries."
		);
	}

	const compiledEdges =
		edgeEntries.length > 0
			? edgeEntries.map((edge) => ({ source: edge.source, target: edge.target }))
			: buildFallbackLinearEdges(fallbackNodes);

	const sourceNodes = new Set(compiledEdges.map((edge) => edge.source));
	const targetNodes = new Set(compiledEdges.map((edge) => edge.target));

	const fallbackEntryId =
		compiledEdges.find((edge) => !targetNodes.has(edge.source))?.source ||
		compiledEdges[0]?.source ||
		fallbackNodes[0]?.id;

	const fallbackExitId =
		compiledEdges.find((edge) => !sourceNodes.has(edge.target))?.target ||
		compiledEdges[compiledEdges.length - 1]?.target ||
		fallbackNodes[fallbackNodes.length - 1]?.id;

	const entryNodeId = explicitStartNode?.id || fallbackEntryId;
	const exitNodeId = explicitEndNode?.id || fallbackExitId;

	if (!entryNodeId || !exitNodeId) {
		throw new Error(
			"Compilation Error: Visual graph lacks topology paths or edge vectors."
		);
	}

	if (!hasDirectedPath(compiledEdges, entryNodeId, exitNodeId)) {
		throw new Error(
			"Compilation Error: Workflow must have a valid path from Start to End."
		);
	}

	graphBuilder.addEdge(START, entryNodeId);

	compiledEdges.forEach((edge) => {
		graphBuilder.addEdge(edge.source, edge.target);
	});

	graphBuilder.addEdge(exitNodeId, END);

	const runtimeCheckpointer = new MemorySaver();

	return graphBuilder.compile({
		checkpointer: runtimeCheckpointer,
	});
};
