import { RowDataPacket } from 'mysql2/promise';
import { db } from '../database/pool';
import { IExport, ExportFormat, ExportStatus } from '@leadx/shared';
import { logger } from '../utils/logger';

interface ExportRow extends RowDataPacket, Omit<IExport, 'filters'> {
  filters: string | null;
}

export class ExportService {
  /**
   * Create an export record
   */
  async create(data: {
    userId: number;
    jobId?: number | null;
    format: ExportFormat;
    totalRecords: number;
    filters?: Record<string, unknown> | null;
  }): Promise<number> {
    const [result] = await db.execute(
      `INSERT INTO exports (user_id, job_id, format, total_records, status, filters)
       VALUES (?, ?, ?, ?, 'pending', ?)`,
      [
        data.userId,
        data.jobId || null,
        data.format,
        data.totalRecords,
        data.filters ? JSON.stringify(data.filters) : null,
      ],
    );
    return result.insertId;
  }

  /**
   * Find export by ID
   */
  async findById(id: number): Promise<IExport | null> {
    const [rows] = await db.query<ExportRow[]>(
      `SELECT * FROM exports WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
      [id],
    );
    if (!rows[0]) return null;
    return this.parseRow(rows[0]);
  }

  /**
   * Update export status and file info
   */
  async updateCompleted(
    id: number,
    filePath: string,
    fileSize: number,
    totalRecords: number,
  ): Promise<void> {
    await db.execute(
      `UPDATE exports SET status = 'completed', file_path = ?, file_size = ?, total_records = ?
       WHERE id = ?`,
      [filePath, fileSize, totalRecords, id],
    );
  }

  /**
   * Update export status to failed
   */
  async updateFailed(id: number): Promise<void> {
    await db.execute(
      `UPDATE exports SET status = 'failed' WHERE id = ?`,
      [id],
    );
  }

  /**
   * Update export status
   */
  async updateStatus(id: number, status: ExportStatus): Promise<void> {
    await db.execute(
      `UPDATE exports SET status = ? WHERE id = ?`,
      [status, id],
    );
  }

  /**
   * Increment download count
   */
  async incrementDownloadCount(id: number): Promise<void> {
    await db.execute(
      `UPDATE exports SET download_count = download_count + 1 WHERE id = ?`,
      [id],
    );
  }

  /**
   * List exports for a user
   */
  async findByUserId(
    userId: number,
    page = 1,
    limit = 25,
  ): Promise<{ exports: IExport[]; total: number }> {
    const offset = (page - 1) * limit;

    const [countRows] = await db.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM exports WHERE user_id = ? AND deleted_at IS NULL`,
      [userId],
    );

    const [rows] = await db.query<ExportRow[]>(
      `SELECT * FROM exports WHERE user_id = ? AND deleted_at IS NULL
       ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [userId, limit, offset],
    );

    return {
      exports: rows.map((r) => this.parseRow(r)),
      total: countRows[0].total,
    };
  }

  /**
   * Soft delete an export
   */
  async softDelete(id: number): Promise<void> {
    await db.execute(
      `UPDATE exports SET deleted_at = NOW() WHERE id = ?`,
      [id],
    );
  }

  private parseRow(row: ExportRow): IExport {
    return {
      ...row,
      filters: row.filters ? (typeof row.filters === 'string' ? JSON.parse(row.filters) : row.filters) : null,
    };
  }
}

export const exportService = new ExportService();
