import { Request, Response } from 'express';
import { userService } from '../services/user.service';
import { activityService } from '../services/activity.service';
import { hashPassword, comparePassword } from '../utils/password';
import { generateTokenPair, verifyRefreshToken } from '../utils/token';
import { IJwtPayload, ActivityAction, EntityType, HTTP_STATUS } from '@leadx/shared';
import { logger } from '../utils/logger';

export class AuthController {
  /**
   * POST /auth/register
   */
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, name } = req.body;

      // Check if email already exists
      const exists = await userService.emailExists(email);
      if (exists) {
        res.status(HTTP_STATUS.CONFLICT).json({
          success: false,
          error: 'Email already registered',
        });
        return;
      }

      // Hash password and create user
      const passwordHash = await hashPassword(password);
      const userId = await userService.create({ email, password_hash: passwordHash, name });

      // Generate tokens
      const payload: IJwtPayload = { userId, email, role: 'user' as any };
      const tokens = generateTokenPair(payload);

      // Store refresh token
      await userService.updateRefreshToken(userId, tokens.refreshToken);
      await userService.updateLastLogin(userId);

      // Log activity
      await activityService.log({
        userId,
        action: ActivityAction.USER_REGISTER,
        entityType: EntityType.USER,
        entityId: userId,
        ipAddress: req.ip,
      });

      const user = await userService.findById(userId);

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        data: { user, tokens },
        message: 'Registration successful',
      });
    } catch (error) {
      logger.error('Registration failed', { error });
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Registration failed',
      });
    }
  }

  /**
   * POST /auth/login
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      // Find user
      const user = await userService.findByEmail(email);
      if (!user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: 'Invalid email or password',
        });
        return;
      }

      // Check if user is active
      if (!user.is_active) {
        res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          error: 'Account is deactivated',
        });
        return;
      }

      // Verify password
      const isValid = await comparePassword(password, user.password_hash);
      if (!isValid) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: 'Invalid email or password',
        });
        return;
      }

      // Generate tokens
      const payload: IJwtPayload = { userId: user.id, email: user.email, role: user.role };
      const tokens = generateTokenPair(payload);

      // Store refresh token and update last login
      await userService.updateRefreshToken(user.id, tokens.refreshToken);
      await userService.updateLastLogin(user.id);

      // Log activity
      await activityService.log({
        userId: user.id,
        action: ActivityAction.USER_LOGIN,
        entityType: EntityType.USER,
        entityId: user.id,
        ipAddress: req.ip,
      });

      const publicUser = await userService.findById(user.id);

      res.json({
        success: true,
        data: { user: publicUser, tokens },
        message: 'Login successful',
      });
    } catch (error) {
      logger.error('Login failed', { error });
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Login failed',
      });
    }
  }

  /**
   * POST /auth/refresh
   */
  async refresh(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      // Verify the refresh token
      const payload = verifyRefreshToken(refreshToken);

      // Find user and verify stored refresh token matches
      const user = await userService.findByIdFull(payload.userId);
      if (!user || user.refresh_token !== refreshToken) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: 'Invalid refresh token',
        });
        return;
      }

      // Generate new token pair
      const newPayload: IJwtPayload = { userId: user.id, email: user.email, role: user.role };
      const tokens = generateTokenPair(newPayload);

      // Update stored refresh token
      await userService.updateRefreshToken(user.id, tokens.refreshToken);

      res.json({
        success: true,
        data: { tokens },
        message: 'Token refreshed',
      });
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: 'Refresh token expired, please login again',
        });
        return;
      }

      logger.error('Token refresh failed', { error });
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: 'Invalid refresh token',
      });
    }
  }

  /**
   * POST /auth/logout
   */
  async logout(req: Request, res: Response): Promise<void> {
    try {
      if (req.user) {
        await userService.updateRefreshToken(req.user.userId, null);

        await activityService.log({
          userId: req.user.userId,
          action: ActivityAction.USER_LOGOUT,
          entityType: EntityType.USER,
          entityId: req.user.userId,
          ipAddress: req.ip,
        });
      }

      res.json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      logger.error('Logout failed', { error });
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Logout failed',
      });
    }
  }

  /**
   * GET /auth/profile
   */
  async profile(req: Request, res: Response): Promise<void> {
    try {
      const user = await userService.findById(req.user!.userId);
      if (!user) {
        res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      res.json({
        success: true,
        data: { user },
      });
    } catch (error) {
      logger.error('Get profile failed', { error });
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to get profile',
      });
    }
  }
}

export const authController = new AuthController();
