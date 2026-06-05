"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Badge, Button, Empty, Select, Table, Tag, message } from "antd";
import { FiEye, FiRefreshCw } from "react-icons/fi";
import { useRouter, useSearchParams } from "next/navigation";
import RunLogDrawer from "@/components/workflows/RunLogDrawer";
import {
	formatEstimatedCost,
	formatExecutionTime,
	formatRelativeTime,
	getWorkflowName,
	statusColor,
} from "@/lib/runUtils";
import { getAllRuns, getWorkflowRunById } from "@/service/workflow";

const Runs = () => {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [runs, setRuns] = useState([]);
	const [loading, setLoading] = useState(true);
	const [statusFilter, setStatusFilter] = useState("all");
	const [drawerOpen, setDrawerOpen] = useState(false);
	const [selectedRun, setSelectedRun] = useState(null);
	const [selectedRunLoading, setSelectedRunLoading] = useState(false);

	const loadRuns = useCallback(async () => {
		try {
			setLoading(true);
			const data = await getAllRuns();
			setRuns(data || []);
		} catch (error) {
			console.error("Runs load error:", error);
			message.error("Unable to load execution history.");
		} finally {
			setLoading(false);
		}
	}, []);

	const loadSelectedRun = useCallback(async (runId) => {
		try {
			setSelectedRunLoading(true);
			const data = await getWorkflowRunById(runId);
			setSelectedRun(data);
		} catch (error) {
			console.error("Run detail load error:", error);
			message.error("Unable to load run details.");
		} finally {
			setSelectedRunLoading(false);
		}
	}, []);

	const openRun = useCallback(
		async (runId, { syncUrl = true } = {}) => {
			setDrawerOpen(true);
			setSelectedRun(null);
			if (syncUrl) {
				router.replace(`/dashboard/runs?runId=${runId}`, { scroll: false });
			}
			await loadSelectedRun(runId);
		},
		[loadSelectedRun, router]
	);

	useEffect(() => {
		loadRuns();
	}, [loadRuns]);

	useEffect(() => {
		const runId = searchParams.get("runId");
		if (!runId) return;
		setDrawerOpen(true);
		loadSelectedRun(runId);
	}, [loadSelectedRun, searchParams]);

	useEffect(() => {
		if (!selectedRun || !drawerOpen) return undefined;
		if (!["QUEUED", "RUNNING"].includes(selectedRun.status)) return undefined;

		const interval = setInterval(() => {
			loadSelectedRun(selectedRun._id);
			loadRuns();
		}, 2000);

		return () => clearInterval(interval);
	}, [drawerOpen, loadRuns, loadSelectedRun, selectedRun]);

	const filteredRuns = useMemo(() => {
		if (statusFilter === "all") return runs;
		return runs.filter((run) => run.status === statusFilter);
	}, [runs, statusFilter]);

	const columns = useMemo(
		() => [
			{
				title: "Run / Workflow",
				key: "workflow",
				render: (_, record) => (
					<div className="flex flex-col">
						<span className="text-sm font-semibold text-slate-900">
							{getWorkflowName(record)}
						</span>
						<span className="font-mono text-[11px] text-slate-400">
							{record._id}
						</span>
					</div>
				),
			},
			{
				title: "Status",
				dataIndex: "status",
				key: "status",
				render: (status) => (
					<Tag color={statusColor(status)} className="border-none">
						<span className="flex items-center gap-1.5">
							{status === "RUNNING" ? <Badge status="processing" /> : null}
							{status}
						</span>
					</Tag>
				),
			},
			{
				title: "Execution",
				key: "executionTimeMs",
				render: (_, record) =>
					formatExecutionTime(record.metrics?.executionTimeMs),
			},
			{
				title: "Tokens",
				key: "tokens",
				render: (_, record) => {
					const prompt = record.metrics?.promptTokens || 0;
					const completion = record.metrics?.completionTokens || 0;
					return (
						<span className="text-xs text-slate-600">
							{prompt + completion}
							<span className="text-slate-400">
								{" "}
								({prompt}/{completion})
							</span>
						</span>
					);
				},
			},
			{
				title: "Est. Cost",
				key: "cost",
				render: (_, record) => (
					<span className="font-mono text-xs font-semibold text-slate-700">
						{formatEstimatedCost(record.metrics)}
					</span>
				),
			},
			{
				title: "Started",
				dataIndex: "createdAt",
				key: "createdAt",
				render: (value) => (
					<span className="text-xs text-slate-500">{formatRelativeTime(value)}</span>
				),
			},
			{
				title: "Action",
				key: "action",
				render: (_, record) => (
					<Button
						type="text"
						icon={<FiEye />}
						onClick={(event) => {
							event.stopPropagation();
							openRun(record._id);
						}}
					>
						View Logs
					</Button>
				),
			},
		],
		[openRun]
	);

	return (
		<div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-6 md:p-8">
			<div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight text-slate-900">
						Execution History
					</h1>
					<p className="text-sm text-slate-500">
						All workflow runs across your workspace with live status and logs.
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-3">
					<Select
						value={statusFilter}
						onChange={setStatusFilter}
						className="min-w-[140px]"
						options={[
							{ value: "all", label: "All statuses" },
							{ value: "RUNNING", label: "Running" },
							{ value: "QUEUED", label: "Queued" },
							{ value: "COMPLETED", label: "Completed" },
							{ value: "FAILED", label: "Failed" },
							{ value: "PAUSED", label: "Paused" },
						]}
					/>
					<Button icon={<FiRefreshCw />} onClick={loadRuns} loading={loading}>
						Refresh
					</Button>
				</div>
			</div>

			<div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
				<Table
					rowKey="_id"
					loading={loading}
					columns={columns}
					dataSource={filteredRuns}
					pagination={{ pageSize: 10, showSizeChanger: true }}
					locale={{ emptyText: <Empty description="No runs yet." /> }}
					onRow={(record) => ({
						onClick: () => openRun(record._id),
						className: "cursor-pointer",
					})}
				/>
			</div>

			<RunLogDrawer
				open={drawerOpen}
				onClose={() => {
					setDrawerOpen(false);
					setSelectedRun(null);
					router.replace("/dashboard/runs", { scroll: false });
				}}
				run={selectedRun}
				loading={selectedRunLoading}
			/>
		</div>
	);
};

export default Runs;
