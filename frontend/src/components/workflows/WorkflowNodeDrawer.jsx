"use client";

import React, { useEffect } from "react";
import { Drawer, Empty, Form, Input, InputNumber, Button, Select } from "antd";
import { FiSave, FiSettings } from "react-icons/fi";

const TOOL_OPTIONS = [
	{ value: "web-search", label: "Web Search" },
	{ value: "extract-html", label: "HTML Extractor" },
	{ value: "seo-analyzer", label: "SEO Analyzer" },
	{ value: "calculator", label: "Calculator" },
];

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
		return {
			label: selectedNode.data?.config?.label || "Loop",
			iterations: selectedNode.data?.config?.iterations ?? 3,
			condition: selectedNode.data?.config?.condition || "",
		};
	}
	if (selectedNode.type === "conditional") {
		return {
			label: selectedNode.data?.config?.label || "Conditional",
			expression: selectedNode.data?.config?.expression || "",
			trueLabel: selectedNode.data?.config?.trueLabel || "true",
			falseLabel: selectedNode.data?.config?.falseLabel || "false",
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

	useEffect(() => {
		if (open && selectedNode) {
			form.setFieldsValue(getInitialValues(selectedNode));
		} else {
			form.resetFields();
		}
	}, [form, open, selectedNode]);

	const title =
		selectedNode?.type === "agent"
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
			width={460}
			open={open}
			onClose={onClose}
			destroyOnClose={false}
		>
			{selectedNode ? (
				<Form form={form} layout="vertical" requiredMark={false} className="space-y-4">
					{selectedNode.type === "agent" ? (
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
								<Select mode="multiple" options={TOOL_OPTIONS} />
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
							<Form.Item name="iterations" label="Iterations">
								<InputNumber min={1} max={100} className="w-full" />
							</Form.Item>
							<Form.Item name="condition" label="Condition">
								<Input.TextArea rows={4} />
							</Form.Item>
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
							<Form.Item name="expression" label="Expression">
								<Input.TextArea rows={4} />
							</Form.Item>
							<div className="grid grid-cols-2 gap-3">
								<Form.Item name="trueLabel" label="True Branch">
									<Input />
								</Form.Item>
								<Form.Item name="falseLabel" label="False Branch">
									<Input />
								</Form.Item>
							</div>
						</>
					) : (
						<Form.Item name="label" label="Label">
							<Input />
						</Form.Item>
					)}

					<div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
						<Button onClick={onClose}>Cancel</Button>
						<Button type="primary" icon={<FiSave />} loading={saving} onClick={handleSubmit}>
							Save Node
						</Button>
					</div>
				</Form>
			) : (
				<Empty description="Select a node to edit it." />
			)}
		</Drawer>
	);
};

export default WorkflowNodeDrawer;

