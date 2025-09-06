"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
// src/models/Blog.ts
const mongoose_1 = __importStar(require("mongoose"));
const CommentUserSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    guestId: {
        type: String,
        required: false,
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    email: {
        type: String,
        required: false,
        lowercase: true,
        trim: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    avatar: {
        type: String,
        default: ''
    }
});
const CommentSchema = new mongoose_1.Schema({
    user: {
        type: CommentUserSchema,
        required: true
    },
    text: {
        type: String,
        required: true,
        trim: true,
        maxlength: 1000
    },
    isApproved: {
        type: Boolean,
        default: true
    },
    likes: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});
const LikeSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    guestId: {
        type: String,
        required: false,
        index: true
    }
}, {
    timestamps: { createdAt: true, updatedAt: false }
});
const BlogSchema = new mongoose_1.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    content: {
        type: String,
        required: true
    },
    excerpt: {
        type: String,
        default: ''
    },
    description: {
        type: String,
        default: ''
    },
    category: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Category',
        required: true
    },
    subcategory: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Category',
        default: null
    },
    tags: [{
            type: String,
            trim: true
        }],
    status: {
        type: String,
        enum: ['draft', 'published'],
        default: 'draft'
    },
    featuredImage: {
        type: String,
        default: ''
    },
    views: {
        type: Number,
        default: 0
    },
    lastViewed: {
        type: Date
    },
    likes: [LikeSchema],
    comments: [CommentSchema],
    readTime: {
        type: Number,
        default: 5
    },
    author: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    allowAnonymous: {
        type: Boolean,
        default: true
    },
    requireApproval: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});
// Compound indexes
BlogSchema.index({ slug: 1 });
BlogSchema.index({ status: 1, createdAt: -1 });
BlogSchema.index({ 'likes.userId': 1, 'likes.guestId': 1 });
BlogSchema.index({ 'comments.user.userId': 1, 'comments.user.guestId': 1 });
// Virtual for like count
// Virtual for like count
BlogSchema.virtual('likeCount').get(function () {
    if (!this.likes || !Array.isArray(this.likes)) {
        return 0; // Return 0 if likes is undefined or not an array
    }
    return this.likes.length;
});
// Virtual for approved comment count
// Virtual for approved comment count
BlogSchema.virtual('approvedCommentCount').get(function () {
    if (!this.comments || !Array.isArray(this.comments)) {
        return 0; // Return 0 if comments is undefined or not an array
    }
    return this.comments.filter((comment) => comment.isApproved).length;
});
// Method to check if a user/guest has liked the blog
BlogSchema.methods.hasLiked = function (userId, guestId) {
    if (userId) {
        const userIdStr = typeof userId === 'string' ? userId : userId.toString();
        return this.likes.some((like) => like.userId && like.userId.toString() === userIdStr);
    }
    if (guestId) {
        return this.likes.some((like) => like.guestId && like.guestId === guestId);
    }
    return false;
};
// Method to add a like
BlogSchema.methods.addLike = function (userId, guestId) {
    if (this.hasLiked(userId, guestId))
        return;
    const like = {
        userId: userId ? new mongoose_1.Types.ObjectId(userId) : undefined,
        guestId,
        createdAt: new Date()
    };
    this.likes.push(like);
};
// Method to remove a like
BlogSchema.methods.removeLike = function (userId, guestId) {
    if (userId) {
        const userIdStr = typeof userId === 'string' ? userId : userId.toString();
        this.likes = this.likes.filter((like) => !like.userId || like.userId.toString() !== userIdStr);
    }
    else if (guestId) {
        this.likes = this.likes.filter((like) => !like.guestId || like.guestId !== guestId);
    }
};
// Ensure virtual fields are serialized
BlogSchema.set('toJSON', { virtuals: true });
BlogSchema.set('toObject', { virtuals: true });
// Create and export the model
exports.default = mongoose_1.default.model('Blog', BlogSchema);
