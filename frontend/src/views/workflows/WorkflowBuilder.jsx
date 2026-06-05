"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
	Background,
	Controls,
	MarkerType,
	MiniMap,
	Panel,
	ReactFlow,
	ReactFlowProvider,
	addEdge,
	applyEdgeChanges,
	applyNodeChanges,
	useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
	Badge,
	Button,
	Empty,
	Form,
	Input,
	Spin,
	Switch,
	Tag,
	message,
} from "antd";
import { FiCpu, FiGitBranch, FiLayers, FiPlus, FiSave } from "react-icons/fi";
import { useParams, useRouter } from "next/navigation";
import CreateAgentModal from "@/components/dashboard/CreateAgentModal";
import WorkflowNodeDrawer from "@/components/workflows/WorkflowNodeDrawer";
import { workflowNodeTypes } from "@/components/workflows/WorkflowNodes";
import { createAgent, editAgent, getAllAgent } from "@/service/agent";
import {
	createWorkflow,
	editWorkflow,
	getWorkflowById,
} from "@/service/workflow";

const WORKFLOW_START_NODE_ID = "workflow_start";
const WORKFLOW_END_NODE_ID = "workflow_end";
const WORKFLOW_SCHEMA_VERSION = 2;

const CHANNEL_OPTIONS = [
	{ value: "web", label: "Web" },
	{ value: "telegram", label: "Telegram" },
	{ value: "slack", label: "Slack" },
];

const initialInfo = {
	nodes: [],
	edges: [],
	agents: [],
	workflowLoading: true,
	saving: false,
	drawerOpen: false,
	selectedNode: null,
	agentModalOpen: false,
	creatingAgentPlacement: "canvas",
	isInitialized: false,
	workflow: {
		name: "Untitled Workflow",
		description: "",
		isActive: true,
	},
	viewport: { x: 0, y: 0, zoom: 1 },
};

const getId = (prefix) =>
	`${prefix}_${crypto?.randomUUID?.() || Math.random().toString(36).slice(2)}`;

const makeWorkflowEdge = (
	source,
	target,
	{ sourceHandle, targetHandle } = {}
) => ({
	id: `${source}__${target}${sourceHandle ? `__${sourceHandle}` : ""}${
		targetHandle ? `__${targetHandle}` : ""
	}`,
	source,
	target,
	...(sourceHandle ? { sourceHandle } : {}),
	...(targetHandle ? { targetHandle } : {}),
	type: "smoothstep",
	selectable: true,
	deletable: true,
	markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18 },
	style: { strokeWidth: 2, stroke: "#2563eb" },
});

const isAnchorNode = (node) => node?.type === "start" || node?.type === "end";

const makeStartNode = (position = { x: 80, y: 220 }) => ({
	id: WORKFLOW_START_NODE_ID,
	type: "start",
	position,
	draggable: true,
	deletable: false,
	data: {
		kind: "anchor",
		label: "Start",
		description: "Workflow entry point",
	},
});

const makeEndNode = (position = { x: 560, y: 220 }) => ({
	id: WORKFLOW_END_NODE_ID,
	type: "end",
	position,
	draggable: true,
	deletable: false,
	data: {
		kind: "anchor",
		label: "End",
		description: "Workflow exit point",
	},
});

const getBounds = (nodes = []) => {
	const positionedNodes = nodes.filter((node) => node?.position);
	if (positionedNodes.length === 0) {
		return { minX: 80, maxX: 560, centerY: 220 };
	}

	const xValues = positionedNodes.map((node) => node.position?.x ?? 0);
	const yValues = positionedNodes.map((node) => node.position?.y ?? 0);

	return {
		minX: Math.min(...xValues),
		maxX: Math.max(...xValues),
		centerY:
			yValues.reduce((sum, value) => sum + value, 0) /
			Math.max(yValues.length, 1),
	};
};

const sortNodesByPosition = (nodes = []) =>
	[...nodes].sort((left, right) => {
		const leftX = left.position?.x ?? 0;
		const rightX = right.position?.x ?? 0;
		if (leftX !== rightX) return leftX - rightX;
		const leftY = left.position?.y ?? 0;
		const rightY = right.position?.y ?? 0;
		return leftY - rightY;
	});

const inferBoundaryNodeIds = (edges = []) => {
	const sourceNodes = new Set(edges.map((edge) => edge.source));
	const targetNodes = new Set(edges.map((edge) => edge.target));

	return {
		entryId:
			edges.find((edge) => !targetNodes.has(edge.source))?.source ||
			edges[0]?.source,
		exitId:
			edges.find((edge) => !sourceNodes.has(edge.target))?.target ||
			edges[edges.length - 1]?.target,
	};
};

