// models/User.ts - Updated with role field
import mongoose, { Document, Model, Schema, Types } from "mongoose";
import jwt from "jsonwebtoken";
import Joi from "joi";
import bcrypt from "bcrypt";

export interface IUser extends Document {
  _id: Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: 'user' | 'admin'; // Added role field
  verified: boolean;
  verificationLinkSent: boolean;
  avatarLink?: string;
  isActive: boolean;
  lastSeen: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  generateAuthToken: () => string;
  comparePassword: (candidatePassword: string) => Promise<boolean>;
  updatePresence: () => Promise<void>;
}

const userSchema = new Schema<IUser>(
  {
    firstName: { 
      type: String, 
      required: true, 
      trim: true,
      maxlength: 50 
    },
    lastName: { 
      type: String, 
      required: true, 
      trim: true,
      maxlength: 50 
    },
    email: { 
      type: String, 
      required: true, 
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    password: { 
      type: String, 
      required: true,
      minlength: 6
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user'
    },
    verified: { 
      type: Boolean, 
      default: false 
    },
    verificationLinkSent: { 
      type: Boolean, 
      default: false 
    },
    avatarLink: { 
      type: String,
      default: '/default-avatar.jpg'
    },
    isActive: {
      type: Boolean,
      default: false
    },
    lastSeen: {
      type: Date,
      default: Date.now
    }
  },
  { 
    timestamps: true,
    toJSON: {
      transform: function(doc, ret) {
        //@ts-ignore
        delete ret.password;
        //@ts-ignore
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Indexes for better query performance
userSchema.index({ email: 1 });
userSchema.index({ isOnline: 1 });
userSchema.index({ createdAt: 1 });
userSchema.index({ lastName: 1, firstName: 1 });
userSchema.index({ role: 1 }); // Added index for role

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    // Use 12 salt rounds directly with bcrypt.hash
    this.password = await bcrypt.hash(this.password, 12);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Generate auth token method
userSchema.methods.generateAuthToken = function(): string {
  return jwt.sign(
    {
      _id: this._id,
      firstName: this.firstName,
      lastName: this.lastName,
      email: this.email,
      role: this.role // Include role in JWT
    },
    process.env.JWTPRIVATEKEY as string,
    { expiresIn: "7d" }
  );
};

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Update presence method
userSchema.methods.updatePresence = async function(): Promise<void> {
  this.lastSeen = new Date();
  await this.save();
};

// Static method to find users by status
userSchema.statics.findByStatus = function(status: 'online' | 'offline' | 'recent') {
  const query: any = {};
  
  if (status === 'online') {
    query.isOnline = true;
  } else if (status === 'offline') {
    query.isOnline = false;
  } else if (status === 'recent') {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    query.lastSeen = { $gte: twentyFourHoursAgo };
  }
  
  return this.find(query).select('-password');
};

// Static method to find users by role
userSchema.statics.findByRole = function(role: 'user' | 'admin') {
  return this.find({ role }).select('-password');
};

export const User: Model<IUser> = mongoose.model<IUser>("User", userSchema);

// Validation schemas - Update to include role
export const validateRegister = (data: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role?: string;
}) => {
  const schema = Joi.object({
    firstName: Joi.string().required().label("First Name"),
    lastName: Joi.string().required().label("Last Name"),
    email: Joi.string().email().required().label("Email"),
    password: Joi.string()
      .min(8)
      .max(26)
      .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])'))
      .required()
      .label("Password")
      .messages({
        'string.pattern.base': 'Password must contain at least one lowercase, one uppercase, one number, and one special character'
      }),
    role: Joi.string().valid('user', 'admin').optional().label("Role")
  });
  return schema.validate(data);
};

// In your usermodel.ts, update the validateLogin function:
export const validateLogin = (data: { 
  email: string; 
  password: string;
}) => {
  const schema = Joi.object({
    email: Joi.string().email().required().label("Email"),
    password: Joi.string()
      .min(8)
      .max(26)
      .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])'))
      .required()
      .label("Password")
      .messages({
        'string.pattern.base': 'Invalid password format'
      })
  });
  return schema.validate(data); 
};

export const validateProfileUpdate = (data: {
  firstName?: string;
  lastName?: string;
  avatarLink?: string;
  role?: string;
}) => {
  const schema = Joi.object({
    firstName: Joi.string().optional().label("First Name"),
    lastName: Joi.string().optional().label("Last Name"),
    avatarLink: Joi.string().uri().optional().label("Avatar Link"),
    role: Joi.string().valid('user', 'admin').optional().label("Role")
  });
  return schema.validate(data);
};