import { RowDataPacket } from 'mysql2/promise';
import { db } from '../database/pool';
import { cache } from '../config/redis';
import {
  IDashboardStats,
  ILeadTrend,
  IJobAnalytics,
  IExportAnalytics,
  IQualityDistribution,
  ICategoryCount,
} from '@leadx/shared';
import { logger } from '../utils/logger';

export class AnalyticsService {
  private CACHE_TTL = 60; // 60 seconds

  /**
   * Get dashboard statistics
   */
  async getDashboardStats(userId: number): Promise<IDashboardStats> {
    const cacheKey = `analytics:dashboard:${userId}`;
    const cached = await cache.get<IDashboardStats>(cacheKey);
    if (cached) return cached;

    // Total leads
    const [totalLeadsRows] = await db.query<RowDataPacket[]>(
      `SELECT COUNT(*) as count FROM scraped_companies sc
       JOIN scrape_jobs sj ON sc.job_id = sj.id
       WHERE sj.user_id = ? AND sc.deleted_at IS NULL`,
      [userId],
    );

    // Verified emails
    const [verifiedRows] = await db.query<RowDataPacket[]>(
      `SELECT COUNT(*) as count FROM scraped_companies sc
       JOIN scrape_jobs sj ON sc.job_id = sj.id
       WHERE sj.user_id = ? AND sc.email IS NOT NULL
         AND sc.verification_status = 'verified' AND sc.deleted_at IS NULL`,
      [userId],
    );

    // Running jobs
    const [runningRows] = await db.query<RowDataPacket[]>(
      `SELECT COUNT(*) as count FROM scrape_jobs
       WHERE user_id = ? AND status = 'running' AND deleted_at IS NULL`,
      [userId],
    );

    // Completed jobs
    const [completedRows] = await db.query<RowDataPacket[]>(
      `SELECT COUNT(*) as count FROM scrape_jobs
       WHERE user_id = ? AND status = 'completed' AND deleted_at IS NULL`,
      [userId],
    );

    // Total exports
    const [exportRows] = await db.query<RowDataPacket[]>(
      `SELECT COUNT(*) as count FROM exports
       WHERE user_id = ? AND deleted_at IS NULL`,
      [userId],
    );

    // Success rate
    const [totalJobsRows] = await db.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total,
              SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
       FROM scrape_jobs
       WHERE user_id = ? AND status IN ('completed', 'failed') AND deleted_at IS NULL`,
      [userId],
    );
    const total = totalJobsRows[0].total || 0;
    const completed = totalJobsRows[0].completed || 0;
    const successRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Top categories
    const [categoryRows] = await db.query<RowDataPacket[]>(
      `SELECT COALESCE(sc.category, 'Uncategorized') as category, COUNT(*) as count
       FROM scraped_companies sc
       JOIN scrape_jobs sj ON sc.job_id = sj.id
       WHERE sj.user_id = ? AND sc.deleted_at IS NULL
       GROUP BY sc.category ORDER BY count DESC LIMIT 10`,
      [userId],
    );

    const stats: IDashboardStats = {
      totalLeads: totalLeadsRows[0].count,
      verifiedEmails: verifiedRows[0].count,
      runningJobs: runningRows[0].count,
      completedJobs: completedRows[0].count,
      totalExports: exportRows[0].count,
      successRate,
      topCategories: categoryRows as ICategoryCount[],
    };

    await cache.set(cacheKey, stats, this.CACHE_TTL);
    return stats;
  }

  /**
   * Get lead trends (last 30 days)
   */
  async getLeadTrends(userId: number, days = 30): Promise<ILeadTrend[]> {
    const cacheKey = `analytics:trends:${userId}:${days}`;
    const cached = await cache.get<ILeadTrend[]>(cacheKey);
    if (cached) return cached;

    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT
         DATE(sc.created_at) as date,
         COUNT(*) as totalLeads,
         SUM(CASE WHEN sc.verification_status = 'verified' THEN 1 ELSE 0 END) as verifiedLeads
       FROM scraped_companies sc
       JOIN scrape_jobs sj ON sc.job_id = sj.id
       WHERE sj.user_id = ? AND sc.deleted_at IS NULL
         AND sc.created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY DATE(sc.created_at)
       ORDER BY date ASC`,
      [userId, days],
    );

    const trends = rows.map((r) => ({
      date: r.date.toISOString().split('T')[0],
      totalLeads: Number(r.totalLeads),
      verifiedLeads: Number(r.verifiedLeads),
    }));

