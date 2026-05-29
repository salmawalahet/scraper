// ============================================
// Scrape Job Types
// ============================================

export enum JobStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  RETRYING = 'retrying',
}

export interface IJobConfig {
  maxPages: number;
  maxLeads: number;
  timeout: number;
  retries: number;
  concurrency: number;
  browser: 'puppeteer' | 'playwright' | 'cheerio';
  extractEmail: boolean;
  extractPhone: boolean;
  extractSocial: boolean;
  extractAddress: boolean;
  respectRobotsTxt: boolean;
  proxyEnabled: boolean;
  run_once?: boolean;
}

export interface IScrapeJob {
  id: number;
  user_id: number;
  name: string;
  target_url: string;
  search_query: string;
  status: JobStatus;
  total_found: number;
  total_verified: number;
  config: IJobConfig;
  started_at: Date | null;
  completed_at: Date | null;
  is_scheduled?: boolean;
  schedule_cron?: string | null;
  schedule_tz?: string;
  next_run_at?: Date | null;
  last_run_at?: Date | null;
  schedule_enabled?: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface ICreateJob {
  name: string;
  target_url: string;
  search_query: string;
  config?: Partial<IJobConfig>;
}

export interface IJobProgress {
  jobId: number;
  status: JobStatus;
  totalFound: number;
  totalVerified: number;
  currentUrl: string;
  percentage: number;
  elapsedTime: number;
}

export const DEFAULT_JOB_CONFIG: IJobConfig = {
  maxPages: 50,
  maxLeads: 500,
  timeout: 30000,
  retries: 3,
  concurrency: 3,
  browser: 'puppeteer',
  extractEmail: true,
  extractPhone: true,
  extractSocial: true,
  extractAddress: true,
  respectRobotsTxt: true,
  proxyEnabled: false,
};

// ============================================
// Job Result Types
// ============================================

export enum JobResultStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  SKIPPED = 'skipped',
}

export interface IJobResult {
  id: number;
  job_id: number;
  url: string;
  status: JobResultStatus;
  raw_data: Record<string, unknown> | null;
  processed_data: Record<string, unknown> | null;
  error_message: string | null;
  created_at: Date;
  updated_at: Date;
}
