"use client";

import React from "react";
import { Alert, Card, Drawer, Empty, Tag, Typography } from "antd";
import MarkdownContent from "@/components/common/MarkdownContent";
import {
	formatExecutionTime,
	formatOutputRaw,
	formatTimestamp,
	getMessageContent,
	getMessageRole,
	getWorkflowName,
	statusColor,
} from "@/lib/runUtils";

const formatDate = (value) => formatTimestamp(value, "Not set");

const RunLogDrawer = ({ open, onClose, run, loading }) => {
	const logs = run?.logs || [];
	const messages = run?.graphState?.messages || [];

	return (
		<Drawer title="Run Logs" open={open} onClose={onClose} size={720}>
			{loading && !run ? (
				<div className="py-10 text-center">
					<Empty description="Loading run details..." />
				</div>
			) : run ? (
				<div className="space-y-5">
					<Alert
						type={run.status === "FAILED" ? "error" : "info"}
						message={`${getWorkflowName(run)} · ${run._id}`}
						description={run.errorReason || "Live execution details and logs."}
						showIcon
					/>

					<div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
						<Card size="small">
							<div className="text-xs uppercase text-slate-400">Status</div>
							<div className="mt-1">
								<Tag color={statusColor(run.status)} className="border-none">
									{run.status}
								</Tag>
							</div>
						</Card>
						<Card size="small">
							<div className="text-xs uppercase text-slate-400">
								Execution Time
							</div>
							<div className="mt-1 text-sm font-medium text-slate-900">
								{formatExecutionTime(run.metrics?.executionTimeMs)}
							</div>
						</Card>
						<Card size="small">
							<div className="text-xs uppercase text-slate-400">Tokens</div>
							<div className="mt-1 text-sm font-medium text-slate-900">
								{(run.metrics?.promptTokens || 0) +
									(run.metrics?.completionTokens || 0)}
							</div>
							<div className="text-[11px] text-slate-500">
								{run.metrics?.promptTokens || 0} in /{" "}
								{run.metrics?.completionTokens || 0} out
							</div>
						</Card>
						<Card size="small">
							<div className="text-xs uppercase text-slate-400">Created</div>
							<div className="mt-1 text-sm font-medium text-slate-900">
								{formatDate(run.createdAt)}
							</div>
						</Card>
					</div>

					<Card
						title="Output"
						className="rounded-2xl"
						extra={
							run.output ? (
								<Typography.Text
									copyable={{ text: formatOutputRaw(run.output) }}
									className="text-xs text-slate-500"
								>
									Copy raw
								</Typography.Text>
							) : null
						}
					>
						{run.output ? (
							<MarkdownContent
								content={
									typeof run.output === "string"
										? run.output
										: formatOutputRaw(run.output)
								}
								className="max-h-[40vh] overflow-y-auto pr-1"
							/>
						) : (
							<Empty description="No output yet." />
						)}
					</Card>

					<Card title="Inter-agent Messages" className="rounded-2xl">
						<div className="space-y-3">
							{messages.length === 0 ? (
								<Empty description="No messages yet." />
							) : (
								messages.map((msg, index) => (
									<div
										key={`message-${index}`}
										className="rounded-xl border border-slate-100 bg-slate-50 p-3"
									>
										<Tag className="mb-2 border-none bg-white capitalize text-slate-600">
											{getMessageRole(msg)}
										</Tag>
										<MarkdownContent
											content={getMessageContent(msg)}
											className="text-sm text-slate-700"
										/>
									</div>
								))
							)}
						</div>
					</Card>

					<Card title="Logs" className="rounded-2xl">
						<div className="space-y-3">
							{logs.length === 0 ? (
								<Empty description="No logs yet." />
							) : (
								logs.map((log, index) => (
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
	);
};

export default RunLogDrawer;
