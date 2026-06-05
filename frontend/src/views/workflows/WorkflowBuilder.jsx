"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	Background,
	Controls,
	Handle,
	MarkerType,
	MiniMap,
	Panel,
	Position,
	ReactFlow,
	ReactFlowProvider,
	addEdge,
	useEdgesState,
	useNodesState,
	useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
	Badge,
	Button,
	Drawer,
	Empty,
	Form,
	Input,
	InputNumber,
	Modal,
	Select,
	Spin,
	Switch,
	Tag,
	message,
} from "antd";
import {
	FiActivity,
	FiCpu,
	FiGitBranch,
	FiLayers,
	FiPlus,
	FiSave,
	FiSettings,
	FiZap,
} from "react-icons/fi";
import { useRouter } from "next/navigation";
import { createAgent, editAgent, getAllAgent } from "@/service/agent";
import {
	createWorkflow,
	editWorkflow,
	getWorkflowById,
} from "@/service/workflow";

const TOOL_OPTIONS = [
	{ value: "web-search", label: "Web Search" },
	{ value: "extract-html", label: "HTML Extractor" },
	{ value: "seo-analyzer", label: "SEO Analyzer" },
	{ value: "calculator", label: "Calculator" },
];

const CHANNEL_OPTIONS = [
	{ value: "web", label: "Web" },
	{ value: "telegram", label: "Telegram" },
	{ value: "slack", label: "Slack" },
];

const MODEL_OPTIONS = [
	{ value: "gpt-4o-mini", label: "gpt-4o-mini" },
	{ value: "gpt-4o", label: "gpt-4o" },
];

const getId = (prefix) =>
	`${prefix}_${crypto?.randomUUID?.() || Math.random().toString(36).slice(2)}`;

const sanitizeNode = (node) => {
	const { selected, dragging, width, height, measured, zIndex, ...rest } = node;
	return rest;
};

const sanitizeEdge = (edge) => {
	const { selected, animated, style, focusable, interactionWidth, ...rest } = edge;
	return rest;
};

const makeAgentNode = (agent, index = 0) => ({
	id: getId("agent"),
	type: "agent",
	position: { x: 100 + index * 40, y: 120 + index * 20 },
	data: {
		kind: "agent",
		label: agent.name,
		agentId: agent._id,
		agent,
	},
});

const makeLoopNode = (index = 0) => ({
	id: getId("loop"),
	type: "loop",
	position: { x: 240 + index * 40, y: 220 + index * 20 },
	data: {
		kind: "loop",
		label: "Loop",
		config: {
			label: "Loop",
			iterations: 3,
			condition: "while pending",
		},
	},
});

const makeConditionalNode = (index = 0) => ({
	id: getId("conditional"),
	type: "conditional",
	position: { x: 360 + index * 40, y: 320 + index * 20 },
	data: {
		kind: "conditional",
		label: "Conditional",
		config: {
			label: "Conditional",
			expression: "context.isReady === true",
			trueLabel: "true",
			falseLabel: "false",
		},
	},
});

const normalizeGraph = (uiGraph = {}, agents = []) => {
	const nodes = Array.isArray(uiGraph.nodes) ? uiGraph.nodes : [];
	const edges = Array.isArray(uiGraph.edges) ? uiGraph.edges : [];
	if (nodes.length > 0) {
		return {
			nodes,
			edges,
			viewport: uiGraph.viewport || { x: 0, y: 0, zoom: 1 },
		};
	}

	return {
		nodes: agents.map((agent, index) => makeAgentNode(agent, index)),
		edges,
		viewport: uiGraph.viewport || { x: 0, y: 0, zoom: 1 },
	};
};

