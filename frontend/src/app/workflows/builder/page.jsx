import Login from "@/views/auth/Login";

export const metadata = {
	title: "Create and Orchestrate AI Workflows Seamlessly",
	description:
		"Welcome to the AI Workflow Builder, your intuitive platform for designing, managing, and orchestrating complex AI workflows with ease. Whether you're a data scientist, machine learning engineer, or AI enthusiast, our builder empowers you to create sophisticated AI pipelines without writing a single line of code. With a user-friendly drag-and-drop interface, seamless integration with popular AI tools and frameworks, and robust monitoring capabilities, you can focus on innovating and optimizing your AI solutions while we handle the heavy lifting. Start building your AI workflows today and unlock the full potential of your AI projects!",
};

export default function Home() {
	return <Login />;
}
