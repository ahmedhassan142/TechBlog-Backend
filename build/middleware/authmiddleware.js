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
exports.likeRateLimiter = exports.commentRateLimiter = exports.createRateLimiter = exports.authorize = exports.optionalAuth = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const usermodel_1 = require("../models/usermodel");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const authenticate = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // Get token from header
        const token = (_a = req.header('Authorization')) === null || _a === void 0 ? void 0 : _a.replace('Bearer ', '');
        // Check if no token
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. No token provided.'
            });
        }
        // Verify token
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWTPRIVATEKEY);
        // Get user from token
        const user = yield usermodel_1.User.findById(decoded._id).select('-password');
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Token is not valid.'
            });
        }
        if (!user.verified) {
            return res.status(401).json({
                success: false,
                message: 'Account not verified. Please verify your email.'
            });
        }
        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Account is deactivated.'
            });
        }
        // Add user to request
        req.user = {
            _id: user._id.toString(),
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
            //@ts-ignore
            avatarLink: user.avatarLink
        };
        next();
    }
    catch (error) {
        console.error('Auth middleware error:', error);
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token.'
            });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expired.'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});
exports.authenticate = authenticate;
const optionalAuth = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const token = (_a = req.header('Authorization')) === null || _a === void 0 ? void 0 : _a.replace('Bearer ', '');
        if (token) {
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWTPRIVATEKEY);
            const user = yield usermodel_1.User.findById(decoded._id).select('-password');
            if (user && user.verified && user.isActive) {
                req.user = {
                    _id: user._id.toString(),
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email,
                    role: user.role,
                    //@ts-ignore
                    avatarLink: user.avatarLink
                };
            }
        }
        next();
    }
    catch (error) {
        // For optional auth, we don't block the request on error
        next();
    }
});
exports.optionalAuth = optionalAuth;
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. No user found.'
            });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Insufficient permissions.'
            });
        }
        next();
    };
};
exports.authorize = authorize;
// Rate limiting middleware
const createRateLimiter = (windowMs, max, message) => {
    return (0, express_rate_limit_1.default)({
        windowMs,
        max,
        message: {
            success: false,
            message
        },
        standardHeaders: true,
        legacyHeaders: false,
    });
};
exports.createRateLimiter = createRateLimiter;
// Comment rate limiter
exports.commentRateLimiter = (0, exports.createRateLimiter)(15 * 60 * 1000, // 15 minutes
5, // 5 comments per window
'Too many comments created, please try again later.');
// Like rate limiter
exports.likeRateLimiter = (0, exports.createRateLimiter)(60 * 1000, // 1 minute
10, // 10 likes per minute
'Too many likes, please try again later.');
