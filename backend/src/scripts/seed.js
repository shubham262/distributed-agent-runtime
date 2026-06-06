import { handleCreateAgent } from "../service/agentService.js";
import { handleCreateWorkflow } from "../service/workflowService.js";
export const seedTemplates = [
	{
		name: "Autonomous Market Intelligence Pipeline",
		description:
			"Scrapes real-time market data variables via web intelligence nodes and dispatches a structured telemetry report straight to the user email gateway.",
		agents: [
			{
				key: "researcher",
				name: "InsightScout",
				role: "Autonomous web research and market intelligence synthesis",
				model: "gpt-4o",
				tools: ["web-search"],
				channels: ["telegram"],
				systemPrompt:
					"You are an elite market intelligence agent. Cross-verify details across multiple sources, synthesize comparative matrices, and strip filler language.",
			},
			{
				key: "dispatcher",
				name: "SignalDispatcher",
				role: "Formatting research data and sending system automated emails",
				model: "gpt-4o-mini",
				tools: ["send-email"],
				channels: ["telegram"],
				systemPrompt:
					"You are a communication node. Format incoming research payload metrics into clean HTML layouts or markdown grids and route them to the active user context.",
			},
		],
		generateUiGraph: (agentIdMap) => ({
			nodes: [
				{
					id: "workflow_start",
					type: "start",
					position: { x: 161.57894736842107, y: -108.94736842105263 },
					draggable: true,
					deletable: false,
					data: {
						kind: "anchor",
						label: "Start",
						description: "Workflow entry point",
					},
				},
				{
					id: "agent_insight_scout",
					type: "agent",
					position: { x: 96.01866075094631, y: 90.65389834085124 },
					data: {
						kind: "agent",
						label: "InsightScout",
						agentId: agentIdMap["researcher"],
					},
				},
				{
					id: "agent_signal_dispatcher",
					type: "agent",
					position: { x: 69.72942501703272, y: 302.8298612904253 },
					data: {
						kind: "agent",
						label: "SignalDispatcher",
						agentId: agentIdMap["dispatcher"],
					},
				},
				{
					id: "workflow_end",
					type: "end",
					position: { x: 162.71532683733392, y: 500.906586652103 },
					draggable: true,
					deletable: false,
					data: {
						kind: "anchor",
						label: "End",
						description: "Workflow exit point",
					},
				},
			],
			edges: [
				{
					type: "deletableSmoothstep",
					selectable: true,
					deletable: true,
					markerEnd: { type: "arrowclosed", width: 18, height: 18 },
					source: "workflow_start",
					target: "agent_insight_scout",
					id: "xy-edge__workflow_start-agent_insight_scout",
				},
				{
					type: "deletableSmoothstep",
					selectable: true,
					deletable: true,
					markerEnd: { type: "arrowclosed", width: 18, height: 18 },
					source: "agent_insight_scout",
					target: "agent_signal_dispatcher",
					id: "xy-edge__agent_insight_scout-agent_signal_dispatcher",
				},
				{
					type: "deletableSmoothstep",
					selectable: true,
					deletable: true,
					markerEnd: { type: "arrowclosed", width: 18, height: 18 },
					source: "agent_signal_dispatcher",
					target: "workflow_end",
					id: "xy-edge__agent_signal_dispatcher-workflow_end",
				},
			],
			viewport: {
				x: 6.1740932187637725,
				y: 257.45251544540724,
				zoom: 0.7613181213587104,
			},
			schemaVersion: 2,
		}),
	},
	{
		name: "SEO Content Generation & Brand Guardrails",
		description:
			"Monitors topic inputs, outlines complete long-form articles optimizing for high-intent search rankings, and passes drafts through an editorial checker.",
		agents: [
			{
				key: "writer",
				name: "ContentArchitect",
				role: "Long-form search intent content writing engine",
				model: "gpt-4o",
				tools: ["web-search"],
				channels: ["ui"],
				systemPrompt:
					"You are a senior technical writer. Generate highly informative articles targeted directly at solving technical search intents. Structure with clean headers.",
			},
			{
				key: "editor",
				name: "BrandGuardrail",
				role: "Editorial compliance evaluation and fact verification check",
				model: "gpt-4o-mini",
				tools: [],
				channels: ["ui"],
				systemPrompt:
					"You are an automated editorial bot. Review draft documents for clarity, spelling, brand alignment, and structural logic flow. Append feedback notes.",
			},
		],
		generateUiGraph: (agentIdMap) => ({
			nodes: [
				{
					id: "workflow_start",
					type: "start",
					position: { x: 161.57894736842107, y: -108.94736842105263 },
					draggable: true,
					deletable: false,
					data: {
						kind: "anchor",
						label: "Start",
						description: "Workflow entry point",
					},
				},
				{
					id: "agent_content_architect",
					type: "agent",
					position: { x: 96.01866075094631, y: 90.65389834085124 },
					data: {
						kind: "agent",
						label: "ContentArchitect",
						agentId: agentIdMap["writer"],
					},
				},
				{
					id: "agent_brand_guardrail",
					type: "agent",
					position: { x: 69.72942501703272, y: 302.8298612904253 },
					data: {
						kind: "agent",
						label: "BrandGuardrail",
						agentId: agentIdMap["editor"],
					},
				},
				{
					id: "workflow_end",
					type: "end",
					position: { x: 162.71532683733392, y: 500.906586652103 },
					draggable: true,
					deletable: false,
					data: {
						kind: "anchor",
						label: "End",
						description: "Workflow exit point",
					},
				},
			],
			edges: [
				{
					type: "deletableSmoothstep",
					selectable: true,
					deletable: true,
					markerEnd: { type: "arrowclosed", width: 18, height: 18 },
					source: "workflow_start",
					target: "agent_content_architect",
					id: "xy-edge__workflow_start-agent_content_architect",
				},
				{
					type: "deletableSmoothstep",
					selectable: true,
					deletable: true,
					markerEnd: { type: "arrowclosed", width: 18, height: 18 },
					source: "agent_content_architect",
					target: "agent_brand_guardrail",
					id: "xy-edge__agent_content_architect-agent_brand_guardrail",
				},
				{
					type: "deletableSmoothstep",
					selectable: true,
					deletable: true,
					markerEnd: { type: "arrowclosed", width: 18, height: 18 },
					source: "agent_brand_guardrail",
					target: "workflow_end",
					id: "xy-edge__agent_brand_guardrail-workflow_end",
				},
			],
			viewport: {
				x: 6.1740932187637725,
				y: 257.45251544540724,
				zoom: 0.7613181213587104,
			},
			schemaVersion: 2,
		}),
	},
];

