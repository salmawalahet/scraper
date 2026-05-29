import { RowDataPacket } from 'mysql2/promise';
import { db } from '../database/pool';
import { IScrapeJob, ICreateJob, JobStatus, DEFAULT_JOB_CONFIG, IJobConfig } from '@leadx/shared';
import { logger } from '../utils/logger';

interface JobRow extends RowDataPacket, Omit<IScrapeJob, 'config'> {
  config: string;
}

export class JobService {
  /**
   * Create a new scrape job
   */
  async create(userId: number, data: ICreateJob): Promise<number> {
    const config = { ...DEFAULT_JOB_CONFIG, ...data.config };
    const [result] = await db.execute(
      `INSERT INTO scrape_jobs (user_id, name, target_url, search_query, config, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [userId, data.name, data.target_url, data.search_query || null, JSON.stringify(config)],
    );
    return result.insertId;
  }

  /**
   * Find job by ID
   */
  async findById(id: number): Promise<IScrapeJob | null> {
    const [rows] = await db.query<JobRow[]>(
      `SELECT * FROM scrape_jobs WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
      [id],
    );
    if (!rows[0]) return null;
    return this.parseJobRow(rows[0]);
  }

  /**
   * List jobs for a user with pagination
   */
  async findByUserId(
    userId: number,
    page = 1,
    limit = 25,
    status?: JobStatus,
  ): Promise<{ jobs: IScrapeJob[]; total: number }> {
    const offset = (page - 1) * limit;
    const conditions = ['user_id = ?', 'deleted_at IS NULL'];
    const params: unknown[] = [userId];

    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }

    const where = conditions.join(' AND ');

    const [countRows] = await db.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM scrape_jobs WHERE ${where}`,
      params,
    );

    const [rows] = await db.query<JobRow[]>(
      `SELECT * FROM scrape_jobs WHERE ${where}
       ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );

    return {
      jobs: rows.map((r) => this.parseJobRow(r)),
      total: countRows[0].total,
    };
  }

  /**
   * Update job status
   */
  async updateStatus(jobId: number, status: JobStatus): Promise<void> {
    const extraFields: string[] = [];
    const params: unknown[] = [status];

    if (status === JobStatus.RUNNING) {
      extraFields.push('started_at = NOW()');
    }
    if (status === JobStatus.COMPLETED || status === JobStatus.FAILED || status === JobStatus.CANCELLED) {
      extraFields.push('completed_at = NOW()');
    }

    const setClause = ['status = ?', ...extraFields].join(', ');
    params.push(jobId);

    await db.execute(
      `UPDATE scrape_jobs SET ${setClause} WHERE id = ?`,
      params,
    );
  }

  /**
   * Update job counts
   */
  async updateCounts(jobId: number, totalFound: number, totalVerified: number): Promise<void> {
    await db.execute(
      `UPDATE scrape_jobs SET total_found = ?, total_verified = ? WHERE id = ?`,
      [totalFound, totalVerified, jobId],
    );
  }

  /**
   * Increment job counts
   */
  async incrementCounts(jobId: number, found = 0, verified = 0): Promise<void> {
    await db.execute(
      `UPDATE scrape_jobs
       SET total_found = total_found + ?, total_verified = total_verified + ?
       WHERE id = ?`,
      [found, verified, jobId],
    );
  }

  /**
   * Get all running jobs
   */
  async getRunningJobs(): Promise<IScrapeJob[]> {
    const [rows] = await db.query<JobRow[]>(
      `SELECT * FROM scrape_jobs WHERE status IN ('running', 'retrying') AND deleted_at IS NULL`,
    );
    return rows.map((r) => this.parseJobRow(r));
  }

  /**
   * Get recent jobs for dashboard
   */
  async getRecentJobs(userId: number, limit = 5): Promise<IScrapeJob[]> {
    const [rows] = await db.query<JobRow[]>(
      `SELECT * FROM scrape_jobs WHERE user_id = ? AND deleted_at IS NULL
       ORDER BY created_at DESC LIMIT ?`,
      [userId, limit],
    );
    return rows.map((r) => this.parseJobRow(r));
  }

  /**
   * Get all scheduled jobs
   */
  async getScheduledJobs(): Promise<IScrapeJob[]> {
    const [rows] = await db.query<JobRow[]>(
      `SELECT * FROM scrape_jobs WHERE is_scheduled = TRUE AND schedule_enabled = TRUE AND deleted_at IS NULL`
    );
    return rows.map((r) => this.parseJobRow(r));
  }

  /**
   * Update job schedule
   */
  async updateSchedule(
    jobId: number,
    updates: {
      is_scheduled?: boolean;
      schedule_cron?: string | null;
      schedule_tz?: string;
      next_run_at?: Date | null;
      last_run_at?: Date | null;
      schedule_enabled?: boolean;
    }
  ): Promise<void> {
    const fields: string[] = [];
    const params: unknown[] = [];

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        params.push(value);
      }
    }

    if (fields.length === 0) return;

    params.push(jobId);
    await db.execute(
      `UPDATE scrape_jobs SET ${fields.join(', ')} WHERE id = ?`,
      params
    );
  }

  /**
   * Soft delete a job
   */
  async softDelete(jobId: number): Promise<void> {
    await db.execute(
      `UPDATE scrape_jobs SET deleted_at = NOW() WHERE id = ?`,
      [jobId],
    );
  }

  /**
   * Get job statistics for a user
   */
  async getJobStats(userId: number): Promise<{
    total: number;
    running: number;
    completed: number;
    failed: number;
  }> {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT
         COUNT(*) as total,
         SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) as running,
         SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
         SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
       FROM scrape_jobs WHERE user_id = ? AND deleted_at IS NULL`,
      [userId],
    );
    return {
      total: rows[0].total || 0,
      running: rows[0].running || 0,
      completed: rows[0].completed || 0,
      failed: rows[0].failed || 0,
    };
  }

  private parseJobRow(row: JobRow): IScrapeJob {
    return {
      ...row,
      config: typeof row.config === 'string' ? JSON.parse(row.config) : row.config,
    };
  }
}

export const jobService = new JobService();
