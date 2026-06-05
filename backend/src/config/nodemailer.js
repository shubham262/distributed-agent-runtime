import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SENDERS_EMAIL_ID,
    pass: process.env.SENDERS_PASSWORD,
  },
});

export default transporter;
