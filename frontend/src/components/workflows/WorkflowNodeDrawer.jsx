/* eslint-disable react-hooks/immutability */
"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
	Drawer,
	Empty,
	Form,
	Input,
	InputNumber,
	Button,
	Select,
	Switch,
	message,
} from "antd";
import { FiSave, FiSettings } from "react-icons/fi";
import { getAgentTools } from "@/service/agent";
import RuleBuilder from "@/components/workflows/RuleBuilder";
import { DEFAULT_RULE } from "@/lib/ruleSchema";
import {
	normalizeConditionalConfig,
	normalizeLoopConfig,
} from "@/lib/workflowGraphValidation";

const CHANNEL_OPTIONS = [
	{ value: "web", label: "Web" },
	{ value: "telegram", label: "Telegram" },
	{ value: "slack", label: "Slack" },
];

const MODEL_OPTIONS = [
	{ value: "gpt-4o-mini", label: "gpt-4o-mini" },
	{ value: "gpt-4o", label: "gpt-4o" },
];

const getInitialValues = (selectedNode) => {
	if (!selectedNode) return {};
	if (selectedNode.type === "start" || selectedNode.type === "end") {
		return {
			label: selectedNode.data?.label || selectedNode.type,
			description: selectedNode.data?.description || "",
		};
	}
	if (selectedNode.type === "agent") {
		const agent = selectedNode.data?.agent || {};
		return {
			name: agent.name || selectedNode.data?.label || "",
			role: agent.role || "",
			systemPrompt: agent.systemPrompt || "",
			model: agent.model || "gpt-4o-mini",
			tools: agent.tools || [],
			channels: agent.channels || [],
		};
	}
	if (selectedNode.type === "loop") {
		const config = normalizeLoopConfig(selectedNode.data?.config);
		return {
			label: config.label,
			maxIterations: config.maxIterations,
			enableBreakRule: Boolean(config.breakRule),
			breakRule: config.breakRule || { ...DEFAULT_RULE },
		};
	}
	if (selectedNode.type === "conditional") {
		const config = normalizeConditionalConfig(selectedNode.data?.config);
		return {
			label: config.label,
			rule: config.rule || { ...DEFAULT_RULE },
			trueLabel: config.trueLabel,
			falseLabel: config.falseLabel,
			onFalseEnd: config.onFalse === "end",
		};
	}
	return { label: selectedNode.data?.label || selectedNode.type || "Node" };
};

