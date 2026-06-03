import { tool } from "@langchain/core/tools";
import { z } from "zod";

const webSearchMock = tool(
	async ({ query }) => {
		return `Search query results returned for: "${query}". (Platform tool test execution operational).`;
	},
	{
		name: "web-search",
		description: "Search the web for real-time information.",
		schema: z.object({ query: z.string() }),
	}
);

const registry = {
	"web-search": webSearchMock,
};

export const getToolByName = (name) => registry[name] || null;
