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
// src/routes/blogRoutes.ts
const express = require("express");
const Blog_1 = __importDefault(require("../models/Blog"));
const cloudinary_1 = require("cloudinary");
const express_fileupload_1 = __importDefault(require("express-fileupload"));
const dotenv_1 = __importDefault(require("dotenv"));
const mongoose_1 = __importDefault(require("mongoose"));
const Category_1 = __importDefault(require("../models/Category"));
const Likecontroller_1 = require("../controllers/Likecontroller");
const authmiddleware_1 = require("../middleware/authmiddleware");
const Commentcontroller_1 = require("../controllers/Commentcontroller");
dotenv_1.default.config();
const router = express.Router();
// Cloudinary configuration
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
});
// File upload middleware
router.use((0, express_fileupload_1.default)({
    useTempFiles: false,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
        files: 1
    },
    abortOnLimit: true,
    responseOnLimit: 'File size exceeds 10MB limit'
}));
// Helper function to generate slug from title
const generateSlug = (title) => {
    return title
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
};
// CREATE BLOG
router.post('/add', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // Validate required fields
        const requiredFields = ['title', 'content', 'category',];
        const missingFields = requiredFields.filter(field => !req.body[field]);
        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields',
                missingFields
            });
        }
        // Find the category
        const category = yield Category_1.default.findById(req.body.category);
        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }
        // Generate slug from title
        const slug = generateSlug(req.body.title);
        // Check if slug already exists
        const existingBlog = yield Blog_1.default.findOne({ slug });
        if (existingBlog) {
            return res.status(400).json({
                success: false,
                message: 'A blog with this title already exists'
            });
        }
        // Handle file upload if exists
        let featuredImageUrl = '';
        if (req.files && req.files.featuredImage) {
            const imageFile = Array.isArray(req.files.featuredImage)
                ? req.files.featuredImage[0]
                : req.files.featuredImage;
            if (!((_a = imageFile.mimetype) === null || _a === void 0 ? void 0 : _a.startsWith('image/'))) {
                return res.status(400).json({
                    success: false,
                    message: 'Only image files are allowed'
                });
            }
            const uploadResult = yield new Promise((resolve, reject) => {
                const uploadStream = cloudinary_1.v2.uploader.upload_stream({
                    folder: 'blogs',
                    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
                    transformation: [{ width: 1200, quality: 'auto' }]
                }, (error, result) => {
                    if (error)
                        reject(error);
                    else if (!result)
                        reject(new Error('Cloudinary upload returned no result'));
                    else
                        resolve(result);
                });
                uploadStream.end(imageFile.data);
            });
            featuredImageUrl = uploadResult.secure_url;
        }
        // Create blog data
        const blogData = {
            title: req.body.title,
            slug,
            content: req.body.content,
            excerpt: req.body.excerpt || '',
            category: req.body.category,
            subcategory: req.body.subcategory || null,
            tags: req.body.tags ? req.body.tags.split(',').map((tag) => tag.trim()) : [],
            status: 'published',
            featuredImage: featuredImageUrl
        };
        // Save to database
        const blog = yield Blog_1.default.create(blogData);
        // Populate category info in the response
        const createdBlog = yield Blog_1.default.findById(blog._id)
            .populate('category', 'name slug')
            .populate('subcategory', 'name slug')
            .lean();
        return res.status(201).json({
            success: true,
            message: 'Blog created successfully',
            data: createdBlog
        });
    }
    catch (error) {
        console.error('Blog creation error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
}));
// GET ALL BLOGS
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { category, status, search } = req.query;
        const query = {};
        if (category)
            query.category = category;
        if (status)
            query.status = status;
        if (search)
            query.$text = { $search: search };
        const blogs = yield Blog_1.default.find(query)
            .populate('category', 'name slug')
            .populate('subcategory', 'name slug')
            .sort({ createdAt: -1 });
        return res.json({
            success: true,
            data: blogs
        });
    }
    catch (error) {
        console.error('Error fetching blogs:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch blogs'
        });
    }
}));
// GET BLOG BY SLUG
router.get('/slug/:slug', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const blog = yield Blog_1.default.findOne({ slug: req.params.slug })
            .populate('category', 'name slug')
            .populate('subcategory', 'name slug');
        if (!blog) {
            return res.status(404).json({
                success: false,
                message: 'Blog not found'
            });
        }
        // Increment view count
        blog.views += 1;
        blog.lastViewed = new Date();
        yield blog.save();
        return res.json({
            success: true,
            data: blog
        });
    }
    catch (error) {
        console.error('Error fetching blog:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch blog'
        });
    }
}));
// UPDATE BLOG
router.put('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        if (!mongoose_1.default.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid blog ID'
            });
        }
        // Handle file upload if exists
        if (req.files && req.files.featuredImage) {
            const imageFile = Array.isArray(req.files.featuredImage)
                ? req.files.featuredImage[0]
                : req.files.featuredImage;
            if (!((_a = imageFile.mimetype) === null || _a === void 0 ? void 0 : _a.startsWith('image/'))) {
                return res.status(400).json({
                    success: false,
                    message: 'Only image files are allowed'
                });
            }
            const uploadResult = yield new Promise((resolve, reject) => {
                const uploadStream = cloudinary_1.v2.uploader.upload_stream({
                    folder: 'blogs',
                    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
                    transformation: [{ width: 1200, quality: 'auto' }]
                }, (error, result) => {
                    if (error)
                        reject(error);
                    else if (!result)
                        reject(new Error('Cloudinary upload returned no result'));
                    else
                        resolve(result);
                });
                uploadStream.end(imageFile.data);
            });
            req.body.featuredImage = uploadResult.secure_url;
        }
        // Handle tags conversion
        if (req.body.tags) {
            req.body.tags = req.body.tags.split(',').map((tag) => tag.trim());
        }
        const updatedBlog = yield Blog_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
            .populate('category', 'name slug')
            .populate('subcategory', 'name slug');
        if (!updatedBlog) {
            return res.status(404).json({
                success: false,
                message: 'Blog not found'
            });
        }
        return res.json({
            success: true,
            data: updatedBlog
        });
    }
    catch (error) {
        console.error('Error updating blog:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to update blog'
        });
    }
}));
// DELETE BLOG
router.delete('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!mongoose_1.default.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid blog ID'
            });
        }
        const blog = yield Blog_1.default.findByIdAndDelete(req.params.id);
        if (!blog) {
            return res.status(404).json({
                success: false,
                message: 'Blog not found'
            });
        }
        return res.json({
            success: true,
            message: 'Blog deleted successfully'
        });
    }
    catch (error) {
        console.error('Error deleting blog:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to delete blog'
        });
    }
}));
// GET BLOGS BY CATEGORY
router.get('/categories/:slug/blogs', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const category = yield Category_1.default.findOne({ slug: req.params.slug });
        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }
        // Find all subcategories of this category
        const subcategories = yield Category_1.default.find({ parent: category._id });
        const subcategoryIds = subcategories.map(sub => sub._id);
        // Include both the main category and all its subcategories
        const categoryIds = [category._id, ...subcategoryIds];
        const blogs = yield Blog_1.default.find({
            $or: [
                { category: { $in: categoryIds } },
                { subcategory: { $in: categoryIds } }
            ]
        })
            .populate('category', 'name slug')
            .populate('subcategory', 'name slug')
            .lean();
        return res.status(200).json({
            success: true,
            data: blogs
        });
    }
    catch (error) {
        console.error("Error fetching blogs:", error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch blogs'
        });
    }
}));
router.get('/slug/:slug', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const blog = yield Blog_1.default.findOne({ slug: req.params.slug });
        if (!blog) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }
        return res.json({
            success: true,
            data: blog
        });
    }
    catch (error) {
        console.error('Error fetching product:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch product'
        });
    }
}));
router.get('/:BlogId/views', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { BLogId } = req.params;
        const updatedBlog = yield Blog_1.default.findByIdAndUpdate(BLogId, {
            $inc: { views: 1 },
            $set: { lastViewed: new Date() }
        }, { new: true });
        if (!updatedBlog) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.status(200).json(updatedBlog);
    }
    catch (error) {
        console.error('Error incrementing product views:', error);
        res.status(500).json({ message: 'Server error' });
    }
}));
router.get('/top-views', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // parseInt(req.query.limit)
        const limit = 5;
        const topBlogs = yield Blog_1.default.find({ status: 'published' })
            .sort({ views: -1 })
            .limit(limit)
            .populate('category', 'name slug')
            .populate('subcategory', 'name slug')
            .select('title slug excerpt featuredImage views createdAt');
        res.json({
            success: true,
            data: topBlogs
        });
    }
    catch (error) {
        console.error('Error fetching top viewed blogs:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch top viewed blogs'
        });
    }
}));
router.post('/:id/like', Likecontroller_1.toggleLike);
router.get('/:id/like', Likecontroller_1.getLikes);
router.get('/:id/comments', Commentcontroller_1.getComments);
router.post('/:id/comments', Commentcontroller_1.addComment);
router.post('/:id/comments/:commentId/like', Commentcontroller_1.likeComment);
// Protected routes
router.delete('/:id/comments/:commentId', Commentcontroller_1.deleteComment);
// Admin routes
router.patch('/:id/comments/:commentId/approve', (0, authmiddleware_1.authorize)('admin'), Commentcontroller_1.approveComment);
exports.default = router;
