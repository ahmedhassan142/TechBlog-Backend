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
const crypto_1 = __importDefault(require("crypto"));
const usermodel_js_1 = require("../models/usermodel.js");
const token_js_1 = require("../models/token.js");
const sendEmail_js_1 = require("../utils/sendEmail.js");
const registercontroller = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { error } = (0, usermodel_js_1.validateRegister)(req.body);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }
        let user = yield usermodel_js_1.User.findOne({ email: req.body.email });
        if (user && user.verified) {
            return res.status(409).json({ message: "User with given email already exists" });
        }
        if (user && user.verificationLinkSent) {
            return res.status(400).json({
                message: "A verification link has been already sent to this Email",
            });
        }
        // REMOVE THE MANUAL HASHING - let the User model handle it
        // const salt = await bcrypt.genSalt(Number(process.env.SALT));
        // const hashPassword = await bcrypt.hash(req.body.password, salt);
        // Save the user with plain password - the pre('save') hook will hash it
        user = yield new usermodel_js_1.User(Object.assign({}, req.body
        // password: hashPassword // REMOVE THIS LINE
        )).save();
        const token = yield new token_js_1.Token({
            userId: user._id,
            token: crypto_1.default.randomBytes(16).toString("hex"),
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
        }).save();
        const verificationUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/verifyemail?userId=${user._id}&token=${token.token}`;
        yield (0, sendEmail_js_1.sendEmail)({
            email: user.email,
            subject: "Verify Your Email",
            text: `Please click this link to verify your email: ${verificationUrl}`,
            html: `<p>Please click <a href="${verificationUrl}">this link</a> to verify your email</p>`
        });
        user.verificationLinkSent = true;
        yield user.save();
        return res.status(201).json({
            message: `Verification email sent to ${user.email}`
        });
    }
    catch (error) {
        console.error("Error in registerController:", error);
        return res.status(500).json({
            message: "Internal server error",
            error: error instanceof Error ? error.message : "Unknown error"
        });
    }
});
exports.default = registercontroller;
