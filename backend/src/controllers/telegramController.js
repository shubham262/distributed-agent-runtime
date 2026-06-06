import axios from "axios";
import db from "../models/index.js";
import mongoose from "mongoose";
const { User } = db;

const sendBotReply = async (chatId, text) => {
	const token = process.env.TELEGRAM_BOT_TOKEN;
	const url = `https://api.telegram.org/bot${token}/sendMessage`;
	try {
		await axios.post(url, {
			chat_id: String(chatId),
			text,
			parse_mode: "Markdown",
		});
	} catch (err) {
		console.error(
			`🚨 Failed to dispatch bot reply to chat [${chatId}]:`,
			err.message
		);
	}
};

export const handleTelegramWebhook = async (req, res) => {
	try {
		const { message } = req.body;

		res.status(200).send("OK");

		if (!message || !message.text) return;

		console.log(`📩 Received Telegram Message:`, message);
		const chatId = message.chat.id;
		const text = message.text.trim();

		if (text.startsWith("/start")) {
			const segments = text.split(" ");
			const userId = segments[1];

			if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
				await sendBotReply(
					chatId,
					"❌ *Connection Aborted:*\nThe authentication payload signature is malformed or missing."
				);
				return;
			}

			const updatedUser = await User.findByIdAndUpdate(
				userId,
				{
					telegram: {
						chatId: String(chatId),
						username:
							message.from.first_name + " " + message.from.last_name ||
							"Anonymous",
						connectedAt: new Date(),
					},
				},
				{ returnDocument: "after" }
			);

			if (!updatedUser) {
				await sendBotReply(
					chatId,
					"❌ *Linkage Failed:*\nNo workspace account on our platform matches this registration code."
				);
				return;
			}

			// 5. Fire an authorization receipt confirmation straight back to their phone
			await sendBotReply(
				chatId,
				`✨ *AgentOS Pipeline Linked!*\n\nHello *${updatedUser.name}*,\nYour messaging tunnel is fully integrated. Background workflow nodes will now route execution summaries and diagnostic telemetry parameters directly to this secure channel.`
			);

			console.log(
				`📡 Linked Telegram Node: Chat ID [${chatId}] mapped to Database User ID [${userId}]`
			);
		}
	} catch (error) {
		console.error("🚨 Telegram Webhook Runtime Crash:", error);
	}
};
