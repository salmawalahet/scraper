import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/token';
import { IJwtPayload, UserRole, HTTP_STATUS } from '@leadx/shared';
import { logger } from '../utils/logger';

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: IJwtPayload;
    }
  }
}

/**
 * JWT authentication middleware
 * Extracts and verifies the access token from Authorization header
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: 'Access token is required',
      });
      return;
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);

    req.user = payload;
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: 'Access token expired',
        code: 'TOKEN_EXPIRED',
      });
      return;
    }

    logger.warn('Authentication failed', { error: error.message });
    res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      error: 'Invalid access token',
    });
  }
}
