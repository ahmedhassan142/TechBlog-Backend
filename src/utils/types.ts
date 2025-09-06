// src/types/index.ts
import { Request } from 'express';
import { Types } from 'mongoose';
//@ts-ignore
export interface AuthRequest extends Request {
  user?: {
    id: Types.ObjectId;
    name: string;
    firstName:string;
    lastName:string;
    email: string;
   avatarLink:string;
   role:string;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface Subscriber {
  email: string;
  subscribedAt: Date;
}