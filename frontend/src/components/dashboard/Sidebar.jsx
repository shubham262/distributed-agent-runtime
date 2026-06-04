import Link from "next/link";
import React, { useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
	FiActivity,
	FiGitBranch,
	FiCpu,
	FiList,
	FiLogOut,
} from "react-icons/fi";
import { authClient } from "@/config/auth";

// 🚀 Expanded navigation links mapping exactly to your platform views
const navLinks = [
	{ href: "/dashboard/overview", icon: FiActivity, label: "Overview" },
	{ href: "/dashboard/workflows", icon: FiGitBranch, label: "Workflows" },
	{ href: "/dashboard/agents", icon: FiCpu, label: "Agents" },
	{ href: "/dashboard/runs", icon: FiList, label: "Execution History" },
];

const SidebarContent = () => {
	const pathname = usePathname();
	const router = useRouter();

	const handleLogout = useCallback(async () => {
		try {
			await authClient.signOut();
			localStorage.clear();
			router.push(`/`);
		} catch (error) {
			console.error("Logout failed:", error);
		}
	}, [router]);

	return (
		<div className="flex flex-col h-full bg-white border-r border-slate-100 font-sans select-none">
			{/* 1. BRANDING/LOGO SECTION - Matching Landing Page Header */}
			<div className="flex items-center space-x-3 px-6 h-16 border-b border-slate-100 flex-shrink-0">
				<div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white text-lg shadow-sm">
					<FiCpu />
				</div>
				<span className="text-lg font-semibold tracking-tight text-slate-900">
					Agent<span className="text-blue-600 font-medium">OS</span>
				</span>
			</div>

			{/* 2. MAIN NAVIGATION LINK STACK */}
			<div className="flex-1 px-4 py-6 overflow-y-auto space-y-1">
				{navLinks.map((link) => {
					// Smart active path checking (e.g. highlights Workflows even if viewing a specific workflow canvas ID)
					const isActive =
						pathname === link.provider || pathname?.startsWith(link.href);
					const Icon = link.icon;

					return (
						<Link
							key={link.href}
							href={link.href}
							className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all font-medium text-sm ${
								isActive
									? "bg-blue-50 text-blue-600"
									: "text-slate-600 hover:bg-slate-50 hover:text-blue-600"
							}`}
						>
							<Icon
								size={18}
								className={
									isActive
										? "text-blue-600"
										: "text-slate-400 group-hover:text-blue-600"
								}
							/>
							<span>{link.label}</span>
						</Link>
					);
				})}
			</div>

			{/* 3. SIGN OUT SECTION FOOTER */}
			<div className="p-4 border-t border-slate-100 bg-white flex-shrink-0">
				<button
					onClick={handleLogout}
					className="flex items-center space-x-3 px-4 py-3 w-full text-left text-sm text-slate-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors font-medium group"
				>
					<FiLogOut
						size={18}
						className="text-slate-400 group-hover:text-red-600 transition-colors"
					/>
					<span>Sign Out</span>
				</button>
			</div>
		</div>
	);
};

export default SidebarContent;
