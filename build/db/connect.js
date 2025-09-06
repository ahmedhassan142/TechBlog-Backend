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
const mongoose_1 = __importDefault(require("mongoose"));
const connectDB = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Validate environment variable
        if (!process.env.DB) {
            throw new Error('MongoDB connection string not found in environment variables');
        }
        // Connect to MongoDB
        yield mongoose_1.default.connect(process.env.DB);
        console.log('✅ DB CONNECTED SUCCESSFULLY');
        // Connection event listeners
        mongoose_1.default.connection.on('connected', () => {
            console.log('Mongoose connected to DB');
        });
        mongoose_1.default.connection.on('error', (err) => {
            console.error('Mongoose connection error:', err);
        });
        mongoose_1.default.connection.on('disconnected', () => {
            console.log('Mongoose disconnected from DB');
        });
    }
    catch (error) {
        // Improved error handling
        if (error instanceof Error) {
            console.error('❌ Database connection error:', error.message);
        }
        else {
            console.error('❌ An unknown error occurred while connecting to DB');
        }
        // Exit process with failure (recommended for production)
        process.exit(1);
    }
});
exports.default = connectDB;
