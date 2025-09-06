"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const usermodel_1 = require("../models/usermodel");
// import { cacheMiddleware } from "../utils/redis";
// import { DashboardController } from '../controllers/dashboardcontroller';
// Controllers
const registercontroller_js_1 = __importDefault(require("../controllers/registercontroller.js"));
// import { peoplecontroller } from '../controllers/peoplecontroller.js';
const logincontroller_js_1 = __importDefault(require("../controllers/logincontroller.js"));
const profilecontroller_js_1 = require("../controllers/profilecontroller.js");
// Middleware
const router = express_1.default.Router();
// Authentication Routes
router.post("/register", registercontroller_js_1.default);
router.post("/login", logincontroller_js_1.default);
router.post("/logout", (req, res) => {
    try {
        res.clearCookie('authToken', {
            // httpOnly: true,
            sameSite: 'none',
            secure: true,
            path: '/'
        });
        res.status(200).json({ message: 'Logged out successfully' });
    }
    catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ message: 'Logout failed' });
    }
});
// Profile Routes
router.get("/profile", profilecontroller_js_1.profileController);
router.patch("/profile/update", profilecontroller_js_1.profileUpdate);
// router.get('/dashboard/stats',DashboardController.getDashboardStats)
// router.get('/dashboard/activity',DashboardController.getRecentActivity)
// router.get('/dashboard/health',DashboardController.getSystemHealth)
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { category, search } = req.query;
        const query = {};
        if (category)
            query.category = category;
        if (search)
            query.$text = { $search: search };
        const users = yield usermodel_1.User.find(query);
        return res.json({
            success: true,
            data: users
        });
    }
    catch (error) {
        console.error('Error fetching products:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch products'
        });
    }
}));
// People Routes
// Message Routes
exports.default = router;