const NodeFrame = ({ accentClass, icon, title, subtitle, children, selected }) => (
	<div
		className={`min-w-[220px] rounded-2xl border bg-white shadow-lg ${
			selected ? "ring-2 ring-blue-400" : "border-slate-200"
		}`}
	>
		<div className={`h-1 w-full rounded-t-2xl ${accentClass}`} />
		<div className="p-4">
			<div className="flex items-start gap-3">
				<div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-700">
					{icon}
				</div>
				<div className="min-w-0 flex-1">
					<p className="text-sm font-semibold text-slate-900 truncate">{title}</p>
					<p className="text-xs text-slate-500 line-clamp-2">{subtitle}</p>
				</div>
			</div>
			<div className="mt-4">{children}</div>
		</div>
	</div>
);

const AgentNode = ({ data, selected }) => (
	<div className="relative">
		<Handle
			type="target"
			position={Position.Top}
			className="!h-3 !w-3 !border-2 !border-blue-500 !bg-white"
		/>
		<NodeFrame
			selected={selected}
			accentClass="bg-gradient-to-r from-blue-500 to-cyan-400"
			icon={<FiCpu className="text-lg text-blue-600" />}
			title={data?.agent?.name || data?.label || "Agent"}
			subtitle={data?.agent?.role || data?.agent?.systemPrompt || "Agent node"}
		>
			<div className="flex flex-wrap gap-2">
				<Tag className="m-0 border-none bg-blue-50 text-blue-700">Agent</Tag>
				{data?.agent?.status ? (
					<Tag className="m-0 border-none bg-slate-100 text-slate-600">
						{data.agent.status}
					</Tag>
				) : null}
			</div>
		</NodeFrame>
		<Handle
			type="source"
			position={Position.Bottom}
			className="!h-3 !w-3 !border-2 !border-blue-500 !bg-white"
		/>
	</div>
);

const LoopNode = ({ data, selected }) => (
	<div className="relative">
		<Handle
			type="target"
			position={Position.Left}
			className="!h-3 !w-3 !border-2 !border-emerald-500 !bg-white"
		/>
		<NodeFrame
			selected={selected}
			accentClass="bg-gradient-to-r from-emerald-500 to-lime-400"
			icon={<FiLayers className="text-lg text-emerald-600" />}
			title={data?.config?.label || data?.label || "Loop"}
			subtitle={data?.config?.condition || "Repeat this branch"}
		>
			<div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500">
				<div className="rounded-lg bg-slate-50 px-2 py-1">
					<p className="font-semibold text-slate-700">
						{data?.config?.iterations ?? 0}
					</p>
					<p>Iterations</p>
				</div>
				<div className="rounded-lg bg-slate-50 px-2 py-1">
					<p className="font-semibold text-slate-700">Cycle</p>
					<p>Control</p>
				</div>
			</div>
		</NodeFrame>
		<Handle
			type="source"
			position={Position.Right}
			className="!h-3 !w-3 !border-2 !border-emerald-500 !bg-white"
		/>
	</div>
);

const ConditionalNode = ({ data, selected }) => (
	<div className="relative">
		<Handle
			type="target"
			position={Position.Left}
			className="!h-3 !w-3 !border-2 !border-amber-500 !bg-white"
		/>
		<NodeFrame
			selected={selected}
			accentClass="bg-gradient-to-r from-amber-500 to-orange-400"
			icon={<FiActivity className="text-lg text-amber-600" />}
			title={data?.config?.label || data?.label || "Conditional"}
			subtitle={data?.config?.expression || "Branch execution"}
		>
			<div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500">
				<div className="rounded-lg bg-slate-50 px-2 py-1">
					<p className="font-semibold text-slate-700">
						{data?.config?.trueLabel || "true"}
					</p>
					<p>Branch A</p>
				</div>
				<div className="rounded-lg bg-slate-50 px-2 py-1">
					<p className="font-semibold text-slate-700">
						{data?.config?.falseLabel || "false"}
					</p>
					<p>Branch B</p>
				</div>
			</div>
		</NodeFrame>
		<Handle
			type="source"
			position={Position.Right}
			id="true"
			style={{ top: 22 }}
			className="!h-3 !w-3 !border-2 !border-amber-500 !bg-white"
		/>
		<Handle
			type="source"
			position={Position.Right}
			id="false"
			style={{ top: 58 }}
			className="!h-3 !w-3 !border-2 !border-amber-500 !bg-white"
		/>
	</div>
);

