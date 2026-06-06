import { tool } from "@langchain/core/tools";
import { z } from "zod";
import * as workflowService from "../service/workflowService.js";

/**
 * Helper to normalize JSON objects (like uiGraph) if the LLM passes them as stringified JSON
 */
const ensureObject = (input) => {
	if (typeof input === "string") {
		try {
			return JSON.parse(input);
		} catch {
			return null;
		}
	}
	return input;
};

/**
 * 1. Tool: Create Workflow
 */
export const createWorkflowLangChainTool = tool(
	async (args, config) => {
		try {
			const userId = config.configurable?.userId;
			if (!userId) return "❌ Error: Unauthenticated context.";

			// Ensure graph structure is parsed properly if passed as text
			if (args.uiGraph) {
				args.uiGraph = ensureObject(args.uiGraph);
			} else {
				// Generate a boilerplate safe canvas layout if the user is creating a workflow purely via text
				args.uiGraph = { nodes: [], edges: [] };
			}

			const result = await workflowService.handleCreateWorkflow(userId, args);
			return `✅ Workflow created successfully!\n🌿 *Name:* ${result.name}\n🆔 *Workflow ID:* \`${result._id}\``;
		} catch (error) {
			return `❌ Operation Failed: ${error.message}`;
		}
	},
	{
		name: "create_workflow",
		description:
			"Creates a new multi-agent layout template workflow configuration.",
		schema: z.object({
			name: z.string().describe("The name of the workflow schema"),
			description: z
				.string()
				.optional()
				.describe(
					"A brief summary explaining what this orchestration sequence accomplishes"
				),
			uiGraph: z
				.any()
				.optional()
				.describe(
					"A structured JSON object or JSON string representing canvas nodes and connections"
				),
			agents: z
				.array(z.string())
				.optional()
				.describe(
					"An optional pre-defined array of 24-character hex agent IDs participating in this workflow"
				),
			isActive: z
				.boolean()
				.optional()
				.default(true)
				.describe("Whether this workflow is enabled"),
		}),
	}
);

/**
 * 2. Tool: List All Workflows
 */
export const listWorkflowsLangChainTool = tool(
	async (_, config) => {
		try {
			const userId = config.configurable?.userId;
			if (!userId) return "❌ Error: Unauthenticated context.";

			const workflows = await workflowService.handleGetWorkflows(userId);
			if (workflows.length === 0)
				return "ℹ️ You don't have any configured graph workflows recorded in this platform workspace.";

			return workflows
				.map(
					(w) =>
						`🌿 *Workflow:* ${w.name}\n🆔 *ID:* \`${
							w._id
						}\`\n📝 *Description:* ${w.description || "None"}\n🟢 *Active:* ${
							w.isActive
						}\n👥 *Agents Involved:* ${
							w.agents?.map((a) => a.name).join(", ") || "None"
						}\n---`
				)
				.join("\n");
		} catch (error) {
			return `❌ Fetch Error: ${error.message}`;
		}
	},
	{
		name: "list_workflows",
		description:
			"Fetches and displays summaries of all configured multi-agent graph workflows matching this workspace.",
	}
);

/**
 * 3. Tool: Get Specific Workflow Details
 */
export const getWorkflowDetailsLangChainTool = tool(
	async ({ id }, config) => {
		try {
			const userId = config.configurable?.userId;
			const workflow = await workflowService.handleGetWorkflowById(id, userId);

			return `🌿 *Workflow Details: ${workflow.name}*\n🆔 *ID:* \`${
				workflow._id
			}\`\n📝 *Description:* ${workflow.description || "None"}\n🟢 *Active:* ${
				workflow.isActive
			}\n\n👥 *Configured Nodes:* ${
				workflow.agents?.map((a) => `\n • ${a.name} (${a.role})`).join("") ||
				"None"
			}`;
		} catch (error) {
			return `❌ Fetch Error: ${error.message}`;
		}
	},
	{
		name: "get_workflow_details",
		description:
			"Retrieves complete blueprint parameters and active configuration settings for an individual workflow.",
		schema: z.object({
			id: z
				.string()
				.describe(
					"The 24-character hexadecimal MongoDB ObjectId of the workflow"
				),
		}),
	}
);

/**
 * 4. Tool: Update Workflow
 */