export const seedUserWorkspace = async (userId) => {
	try {
		console.log(
			`🌱 [Workspace Seeding]: Initializing out-of-the-box infrastructure layers configuration for User: ${userId}`
		);

		for (const template of seedTemplates) {
			const agentIdMap = {};
			const createdAgentIds = [];

			// 1. Loop through and create each individual template agent component definition safely
			for (const agentConfig of template.agents) {
				const newAgentDoc = await handleCreateAgent(userId, {
					name: agentConfig.name,
					role: agentConfig.role,
					systemPrompt: agentConfig.systemPrompt,
					model: agentConfig.model,
					tools: agentConfig.tools,
					channels: agentConfig.channels,
				});

				// Track mapping references to substitute into the graph generation matrix structure below
				agentIdMap[agentConfig.key] = newAgentDoc._id.toString();
				createdAgentIds.push(newAgentDoc._id.toString());
			}

			// 2. Generate the layout canvas passing down the assigned database identification hashes
			const customUiGraph = template.generateUiGraph(agentIdMap);

			// 3. Inject the complete canvas graph layout directly inside our core workflow pipeline service logic
			await handleCreateWorkflow(userId, {
				name: template.name,
				description: template.description,
				uiGraph: customUiGraph,
				agents: createdAgentIds,
				isActive: true,
			});
		}

		console.log(
			`✨ [Workspace Seeding]: Prebuilt Multi-Agent templates committed successfully to User space [${userId}]`
		);
	} catch (error) {
		// Log locally to system monitoring but do not let seeding faults lock up database auth threads
		console.error(
			`🚨 [Workspace Seeding Exception]: Failed to cleanly map seed definitions for user ${userId}:`,
			error.message
		);
	}
};
