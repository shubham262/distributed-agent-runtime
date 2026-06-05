"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import {
	Alert,
	Button,
	Card,
	Drawer,
	Empty,
	Form,
	DatePicker,
	Modal,
	Popconfirm,
	Space,
	Statistic,
	Table,
	Tag,
	Typography,
	message,
} from "antd";
import {
	FiCalendar,
	FiClock,
	FiEye,
	FiGitBranch,
	FiPlay,
	FiRefreshCw,
	FiTrash2,
} from "react-icons/fi";
import { useParams, useRouter } from "next/navigation";
import MarkdownContent from "@/components/common/MarkdownContent";
import WorkflowBuilder from "@/views/workflows/WorkflowBuilder";
import {
	deleteWorkflow,
	getWorkflowById,
	getWorkflowRunById,
	getWorkflowRuns,
	playWorkflow,
	scheduleWorkflow,
} from "@/service/workflow";

const statusColor = (status) => {
	if (status === "RUNNING") return "processing";
	if (status === "COMPLETED") return "success";
	if (status === "PAUSED") return "warning";
	if (status === "FAILED") return "error";
	if (status === "QUEUED" || status === "SCHEDULED") return "blue";
	return "default";
};

const formatOutputPreview = (output) => {
	if (!output) return "No output yet";
	const text = typeof output === "string" ? output : String(output);
	return text.replace(/\s+/g, " ").trim().slice(0, 120);
};

const formatOutputRaw = (output) => {
	if (!output) return "";
	if (typeof output === "string") return output;
	try {
		return JSON.stringify(output, null, 2);
	} catch {
		return String(output);
	}
};

const formatDate = (value) => {
	if (!value) return "Not set";
	try {
		return new Intl.DateTimeFormat("en-US", {
			month: "short",
			day: "numeric",
			hour: "numeric",
			minute: "2-digit",
		}).format(new Date(value));
	} catch {
		return "Not set";
	}
};