export const updateWorkflowLangChainTool = tool(
	async ({ id, ...updateFields }, config) => {
		try {
			const userId = config.configurable?.userId;
			if (!userId) return "❌ Error: Unauthenticated context.";

			if (updateFields.uiGraph) {
				updateFields.uiGraph = ensureObject(updateFields.uiGraph);
			}

			const updated = await workflowService.handleUpdateWorkflow(
				id,
				userId,
				updateFields
			);
			return `✅ Workflow configuration altered successfully!\n🌿 *Target:* ${updated.name} (\`${updated._id}\`)\n📝 Updates committed into cluster state.`;
		} catch (error) {
			return `❌ Modification Interrupted: ${error.message}`;
		}
	},
	{
		name: "update_workflow",
		description:
			"Modifies fields of an existing multi-agent canvas workflow configuration blueprint.",
		schema: z.object({
			id: z
				.string()
				.describe(
					"The 24-character hexadecimal MongoDB ObjectId of the target workflow"
				),
			name: z
				.string()
				.optional()
				.describe(
					"Updated display label text name for the canvas workflow layout"
				),
			description: z
				.string()
				.optional()
				.describe("Altered system description context guidelines"),
			uiGraph: z
				.any()
				.optional()
				.describe(
					"Modified structural JSON topology graph defining node edge vectors"
				),
			agents: z
				.array(z.string())
				.optional()
				.describe(
					"Modified unique tracking list containing target reference agent hex codes"
				),
			isActive: z
				.boolean()
				.optional()
				.describe("Toggle overall pipeline active status rules parameters"),
		}),
	}
);

/**
 * 5. Tool: Delete Workflow
 */
export const deleteWorkflowLangChainTool = tool(
	async ({ id }, config) => {
		try {
			const userId = config.configurable?.userId;
			await workflowService.handleDeleteWorkflow(id, userId);
			return `🗑️ Workflow successfully deleted and stripped from the active runner configurations database.`;
		} catch (error) {
			return `❌ Deletion Aborted: ${error.message}`;
		}
	},
	{
		name: "delete_workflow",
		description:
			"Permanently deletes a specific canvas workflow and removes its associated background triggers.",
		schema: z.object({
			id: z
				.string()
				.describe(
					"The 24-character hexadecimal MongoDB ObjectId of the target workflow to delete"
				),
		}),
	}
);

/**
 * 6. Tool: Execute Workflow Immediately
 */
export const executeWorkflowLangChainTool = tool(
	async ({ workflowId, prompt }, config) => {
		try {
			const userId = config.configurable?.userId;
			const userData = config.configurable?.user || { id: userId };
			const chatId = config.configurable?.chatId;
			if (!userId)
				return "❌ Error: Unauthenticated execution envelope context window.";

			const runId = await workflowService.handleExecuteWorkflow(
				workflowId,
				userId,
				{ prompt, metadata: { channel: "telegram", chatId } },
				userData
			);

			return `🚀 *Workflow Instantiated & Queued!*\n🆔 *Run ID:* \`${runId}\`\n⚡ Status: Enqueued into processing worker pool. Telemetry diagnostics will update.`;
		} catch (error) {
			return `❌ Execution Failure: ${error.message}`;
		}
	},
	{
		name: "execute_workflow",
		description:
			"Launches immediate asynchronous background run processing operations on an existing workflow graph.",
		schema: z.object({
			workflowId: z
				.string()
				.describe(
					"The unique 24-character hexadecimal MongoDB ObjectId of the workflow layout template"
				),
			prompt: z
				.string()
				.optional()
				.describe(
					"Input text instruction strings directed into the initialization canvas nodes context parameters"
				),
		}),
	}
);

/**
 * 7. Tool: Schedule Workflow for Later
 */
export const scheduleWorkflowLangChainTool = tool(
	async ({ workflowId, runAt, timezone, prompt }, config) => {
		try {
			const userId = config.configurable?.userId;
			const userData = config.configurable?.user || { id: userId };
			if (!userId) return "❌ Error: Unauthenticated context session mapping.";

			const result = await workflowService.handleScheduleWorkflow(
				workflowId,
				userId,
				{ runAt, timezone, prompt, metadata: { channel: "telegram" } },
				userData
			);

			return `📅 *Workflow Scheduled Successfully!*\n🆔 *Assigned Run ID:* \`${
				result.runId
			}\`\n⏰ *Target Run Window:* \`${result.scheduledFor}\` (${
				timezone || "UTC"
			})`;
		} catch (error) {
			return `❌ Scheduling Pipeline Failure: ${error.message}`;
		}
	},
	{
		name: "schedule_workflow",
		description:
			"Schedules a workflow run for a future timestamp using delayed job execution queues.",
		schema: z.object({
			workflowId: z
				.string()
				.describe(
					"The 24-character hexadecimal MongoDB ObjectId of the workflow"
				),
			runAt: z
				.string()
				.describe(
					"An ISO-8601 or standard date/time string specifying when this sequence should fire"
				),
			timezone: z
				.string()
				.optional()
				.default("UTC")
				.describe(
					"The operational timezone mapping string label target (e.g., UTC, America/New_York)"
				),
			prompt: z
				.string()
				.optional()
				.describe(
					"Fallback operational system instructions query context injection string parameters"
				),
		}),
	}
);

