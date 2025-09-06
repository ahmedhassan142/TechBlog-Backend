"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const profilecontroller_js_1 = require("../controllers/profilecontroller.js");
const profilecontroller_js_2 = require("../controllers/profilecontroller.js");
// import { cacheMiddleware } from "../utils/redis";
const router = express_1.default.Router();
// router.post("/", avatarcontroller);
router.get("/all", profilecontroller_js_2.getAllAvatars);
router.post("/download", profilecontroller_js_1.downloadAvatars);
router.post("/upload", profilecontroller_js_1.uploadAvatar);
exports.default = router;
