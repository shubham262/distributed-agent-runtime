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
import {
	FiCpu,
	FiGitBranch,
	FiLayers,
	FiPlus,
	FiSave,
	FiTerminal,
} from "react-icons/fi";
import { useParams, useRouter } from "next/navigation";
import CreateAgentModal from "@/components/dashboard/CreateAgentModal";
import WorkflowNodeDrawer from "@/components/workflows/WorkflowNodeDrawer";
import {
	WORKFLOW_EDGE_TYPE,
	workflowEdgeTypes,
} from "@/components/workflows/WorkflowEdges";
import { workflowNodeTypes } from "@/components/workflows/WorkflowNodes";
import { createAgent, editAgent, getAllAgent } from "@/service/agent";
import {
	createWorkflow,
	editWorkflow,
	getWorkflowById,
} from "@/service/workflow";
import { DEFAULT_RULE } from "@/lib/ruleSchema";
import {
	isValidWorkflowConnection,
	validateWorkflowGraph,
} from "@/lib/workflowGraphValidation";
import TextArea from "antd/es/input/TextArea";

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
	workflow: {
		name: "Untitled Workflow",
		description: "",
		userPrompt: "", // Added default schema state
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
	type: WORKFLOW_EDGE_TYPE,
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
			maxIterations: 3,
			breakRule: null,
			breakOnMax: true,
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
			rule: { ...DEFAULT_RULE },
			trueLabel: "true",
			falseLabel: "false",
			onFalse: null,
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

// Maps backend payload fields back into the local form representation
const toWorkflowUpdate = (workflow = {}) => ({
	name: workflow.name || "Untitled Workflow",
	description: workflow.description || "",
	userPrompt: workflow.userPrompt || "", // Added payload data extraction
	isActive: workflow.isActive ?? true,
});

const WorkflowBuilderCanvas = ({ workflowId: workflowIdProp }) => {
	const router = useRouter();
	const params = useParams();
	const workflowId = workflowIdProp ?? params?.id;
	const [workflowForm] = Form.useForm();
	const [agentForm] = Form.useForm();
	const viewportRef = useRef({ x: 0, y: 0, zoom: 1 });
	const viewportFittedRef = useRef(false);
	const ignorePaneClickRef = useRef(false);
	const [info, setInfo] = useState(initialInfo);
	const { fitView } = useReactFlow();

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
			updateInfo((current) => ({
				selectedNode: current.nodes.find((item) => item.id === node.id) || node,
				drawerOpen: true,
			}));
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
			viewportFittedRef.current = false;
			updateInfo({
				nodes: graph.nodes,
				edges: graph.edges,
				workflow: nextWorkflow,
				viewport: graph.viewport,
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

				viewportFittedRef.current = false;
				viewportRef.current = graph.viewport || { x: 0, y: 0, zoom: 1 };
				updateInfo({
					nodes: graph.nodes,
					edges: graph.edges,
					workflow: nextWorkflow,
					viewport: graph.viewport || { x: 0, y: 0, zoom: 1 },
					workflowLoading: false,
				});

				workflowForm.setFieldsValue(nextWorkflow);
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
	}, [updateInfo, workflowForm, workflowId]);

	useEffect(() => {
		viewportFittedRef.current = false;
	}, [workflowId]);

	useEffect(() => {
		if (
			info.workflowLoading ||
			info.nodes.length === 0 ||
			viewportFittedRef.current
		) {
			return;
		}

		let innerFrame;
		const outerFrame = requestAnimationFrame(() => {
			innerFrame = requestAnimationFrame(() => {
				fitView({ duration: 0, padding: 0.25, maxZoom: 1 });
				viewportFittedRef.current = true;
			});
		});

		return () => {
			cancelAnimationFrame(outerFrame);
			if (innerFrame) cancelAnimationFrame(innerFrame);
		};
	}, [fitView, info.nodes.length, info.workflowLoading]);

	const handleConnect = useCallback(
		(connection) => {
			updateInfo((current) => ({
				edges: addEdge(
					{
						...connection,
						type: WORKFLOW_EDGE_TYPE,
						selectable: true,
						deletable: true,
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
		(connection) => isValidWorkflowConnection(connection, info.nodes),
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
					const loopConfig = {
						label: values.label,
						maxIterations: values.maxIterations,
						breakRule: values.enableBreakRule ? values.breakRule : null,
						breakOnMax: true,
					};
					updateInfo((current) => ({
						nodes: current.nodes.map((node) =>
							node.id === selectedNode.id
								? {
										...node,
										data: {
											...node.data,
											config: loopConfig,
											label: values.label,
										},
								  }
								: node
						),
						selectedNode: {
							...selectedNode,
							data: {
								...selectedNode.data,
								config: loopConfig,
								label: values.label,
							},
						},
						drawerOpen: false,
					}));

					message.success("Loop node updated.");
					return;
				}

				if (selectedNode.type === "conditional") {
					const conditionalConfig = {
						label: values.label,
						rule: values.rule,
						trueLabel: values.trueLabel,
						falseLabel: values.falseLabel,
						onFalse: values.onFalseEnd ? "end" : null,
					};
					updateInfo((current) => ({
						nodes: current.nodes.map((node) =>
							node.id === selectedNode.id
								? {
										...node,
										data: {
											...node.data,
											config: conditionalConfig,
											label: values.label,
										},
								  }
								: node
						),
						selectedNode: {
							...selectedNode,
							data: {
								...selectedNode.data,
								config: conditionalConfig,
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

			try {
				validateWorkflowGraph(serializedNodes, serializedEdges);
			} catch (validationError) {
				message.error(validationError.message);
				return;
			}
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
				userPrompt: values.userPrompt || "", // Added payload value mapping
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
				<div className="w-full space-y-3">
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
							className="flex flex-col gap-3 w-full"
						>
							<div className="grid gap-3 md:grid-cols-2">
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
								<Form.Item
									name="description"
									label="Description"
									className="m-0"
								>
									<Input placeholder="Describe what this workflow does" />
								</Form.Item>
							</div>

							{/* Conditionally displays the initial entry user trigger prompt if workflowId is active */}
							{workflowId && (
								<Form.Item
									name="userPrompt"
									label={
										<span className="flex items-center gap-1.5 font-medium text-slate-700">
											<FiTerminal className="text-blue-600" /> Initial User
											Prompt / Run Entry
										</span>
									}
									className="m-0 mt-1 animate-fadeIn"
								>
									<TextArea
										rows={2}
										placeholder="Configure a default runtime prompt or starting context to seed state machine execution for this agent flow..."
										className="rounded-xl border-slate-200 focus:border-blue-500"
									/>
								</Form.Item>
							)}
						</Form>
					</div>
				</div>

				<div className="flex flex-wrap gap-3 self-end md:mb-0">
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
								nodeDragHandle=".workflow-node-drag-handle"
								onNodesChange={handleNodesChange}
								onEdgesChange={handleEdgesChange}
								onConnect={handleConnect}
								isValidConnection={isValidConnection}
								onNodeClick={(event, node) => {
									event.stopPropagation();
									ignorePaneClickRef.current = true;
									window.setTimeout(() => {
										ignorePaneClickRef.current = false;
									}, 0);

									if (isAnchorNode(node)) {
										updateInfo({
											drawerOpen: false,
											selectedNode: null,
										});
										return;
									}

									openNodeDrawer(node);
								}}
								onPaneClick={() => {
									if (ignorePaneClickRef.current) return;

									updateInfo({
										selectedNode: null,
										drawerOpen: false,
									});
								}}
								onMove={(_, viewport) => {
									viewportRef.current = viewport;
								}}
								nodeTypes={workflowNodeTypes}
								edgeTypes={workflowEdgeTypes}
								minZoom={0.2}
								maxZoom={1.5}
								deleteKeyCode={["Backspace", "Delete"]}
								defaultEdgeOptions={{
									type: WORKFLOW_EDGE_TYPE,
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
