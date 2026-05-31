import { RowDataPacket } from 'mysql2/promise';
import { db } from '../../database/pool';
import { ICrmConnection, CrmProvider } from '@leadx/shared';
import { logger } from '../../utils/logger';

interface CrmConnectionRow extends RowDataPacket, ICrmConnection {}

export class CrmService {
  /**
   * Save or update a CRM connection for a user
   */
  async saveConnection(
    userId: number,
    provider: CrmProvider,
    accessToken: string,
    refreshToken?: string | null,
    tokenExpiresAt?: Date | null,
  ): Promise<void> {
    await db.execute(
      `INSERT INTO crm_connections (user_id, provider, access_token, refresh_token, token_expires_at)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         provider = VALUES(provider),
         access_token = VALUES(access_token),
         refresh_token = VALUES(refresh_token),
         token_expires_at = VALUES(token_expires_at)`,
      [userId, provider, accessToken, refreshToken || null, tokenExpiresAt || null],
    );
    logger.info(`CRM connection saved for user ${userId} (${provider})`);
  }

  /**
   * Find a CRM connection for a user
   */
  async findByUserId(userId: number): Promise<ICrmConnection | null> {
    const [rows] = await db.query<CrmConnectionRow[]>(
      `SELECT * FROM crm_connections WHERE user_id = ? LIMIT 1`,
      [userId],
    );
    return rows[0] || null;
  }

  /**
   * Delete a CRM connection
   */
  async deleteByUserId(userId: number): Promise<boolean> {
    const [result] = await db.execute(
      `DELETE FROM crm_connections WHERE user_id = ?`,
      [userId],
    );
    return result.affectedRows > 0;
  }
}

export const crmService = new CrmService();
