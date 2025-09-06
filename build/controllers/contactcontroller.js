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
exports.contactController = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const contactController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, email, message } = req.body;
        // Validate input
        if (!name || !email || !message) {
            return res.status(400).json({
                success: false,
                error: 'All fields are required: name, email, message'
            });
        }
        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                error: 'Please provide a valid email address'
            });
        }
        // Create transporter
        const transporter = nodemailer_1.default.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
        // Email to admin (ah770643@gmail.com)
        const adminEmail = 'ah770643@gmail.com';
        yield transporter.sendMail({
            from: process.env.SMTP_USER,
            to: adminEmail,
            subject: `New Contact Form Submission from ${name}`,
            text: `
        Name: ${name}
        Email: ${email}
        Message: ${message}
      `,
            html: `
        <h2>New Contact Request</h2>
        <p><strong>From:</strong> ${name} (${email})</p>
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, '<br>')}</p>
      `
        });
        // Optional: Send confirmation to user
        yield transporter.sendMail({
            from: process.env.SMTP_USER,
            to: email,
            subject: 'We received your message!',
            text: `Thank you ${name} for contacting us! We'll get back to you soon.`,
            html: `
        <h2>Thank you for reaching out, ${name}!</h2>
        <p>We've received your message and will respond shortly.</p>
        <p><strong>Your message:</strong></p>
        <p>${message.replace(/\n/g, '<br>')}</p>
      `
        });
        return res.status(200).json({
            success: true,
            message: 'Message sent successfully'
        });
    }
    catch (error) {
        console.error('Error sending email:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to send message',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.contactController = contactController;
