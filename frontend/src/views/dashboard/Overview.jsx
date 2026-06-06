"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Statistic, Progress, Tag, Badge, Table, Button, message } from "antd";
import {
	FiCpu,
	FiGitBranch,
	FiDatabase,
	FiDollarSign,
	FiActivity,
	FiArrowRight,
	FiRefreshCw,
	FiClock,
	FiMessageSquare,
	FiCheckCircle,
} from "react-icons/fi";
import { useRouter } from "next/navigation";
import { getAllAgent } from "@/service/agent";
import { getAllWorkflows, getAllRuns } from "@/service/workflow";
import {
	aggregateRunMetrics,
	formatEstimatedCost,
	formatExecutionTime,
	formatRelativeTime,
	formatTokens,
	getWorkflowName,
	statusColor,
} from "@/lib/runUtils";
import { useSelector } from "react-redux";

const Overview = () => {
	const router = useRouter();
	const authInfo = useSelector((state) => state.auth);
	const { userInfo } = authInfo || {};
	const [loading, setLoading] = useState(true);
	const [workflows, setWorkflows] = useState([]);
	const [agents, setAgents] = useState([]);
	const [runs, setRuns] = useState([]);

	// console.log("User Info:", userInfo);

	const BOT_USERNAME = "AgentOS_Official_bot";
	const isTelegramConnected = !!userInfo?.telegram?.chatId;
	const telegramDeepLink = `https://t.me/${BOT_USERNAME}?start=${userInfo?.id}`;

	const loadDashboard = useCallback(async () => {
		try {
			setLoading(true);
			const [workflowData, agentData, runData] = await Promise.all([
				getAllWorkflows(),
				getAllAgent(),
				getAllRuns(),
			]);
			setWorkflows(workflowData || []);
			setAgents(agentData || []);
			setRuns(runData || []);
		} catch (error) {
			console.error("Overview load error:", error);
			message.error("Unable to load dashboard data.");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		loadDashboard();
	}, [loadDashboard]);

	useEffect(() => {
		const hasActiveRun = runs.some((run) =>
			["QUEUED", "RUNNING"].includes(run.status)
		);
		if (!hasActiveRun) return undefined;

		const interval = setInterval(loadDashboard, 5000);
		return () => clearInterval(interval);
	}, [loadDashboard, runs]);

	const runMetrics = useMemo(() => aggregateRunMetrics(runs), [runs]);
	const totalTokens = runMetrics.promptTokens + runMetrics.completionTokens;
	const activeWorkflows = workflows.filter(
		(workflow) => workflow.isActive !== false
	).length;
	const recentRuns = runs.slice(0, 5);

	const estimatedCost =
		runMetrics.totalCostUSD > 0
			? runMetrics.totalCostUSD
			: runMetrics.promptTokens * 0.00000015 +
			  runMetrics.completionTokens * 0.0000006;

	const columns = [
		{
			title: "RUN ID / WORKFLOW",
			key: "workflowName",
			render: (_, record) => (
				<div className="flex flex-col font-sans">
					<span className="mb-0.5 text-sm font-semibold leading-tight text-slate-800">
						{getWorkflowName(record)}
					</span>
					<span className="select-all font-mono text-[11px] text-slate-400">
						id: {record._id}
					</span>
				</div>
			),
		},
		{
			title: "RUNTIME STATUS",
			dataIndex: "status",
			key: "status",
			render: (status) => (
				<Tag
					color={statusColor(status)}
					className="rounded border-none px-2.5 py-0.5 font-sans text-xs font-medium"
				>
					<span className="flex items-center gap-1.5">
						{status === "RUNNING" ? (
							<Badge status="processing" size="small" />
						) : null}
						{status}
					</span>
				</Tag>
			),
		},
		{
			title: "EXECUTION TIME",
			key: "executionTime",
			render: (_, record) => (
				<div className="flex items-center gap-1.5 font-sans text-xs font-medium text-slate-500">
					<FiClock className="text-slate-400" />
					{formatExecutionTime(record.metrics?.executionTimeMs)}
				</div>
			),
		},
		{
			title: "COMPUTE COST",
			key: "cost",
			render: (_, record) => (
				<span className="font-mono text-xs font-semibold text-slate-700">
					{formatEstimatedCost(record.metrics)}
				</span>
			),
		},
		{
			title: "TRIGGERED",
			dataIndex: "createdAt",
			key: "createdAt",
			render: (value) => (
				<span className="font-sans text-xs text-slate-400">
					{formatRelativeTime(value)}
				</span>
			),
		},
		{
			title: "DIAGNOSTICS",
			key: "actions",
			render: (_, record) => (
				<Button
					type="text"
					size="small"
					className="flex items-center gap-1 font-sans text-xs font-medium text-blue-600 hover:bg-blue-50 hover:text-blue-500"
					onClick={() => router.push(`/dashboard/runs?runId=${record._id}`)}
				>
					View Logs <FiArrowRight size={12} />
				</Button>
			),
		},
	];

	return (
		<div className="mx-auto flex w-full max-w-7xl select-none flex-col space-y-6 overflow-y-auto bg-white p-6 font-sans md:p-8">
			<div className="flex shrink-0 flex-col items-start justify-between gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center">
				<div className="flex flex-col">
					<h1 className="mb-1 text-2xl font-bold tracking-tight text-slate-900">
						Infrastructure Overview
					</h1>
					<p className="text-sm text-slate-500">
						Monitor multi-agent execution graphs, token usage, and background
						worker activity.
					</p>
				</div>
				<div className="flex w-full items-center gap-3 sm:w-auto">
					<Button
						icon={<FiRefreshCw className={loading ? "animate-spin" : ""} />}
						onClick={loadDashboard}
						loading={loading}
						className="flex h-9 items-center justify-center border-slate-200 text-sm font-medium text-slate-600 hover:border-blue-600 hover:text-blue-600"
					>
						Sync Dashboard
					</Button>
					<Button
						type="primary"
						className="flex h-9 items-center justify-center border-none bg-blue-600 text-sm font-medium shadow-sm hover:bg-blue-500"
						onClick={() => router.push("/dashboard/workflows")}
					>
						Launch Canvas Workspace
					</Button>
				</div>
			</div>

			<div className="flex w-full flex-col flex-wrap items-stretch gap-5 md:flex-row">
				<div className="flex min-w-[240px] flex-1 flex-col justify-between rounded-xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:border-slate-200">
					<div className="mb-4 flex items-start justify-between">
						<div className="flex flex-col">
							<span className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
								Active Blueprints
							</span>
							<Statistic
								value={activeWorkflows}
								styles={{
									content: {
										fontSize: "1.75rem",
										fontWeight: "700",
										color: "#0f172a",
									},
								}}
							/>
						</div>
						<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-xl text-blue-600">
							<FiGitBranch />
						</div>
					</div>
					<div className="text-xs font-medium text-slate-400">
						{workflows.length} total workflows in your workspace
					</div>
				</div>

				<div className="flex min-w-[240px] flex-1 flex-col justify-between rounded-xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:border-slate-200">
					<div className="mb-4 flex items-start justify-between">
						<div className="flex flex-col">
							<span className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
								Agent Micro Core
							</span>
							<Statistic
								value={agents.length}
								styles={{
									content: {
										fontSize: "1.75rem",
										fontWeight: "700",
										color: "#0f172a",
									},
								}}
							/>
						</div>
						<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-xl text-blue-600">
							<FiCpu />
						</div>
					</div>
					<div className="text-xs font-medium text-slate-400">
						Distinct agents available for workflow graphs
					</div>
				</div>

				<div className="flex min-w-[280px] flex-1 flex-col justify-between rounded-xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:border-slate-200">
					<div className="mb-2 flex items-start justify-between">
						<div className="flex w-full flex-col">
							<span className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
								Aggregated Token Volume
							</span>
							<div className="mb-2 flex items-baseline gap-2">
								<span className="text-2xl font-bold text-slate-900">
									{formatTokens(totalTokens)}
								</span>
							</div>
						</div>
						<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-xl text-blue-600">
							<FiDatabase />
						</div>
					</div>
					<div className="flex w-full flex-col gap-1.5">
						<div className="flex justify-between text-[11px] font-medium text-slate-400">
							<span>
								Input: {formatTokens(runMetrics.promptTokens)}
								{totalTokens > 0
									? ` (${Math.round(
											(runMetrics.promptTokens / totalTokens) * 100
									  )}%)`
									: ""}
							</span>
							<span>Output: {formatTokens(runMetrics.completionTokens)}</span>
						</div>
					</div>
				</div>

				<div className="flex min-w-[240px] flex-1 flex-col justify-between rounded-xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:border-slate-200">
					<div className="mb-4 flex items-start justify-between">
						<div className="flex flex-col">
							<span className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
								Operational Compute Cost
							</span>
							<div className="flex items-center text-2xl font-bold text-slate-900">
								<FiDollarSign size={20} className="mr-0.5 text-slate-400" />
								<Statistic
									value={estimatedCost}
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
						<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-xl text-emerald-600">
							<FiDollarSign />
						</div>
					</div>
					<div className="text-xs font-medium text-slate-400">
						Estimated from token usage across {runs.length} runs
					</div>
				</div>
			</div>

			<div className="flex w-full flex-col items-start justify-between gap-4 rounded-xl border border-slate-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
				<div className="flex items-center gap-3">
					<div className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-lg text-blue-600 shadow-sm">
						<FiMessageSquare />
					</div>
					<div className="flex flex-col">
						<p className="mb-0.5 text-sm font-semibold text-slate-800">
							AgentOS Telegram Channel Link
						</p>
						<p className="text-xs font-medium text-slate-400 max-w-xl">
							{isTelegramConnected
								? `Linked account pipeline active. Reports will broadcast securely via @${
										userInfo?.telegram?.username || "VerifiedNode"
								  }.`
								: "Link your phone gateway instance to dispatch real-time multi-agent execution reports and tool metrics directly into chat notifications."}
						</p>
					</div>
				</div>

				<div>
					{!isTelegramConnected ? (
						<Button
							type="primary"
							icon={<FiMessageSquare size={13} />}
							href={telegramDeepLink}
							target="_blank"
							className="flex h-8 items-center justify-center border-none bg-blue-600 text-xs font-semibold shadow-sm hover:bg-blue-500 w-full sm:w-auto px-4"
						>
							Connect Telegram
						</Button>
					) : (
						<div className="flex items-center gap-1.5 rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-1.5 text-xs font-bold text-emerald-800">
							<FiCheckCircle className="text-emerald-600" /> Connected
						</div>
					)}
				</div>
			</div>

			<div className="flex w-full flex-col items-start justify-between gap-4 rounded-xl border border-slate-100/70 bg-slate-50 p-4 shadow-inner sm:flex-row sm:items-center">
				<div className="flex items-center gap-3">
					<div className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-lg text-blue-600 shadow-sm">
						<FiActivity
							className={runMetrics.activeRuns > 0 ? "animate-pulse" : ""}
						/>
					</div>
					<div className="flex flex-col">
						<p className="mb-1 text-sm font-semibold leading-none text-slate-800">
							Background Worker Status
						</p>
						<p className="text-xs font-medium text-slate-400">
							{runMetrics.activeRuns > 0
								? `${runMetrics.activeRuns} run${
										runMetrics.activeRuns === 1 ? "" : "s"
								  } queued or executing`
								: "No active runs — worker idle"}
						</p>
					</div>
				</div>
				<div className="flex items-center gap-2 rounded-lg border border-slate-200/60 bg-white px-3 py-1.5 shadow-sm">
					<Badge
						status={runMetrics.activeRuns > 0 ? "processing" : "success"}
						size="small"
					/>
					<span className="font-sans text-xs font-semibold text-slate-600">
						{runMetrics.activeRuns > 0
							? "Worker processing jobs"
							: "Worker operational"}
					</span>
				</div>
			</div>

			<div className="flex w-full flex-col rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
				<div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-4">
					<div className="flex flex-col">
						<h2 className="text-base font-bold text-slate-900">
							Recent Execution Threads
						</h2>
						<p className="text-xs text-slate-400">
							Latest workflow runs from your workspace.
						</p>
					</div>
					<Button
						type="link"
						className="flex items-center gap-1 p-0 text-sm font-semibold text-blue-600 hover:text-blue-500"
						onClick={() => router.push("/dashboard/runs")}
					>
						View Full History <FiArrowRight size={14} />
					</Button>
				</div>

				<div className="w-full overflow-x-auto">
					<Table
						columns={columns}
						dataSource={recentRuns}
						rowKey="_id"
						loading={loading}
						pagination={false}
						locale={{
							emptyText: "No runs yet. Publish a workflow to get started.",
						}}
						className="border-none font-sans [&_.ant-table-cell]:border-b [&_.ant-table-cell]:border-slate-100/60 [&_.ant-table-cell]:py-4 [&_.ant-table-row]:hover:bg-slate-50/40 [&_.ant-table-thead_th]:border-b [&_.ant-table-thead_th]:border-slate-100 [&_.ant-table-thead_th]:bg-slate-50/70 [&_.ant-table-thead_th]:text-[11px] [&_.ant-table-thead_th]:font-semibold [&_.ant-table-thead_th]:uppercase [&_.ant-table-thead_th]:tracking-wider [&_.ant-table-thead_th]:text-slate-400"
					/>
				</div>
			</div>
		</div>
	);
};

export default Overview;
