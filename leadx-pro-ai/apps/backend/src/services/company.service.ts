import { RowDataPacket } from 'mysql2/promise';
import { db } from '../database/pool';
import {
  IScrapedCompany,
  ICreateCompany,
  ILeadFilters,
  IPaginatedLeads,
  VerificationStatus,
  CompanySize,
  WebsiteStatus,
  LeadPriority,
} from '@leadx/shared';
import { logger } from '../utils/logger';

interface CompanyRow extends RowDataPacket, Omit<IScrapedCompany, 'tags'> {
  tags: string | null;
}

export class CompanyService {
  /**
   * Create a single company/lead record.
   * Uses INSERT IGNORE to gracefully skip duplicates (same job_id + email or website).
   * Returns the inserted ID, or 0 if the row was a duplicate.
   */
  async create(data: ICreateCompany): Promise<number> {
    const [result] = await db.execute(
      `INSERT IGNORE INTO scraped_companies
         (job_id, company_name, email, phone, whatsapp, website, linkedin, facebook,
          address, category, company_size, source_url, verification_status,
          confidence_score, website_status, lead_priority, tags)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.job_id,
        data.company_name,
        data.email || null,
        data.phone || null,
        data.whatsapp || null,
        data.website || null,
        data.linkedin || null,
        data.facebook || null,
        data.address || null,
        data.category || null,
        data.company_size || CompanySize.UNKNOWN,
        data.source_url,
        data.verification_status || VerificationStatus.PENDING,
        data.confidence_score || 0,
        data.website_status || WebsiteStatus.UNKNOWN,
        data.lead_priority || LeadPriority.LOW,
        data.tags ? JSON.stringify(data.tags) : null,
      ],
    );

    if (result.insertId === 0) {
      logger.warn(`Duplicate lead skipped for job ${data.job_id}: ${data.email || data.website}`);
    }
    return result.insertId;
  }

  /**
   * Batch insert companies for performance.
   * Uses INSERT IGNORE to gracefully skip duplicates (same job_id + email or website).
   * Returns the number of rows actually inserted (excludes skipped duplicates).
   */
  async batchCreate(companies: ICreateCompany[]): Promise<number> {
    if (companies.length === 0) return 0;

    const columns = [
      'job_id', 'company_name', 'email', 'phone', 'whatsapp', 'website',
      'linkedin', 'facebook', 'address', 'category', 'company_size',
      'source_url', 'verification_status', 'confidence_score',
      'website_status', 'lead_priority', 'tags',
    ];

    const rows = companies.map((c) => [
      c.job_id,
      c.company_name,
      c.email || null,
      c.phone || null,
      c.whatsapp || null,
      c.website || null,
      c.linkedin || null,
      c.facebook || null,
      c.address || null,
      c.category || null,
      c.company_size || CompanySize.UNKNOWN,
      c.source_url,
      c.verification_status || VerificationStatus.PENDING,
      c.confidence_score || 0,
      c.website_status || WebsiteStatus.UNKNOWN,
      c.lead_priority || LeadPriority.LOW,
      c.tags ? JSON.stringify(c.tags) : null,
    ]);

    const inserted = await db.batchInsert('scraped_companies', columns, rows, 500, true);
    const skipped = companies.length - inserted;
    if (skipped > 0) {
      logger.warn(`Batch insert: ${skipped} duplicate leads skipped out of ${companies.length}`);
    }
    return inserted;
  }

  /**
   * Find company by ID
   */
  async findById(id: number): Promise<IScrapedCompany | null> {
    const [rows] = await db.query<CompanyRow[]>(
      `SELECT * FROM scraped_companies WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
      [id],
    );
    if (!rows[0]) return null;
    return this.parseRow(rows[0]);
  }

  /**
   * Advanced search with filters, pagination, and sorting
   */
  async search(filters: ILeadFilters): Promise<IPaginatedLeads> {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 25, 100);
    const offset = (page - 1) * limit;

