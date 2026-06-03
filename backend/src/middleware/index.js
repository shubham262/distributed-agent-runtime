import { handleBetterAuth } from "../config/auth.js";

export const checkUserAuth = async (req, res, next) => {
	try {
		const auth = await handleBetterAuth();
		const sessionData = await auth.api.getSession({
			headers: req.headers,
		});
		if (!sessionData) {
			return res.status(403).json({
				message: "User is not authenticated, or session has expired",
			});
		}
		const { session, user } = sessionData;
		req.session = session;
		req.user = user;
		next();
	} catch (error) {
		console.log("error==>checkUserAuth", error);
		res.status(500).json({
			message: "Internal Servor Erorr",
			error,
		});
	}
};
