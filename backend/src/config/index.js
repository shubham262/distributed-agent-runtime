import { MongoClient } from "mongodb";
import mongoose from "mongoose";

const database = process.env.DATABASE;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/ai_orchestration";

let cachedConnection = null;
export const handleMongoDBConnection = async () => {
	try {
		if (cachedConnection) return cachedConnection;
		await mongoose.connect(MONGO_URI);
		const client = new MongoClient(MONGO_URI);
		await client.connect();
		const db = client.db(database);
		cachedConnection = { db, client };
		console.log("mongodb connection successfull");
		return cachedConnection;
	} catch (error) {
		console.log("error==>handleMongoDBConnection", error);
	}
};
