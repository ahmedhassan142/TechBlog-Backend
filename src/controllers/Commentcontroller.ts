// src/controllers/commentController.ts
import { Response } from 'express';
import { AuthRequest } from '../utils/types';
import Blog, { ICommentUser } from '../models/Blog';
import { ApiResponse } from '../utils/types';
import { User } from '../models/usermodel';
import jwt from 'jsonwebtoken'

interface JwtPayload {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
}

// Add comment to a blog (supports both users and guests)
export const addComment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { text, name, email } = req.body;
    
    let userId: string | undefined;
    let userFirstName: string | undefined;
    let userLastName: string | undefined;
    let userEmail: string | undefined;
    let userAvatar: string | undefined;

    const guestId = req.headers["x-session-id"] as string;

    // Check if user is authenticated via token
    const token = req.cookies?.authToken || req.headers.authorization?.split(" ")[1];
    
    if (token) {
      try {
        const userData = jwt.verify(token, process.env.JWTPRIVATEKEY as string) as JwtPayload;
        const user = await User.findOne({ _id: userData._id }).select('-password');
        
        if (user) {
          userId = user._id.toString();
          userFirstName = user.firstName;
          userLastName = user.lastName;
          userEmail = user.email;
          userAvatar = user.avatarLink;
        }
      } catch (error) {
        console.log('Token verification failed, proceeding as guest');
      }
    }

    if (!text || text.trim().length === 0) {
      const response: ApiResponse = {
        success: false,
        message: 'Comment text is required'
      };
      return res.status(400).json(response);
    }

    // For guests, name is required
    if (!userId && !name) {
      const response: ApiResponse = {
        success: false,
        message: 'Name is required for guest comments'
      };
      return res.status(400).json(response);
    }

    const blog = await Blog.findById(id);

    if (!blog) {
      const response: ApiResponse = {
        success: false,
        message: 'Blog post not found'
      };
      return res.status(404).json(response);
    }

    // Check if anonymous comments are allowed
    if (!userId && !blog.allowAnonymous) {
      const response: ApiResponse = {
        success: false,
        message: 'Anonymous comments are not allowed on this post'
      };
      return res.status(403).json(response);
    }

    // Prepare user data
    //@ts-ignore
    const commentUserData: ICommentUser = {};

    if (userId) {
      // Authenticated user - use data from database
      commentUserData.userId = userId;
      commentUserData.name = `${userFirstName} ${userLastName}`;
      commentUserData.email = userEmail;
      commentUserData.avatar = userAvatar;
    } else {
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

    await blog.save();

    // Populate the new comment
    await blog.populate('comments.user.userId', 'firstName lastName avatarLink');
    const newComment = blog.comments[blog.comments.length - 1];

    const response: ApiResponse = {
      success: true,
      message: isApproved 
        ? 'Comment added successfully' 
        : 'Comment submitted for approval',
      data: newComment
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Add comment error:', error);
    const response: ApiResponse = {
      success: false,
      message: 'Server error'
    };
    res.status(500).json(response);
  }
};

// Get comments for a blog (only approved ones)
export const getComments = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const blog = await Blog.findById(id)
      .populate('comments.user.userId', 'firstName lastName avatarLink')
      .select('comments');

    if (!blog) {
      const response: ApiResponse = {
        success: false,
        message: 'Blog post not found'
      };
      return res.status(404).json(response);
    }

    // Filter approved comments only
    const approvedComments = blog.comments.filter(comment => comment.isApproved);
    const totalComments = approvedComments.length;
    const comments = approvedComments.slice(skip, skip + limit);

    const response: ApiResponse = {
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
  } catch (error) {
    console.error('Get comments error:', error);
    const response: ApiResponse = {
      success: false,
      message: 'Server error'
    };
    res.status(500).json(response);
  }
};