const chainEdges = (nodes = []) =>
	nodes.slice(0, -1).map((node, index) =>
		makeWorkflowEdge(node.id, nodes[index + 1].id, {
			sourceHandle: undefined,
		})
	);

const createDefaultGraph = () => {
	const startNode = makeStartNode();
	const endNode = makeEndNode();

	return {
		nodes: [startNode, endNode],
		edges: [makeWorkflowEdge(startNode.id, endNode.id)],
		viewport: { x: 0, y: 0, zoom: 1 },
	};
};

const sanitizeNode = (node) => {
	const { selected, dragging, width, height, measured, zIndex, ...rest } = node;
	return rest;
};

const sanitizeEdge = (edge) => {
	const { selected, animated, style, focusable, interactionWidth, ...rest } =
		edge;
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
	const viewport = uiGraph.viewport || { x: 0, y: 0, zoom: 1 };
	const nodes = Array.isArray(uiGraph.nodes) ? [...uiGraph.nodes] : [];
	const edges = Array.isArray(uiGraph.edges) ? [...uiGraph.edges] : [];

	if (nodes.length === 0) {
		if (agents.length === 0) {
			return createDefaultGraph();
		}

		const agentNodes = agents.map((agent, index) =>
			makeAgentNode(agent, index)
		);
		const { minX, maxX, centerY } = getBounds(agentNodes);
		const nextNodes = [
			makeStartNode({ x: minX - 220, y: centerY }),
			...agentNodes,
			makeEndNode({ x: maxX + 220, y: centerY }),
		];

		return {
			nodes: nextNodes,
			edges: chainEdges(sortNodesByPosition(nextNodes)),
			viewport,
		};
	}

	const hasStart = nodes.some((node) => node.id === WORKFLOW_START_NODE_ID);
	const hasEnd = nodes.some((node) => node.id === WORKFLOW_END_NODE_ID);
	const contentNodes = nodes.filter((node) => !isAnchorNode(node));
	const bounds = getBounds(contentNodes.length > 0 ? contentNodes : nodes);

	if (!hasStart) {
		nodes.unshift(makeStartNode({ x: bounds.minX - 220, y: bounds.centerY }));
	}

	if (!hasEnd) {
		nodes.push(makeEndNode({ x: bounds.maxX + 220, y: bounds.centerY }));
	}

	if (edges.length === 0) {
		return {
			nodes,
			edges: chainEdges(sortNodesByPosition(nodes)),
			viewport,
		};
	}

	if (!hasStart || !hasEnd) {
		const { entryId, exitId } = inferBoundaryNodeIds(edges);
		if (!hasStart && entryId) {
			edges.unshift(makeWorkflowEdge(WORKFLOW_START_NODE_ID, entryId));
		}
		if (!hasEnd && exitId) {
			edges.push(makeWorkflowEdge(exitId, WORKFLOW_END_NODE_ID));
		}
	}

	return {
		nodes,
		edges,
		viewport,
	};
};

const toWorkflowUpdate = (workflow = {}) => ({
	name: workflow.name || "Untitled Workflow",
	description: workflow.description || "",
	isActive: workflow.isActive ?? true,
});

