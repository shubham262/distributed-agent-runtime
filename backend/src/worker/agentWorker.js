// src/workers/agentWorker.js
import { Worker } from "bullmq";
import { AzureChatOpenAI } from "@langchain/openai";
import {
	SystemMessage,
	HumanMessage,
	ToolMessage,
} from "@langchain/core/messages";
import { connection } from "../config/redis.js";
import db from "../models/index.js";
import { getToolByName } from "../helpers/tools.js";
// import { getToolByName } from "../runtime/tools.js";
// import { sendTelegramMessage } from "../services/telegramService.js";

const { Agent, AgentRun } = db;

const worker = new Worker(
	"agent-execution",
	async (job) => {
		const { agentId, runId, inputPrompt, metadata } = job.data;

		console.log(
			`👷 [Agent Job ${job.id}] Processing Standalone Run [${runId}]`
		);

		await AgentRun.findByIdAndUpdate(runId, {
			status: "RUNNING",
			$push: {
				logs: {
					action:
						"Background worker initialized standalone agent execution loop.",
					type: "SYSTEM",
				},
			},
		});

		const startTime = Date.now();

		try {
			const agentDoc = await Agent.findById(agentId);
			if (!agentDoc)
				throw new Error(
					`Agent profile matching ID '${agentId}' has been decommissioned.`
				);

			const dynamicTools = [];
			if (agentDoc.tools && agentDoc.tools.length > 0) {
				agentDoc.tools.forEach((toolName) => {
					const toolInstance = getToolByName(toolName);
					if (toolInstance) dynamicTools.push(toolInstance);
				});
			}

			let model = new AzureChatOpenAI({
				azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
				azureOpenAIApiInstanceName: process.env.AZURE_OPENAI_API_INSTANCE_NAME,
				azureOpenAIApiDeploymentName: agentDoc.model || "gpt-4o-mini",
				azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION,
				temperature: 0.3, // Kept stable for predictable test evaluations
			});

			if (dynamicTools.length > 0) {
				model = model.bindTools(dynamicTools);
			}

			// 5. Initialize context history array with identity guidelines
			const conversationHistory = [
				new SystemMessage(
					`You are playing the role of ${agentDoc.name} (${agentDoc.role}).\nInstructions:\n${agentDoc.systemPrompt}`
				),
			];

			// Append human input prompt if provided
			if (inputPrompt) {
				conversationHistory.push(new HumanMessage(inputPrompt));
			}

			// 6. Execution Loop: Gracefully handle multi-turn tool calling routines
			let interactionActive = true;
			let safetyCounter = 0;
			const maxExecutionTurns = 5; // Guardrail to prevent infinite automated loops
			let totalPromptTokens = 0;
			let totalCompletionTokens = 0;

			while (interactionActive && safetyCounter < maxExecutionTurns) {
				safetyCounter++;

				// Fire completion turn to Azure

				const currentRun = await AgentRun.findById(runId);
				if (!currentRun || currentRun.status === "PAUSED") {
					console.log(
						`🛑 [Agent Worker] Execution on Run [${runId}] aborted by parent process command.`
					);
					interactionActive = false;
					break;
				}
				const llmResponse = await model.invoke(conversationHistory);
				conversationHistory.push(llmResponse);

				// Aggregate metric utilities
				if (llmResponse.usage_metadata) {
					totalPromptTokens += llmResponse.usage_metadata.input_tokens || 0;
					totalCompletionTokens +=
						llmResponse.usage_metadata.output_tokens || 0;
				}

				// Check if the AI wants to run an action tool
				if (llmResponse.tool_calls && llmResponse.tool_calls.length > 0) {
					await AgentRun.findByIdAndUpdate(runId, {
						$push: {
							logs: {
								action: `AI requested access to tools: ${llmResponse.tool_calls
									.map((tc) => tc.name)
									.join(", ")}`,
								type: "TOOL_CALL",
							},
						},
					});

					// Execute requested tool calls sequentially
					for (const toolCall of llmResponse.tool_calls) {
						const functionalTool = getToolByName(toolCall.name);

						if (functionalTool) {
							try {
								const rawResult = await functionalTool.invoke(toolCall.args);

								// Push the result back into history so the AI can read it on the next turn
								conversationHistory.push(
									new ToolMessage({
										content:
											typeof rawResult === "object"
												? JSON.stringify(rawResult)
												: String(rawResult),
										tool_call_id: toolCall.id,
										name: toolCall.name,
									})
								);

								await AgentRun.findByIdAndUpdate(runId, {
									$push: {
										logs: {
											action: `Tool [${toolCall.name}] completed execution turn successfully.`,
											type: "TOOL_CALL",
										},
									},
								});
							} catch (toolError) {
								// Prevent tool failure from crashing the entire background worker
								conversationHistory.push(
									new ToolMessage({
										content: `Tool Execution Error: ${toolError.message}`,
										tool_call_id: toolCall.id,
										name: toolCall.name,
									})
								);
							}
						} else {
							// Fallback if AI hallucinates a non-existent tool handle
							conversationHistory.push(
								new ToolMessage({
									content: `Error: Tool matching handle "${toolCall.name}" is not mounted to this hardware gateway.`,
									tool_call_id: toolCall.id,
									name: toolCall.name,
								})
							);
						}
					}
				} else {
					// No tool calls requested. The AI has formulated its final textual response.
					interactionActive = false;
				}
			}

			const executionTimeMs = Date.now() - startTime;
			const finalAgentOutput =
				conversationHistory[conversationHistory.length - 1].content;

			await Agent.findByIdAndUpdate(id, { status: "IDLE" });
			await AgentRun.findByIdAndUpdate(runId, {
				status: "COMPLETED",
				output: finalAgentOutput,
				"metrics.promptTokens": totalPromptTokens,
				"metrics.completionTokens": totalCompletionTokens,
				"metrics.executionTimeMs": executionTimeMs,
				$push: {
					logs: {
						action: "Agent standalone run resolved successfully.",
						type: "SYSTEM",
					},
				},
			});

			// 8. Output Dispatcher
			// if (metadata && metadata.channel === "telegram" && metadata.chatId) {
			// 	await sendTelegramMessage(
			// 		metadata.chatId,
			// 		`🤖 *[${agentDoc.name}] Response:*\n\n${finalAgentOutput}`
			// 	);
			// }

			return finalAgentOutput;
		} catch (error) {
			const executionTimeMs = Date.now() - startTime;
			console.error(
				`🚨 Standalone Worker Exception on Job [${job.id}]:`,
				error.message
			);

			// Resilient Fallback: Log failure to MongoDB
			await AgentRun.findByIdAndUpdate(runId, {
				status: "FAILED",
				errorReason: error.message,
				"metrics.executionTimeMs": executionTimeMs,
				$push: {
					logs: {
						action: `Execution Aborted: ${error.message}`,
						type: "ERROR",
					},
				},
			});

			throw error;
		}
	},
	{ connection, concurrency: 2 }
);

export default worker;