const nodeTypes = {
	agent: AgentNode,
	loop: LoopNode,
	conditional: ConditionalNode,
};

const WorkflowBuilderCanvas = ({ workflowId }) => {
	const router = useRouter();
	const [workflowForm] = Form.useForm();
	const [agentForm] = Form.useForm();
	const [nodeForm] = Form.useForm();
	const [nodes, setNodes, onNodesChange] = useNodesState([]);
	const [edges, setEdges, onEdgesChange] = useEdgesState([]);
	const [agents, setAgents] = useState([]);
	const [workflowLoading, setWorkflowLoading] = useState(Boolean(workflowId));
	const [saving, setSaving] = useState(false);
	const [drawerOpen, setDrawerOpen] = useState(false);
	const [selectedNode, setSelectedNode] = useState(null);
	const [agentModalOpen, setAgentModalOpen] = useState(false);
	const [creatingAgentPlacement, setCreatingAgentPlacement] = useState("canvas");
	const [isInitialized, setIsInitialized] = useState(false);
	const viewportRef = useRef({ x: 0, y: 0, zoom: 1 });
	const { fitView, setViewport } = useReactFlow();

	const workflowTitle = Form.useWatch("name", workflowForm);

	const existingAgentMap = useMemo(() => {
		return new Map(agents.map((agent) => [String(agent._id), agent]));
	}, [agents]);

	const openCreateAgentModal = useCallback(() => {
		setCreatingAgentPlacement("canvas");
		agentForm.resetFields();
		agentForm.setFieldsValue({
			model: "gpt-4o-mini",
			tools: [],
			channels: [],
		});
		setAgentModalOpen(true);
	}, [agentForm]);

	const openNodeDrawer = useCallback(
		(node) => {
			setSelectedNode(node);
			setDrawerOpen(true);
			nodeForm.resetFields();

			if (node?.type === "agent") {
				const agent =
					node?.data?.agent ||
					existingAgentMap.get(String(node?.data?.agentId || ""));
				nodeForm.setFieldsValue({
					name: agent?.name || node?.data?.label || "",
					role: agent?.role || "",
					systemPrompt: agent?.systemPrompt || "",
					model: agent?.model || "gpt-4o-mini",
					tools: agent?.tools || [],
					channels: agent?.channels || [],
				});
				return;
			}

			if (node?.type === "loop") {
				nodeForm.setFieldsValue({
					label: node?.data?.config?.label || "Loop",
					iterations: node?.data?.config?.iterations ?? 3,
					condition: node?.data?.config?.condition || "",
				});
				return;
			}

			if (node?.type === "conditional") {
				nodeForm.setFieldsValue({
					label: node?.data?.config?.label || "Conditional",
					expression: node?.data?.config?.expression || "",
					trueLabel: node?.data?.config?.trueLabel || "true",
					falseLabel: node?.data?.config?.falseLabel || "false",
				});
				return;
			}

			nodeForm.setFieldsValue({
				label: node?.data?.label || node?.type || "Node",
			});
		},
		[existingAgentMap, nodeForm]
	);

	const addAgentNodeToCanvas = useCallback(
		(agent) => {
			setNodes((currentNodes) => {
				const node = makeAgentNode(agent, currentNodes.length);
				return [...currentNodes, node];
			});
		},
		[setNodes]
	);

	const addLoopNode = useCallback(() => {
		setNodes((currentNodes) => [...currentNodes, makeLoopNode(currentNodes.length)]);
	}, [setNodes]);

	const addConditionalNode = useCallback(() => {
		setNodes((currentNodes) => [
			...currentNodes,
			makeConditionalNode(currentNodes.length),
		]);
	}, [setNodes]);

	useEffect(() => {
		let cancelled = false;

		const loadAgents = async () => {
			try {
				const items = await getAllAgent();
				if (!cancelled) {
					setAgents(items || []);
				}
			} catch (error) {
				console.error("Unable to load agents:", error);
				message.error("Could not load agents for the builder.");
			}
		};

		loadAgents();

		return () => {
			cancelled = true;
		};
	}, []);

	useEffect(() => {
		if (!workflowId) {
			workflowForm.setFieldsValue({
				name: "Untitled Workflow",
				description: "",
				isActive: true,
			});
			setWorkflowLoading(false);
			return;
		}

		let cancelled = false;

		const loadWorkflow = async () => {
			try {
				setWorkflowLoading(true);
				const workflow = await getWorkflowById(workflowId);
				if (cancelled) return;

				const graph = normalizeGraph(workflow.uiGraph, workflow.agents || []);
				setNodes(graph.nodes);
				setEdges(graph.edges);
				workflowForm.setFieldsValue({
					name: workflow.name || "",
					description: workflow.description || "",
					isActive: workflow.isActive ?? true,
				});

				const restoredViewport = graph.viewport || { x: 0, y: 0, zoom: 1 };
				viewportRef.current = restoredViewport;
				requestAnimationFrame(() => {
					setViewport(restoredViewport, { duration: 0 });
				});
				setIsInitialized(true);
			} catch (error) {
				console.error("Workflow load failed:", error);
				message.error("Unable to load workflow data.");
			} finally {
				if (!cancelled) {
					setWorkflowLoading(false);
				}
			}
		};

		loadWorkflow();

		return () => {
			cancelled = true;
		};
	}, [setEdges, setNodes, setViewport, workflowForm, workflowId]);

	useEffect(() => {
		if (!isInitialized && nodes.length > 0) {
			requestAnimationFrame(() => {
				fitView({ duration: 0, padding: 0.2 });
			});
			setIsInitialized(true);
		}
	}, [fitView, isInitialized, nodes.length]);

	const handleConnect = useCallback(
		(connection) => {
			setEdges((currentEdges) =>
				addEdge(
					{
						...connection,
						markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18 },
						style: { strokeWidth: 2, stroke: "#2563eb" },
					},
					currentEdges
				)
			);
		},
		[setEdges]
	);

	const handleDropAgent = useCallback(
		(agent) => {
			addAgentNodeToCanvas(agent);
			message.success(`Added "${agent.name}" to the canvas.`);
		},
		[addAgentNodeToCanvas]
	);

	const handleCreateAgent = useCallback(async () => {
		try {
			const values = await agentForm.validateFields();
			const payload = {
				name: values.name,
				role: values.role,
				systemPrompt: values.systemPrompt,
				model: values.model,
				tools: values.tools || [],
				channels: values.channels || [],
			};
			const newAgent = await createAgent(payload);
			setAgents((current) => [newAgent, ...current]);
			setAgentModalOpen(false);
			agentForm.resetFields();
			if (creatingAgentPlacement === "canvas") {
				addAgentNodeToCanvas(newAgent);
			}
			message.success(`Agent "${newAgent.name}" created successfully.`);
		} catch (error) {
			console.error("Create agent failed:", error);
			message.error("Unable to create agent.");
		}
	}, [
		addAgentNodeToCanvas,
		agentForm,
		creatingAgentPlacement,
	]);

	const handleSaveNode = useCallback(async () => {
		if (!selectedNode) return;

		try {
			const values = await nodeForm.validateFields();

			if (selectedNode.type === "agent") {
				const agentId = selectedNode?.data?.agentId;
				if (!agentId) {
					message.error("This agent node is not linked to an agent record.");
					return;
				}

				const payload = {
					name: values.name,
					role: values.role,
					systemPrompt: values.systemPrompt,
					model: values.model,
					tools: values.tools || [],
					channels: values.channels || [],
				};
				const updatedAgent = await editAgent(agentId, payload);

				setAgents((current) =>
					current.map((agent) =>
						String(agent._id) === String(updatedAgent._id) ? updatedAgent : agent
					)
				);
				setNodes((currentNodes) =>
					currentNodes.map((node) =>
						node.id === selectedNode.id ||
						String(node?.data?.agentId || "") === String(agentId)
							? {
									...node,
									data: {
										...node.data,
										label: updatedAgent.name,
										agent: updatedAgent,
										agentId: updatedAgent._id,
									},
							  }
							: node
					)
				);
				setSelectedNode((current) =>
					current
						? {
								...current,
								data: {
									...current.data,
									label: updatedAgent.name,
									agent: updatedAgent,
									agentId: updatedAgent._id,
								},
						  }
						: current
				);
				message.success(`Agent "${updatedAgent.name}" updated.`);
				setDrawerOpen(false);
				return;
			}

			if (selectedNode.type === "loop") {
				setNodes((currentNodes) =>
					currentNodes.map((node) =>
						node.id === selectedNode.id
							? {
									...node,
									data: {
										...node.data,
										config: {
											label: values.label,
											iterations: values.iterations,
											condition: values.condition,
										},
										label: values.label,
									},
							  }
							: node
					)
				);
				setSelectedNode((current) =>
					current
						? {
								...current,
								data: {
									...current.data,
									config: {
										label: values.label,
										iterations: values.iterations,
										condition: values.condition,
									},
									label: values.label,
								},
						  }
						: current
				);
				message.success("Loop node updated.");
				setDrawerOpen(false);
				return;
			}

			if (selectedNode.type === "conditional") {
				setNodes((currentNodes) =>
					currentNodes.map((node) =>
						node.id === selectedNode.id
							? {
									...node,
									data: {
										...node.data,
										config: {
											label: values.label,
											expression: values.expression,
											trueLabel: values.trueLabel,
											falseLabel: values.falseLabel,
										},
										label: values.label,
									},
							  }
							: node
					)
				);
				setSelectedNode((current) =>
					current
						? {
								...current,
								data: {
									...current.data,
									config: {
										label: values.label,
										expression: values.expression,
										trueLabel: values.trueLabel,
										falseLabel: values.falseLabel,
									},
									label: values.label,
								},
						  }
						: current
				);
				message.success("Conditional node updated.");
				setDrawerOpen(false);
				return;
			}
		} catch (error) {
			console.error("Node save failed:", error);
			message.error("Unable to update the selected node.");
		}
	}, [nodeForm, selectedNode, setNodes]);

	const handleSaveWorkflow = useCallback(async () => {
		try {
			const values = await workflowForm.validateFields();
			const serializedNodes = nodes.map(sanitizeNode);
			const serializedEdges = edges.map(sanitizeEdge);
			const uiGraph = {
				nodes: serializedNodes,
				edges: serializedEdges,
				viewport: viewportRef.current,
				schemaVersion: 1,
			};
			const agentIds = [
				...new Set(
					nodes
						.filter((node) => node.type === "agent" && node.data?.agentId)
						.map((node) => node.data.agentId)
				),
			];

			setSaving(true);
			const payload = {
				name: values.name,
				description: values.description || "",
				isActive: values.isActive ?? true,
				uiGraph,
				agents: agentIds,
			};

			const savedWorkflow = workflowId
				? await editWorkflow(workflowId, payload)
				: await createWorkflow(payload);

			message.success(`Workflow "${savedWorkflow.name}" saved.`);
			if (!workflowId && savedWorkflow?._id) {
				router.push(`/dashboard/workflows/${savedWorkflow._id}`);
			}
		} catch (error) {
			console.error("Workflow save failed:", error);
			message.error("Unable to save workflow.");
		} finally {
			setSaving(false);
		}
	}, [edges, nodes, router, workflowForm, workflowId]);

	const selectedNodeType = selectedNode?.type;

	return (
		<div className="flex h-full min-h-[calc(100vh-128px)] w-full flex-col gap-4">
			<div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-blue-50/60 p-5 shadow-sm md:flex-row md:items-end md:justify-between">
				<div className="space-y-3">
					<div className="flex items-center gap-2">
						<Tag className="border-none bg-blue-50 text-blue-700">Workflow Studio</Tag>
						{workflowId ? (
							<Tag className="border-none bg-emerald-50 text-emerald-700">
								Editing existing workflow
							</Tag>
						) : (
							<Tag className="border-none bg-slate-100 text-slate-600">
								New workflow
							</Tag>
						)}
					</div>
					<div className="space-y-3">
						<div className="space-y-1">
							<h1 className="text-2xl font-bold tracking-tight text-slate-900">
								{workflowTitle || "Untitled Workflow"}
							</h1>
							<p className="max-w-3xl text-sm text-slate-500">
								Compose multi-agent flows visually. Add existing agents, create
								new ones inline, and wire loops or branches as explicit graph
								nodes.
							</p>
						</div>

						<Form
							form={workflowForm}
							layout="vertical"
							className="grid gap-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.8fr)_auto]"
						>
							<Form.Item
								name="name"
								label="Workflow Name"
								rules={[{ required: true, message: "Workflow name is required" }]}
								className="m-0"
							>
								<Input placeholder="Enter workflow name" />
							</Form.Item>
							<Form.Item name="description" label="Description" className="m-0">
								<Input placeholder="Describe what this workflow does" />
							</Form.Item>
							<Form.Item
								name="isActive"
								label="Active"
								valuePropName="checked"
								className="m-0 flex items-center"
							>
								<Switch checkedChildren="On" unCheckedChildren="Off" />
							</Form.Item>
						</Form>
					</div>
				</div>

				<div className="flex flex-wrap gap-3">
					<Button icon={<FiPlus />} onClick={openCreateAgentModal}>
						New Agent
					</Button>
					<Button
						icon={<FiLayers />}
						onClick={addLoopNode}
					>
						Add Loop
					</Button>
					<Button
						icon={<FiActivity />}
						onClick={addConditionalNode}
					>
						Add Conditional
					</Button>
					<Button
						type="primary"
						loading={saving}
						icon={<FiSave />}
						onClick={handleSaveWorkflow}
						className="bg-blue-600 hover:bg-blue-500"
					>
						Save Workflow
					</Button>
				</div>
			</div>

			<div className="grid min-h-[calc(100vh-240px)] grid-cols-1 gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
				<aside className="flex h-full flex-col gap-4 overflow-hidden rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
					<div className="space-y-2">
						<div className="flex items-center gap-2">
							<FiCpu className="text-blue-600" />
							<h2 className="text-sm font-semibold text-slate-900">
								Existing Agents
							</h2>
						</div>
						<p className="text-xs text-slate-500">
							Click to add an agent node. Click on a node in the canvas to edit
							it in the drawer.
						</p>
					</div>

					<div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-3">
						<div className="flex items-center justify-between gap-3">
							<div>
								<p className="text-sm font-medium text-slate-900">Create agent</p>
								<p className="text-xs text-slate-500">
									Build a new agent without leaving the studio.
								</p>
							</div>
							<Button type="primary" className="bg-blue-600" onClick={openCreateAgentModal}>
								Add
							</Button>
						</div>
					</div>

					<div className="space-y-2 overflow-y-auto pr-1">
						{agents.length === 0 ? (
							<Empty
								description="No agents found yet."
								image={Empty.PRESENTED_IMAGE_SIMPLE}
							/>
						) : (
							agents.map((agent) => (
								<button
									key={agent._id}
									type="button"
									onClick={() => handleDropAgent(agent)}
									className="group w-full rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-blue-300 hover:shadow-md"
								>
									<div className="flex items-start gap-3">
										<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
											<FiCpu />
										</div>
										<div className="min-w-0 flex-1">
											<div className="flex items-center justify-between gap-2">
												<p className="truncate text-sm font-semibold text-slate-900">
													{agent.name}
												</p>
												<Badge
													status={agent.status === "RUNNING" ? "processing" : "default"}
												/>
											</div>
											<p className="mt-0.5 text-xs text-slate-500">{agent.role}</p>
											<div className="mt-2 flex flex-wrap gap-1">
												<Tag className="m-0 border-none bg-slate-100 text-slate-600">
													{agent.model || "gpt-4o-mini"}
												</Tag>
												{(agent.tools || []).slice(0, 2).map((tool) => (
													<Tag key={tool} className="m-0 border-none bg-blue-50 text-blue-700">
														{tool}
													</Tag>
												))}
											</div>
										</div>
									</div>
								</button>
							))
						)}
					</div>
				</aside>

				<section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-[#0f172a] shadow-sm">
					<div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(59,130,246,0.18),_transparent_35%),radial-gradient(circle_at_bottom_left,_rgba(16,185,129,0.12),_transparent_30%)]" />
					<div className="relative h-full min-h-[720px]">
						{workflowLoading ? (
							<div className="flex h-full items-center justify-center">
								<Spin size="large" />
							</div>
						) : (
							<ReactFlow
								nodes={nodes}
								edges={edges}
								onNodesChange={onNodesChange}
								onEdgesChange={onEdgesChange}
								onConnect={handleConnect}
								onNodeClick={(_, node) => openNodeDrawer(node)}
								onPaneClick={() => setDrawerOpen(false)}
								onMove={(_, viewport) => {
									viewportRef.current = viewport;
								}}
								nodeTypes={nodeTypes}
								minZoom={0.2}
								maxZoom={1.5}
								defaultEdgeOptions={{
									type: "smoothstep",
									markerEnd: { type: MarkerType.ArrowClosed },
									style: { strokeWidth: 2, stroke: "#2563eb" },
								}}
								className="bg-transparent"
							>
								<Background color="#94a3b8" gap={18} size={1} />
								<MiniMap
									zoomable
									pannable
									className="!rounded-2xl !border !border-slate-200 !bg-white/90"
									nodeStrokeColor={(node) => {
										if (node.type === "agent") return "#2563eb";
										if (node.type === "loop") return "#10b981";
										if (node.type === "conditional") return "#f59e0b";
										return "#94a3b8";
									}}
								/>
								<Controls />
								<Panel position="top-right">
									<div className="rounded-2xl border border-white/20 bg-slate-900/80 px-4 py-3 text-xs text-slate-200 shadow-xl backdrop-blur">
										<div className="flex items-center gap-2 text-slate-100">
											<FiGitBranch />
											<span className="font-medium">
												{nodes.length} nodes · {edges.length} edges
											</span>
										</div>
										<p className="mt-1 text-slate-300">
											Use explicit agent, loop, and conditional nodes to express
											control flow.
										</p>
									</div>
								</Panel>
							</ReactFlow>
						)}
					</div>
				</section>
			</div>

			<Drawer
				title={
					<div className="flex items-center gap-2">
						<FiSettings className="text-blue-600" />
						<span>
							{selectedNodeType === "agent"
								? "Agent Details"
								: selectedNodeType === "loop"
								? "Loop Settings"
								: selectedNodeType === "conditional"
								? "Conditional Settings"
								: "Node Settings"}
						</span>
					</div>
				}
				width={460}
				open={drawerOpen}
				onClose={() => setDrawerOpen(false)}
				destroyOnClose={false}
			>
				{selectedNode ? (
					<Form
						form={nodeForm}
						layout="vertical"
						requiredMark={false}
						className="space-y-4"
					>
						{selectedNode.type === "agent" ? (
							<>
								<Form.Item
									name="name"
									label="Agent Name"
									rules={[{ required: true, message: "Name is required" }]}
								>
									<Input />
								</Form.Item>
								<Form.Item
									name="role"
									label="Role"
									rules={[{ required: true, message: "Role is required" }]}
								>
									<Input />
								</Form.Item>
								<Form.Item
									name="systemPrompt"
									label="System Prompt"
									rules={[{ required: true, message: "Prompt is required" }]}
								>
									<Input.TextArea rows={5} />
								</Form.Item>
								<Form.Item name="model" label="Model">
									<Select options={MODEL_OPTIONS} />
								</Form.Item>
								<Form.Item name="tools" label="Tools">
									<Select mode="multiple" options={TOOL_OPTIONS} />
								</Form.Item>
								<Form.Item name="channels" label="Channels">
									<Select mode="multiple" options={CHANNEL_OPTIONS} />
								</Form.Item>
							</>
						) : selectedNode.type === "loop" ? (
							<>
								<Form.Item
									name="label"
									label="Label"
									rules={[{ required: true, message: "Label is required" }]}
								>
									<Input />
								</Form.Item>
								<Form.Item name="iterations" label="Iterations">
									<InputNumber min={1} max={100} className="w-full" />
								</Form.Item>
								<Form.Item name="condition" label="Condition">
									<Input.TextArea rows={4} />
								</Form.Item>
							</>
						) : selectedNode.type === "conditional" ? (
							<>
								<Form.Item
									name="label"
									label="Label"
									rules={[{ required: true, message: "Label is required" }]}
								>
									<Input />
								</Form.Item>
								<Form.Item name="expression" label="Expression">
									<Input.TextArea rows={4} />
								</Form.Item>
								<div className="grid grid-cols-2 gap-3">
									<Form.Item name="trueLabel" label="True Branch">
										<Input />
									</Form.Item>
									<Form.Item name="falseLabel" label="False Branch">
										<Input />
									</Form.Item>
								</div>
							</>
						) : (
							<Form.Item name="label" label="Label">
								<Input />
							</Form.Item>
						)}

						<div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
							<Button onClick={() => setDrawerOpen(false)}>Cancel</Button>
							<Button type="primary" icon={<FiSave />} onClick={handleSaveNode}>
								Save Node
							</Button>
						</div>
					</Form>
				) : (
					<Empty description="Select a node to edit it." />
				)}
			</Drawer>

			<Modal
				title={
					<div className="flex items-center gap-2">
						<FiZap className="text-blue-600" />
						<span>Create New Agent</span>
					</div>
				}
				open={agentModalOpen}
				onCancel={() => setAgentModalOpen(false)}
				footer={null}
				destroyOnClose={false}
				width={640}
			>
				<Form
					form={agentForm}
					layout="vertical"
					requiredMark={false}
					className="mt-4"
					initialValues={{
						model: "gpt-4o-mini",
						tools: [],
						channels: [],
					}}
				>
					<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
						<Form.Item
							name="name"
							label="Name"
							rules={[{ required: true, message: "Name is required" }]}
						>
							<Input />
						</Form.Item>
						<Form.Item
							name="role"
							label="Role"
							rules={[{ required: true, message: "Role is required" }]}
						>
							<Input />
						</Form.Item>
					</div>

					<Form.Item
						name="systemPrompt"
						label="System Prompt"
						rules={[{ required: true, message: "System prompt is required" }]}
					>
						<Input.TextArea rows={4} />
					</Form.Item>

					<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
						<Form.Item name="model" label="Model">
							<Select options={MODEL_OPTIONS} />
						</Form.Item>
						<Form.Item name="tools" label="Tools">
							<Select mode="multiple" options={TOOL_OPTIONS} />
						</Form.Item>
					</div>

					<Form.Item name="channels" label="Channels">
						<Select mode="multiple" options={CHANNEL_OPTIONS} />
					</Form.Item>

					<div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
						<Button onClick={() => setAgentModalOpen(false)}>Cancel</Button>
						<Button type="primary" onClick={handleCreateAgent}>
							Create Agent
						</Button>
					</div>
				</Form>
			</Modal>
		</div>
	);
};

const WorkflowBuilder = ({ workflowId }) => {
	return (
		<ReactFlowProvider>
			<WorkflowBuilderCanvas workflowId={workflowId} />
		</ReactFlowProvider>
	);
};

export default WorkflowBuilder;
