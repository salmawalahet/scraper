import { RowDataPacket } from 'mysql2/promise';
import crypto from 'crypto';
import { db } from '../../database/pool';
import { IWebhookEndpoint, IWebhookDelivery } from '@leadx/shared';
import { logger } from '../../utils/logger';

interface WebhookEndpointRow extends RowDataPacket, Omit<IWebhookEndpoint, 'events'> {
  events: string;
}

interface WebhookDeliveryRow extends RowDataPacket, Omit<IWebhookDelivery, 'payload'> {
  payload: string;
}

export class WebhookService {
  /**
   * Generate a random HMAC secret
   */
  generateSecret(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Create a new webhook endpoint
   */
  async create(userId: number, url: string, events: string[]): Promise<IWebhookEndpoint> {
    const secret = this.generateSecret();
    const [result] = await db.execute(
      `INSERT INTO webhook_endpoints (user_id, url, secret, events) VALUES (?, ?, ?, ?)`,
      [userId, url, secret, JSON.stringify(events)],
    );

    const endpoint = await this.findById(result.insertId);
    if (!endpoint) throw new Error('Failed to create webhook endpoint');
    return endpoint;
  }

  /**
   * Find endpoint by ID
   */
  async findById(id: number): Promise<IWebhookEndpoint | null> {
    const [rows] = await db.query<WebhookEndpointRow[]>(
      `SELECT * FROM webhook_endpoints WHERE id = ? LIMIT 1`,
      [id],
    );
    if (!rows[0]) return null;
    return this.parseEndpointRow(rows[0]);
  }

  /**
   * List all endpoints for a user
   */
  async findByUserId(userId: number): Promise<IWebhookEndpoint[]> {
    const [rows] = await db.query<WebhookEndpointRow[]>(
      `SELECT * FROM webhook_endpoints WHERE user_id = ? ORDER BY created_at DESC`,
      [userId],
    );
    return rows.map((r) => this.parseEndpointRow(r));
  }

  /**
   * Find active endpoints for a user that subscribe to a specific event
   */
  async findActiveByEvent(userId: number, event: string): Promise<IWebhookEndpoint[]> {
    const [rows] = await db.query<WebhookEndpointRow[]>(
      `SELECT * FROM webhook_endpoints 
       WHERE user_id = ? AND is_active = TRUE AND JSON_CONTAINS(events, ?)`,
      [userId, JSON.stringify(event)],
    );
    return rows.map((r) => this.parseEndpointRow(r));
  }

  /**
   * Delete an endpoint (only if owned by user)
   */
  async delete(id: number, userId: number): Promise<boolean> {
    const [result] = await db.execute(
      `DELETE FROM webhook_endpoints WHERE id = ? AND user_id = ?`,
      [id, userId],
    );
    return result.affectedRows > 0;
  }

  /**
   * Log a delivery attempt
   */
  async logDelivery(
    endpointId: number,
    event: string,
    payload: object,
    statusCode: number | null,
    responseBody: string | null,
    deliveredAt: Date | null,
  ): Promise<void> {
    await db.execute(
      `INSERT INTO webhook_deliveries (endpoint_id, event, payload, status_code, response_body, delivered_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [endpointId, event, JSON.stringify(payload), statusCode, responseBody, deliveredAt],
    );
  }

  /**
   * Get recent deliveries for an endpoint
   */
  async getDeliveries(endpointId: number, userId: number, limit = 50): Promise<IWebhookDelivery[]> {
    // Verify ownership first
    const [ownerCheck] = await db.query<RowDataPacket[]>(
      `SELECT 1 FROM webhook_endpoints WHERE id = ? AND user_id = ? LIMIT 1`,
      [endpointId, userId],
    );
    if (ownerCheck.length === 0) return [];

    const [rows] = await db.query<WebhookDeliveryRow[]>(
      `SELECT * FROM webhook_deliveries WHERE endpoint_id = ? ORDER BY created_at DESC LIMIT ?`,
      [endpointId, limit],
    );
    return rows.map((r) => this.parseDeliveryRow(r));
  }

  private parseEndpointRow(row: WebhookEndpointRow): IWebhookEndpoint {
    return {
      ...row,
      events: typeof row.events === 'string' ? JSON.parse(row.events) : row.events,
    };
  }

  private parseDeliveryRow(row: WebhookDeliveryRow): IWebhookDelivery {
    return {
      ...row,
      payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
    };
  }
}

export const webhookService = new WebhookService();
