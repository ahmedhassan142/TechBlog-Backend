"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.validateProfileUpdate = exports.validateLogin = exports.validateRegister = exports.User = void 0;
// models/User.ts - Updated with role field
const mongoose_1 = __importStar(require("mongoose"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const joi_1 = __importDefault(require("joi"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const userSchema = new mongoose_1.Schema({
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
}, {
    timestamps: true,
    toJSON: {
        transform: function (doc, ret) {
            //@ts-ignore
            delete ret.password;
            //@ts-ignore
            delete ret.__v;
            return ret;
        }
    }
});
// Indexes for better query performance
userSchema.index({ email: 1 });
userSchema.index({ isOnline: 1 });
userSchema.index({ createdAt: 1 });
userSchema.index({ lastName: 1, firstName: 1 });
userSchema.index({ role: 1 }); // Added index for role
// Hash password before saving
userSchema.pre('save', function (next) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!this.isModified('password'))
            return next();
        try {
            // Use 12 salt rounds directly with bcrypt.hash
            this.password = yield bcrypt_1.default.hash(this.password, 12);
            next();
        }
        catch (error) {
            next(error);
        }
    });
});
// Generate auth token method
userSchema.methods.generateAuthToken = function () {
    return jsonwebtoken_1.default.sign({
        _id: this._id,
        firstName: this.firstName,
        lastName: this.lastName,
        email: this.email,
        role: this.role // Include role in JWT
    }, process.env.JWTPRIVATEKEY, { expiresIn: "7d" });
};
// Compare password method
userSchema.methods.comparePassword = function (candidatePassword) {
    return __awaiter(this, void 0, void 0, function* () {
        return bcrypt_1.default.compare(candidatePassword, this.password);
    });
};
// Update presence method
userSchema.methods.updatePresence = function () {
    return __awaiter(this, void 0, void 0, function* () {
        this.lastSeen = new Date();
        yield this.save();
    });
};
// Static method to find users by status
userSchema.statics.findByStatus = function (status) {
    const query = {};
    if (status === 'online') {
        query.isOnline = true;
    }
    else if (status === 'offline') {
        query.isOnline = false;
    }
    else if (status === 'recent') {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        query.lastSeen = { $gte: twentyFourHoursAgo };
    }
    return this.find(query).select('-password');
};
// Static method to find users by role
userSchema.statics.findByRole = function (role) {
    return this.find({ role }).select('-password');
};
exports.User = mongoose_1.default.model("User", userSchema);
// Validation schemas - Update to include role
const validateRegister = (data) => {
    const schema = joi_1.default.object({
        firstName: joi_1.default.string().required().label("First Name"),
        lastName: joi_1.default.string().required().label("Last Name"),
        email: joi_1.default.string().email().required().label("Email"),
        password: joi_1.default.string()
            .min(8)
            .max(26)
            .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])'))
            .required()
            .label("Password")
            .messages({
            'string.pattern.base': 'Password must contain at least one lowercase, one uppercase, one number, and one special character'
        }),
        role: joi_1.default.string().valid('user', 'admin').optional().label("Role")
    });
    return schema.validate(data);
};
exports.validateRegister = validateRegister;
// In your usermodel.ts, update the validateLogin function:
const validateLogin = (data) => {
    const schema = joi_1.default.object({
        email: joi_1.default.string().email().required().label("Email"),
        password: joi_1.default.string()
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
exports.validateLogin = validateLogin;
const validateProfileUpdate = (data) => {
    const schema = joi_1.default.object({
        firstName: joi_1.default.string().optional().label("First Name"),
        lastName: joi_1.default.string().optional().label("Last Name"),
        avatarLink: joi_1.default.string().uri().optional().label("Avatar Link"),
        role: joi_1.default.string().valid('user', 'admin').optional().label("Role")
    });
    return schema.validate(data);
};
exports.validateProfileUpdate = validateProfileUpdate;
