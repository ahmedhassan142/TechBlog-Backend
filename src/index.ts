// server/app.ts
const express=require("express")

import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import cookieParser from "cookie-parser";
import  connectDB from './db/connect'
import fs from 'fs';

import { sendEmail } from './utils/sendEmail'; // Your provided function
import { getWelcomeEmailTemplate } from './utils/emailtemplate'; // From previous example

// Import routes
import categoryRoutes from './routes/categoryroute';
import blogRoutes from './routes/blogroute';
import userroute from './routes/userroute'
import verifyroute from './routes/verifyroute'
import avatarroute from './routes/avatarroute'
import { sessionMiddleware } from './middleware/sessionmiddleware';
import subscriptionroute from './routes/subscriptionroute'

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use(cors({
  origin: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE","PATCH"],
  allowedHeaders: ["Content-Type", "Authorization","withCredentials","x-session-id"]
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));











const STORAGE_FILE = path.join(__dirname, 'storage.json');

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }));
app.use(express.json());

// Interface for Subscriber
interface Subscriber {
  email: string;
  subscribedAt: string;
}

// Helper function to read subscribers from JSON file
const readSubscribers = (): Subscriber[] => {
  try {
    if (!fs.existsSync(STORAGE_FILE)) {
      return [];
    }
    const data = fs.readFileSync(STORAGE_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading storage file:', error);
    return [];
  }
};

// Helper function to write subscribers to JSON file
const writeSubscribers = (subscribers: Subscriber[]): void => {
  try {
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(subscribers, null, 2));
  } catch (error) {
    console.error('Error writing to storage file:', error);
    throw new Error('Failed to save subscriber');
  }
};

// Helper function to check if email already exists
const isEmailAlreadySubscribed = (email: string): boolean => {
  const subscribers = readSubscribers();
  return subscribers.some(sub => sub.email.toLowerCase() === email.toLowerCase());
};

// Helper function to add new subscriber
const addNewSubscriber = async (email: string): Promise<void> => {
  try {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }

    // Check for duplicate email
    if (isEmailAlreadySubscribed(email)) {
      throw new Error('Email already subscribed');
    }

    // Create new subscriber object
    const newSubscriber: Subscriber = {
      email: email.toLowerCase(), // Store in lowercase for consistency
      subscribedAt: new Date().toISOString()
    };

    // Get existing subscribers and add new one
    const subscribers = readSubscribers();
    subscribers.push(newSubscriber);

    // Save to file
    writeSubscribers(subscribers);

    console.log(`New subscriber added: ${email}`);

    // Send welcome email (fire and forget - don't await)
    try {
      const { subject, text, html } = getWelcomeEmailTemplate(email);
      sendEmail({ email, subject, text, html })
        .then(() => console.log(`Welcome email sent to: ${email}`))
        .catch((err) => console.error(`Failed to send welcome email to ${email}:`, err));
    } catch (emailError) {
      console.error('Error in email sending process:', emailError);
      // Don't throw error - subscription should still succeed even if email fails
    }

  } catch (error) {
    // Re-throw with more context if it's not already an Error object
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Unknown error occurred while adding subscriber');
  }
};

// API Route to handle subscription
app.post('/api/subscribe', async (req: Request, res: Response) => {

  //@ts-ignore
  const { email } = req.body;


  // Check if email is provided
  if (!email || typeof email !== 'string') {
    
  //@ts-ignore
    return res.status(400).json({ 
      success: false,
      error: 'Email address is required' 
    });
  }

  try {
    // Add subscriber (this includes validation and email sending)
    await addNewSubscriber(email);

    // Success response
    
  //@ts-ignore
    res.status(200).json({ 
      success: true,
      message: 'Successfully subscribed to the newsletter! A confirmation email has been sent.',
      data: { email }
    });

  } catch (error: any) {
    console.error('Subscription error:', error);

    // Handle different error types with appropriate status codes
    if (error.message === 'Email already subscribed') {
      
  //@ts-ignore
      return res.status(409).json({ 
        success: false,
        error: error.message 
      });
    }

    if (error.message === 'Invalid email format') {
      
  //@ts-ignore
      return res.status(400).json({ 
        success: false,
        error: 'Please provide a valid email address' 
      });
    }

    // Generic server error for other cases
    
  //@ts-ignore
    res.status(500).json({ 
      success: false,
      error: 'Internal server error. Please try again later.' 
    });
  }
});



// Start server

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/categories', categoryRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/user', userroute);
app.use('/api/verify', verifyroute);
app.use("/api/avatar", avatarroute);
app.use('/api',subscriptionroute)


 app.use(sessionMiddleware);


 connectDB();
 


app.listen(4001, () => {
  console.log(`Server is running on port 4001`);
});

export default app;