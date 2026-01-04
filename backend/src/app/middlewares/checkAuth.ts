import httpStatus from "http-status";
import { Secret } from "jsonwebtoken";
import { catchAsync, verifyToken, prisma } from "@/shared";
import { ApiError } from "@/app/errors";
import { envVars, activityRateLimiter } from "@/config";

/**
 * Authentication Middleware with Activity Tracking
 * - Verifies JWT token
 * - Checks user role authorization
 * - Updates lastActiveAt (rate-limited via Redis)
 */
export const checkAuth = (...roles: string[]) => {
  return catchAsync(async (req, res, next) => {
    const token = req.cookies.accessToken;

    if (!token)
      throw new ApiError(
        httpStatus.UNAUTHORIZED,
        "You are not authorized!"
      );

    const verifyUser = verifyToken(
      token,
      envVars.JWT.JWT_SECRET as Secret
    );

    req.user = verifyUser;

    if (roles.length && !roles.includes(verifyUser.role))
      throw new ApiError(
        httpStatus.UNAUTHORIZED,
        "You are not authorized!"
      );

    // Update lastActiveAt with Redis rate limiting (once per 5 minutes)
    try {
      await activityRateLimiter.consume(verifyUser.userId);
      
      // First time in 5 minutes - update activity timestamp
      prisma.user.update({
        where: { id: verifyUser.userId },
        data: { lastActiveAt: new Date() }
      }).catch(() => {
        // Silently fail - activity tracking shouldn't break authentication
      });
    } catch {
      // Rate limited - skip update (already updated in last 5 minutes)
    }

    next();
  });
};