    const conditions: string[] = ['deleted_at IS NULL'];
    const params: unknown[] = [];

    // Text search (full-text or LIKE)
    if (filters.search) {
      conditions.push(`(company_name LIKE ? OR email LIKE ? OR address LIKE ?)`);
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (filters.jobId) {
      conditions.push('job_id = ?');
      params.push(filters.jobId);
    }

    if (filters.category) {
      conditions.push('category = ?');
      params.push(filters.category);
    }

    if (filters.verificationStatus) {
      conditions.push('verification_status = ?');
      params.push(filters.verificationStatus);
    }

    if (filters.leadPriority) {
      conditions.push('lead_priority = ?');
      params.push(filters.leadPriority);
    }

    if (filters.websiteStatus) {
      conditions.push('website_status = ?');
      params.push(filters.websiteStatus);
    }

    if (filters.hasEmail) {
      conditions.push('email IS NOT NULL AND email != ""');
    }

    if (filters.hasPhone) {
      conditions.push('phone IS NOT NULL AND phone != ""');
    }

    if (filters.hasWhatsapp) {
      conditions.push('whatsapp IS NOT NULL AND whatsapp != ""');
    }

    if (filters.hasLinkedin) {
      conditions.push('linkedin IS NOT NULL AND linkedin != ""');
    }

    if (filters.minConfidence !== undefined) {
      conditions.push('confidence_score >= ?');
      params.push(filters.minConfidence);
    }

    if (filters.maxConfidence !== undefined) {
      conditions.push('confidence_score <= ?');
      params.push(filters.maxConfidence);
    }

    const where = conditions.join(' AND ');

    // Whitelist sortable columns
    const allowedSortColumns = [
      'company_name', 'email', 'confidence_score', 'lead_priority',
      'category', 'created_at', 'verification_status', 'website_status',
    ];
    const sortBy = allowedSortColumns.includes(filters.sortBy || '')
      ? filters.sortBy
      : 'created_at';
    const sortOrder = filters.sortOrder === 'asc' ? 'ASC' : 'DESC';

    // Count query
    const [countRows] = await db.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM scraped_companies WHERE ${where}`,
      params,
    );
    const total = countRows[0].total;

    // Data query
    const [rows] = await db.query<CompanyRow[]>(
      `SELECT * FROM scraped_companies WHERE ${where}
       ORDER BY ${sortBy} ${sortOrder} LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );

