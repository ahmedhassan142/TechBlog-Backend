import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/usermodel.js";
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt'

import { upload,handleUploadErrors } from "../utils/uploadconfig.js";

interface JwtPayload {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface UpdateProfileBody {
  firstName?: string;
  lastName?: string;
  email?: string;
  avatarLink?: string;
  currentPassword?: string;
  newPassword?: string;
}

// Configure multer for avatar uploads
export const uploadAvatar = [
  upload.single('avatar'),
  handleUploadErrors,
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const token = req.cookies?.authToken;
      if (!token) {
        // Clean up the uploaded file if auth fails
        if (req.file) {
          const fs = require('fs');
          fs.unlinkSync(req.file.path);
        }
        return res.status(401).json({ error: "Authentication required" });
      }

      const userData = jwt.verify(token, process.env.JWTPRIVATEKEY as string) as JwtPayload;
      
      const newAvatar = {
         _id: uuidv4(),
    link: `/uploads/avatars/${req.file.filename}`,
   
        
       
      };

      await User.updateOne(
        { _id: userData._id },
        { $set: { avatarLink: newAvatar.link } }
      );

      res.json({
        success: true,
        avatar: newAvatar,
        message: 'Avatar uploaded successfully'
      });
    } catch (err) {
      // Clean up the uploaded file if error occurs
      if (req.file) {
        const fs = require('fs');
        fs.unlinkSync(req.file.path);
      }
      
      console.error('Avatar upload error:', err);
      if (err instanceof jwt.JsonWebTokenError) {
        return res.status(403).json({ error: "Invalid token" });
      }
      res.status(500).json({ error: "Server error" });
    }
  }
];

// Default avatars (could be moved to a model or config)
const defaultAvatars = [
  { _id: '1', link: '/avatar1.jpg' },
  { _id: '2', link: '/avatar2.jpg' },
  { _id: '3', link: '/avatar3.jpg' },
  { _id: '4', link: '/avatar4.jpg' },
  { _id: '5', link: '/avatar5.jpg' },
  { _id: '6', link: '/avatar6.jpg' }
];

// Profile Controller
export const profileController = async (req: Request, res: Response) => {
  try {
    const token = req.cookies?.authToken || req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const userData = jwt.verify(token, process.env.JWTPRIVATEKEY as string) as JwtPayload;
    const user = await User.findOne({ _id: userData._id }).select('-password');
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      avatarLink: user.avatarLink
    });
  } catch (err) {
    console.error('Profile error:', err);
    if (err instanceof jwt.JsonWebTokenError) {
      return res.status(403).json({ error: "Invalid token" });
    }
    res.status(500).json({ error: "Server error" });
  }
};

// Profile Update Controller


// Profile Update Controller with password support
export const profileUpdate = async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const decoded = jwt.verify(token, process.env.JWTPRIVATEKEY as string) as JwtPayload;
    
    const { firstName, lastName, avatarLink, currentPassword, newPassword } = req.body as UpdateProfileBody;
    
    // Find user by ID from token - MUST select password field
    const user = await User.findOne({ _id: decoded._id }).select('+password');

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    console.log('Profile update - User:', user.email);
    console.log('Stored hash:', user.password);
    console.log('Current password input:', currentPassword);

    // Handle password change if provided
    if (currentPassword && newPassword) {
      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
      console.log('Bcrypt comparison result:', isPasswordValid);
      
      if (!isPasswordValid) {
        return res.status(400).json({ error: "Current password is incorrect" });
      }
      
      // Validate new password
      if (newPassword.length < 6) {
        return res.status(400).json({ error: "New password must be at least 6 characters" });
      }
      
      // Set plain text password - let Mongoose handle hashing
      user.password = newPassword;
    }

    // Update profile fields
    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    if (avatarLink !== undefined) user.avatarLink = avatarLink;
    
    await user.save();
    
    res.json({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      avatarLink: user.avatarLink,
      message: currentPassword ? "Profile and password updated successfully" : "Profile updated successfully"
    });
  } catch (err) {
    console.error('Profile update error:', err);
    if (err instanceof jwt.JsonWebTokenError) {
      return res.status(403).json({ error: "Invalid token" });
    }
    res.status(500).json({ error: "Server error" });
  }
};
// Avatar Controllers
export const getAllAvatars = async (req: Request, res: Response) => {
  try {
    // In a real app, you might want to combine default avatars with user-uploaded ones
    res.json({ avatars: defaultAvatars });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};


export const downloadAvatars = async (req: Request, res: Response) => {
  try {
    const token = req.cookies?.authToken;
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { urls } = req.body;
    
    if (!urls || !Array.isArray(urls)) {
      return res.status(400).json({ error: 'Invalid URLs provided' });
    }

    const newAvatars = urls.map((url, i) => ({
      _id: `downloaded-${i}`,
      link: url
    }));

    // In a real app, you would save these to your database
    res.json({ 
      message: 'Default avatars downloaded', 
      avatars: newAvatars 
    });
  } catch (err) {
    console.error('Download avatars error:', err);
    if (err instanceof jwt.JsonWebTokenError) {
      return res.status(403).json({ error: "Invalid token" });
    }
    res.status(500).json({ error: "Server error" });
  }
};