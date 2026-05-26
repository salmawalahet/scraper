import jwt from 'jsonwebtoken';
import { IJwtPayload, ITokenPair } from '@leadx/shared';
import { env } from '../config/environment';

export function generateAccessToken(payload: IJwtPayload): string {
  return jwt.sign(
    { userId: payload.userId, email: payload.email, role: payload.role },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRY as any },
  );
}

export function generateRefreshToken(payload: IJwtPayload): string {
  return jwt.sign(
    { userId: payload.userId, email: payload.email, role: payload.role },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRY as any },
  );
}

export function generateTokenPair(payload: IJwtPayload): ITokenPair {
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
  };
}

export function verifyAccessToken(token: string): IJwtPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as IJwtPayload;
}

export function verifyRefreshToken(token: string): IJwtPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as IJwtPayload;
}
