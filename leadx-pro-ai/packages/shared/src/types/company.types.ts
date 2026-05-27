// ============================================
// Scraped Company / Lead Types
// ============================================

export enum VerificationStatus {
  VERIFIED = 'verified',
  UNVERIFIED = 'unverified',
  INVALID = 'invalid',
  PENDING = 'pending',
}

export enum LeadPriority {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export enum WebsiteStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  UNREACHABLE = 'unreachable',
  UNKNOWN = 'unknown',
}

export enum CompanySize {
  STARTUP = '1-10',
  SMALL = '11-50',
  MEDIUM = '51-200',
  LARGE = '201-1000',
  ENTERPRISE = '1000+',
  UNKNOWN = 'unknown',
}

export interface IScrapedCompany {
  id: number;
  job_id: number;
  company_name: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  website: string | null;
  linkedin: string | null;
  facebook: string | null;
  address: string | null;
  category: string | null;
  company_size: CompanySize;
  source_url: string;
  verification_status: VerificationStatus;
  confidence_score: number;
  website_status: WebsiteStatus;
  lead_priority: LeadPriority;
  tags: string[];
  ai_summary: string | null;
  cold_email_draft: string | null;
  ai_enriched_at: Date | string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface ICreateCompany {
  job_id: number;
  company_name: string;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  website?: string | null;
  linkedin?: string | null;
  facebook?: string | null;
  address?: string | null;
  category?: string | null;
  company_size?: CompanySize;
  source_url: string;
  verification_status?: VerificationStatus;
  confidence_score?: number;
  website_status?: WebsiteStatus;
  lead_priority?: LeadPriority;
  tags?: string[];
  ai_summary?: string | null;
  cold_email_draft?: string | null;
  ai_enriched_at?: Date | string | null;
}

export interface ILeadFilters {
  search?: string;
  jobId?: number;
  category?: string;
  verificationStatus?: VerificationStatus;
  leadPriority?: LeadPriority;
  websiteStatus?: WebsiteStatus;
  hasEmail?: boolean;
  hasPhone?: boolean;
  hasWhatsapp?: boolean;
  hasLinkedin?: boolean;
  minConfidence?: number;
  maxConfidence?: number;
  tags?: string[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface ILeadBulkAction {
  ids: number[];
  action: 'delete' | 'archive' | 'export' | 'tag';
  data?: Record<string, unknown>;
}

export interface IPaginatedLeads {
  data: IScrapedCompany[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
