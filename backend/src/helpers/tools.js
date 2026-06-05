import { tool } from "@langchain/core/tools";
import { z } from "zod";
import tvly from "../config/tavily.js";


const webSearch = tool(
	async ({ query, maxResults }) => {
		const response = await tvly.search(query, {
			searchDepth: "advanced",
			includeAnswer: "advanced",
			maxResults: maxResults ?? 5,
		});

		return {
			query: response.query,
			answer: response.answer ?? null,
			results: (response.results || []).map((r) => ({
				title: r.title,
				url: r.url,
				content: r.content,
				score: r.score,
			})),
		};
	},
	{
		name: "web-search",
		description:
			"Search the web for real-time information. Returns a synthesized answer and the most relevant source snippets. Use for quick factual lookups, current events, and grounding answers in live data.",
		schema: z.object({
			query: z.string().describe("The search query."),
			maxResults: z
				.number()
				.int()
				.min(1)
				.max(10)
				.optional()
				.describe("How many source results to return (default 5)."),
		}),
	}
);


const RESEARCH_POLL_INTERVAL_MS = 3000;
const RESEARCH_MAX_POLLS = 40; // ~2 minutes ceiling

const deepResearch = tool(
	async ({ query, model, citationFormat }) => {
		const initiated = await tvly.research(query, {
			model: model ?? "auto",
			citationFormat: citationFormat ?? "numbered",
			stream: false,
		});

		const requestId = initiated.requestId;
		if (!requestId) {
			throw new Error("Tavily research did not return a requestId.");
		}

		// Poll getResearch until the report is ready, fails, or we hit the ceiling.
		for (let attempt = 0; attempt < RESEARCH_MAX_POLLS; attempt++) {
			const result = await tvly.getResearch(requestId);
			const status = (result.status || "").toLowerCase();

			if (result.content || status === "completed") {
				return {
					status: result.status,
					content: result.content,
					sources: result.sources || [],
				};
			}

			if (status === "failed" || status === "error" || status === "cancelled") {
				throw new Error(`Tavily research ${status} for request ${requestId}.`);
			}

			await new Promise((resolve) =>
				setTimeout(resolve, RESEARCH_POLL_INTERVAL_MS)
			);
		}

		throw new Error(
			`Tavily research timed out before completing (request ${requestId}).`
		);
	},
	{
		name: "deep-research",
		description:
			"Run an in-depth, multi-source research task and return a cited report. Slower than web-search (can take up to a couple of minutes) — use it for complex questions that need synthesis across many sources, not quick lookups.",
		schema: z.object({
			query: z.string().describe("The research question or topic."),
			model: z
				.enum(["mini", "pro", "auto"])
				.optional()
				.describe("Research model depth (default 'auto')."),
			citationFormat: z
				.enum(["numbered", "mla", "apa", "chicago"])
				.optional()
				.describe("Citation style for the report (default 'numbered')."),
		}),
	}
);

const registry = {
	"web-search": webSearch,
	"deep-research": deepResearch,
};

export const getToolByName = (name) => registry[name] || null;
