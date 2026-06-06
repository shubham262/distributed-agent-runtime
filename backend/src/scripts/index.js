import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const registerTelegramWebhook = async () => {
	// 1. Capture arguments from terminal execution (e.g., node registerWebhook.js https://xxxx.ngrok-free.app)
	const tunnelUrl = process.argv[2];
	const token = process.env.TELEGRAM_BOT_TOKEN;
	console.log(`🚀 Starting Telegram Webhook Registration Script...`, token);
	if (!tunnelUrl) {
		console.error("🚨 Error: Missing target host URL parameter.");
		console.log(
			"Usage: node src/scripts/registerWebhook.js https://your-tunnel-url.ngrok-free.app"
		);
		process.exit(1);
	}

	if (!token) {
		console.error(
			"🚨 Error: TELEGRAM_BOT_TOKEN environment variable is undefined."
		);
		process.exit(1);
	}

	// Standard public path pointing to your Express routing mount block
	const webhookUrl = `${tunnelUrl.replace(/\/$/, "")}/api/telegram/webhook`;
	const registrationApi = `https://api.telegram.org/bot${token}/setWebhook`;

	try {
		console.log(`🌐 Initializing registration handshake with Telegram...`);
		console.log(`🔗 Target Webhook URL: ${webhookUrl}`);

		const response = await axios.post(registrationApi, { url: webhookUrl });

		if (response.data.ok) {
			console.log(`✅ Success: ${response.data.description}`);
		} else {
			console.log(`⚠️ Configuration Refused:`, response.data);
		}
	} catch (error) {
		console.error(
			`🚨 Registration Exception:`,
			error.response?.data || error.message
		);
	}
};

registerTelegramWebhook();
