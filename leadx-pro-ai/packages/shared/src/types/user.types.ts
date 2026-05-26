// ============================================
// User Types
// ============================================

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
}

export interface IUser {
  id: number;
  email: string;
  password_hash: string;
  name: string;
  role: UserRole;
  refresh_token: string | null;
  last_login: Date | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface IUserPublic {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  last_login: Date | null;
  is_active: boolean;
  created_at: Date;
}

export interface ICreateUser {
  email: string;
  password: string;
  name: string;
  role?: UserRole;
}

export interface ILoginCredentials {
  email: string;
  password: string;
}

export interface ITokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface IAuthResponse {
  user: IUserPublic;
  tokens: ITokenPair;
}

export interface IJwtPayload {
  userId: number;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}
