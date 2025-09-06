// src/controllers/likeController.ts
import { Response } from 'express';
import { AuthRequest } from '../utils/types';
import Blog from '../models/Blog';
import { ApiResponse } from '../utils/types';
import { User } from '../models/usermodel';
import jwt from 'jsonwebtoken';

interface JwtPayload {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
}

// Toggle like on a blog
export const toggleLike = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    let userId: string | undefined;
    const guestId = req.headers["x-session-id"] as string;
    
    // Check for token (authenticated user)
    const token = req.cookies?.authToken || req.headers.authorization?.split(" ")[1];
    
    if (token) {
      try {
        const userData = jwt.verify(token, process.env.JWTPRIVATEKEY as string) as JwtPayload;
        const user = await User.findOne({ _id: userData._id }).select('-password');
        
        if (user) {
          userId = user._id.toString();
        }
      } catch (error) {
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
      const response: ApiResponse = {
        success: false,
        message: 'Authentication required. Please log in or enable cookies for guest sessions.'
      };
      return res.status(400).json(response);
    }

    const blog = await Blog.findById(id);
    
    if (!blog) {
      console.log('404 Error: Blog not found');
      const response: ApiResponse = {
        success: false,
        message: 'Blog post not found'
      };
      return res.status(404).json(response);
    }

    // Check if already liked
    let alreadyLiked = false;
    if (userId) {
      alreadyLiked = blog.likes.some((like: any) => 
        like.userId && like.userId.toString() === userId
      );
    } else if (guestId) {
      alreadyLiked = blog.likes.some((like: any) => 
        like.guestId && like.guestId === guestId
      );
    }

    console.log('Like status:', { alreadyLiked, currentLikes: blog.likes.length });

    if (alreadyLiked) {
      // Remove like
      if (userId) {
        blog.likes = blog.likes.filter((like: any) => 
          !like.userId || like.userId.toString() !== userId
        );
      } else {
        blog.likes = blog.likes.filter((like: any) => 
          !like.guestId || like.guestId !== guestId
        );
      }
      
      await blog.save();

      const response: ApiResponse = {
        success: true,
        message: 'Like removed successfully',
        data: { 
          liked: false,
          likeCount: blog.likes.length
        }
      };
      console.log('Like removed successfully');
      return res.json(response);
    } else {
      // Add like
      blog.likes.push({
        //@ts-ignore
        userId: userId || undefined,
        guestId: guestId || undefined,
        createdAt: new Date()
      });
      
      await blog.save();

      const response: ApiResponse = {
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
  } catch (error) {
    console.error('Toggle like error:', error);
    const response: ApiResponse = {
      success: false,
      message: 'Server error'
    };
    res.status(500).json(response);
  }
};
// Get likes for a blog
export const getLikes = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const token = req.cookies?.authToken || req.headers.authorization?.split(" ")[1];
        if (!token) {
          return res.status(401).json({ error: "Authentication required" });
        }
    
        const userData = jwt.verify(token, process.env.JWTPRIVATEKEY as string) as JwtPayload;
        const user = await User.findOne({ _id: userData._id }).select('-password');
        
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }
        const userId=user._id
    const guestId = req.headers["x-session-id"] as string;

    const blog = await Blog.findById(id)
      .populate('likes.userId', 'firstName lastName avatarLink')
      .select('likes');

    if (!blog) {
      const response: ApiResponse = {
        success: false,
        message: 'Blog post not found'
      };
      return res.status(404).json(response);
    }

    // Check if current user/guest has liked
    const hasLiked = blog.hasLiked(userId, guestId);

    const response: ApiResponse = {
      success: true,
      message: 'Likes retrieved successfully',
      data: {
        likes: blog.likes,
        likeCount: blog.likeCount,
        hasLiked
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Get likes error:', error);
    const response: ApiResponse = {
      success: false,
      message: 'Server error'
    };
    res.status(500).json(response);
  }
};