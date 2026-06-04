import React, { useCallback } from "react";
import { Button, Dropdown, Badge, Tag } from "antd";
import {
	FiMenu,
	FiChevronDown,
	FiSettings,
	FiKey,
	FiLogOut,
	FiActivity,
} from "react-icons/fi";
import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";
// import Logo from "../Logo";
import { nameShortner } from "@/helper";
import { authClient } from "@/config/auth";

const Header = ({ onOpenMobileMenu }) => {
	const router = useRouter();
	const authInfo = useSelector((state) => state.auth);
	const { userInfo } = authInfo || {};

	// 🚀 Shared session logout sequence matching the sidebar logic
	const handleLogout = useCallback(async () => {
		try {
			await authClient.signOut();
			localStorage.clear();
			router.push(`/`);
		} catch (error) {
			console.error("Header sign out exception:", error);
		}
	}, [router]);

	// 🚀 Interactive user profile dropdown navigation items
	const menuItems = [
		{
			key: "profile",
			label: (
				<div className="flex flex-col px-1 py-1.5 min-w-[140px] font-sans">
					<p className="text-xs font-semibold text-slate-900 leading-none mb-1">
						{userInfo?.name || "Operator"}
					</p>
					<p className="text-[10px] text-slate-400 font-medium truncate">
						{userInfo?.email || "active_session"}
					</p>
				</div>
			),
		},
		{ type: "divider" },
		{
			key: "settings",
			icon: <FiSettings size={14} className="text-slate-500" />,
			label: (
				<span className="text-sm text-slate-600 font-medium font-sans">
					Settings
				</span>
			),
			onClick: () => router.push("/dashboard/settings"),
		},
		{
			key: "api-keys",
			icon: <FiKey size={14} className="text-slate-500" />,
			label: (
				<span className="text-sm text-slate-600 font-medium font-sans">
					API Infrastructure
				</span>
			),
			onClick: () => router.push("/dashboard/keys"),
		},
		{ type: "divider" },
		{
			key: "logout",
			icon: <FiLogOut size={14} className="text-red-500" />,
			label: (
				<span className="text-sm text-red-600 font-semibold font-sans">
					Sign Out
				</span>
			),
			onClick: handleLogout,
		},
	];

	return (
		<header className="flex items-center justify-between md:justify-between px-6 h-16 bg-white border-b border-slate-100 select-none font-sans z-30 shrink-0">
			{/* 1. MOBILE RESPONSIVE LAYER BOUNDS */}
			<div className="flex md:hidden items-center space-x-2">
				<Button
					type="text"
					icon={<FiMenu size={22} />}
					onClick={onOpenMobileMenu}
					className="text-slate-600 px-0 hover:bg-transparent flex items-center justify-center"
				/>
				{/* <Logo /> */}
			</div>

			{/* 2. SYSTEM STATUS TELEMETRY TABS (Desktop Context Anchor) */}
			<div className="hidden md:flex items-center space-x-3">
				<Tag className="bg-slate-50 border-slate-100 text-slate-600 font-medium text-xs px-2.5 py-0.5 rounded-md flex items-center gap-1.5">
					<span className="text-slate-400 font-normal">Workspace:</span> Default
				</Tag>
				<div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-slate-50 border border-slate-100 px-2.5 py-0.5 rounded-md">
					<Badge status="processing" size="small" />
					<span>Worker Cluster Active</span>
				</div>
			</div>

			{/* 3. PROFILE GATEWAY CONTROL COMPONENT */}
			<div className="flex items-center space-x-4">
				<Dropdown
					menu={{ items: menuItems }}
					trigger={["click"]}
					placement="bottomRight"
					overlayClassName="shadow-lg border border-slate-50 rounded-lg"
				>
					<div className="flex items-center space-x-2.5 cursor-pointer group py-1.5 pl-2 pr-1 rounded-lg hover:bg-slate-50 transition-colors">
						{/* Avatar Node Wrapper */}
						<div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs shadow-sm transition-transform group-hover:scale-95">
							{nameShortner(userInfo?.name || "")}
						</div>

						{/* Context label text details */}
						<div className="hidden sm:flex flex-col text-left">
							<span className="text-sm font-semibold text-slate-700 leading-none mb-0.5 group-hover:text-blue-600 transition-colors">
								{userInfo?.name ? userInfo.name.split(" ")[0] : "Account"}
							</span>
							<span className="text-[10px] text-slate-400 font-medium leading-none">
								Operator
							</span>
						</div>

						<FiChevronDown
							size={14}
							className="text-slate-400 group-hover:text-slate-600 transition-colors hidden sm:block"
						/>
					</div>
				</Dropdown>
			</div>
		</header>
	);
};

export default Header;
