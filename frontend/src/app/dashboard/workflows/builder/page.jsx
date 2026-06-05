import WorkflowBuilder from "@/views/workflows/WorkflowBuilder";

export const metadata = {
	title: "Workflow Builder",
	description: "Design and edit AI workflows visually",
};

export default function Page() {
	return <WorkflowBuilder />;
}
