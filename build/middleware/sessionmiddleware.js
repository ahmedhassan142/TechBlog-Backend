"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionMiddleware = void 0;
const sessionMiddleware = (req, res, next) => {
    // Get session ID from header or cookies
    const sessionId = req.headers['x-session-id'] || req.cookies.sessionId;
    if (sessionId) {
        req.sessionId = sessionId;
    }
    next();
};
exports.sessionMiddleware = sessionMiddleware;
