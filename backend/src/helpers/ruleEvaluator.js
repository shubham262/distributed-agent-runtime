export const RULE_FIELDS = [
	"lastMessage.content",
	"lastMessage.length",
	"loop.iteration",
	"stepCount",
];

export const STRING_OPERATORS = [
	"contains",
	"not_contains",
	"eq",
	"neq",
	"matches",
];

export const NUMBER_OPERATORS = ["eq", "neq", "gte", "lte", "gt", "lt"];

const STRING_FIELDS = new Set(["lastMessage.content"]);
const NUMBER_FIELDS = new Set([
	"lastMessage.length",
	"loop.iteration",
	"stepCount",
]);

export const DEFAULT_RULE = {
	field: "lastMessage.content",
	operator: "contains",
	value: "",
};

const getMessageText = (message) => {
	if (!message) return "";
	if (typeof message.content === "string") return message.content;
	if (Array.isArray(message.content)) {
		return message.content
			.map((part) => (typeof part === "string" ? part : part?.text || ""))
			.join(" ");
	}
	return String(message.content ?? "");
};

export const resolveField = (field, state = {}) => {
	switch (field) {
		case "lastMessage.content": {
			const messages = state.messages || [];
			const last = messages[messages.length - 1];
			return getMessageText(last);
		}
		case "lastMessage.length": {
			const messages = state.messages || [];
			const last = messages[messages.length - 1];
			return getMessageText(last).length;
		}
		case "loop.iteration": {
			const loopId = state.activeLoopId;
			if (!loopId) return 0;
			return state.loopCounters?.[loopId] ?? 0;
		}
		case "stepCount":
			return state.stepCount ?? 0;
		default:
			throw new Error(`Unsupported rule field '${field}'.`);
	}
};

const coerceComparable = (left, right, operator) => {
	if (["gte", "lte", "gt", "lt"].includes(operator)) {
		return [Number(left), Number(right)];
	}
	return [left, right];
};

export const applyOperator = (operator, left, right) => {
	switch (operator) {
		case "contains":
			return String(left).toLowerCase().includes(String(right).toLowerCase());
		case "not_contains":
			return !String(left).toLowerCase().includes(String(right).toLowerCase());
		case "eq": {
			const [l, r] = coerceComparable(left, right, operator);
			return l === r || String(left) === String(right);
		}
		case "neq": {
			const [l, r] = coerceComparable(left, right, operator);
			return l !== r && String(left) !== String(right);
		}
		case "gte": {
			const [l, r] = coerceComparable(left, right, operator);
			return l >= r;
		}
		case "lte": {
			const [l, r] = coerceComparable(left, right, operator);
			return l <= r;
		}
		case "gt": {
			const [l, r] = coerceComparable(left, right, operator);
			return l > r;
		}
		case "lt": {
			const [l, r] = coerceComparable(left, right, operator);
			return l < r;
		}
		case "matches": {
			try {
				const regex = new RegExp(String(right), "i");
				return regex.test(String(left));
			} catch {
				throw new Error(`Invalid regex in rule value '${right}'.`);
			}
		}
		default:
			throw new Error(`Unsupported rule operator '${operator}'.`);
	}
};

export const validateRule = (rule, { required = true } = {}) => {
	if (!rule) {
		if (required) throw new Error("Rule is required.");
		return null;
	}

	const { field, operator, value } = rule;
	if (!field || !RULE_FIELDS.includes(field)) {
		throw new Error(`rule.field '${field}' is not supported.`);
	}

	const allowedOperators = STRING_FIELDS.has(field)
		? STRING_OPERATORS
		: NUMBER_OPERATORS;

	if (!operator || !allowedOperators.includes(operator)) {
		throw new Error(
			`rule.operator '${operator}' is not valid for field '${field}'.`
		);
	}

	if (value === undefined || value === null || value === "") {
		throw new Error(`rule.value is required for field '${field}'.`);
	}

	return rule;
};

export const evaluateRule = (rule, state = {}) => {
	const validated = validateRule(rule, { required: true });
	const left = resolveField(validated.field, state);
	return applyOperator(validated.operator, left, validated.value);
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
