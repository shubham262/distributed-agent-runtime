"use client";

import React, { useState } from "react";
import { Button,  Tag, Badge, message } from "antd";
import {
	FiGitBranch,
	FiPlus,
	FiArrowRight,
	FiPlay,
	FiClock,
	FiLayers,
} from "react-icons/fi";
import { useRouter } from "next/navigation";

const WorkflowsDashboard = () => {
	const router = useRouter();
	
	

	const [workflows, setWorkflows] = useState([
		{
			_id: "wf_01",
			name: "Autonomous SEO & Brand Orchestration",
			description:
				"Scrapes ranking shifts, analyzes competitor keyword density clusters, and automatically generates high-authority target landing page scripts.",
			agentCount: 3,
			lastRunStatus: "COMPLETED",
			updatedAt: "2 hours ago",
		},
		{
			_id: "wf_02",
			name: "LinkedIn Multi-Agent Post Pipeline",
			description:
				"Monitors engineering trends across GitHub, writes summarized technical breakdowns, and refactors copy to match pre-configured brand voice rules.",
			agentCount: 2,
			lastRunStatus: "RUNNING",
			updatedAt: "Just now",
		},
		{
			_id: "wf_03",
			name: "AuraAuth Deepfake Verification Flow",
			description:
				"Ingests raw audio binaries, executes verification checks against spectral voice models, and dispatches automated containment alerts if spoofing is detected.",
			agentCount: 4,
			lastRunStatus: "FAILED",
			updatedAt: "Yesterday",
		},
	]);

	const handleOpenCreateModal = () => {
		
	};

	const handleFormSubmit = (values) => {};

	const handleTriggerQuickRun = (e, name) => {
		e.stopPropagation(); // Stop card click navigation event from firing
		message.loading(`Compiling layout graph variables for "${name}"...`);
		setTimeout(() => {
			message.success(
				`Job successfully queued inside BullMQ background thread cluster.`
			);
		}, 1000);
	};

	const handleNavigateToCanvas = (id) => {
		router.push(`/dashboard/workflows/${id}`);
	};

	return (
		<div className="flex flex-col flex-1 bg-white p-6 md:p-8 font-sans space-y-6 overflow-y-auto max-w-7xl mx-auto w-full select-none">
			{/* 1. TOP CONTROL & HEADER BANNER */}
			<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-5 shrink-0">
				<div className="flex flex-col">
					<h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-1">
						Workflow Blueprints
					</h1>
					<p className="text-sm text-slate-500">
						Design, compile, and execute multi-agent state machines via
						background queue networks.
					</p>
				</div>
				<Button
					type="primary"
					icon={<FiPlus />}
					onClick={handleOpenCreateModal}
					className="bg-blue-600 hover:bg-blue-500 shadow-sm border-none flex items-center justify-center h-9 font-medium text-sm w-full sm:w-auto"
				>
					Create New Pipeline
				</Button>
			</div>

			{/* 2. FLOW GALLERY CARDS BLOCK (Pure Flex wrapping layout, NO grids) */}
			<div className="w-full flex flex-col md:flex-row flex-wrap gap-6 items-stretch">
				{workflows.map((wf) => (
					<div
						key={wf._id}
						onClick={() => handleNavigateToCanvas(wf._id)}
						className="w-full md:w-[calc(50%-12px)] xl:w-[calc(33.33%-16px)] bg-white border border-slate-100 hover:border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
					>
						{/* Upper Details Block */}
						<div className="flex flex-col space-y-3.5">
							{/* Card Header Information */}
							<div className="flex items-start justify-between gap-3">
								<div className="flex items-center space-x-2.5 min-w-0">
									<div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center text-lg shrink-0">
										<FiGitBranch />
									</div>
									<h3 className="text-sm font-bold text-slate-900 tracking-tight leading-tight truncate group-hover:text-blue-600 transition-colors">
										{wf.name}
									</h3>
								</div>

								{/* Network Run Status Tag */}
								<Tag
									color={
										wf.lastRunStatus === "RUNNING"
											? "processing"
											: wf.lastRunStatus === "COMPLETED"
											? "success"
											: "error"
									}
									className="rounded border-none m-0 font-medium text-[10px] uppercase tracking-wider px-2 shrink-0"
								>
									<span className="flex items-center gap-1">
										{wf.lastRunStatus === "RUNNING" && (
											<Badge status="processing" size="small" />
										)}
										{wf.lastRunStatus}
									</span>
								</Tag>
							</div>

							{/* Compiled Topology Core Summary Text */}
							<p className="text-xs text-slate-500 leading-relaxed line-clamp-3">
								{wf.description}
							</p>

							{/* Structural Network Indicators */}
							<div className="flex items-center space-x-4 pt-1 text-xs text-slate-400 font-medium">
								<div className="flex items-center gap-1.5">
									<FiLayers size={13} className="text-slate-300" />
									<span>{wf.agentCount} Node Agents</span>
								</div>
								<div className="flex items-center gap-1.5">
									<FiClock size={13} className="text-slate-300" />
									<span>{wf.updatedAt}</span>
								</div>
							</div>
						</div>

						{/* Lower Action Operations Block */}
						<div className="flex items-center justify-between mt-6 pt-3 border-t border-slate-50 shrink-0">
							<Button
								size="small"
								icon={<FiPlay size={11} />}
								onClick={(e) => handleTriggerQuickRun(e, wf.name)}
								className="bg-slate-50 hover:bg-blue-50 border-none text-slate-600 hover:text-blue-600 text-xs font-semibold h-8 px-3 rounded flex items-center gap-1 transition-all"
							>
								Quick Run
							</Button>

							<span className="text-xs font-semibold text-blue-600 group-hover:translate-x-1 transition-transform flex items-center gap-1">
								Open Studio <FiArrowRight size={13} />
							</span>
						</div>
					</div>
				))}
			</div>
		</div>
	);
};

export default WorkflowsDashboard;
