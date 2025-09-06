// src/routes/blogRoutes.ts
const express=require("express")
import { Request, Response } from 'express';
import Blog from '@/models/Blog';
import { v2 as cloudinary } from 'cloudinary';
import fileUpload from 'express-fileupload';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import CategoryModel from '../models/Category';
import { toggleLike,getLikes } from '@/controllers/Likecontroller';
import { authorize } from '@/middleware/authmiddleware';
import { getComments,deleteComment,likeComment,addComment,approveComment } from '@/controllers/Commentcontroller';

dotenv.config();
const router = express.Router();

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

// File upload middleware
router.use(fileUpload({
  useTempFiles: false,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 1
  },
  abortOnLimit: true,
  responseOnLimit: 'File size exceeds 10MB limit'
}));

interface CloudinaryResult {
  secure_url: string;
  public_id: string;
  width: number;
  height: number;
  format: string;
}

// Helper function to generate slug from title
const generateSlug = (title: string): string => {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// CREATE BLOG
router.post('/add', async (req: Request, res: Response) => {
  try {
    // Validate required fields
    const requiredFields = ['title', 'content', 'category', ];
    const missingFields = requiredFields.filter(field => !req.body[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        missingFields
      });
    }

    // Find the category
    const category = await CategoryModel.findById(req.body.category);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Generate slug from title
    const slug = generateSlug(req.body.title);
    
    // Check if slug already exists
    const existingBlog = await Blog.findOne({ slug });
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

      if (!imageFile.mimetype?.startsWith('image/')) {
        return res.status(400).json({
          success: false,
          message: 'Only image files are allowed'
        });
      }

      const uploadResult = await new Promise<CloudinaryResult>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'blogs',
            allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
            transformation: [{ width: 1200, quality: 'auto' }]
          },
          (error, result) => {
            if (error) reject(error);
            else if (!result) reject(new Error('Cloudinary upload returned no result'));
            else resolve(result);
          }
        );

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
      tags: req.body.tags ? req.body.tags.split(',').map((tag: string) => tag.trim()) : [],
      status: 'published',
      featuredImage: featuredImageUrl
    };

    // Save to database
    const blog = await Blog.create(blogData);

    // Populate category info in the response
    const createdBlog = await Blog.findById(blog._id)
      .populate('category', 'name slug')
      .populate('subcategory', 'name slug')
      .lean();

    return res.status(201).json({
      success: true,
      message: 'Blog created successfully',
      data: createdBlog
    });

  } catch (error: any) {
    console.error('Blog creation error:', error);
    
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
});

// GET ALL BLOGS
router.get('/', async (req: Request, res: Response) => {
  try {
    const { category, status, search } = req.query;

    const query: any = {};
    
    if (category) query.category = category;
    if (status) query.status = status;
    if (search) query.$text = { $search: search as string };

    const blogs = await Blog.find(query)
      .populate('category', 'name slug')
      .populate('subcategory', 'name slug')
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: blogs
    });

  } catch (error) {
    console.error('Error fetching blogs:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch blogs'
    });
  }
});

// GET BLOG BY SLUG
router.get('/slug/:slug', async (req: Request, res: Response) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug })
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
    await blog.save();

    return res.json({
      success: true,
      data: blog
    });

  } catch (error) {
    console.error('Error fetching blog:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch blog'
    });
  }
});

// UPDATE BLOG
router.put('/:id', async (req: Request, res: Response) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
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

      if (!imageFile.mimetype?.startsWith('image/')) {
        return res.status(400).json({
          success: false,
          message: 'Only image files are allowed'
        });
      }

      const uploadResult = await new Promise<CloudinaryResult>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'blogs',
            allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
            transformation: [{ width: 1200, quality: 'auto' }]
          },
          (error, result) => {
            if (error) reject(error);
            else if (!result) reject(new Error('Cloudinary upload returned no result'));
            else resolve(result);
          }
        );

        uploadStream.end(imageFile.data);
      });

      req.body.featuredImage = uploadResult.secure_url;
    }

    // Handle tags conversion
    if (req.body.tags) {
      req.body.tags = req.body.tags.split(',').map((tag: string) => tag.trim());
    }

    const updatedBlog = await Blog.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
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

  } catch (error: any) {
    console.error('Error updating blog:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update blog'
    });
  }
});

// DELETE BLOG
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid blog ID'
      });
    }

    const blog = await Blog.findByIdAndDelete(req.params.id);

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

  } catch (error) {
    console.error('Error deleting blog:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete blog'
    });
  }
});

// GET BLOGS BY CATEGORY
router.get('/categories/:slug/blogs', async (req: Request, res: Response) => {
  try {
    const category = await CategoryModel.findOne({ slug: req.params.slug });
    if (!category) {
      return res.status(404).json({ 
        success: false,
        message: 'Category not found' 
      });
    }

    // Find all subcategories of this category
    const subcategories = await CategoryModel.find({ parent: category._id });
    const subcategoryIds = subcategories.map(sub => sub._id);
    
    // Include both the main category and all its subcategories
    const categoryIds = [category._id, ...subcategoryIds];

    const blogs = await Blog.find({ 
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

  } catch (error: any) {
    console.error("Error fetching blogs:", error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch blogs'
    });
  }
});
router.get('/slug/:slug', async (req: Request, res: Response) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug });

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

  } catch (error) {
    console.error('Error fetching product:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch product'
    });
  }
});
router.get( '/:BlogId/views',async (req: Request, res: Response) => {
  try {
    const { BLogId } = req.params;

    const updatedBlog = await Blog.findByIdAndUpdate(
      BLogId,
      {
        $inc: { views: 1 },
        $set: { lastViewed: new Date() }
      },
      { new: true }
    );

    if (!updatedBlog) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.status(200).json(updatedBlog);
  } catch (error) {
    console.error('Error incrementing product views:', error);
    res.status(500).json({ message: 'Server error' });
  }
});
router.get('/top-views', async (req:Request, res:Response) => {
  try {
    // parseInt(req.query.limit)
    const limit =  5
    
    const topBlogs = await Blog.find({ status: 'published' })
      .sort({ views: -1 })
      .limit(limit)
      .populate('category', 'name slug')
      .populate('subcategory', 'name slug')
      .select('title slug excerpt featuredImage views createdAt');
    
    res.json({
      success: true,
      data: topBlogs
    });
  } catch (error) {
    console.error('Error fetching top viewed blogs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch top viewed blogs'
    });
  }
});
router.post('/:id/like', toggleLike);
router.get('/:id/like', getLikes);
router.get('/:id/comments', getComments);
router.post('/:id/comments', addComment);
router.post('/:id/comments/:commentId/like', likeComment);

// Protected routes

router.delete('/:id/comments/:commentId', deleteComment);

// Admin routes
router.patch('/:id/comments/:commentId/approve', authorize('admin'), approveComment);

export default router;