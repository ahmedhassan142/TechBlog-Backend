// Middleware to extract session ID (Express.js)
import { Request,Response,NextFunction } from "express";
export const sessionMiddleware = (req: any, res: Response, next: NextFunction) => {
  // Get session ID from header or cookies
  const sessionId = req.headers['x-session-id'] || req.cookies.sessionId;
  
  if (sessionId) {
    req.sessionId = sessionId;
  }
  
  next();
};

