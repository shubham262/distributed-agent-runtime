export const RULE_FIELD_OPTIONS = [
	{ value: "lastMessage.content", label: "Last message text", type: "string" },
	{ value: "lastMessage.length", label: "Last message length", type: "number" },
	{ value: "loop.iteration", label: "Loop iteration", type: "number" },
	{ value: "stepCount", label: "Step count", type: "number" },
];

export const STRING_OPERATORS = [
	{ value: "contains", label: "contains" },
	{ value: "not_contains", label: "does not contain" },
	{ value: "eq", label: "equals" },
	{ value: "neq", label: "not equals" },
	{ value: "matches", label: "matches regex" },
];

export const NUMBER_OPERATORS = [
	{ value: "eq", label: "equals" },
	{ value: "neq", label: "not equals" },
	{ value: "gte", label: "greater or equal" },
	{ value: "lte", label: "less or equal" },
	{ value: "gt", label: "greater than" },
	{ value: "lt", label: "less than" },
];

export const DEFAULT_RULE = {
	field: "lastMessage.content",
	operator: "contains",
	value: "",
};

export const getOperatorsForField = (field) => {
	const fieldMeta = RULE_FIELD_OPTIONS.find((option) => option.value === field);
	return fieldMeta?.type === "number" ? NUMBER_OPERATORS : STRING_OPERATORS;
};

export const migrateLegacyExpression = (expression) => {
	if (!expression || typeof expression !== "string") return { ...DEFAULT_RULE };
	const trimmed = expression.trim();
	if (!trimmed) return { ...DEFAULT_RULE };
	return {
		field: "lastMessage.content",
		operator: "contains",
		value: trimmed,
	};
};
