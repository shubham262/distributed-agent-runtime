"use client";
import SidebarContent from "@/components/dashboard/Sidebar";
import { Drawer, Spin } from "antd";
import Header from "@/components/dashboard/Header";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { authClient } from "@/config/auth";
// import { updateUserInfo } from "@/redux/authSlice";
// import { useDispatch } from "react-redux";
// import { serializeUser } from "@/helper";

const DashboardLayout = ({ children }) => {
	const pathname = usePathname();
	// const dispatch = useDispatch();
	const router = useRouter();
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	// const { data, isPending, refetch } = authClient.useSession();

	// useEffect(() => {
	// 	if (!isPending && !data) {
	// 		return router.push("/signin");
	// 	}
	// 	if (data) {
	// 		dispatch(updateUserInfo(serializeUser(data.user)));
	// 	}
	// }, [isPending, dispatch, data, router]);

	// if (isPending) {
	// 	return (
	// 		<div className="flex h-screen bg-blue-50/30 overflow-hidden font-sans">
	// 			<Spin />
	// 		</div>
	// 	);
	// }

	return (
		<div className="flex h-screen bg-blue-50/30 overflow-hidden font-sans">
			<aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-100 shadow-sm z-10 shrink-0">
				<SidebarContent />
			</aside>

			<div className="flex-1 flex flex-col h-full overflow-hidden relative">
				<Header onOpenMobileMenu={() => setMobileMenuOpen(true)} />

				<main className="flex-1 overflow-y-auto p-4 md:p-8">
					<div className="max-w-7xl mx-auto h-full">{children}</div>
				</main>
			</div>

			<Drawer
				placement="left"
				onClose={() => setMobileMenuOpen(false)}
				open={mobileMenuOpen}
				styles={{ body: { padding: 0 } }}
				size={260}
				className="md:hidden"
			>
				<SidebarContent />
			</Drawer>
		</div>
	);
};

export default DashboardLayout;
