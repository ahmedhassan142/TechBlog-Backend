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
exports.approveComment = exports.deleteComment = exports.likeComment = exports.getComments = exports.addComment = void 0;
const Blog_1 = __importDefault(require("../models/Blog"));
const usermodel_1 = require("../models/usermodel");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// Add comment to a blog (supports both users and guests)
const addComment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { id } = req.params;
        const { text, name, email } = req.body;
        let userId;
        let userFirstName;
        let userLastName;
        let userEmail;
        let userAvatar;
        const guestId = req.headers["x-session-id"];
        // Check if user is authenticated via token
        const token = ((_a = req.cookies) === null || _a === void 0 ? void 0 : _a.authToken) || ((_b = req.headers.authorization) === null || _b === void 0 ? void 0 : _b.split(" ")[1]);
        if (token) {
            try {
                const userData = jsonwebtoken_1.default.verify(token, process.env.JWTPRIVATEKEY);
                const user = yield usermodel_1.User.findOne({ _id: userData._id }).select('-password');
                if (user) {
                    userId = user._id.toString();
                    userFirstName = user.firstName;
                    userLastName = user.lastName;
                    userEmail = user.email;
                    userAvatar = user.avatarLink;
                }
            }
            catch (error) {
                console.log('Token verification failed, proceeding as guest');
            }
        }
        if (!text || text.trim().length === 0) {
            const response = {
                success: false,
                message: 'Comment text is required'
            };
            return res.status(400).json(response);
        }
        // For guests, name is required
        if (!userId && !name) {
            const response = {
                success: false,
                message: 'Name is required for guest comments'
            };
            return res.status(400).json(response);
        }
        const blog = yield Blog_1.default.findById(id);
        if (!blog) {
            const response = {
                success: false,
                message: 'Blog post not found'
            };
            return res.status(404).json(response);
        }
        // Check if anonymous comments are allowed
        if (!userId && !blog.allowAnonymous) {
            const response = {
                success: false,
                message: 'Anonymous comments are not allowed on this post'
            };
            return res.status(403).json(response);
        }
        // Prepare user data
        //@ts-ignore
        const commentUserData = {};
        if (userId) {
            // Authenticated user - use data from database
            commentUserData.userId = userId;
            commentUserData.name = `${userFirstName} ${userLastName}`;
            commentUserData.email = userEmail;
            commentUserData.avatar = userAvatar;
        }
        else {
            // Guest user - use data from request body
            commentUserData.guestId = guestId;
            commentUserData.name = name;
            commentUserData.email = email;
        }
        // Determine if comment needs approval
        const isApproved = !blog.requireApproval;
        // Add comment
        //@ts-ignore
        blog.comments.push({
            user: commentUserData,
            text: text.trim(),
            isApproved,
            likes: 0
        });
        yield blog.save();
        // Populate the new comment
        yield blog.populate('comments.user.userId', 'firstName lastName avatarLink');
        const newComment = blog.comments[blog.comments.length - 1];
        const response = {
            success: true,
            message: isApproved
                ? 'Comment added successfully'
                : 'Comment submitted for approval',
            data: newComment
        };
        res.status(201).json(response);
    }
    catch (error) {
        console.error('Add comment error:', error);
        const response = {
            success: false,
            message: 'Server error'
        };
        res.status(500).json(response);
    }
});
exports.addComment = addComment;
// Get comments for a blog (only approved ones)
const getComments = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const blog = yield Blog_1.default.findById(id)
            .populate('comments.user.userId', 'firstName lastName avatarLink')
            .select('comments');
        if (!blog) {
            const response = {
                success: false,
                message: 'Blog post not found'
            };
            return res.status(404).json(response);
        }
        // Filter approved comments only
        const approvedComments = blog.comments.filter(comment => comment.isApproved);
        const totalComments = approvedComments.length;
        const comments = approvedComments.slice(skip, skip + limit);
        const response = {
            success: true,
            message: 'Comments retrieved successfully',
            data: {
                comments,
                pagination: {
                    page,
                    limit,
                    total: totalComments,
                    pages: Math.ceil(totalComments / limit)
                }
            }
        };
        res.json(response);
    }
    catch (error) {
        console.error('Get comments error:', error);
        const response = {
            success: false,
            message: 'Server error'
        };
        res.status(500).json(response);
    }
});
exports.getComments = getComments;
// Like a comment (supports both users and guests)
const likeComment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { id, commentId } = req.params;
        let userId;
        const guestId = req.headers['x-guest-id'] || req.headers['x-session-id'];
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
        console.log('Comment like request details:', {
            blogId: id,
            commentId,
            userId,
            guestId,
            hasUserId: !!userId,
            hasGuestId: !!guestId
        });
        if (!userId && !guestId) {
            const response = {
                success: false,
                message: 'Authentication required. Please log in or enable cookies for guest sessions.'
            };
            return res.status(400).json(response);
        }
        const blog = yield Blog_1.default.findById(id);
        if (!blog) {
            const response = {
                success: false,
                message: 'Blog post not found'
            };
            return res.status(404).json(response);
        }
        //@ts-ignore
        const comment = blog.comments.id(commentId);
        if (!comment) {
            const response = {
                success: false,
                message: 'Comment not found'
            };
            return res.status(404).json(response);
        }
        if (!comment.isApproved) {
            const response = {
                success: false,
                message: 'Comment is not approved yet'
            };
            return res.status(403).json(response);
        }
        // Check if user/guest has already liked this comment to prevent duplicate likes
        const likeIdentifier = userId ? `user_${userId}` : `guest_${guestId}`;
        // Initialize likedBy array if it doesn't exist
        if (!comment.likedBy) {
            comment.likedBy = [];
        }
        // Check if already liked
        const alreadyLiked = comment.likedBy.includes(likeIdentifier);
        if (alreadyLiked) {
            const response = {
                success: false,
                message: 'You have already liked this comment'
            };
            return res.status(400).json(response);
        }
        // Increment likes and track who liked it
        comment.likes += 1;
        comment.likedBy.push(likeIdentifier);
        yield blog.save();
        const response = {
            success: true,
            message: 'Comment liked successfully',
            data: { likes: comment.likes }
        };
        res.json(response);
    }
    catch (error) {
        console.error('Like comment error:', error);
        const response = {
            success: false,
            message: 'Server error'
        };
        res.status(500).json(response);
    }
});
exports.likeComment = likeComment;
// Delete a comment (only by author or admin)
const deleteComment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const { id, commentId } = req.params;
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
        const userRole = (_c = req.user) === null || _c === void 0 ? void 0 : _c.role;
        const blog = yield Blog_1.default.findById(id);
        if (!blog) {
            const response = {
                success: false,
                message: 'Blog post not found'
            };
            return res.status(404).json(response);
        }
        //@ts-ignore
        const comment = blog.comments.id(commentId);
        if (!comment) {
            const response = {
                success: false,
                message: 'Comment not found'
            };
            return res.status(404).json(response);
        }
        // Check if user owns the comment or is admin
        const isOwner = ((userId && comment.user.userId && comment.user.userId.toString() === userId.toString()) ||
            (guestId && comment.user.guestId === guestId));
        if (!isOwner && userRole !== 'admin') {
            const response = {
                success: false,
                message: 'Not authorized to delete this comment'
            };
            return res.status(403).json(response);
        }
        // Remove comment
        comment.deleteOne();
        yield blog.save();
        const response = {
            success: true,
            message: 'Comment deleted successfully'
        };
        res.json(response);
    }
    catch (error) {
        console.error('Delete comment error:', error);
        const response = {
            success: false,
            message: 'Server error'
        };
        res.status(500).json(response);
    }
});
exports.deleteComment = deleteComment;
// Admin: Approve a comment
const approveComment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id, commentId } = req.params;
        const blog = yield Blog_1.default.findById(id);
        if (!blog) {
            const response = {
                success: false,
                message: 'Blog post not found'
            };
            return res.status(404).json(response);
        }
        //@ts-ignore
        const comment = blog.comments._id(commentId);
        if (!comment) {
            const response = {
                success: false,
                message: 'Comment not found'
            };
            return res.status(404).json(response);
        }
        comment.isApproved = true;
        yield blog.save();
        const response = {
            success: true,
            message: 'Comment approved successfully',
            data: comment
        };
        res.json(response);
    }
    catch (error) {
        console.error('Approve comment error:', error);
        const response = {
            success: false,
            message: 'Server error'
        };
        res.status(500).json(response);
    }
});
exports.approveComment = approveComment;
