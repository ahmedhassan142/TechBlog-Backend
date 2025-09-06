"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/subscriptionRoutes.ts
const express = require('express');
const subscriptionController_1 = require("../controllers/subscriptionController");
const authmiddleware_1 = require("../middleware/authmiddleware");
const router = express.Router();
// Public routes
router.post('/subscribe', subscriptionController_1.subscribe);
router.get('/verify/:token', subscriptionController_1.verifySubscription);
router.post('/unsubscribe', subscriptionController_1.unsubscribe);
// Admin routes
router.get('/subscriptions', authmiddleware_1.authenticate, (0, authmiddleware_1.authorize)('admin'), subscriptionController_1.getSubscriptions);
exports.default = router;
