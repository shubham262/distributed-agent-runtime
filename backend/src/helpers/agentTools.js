import { tool } from "@langchain/core/tools";
import { z } from "zod";
import * as agentService from "../service/agentService.js";

/**
 * 1. Tool: Create Agent
 */
export const createAgentLangChainTool = tool(
	async (args, config) => {
		try {
			const userId = config.configurable?.userId;
			if (!userId) return "❌ Error: Unauthenticated context payload window.";

			const result = await agentService.handleCreateAgent(userId, args);
			return `✅ Agent created successfully!\n🆔 *Agent ID:* \`${result._id}\`\n🤖 *Name:* ${result.name}`;
		} catch (error) {
			return `❌ Operation Interrupted: ${error.message}`;
		}
	},
	{
		name: "create_agent",
		description:
			"Deploys a brand new custom orchestrated agent profile configuration.",
		schema: z.object({
			name: z
				.string()
				.describe("The clean, distinct name identifying this agent"),
			role: z
				.string()
				.describe(
					"Clear explanation of what objective goal or function the agent fulfills"
				),
			systemPrompt: z
				.string()
				.describe(
					"Foundational operating constraints, personality, and instructions determining behavior rules"
				),
			model: z
				.string()
				.optional()
				.default("gpt-4o-mini")
				.describe(
					"The underlying target execution LLM name (e.g., gpt-4o, gpt-4o-mini)"
				),
			tools: z
				.array(z.string())
				.optional()
				.default([])
				.describe(
					"An array of functional tool string names this agent can execute"
				),
			channels: z
				.array(z.string())
				.optional()
				.default([])
				.describe("Target communication delivery channels, like ['telegram']"),
		}),
	}
);

/**
 * 2. Tool: List User's Agents
 */
export const listAgentsLangChainTool = tool(
	async (_, config) => {
		try {
			const userId = config.configurable?.userId;
			if (!userId) return "❌ Error: Unauthenticated context.";

			const agents = await agentService.handleGetAgents(userId);
			if (agents.length === 0)
				return "ℹ️ You do not have any operational agents configured on your platform workspace.";

			return agents
				.map(
					(a) =>
						`🤖 *Agent Name:* ${a.name}\n🆔 *ID:* \`${a._id}\`\n🎭 *Role:* ${
							a.role
						}\n🧠 *Model:* ${a.model}\n🛠️ *Tools:* ${
							a.tools?.length ? a.tools.join(", ") : "None"
						}\n📢 *Channels:* ${
							a.channels?.length ? a.channels.join(", ") : "None"
						}\n---`
				)
				.join("\n");
		} catch (error) {
			return `❌ Error fetching agents list: ${error.message}`;
		}
	},
	{
		name: "list_agents",
		description:
			"Fetches and displays summaries of all custom agent profiles inside this workspace.",
	}
);

/**
 * 3. Tool: Get All Available System Tools
 * Helps the Master Agent figure out which structural ecosystem tools can be attached to an agent.
 */
export const getAvailableAgentToolsLangChainTool = tool(
	async () => {
		try {
			const platformTools = await agentService.handleGetAgentsTools();
			if (platformTools.length === 0)
				return "ℹ️ There are no functional capability tools registered on the platform.";

			return (
				`🛠️ *Available Platform Capability Tools You Can Assign to Agents:*\n\n` +
				platformTools.map((t) => `• \`${t.value}\` (${t.label})`).join("\n")
			);
		} catch (error) {
			return `❌ Error fetching tool configurations: ${error.message}`;
		}
	},
	{
		name: "get_available_platform_tools",
		description:
			"Retrieves a comprehensive list of all functional capability tool identifiers currently supported by the system to attach to agents.",
	}
);

/**
 * 4. Tool: Update Existing Agent
 */
export const updateAgentLangChainTool = tool(
	async ({ id, ...updateFields }, config) => {
		try {
			const userId = config.configurable?.userId;
			if (!userId) return "❌ Error: Unauthenticated context context.";

			// Extra security sanity check: Ensure this agent actually belongs to the user context
			const userAgents = await agentService.handleGetAgents(userId);
			const ownsAgent = userAgents.some((a) => a._id.toString() === id);

			if (!ownsAgent) {
				return `❌ Access Denied: No agent matched ID \`${id}\` inside your authorized container workspace.`;
			}

			const updatedAgent = await agentService.handleUpdateAgent(
				id,
				updateFields
			);
			return `✅ Agent updated cleanly!\n🤖 *Target:* ${updatedAgent.name} (\`${updatedAgent._id}\`)\n📝 *Status:* Active updates committed to cluster.`;
		} catch (error) {
			return `❌ Modification Interrupted: ${error.message}`;
		}
	},
	{
		name: "update_agent",
		description:
			"Modifies fields of an existing custom agent context block. Pass only the updated properties.",
		schema: z.object({
			id: z
				.string()
				.describe(
					"The unique 24-character Mongoose Hex ObjectId of the target agent to update"
				),
			name: z
				.string()
				.optional()
				.describe("Updated display name for the agent profile"),
			role: z
				.string()
				.optional()
				.describe("Updated execution responsibilities or behavior definition"),
			systemPrompt: z
				.string()
				.optional()
				.describe("Refined system behavioral parameters override text"),
			model: z
				.string()
				.optional()
				.describe("Alternative model execution engine framework specification"),
			tools: z
				.array(z.string())
				.optional()
				.describe("Replacement layout of capability tools for this agent"),
			channels: z
				.array(z.string())
				.optional()
				.describe("Modified messaging networks array configuration"),
		}),
	}
);

/**
 * 5. Tool: Delete Agent
 */
export const deleteAgentLangChainTool = tool(
	async ({ id }, config) => {
		try {
			const userId = config.configurable?.userId;
			if (!userId) return "❌ Error: Unauthenticated parameter window.";

			// Extra security gate: Confirm ownership before issuing deletion payload mutations
			const userAgents = await agentService.handleGetAgents(userId);
			const ownsAgent = userAgents.some((a) => a._id.toString() === id);

			if (!ownsAgent) {
				return `❌ Access Denied: No agent matched ID \`${id}\` inside your workspace constraints.`;
			}

			await agentService.handleDeleteAgent(id);
			return `🗑️ Agent successfully deleted and purged from the platform routing configuration database.`;
		} catch (error) {
			return `❌ Deletion Aborted: ${error.message}`;
		}
	},
	{
		name: "delete_agent",
		description:
			"Permanently deletes and clears a specialized agent structure using its unique 24-character Hex ID identifier parameter.",
		schema: z.object({
			id: z
				.string()
				.describe(
					"The unique 24-character hex string representing the agent's MongoDB tracking identifier"
				),
		}),
	}
);