const WorkflowBuilderCanvas = ({ workflowId: workflowIdProp }) => {
	const router = useRouter();
	const params = useParams();
	const workflowId = workflowIdProp ?? params?.id;
	const [workflowForm] = Form.useForm();
	const [agentForm] = Form.useForm();
	const viewportRef = useRef({ x: 0, y: 0, zoom: 1 });
	const [info, setInfo] = useState(initialInfo);
	const { setViewport, fitView } = useReactFlow();

	const workflowTitle =
		Form.useWatch("name", workflowForm) || info.workflow.name;

	const updateInfo = useCallback((updater) => {
		setInfo((current) => {
			const next = typeof updater === "function" ? updater(current) : updater;
			return { ...current, ...next };
		});
	}, []);

	const isPristineAnchorGraph = useCallback((nodes, edges) => {
		return (
			Array.isArray(nodes) &&
			Array.isArray(edges) &&
			nodes.some((node) => node.id === WORKFLOW_START_NODE_ID) &&
			nodes.some((node) => node.id === WORKFLOW_END_NODE_ID) &&
			edges.length === 1 &&
			edges[0]?.source === WORKFLOW_START_NODE_ID &&
			edges[0]?.target === WORKFLOW_END_NODE_ID
		);
	}, []);

	const openCreateAgentModal = useCallback(() => {
		agentForm.resetFields();
		agentForm.setFieldsValue({
			model: "gpt-4o-mini",
			tools: [],
			channels: [],
		});
		updateInfo({
			creatingAgentPlacement: "canvas",
			agentModalOpen: true,
		});
	}, [agentForm, updateInfo]);

	const closeAgentModal = useCallback(() => {
		updateInfo({
			agentModalOpen: false,
			creatingAgentPlacement: "canvas",
		});
	}, [updateInfo]);

	const handleNodesChange = useCallback(
		(changes) => {
			updateInfo((current) => ({
				nodes: applyNodeChanges(changes, current.nodes),
			}));
		},
		[updateInfo]
	);

	const handleEdgesChange = useCallback(
		(changes) => {
			updateInfo((current) => ({
				edges: applyEdgeChanges(changes, current.edges),
			}));
		},
		[updateInfo]
	);

	const addNodeToCanvas = useCallback(
		(nodeFactory) => {
			updateInfo((current) => {
				const contentNodeCount = current.nodes.filter(
					(node) => !isAnchorNode(node)
				).length;
				const newNode = nodeFactory(contentNodeCount);
				const nextNodes = [...current.nodes, newNode];

				if (isPristineAnchorGraph(current.nodes, current.edges)) {
					return {
						nodes: nextNodes,
						edges: [
							makeWorkflowEdge(WORKFLOW_START_NODE_ID, newNode.id),
							makeWorkflowEdge(newNode.id, WORKFLOW_END_NODE_ID),
						],
					};
				}

				return { nodes: nextNodes };
			});
		},
		[isPristineAnchorGraph, updateInfo]
	);

	const openNodeDrawer = useCallback(
		(node) => {
			updateInfo({
				selectedNode: node,
				drawerOpen: true,
			});
		},
		[updateInfo]
	);

	useEffect(() => {
		let cancelled = false;

		const loadAgents = async () => {
			try {
				const items = await getAllAgent();
				if (!cancelled) {
					updateInfo({ agents: items || [] });
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
	}, [updateInfo]);

	useEffect(() => {
		if (!workflowId) {
			const nextWorkflow = toWorkflowUpdate();
			const graph = createDefaultGraph();

			workflowForm.setFieldsValue(nextWorkflow);
			updateInfo({
				nodes: graph.nodes,
				edges: graph.edges,
				workflow: nextWorkflow,
				viewport: graph.viewport,
				isInitialized: false,
				workflowLoading: false,
			});
			return;
		}

		let cancelled = false;

		const loadWorkflow = async () => {
			try {
				updateInfo({ workflowLoading: true });
				const workflow = await getWorkflowById(workflowId);
				if (cancelled) return;

				const graph = normalizeGraph(workflow.uiGraph, workflow.agents || []);
				const nextWorkflow = toWorkflowUpdate(workflow);

				updateInfo({
					nodes: graph.nodes,
					edges: graph.edges,
					workflow: nextWorkflow,
					viewport: graph.viewport || { x: 0, y: 0, zoom: 1 },
					isInitialized: true,
					workflowLoading: false,
				});

				workflowForm.setFieldsValue(nextWorkflow);
				viewportRef.current = graph.viewport || { x: 0, y: 0, zoom: 1 };
				requestAnimationFrame(() => {
					setViewport(viewportRef.current, { duration: 0 });
				});
			} catch (error) {
				console.error("Workflow load failed:", error);
				message.error("Unable to load workflow data.");
				updateInfo({ workflowLoading: false });
			}
		};

		loadWorkflow();

		return () => {
			cancelled = true;
		};
	}, [setViewport, updateInfo, workflowForm, workflowId]);

	useEffect(() => {
		if (!info.isInitialized && info.nodes.length > 0) {
			requestAnimationFrame(() => {
				fitView({ duration: 0, padding: 0.2 });
			});
			updateInfo({ isInitialized: true });
		}
	}, [fitView, info.isInitialized, info.nodes.length, updateInfo]);

	const handleConnect = useCallback(
		(connection) => {
			updateInfo((current) => ({
				edges: addEdge(
					{
						...connection,
						markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18 },
						style: { strokeWidth: 2, stroke: "#2563eb" },
					},
					current.edges
				),
			}));
		},
		[updateInfo]
	);

	const isValidConnection = useCallback(
		(connection) => {
			if (!connection?.source || !connection?.target) {
				return false;
			}

			if (connection.source === connection.target) {
				return false;
			}

			const sourceNode = info.nodes.find(
				(node) => node.id === connection.source
			);
			const targetNode = info.nodes.find(
				(node) => node.id === connection.target
			);

			if (!sourceNode || !targetNode) {
				return false;
			}

			if (sourceNode.type === "end") {
				return false;
			}

			if (targetNode.type === "start") {
				return false;
			}

			return true;
		},
		[info.nodes]
	);

	const handleCreateAgent = useCallback(
		async (values) => {
			try {
				const payload = {
					name: values.name,
					role: values.role,
					systemPrompt: values.systemPrompt,
					model: values.model,
					tools: values.tools || [],
					channels: values.channels || [],
				};
				const newAgent = await createAgent(payload);

				updateInfo((current) => ({
					agents: [newAgent, ...current.agents],
					agentModalOpen: false,
				}));

				if (info.creatingAgentPlacement === "canvas") {
					addNodeToCanvas(() => makeAgentNode(newAgent));
				}

				message.success(`Agent "${newAgent.name}" created successfully.`);
			} catch (error) {
				console.error("Create agent failed:", error);
				message.error("Unable to create agent.");
			}
		},
		[addNodeToCanvas, info.creatingAgentPlacement, updateInfo]
	);

	const handleSaveNode = useCallback(
		async (values) => {
			const selectedNode = info.selectedNode;
			if (!selectedNode) return;

			try {
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

					updateInfo((current) => ({
						agents: current.agents.map((agent) =>
							String(agent._id) === String(updatedAgent._id)
								? updatedAgent
								: agent
						),
						nodes: current.nodes.map((node) =>
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
						),
						selectedNode: {
							...selectedNode,
							data: {
								...selectedNode.data,
								label: updatedAgent.name,
								agent: updatedAgent,
								agentId: updatedAgent._id,
							},
						},
						drawerOpen: false,
					}));

					message.success(`Agent "${updatedAgent.name}" updated.`);
					return;
				}

				if (selectedNode.type === "loop") {
					updateInfo((current) => ({
						nodes: current.nodes.map((node) =>
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
						),
						selectedNode: {
							...selectedNode,
							data: {
								...selectedNode.data,
								config: {
									label: values.label,
									iterations: values.iterations,
									condition: values.condition,
								},
								label: values.label,
							},
						},
						drawerOpen: false,
					}));

					message.success("Loop node updated.");
					return;
				}

				if (selectedNode.type === "conditional") {
					updateInfo((current) => ({
						nodes: current.nodes.map((node) =>
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
						),
						selectedNode: {
							...selectedNode,
							data: {
								...selectedNode.data,
								config: {
									label: values.label,
									expression: values.expression,
									trueLabel: values.trueLabel,
									falseLabel: values.falseLabel,
								},
								label: values.label,
							},
						},
						drawerOpen: false,
					}));

					message.success("Conditional node updated.");
					return;
				}
			} catch (error) {
				console.error("Node save failed:", error);
				message.error("Unable to update the selected node.");
			}
		},
		[info.selectedNode, updateInfo]
	);

	const handleSaveWorkflow = useCallback(async () => {
		try {
			const values = await workflowForm.validateFields();
			const serializedNodes = info.nodes.map(sanitizeNode);
			const serializedEdges = info.edges.map(sanitizeEdge);
			const uiGraph = {
				nodes: serializedNodes,
				edges: serializedEdges,
				viewport: viewportRef.current,
				schemaVersion: WORKFLOW_SCHEMA_VERSION,
			};
			const agentIds = [
				...new Set(
					info.nodes
						.filter((node) => node.type === "agent" && node.data?.agentId)
						.map((node) => node.data.agentId)
				),
			];

			updateInfo({ saving: true });

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
			updateInfo({ saving: false });
		}
	}, [info.edges, info.nodes, router, updateInfo, workflowForm, workflowId]);

	const handleWorkflowValuesChange = useCallback(
		(_, allValues) => {
			updateInfo({ workflow: allValues });
		},
		[updateInfo]
	);

	return (
		<div className="flex h-full min-h-[calc(100vh-128px)] w-full flex-col gap-4">
			<div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-blue-50/60 p-5 shadow-sm md:flex-row md:items-end md:justify-between">
				<div className="space-y-3">
					<div className="flex items-center gap-2">
						<Tag className="border-none bg-blue-50 text-blue-700">
							Workflow Studio
						</Tag>
						<Tag
							className={`border-none ${
								workflowId
									? "bg-emerald-50 text-emerald-700"
									: "bg-slate-100 text-slate-600"
							}`}
						>
							{workflowId ? "Editing existing workflow" : "New workflow"}
						</Tag>
					</div>
					<div className="space-y-3">
						<div className="space-y-1">
							<h1 className="text-2xl font-bold tracking-tight text-slate-900">
								{workflowTitle}
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
							initialValues={info.workflow}
							onValuesChange={handleWorkflowValuesChange}
							className="grid gap-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.8fr)_auto]"
						>
							<Form.Item
								name="name"
								label="Workflow Name"
								rules={[
									{ required: true, message: "Workflow name is required" },
								]}
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
						onClick={() => addNodeToCanvas(makeLoopNode)}
					>
						Add Loop
					</Button>
					<Button
						icon={<FiGitBranch />}
						onClick={() => addNodeToCanvas(makeConditionalNode)}
					>
						Add Conditional
					</Button>
					<Button
						type="primary"
						loading={info.saving}
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
								<p className="text-sm font-medium text-slate-900">
									Create agent
								</p>
								<p className="text-xs text-slate-500">
									Build a new agent without leaving the studio.
								</p>
							</div>
							<Button
								type="primary"
								className="bg-blue-600"
								onClick={openCreateAgentModal}
							>
								Add
							</Button>
						</div>
					</div>

					<div className="space-y-2 overflow-y-auto pr-1">
						{info.agents.length === 0 ? (
							<Empty
								description="No agents found yet."
								image={Empty.PRESENTED_IMAGE_SIMPLE}
							/>
						) : (
							info.agents.map((agent) => (
								<button
									key={agent._id}
									type="button"
									onClick={() =>
										updateInfo((current) => ({
											nodes: [
												...current.nodes,
												makeAgentNode(agent, current.nodes.length),
											],
										}))
									}
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
													status={
														agent.status === "RUNNING"
															? "processing"
															: "default"
													}
												/>
											</div>
											<p className="mt-0.5 text-xs text-slate-500">
												{agent.role}
											</p>
											<div className="mt-2 flex flex-wrap gap-1">
												<Tag className="m-0 border-none bg-slate-100 text-slate-600">
													{agent.model || "gpt-4o-mini"}
												</Tag>
												{(agent.tools || []).slice(0, 2).map((tool) => (
													<Tag
														key={tool}
														className="m-0 border-none bg-blue-50 text-blue-700"
													>
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
						{info.workflowLoading ? (
							<div className="flex h-full items-center justify-center">
								<Spin size="large" />
							</div>
						) : (
							<ReactFlow
								nodes={info.nodes}
								edges={info.edges}
								onNodesChange={handleNodesChange}
								onEdgesChange={handleEdgesChange}
								onConnect={handleConnect}
								isValidConnection={isValidConnection}
								onNodeClick={(_, node) => {
									if (isAnchorNode(node)) {
										updateInfo({
											drawerOpen: false,
											selectedNode: null,
										});
										return;
									}

									openNodeDrawer(node);
								}}
								onPaneClick={() =>
									updateInfo({
										selectedNode: null,
										drawerOpen: false,
									})
								}
								onMove={(_, viewport) => {
									viewportRef.current = viewport;
									updateInfo({ viewport });
								}}
								nodeTypes={workflowNodeTypes}
								minZoom={0.2}
								maxZoom={1.5}
								deleteKeyCode={["Backspace", "Delete"]}
								defaultEdgeOptions={{
									type: "smoothstep",
									selectable: true,
									deletable: true,
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
										if (node.type === "start") return "#10b981";
										if (node.type === "end") return "#f43f5e";
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
												{info.nodes.length} nodes · {info.edges.length} edges
											</span>
										</div>
										<p className="mt-1 text-slate-300">
											Start and End nodes mark the workflow boundaries. Add
											agents, loops, and conditionals in between.
										</p>
									</div>
								</Panel>
							</ReactFlow>
						)}
					</div>
				</section>
			</div>

			<WorkflowNodeDrawer
				open={info.drawerOpen}
				selectedNode={info.selectedNode}
				onClose={() => updateInfo({ drawerOpen: false })}
				onSave={handleSaveNode}
				saving={info.saving}
			/>

			<CreateAgentModal
				isModalOpen={info.agentModalOpen}
				setIsModalOpen={(open) =>
					updateInfo({
						agentModalOpen: open,
						creatingAgentPlacement: open
							? info.creatingAgentPlacement
							: "canvas",
					})
				}
				form={agentForm}
				onFinish={handleCreateAgent}
				editingAgent={null}
			/>
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
