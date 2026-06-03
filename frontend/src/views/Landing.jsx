"use client";
import React from "react";
import { Button, Tag, Badge, Divider } from "antd";
import {
	FiCpu,
	FiGitBranch,
	FiActivity,
	FiArrowRight,
	FiLayers,
} from "react-icons/fi";
import { useRouter } from "next/navigation";

const Landing = () => {
	const router = useRouter();
	const handleNavigation = (path) => {
		router.push(path);
	};

	return (
		<div className="min-h-screen bg-white text-slate-800 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-600">
			
			<header className="w-full bg-white border-b border-slate-100 sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
				<div
					className="flex items-center gap-3 cursor-pointer"
					onClick={() => handleNavigation("/")}
				>
					<div className="w-9 h-9 bg-blue-600 rounded flex items-center justify-center shadow-sm text-white text-xl">
						<FiCpu />
					</div>
					<span className="text-xl font-semibold tracking-tight text-slate-900">
						Agent<span className="text-blue-600 font-medium">OS</span>
					</span>
				</div>

				<nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
					<a href="#features" className="hover:text-blue-600 transition-colors">
						Features
					</a>
					<a
						href="#architecture"
						className="hover:text-blue-600 transition-colors"
					>
						Architecture
					</a>
					<a
						href="#telemetry"
						className="hover:text-blue-600 transition-colors"
					>
						Telemetry
					</a>
				</nav>

				<div className="flex items-center gap-4">
					<Button
						type="text"
						className="text-slate-600 font-medium hover:text-blue-600"
						onClick={() => handleNavigation("/signin")}
					>
						Sign In
					</Button>
					<Button
						type="primary"
						size="middle"
						className="bg-blue-600 hover:bg-blue-500 shadow-sm border-none font-medium h-9"
						onClick={() => handleNavigation("/signup")}
					>
						Get Started
					</Button>
				</div>
			</header>

			{/* 2. HERO SECTION */}
			<section className="w-full max-w-6xl mx-auto px-6 py-16 md:py-28 flex flex-col items-center text-center">
				<div className="mb-6">
					<Tag
						color="processing"
						className="px-3 py-1 text-xs font-medium border-blue-100 rounded-full text-blue-600 bg-blue-50"
					>
						<span className="flex items-center gap-1.5">
							<Badge status="processing" /> Distributed Runtime Active
						</span>
					</Tag>
				</div>

				<h1 className="text-4xl md:text-6xl font-bold tracking-tight text-slate-900 max-w-3xl leading-tight">
					Orchestrate Multi-Agent Workflows at scale
				</h1>

				<p className="mt-6 text-lg text-slate-500 max-w-2xl leading-relaxed">
					Design complex, resilient agent topologies on a visual drag-and-drop
					canvas. Compile blueprints instantly into stateful background workers
					powered by LangGraph and Redis.
				</p>

				<div className="mt-10 flex flex-col sm:flex-row items-center gap-4 justify-center w-full">
					<Button
						type="primary"
						size="large"
						className="bg-blue-600 hover:bg-blue-500 shadow-md border-none font-medium px-8 h-12 text-base flex items-center gap-2 w-full sm:w-auto justify-center"
						onClick={() => handleNavigation("/signup")}
					>
						Get Started Free <FiArrowRight />
					</Button>
					<Button
						size="large"
						className="text-slate-600 border-slate-200 hover:border-blue-600 hover:text-blue-600 font-medium px-8 h-12 text-base w-full sm:w-auto justify-center"
						onClick={() =>
							document
								.getElementById("features")
								.scrollIntoView({ behavior: "smooth" })
						}
					>
						Explore Docs
					</Button>
				</div>

				{/* Minimal Blueprint Canvas Preview Element */}
				<div className="w-full mt-16 border border-slate-100 bg-slate-50 rounded-xl p-4 md:p-6 flex flex-col shadow-inner">
					<div className="flex items-center justify-between border-b border-slate-200/60 pb-3 mb-4 text-xs font-mono text-slate-400">
						<div className="flex items-center gap-2">
							<span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span>
							<span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span>
							<span>visual_topology_compiler.json</span>
						</div>
						<span className="text-blue-600 font-medium">
							Status: Operational
						</span>
					</div>
					<div className="h-44 md:h-64 flex items-center justify-center gap-4 md:gap-12 flex-col md:flex-row py-4">
						<div className="bg-white border border-slate-200 p-4 rounded-lg shadow-sm flex items-center gap-3 w-56">
							<div className="w-8 h-8 bg-blue-50 text-blue-600 rounded flex items-center justify-center text-lg">
								<FiCpu />
							</div>
							<div className="text-left">
								<p className="text-xs font-semibold text-slate-900">
									Supervisor Node
								</p>
								<p className="text-[10px] text-slate-400">gpt-4o-mini</p>
							</div>
						</div>
						<div className="h-0.5 w-8 border-t border-dashed border-slate-300 relative hidden md:block">
							<span className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-blue-500"></span>
						</div>
						<div className="bg-white border border-slate-200 p-4 rounded-lg shadow-sm flex items-center gap-3 w-56">
							<div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded flex items-center justify-center text-lg">
								<FiLayers />
							</div>
							<div className="text-left">
								<p className="text-xs font-semibold text-slate-900">
									Action Subagent
								</p>
								<p className="text-[10px] text-slate-400">Tools: web-search</p>
							</div>
						</div>
					</div>
				</div>
			</section>

			<Divider className="my-0 border-slate-100" />

			
			<section
				id="features"
				className="w-full max-w-6xl mx-auto px-6 py-20 flex flex-col gap-12"
			>
				<div className="flex flex-col items-center text-center">
					<h2 className="text-3xl font-bold tracking-tight text-slate-900">
						Engineered for high-fidelity autonomy
					</h2>
					<p className="mt-3 text-slate-500 max-w-xl">
						A secure foundation built to move workloads cleanly out of your main
						loop and into high-speed isolated threads.
					</p>
				</div>

				
				<div className="w-full flex flex-col md:flex-row gap-6 items-stretch mt-6">
					<div className="flex-1 bg-white border border-slate-100 rounded-xl p-8 flex flex-col gap-4 shadow-sm hover:border-slate-200 transition-colors">
						<div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center text-xl">
							<FiGitBranch />
						</div>
						<h3 className="text-lg font-semibold text-slate-900">
							Dynamic State Graph
						</h3>
						<p className="text-slate-500 text-sm leading-relaxed">
							Compile your visual canvas directly into executable LangGraph
							architecture. Maintain state, design custom loops, and compile
							paths cleanly without touching server files.
						</p>
					</div>

					<div className="flex-1 bg-white border border-slate-100 rounded-xl p-8 flex flex-col gap-4 shadow-sm hover:border-slate-200 transition-colors">
						<div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center text-xl">
							<FiLayers />
						</div>
						<h3 className="text-lg font-semibold text-slate-900">
							Asynchronous Queuing
						</h3>
						<p className="text-slate-500 text-sm leading-relaxed">
							Backed by BullMQ and Redis. Offload long-running generation cycles
							safely from Express requests to independent worker processes with
							built-in exponential failure retry logic.
						</p>
					</div>

					<div className="flex-1 bg-white border border-slate-100 rounded-xl p-8 flex flex-col gap-4 shadow-sm hover:border-slate-200 transition-colors">
						<div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center text-xl">
							<FiActivity />
						</div>
						<h3 className="text-lg font-semibold text-slate-900">
							Token-Level Telemetry
						</h3>
						<p className="text-slate-500 text-sm leading-relaxed">
							Trace execution steps dynamically. Monitor intermediate model
							execution logs, track token usage, and aggregate operation costs
							atomically inside MongoDB for strict account auditing.
						</p>
					</div>
				</div>
			</section>

			
			<section className="w-full bg-slate-50 border-t border-b border-slate-100 py-16 px-6 flex flex-col items-center text-center">
				<h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
					Ready to build your autonomous workspace?
				</h2>
				<p className="mt-3 text-slate-500 max-w-md text-sm md:text-base">
					Sign up now to configure custom agents, stream live telemetry, and
					scale background worker tasks effortlessly.
				</p>
				<div className="mt-8">
					<Button
						type="primary"
						size="large"
						className="bg-blue-600 hover:bg-blue-500 shadow-md border-none font-medium px-8 h-12 text-base flex items-center gap-2"
						onClick={() => handleNavigation("/signup")}
					>
						Get Started Instantly <FiArrowRight />
					</Button>
				</div>
			</section>

			
			<footer className="w-full max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4 mt-auto">
				<p>© 2026 AgentOS Platform Runtime Inc. South India Cloud Region.</p>
				<div className="flex items-center gap-6">
					<a href="#terms" className="hover:text-blue-600 transition-colors">
						Terms of Service
					</a>
					<a href="#privacy" className="hover:text-blue-600 transition-colors">
						Privacy Infrastructure
					</a>
				</div>
			</footer>
		</div>
	);
};

export default Landing;