// Like a comment (supports both users and guests)
export const likeComment = async (req: AuthRequest, res: Response) => {
  try {
    const { id, commentId } = req.params;
    let userId: string | undefined;
    const guestId = req.headers['x-guest-id'] as string || req.headers['x-session-id'] as string;

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

    console.log('Comment like request details:', { 
      blogId: id, 
      commentId,
      userId, 
      guestId,
      hasUserId: !!userId,
      hasGuestId: !!guestId
    });

    if (!userId && !guestId) {
      const response: ApiResponse = {
        success: false,
        message: 'Authentication required. Please log in or enable cookies for guest sessions.'
      };
      return res.status(400).json(response);
    }

    const blog = await Blog.findById(id);

    if (!blog) {
      const response: ApiResponse = {
        success: false,
        message: 'Blog post not found'
      };
      return res.status(404).json(response);
    }
    
    //@ts-ignore
    const comment = blog.comments.id(commentId);

    if (!comment) {
      const response: ApiResponse = {
        success: false,
        message: 'Comment not found'
      };
      return res.status(404).json(response);
    }

    if (!comment.isApproved) {
      const response: ApiResponse = {
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
      const response: ApiResponse = {
        success: false,
        message: 'You have already liked this comment'
      };
      return res.status(400).json(response);
    }

    // Increment likes and track who liked it
    comment.likes += 1;
    comment.likedBy.push(likeIdentifier);
    
    await blog.save();

    const response: ApiResponse = {
      success: true,
      message: 'Comment liked successfully',
      data: { likes: comment.likes }
    };

    res.json(response);
  } catch (error) {
    console.error('Like comment error:', error);
    const response: ApiResponse = {
      success: false,
      message: 'Server error'
    };
    res.status(500).json(response);
  }
};

// Delete a comment (only by author or admin)
export const deleteComment = async (req: AuthRequest, res: Response) => {
  try {
    const { id, commentId } = req.params;
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
    const userRole = req.user?.role;

    const blog = await Blog.findById(id);

    if (!blog) {
      const response: ApiResponse = {
        success: false,
        message: 'Blog post not found'
      };
      return res.status(404).json(response);
    }
    //@ts-ignore

    const comment = blog.comments.id(commentId);

    if (!comment) {
      const response: ApiResponse = {
        success: false,
        message: 'Comment not found'
      };
      return res.status(404).json(response);
    }

    // Check if user owns the comment or is admin
    const isOwner = (
      (userId && comment.user.userId && comment.user.userId.toString() === userId.toString()) ||
      (guestId && comment.user.guestId === guestId)
    );

    if (!isOwner && userRole !== 'admin') {
      const response: ApiResponse = {
        success: false,
        message: 'Not authorized to delete this comment'
      };
      return res.status(403).json(response);
    }

    // Remove comment
    comment.deleteOne();
    await blog.save();

    const response: ApiResponse = {
      success: true,
      message: 'Comment deleted successfully'
    };

    res.json(response);
  } catch (error) {
    console.error('Delete comment error:', error);
    const response: ApiResponse = {
      success: false,
      message: 'Server error'
    };
    res.status(500).json(response);
  }
};

// Admin: Approve a comment
export const approveComment = async (req: AuthRequest, res: Response) => {
  try {
    const { id, commentId } = req.params;

    const blog = await Blog.findById(id);

    if (!blog) {
      const response: ApiResponse = {
        success: false,
        message: 'Blog post not found'
      };
      return res.status(404).json(response);
    }
//@ts-ignore
    const comment = blog.comments._id(commentId);

    if (!comment) {
      const response: ApiResponse = {
        success: false,
        message: 'Comment not found'
      };
      return res.status(404).json(response);
    }

    comment.isApproved = true;
    await blog.save();

    const response: ApiResponse = {
      success: true,
      message: 'Comment approved successfully',
      data: comment
    };

    res.json(response);
  } catch (error) {
    console.error('Approve comment error:', error);
    const response: ApiResponse = {
      success: false,
      message: 'Server error'
    };
    res.status(500).json(response);
  }
};