/* eslint-disable react-hooks/immutability */
import React, { useCallback, useEffect, useState } from "react";
import {
	Button,
	Modal,
	Form,
	Input,
	Select,
	Switch,
	InputNumber,
	message,
} from "antd";
import { FiSliders } from "react-icons/fi";
import { getAgentTools } from "@/service/agent";
const CreateAgentModal = ({
	isModalOpen,
	setIsModalOpen,
	form,
	onFinish,
	availableTools,
	editingAgent,
}) => {
	const [info, setInfo] = useState({
		tools: [],
	});

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
	return (
		<Modal
			title={
				<div className="flex items-center gap-2 border-b border-slate-100 pb-3 font-sans">
					<FiSliders className="text-blue-600" />
					<span>
						{editingAgent
							? "Modify Agent Architecture"
							: "Assemble System Core Agent"}
					</span>
				</div>
			}
			open={isModalOpen}
			onCancel={() => setIsModalOpen(false)}
			footer={null}
			width={520}
			className="font-sans"
		>
			<Form
				form={form}
				layout="vertical"
				onFinish={onFinish}
				requiredMark={false}
				className="mt-4 space-y-4 font-sans"
				initialValues={{
					model: "gpt-4o-mini",
					memory: true,
					maxTokens: 2000,
				}}
			>
				{/* Identity Group */}
				<div className="flex flex-col sm:flex-row gap-4">
					<Form.Item
						label={
							<span className="text-xs font-bold text-slate-600">
								Agent Name
							</span>
						}
						name="name"
						rules={[{ required: true, message: "Identity missing" }]}
						className="flex-1 m-0"
					>
						<Input placeholder="e.g., Lead Researcher" className="h-9" />
					</Form.Item>

					<Form.Item
						label={
							<span className="text-xs font-bold text-slate-600">
								Designated Role
							</span>
						}
						name="role"
						rules={[{ required: true, message: "Role parameter required" }]}
						className="flex-1 m-0"
					>
						<Input placeholder="e.g., Data Analyst" className="h-9" />
					</Form.Item>
				</div>

				{/* Behavior Personality */}
				<Form.Item
					label={
						<span className="text-xs font-bold text-slate-600">
							Behavior / System Prompt (Personality)
						</span>
					}
					name="systemPrompt"
					rules={[{ required: true, message: "Core instruction mandatory" }]}
				>
					<Input.TextArea
						placeholder="Instruct your agent on how it should behave, operate, and maintain its operational stance..."
						rows={3}
					/>
				</Form.Item>

				{/* Model Deployment Selection */}
				<Form.Item
					label={
						<span className="text-xs font-bold text-slate-600">
							Azure Engine Deployment
						</span>
					}
					name="model"
				>
					<Select className="h-9">
						<Select.Option value="gpt-4o-mini">
							gpt-4o-mini (High Speed / Lightweight)
						</Select.Option>
					</Select>
				</Form.Item>

				{/* Tools Selection Mount */}
				<Form.Item
					label={
						<span className="text-xs font-bold text-slate-600">
							Mount Utility Tools
						</span>
					}
					name="tools"
				>
					<Select
						mode="multiple"
						placeholder="Select operational extensions..."
						options={info?.tools || []}
						className="w-full"
					/>
				</Form.Item>

				{/* Operational Limits and Memory Row */}

				{/* Footer Actions Submit */}
				<div className="flex justify-end gap-3 border-t border-slate-100 pt-4 mt-6">
					<Button onClick={() => setIsModalOpen(false)}>Cancel</Button>
					<Button
						type="primary"
						htmlType="submit"
						className="bg-blue-600 border-none hover:bg-blue-500 font-semibold"
					>
						Save Configuration Changes
					</Button>
				</div>
			</Form>
		</Modal>
	);
};

export default CreateAgentModal;
