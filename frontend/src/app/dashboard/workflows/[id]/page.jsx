import WorkflowBuilder from "@/views/workflows/WorkflowBuilder";

export const metadata = {
	title: "Edit Workflow",
	description: "Open an existing workflow in the builder",
};

export default function Page() {
	return <WorkflowBuilder />;
}