const WorkflowNodeDrawer = ({
	open,
	selectedNode,
	onClose,
	onSave,
	saving,
}) => {
	const [form] = Form.useForm();
	const [info, setInfo] = useState({
		tools: [],
	});
	const enableBreakRule = Form.useWatch("enableBreakRule", form);

	useEffect(() => {
		fetchTools();
	}, []);
	const fetchTools = useCallback(async () => {
		try {
			const response = await getAgentTools();
			setInfo((prev) => ({ ...prev, tools: response }));
		} catch (error) {
			console.error("Error fetching tools:", error);
			setInfo((prev) => ({ ...prev, tools: [] }));
			message.error("Failed to fetch available tools. Please try again later.");
		}
	}, []);
	useEffect(() => {
		if (open && selectedNode) {
			form.setFieldsValue(getInitialValues(selectedNode));
		} else {
			form.resetFields();
		}
	}, [form, open, selectedNode]);

	const title =
		selectedNode?.type === "start"
			? "Start Node"
			: selectedNode?.type === "end"
			? "End Node"
			: selectedNode?.type === "agent"
			? "Agent Details"
			: selectedNode?.type === "loop"
			? "Loop Settings"
			: selectedNode?.type === "conditional"
			? "Conditional Settings"
			: "Node Settings";

	const handleSubmit = async () => {
		const values = await form.validateFields();
		await onSave(values);
	};

	return (
		<Drawer
			title={
				<div className="flex items-center gap-2">
					<FiSettings className="text-blue-600" />
					<span>{title}</span>
				</div>
			}
			size={460}
			open={open}
			onClose={onClose}
			destroyOnHidden={false}
		>
			{selectedNode ? (
				<Form
					form={form}
					layout="vertical"
					requiredMark={false}
					className="space-y-4"
				>
					{selectedNode.type === "start" || selectedNode.type === "end" ? (
						<div className="space-y-4">
							<div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
								<p className="text-sm font-semibold text-slate-900">
									{selectedNode.data?.label || selectedNode.type}
								</p>
								<p className="mt-1 text-xs text-slate-500">
									{selectedNode.data?.description ||
										"Workflow boundary anchor nodes are not editable."}
								</p>
							</div>
							<div className="flex items-center justify-end border-t border-slate-100 pt-4">
								<Button onClick={onClose}>Close</Button>
							</div>
						</div>
					) : selectedNode.type === "agent" ? (
						<>
							<Form.Item
								name="name"
								label="Agent Name"
								rules={[{ required: true, message: "Name is required" }]}
							>
								<Input />
							</Form.Item>
							<Form.Item
								name="role"
								label="Role"
								rules={[{ required: true, message: "Role is required" }]}
							>
								<Input />
							</Form.Item>
							<Form.Item
								name="systemPrompt"
								label="System Prompt"
								rules={[{ required: true, message: "Prompt is required" }]}
							>
								<Input.TextArea rows={5} />
							</Form.Item>
							<Form.Item name="model" label="Model">
								<Select options={MODEL_OPTIONS} />
							</Form.Item>
							<Form.Item name="tools" label="Tools">
								<Select mode="multiple" options={info?.tools} />
							</Form.Item>
							<Form.Item name="channels" label="Channels">
								<Select mode="multiple" options={CHANNEL_OPTIONS} />
							</Form.Item>
						</>
					) : selectedNode.type === "loop" ? (
						<>
							<Form.Item
								name="label"
								label="Label"
								rules={[{ required: true, message: "Label is required" }]}
							>
								<Input />
							</Form.Item>
							<Form.Item
								name="maxIterations"
								label="Max iterations"
								rules={[{ required: true, message: "Max iterations is required" }]}
							>
								<InputNumber min={1} max={100} className="w-full" />
							</Form.Item>
							<p className="text-xs text-slate-500">
								Loop runs the body up to N times. Wire entry (top), body (right),
								back (left), and exit (bottom) handles.
							</p>
							<Form.Item
								name="enableBreakRule"
								label="Break early when rule matches"
								valuePropName="checked"
							>
								<Switch />
							</Form.Item>
							{enableBreakRule ? (
								<RuleBuilder
									namePrefix="breakRule"
									label="Break rule"
									required
								/>
							) : null}
						</>
					) : selectedNode.type === "conditional" ? (
						<>
							<Form.Item
								name="label"
								label="Label"
								rules={[{ required: true, message: "Label is required" }]}
							>
								<Input />
							</Form.Item>
							<p className="text-xs text-slate-500">
								Validator/router — evaluates the rule against the last agent output
								and routes to the true or false branch.
							</p>
							<RuleBuilder namePrefix="rule" label="Routing rule" required />
							<div className="grid grid-cols-2 gap-3">
								<Form.Item name="trueLabel" label="True Branch">
									<Input />
								</Form.Item>
								<Form.Item name="falseLabel" label="False Branch">
									<Input />
								</Form.Item>
							</div>
							<Form.Item
								name="onFalseEnd"
								label="If false, go directly to End"
								valuePropName="checked"
							>
								<Switch />
							</Form.Item>
						</>
					) : (
						<Form.Item name="label" label="Label">
							<Input />
						</Form.Item>
					)}

					{selectedNode.type !== "start" && selectedNode.type !== "end" ? (
						<div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
							<Button onClick={onClose}>Cancel</Button>
							<Button
								type="primary"
								icon={<FiSave />}
								loading={saving}
								onClick={handleSubmit}
							>
								Save Node
							</Button>
						</div>
					) : null}
				</Form>
			) : (
				<Empty description="Select a node to edit it." />
			)}
		</Drawer>
	);
};

export default WorkflowNodeDrawer;
