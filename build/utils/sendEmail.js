"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const sendEmail = (options) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!process.env.SMTP_USER)
            throw new Error("SMTP_USER is required");
        if (!process.env.SMTP_PASS)
            throw new Error("SMTP_PASS is required");
        const transporter = nodemailer_1.default.createTransport({
            service: "gmail",
            pool: true,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
            maxConnections: 5,
            maxMessages: 10,
            logger: process.env.NODE_ENV !== "production",
            debug: process.env.NODE_ENV !== "production",
        });
        const mailOptions = {
            from: `"${process.env.EMAIL_FROM_NAME || "Mail"}" <${process.env.SMTP_USER}>`,
            to: options.email,
            subject: options.subject,
            text: options.text,
            html: options.html || options.text,
            headers: {
                "X-Priority": "1",
                "X-Mailer": "MyAppMailer",
            },
        };
        const info = yield transporter.sendMail(mailOptions);
        console.log(`Email sent to ${options.email}`, info.messageId);
        if (process.env.NODE_ENV === "production") {
            // Production-specific logging
            console.log(JSON.stringify({
                event: "email_sent",
                level: "info",
                timestamp: new Date().toISOString(),
                recipient: options.email,
                subject: options.subject,
                messageId: info.messageId,
                service: "gmail"
            }));
        }
    }
    catch (error) {
        const errorMessage = `Failed to send email to ${options.email}: ${error instanceof Error ? error.message : String(error)}`;
        console.error(errorMessage);
        if (process.env.NODE_ENV === "production") {
            console.error(JSON.stringify({
                event: "email_failed",
                level: "error",
                timestamp: new Date().toISOString(),
                recipient: options.email,
                subject: options.subject,
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined
            }));
        }
        throw new Error(errorMessage);
    }
});
exports.sendEmail = sendEmail;