    return {
      data: rows.map((r) => this.parseRow(r)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get leads by job ID
   */
  async findByJobId(jobId: number, limit = 100): Promise<IScrapedCompany[]> {
    const [rows] = await db.query<CompanyRow[]>(
      `SELECT * FROM scraped_companies WHERE job_id = ? AND deleted_at IS NULL
       ORDER BY confidence_score DESC LIMIT ?`,
      [jobId, limit],
    );
    return rows.map((r) => this.parseRow(r));
  }

  /**
   * Update company verification status and score
   */
  async updateVerification(
    id: number,
    status: VerificationStatus,
    confidenceScore: number,
    leadPriority: LeadPriority,
  ): Promise<void> {
    await db.execute(
      `UPDATE scraped_companies
       SET verification_status = ?, confidence_score = ?, lead_priority = ?
       WHERE id = ?`,
      [status, confidenceScore, leadPriority, id],
    );
  }

  /**
   * Update AI enrichment data
   */
  async updateAiEnrichment(
    id: number,
    summary: string | null,
    coldEmail: string | null,
    tags: string[],
    priority: LeadPriority,
  ): Promise<void> {
    await db.execute(
      `UPDATE scraped_companies
       SET ai_summary = ?, cold_email_draft = ?, tags = ?, lead_priority = ?, ai_enriched_at = NOW()
       WHERE id = ?`,
      [summary, coldEmail, JSON.stringify(tags), priority, id],
    );
  }

  /**
   * Batch update verification for multiple leads
   */
  async batchUpdateVerification(
    ids: number[],
    status: VerificationStatus,
  ): Promise<void> {
    if (ids.length === 0) return;
    const placeholders = ids.map(() => '?').join(', ');
    await db.execute(
      `UPDATE scraped_companies SET verification_status = ? WHERE id IN (${placeholders})`,
      [status, ...ids],
    );
  }

  /**
   * Soft delete multiple companies
   */
  async bulkSoftDelete(ids: number[]): Promise<void> {
    if (ids.length === 0) return;
    const placeholders = ids.map(() => '?').join(', ');
    await db.execute(
      `UPDATE scraped_companies SET deleted_at = NOW() WHERE id IN (${placeholders})`,
      ids,
    );
  }

  /**
   * Check for duplicate by email or (company_name + website)
   */
  async isDuplicate(email: string | null, companyName: string, website: string | null): Promise<boolean> {
    if (email) {
      const [rows] = await db.query<RowDataPacket[]>(
        `SELECT 1 FROM scraped_companies WHERE email = ? AND deleted_at IS NULL LIMIT 1`,
        [email],
      );
      if (rows.length > 0) return true;
    }

    if (website) {
      const [rows] = await db.query<RowDataPacket[]>(
        `SELECT 1 FROM scraped_companies
         WHERE company_name = ? AND website = ? AND deleted_at IS NULL LIMIT 1`,
        [companyName, website],
      );
      if (rows.length > 0) return true;
    }

    return false;
  }

  /**
   * Get IDs for export based on filters
   */
  async getIdsForExport(filters: ILeadFilters): Promise<number[]> {
    const unlimitedFilters = { ...filters, page: 1, limit: 100000 };
    const result = await this.search(unlimitedFilters);
    return result.data.map((d) => d.id);
  }

  /**
   * Get leads by IDs for export
   */
  async findByIds(ids: number[]): Promise<IScrapedCompany[]> {
    if (ids.length === 0) return [];
    const placeholders = ids.map(() => '?').join(', ');
    const [rows] = await db.query<CompanyRow[]>(
      `SELECT * FROM scraped_companies WHERE id IN (${placeholders}) AND deleted_at IS NULL`,
      ids,
    );
    return rows.map((r) => this.parseRow(r));
  }

  /**
   * Get total lead count for a user (across all their jobs)
   */
  async getTotalByUser(userId: number): Promise<number> {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM scraped_companies sc
       JOIN scrape_jobs sj ON sc.job_id = sj.id
       WHERE sj.user_id = ? AND sc.deleted_at IS NULL`,
      [userId],
    );
    return rows[0].total || 0;
  }

  /**
   * Get verified email count for a user
   */
  async getVerifiedEmailCount(userId: number): Promise<number> {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM scraped_companies sc
       JOIN scrape_jobs sj ON sc.job_id = sj.id
       WHERE sj.user_id = ? AND sc.email IS NOT NULL
         AND sc.verification_status = 'verified' AND sc.deleted_at IS NULL`,
      [userId],
    );
    return rows[0].total || 0;
  }

  /**
   * Get category distribution for analytics
   */
  async getCategoryDistribution(userId: number): Promise<{ category: string; count: number }[]> {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT COALESCE(sc.category, 'Uncategorized') as category, COUNT(*) as count
       FROM scraped_companies sc
       JOIN scrape_jobs sj ON sc.job_id = sj.id
       WHERE sj.user_id = ? AND sc.deleted_at IS NULL
       GROUP BY sc.category ORDER BY count DESC LIMIT 20`,
      [userId],
    );
    return rows as { category: string; count: number }[];
  }

  private parseRow(row: CompanyRow): IScrapedCompany {
    return {
      ...row,
      tags: row.tags ? (typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags) : [],
    };
  }
}

export const companyService = new CompanyService();
