import { RowDataPacket } from 'mysql2/promise';
import { db } from '../database/pool';
import { IUser, IUserPublic, ICreateUser, UserRole } from '@leadx/shared';
import { logger } from '../utils/logger';

interface UserRow extends RowDataPacket, IUser {}

export class UserService {
  /**
   * Create a new user
   */
  async create(data: {
    email: string;
    password_hash: string;
    name: string;
    role?: UserRole;
  }): Promise<number> {
    const [result] = await db.execute(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES (?, ?, ?, ?)`,
      [data.email, data.password_hash, data.name, data.role || UserRole.USER],
    );
    return result.insertId;
  }

  /**
   * Find user by email (includes password hash)
   */
  async findByEmail(email: string): Promise<IUser | null> {
    const [rows] = await db.query<UserRow[]>(
      `SELECT * FROM users WHERE email = ? AND deleted_at IS NULL LIMIT 1`,
      [email],
    );
    return rows[0] || null;
  }

  /**
   * Find user by ID (public fields only)
   */
  async findById(id: number): Promise<IUserPublic | null> {
    const [rows] = await db.query<UserRow[]>(
      `SELECT id, email, name, role, last_login, is_active, created_at
       FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
      [id],
    );
    return rows[0] || null;
  }

  /**
   * Find user by ID (includes all fields)
   */
  async findByIdFull(id: number): Promise<IUser | null> {
    const [rows] = await db.query<UserRow[]>(
      `SELECT * FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
      [id],
    );
    return rows[0] || null;
  }

  /**
   * Update user refresh token
   */
  async updateRefreshToken(userId: number, refreshToken: string | null): Promise<void> {
    await db.execute(
      `UPDATE users SET refresh_token = ? WHERE id = ?`,
      [refreshToken, userId],
    );
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(userId: number): Promise<void> {
    await db.execute(
      `UPDATE users SET last_login = NOW() WHERE id = ?`,
      [userId],
    );
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: number, data: { name?: string; email?: string }): Promise<void> {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.name) {
      fields.push('name = ?');
      values.push(data.name);
    }
    if (data.email) {
      fields.push('email = ?');
      values.push(data.email);
    }

    if (fields.length === 0) return;

    values.push(userId);
    await db.execute(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
      values,
    );
  }

  /**
   * Update user password
   */
  async updatePassword(userId: number, passwordHash: string): Promise<void> {
    await db.execute(
      `UPDATE users SET password_hash = ? WHERE id = ?`,
      [passwordHash, userId],
    );
  }

  /**
   * Soft delete user
   */
  async softDelete(userId: number): Promise<void> {
    await db.execute(
      `UPDATE users SET deleted_at = NOW(), is_active = FALSE WHERE id = ?`,
      [userId],
    );
  }

  /**
   * List all users (admin)
   */
  async findAll(page = 1, limit = 25): Promise<{ users: IUserPublic[]; total: number }> {
    const offset = (page - 1) * limit;

    const [countRows] = await db.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM users WHERE deleted_at IS NULL`,
    );
    const total = countRows[0].total;

    const [rows] = await db.query<UserRow[]>(
      `SELECT id, email, name, role, last_login, is_active, created_at
       FROM users WHERE deleted_at IS NULL
       ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [limit, offset],
    );

    return { users: rows, total };
  }

  /**
   * Check if email exists
   */
  async emailExists(email: string): Promise<boolean> {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT 1 FROM users WHERE email = ? AND deleted_at IS NULL LIMIT 1`,
      [email],
    );
    return rows.length > 0;
  }
}

export const userService = new UserService();
