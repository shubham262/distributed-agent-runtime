import { AzureChatOpenAI } from "@langchain/openai";
import { MemorySaver } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { HumanMessage } from "@langchain/core/messages";

import { webSearch, deepResearch, sendEmail } from "../helpers/tools.js";
import {
	createAgentLangChainTool,
	listAgentsLangChainTool,
	getAvailableAgentToolsLangChainTool,
	updateAgentLangChainTool,
	deleteAgentLangChainTool,
} from "../helpers/agentTools.js";

import {
	createWorkflowLangChainTool,
	listWorkflowsLangChainTool,
	getWorkflowDetailsLangChainTool,
	updateWorkflowLangChainTool,
	deleteWorkflowLangChainTool,
	executeWorkflowLangChainTool,
	scheduleWorkflowLangChainTool,
	listAllWorkflowRunsLangChainTool,
	getWorkflowRunsLangChainTool,
	getWorkflowRunDetailsLangChainTool,
} from "../helpers/workflowTools.js";

// Consolidate the absolute toolkit matrix
const masterAgentTools = [
	webSearch,
	deepResearch,
	sendEmail,
	createAgentLangChainTool,
	listAgentsLangChainTool,
	getAvailableAgentToolsLangChainTool,
	updateAgentLangChainTool,
	deleteAgentLangChainTool,
	createWorkflowLangChainTool,
	listWorkflowsLangChainTool,
	getWorkflowDetailsLangChainTool,
	updateWorkflowLangChainTool,
	deleteWorkflowLangChainTool,
	executeWorkflowLangChainTool,
	scheduleWorkflowLangChainTool,
	listAllWorkflowRunsLangChainTool,
	getWorkflowRunsLangChainTool,
	getWorkflowRunDetailsLangChainTool,
];

const model = new AzureChatOpenAI({
	azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
	azureOpenAIApiInstanceName: process.env.AZURE_OPENAI_API_INSTANCE_NAME,
	azureOpenAIApiDeploymentName: "gpt-4o-mini",
	azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION,
	temperature: 0.2,
});

const MASTER_AGENT_SYSTEM_PROMPT = `
You are the Master Orchestrator core system agent for AgentOS. Your absolute primary directive is to enable users to manage their entire multi-agent clusters, graph canvases, scheduling jobs, and performance telemetry diagnostics directly via text.

CRITICAL RULES:
1. You can call multiple tools in sequence if required to satisfy user requests (e.g., list entries to discover a configuration ID, then apply updates).
2. All tool execution queries are automatically scoped natively to the current user's security level via context parameters.
3. Keep response presentation structured, clear, and scannable using standard Telegram Markdown formatting (utilize bold text, clear tables, code blocks for IDs, and emojis).
4. If an operational error, permission layer block, or validation constraint variance occurs, summarize it constructively. Do not display internal stack traces.

CRITICAL TELEGRAM FORMATTING RULES:
1. NEVER use markdown header hashes (e.g., #, ##, ###, ####) or markdown lines (---). Telegram will print them as literal text and break formatting.
2. To create a header or section title, make the text bold using single asterisks and capital letters, like this: *📌 AGENT DETAILS* or *🌿 WORKFLOW DETAILS*.
3. To bold text inside line items, wrap the target words in single asterisks: - *Agent Name:* SignalDispatcher
4. For Database ObjectIds or Hex IDs, always wrap them in inline code backticks so the user can tap-to-copy them: \`6a2468092e357d91ffae06fb\`
5. Keep response presentation structured, clear, and scannable using emojis.
`;

const checkpointSaver = new MemorySaver();
const masterAgentExecutor = createReactAgent({
	llm: model,
	tools: masterAgentTools,
	checkpointSaver,
	messageModifier: MASTER_AGENT_SYSTEM_PROMPT,
});

/**
 * Feeds conversational prompts into the Master Agent engine execution flow context window
 * @param {string} userId - The underlying authenticated database User ObjectId string
 * @param {string} chatId - Telegram numeric chat identification parameter used as the conversation memory thread id
 * @param {string} inputMessage - Raw input text message from user
 */
export const executeMasterAgentQuery = async (
	userId,
	chatId,
	inputMessage,
	user
) => {
	try {
		const responseState = await masterAgentExecutor.invoke(
			{
				messages: [new HumanMessage(inputMessage)],
			},
			{
				configurable: {
					thread_id: String(chatId), // Isolates conversation context memory to this specific Telegram screen
					userId: String(userId), // Passes securely downward down into individual target data-layer service calls,
					user,
					chatId,
				},
			}
		);

		const messages = responseState.messages;
		const terminalResponse = messages[messages.length - 1];
		return (
			terminalResponse.content ||
			"⚠️ System layer resolved processing loop with empty text parameters outputs."
		);
	} catch (error) {
		console.error("🚨 Master Agent Runtime Loop Engine Fault:", error);
		return "⚠️ *System Disturbance:* An error occurred while routing your execution parameters down to the core service layer pipeline.";
	}
};
