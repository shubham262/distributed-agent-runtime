"use client";

import React, { useState } from "react";
import {
	Button,
	Modal,
	Form,
	Input,
	Select,
	Tag,
	Switch,
	InputNumber,
	Popconfirm,
	Tooltip,
	Badge,
	message,
} from "antd";
import {
	FiCpu,
	FiPlus,
	FiEdit2,
	FiTrash2,
	FiPlay,
	FiPause,
	FiSliders,
	FiCheckSquare,
	FiDatabase,
	FiActivity,
} from "react-icons/fi";
import CreateAgentModal from "@/components/dashboard/CreateAgentModal";

const Agents = () => {
	const [form] = Form.useForm();

	// --- UI State Management ---
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingAgent, setEditingAgent] = useState(null);

	// --- Simulated Mock Database for testing ---
	const [agents, setAgents] = useState([
		{
			id: "agent_1",
			name: "Trend Scraper",
			role: "Market Researcher",
			systemPrompt:
				"You scrape global technology trends and compile them into clean markdown summaries.",
			model: "gpt-4o-mini",
			tools: ["web-search", "extract-html"],
			memory: true,
			maxTokens: 2000,
			status: "IDLE", // IDLE or RUNNING
		},
		{
			id: "agent_2",
			name: "Copy Editor",
			role: "Content Optimizer",
			systemPrompt:
				"Review raw text scripts, correct grammatical issues, and optimize for high SEO visibility.",
			model: "gpt-4o-mini",
			tools: ["seo-analyzer"],
			memory: false,
			maxTokens: 1500,
			status: "RUNNING", // Simulating an active running process
		},
	]);

	// Available tools registry to select from
	const availableTools = [
		{ value: "web-search", label: "Web Search (Google API)" },
		{ value: "extract-html", label: "HTML Content Extractor" },
		{ value: "seo-analyzer", label: "SEO Keyphrase Analyzer" },
		{ value: "calculator", label: "Math Processing Tool" },
	];

	// --- Action Handlers ---
	const handleOpenCreateModal = () => {
		setEditingAgent(null);
		form.resetFields();
		setIsModalOpen(true);
	};

	const handleOpenEditModal = (agent) => {
		setEditingAgent(agent);
		form.setFieldsValue(agent);
		setIsModalOpen(true);
	};

	const handleFormSubmit = (values) => {
		if (editingAgent) {
			// Edit Mode
			setAgents(
				agents.map((a) => (a.id === editingAgent.id ? { ...a, ...values } : a))
			);
			message.success(`Agent "${values.name}" updated successfully.`);
		} else {
			// Create Mode
			const newAgent = {
				id: `agent_${Date.now()}`,
				...values,
				status: "IDLE",
			};
			setAgents([...agents, newAgent]);
			message.success(`Agent "${values.name}" deployed to pool.`);
		}
		setIsModalOpen(false);
	};

	const handleDeleteAgent = (id, name) => {
		setAgents(agents.filter((a) => a.id !== id));
		message.success(`Agent "${name}" deleted.`);
	};

	const handleTogglePlayPause = (id) => {
		setAgents(
			agents.map((a) => {
				if (a.id === id) {
					const targetStatus = a.status === "RUNNING" ? "IDLE" : "RUNNING";
					message.info(`Agent "${a.name}" is now ${targetStatus}.`);
					return { ...a, status: targetStatus };
				}
				return a;
			})
		);
	};

	return (
		<div className="flex flex-col flex-1 bg-white p-6 md:p-8 font-sans space-y-6 overflow-y-auto max-w-7xl mx-auto w-full select-none">
			{/* 1. TOP HEADER SECTION */}
			<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-5 shrink-0">
				<div className="flex flex-col">
					<h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-1">
						Agent Factory Pool
					</h1>
					<p className="text-sm text-slate-500">
						Configure personalities, mount utility tools, set operating
						thresholds, and trigger standalone runs.
					</p>
				</div>
				<Button
					type="primary"
					icon={<FiPlus />}
					onClick={handleOpenCreateModal}
					className="bg-blue-600 hover:bg-blue-500 shadow-sm border-none flex items-center justify-center h-9 font-medium text-sm w-full sm:w-auto"
				>
					Assemble New Agent
				</Button>
			</div>

			{/* 2. FLEX CARD CONTAINER (NO GRID) */}
			<div className="w-full flex flex-col md:flex-row flex-wrap gap-6 items-stretch">
				{agents.map((agent) => (
					<div
						key={agent.id}
						className="w-full md:w-[calc(50%-12px)] xl:w-[calc(33.33%-16px)] bg-white border border-slate-100 rounded-xl p-5 shadow-sm hover:border-slate-200 transition-all flex flex-col justify-between"
					>
						{/* Upper Section: Core Info */}
						<div className="flex flex-col space-y-4">
							{/* Card Heading Header */}
							<div className="flex items-start justify-between">
								<div className="flex items-center space-x-3">
									<div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center text-xl shrink-0">
										<FiCpu />
									</div>
									<div className="flex flex-col">
										<h3 className="text-sm font-bold text-slate-900 leading-tight">
											{agent.name}
										</h3>
										<span className="text-xs text-slate-400 font-medium">
											{agent.role}
										</span>
									</div>
								</div>
								<Tag
									color={agent.status === "RUNNING" ? "processing" : "default"}
									className="rounded border-none m-0 font-medium text-[11px]"
								>
									<span className="flex items-center gap-1">
										{agent.status === "RUNNING" && (
											<Badge status="processing" size="small" />
										)}
										{agent.status}
									</span>
								</Tag>
							</div>

							{/* System Prompt Section */}
							<div className="flex flex-col bg-slate-50/50 p-3 rounded-lg border border-slate-100/50">
								<span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
									Behavior Guidelines
								</span>
								<p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
									{agent.systemPrompt}
								</p>
							</div>

							{/* Attached Tools Section */}
							<div className="flex flex-col space-y-1.5">
								<span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
									Mounted Tools
								</span>
								<div className="flex flex-wrap gap-1.5">
									{agent.tools && agent.tools.length > 0 ? (
										agent.tools.map((t) => (
											<Tag
												key={t}
												className="bg-slate-100 text-slate-600 border-none font-medium text-[10px] px-2 py-0.5 rounded"
											>
												{t}
											</Tag>
										))
									) : (
										<span className="text-xs text-slate-400 italic">
											No tools assigned
										</span>
									)}
								</div>
							</div>

							{/* Limits & Parameters Meta Fields */}
							<div className="flex items-center justify-between border-t border-b border-slate-100/80 py-2.5 text-xs">
								<div className="flex items-center gap-1.5 text-slate-500">
									<FiCheckSquare className="text-slate-400" />
									<span>
										Model:{" "}
										<strong className="text-slate-700">{agent.model}</strong>
									</span>
								</div>
								<div className="flex items-center gap-1.5 text-slate-500">
									<FiDatabase className="text-slate-400" />
									<span>
										Memory:{" "}
										<strong className="text-slate-700">
											{agent.memory ? "On" : "Off"}
										</strong>
									</span>
								</div>
								<div className="flex items-center gap-1.5 text-slate-500">
									<FiActivity className="text-slate-400" />
									<span>
										Limit:{" "}
										<strong className="text-slate-700">
											{agent.maxTokens}k
										</strong>
									</span>
								</div>
							</div>
						</div>

						{/* Lower Section: Action Buttons */}
						<div className="flex items-center justify-between mt-5 pt-1 border-t border-slate-50">
							{/* Execution Controls */}
							<div className="flex items-center gap-2">
								<Button
									type={agent.status === "RUNNING" ? "default" : "primary"}
									size="small"
									className={`flex items-center gap-1 text-xs font-semibold px-3 h-8 rounded border-none ${
										agent.status === "RUNNING"
											? "bg-amber-50 hover:bg-amber-100 text-amber-600"
											: "bg-blue-600 hover:bg-blue-500 text-white"
									}`}
									classNames={{
										content: "flex items-center gap-2",
									}}
									onClick={() => handleTogglePlayPause(agent.id)}
								>
									{agent.status === "RUNNING" ? (
										<>
											<FiPause size={12} /> Pause
										</>
									) : (
										<>
											<FiPlay size={12} /> Play Turn
										</>
									)}
								</Button>
							</div>

							{/* Structural Settings Controls */}
							<div className="flex items-center gap-1">
								<Tooltip title="Configure Parameters">
									<Button
										type="text"
										icon={<FiEdit2 size={14} />}
										onClick={() => handleOpenEditModal(agent)}
										className="text-slate-500 hover:bg-slate-50 hover:text-blue-600 h-8 w-8 flex items-center justify-center p-0"
									/>
								</Tooltip>

								<Popconfirm
									title="Decommission Agent"
									description={`Are you sure you want to remove "${agent.name}"?`}
									onConfirm={() => handleDeleteAgent(agent.id, agent.name)}
									okText="Yes, delete"
									cancelText="No"
									okButtonProps={{ danger: true }}
								>
									<Button
										type="text"
										danger
										icon={<FiTrash2 size={14} />}
										className="hover:bg-red-50 h-8 w-8 flex items-center justify-center p-0"
									/>
								</Popconfirm>
							</div>
						</div>
					</div>
				))}
			</div>

			<CreateAgentModal
				isModalOpen={isModalOpen}
				setIsModalOpen={setIsModalOpen}
				form={form}
				onFinish={handleFormSubmit}
				availableTools={availableTools}
				editingAgent={editingAgent}
			/>
		</div>
	);
};

export default Agents;
