"use client";

import React, { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

const normalizeMarkdown = (value) => {
	if (value == null || value === "") return "";
	if (typeof value === "string") return value;
	try {
		return `\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\``;
	} catch {
		return String(value);
	}
};

const markdownComponents = {
	h1: ({ children }) => (
		<h1 className="mb-4 mt-6 border-b border-slate-200 pb-2 text-2xl font-bold tracking-tight text-slate-900 first:mt-0">
			{children}
		</h1>
	),
	h2: ({ children }) => (
		<h2 className="mb-3 mt-6 text-xl font-semibold text-slate-900 first:mt-0">
			{children}
		</h2>
	),
	h3: ({ children }) => (
		<h3 className="mb-2 mt-5 text-lg font-semibold text-slate-900 first:mt-0">
			{children}
		</h3>
	),
	h4: ({ children }) => (
		<h4 className="mb-2 mt-4 text-base font-semibold text-slate-900 first:mt-0">
			{children}
		</h4>
	),
	p: ({ children }) => (
		<p className="mb-4 leading-7 text-slate-700 last:mb-0">{children}</p>
	),
	ul: ({ children }) => (
		<ul className="mb-4 list-disc space-y-2 pl-6 text-slate-700 last:mb-0">
			{children}
		</ul>
	),
	ol: ({ children }) => (
		<ol className="mb-4 list-decimal space-y-2 pl-6 text-slate-700 last:mb-0">
			{children}
		</ol>
	),
	li: ({ children }) => <li className="leading-7">{children}</li>,
	blockquote: ({ children }) => (
		<blockquote className="my-4 border-l-4 border-blue-200 bg-blue-50/60 px-4 py-3 text-slate-700">
			{children}
		</blockquote>
	),
	hr: () => <hr className="my-6 border-slate-200" />,
	a: ({ href, children }) => (
		<a
			href={href}
			target="_blank"
			rel="noopener noreferrer"
			className="font-medium text-blue-600 underline decoration-blue-300 underline-offset-2 transition hover:text-blue-700"
		>
			{children}
		</a>
	),
	strong: ({ children }) => (
		<strong className="font-semibold text-slate-900">{children}</strong>
	),
	em: ({ children }) => <em className="italic text-slate-700">{children}</em>,
	table: ({ children }) => (
		<div className="my-4 overflow-x-auto rounded-xl border border-slate-200">
			<table className="w-full min-w-full border-collapse text-sm">
				{children}
			</table>
		</div>
	),
	thead: ({ children }) => (
		<thead className="bg-slate-50 text-slate-900">{children}</thead>
	),
	th: ({ children }) => (
		<th className="border-b border-slate-200 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide">
			{children}
		</th>
	),
	td: ({ children }) => (
		<td className="border-b border-slate-100 px-4 py-2.5 text-slate-700">
			{children}
		</td>
	),
	tr: ({ children }) => (
		<tr className="transition hover:bg-slate-50/80">{children}</tr>
	),
	pre: ({ children }) => (
		<div className="my-4 overflow-hidden rounded-xl border border-slate-800/80 shadow-sm last:mb-0">
			{children}
		</div>
	),
	code: ({ className, children, ...props }) => {
		const match = /language-(\w+)/.exec(className || "");
		const code = String(children).replace(/\n$/, "");

		if (match) {
			return (
				<SyntaxHighlighter
					language={match[1]}
					style={oneDark}
					PreTag="div"
					customStyle={{
						margin: 0,
						padding: "1rem 1.25rem",
						background: "#0f172a",
						fontSize: "0.8125rem",
						lineHeight: 1.6,
					}}
				>
					{code}
				</SyntaxHighlighter>
			);
		}

		if (className) {
			return (
				<code className={className} {...props}>
					{children}
				</code>
			);
		}

		return (
			<code
				className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[0.9em] text-rose-600"
				{...props}
			>
				{children}
			</code>
		);
	},
};

const MarkdownContent = ({ content, className = "" }) => {
	const markdown = useMemo(() => normalizeMarkdown(content), [content]);

	if (!markdown) return null;

	return (
		<div
			className={`markdown-content text-[15px] text-slate-700 ${className}`.trim()}
		>
			<ReactMarkdown
				remarkPlugins={[remarkGfm]}
				components={markdownComponents}
			>
				{markdown}
			</ReactMarkdown>
		</div>
	);
};

export default MarkdownContent;
