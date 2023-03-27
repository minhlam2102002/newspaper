import { registerAs } from "@nestjs/config";
import SMTPTransport from "nodemailer/lib/smtp-transport";

export default registerAs('email', () => ({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
}) as SMTPTransport.Options);