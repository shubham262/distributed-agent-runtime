import axios from "axios";
import db from "../models/index.js";
import mongoose from "mongoose";
import { executeMasterAgentQuery } from "../service/masterAgentService.js";

const { User } = db;

export const sendBotReply = async (chatId, text) => {
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

		console.log(
			`📩 Received Telegram Message from [Chat ID: ${message.chat.id}]:`,
			message.text
		);
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
							message.from.username ||
							(
								(message.from.first_name || "") +
								" " +
								(message.from.last_name || "")
							).trim() ||
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

			await sendBotReply(
				chatId,
				`✨ *AgentOS Pipeline Linked!*\n\nHello *${updatedUser.name}*,\nYour messaging tunnel is fully integrated. You can now talk to me naturally to perform CRUD actions on your workflows, list your agents, query system metrics, or run background processes!`
			);

			console.log(
				`📡 Linked Telegram Node: Chat ID [${chatId}] mapped to Database User ID [${userId}]`
			);
			return;
		}

		const userScope = await User.findOne({ "telegram.chatId": String(chatId) });

		if (!userScope) {
			await sendBotReply(
				chatId,
				"🔒 *Access Forbidden:*\nYour Telegram endpoint has not been linked to an active user container context.\n\nPlease authenticate and export your connection link parameter token from your secure web dashboard canvas."
			);
			return;
		}

		// Pass conversation downstream into the tool-binding LangGraph system
		const agentOutputSummary = await executeMasterAgentQuery(
			userScope._id,
			chatId,
			text,
			userScope
		);

		// Transmit final processed analytical feedback payload directly back to the user
		await sendBotReply(chatId, agentOutputSummary);
	} catch (error) {
		console.error("🚨 Telegram Webhook Runtime Crash:", error);
	}
};
