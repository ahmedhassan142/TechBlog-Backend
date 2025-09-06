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
exports.resendVerification = exports.verifyEmail = void 0;
const usermodel_js_1 = require("../models/usermodel.js");
const token_js_1 = require("../models/token.js");
const sendEmail_js_1 = require("../utils/sendEmail.js");
const crypto_1 = __importDefault(require("crypto"));
const verifyEmail = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId, token } = req.query;
        if (!userId || !token) {
            return res.status(400).json({
                success: false,
                message: "Missing verification parameters"
            });
        }
        const verificationToken = yield token_js_1.Token.findOneAndDelete({
            userId,
            token,
            expiresAt: { $gt: new Date() }
        });
        if (!verificationToken) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired verification link"
            });
        }
        const user = yield usermodel_js_1.User.findByIdAndUpdate(userId, { verified: true, verificationLinkSent: false }, { new: true });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }
        return res.status(200).json({
            success: true,
            message: "Email verified successfully"
        });
    }
    catch (error) {
        console.error("Verification error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error during verification"
        });
    }
});
exports.verifyEmail = verifyEmail;
const resendVerification = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({
                message: "Email is required",
                field: "email"
            });
        }
        // Find user by email
        const user = yield usermodel_js_1.User.findOne({ email: email.toLowerCase().trim() });
        if (!user) {
            return res.status(404).json({
                message: "User with this email does not exist",
                field: "email"
            });
        }
        if (user.verified) {
            return res.status(400).json({
                message: "Email is already verified",
                field: "email"
            });
        }
        // Check if a verification was recently sent (prevent spam)
        const recentToken = yield token_js_1.Token.findOne({
            userId: user._id,
            createdAt: { $gt: new Date(Date.now() - 5 * 60000) } // Within last 5 minutes
        });
        if (recentToken) {
            return res.status(429).json({
                message: "Verification email was recently sent. Please wait before requesting another.",
                field: "email"
            });
        }
        // Delete any existing tokens for this user
        yield token_js_1.Token.deleteMany({ userId: user._id });
        // Create new verification token
        const token = yield new token_js_1.Token({
            userId: user._id,
            token: crypto_1.default.randomBytes(32).toString("hex"),
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
        }).save();
        // Create verification URL
        const verificationUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/verifyemail?userId=${user._id}&token=${token.token}`;
        // Send verification email
        yield (0, sendEmail_js_1.sendEmail)({
            email: user.email,
            subject: "Verify Your Email",
            text: `Please click this link to verify your email: ${verificationUrl}`,
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Email Verification</h2>
          <p>Please click the button below to verify your email address:</p>
          <a href="${verificationUrl}" 
             style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px;">
            Verify Email
          </a>
          <p>Or copy and paste this link in your browser:</p>
          <p>${verificationUrl}</p>
          <p>This link will expire in 1 hour.</p>
        </div>
      `
        });
        // Update user record
        user.verificationLinkSent = true;
        yield user.save();
        return res.status(200).json({
            message: `Verification email sent to ${user.email}`
        });
    }
    catch (error) {
        console.error("Error in resendVerification:", error);
        return res.status(500).json({
            message: "Internal server error",
            error: error instanceof Error ? error.message : "Unknown error"
        });
    }
});
exports.resendVerification = resendVerification;
