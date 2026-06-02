import { betterAuth } from "better-auth";
import { handleMongoDBConnection } from "./index.js";
import { mongodbAdapter } from "better-auth/adapters/mongodb";

let auth = null;
export const handleBetterAuth = async () => {
	if (auth) return auth;
	const { db } = await handleMongoDBConnection();
	auth = betterAuth({
		database: mongodbAdapter(db),
		emailAndPassword: {
			enabled: true,
		},
		secret: process.env.BETTER_AUTH_SECRET,

		baseURL: "http://localhost:3001",
		trustedOrigins: ["http://localhost:3000"],
	});
	return auth;
};
