// src/controllers/subscriptionController.ts
import { Response } from 'express';
import { AuthRequest } from '../utils/types';
import Subscription from '../models/Subscription';
import { ApiResponse } from '../utils/types';
import crypto from 'crypto';
import { sendEmail } from '../utils/sendEmail'; // Your existing sendEmail function

// Generate verification token
const generateVerificationToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

// Subscribe to newsletter
export const subscribe = async (req: AuthRequest, res: Response) => {
  try {
    const { email } = req.body;

    // Validate email
    if (!email || !email.match(/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/)) {
      const response: ApiResponse = {
        success: false,
        message: 'Please provide a valid email address'
      };
      return res.status(400).json(response);
    }

    const normalizedEmail = email.toLowerCase();

    // Check if email already exists
    const existingSubscription = await Subscription.findOne({ email: normalizedEmail });

    if (existingSubscription) {
      if (existingSubscription.isVerified) {
        const response: ApiResponse = {
          success: false,
          message: 'This email is already subscribed to our newsletter'
        };
        return res.status(409).json(response);
      } else {
        // Resend verification email if not verified
        await sendVerificationEmail(existingSubscription.email, existingSubscription.verificationToken);
        
        const response: ApiResponse = {
          success: true,
          message: 'Verification email sent. Please check your inbox to confirm your subscription.'
        };
        return res.json(response);
      }
    }

    // Create new subscription
    const verificationToken = generateVerificationToken();
    const subscription = new Subscription({
      email: normalizedEmail,
      verificationToken,
      isVerified: false
    });

    await subscription.save();

    // Send verification email
    await sendVerificationEmail(email, verificationToken);

    const response: ApiResponse = {
      success: true,
      message: 'Verification email sent. Please check your inbox to confirm your subscription.'
    };
    res.status(201).json(response);

  } catch (error) {
    console.error('Subscription error:', error);
    const response: ApiResponse = {
      success: false,
      message: 'Server error. Please try again later.'
    };
    res.status(500).json(response);
  }
};

// Verify email subscription
export const verifySubscription = async (req: AuthRequest, res: Response) => {
  try {
    const { token } = req.params;

    const subscription = await Subscription.findOne({ verificationToken: token });

    if (!subscription) {
      const response: ApiResponse = {
        success: false,
        message: 'Invalid verification token'
      };
      return res.status(404).json(response);
    }

    if (subscription.isVerified) {
      const response: ApiResponse = {
        success: true,
        message: 'Email is already verified'
      };
      return res.json(response);
    }

    // Mark as verified
    subscription.isVerified = true;
    subscription.verificationToken = '';
    await subscription.save();

    // Send welcome email
    await sendWelcomeEmail(subscription.email);

    const response: ApiResponse = {
      success: true,
      message: 'Email verified successfully. Thank you for subscribing!'
    };
    res.json(response);

  } catch (error) {
    console.error('Verification error:', error);
    const response: ApiResponse = {
      success: false,
      message: 'Server error. Please try again later.'
    };
    res.status(500).json(response);
  }
};

// Unsubscribe from newsletter
export const unsubscribe = async (req: AuthRequest, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      const response: ApiResponse = {
        success: false,
        message: 'Email is required'
      };
      return res.status(400).json(response);
    }

    const subscription = await Subscription.findOne({ 
      email: email.toLowerCase(),
      isVerified: true 
    });

    if (!subscription) {
      const response: ApiResponse = {
        success: false,
        message: 'Email not found in our subscription list'
      };
      return res.status(404).json(response);
    }

    // Mark as unsubscribed
    subscription.unsubscribedAt = new Date();
    await subscription.save();

    const response: ApiResponse = {
      success: true,
      message: 'You have been unsubscribed from our newsletter'
    };
    res.json(response);

  } catch (error) {
    console.error('Unsubscribe error:', error);
    const response: ApiResponse = {
      success: false,
      message: 'Server error. Please try again later.'
    };
    res.status(500).json(response);
  }
};

// Get all subscriptions (admin only)
export const getSubscriptions = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 10, verified } = req.query;
    
    const query: any = {};
    if (verified !== undefined) {
      query.isVerified = verified === 'true';
    }

    const subscriptions = await Subscription.find(query)
      .sort({ subscribedAt: -1 })
      .limit(Number(limit) * 1)
      .skip((Number(page) - 1) * Number(limit));

    const total = await Subscription.countDocuments(query);

    const response: ApiResponse = {
      success: true,
      message: 'Subscriptions retrieved successfully',
      data: {
        subscriptions,
        totalPages: Math.ceil(total / Number(limit)),
        currentPage: Number(page),
        total
      }
    };
    res.json(response);

  } catch (error) {
    console.error('Get subscriptions error:', error);
    const response: ApiResponse = {
      success: false,
      message: 'Server error. Please try again later.'
    };
    res.status(500).json(response);
  }
};

// Email sending functions using your existing sendEmail
const sendVerificationEmail = async (email: string, token: string) => {
  const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email/${token}`;
  
  await sendEmail({
    email,
    subject: 'Verify your email subscription - Blog3D',
    text: `Please verify your email by clicking this link: ${verificationUrl}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Welcome to Blog3D Newsletter!</h2>
        <p>Thank you for subscribing to our newsletter. Please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Verify Email Address
          </a>
        </div>
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
        <p>This link will expire in 24 hours.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">
          If you didn't request this subscription, please ignore this email.
        </p>
      </div>
    `
  });
};

const sendWelcomeEmail = async (email: string) => {
  const unsubscribeUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/unsubscribe?email=${email}`;
  
  await sendEmail({
    email,
    subject: 'Welcome to Blog3D Newsletter!',
    text: `Welcome to Blog3D! Thank you for verifying your email address. You're now subscribed to our newsletter. To unsubscribe, visit: ${unsubscribeUrl}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Welcome to Blog3D!</h2>
        <p>Thank you for verifying your email address. You're now subscribed to our newsletter.</p>
        <p>We'll send you updates about:</p>
        <ul>
          <li>New blog posts and articles</li>
          <li>Latest trends in technology</li>
          <li>Exclusive content and insights</li>
          <li>Community updates and events</li>
        </ul>
        <p>We're excited to have you as part of our community!</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">
          To unsubscribe at any time, click here: 
          <a href="${unsubscribeUrl}">Unsubscribe</a>
        </p>
      </div>
    `
  });
};