    await cache.set(cacheKey, trends, this.CACHE_TTL);
    return trends;
  }

  /**
   * Get job analytics
   */
  async getJobAnalytics(userId: number): Promise<IJobAnalytics> {
    const cacheKey = `analytics:jobs:${userId}`;
    const cached = await cache.get<IJobAnalytics>(cacheKey);
    if (cached) return cached;

    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT
         COUNT(*) as totalJobs,
         SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completedJobs,
         SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failedJobs,
         AVG(total_found) as averageLeadsPerJob,
         AVG(TIMESTAMPDIFF(SECOND, started_at, completed_at)) as averageDuration
       FROM scrape_jobs
       WHERE user_id = ? AND deleted_at IS NULL`,
      [userId],
    );

    const analytics: IJobAnalytics = {
      totalJobs: Number(rows[0].totalJobs) || 0,
      completedJobs: Number(rows[0].completedJobs) || 0,
      failedJobs: Number(rows[0].failedJobs) || 0,
      averageLeadsPerJob: Math.round(Number(rows[0].averageLeadsPerJob) || 0),
      averageDuration: Math.round(Number(rows[0].averageDuration) || 0),
    };

    await cache.set(cacheKey, analytics, this.CACHE_TTL);
    return analytics;
  }

  /**
   * Get export analytics
   */
  async getExportAnalytics(userId: number): Promise<IExportAnalytics> {
    const cacheKey = `analytics:exports:${userId}`;
    const cached = await cache.get<IExportAnalytics>(cacheKey);
    if (cached) return cached;

    const [totalRows] = await db.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total, SUM(download_count) as downloads
       FROM exports WHERE user_id = ? AND deleted_at IS NULL`,
      [userId],
    );

    const [formatRows] = await db.query<RowDataPacket[]>(
      `SELECT format, COUNT(*) as count
       FROM exports WHERE user_id = ? AND deleted_at IS NULL
       GROUP BY format`,
      [userId],
    );

    const analytics: IExportAnalytics = {
      totalExports: Number(totalRows[0].total) || 0,
      totalDownloads: Number(totalRows[0].downloads) || 0,
      byFormat: formatRows.map((r) => ({ format: r.format, count: Number(r.count) })),
    };

    await cache.set(cacheKey, analytics, this.CACHE_TTL);
    return analytics;
  }

  /**
   * Get quality distribution
   */
  async getQualityDistribution(userId: number): Promise<IQualityDistribution> {
    const cacheKey = `analytics:quality:${userId}`;
    const cached = await cache.get<IQualityDistribution>(cacheKey);
    if (cached) return cached;

    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT
         SUM(CASE WHEN confidence_score >= 90 THEN 1 ELSE 0 END) as high,
         SUM(CASE WHEN confidence_score >= 70 AND confidence_score < 90 THEN 1 ELSE 0 END) as medium,
         SUM(CASE WHEN confidence_score < 70 THEN 1 ELSE 0 END) as low
       FROM scraped_companies sc
       JOIN scrape_jobs sj ON sc.job_id = sj.id
       WHERE sj.user_id = ? AND sc.deleted_at IS NULL`,
      [userId],
    );

    const distribution: IQualityDistribution = {
      high: Number(rows[0].high) || 0,
      medium: Number(rows[0].medium) || 0,
      low: Number(rows[0].low) || 0,
    };

    await cache.set(cacheKey, distribution, this.CACHE_TTL);
    return distribution;
  }

  /**
   * Get query-wise lead intelligence statistics
   */
  async getQueryWiseStats(userId: number): Promise<any[]> {
    const cacheKey = `analytics:query_wise:${userId}`;
    const cached = await cache.get<any[]>(cacheKey);
    if (cached) return cached;

    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT
         sj.id,
         sj.name,
         sj.search_query,
         sj.target_url,
         sj.status,
         sj.created_at,
         sj.total_found,
         sj.total_verified,
         SUM(CASE WHEN sc.email IS NOT NULL AND sc.email != '' THEN 1 ELSE 0 END) as emails_count,
         SUM(CASE WHEN sc.phone IS NOT NULL AND sc.phone != '' THEN 1 ELSE 0 END) as phones_count,
         SUM(CASE WHEN sc.website IS NOT NULL AND sc.website != '' THEN 1 ELSE 0 END) as websites_count,
         SUM(CASE WHEN sc.linkedin IS NOT NULL AND sc.linkedin != '' THEN 1 ELSE 0 END) as linkedin_count,
         SUM(CASE WHEN sc.facebook IS NOT NULL AND sc.facebook != '' THEN 1 ELSE 0 END) as facebook_count,
         SUM(CASE WHEN sc.whatsapp IS NOT NULL AND sc.whatsapp != '' THEN 1 ELSE 0 END) as whatsapp_count
       FROM scrape_jobs sj
       LEFT JOIN scraped_companies sc ON sj.id = sc.job_id AND sc.deleted_at IS NULL
       WHERE sj.user_id = ? AND sj.deleted_at IS NULL
       GROUP BY sj.id
       ORDER BY sj.created_at DESC`,
      [userId]
    );

    const stats = rows.map((r) => ({
      id: Number(r.id),
      name: r.name,
      search_query: r.search_query,
      target_url: r.target_url,
      status: r.status,
      created_at: r.created_at ? (r.created_at instanceof Date ? r.created_at.toISOString() : new Date(r.created_at).toISOString()) : new Date().toISOString(),
      total_found: Number(r.total_found) || 0,
      total_verified: Number(r.total_verified) || 0,
      emails_count: Number(r.emails_count) || 0,
      phones_count: Number(r.phones_count) || 0,
      websites_count: Number(r.websites_count) || 0,
      linkedin_count: Number(r.linkedin_count) || 0,
      facebook_count: Number(r.facebook_count) || 0,
      whatsapp_count: Number(r.whatsapp_count) || 0,
    }));

    await cache.set(cacheKey, stats, this.CACHE_TTL);
    return stats;
  }

  /**
   * Invalidate all analytics caches for a user
   */
  async invalidateCache(userId: number): Promise<void> {
    await cache.delPattern(`analytics:*:${userId}*`);
  }
}

export const analyticsService = new AnalyticsService();
