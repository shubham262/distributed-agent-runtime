export const statusColor = (status) => {
	if (status === "RUNNING") return "processing";
	if (status === "COMPLETED") return "success";
	if (status === "PAUSED") return "warning";
	if (status === "FAILED") return "error";
	if (status === "QUEUED" || status === "SCHEDULED") return "blue";
	return "default";
};

export const formatExecutionTime = (ms = 0) => {
	if (!ms) return "—";
	if (ms < 1000) return `${Math.round(ms)}ms`;
	return `${(ms / 1000).toFixed(1)}s`;
};

export const formatRelativeTime = (value) => {
	if (!value) return "—";
	const date = new Date(value);
	const diffMs = Date.now() - date.getTime();
	const diffMinutes = Math.floor(diffMs / 60000);

	if (diffMinutes < 1) return "Just now";
	if (diffMinutes < 60) return `${diffMinutes} min${diffMinutes === 1 ? "" : "s"} ago`;

	const diffHours = Math.floor(diffMinutes / 60);
	if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;

	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
	}).format(date);
};

export const formatTokens = (count = 0) => {
	if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
	if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
	return String(count);
};

export const formatEstimatedCost = (metrics = {}) => {
	if (metrics.totalCostUSD > 0) {
		return `$${metrics.totalCostUSD.toFixed(3)}`;
	}

	const prompt = metrics.promptTokens || 0;
	const completion = metrics.completionTokens || 0;
	const estimate = prompt * 0.00000015 + completion * 0.0000006;
	return estimate > 0 ? `$${estimate.toFixed(3)}` : "—";
};

export const getWorkflowName = (run) => {
	if (typeof run?.workflowId === "object" && run.workflowId?.name) {
		return run.workflowId.name;
	}
	return "Unknown workflow";
};

export const getMessageRole = (msg = {}) => {
	if (typeof msg._getType === "function") return msg._getType();
	if (msg.type) return msg.type;
	if (Array.isArray(msg.id) && msg.id[2]) return msg.id[2];
	return "message";
};

export const getMessageContent = (msg = {}) => {
	if (typeof msg.content === "string") return msg.content;
	if (Array.isArray(msg.content)) {
		return msg.content
			.map((part) => (typeof part === "string" ? part : part?.text || ""))
			.join(" ");
	}
	if (typeof msg.kwargs?.content === "string") return msg.kwargs.content;
	if (msg.kwargs?.content) return JSON.stringify(msg.kwargs.content);
	return "";
};

export const formatOutputRaw = (output) => {
	if (!output) return "";
	if (typeof output === "string") return output;
	try {
		return JSON.stringify(output, null, 2);
	} catch {
		return String(output);
	}
};

export const aggregateRunMetrics = (runs = []) => {
	return runs.reduce(
		(acc, run) => {
			const metrics = run.metrics || {};
			acc.promptTokens += metrics.promptTokens || 0;
			acc.completionTokens += metrics.completionTokens || 0;
			acc.totalCostUSD += metrics.totalCostUSD || 0;
			if (["RUNNING", "QUEUED"].includes(run.status)) {
				acc.activeRuns += 1;
			}
			return acc;
		},
		{
			promptTokens: 0,
			completionTokens: 0,
			totalCostUSD: 0,
			activeRuns: 0,
		}
	);
};
