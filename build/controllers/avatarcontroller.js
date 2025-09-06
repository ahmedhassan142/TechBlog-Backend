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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllAvatars = exports.avatarcontroller = void 0;
const avatar_js_1 = require("../models/avatar.js");
const avatarcontroller = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { link } = req.body;
    if (!link) {
        return res.status(400).json({ error: "Link is required" });
    }
    try {
        const newAvatar = new avatar_js_1.Avatar({ link });
        yield newAvatar.save();
        return res.status(201).json({
            success: true,
            message: "Avatar link added successfully"
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});
exports.avatarcontroller = avatarcontroller;
const getAllAvatars = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const avatars = yield avatar_js_1.Avatar.find();
        return res.status(200).json({ success: true, avatars });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});
exports.getAllAvatars = getAllAvatars;