const WorkflowDetail = () => {
	const router = useRouter();
	const params = useParams();
	const workflowId = params?.id;
	const [scheduleForm] = Form.useForm();
	const [workflow, setWorkflow] = useState(null);
	const [runs, setRuns] = useState([]);
	const [loading, setLoading] = useState(true);
	const [runsLoading, setRunsLoading] = useState(true);
	const [savingSchedule, setSavingSchedule] = useState(false);
	const [publishing, setPublishing] = useState(false);
	const [scheduleOpen, setScheduleOpen] = useState(false);
	const [runDrawerOpen, setRunDrawerOpen] = useState(false);
	const [selectedRun, setSelectedRun] = useState(null);
	const [selectedRunLoading, setSelectedRunLoading] = useState(false);

	const loadWorkflow = useCallback(async () => {
		try {
			setLoading(true);
			const data = await getWorkflowById(workflowId);
			setWorkflow(data);
		} catch (error) {
			console.error("Workflow load error:", error);
			message.error("Unable to load workflow details.");
		} finally {
			setLoading(false);
		}
	}, [workflowId]);

	const loadRuns = useCallback(async () => {
		try {
			setRunsLoading(true);
			const data = await getWorkflowRuns(workflowId);
			setRuns(data || []);
		} catch (error) {
			console.error("Workflow run load error:", error);
			message.error("Unable to load workflow runs.");
		} finally {
			setRunsLoading(false);
		}
	}, [workflowId]);

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

	useEffect(() => {
		loadWorkflow();
		loadRuns();
	}, [loadRuns, loadWorkflow]);

	useEffect(() => {
		if (!selectedRun || !runDrawerOpen) return undefined;
		if (!["QUEUED", "RUNNING"].includes(selectedRun.status)) return undefined;

		const interval = setInterval(() => {
			loadSelectedRun(selectedRun._id);
			loadRuns();
		}, 2000);

		return () => clearInterval(interval);
	}, [loadRuns, loadSelectedRun, runDrawerOpen, selectedRun]);

	const openRun = useCallback(
		async (runId) => {
			setRunDrawerOpen(true);
			setSelectedRun(null);
			await loadSelectedRun(runId);
		},
		[loadSelectedRun]
	);

	const refreshAll = useCallback(async () => {
		await Promise.all([loadWorkflow(), loadRuns()]);
	}, [loadRuns, loadWorkflow]);

	const handlePublish = useCallback(async () => {
		try {
			setPublishing(true);
			const response = await playWorkflow(workflowId, {
				metadata: {
					source: "publish",
				},
			});
			message.success("Workflow published and execution started.");
			await refreshAll();
			if (response?.runId) {
				await openRun(response.runId);
			}
		} catch (error) {
			console.error("Publish error:", error);
			message.error("Unable to publish workflow.");
		} finally {
			setPublishing(false);
		}
	}, [openRun, refreshAll, workflowId]);

	const handleDeleteWorkflow = useCallback(async () => {
		try {
			await deleteWorkflow(workflowId);
			message.success("Workflow deleted.");
			router.push("/dashboard/workflows");
		} catch (error) {
			console.error("Delete workflow error:", error);
			message.error("Unable to delete workflow.");
		}
	}, [router, workflowId]);

	const handleScheduleSubmit = useCallback(async () => {
		try {
			const values = await scheduleForm.validateFields();
			if (!values.runAt) {
				message.error("Please choose a date and time.");
				return;
			}
			setSavingSchedule(true);
			const response = await scheduleWorkflow(workflowId, {
				runAt: values.runAt.toISOString(),
				timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
				metadata: {
					source: "schedule",
				},
			});
			message.success("Workflow scheduled successfully.");
			setScheduleOpen(false);
			scheduleForm.resetFields();
			await refreshAll();
			if (response?.runId) {
				await openRun(response.runId);
			}
		} catch (error) {
			console.error("Schedule workflow error:", error);
			message.error("Unable to schedule workflow.");
		} finally {
			setSavingSchedule(false);
		}
	}, [openRun, refreshAll, scheduleForm, workflowId]);

	const columns = useMemo(
		() => [
			{
				title: "Run",
				dataIndex: "_id",
				key: "_id",
				render: (text, record) => (
					<div className="flex flex-col">
						<span className="text-sm font-semibold text-slate-900">
							{record._id}
						</span>
						<span className="text-[11px] text-slate-400">
							Started {formatDate(record.createdAt)}
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
						{status}
					</Tag>
				),
			},
			{
				title: "Execution",
				dataIndex: ["metrics", "executionTimeMs"],
				key: "executionTimeMs",
				render: (value) => `${Math.round((value || 0) / 1000)}s`,
			},
			{
				title: "Result",
				dataIndex: "output",
				key: "output",
				render: (output) => (
					<span className="line-clamp-1 text-xs text-slate-500">
						{formatOutputPreview(output)}
					</span>
				),
			},
			{
				title: "Action",
				key: "action",
				render: (_, record) => (
					<Button
						type="text"
						icon={<FiEye />}
						onClick={() => openRun(record._id)}
					>
						View Logs
					</Button>
				),
			},
		],
		[openRun]
	);

	const selectedRunLogs = selectedRun?.logs || [];
	const selectedWorkflow = workflow || {};

	return (
		<div className="space-y-5">
			<div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
				<div className="space-y-1">
					<div className="flex items-center gap-2">
						<Tag className="border-none bg-blue-50 text-blue-700">
							Workflow Detail
						</Tag>
						{selectedWorkflow.isActive === false ? (
							<Tag className="border-none bg-slate-100 text-slate-600">
								Paused
							</Tag>
						) : (
							<Tag className="border-none bg-emerald-50 text-emerald-700">
								Active
							</Tag>
						)}
					</div>
					<h1 className="text-2xl font-bold tracking-tight text-slate-900">
						{selectedWorkflow.name || "Workflow"}
					</h1>
					<p className="max-w-3xl text-sm text-slate-500">
						Inspect the canvas, launch runs, inspect logs, and schedule future
						executions from one place.
					</p>
				</div>

				<div className="flex flex-wrap gap-3">
					<Popconfirm
						title="Delete this workflow?"
						description="This action cannot be undone."
						okText="Delete"
						okButtonProps={{ danger: true }}
						onConfirm={handleDeleteWorkflow}
					>
						<Button danger icon={<FiTrash2 />}>
							Delete
						</Button>
					</Popconfirm>
					<Button icon={<FiCalendar />} onClick={() => setScheduleOpen(true)}>
						Schedule
					</Button>
					<Button
						type="primary"
						loading={publishing}
						icon={<FiPlay />}
						onClick={handlePublish}
						className="bg-blue-600 hover:bg-blue-500"
					>
						Publish
					</Button>
					<Button icon={<FiRefreshCw />} onClick={refreshAll}>
						Refresh
					</Button>
				</div>
			</div>

			<div className="grid gap-4 md:grid-cols-3">
				<Card className="rounded-3xl">
					<Statistic
						title="Past Runs"
						value={runs.length}
						prefix={<FiGitBranch />}
					/>
				</Card>
				<Card className="rounded-3xl">
					<Statistic
						title="Scheduled For"
						value={
							selectedWorkflow.schedule?.runAt
								? formatDate(selectedWorkflow.schedule.runAt)
								: "Not scheduled"
						}
						prefix={<FiCalendar />}
					/>
				</Card>
				<Card className="rounded-3xl">
					<Statistic
						title="Schedule Status"
						value={selectedWorkflow.schedule?.status || "IDLE"}
						prefix={<FiClock />}
					/>
				</Card>
			</div>

			{workflowId ? <WorkflowBuilder workflowId={workflowId} /> : null}

			<section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
				<div className="mb-4 flex items-center justify-between gap-3">
					<div>
						<h2 className="text-lg font-semibold text-slate-900">
							Past Workflow Runs
						</h2>
						<p className="text-sm text-slate-500">
							Click a run to inspect its logs, output, and metrics.
						</p>
					</div>
					<Button
						icon={<FiRefreshCw />}
						onClick={loadRuns}
						loading={runsLoading}
					>
						Refresh Runs
					</Button>
				</div>

				<Table
					rowKey="_id"
					loading={runsLoading}
					columns={columns}
					dataSource={runs}
					pagination={{ pageSize: 8 }}
					onRow={(record) => ({
						onClick: () => openRun(record._id),
					})}
					className="[&_.ant-table-tbody>tr]:cursor-pointer"
				/>
			</section>

			<Modal
				title="Schedule Workflow"
				open={scheduleOpen}
				onCancel={() => setScheduleOpen(false)}
				onOk={handleScheduleSubmit}
				okText="Schedule"
				confirmLoading={savingSchedule}
				destroyOnHidden={false}
			>
				<Form
					form={scheduleForm}
					layout="vertical"
					initialValues={{ runAt: null }}
				>
					<Form.Item
						name="runAt"
						label="Run date and time"
						rules={[
							{ required: true, message: "Choose a future date and time." },
						]}
					>
						<DatePicker
							showTime
							className="w-full"
							disabledDate={(current) =>
								current && current < dayjs().startOf("day")
							}
						/>
					</Form.Item>
				</Form>
			</Modal>

			<Drawer
				title="Run Logs"
				open={runDrawerOpen}
				onClose={() => setRunDrawerOpen(false)}
				size={720}
			>
				{selectedRunLoading && !selectedRun ? (
					<div className="py-10 text-center">
						<Empty description="Loading run details..." />
					</div>
				) : selectedRun ? (
					<div className="space-y-5">
						<Alert
							type={selectedRun.status === "FAILED" ? "error" : "info"}
							message={`Run ${selectedRun._id}`}
							description={
								selectedRun.errorReason || "Live execution details and logs."
							}
							showIcon
						/>

						<div className="grid gap-3 md:grid-cols-3">
							<Card size="small">
								<div className="text-xs uppercase text-slate-400">Status</div>
								<div className="mt-1">
									<Tag
										color={statusColor(selectedRun.status)}
										className="border-none"
									>
										{selectedRun.status}
									</Tag>
								</div>
							</Card>
							<Card size="small">
								<div className="text-xs uppercase text-slate-400">
									Execution Time
								</div>
								<div className="mt-1 text-sm font-medium text-slate-900">
									{Math.round(
										(selectedRun.metrics?.executionTimeMs || 0) / 1000
									)}
									s
								</div>
							</Card>
							<Card size="small">
								<div className="text-xs uppercase text-slate-400">Created</div>
								<div className="mt-1 text-sm font-medium text-slate-900">
									{formatDate(selectedRun.createdAt)}
								</div>
							</Card>
						</div>

						<Card
							title="Output"
							className="rounded-2xl"
							extra={
								selectedRun.output ? (
									<Typography.Text
										copyable={{ text: formatOutputRaw(selectedRun.output) }}
										className="text-xs text-slate-500"
									>
										Copy raw
									</Typography.Text>
								) : null
							}
						>
							{selectedRun.output ? (
								<MarkdownContent
									content={selectedRun.output}
									className="max-h-[60vh] overflow-y-auto pr-1"
								/>
							) : (
								<Empty description="No output yet." />
							)}
						</Card>

						<Card title="Logs" className="rounded-2xl">
							<div className="space-y-3">
								{selectedRunLogs.length === 0 ? (
									<Empty description="No logs yet." />
								) : (
									selectedRunLogs.map((log, index) => (
										<div
											key={`${log.timestamp || index}-${index}`}
											className="rounded-xl border border-slate-100 bg-slate-50 p-3"
										>
											<div className="flex items-center justify-between gap-3">
												<div className="font-medium text-slate-900">
													{log.action}
												</div>
												<Tag className="border-none bg-white text-slate-500">
													{formatDate(log.timestamp)}
												</Tag>
											</div>
											{log.agentName ? (
												<div className="mt-1 text-xs text-slate-500">
													{log.agentName}
												</div>
											) : null}
										</div>
									))
								)}
							</div>
						</Card>
					</div>
				) : (
					<Empty description="Select a run to inspect." />
				)}
			</Drawer>
		</div>
	);
};

export default WorkflowDetail;
