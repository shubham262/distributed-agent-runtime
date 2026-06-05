import { Suspense } from "react";
import Runs from "@/views/dashboard/Runs";

export const metadata = {
	title: "Execution History",
	description: "View all workflow runs and execution logs.",
};

export default function RunsPage() {
	return (
		<Suspense fallback={<div className="p-8 text-slate-500">Loading runs...</div>}>
			<Runs />
		</Suspense>
	);
}
