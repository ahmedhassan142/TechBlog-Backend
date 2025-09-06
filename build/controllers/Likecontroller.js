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
exports.getLikes = exports.toggleLike = void 0;
const Blog_1 = __importDefault(require("../models/Blog"));
const usermodel_1 = require("../models/usermodel");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// Toggle like on a blog
const toggleLike = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { id } = req.params;
        let userId;
        const guestId = req.headers["x-session-id"];
        // Check for token (authenticated user)
        const token = ((_a = req.cookies) === null || _a === void 0 ? void 0 : _a.authToken) || ((_b = req.headers.authorization) === null || _b === void 0 ? void 0 : _b.split(" ")[1]);
        if (token) {
            try {
                const userData = jsonwebtoken_1.default.verify(token, process.env.JWTPRIVATEKEY);
                const user = yield usermodel_1.User.findOne({ _id: userData._id }).select('-password');
                if (user) {
                    userId = user._id.toString();
                }
            }
            catch (error) {
                console.log('Token verification failed, proceeding as guest if possible');
                // Don't return error here - allow to proceed as guest if guestId exists
            }
        }
        console.log('Like request details:', {
            blogId: id,
            userId,
            guestId,
            hasUserId: !!userId,
            hasGuestId: !!guestId
        });
        if (!userId && !guestId) {
            console.log('400 Error: Neither userId nor guestId provided');
            const response = {
                success: false,
                message: 'Authentication required. Please log in or enable cookies for guest sessions.'
            };
            return res.status(400).json(response);
        }
        const blog = yield Blog_1.default.findById(id);
        if (!blog) {
            console.log('404 Error: Blog not found');
            const response = {
                success: false,
                message: 'Blog post not found'
            };
            return res.status(404).json(response);
        }
        // Check if already liked
        let alreadyLiked = false;
        if (userId) {
            alreadyLiked = blog.likes.some((like) => like.userId && like.userId.toString() === userId);
        }
        else if (guestId) {
            alreadyLiked = blog.likes.some((like) => like.guestId && like.guestId === guestId);
        }
        console.log('Like status:', { alreadyLiked, currentLikes: blog.likes.length });
        if (alreadyLiked) {
            // Remove like
            if (userId) {
                blog.likes = blog.likes.filter((like) => !like.userId || like.userId.toString() !== userId);
            }
            else {
                blog.likes = blog.likes.filter((like) => !like.guestId || like.guestId !== guestId);
            }
            yield blog.save();
            const response = {
                success: true,
                message: 'Like removed successfully',
                data: {
                    liked: false,
                    likeCount: blog.likes.length
                }
            };
            console.log('Like removed successfully');
            return res.json(response);
        }
        else {
            // Add like
            blog.likes.push({
                //@ts-ignore
                userId: userId || undefined,
                guestId: guestId || undefined,
                createdAt: new Date()
            });
            yield blog.save();
            const response = {
                success: true,
                message: 'Blog liked successfully',
                data: {
                    liked: true,
                    likeCount: blog.likes.length
                }
            };
            console.log('Like added successfully');
            return res.json(response);
        }
    }
    catch (error) {
        console.error('Toggle like error:', error);
        const response = {
            success: false,
            message: 'Server error'
        };
        res.status(500).json(response);
    }
});
exports.toggleLike = toggleLike;
// Get likes for a blog
const getLikes = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { id } = req.params;
        const token = ((_a = req.cookies) === null || _a === void 0 ? void 0 : _a.authToken) || ((_b = req.headers.authorization) === null || _b === void 0 ? void 0 : _b.split(" ")[1]);
        if (!token) {
            return res.status(401).json({ error: "Authentication required" });
        }
        const userData = jsonwebtoken_1.default.verify(token, process.env.JWTPRIVATEKEY);
        const user = yield usermodel_1.User.findOne({ _id: userData._id }).select('-password');
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        const userId = user._id;
        const guestId = req.headers["x-session-id"];
        const blog = yield Blog_1.default.findById(id)
            .populate('likes.userId', 'firstName lastName avatarLink')
            .select('likes');
        if (!blog) {
            const response = {
                success: false,
                message: 'Blog post not found'
            };
            return res.status(404).json(response);
        }
        // Check if current user/guest has liked
        const hasLiked = blog.hasLiked(userId, guestId);
        const response = {
            success: true,
            message: 'Likes retrieved successfully',
            data: {
                likes: blog.likes,
                likeCount: blog.likeCount,
                hasLiked
            }
        };
        res.json(response);
    }
    catch (error) {
        console.error('Get likes error:', error);
        const response = {
            success: false,
            message: 'Server error'
        };
        res.status(500).json(response);
    }
});
exports.getLikes = getLikes;
