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
});

const createAgentNode = (agentConfig) => {
	return async (state) => {
		const { runId } = state;
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

	workflowDoc.agents.forEach((agent) => {
		const compiledNodeFunction = createAgentNode(agent);

		graphBuilder.addNode(agent._id.toString(), compiledNodeFunction);
	});

	if (!uiGraph.edges || uiGraph.edges.length === 0) {
		throw new Error(
			"Compilation Error: Visual graph lacks topology paths or edge vectors."
		);
	}

	const sourceNodes = new Set(uiGraph.edges.map((e) => e.source));
	const targetNodes = new Set(uiGraph.edges.map((e) => e.target));

	const inferredEntryId =
		uiGraph.edges.find((e) => !targetNodes.has(e.source))?.source ||
		uiGraph.edges[0].source;

	const inferredExitId =
		uiGraph.edges.find((e) => !sourceNodes.has(e.target))?.target ||
		uiGraph.edges[uiGraph.edges.length - 1].target;

	graphBuilder.addEdge(START, inferredEntryId);

	uiGraph.edges.forEach((edge) => {
		graphBuilder.addEdge(edge.source, edge.target);
	});

	graphBuilder.addEdge(inferredExitId, END);

	const runtimeCheckpointer = new MemorySaver();

	return graphBuilder.compile({
		checkpointer: runtimeCheckpointer,
	});
};
