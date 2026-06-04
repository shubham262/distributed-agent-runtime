"use client";

import React, { useState } from "react";
import { Statistic, Progress, Tag, Badge, Table, Button, Tooltip } from "antd";
import {
	FiCpu,
	FiGitBranch,
	FiDatabase,
	FiDollarSign,
	FiActivity,
	FiArrowRight,
	FiRefreshCw,
	FiClock,
} from "react-icons/fi";

const Overview = () => {
	const [isRefreshing, setIsRefreshing] = useState(false); // 🚀 Simulated Mock Data matching your exact Mongoose Schema & Infrastructure Metrics
	const statsSummary = {
		activeWorkflows: 12,
		totalAgents: 8,
		tokenMetrics: {
			prompt: 342000,
			completion: 158000,
			total: 500000,
			limit: 1000000, // Free-tier/workspace allocation ceiling
		},
		estimatedCostUSD: 1.48,
	};

	// 🚀 Simulated Recent Runs matching the WorkflowRun schema structure
	const recentRunsData = [
		{
			key: "run_01",
			runId: "65f1a2b3c4d5e6f7a8b90121",
			workflowName: "Autonomous SEO & Brand Orchestration",
			status: "RUNNING",
			executionTime: "14.2s",
			cost: "$0.042",
			timestamp: "Just now",
		},
		{
			key: "run_02",
			runId: "65f1a2b3c4d5e6f7a8b90122",
			workflowName: "LinkedIn Agentic Post Pipeline",
			status: "PAUSED",
			executionTime: "45.1s",
			cost: "$0.110",
			timestamp: "5 mins ago",
		},
		{
			key: "run_03",
			runId: "65f1a2b3c4d5e6f7a8b90123",
			workflowName: "System Design HLD Master Compiler",
			status: "COMPLETED",
			executionTime: "128.5s",
			cost: "$0.340",
			timestamp: "24 mins ago",
		},
		{
			key: "run_04",
			runId: "65f1a2b3c4d5e6f7a8b90124",
			workflowName: "AuraAuth Deepfake Defense Verifier",
			status: "FAILED",
			executionTime: "3.1s",
			cost: "$0.002",
			timestamp: "1 hour ago",
		},
	];

	// Ant Design Table Column Blueprint Mapping
	const columns = [
		{
			title: "RUN ID / WORKFLOW",
			dataIndex: "workflowName",
			key: "workflowName",
			render: (text, record) => (
				<div className="flex flex-col font-sans">
					<span className="font-semibold text-slate-800 text-sm leading-tight mb-0.5">
						{text}
					</span>
					<span className="text-[11px] text-slate-400 font-mono select-all">
						id: {record.runId}
					</span>
				</div>
			),
		},
		{
			title: "RUNTIME STATUS",
			dataIndex: "status",
			key: "status",
			render: (status) => {
				let color = "blue";
				let isProcessing = false;

				if (status === "RUNNING") {
					color = "processing";
					isProcessing = true;
				} else if (status === "COMPLETED") {
					color = "success";
				} else if (status === "PAUSED") {
					color = "warning";
				} else if (status === "FAILED") {
					color = "error";
				}

				return (
					<Tag
						color={color}
						className="font-medium text-xs rounded px-2.5 py-0.5 border-none font-sans"
					>
						<span className="flex items-center gap-1.5">
							{isProcessing && <Badge status="processing" size="small" />}
							{status}
						</span>
					</Tag>
				);
			},
		},
		{
			title: "EXECUTION TIME",
			dataIndex: "executionTime",
			key: "executionTime",
			render: (text) => (
				<div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium font-sans">
					<FiClock className="text-slate-400" /> {text}
				</div>
			),
		},
		{
			title: "COMPUTE COST",
			dataIndex: "cost",
			key: "cost",
			render: (text) => (
				<span className="text-xs font-mono font-semibold text-slate-700">
					{text}
				</span>
			),
		},
		{
			title: "TRIGGERED",
			dataIndex: "timestamp",
			key: "timestamp",
			render: (text) => (
				<span className="text-xs text-slate-400 font-sans">{text}</span>
			),
		},
		{
			title: "DIAGNOSTICS",
			key: "actions",
			render: (_, record) => (
				<Button
					type="text"
					size="small"
					className="text-blue-600 hover:text-blue-500 hover:bg-blue-50 font-medium font-sans text-xs flex items-center gap-1"
					onClick={() =>
						(window.location.href = `/dashboard/runs/${record.runId}`)
					}
				>
					View Logs <FiArrowRight size={12} />
				</Button>
			),
		},
	];

	const handleRefreshTelemetry = () => {
		setIsRefreshing(true);
		setTimeout(() => setIsRefreshing(false), 800);
	};

	return (
		<div className="flex flex-col flex-1 bg-white p-6 md:p-8 font-sans space-y-6 overflow-y-auto max-w-7xl mx-auto w-full select-none">
			{/* 1. TOP TITLE CONTROL BANNER - Pure Flex Layout */}
			<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-5 shrink-0">
				<div className="flex flex-col">
					<h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-1">
						Infrastructure Overview
					</h1>
					<p className="text-sm text-slate-500">
						Monitor multi-agent execution graphs, token distributions, and
						system cluster queues live.
					</p>
				</div>
				<div className="flex items-center gap-3 w-full sm:w-auto">
					<Button
						icon={
							<FiRefreshCw className={isRefreshing ? "animate-spin" : ""} />
						}
						onClick={handleRefreshTelemetry}
						className="text-slate-600 border-slate-200 hover:border-blue-600 hover:text-blue-600 flex items-center justify-center h-9 font-medium text-sm"
					>
						Sync Dashboard
					</Button>
					<Button
						type="primary"
						className="bg-blue-600 hover:bg-blue-500 shadow-sm border-none flex items-center justify-center h-9 font-medium text-sm"
						onClick={() => (window.location.href = "/dashboard/workflows")}
					>
						Launch Canvas Workspace
					</Button>
				</div>
			</div>

			{/* 2. STATS PANELS CONTAINER - Flex Wrapping row mimicking clean cards */}
			<div className="w-full flex flex-col md:flex-row flex-wrap gap-5 items-stretch">
				{/* Card 1: Active Topology Blueprints */}
				<div className="flex-1 min-w-[240px] bg-white border border-slate-100 rounded-xl p-5 shadow-sm hover:border-slate-200 transition-all flex flex-col justify-between">
					<div className="flex items-start justify-between mb-4">
						<div className="flex flex-col">
							<span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
								Active Blueprints
							</span>
							<Statistic
								value={statsSummary.activeWorkflows}
								styles={{
									content: {
										fontSize: "1.75rem",
										fontWeight: "700",
										color: "#0f172a",
									},
								}}
							/>
						</div>
						<div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center text-xl">
							<FiGitBranch />
						</div>
					</div>
					<div className="text-xs text-slate-400 font-medium">
						Compiled layout paths currently active in MongoDB
					</div>
				</div>

				{/* Card 2: Core Pool Capacity */}
				<div className="flex-1 min-w-[240px] bg-white border border-slate-100 rounded-xl p-5 shadow-sm hover:border-slate-200 transition-all flex flex-col justify-between">
					<div className="flex items-start justify-between mb-4">
						<div className="flex flex-col">
							<span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
								Agent Micro Core
							</span>
							<Statistic
								value={statsSummary.totalAgents}
								styles={{
									content: {
										fontSize: "1.75rem",
										fontWeight: "700",
										color: "#0f172a",
									},
								}}
							/>
						</div>
						<div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center text-xl">
							<FiCpu />
						</div>
					</div>
					<div className="text-xs text-slate-400 font-medium">
						Distinct sub-agent nodes allocated across canvas clusters
					</div>
				</div>

				{/* Card 3: Volumetric Token Usage Wrapper with integrated AntD Progress component */}
				<div className="flex-1 min-w-[280px] bg-white border border-slate-100 rounded-xl p-5 shadow-sm hover:border-slate-200 transition-all flex flex-col justify-between">
					<div className="flex items-start justify-between mb-2">
						<div className="flex flex-col w-full">
							<span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
								Aggregated Token Volume
							</span>
							<div className="flex items-baseline gap-2 mb-2">
								<span className="text-2xl font-bold text-slate-900">
									500.0K
								</span>
								<span className="text-xs text-slate-400 font-medium">
									/ 1.0M limit
								</span>
							</div>
						</div>
						<div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center text-xl">
							<FiDatabase />
						</div>
					</div>
					<div className="w-full flex flex-col gap-1.5">
						<Progress
							percent={
								(statsSummary.tokenMetrics.total /
									statsSummary.tokenMetrics.limit) *
								100
							}
							showInfo={false}
							strokeColor="#2563eb"
							railColor="#f1f5f9"
							size={6}
						/>
						<div className="flex justify-between text-[11px] text-slate-400 font-medium">
							<span>Input: 342K ({Math.round((342 / 500) * 100)}%)</span>
							<span>Output: 158K</span>
						</div>
					</div>
				</div>

				{/* Card 4: Estimated Azure Cost Accounting */}
				<div className="flex-1 min-w-[240px] bg-white border border-slate-100 rounded-xl p-5 shadow-sm hover:border-slate-200 transition-all flex flex-col justify-between">
					<div className="flex items-start justify-between mb-4">
						<div className="flex flex-col">
							<span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
								Operational Compute Cost
							</span>
							<div className="flex items-center text-2xl font-bold text-slate-900">
								<FiDollarSign size={20} className="text-slate-400 mr-0.5" />
								<Statistic
									value={statsSummary.estimatedCostUSD}
									precision={2}
									styles={{
										content: {
											fontSize: "1.75rem",
											fontWeight: "700",
											color: "#0f172a",
										},
									}}
								/>
							</div>
						</div>
						<div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center text-xl">
							<FiDollarSign />
						</div>
					</div>
					<div className="text-xs text-slate-400 font-medium">
						Calculated based on South India Azure region API thresholds
					</div>
				</div>
			</div>

			{/* 3. QUEUE TELEMETRY RADAR BANNER - Real-time structural indicators */}
			<div className="w-full bg-slate-50 border border-slate-100/70 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-inner">
				<div className="flex items-center gap-3">
					<div className="w-9 h-9 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-blue-600 text-lg shadow-sm">
						<FiActivity className="animate-pulse" />
					</div>
					<div className="flex flex-col">
						<p className="text-sm font-semibold text-slate-800 leading-none mb-1">
							BullMQ Background Cluster Status
						</p>
						<p className="text-xs text-slate-400 font-medium">
							Connected to Redis queue instance. Thread concurrency capacity: 2
						</p>
					</div>
				</div>
				<div className="flex items-center gap-2 bg-white border border-slate-200/60 px-3 py-1.5 rounded-lg shadow-sm">
					<Badge status="processing" size="small" />
					<span className="text-xs font-semibold text-slate-600 font-sans">
						Distributed Daemon Worker Operational
					</span>
				</div>
			</div>

			{/* 4. RECENT EXECUTIONS DATABASE VIEWPORT */}
			<div className="w-full flex flex-col border border-slate-100 rounded-xl bg-white p-5 shadow-sm">
				<div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
					<div className="flex flex-col">
						<h2 className="text-base font-bold text-slate-900">
							Recent Execution Threads
						</h2>
						<p className="text-xs text-slate-400">
							Live monitoring state logs of the last workflows committed to
							background workers.
						</p>
					</div>
					<Button
						type="link"
						className="text-blue-600 p-0 font-semibold text-sm hover:text-blue-500 flex items-center gap-1"
						onClick={() => (window.location.href = "/dashboard/runs")}
					>
						View Full History <FiArrowRight size={14} />
					</Button>
				</div>

				{/* Integrated AntD Native Table mapping directly over our custom Tailwind-framed flexbox wrapper */}
				<div className="w-full overflow-x-auto">
					<Table
						columns={columns}
						dataSource={recentRunsData}
						pagination={false}
						className="font-sans border-none [&_.ant-table-thead_th]:bg-slate-50/70 [&_.ant-table-thead_th]:text-slate-400 [&_.ant-table-thead_th]:font-semibold [&_.ant-table-thead_th]:text-[11px] [&_.ant-table-thead_th]:uppercase [&_.ant-table-thead_th]:tracking-wider [&_.ant-table-thead_th]:border-b [&_.ant-table-thead_th]:border-slate-100 [&_.ant-table-row]:hover:bg-slate-50/40 [&_.ant-table-cell]:border-b [&_.ant-table-cell]:border-slate-100/60 [&_.ant-table-cell]:py-4"
					/>
				</div>
			</div>
		</div>
	);
};

export default Overview;