/**
 * 8. Tool: List All Historical Runs Across Platform
 */
export const listAllWorkflowRunsLangChainTool = tool(
	async (_, config) => {
		try {
			const userId = config.configurable?.userId;
			const runs = await workflowService.handleGetAllWorkflowRuns(userId);
			if (runs.length === 0)
				return "ℹ️ No recorded history logs tracking execution instances match this profile.";

			return runs
				.map(
					(r) =>
						`🏃‍♂️ *Run ID:* \`${r._id}\`\n🌿 *Workflow Template:* ${
							r.workflowId?.name || "Unknown"
						}\n📊 *Status:* ${
							r.status
						}\n📅 *Executed:* ${r.createdAt.toISOString()}\n---`
				)
				.join("\n");
		} catch (error) {
			return `❌ Diagnostics Pull Failure: ${error.message}`;
		}
	},
	{
		name: "list_all_workflow_runs",
		description:
			"Retrieves up to 100 recent workflow run tracking history records across all platform nodes.",
	}
);

/**
 * 9. Tool: List Runs for a Specific Workflow Template
 */
export const getWorkflowRunsLangChainTool = tool(
	async ({ workflowId }, config) => {
		try {
			const userId = config.configurable?.userId;
			const runs = await workflowService.handleGetWorkflowRuns(
				workflowId,
				userId
			);
			if (runs.length === 0)
				return "ℹ️ This specific workflow layout has never been triggered or executed yet.";

			return (
				`📋 *Recent Execution Instances for Workflow:* \`${workflowId}\`\n\n` +
				runs
					.map(
						(r) =>
							`• ID: \`${r._id}\` | Status: *${
								r.status
							}* | Date: ${r.createdAt.toLocaleDateString()}`
					)
					.join("\n")
			);
		} catch (error) {
			return `❌ Diagnostics Pull Failure: ${error.message}`;
		}
	},
	{
		name: "get_workflow_runs",
		description:
			"Fetches recent historical computation iterations matching an individual workflow layout setup template query configuration.",
		schema: z.object({
			workflowId: z
				.string()
				.describe(
					"The unique 24-character hexadecimal MongoDB ObjectId of the parent workflow configuration layout template"
				),
		}),
	}
);

/**
 * 10. Tool: Fetch In-Depth Run Log Details & Telemetry Metrics
 */
export const getWorkflowRunDetailsLangChainTool = tool(
	async ({ runId }, config) => {
		try {
			const userId = config.configurable?.userId;
			const run = await workflowService.handleGetWorkflowRunById(runId, userId);

			const metricsSummary = run.metrics
				? `\n⏱️ *Duration:* ${
						run.metrics.executionTimeMs || 0
				  }ms\n📥 *Prompt Tokens:* ${
						run.metrics.promptTokens || 0
				  }\n📤 *Completion Tokens:* ${
						run.metrics.completionTokens || 0
				  }\n💵 *Estimated Computational Cost:* $${
						run.metrics.totalCostUSD || 0
				  }`
				: "None";

			const logSequence = run.logs?.length
				? run.logs
						.map(
							(l) =>
								`⏰ [${new Date(l.timestamp).toLocaleTimeString()}] *${
									l.agentName || "System"
								}*: ${l.action}`
						)
						.join("\n")
				: "No operational trace tracking sequences written inside execution records.";

			return `🏃‍♂️ *Run Execution Details Summary:*\n🆔 *Run ID:* \`${
				run._id
			}\`\n🌿 *Source Graph:* ${
				run.workflowId?.name || "Deleted Layout Template"
			}\n📊 *Current Status:* **${
				run.status
			}**\n\n📈 *Telemetry Performance Metrics:*${metricsSummary}\n\n📜 *Detailed Runtime Log History Execution Traversal Trace:* \n${logSequence}\n\n🏁 *Terminal Block Output:* \n\`\`\`text\n${
				typeof run.output === "object"
					? JSON.stringify(run.output, null, 2)
					: run.output || "None"
			}\n\`\`\``;
		} catch (error) {
			return `❌ Log Inspection Interrupted: ${error.message}`;
		}
	},
	{
		name: "get_workflow_run_details",
		description:
			"Inspects a precise active runtime document run tracking instance log file database block. Pulls token consumption logs, costs, trace execution routes, and outputs.",
		schema: z.object({
			runId: z
				.string()
				.describe(
					"The unique 24-character hexadecimal MongoDB ObjectId mapping to the tracking run execution record instance parameter"
				),
		}),
	}
);
