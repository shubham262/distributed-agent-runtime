import { AzureChatOpenAI } from "@langchain/openai";

const openAiClient = new AzureChatOpenAI({
	azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
	azureOpenAIApiInstanceName: process.env.AZURE_OPENAI_API_INSTANCE_NAME,
	azureOpenAIApiDeploymentName: "gpt-4o-mini",
	azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION,
	temperature: 0.3,
});

export { openAiClient };
