import { RowDataPacket } from 'mysql2/promise';
import { db } from '../database/pool';
import { IActivityLog, ActivityAction, EntityType } from '@leadx/shared';
import { logger } from '../utils/logger';

interface ActivityRow extends RowDataPacket, IActivityLog {}

export class ActivityService {
  /**
   * Log an activity
   */
  async log(data: {
    userId: number;
    action: ActivityAction;
    entityType: EntityType;
    entityId?: number | null;
    details?: Record<string, unknown> | null;
    ipAddress?: string | null;
  }): Promise<void> {
    try {
      await db.execute(
        `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details, ip_address)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          data.userId,
          data.action,
          data.entityType,
          data.entityId || null,
          data.details ? JSON.stringify(data.details) : null,
          data.ipAddress || null,
        ],
      );
    } catch (error) {
      // Activity logging should never break the main flow
      logger.error('Failed to log activity', { error, data });
    }
  }

  /**
   * Get recent activities for a user
   */
  async getRecent(userId: number, limit = 20): Promise<IActivityLog[]> {
    const [rows] = await db.query<ActivityRow[]>(
      `SELECT * FROM activity_logs WHERE user_id = ?
       ORDER BY created_at DESC LIMIT ?`,
      [userId, limit],
    );
    return rows.map((r) => ({
      ...r,
      details: r.details ? (typeof r.details === 'string' ? JSON.parse(r.details as string) : r.details) : null,
    }));
  }

  /**
   * Get activities with pagination
   */
  async findAll(
    userId: number,
    page = 1,
    limit = 25,
  ): Promise<{ activities: IActivityLog[]; total: number }> {
    const offset = (page - 1) * limit;

    const [countRows] = await db.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM activity_logs WHERE user_id = ?`,
      [userId],
    );

    const [rows] = await db.query<ActivityRow[]>(
      `SELECT * FROM activity_logs WHERE user_id = ?
       ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [userId, limit, offset],
    );

    return {
      activities: rows.map((r) => ({
        ...r,
        details: r.details ? (typeof r.details === 'string' ? JSON.parse(r.details as string) : r.details) : null,
      })),
      total: countRows[0].total,
    };
  }

  /**
   * Get activities for a specific entity
   */
  async findByEntity(
    entityType: EntityType,
    entityId: number,
  ): Promise<IActivityLog[]> {
    const [rows] = await db.query<ActivityRow[]>(
      `SELECT * FROM activity_logs WHERE entity_type = ? AND entity_id = ?
       ORDER BY created_at DESC LIMIT 50`,
      [entityType, entityId],
    );
    return rows;
  }
}

export const activityService = new ActivityService();
