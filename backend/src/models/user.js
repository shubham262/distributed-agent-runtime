import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
	{
		name: {
			type: String,
			required: true,
			trim: true,
		},
		email: {
			type: String,
			required: true,
			trim: true,
		},
		emailVerified: {
			type: Boolean,
			default: false,
		},
		telegram: {
			type: mongoose.Schema.Types.Mixed,
			default: {},
			required: false,
		},
	},
	{ timestamps: true }
);

const User = mongoose.model("User", userSchema, "user");
export default User;
