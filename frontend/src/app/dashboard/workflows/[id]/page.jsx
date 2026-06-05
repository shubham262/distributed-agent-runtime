import WorkflowDetail from "@/views/workflows/WorkflowDetail";

export const metadata = {
	title: "Edit Workflow",
	description: "Open an existing workflow in the builder",
};

export default function Page({ params }) {
	return <WorkflowDetail />;
}
