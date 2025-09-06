import express from "express";
import { Request, Response } from 'express';
import { User } from "@/models/usermodel.js";


// import { cacheMiddleware } from "../utils/redis";
// import { DashboardController } from '../controllers/dashboardcontroller';

// Controllers
import registerController from '../controllers/registercontroller.js';
// import { peoplecontroller } from '../controllers/peoplecontroller.js';
import loginController from '../controllers/logincontroller.js';
import { profileController, profileUpdate } from '../controllers/profilecontroller.js';

// Middleware


const router = express.Router();

// Authentication Routes
router.post("/register", registerController);
router.post("/login", loginController);
router.post("/logout", (req: Request, res: Response) => {
  try {
    res.clearCookie('authToken', {
      // httpOnly: true,
      sameSite: 'none',
      secure: true,
      path: '/'
    });
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Logout failed' });
  }
});

// Profile Routes
router.get("/profile",  profileController);
router.patch("/profile/update", profileUpdate);
// router.get('/dashboard/stats',DashboardController.getDashboardStats)
// router.get('/dashboard/activity',DashboardController.getRecentActivity)
// router.get('/dashboard/health',DashboardController.getSystemHealth)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { category, search } = req.query;

    const query: any = {};
    
    if (category) query.category = category;
    if (search) query.$text = { $search: search as string };

    const users = await User.find(query);

    return res.json({
      success: true,
      data: users
    });

  } catch (error) {
    console.error('Error fetching products:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch products'
    });
  }
});

// People Routes


// Message Routes





export default router;