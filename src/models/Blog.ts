// src/models/Blog.ts
import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ICommentUser {
  userId?: Types.ObjectId | string;
  guestId?: string;
 name:string;
  email?: string;
  avatar?: string;
}

export interface IComment {
  _id: Types.ObjectId;
  user: ICommentUser;
  text: string;
  createdAt: Date;
  updatedAt: Date;
  isApproved: boolean;
  likes: number;
}

export interface ILike {
  _id?: Types.ObjectId;
  userId?: Types.ObjectId;
  guestId?: string;
  createdAt: Date;
}

export interface IBlog extends Document {
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  description?: string;
  category: Types.ObjectId;
  subcategory?: Types.ObjectId;
  tags: string[];
  status: 'draft' | 'published';
  featuredImage?: string;
  views: number;
  lastViewed?: Date;
  likes: ILike[];
  comments: IComment[];
  readTime: number;
  author: Types.ObjectId; // Uncommented author field
  allowAnonymous: boolean;
  requireApproval: boolean;
  createdAt: Date;
  updatedAt: Date;
  
  // Virtual properties
  likeCount: number;
  approvedCommentCount: number;
  
  // Methods
  hasLiked: (userId?: Types.ObjectId | string, guestId?: string) => boolean;
  addLike: (userId?: Types.ObjectId | string, guestId?: string) => void;
  removeLike: (userId?: Types.ObjectId | string, guestId?: string) => void;
}

const CommentUserSchema: Schema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
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

const CommentSchema: Schema = new Schema({
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

const LikeSchema: Schema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
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

const BlogSchema: Schema = new Schema({
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
    type: Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  subcategory: {
    type: Schema.Types.ObjectId,
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
    type: Schema.Types.ObjectId,
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
BlogSchema.virtual('likeCount').get(function(this: IBlog) {
  if (!this.likes || !Array.isArray(this.likes)) {
    return 0; // Return 0 if likes is undefined or not an array
  }
  return this.likes.length;
});

// Virtual for approved comment count
// Virtual for approved comment count
BlogSchema.virtual('approvedCommentCount').get(function(this: IBlog) {
  if (!this.comments || !Array.isArray(this.comments)) {
    return 0; // Return 0 if comments is undefined or not an array
  }
  return this.comments.filter((comment: IComment) => comment.isApproved).length;
});

// Method to check if a user/guest has liked the blog
BlogSchema.methods.hasLiked = function(
  this: IBlog, 
  userId?: Types.ObjectId | string, 
  guestId?: string
): boolean {
  if (userId) {
    const userIdStr = typeof userId === 'string' ? userId : userId.toString();
    return this.likes.some((like: ILike) => 
      like.userId && like.userId.toString() === userIdStr
    );
  }
  
  if (guestId) {
    return this.likes.some((like: ILike) => 
      like.guestId && like.guestId === guestId
    );
  }
  
  return false;
};

// Method to add a like
BlogSchema.methods.addLike = function(
  this: IBlog,
  userId?: Types.ObjectId | string,
  guestId?: string
): void {
  if (this.hasLiked(userId, guestId)) return;
  
  const like: ILike = {
    userId: userId ? new Types.ObjectId(userId) : undefined,
    guestId,
    createdAt: new Date()
  };
  
  this.likes.push(like);
};

// Method to remove a like
BlogSchema.methods.removeLike = function(
  this: IBlog,
  userId?: Types.ObjectId | string,
  guestId?: string
): void {
  if (userId) {
    const userIdStr = typeof userId === 'string' ? userId : userId.toString();
    this.likes = this.likes.filter((like: ILike) => 
      !like.userId || like.userId.toString() !== userIdStr
    );
  } else if (guestId) {
    this.likes = this.likes.filter((like: ILike) => 
      !like.guestId || like.guestId !== guestId
    );
  }
};

// Ensure virtual fields are serialized
BlogSchema.set('toJSON', { virtuals: true });
BlogSchema.set('toObject', { virtuals: true });

// Create and export the model
export default mongoose.model<IBlog>('Blog', BlogSchema);