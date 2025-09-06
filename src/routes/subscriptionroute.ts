// src/routes/subscriptionRoutes.ts
const express=require('express')
import {
  subscribe,
  verifySubscription,
  unsubscribe,
  getSubscriptions
} from '../controllers/subscriptionController';
import { authenticate, authorize } from '../middleware/authmiddleware';

const router = express.Router();

// Public routes
router.post('/subscribe', subscribe);
router.get('/verify/:token', verifySubscription);
router.post('/unsubscribe', unsubscribe);

// Admin routes
router.get('/subscriptions', authenticate, authorize('admin'), getSubscriptions);

export default router;