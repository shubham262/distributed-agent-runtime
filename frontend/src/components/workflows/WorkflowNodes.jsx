"use client";

import React from "react";
import { Handle, Position } from "@xyflow/react";
import { Tag } from "antd";
import { FiActivity, FiCpu, FiLayers } from "react-icons/fi";

const NodeFrame = ({
	accentClass,
	icon,
	title,
	subtitle,
	children,
	selected,
}) => (
	<div
		className={`min-w-[220px] rounded-2xl border bg-white shadow-lg ${
			selected ? "ring-2 ring-blue-400" : "border-slate-200"
		}`}
	>
		<div className={`h-1 w-full rounded-t-2xl ${accentClass}`} />
		<div className="p-4">
			<div className="flex items-start gap-3">
				<div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-700">
					{icon}
				</div>
				<div className="min-w-0 flex-1">
					<p className="truncate text-sm font-semibold text-slate-900">
						{title}
					</p>
					<p className="line-clamp-2 text-xs text-slate-500">{subtitle}</p>
				</div>
			</div>
			<div className="mt-4">{children}</div>
		</div>
	</div>
);

const AgentNode = ({ data, selected }) => (
	<div className="relative">
		<Handle
			type="target"
			position={Position.Top}
			className="!h-3 !w-3 !border-2 !border-blue-500 !bg-white"
		/>
		<NodeFrame
			selected={selected}
			accentClass="bg-gradient-to-r from-blue-500 to-cyan-400"
			icon={<FiCpu className="text-lg text-blue-600" />}
			title={data?.agent?.name || data?.label || "Agent"}
			subtitle={data?.agent?.role || data?.agent?.systemPrompt || "Agent node"}
		>
			<div className="flex flex-wrap gap-2">
				<Tag className="m-0 border-none bg-blue-50 text-blue-700">Agent</Tag>
				{data?.agent?.status ? (
					<Tag className="m-0 border-none bg-slate-100 text-slate-600">
						{data.agent.status}
					</Tag>
				) : null}
			</div>
		</NodeFrame>
		<Handle
			type="source"
			position={Position.Bottom}
			className="!h-3 !w-3 !border-2 !border-blue-500 !bg-white"
		/>
	</div>
);

const LoopNode = ({ data, selected }) => (
	<div className="relative">
		<Handle
			type="target"
			position={Position.Left}
			className="!h-3 !w-3 !border-2 !border-emerald-500 !bg-white"
		/>
		<NodeFrame
			selected={selected}
			accentClass="bg-gradient-to-r from-emerald-500 to-lime-400"
			icon={<FiLayers className="text-lg text-emerald-600" />}
			title={data?.config?.label || data?.label || "Loop"}
			subtitle={data?.config?.condition || "Repeat this branch"}
		>
			<div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500">
				<div className="rounded-lg bg-slate-50 px-2 py-1">
					<p className="font-semibold text-slate-700">
						{data?.config?.iterations ?? 0}
					</p>
					<p>Iterations</p>
				</div>
				<div className="rounded-lg bg-slate-50 px-2 py-1">
					<p className="font-semibold text-slate-700">Cycle</p>
					<p>Control</p>
				</div>
			</div>
		</NodeFrame>
		<Handle
			type="source"
			position={Position.Right}
			className="!h-3 !w-3 !border-2 !border-emerald-500 !bg-white"
		/>
	</div>
);

const ConditionalNode = ({ data, selected }) => (
	<div className="relative">
		<Handle
			type="target"
			position={Position.Left}
			className="!h-3 !w-3 !border-2 !border-amber-500 !bg-white"
		/>
		<NodeFrame
			selected={selected}
			accentClass="bg-gradient-to-r from-amber-500 to-orange-400"
			icon={<FiActivity className="text-lg text-amber-600" />}
			title={data?.config?.label || data?.label || "Conditional"}
			subtitle={data?.config?.expression || "Branch execution"}
		>
			<div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500">
				<div className="rounded-lg bg-slate-50 px-2 py-1">
					<p className="font-semibold text-slate-700">
						{data?.config?.trueLabel || "true"}
					</p>
					<p>Branch A</p>
				</div>
				<div className="rounded-lg bg-slate-50 px-2 py-1">
					<p className="font-semibold text-slate-700">
						{data?.config?.falseLabel || "false"}
					</p>
					<p>Branch B</p>
				</div>
			</div>
		</NodeFrame>
		<Handle
			type="source"
			position={Position.Right}
			id="true"
			style={{ top: 22 }}
			className="!h-3 !w-3 !border-2 !border-amber-500 !bg-white"
		/>
		<Handle
			type="source"
			position={Position.Right}
			id="false"
			style={{ top: 58 }}
			className="!h-3 !w-3 !border-2 !border-amber-500 !bg-white"
		/>
	</div>
);

export const workflowNodeTypes = {
	agent: AgentNode,
	loop: LoopNode,
	conditional: ConditionalNode,
};

