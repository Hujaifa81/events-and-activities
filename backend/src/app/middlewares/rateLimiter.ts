// src/app/middlewares/rateLimiter.ts

import { Request, Response, NextFunction } from 'express';
import { apiRateLimiter, loginRateLimiter } from '@/config';

/**
 * API Rate Limiter Middleware
 * Limit: 100 requests per minute
 */
export const apiRateLimiterMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const key = req.user?.userId || req.ip || 'anonymous';
    await apiRateLimiter.consume(key);
    next();
  } catch (error) {
    console.log(error);
    res.status(429).json({
      success: false,
      message: 'Too many requests. Please try again later.',
      statusCode: 429,
    });
  }
};

/**
 * Login Rate Limiter Middleware
 * Limit: 5 attempts per 15 minutes
 */
export const loginRateLimiterMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const key = req.body.email || req.ip;
    await loginRateLimiter.consume(key);
    next();
  } catch (error) {
    console.log(error);
    res.status(429).json({
      success: false,
      message: 'Too many login attempts. Try again after 15 minutes.',
      statusCode: 429,
    });
  }
};