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
// server/app.ts
const express = require("express");
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const connect_1 = __importDefault(require("./db/connect"));
const fs_1 = __importDefault(require("fs"));
const sendEmail_1 = require("./utils/sendEmail"); // Your provided function
const emailtemplate_1 = require("./utils/emailtemplate"); // From previous example
// Import routes
const categoryroute_1 = __importDefault(require("./routes/categoryroute"));
const blogroute_1 = __importDefault(require("./routes/blogroute"));
const userroute_1 = __importDefault(require("./routes/userroute"));
const verifyroute_1 = __importDefault(require("./routes/verifyroute"));
const avatarroute_1 = __importDefault(require("./routes/avatarroute"));
const sessionmiddleware_1 = require("./middleware/sessionmiddleware");
const subscriptionroute_1 = __importDefault(require("./routes/subscriptionroute"));
// Load environment variables
dotenv_1.default.config();
const app = express();
// Middleware
app.use(express.json({ limit: '10mb' }));
app.use((0, cookie_parser_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.NEXT_PUBLIC_BASE_URL || 'https://tech-blog-frontend-git-main-ahmed-hassans-projects-96c42d63.vercel.app/',
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "withCredentials", "x-session-id"]
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const STORAGE_FILE = path_1.default.join(__dirname, 'storage.json');
// Helper function to read subscribers from JSON file
const readSubscribers = () => {
    try {
        if (!fs_1.default.existsSync(STORAGE_FILE)) {
            return [];
        }
        const data = fs_1.default.readFileSync(STORAGE_FILE, 'utf-8');
        return JSON.parse(data);
    }
    catch (error) {
        console.error('Error reading storage file:', error);
        return [];
    }
};
// Helper function to write subscribers to JSON file
const writeSubscribers = (subscribers) => {
    try {
        fs_1.default.writeFileSync(STORAGE_FILE, JSON.stringify(subscribers, null, 2));
    }
    catch (error) {
        console.error('Error writing to storage file:', error);
        throw new Error('Failed to save subscriber');
    }
};
// Helper function to check if email already exists
const isEmailAlreadySubscribed = (email) => {
    const subscribers = readSubscribers();
    return subscribers.some(sub => sub.email.toLowerCase() === email.toLowerCase());
};
// Helper function to add new subscriber
const addNewSubscriber = (email) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw new Error('Invalid email format');
        }
        // Check for duplicate email
        if (isEmailAlreadySubscribed(email)) {
            throw new Error('Email already subscribed');
        }
        // Create new subscriber object
        const newSubscriber = {
            email: email.toLowerCase(), // Store in lowercase for consistency
            subscribedAt: new Date().toISOString()
        };
        // Get existing subscribers and add new one
        const subscribers = readSubscribers();
        subscribers.push(newSubscriber);
        // Save to file
        writeSubscribers(subscribers);
        console.log(`New subscriber added: ${email}`);
        // Send welcome email (fire and forget - don't await)
        try {
            const { subject, text, html } = (0, emailtemplate_1.getWelcomeEmailTemplate)(email);
            (0, sendEmail_1.sendEmail)({ email, subject, text, html })
                .then(() => console.log(`Welcome email sent to: ${email}`))
                .catch((err) => console.error(`Failed to send welcome email to ${email}:`, err));
        }
        catch (emailError) {
            console.error('Error in email sending process:', emailError);
            // Don't throw error - subscription should still succeed even if email fails
        }
    }
    catch (error) {
        // Re-throw with more context if it's not already an Error object
        if (error instanceof Error) {
            throw error;
        }
        throw new Error('Unknown error occurred while adding subscriber');
    }
});
// API Route to handle subscription
app.post('/api/subscribe', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    //@ts-ignore
    const { email } = req.body;
    // Check if email is provided
    if (!email || typeof email !== 'string') {
        //@ts-ignore
        return res.status(400).json({
            success: false,
            error: 'Email address is required'
        });
    }
    try {
        // Add subscriber (this includes validation and email sending)
        yield addNewSubscriber(email);
        // Success response
        //@ts-ignore
        res.status(200).json({
            success: true,
            message: 'Successfully subscribed to the newsletter! A confirmation email has been sent.',
            data: { email }
        });
    }
    catch (error) {
        console.error('Subscription error:', error);
        // Handle different error types with appropriate status codes
        if (error.message === 'Email already subscribed') {
            //@ts-ignore
            return res.status(409).json({
                success: false,
                error: error.message
            });
        }
        if (error.message === 'Invalid email format') {
            //@ts-ignore
            return res.status(400).json({
                success: false,
                error: 'Please provide a valid email address'
            });
        }
        // Generic server error for other cases
        //@ts-ignore
        res.status(500).json({
            success: false,
            error: 'Internal server error. Please try again later.'
        });
    }
}));
// Start server
app.use('/uploads', express.static(path_1.default.join(__dirname, '../uploads')));
// Routes
app.use('/api/categories', categoryroute_1.default);
app.use('/api/blogs', blogroute_1.default);
app.use('/api/user', userroute_1.default);
app.use('/api/verify', verifyroute_1.default);
app.use("/api/avatar", avatarroute_1.default);
app.use('/api', subscriptionroute_1.default);
app.use(sessionmiddleware_1.sessionMiddleware);
(0, connect_1.default)();
app.listen(4001, () => {
    console.log(`Server is running on port 4001`);
});
exports.default = app;
