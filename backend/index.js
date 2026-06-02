import express from "express";
import cors from "cors";
import { handleBetterAuth } from "./src/config/auth.js";
import { toNodeHandler } from "better-auth/node";
const app = express();
const auth = await handleBetterAuth();
const PORT = process.env.PORT || 3001;

const corsOptions = {
	origin: ["http://localhost:3000"],
	credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use("/api/auth", toNodeHandler(auth));
app.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`);
});
