"use client";

import React, { useEffect, useMemo } from "react";
import { Form, Input, InputNumber, Select } from "antd";
import {
	DEFAULT_RULE,
	RULE_FIELD_OPTIONS,
	getOperatorsForField,
} from "@/lib/ruleSchema";

const RuleBuilder = ({ namePrefix = "rule", required = true, label = "Rule" }) => {
	const form = Form.useFormInstance();
	const selectedField = Form.useWatch([namePrefix, "field"], form);

	const operatorOptions = useMemo(
		() => getOperatorsForField(selectedField || DEFAULT_RULE.field),
		[selectedField]
	);

	const fieldType = useMemo(() => {
		return (
			RULE_FIELD_OPTIONS.find((option) => option.value === selectedField)?.type ||
			"string"
		);
	}, [selectedField]);

	useEffect(() => {
		const currentOperator = form.getFieldValue([namePrefix, "operator"]);
		const allowed = operatorOptions.map((option) => option.value);
		if (currentOperator && !allowed.includes(currentOperator)) {
			form.setFieldValue([namePrefix, "operator"], allowed[0]);
		}
	}, [form, namePrefix, operatorOptions]);

	return (
		<div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
			<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
				{label}
			</p>
			<Form.Item
				name={[namePrefix, "field"]}
				label="Field"
				rules={required ? [{ required: true, message: "Choose a field" }] : []}
				initialValue={DEFAULT_RULE.field}
			>
				<Select options={RULE_FIELD_OPTIONS} />
			</Form.Item>
			<Form.Item
				name={[namePrefix, "operator"]}
				label="Operator"
				rules={required ? [{ required: true, message: "Choose an operator" }] : []}
				initialValue={DEFAULT_RULE.operator}
			>
				<Select options={operatorOptions} />
			</Form.Item>
			<Form.Item
				name={[namePrefix, "value"]}
				label="Value"
				rules={required ? [{ required: true, message: "Enter a value" }] : []}
			>
				{fieldType === "number" ? (
					<InputNumber className="w-full" />
				) : (
					<Input placeholder="e.g. approved" />
				)}
			</Form.Item>
		</div>
	);
};

export default RuleBuilder;
