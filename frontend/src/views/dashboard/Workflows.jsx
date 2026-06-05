"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import React, { useCallback, useEffect, useState } from "react";
import { Button, Empty, Skeleton, Tag, message } from "antd";
import {
	FiArrowRight,
	FiClock,
	FiGitBranch,
	FiLayers,
	FiPlay,
	FiPlus,
} from "react-icons/fi";
import { useRouter } from "next/navigation";
import { getAllWorkflows, playWorkflow } from "@/service/workflow";
import { formatTimestamp } from "@/lib/runUtils";

const formatDate = (value) => formatTimestamp(value, "Recently");

const WorkflowsDashboard = () => {
	const router = useRouter();
	const [workflows, setWorkflows] = useState([]);
	const [loading, setLoading] = useState(true);
	const [runningId, setRunningId] = useState(null);

	const loadWorkflows = useCallback(async () => {
		try {
			setLoading(true);
			const data = await getAllWorkflows();
			setWorkflows(data || []);
		} catch (error) {
			console.error("Workflow load error:", error);
			message.error("Unable to load workflows.");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		loadWorkflows();
	}, [loadWorkflows]);

	const handleQuickRun = async (e, workflow) => {
		e.stopPropagation();
		try {
			setRunningId(workflow._id);
			await playWorkflow(workflow._id, { metadata: { source: "dashboard" } });
			message.success(`Workflow "${workflow.name}" queued successfully.`);
		} catch (error) {
			console.error("Workflow run error:", error);
			message.error("Unable to queue the workflow.");
		} finally {
			setRunningId(null);
		}
	};

	const handleOpenWorkflow = (id) => {
		router.push(`/dashboard/workflows/${id}`);
	};

	const totalAgents = workflows.reduce(
		(sum, workflow) => sum + (workflow.agents?.length || 0),
		0
	);

	return (
		<div className="flex flex-col flex-1 space-y-6 overflow-y-auto rounded-3xl bg-white p-6 shadow-sm md:p-8">
			<div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
				<div className="space-y-1">
					<h1 className="text-2xl font-bold tracking-tight text-slate-900">
						Workflow Blueprints
					</h1>
					<p className="text-sm text-slate-500">
						Build, inspect, and execute real workflow graphs backed by MongoDB
						and BullMQ.
					</p>
				</div>

				<div className="flex flex-wrap gap-3">
					<Button
						icon={<FiGitBranch />}
						onClick={() => router.push("/dashboard/workflows/builder")}
					>
						New Workflow
					</Button>
					<Button type="primary" icon={<FiPlus />} onClick={loadWorkflows}>
						Refresh
					</Button>
				</div>
			</div>

			<div className="grid gap-4 md:grid-cols-3">
				<div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
								Workflows
							</p>
							<p className="mt-1 text-3xl font-bold text-slate-900">
								{loading ? "--" : workflows.length}
							</p>
						</div>
						<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
							<FiGitBranch />
						</div>
					</div>
				</div>

				<div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
								Agent References
							</p>
							<p className="mt-1 text-3xl font-bold text-slate-900">
								{loading ? "--" : totalAgents}
							</p>
						</div>
						<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
							<FiLayers />
						</div>
					</div>
				</div>

				<div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
								Execution Ready
							</p>
							<p className="mt-1 text-3xl font-bold text-slate-900">
								{loading ? "--" : workflows.filter((wf) => wf.isActive !== false).length}
							</p>
						</div>
						<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
							<FiPlay />
						</div>
					</div>
				</div>
			</div>

			{loading ? (
				<div className="space-y-4">
					{[0, 1, 2].map((index) => (
						<div key={index} className="rounded-3xl border border-slate-100 p-5">
							<Skeleton active paragraph={{ rows: 3 }} />
						</div>
					))}
				</div>
			) : workflows.length === 0 ? (
				<div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-10">
					<Empty
						description="No workflows created yet."
						image={Empty.PRESENTED_IMAGE_SIMPLE}
					>
						<Button
							type="primary"
							icon={<FiGitBranch />}
							onClick={() => router.push("/dashboard/workflows/builder")}
						>
							Create your first workflow
						</Button>
					</Empty>
				</div>
			) : (
				<div className="grid gap-4 lg:grid-cols-2">
					{workflows.map((workflow) => (
						<div
							key={workflow._id}
							role="button"
							tabIndex={0}
							onClick={() => handleOpenWorkflow(workflow._id)}
							className="group rounded-3xl border border-slate-100 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg"
						>
							<div className="flex items-start justify-between gap-4">
								<div className="flex min-w-0 items-start gap-3">
									<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
										<FiGitBranch />
									</div>
									<div className="min-w-0">
										<h3 className="truncate text-lg font-semibold text-slate-900 group-hover:text-blue-600">
											{workflow.name}
										</h3>
										<p className="mt-1 line-clamp-2 text-sm text-slate-500">
											{workflow.description || "No description provided."}
										</p>
									</div>
								</div>

								<Tag
									className={`m-0 border-none ${
										workflow.isActive === false
											? "bg-slate-100 text-slate-600"
											: "bg-emerald-50 text-emerald-700"
									}`}
								>
									{workflow.isActive === false ? "Paused" : "Active"}
								</Tag>
							</div>

							<div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
								<div className="flex items-center gap-1.5">
									<FiLayers className="text-slate-400" />
									<span>{workflow.agents?.length || 0} agents</span>
								</div>
								<div className="flex items-center gap-1.5">
									<FiClock className="text-slate-400" />
									<span>{formatDate(workflow.updatedAt)}</span>
								</div>
							</div>

							<div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
								<Button
									size="small"
									icon={<FiArrowRight size={12} />}
									onClick={(e) => {
										e.stopPropagation();
										handleOpenWorkflow(workflow._id);
									}}
									className="border-none bg-slate-50 text-slate-600 hover:bg-blue-50 hover:text-blue-600"
								>
									Open Studio
								</Button>
								<Button
									type="primary"
									size="small"
									icon={<FiPlay size={12} />}
									loading={runningId === workflow._id}
									onClick={(e) => handleQuickRun(e, workflow)}
									className="bg-blue-600"
								>
									Quick Run
								</Button>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};

export default WorkflowsDashboard;
