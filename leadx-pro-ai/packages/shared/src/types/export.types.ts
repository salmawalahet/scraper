// ============================================
// Export Types
// ============================================

export enum ExportFormat {
  CSV = 'csv',
  EXCEL = 'excel',
  JSON = 'json',
}

export enum ExportStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface IExport {
  id: number;
  user_id: number;
  job_id: number | null;
  format: ExportFormat;
  file_path: string | null;
  file_size: number | null;
  total_records: number;
  status: ExportStatus;
  download_count: number;
  filters: Record<string, unknown> | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface ICreateExport {
  job_id?: number | null;
  format: ExportFormat;
  filters?: Record<string, unknown>;
  leadIds?: number[];
}

// ============================================
// Activity Log Types
// ============================================

export enum ActivityAction {
  USER_LOGIN = 'user_login',
  USER_LOGOUT = 'user_logout',
  USER_REGISTER = 'user_register',
  JOB_CREATED = 'job_created',
  JOB_STARTED = 'job_started',
  JOB_PAUSED = 'job_paused',
  JOB_RESUMED = 'job_resumed',
  JOB_COMPLETED = 'job_completed',
  JOB_FAILED = 'job_failed',
  JOB_CANCELLED = 'job_cancelled',
  LEAD_EXPORTED = 'lead_exported',
  LEAD_DELETED = 'lead_deleted',
  LEAD_ARCHIVED = 'lead_archived',
  EXPORT_CREATED = 'export_created',
  EXPORT_DOWNLOADED = 'export_downloaded',
  SETTINGS_UPDATED = 'settings_updated',
  INTEGRATION_SYNCED = 'integration_synced',
}

export enum EntityType {
  USER = 'user',
  JOB = 'job',
  LEAD = 'lead',
  EXPORT = 'export',
  INTEGRATION = 'integration',
}

export interface IActivityLog {
  id: number;
  user_id: number;
  action: ActivityAction;
  entity_type: EntityType;
  entity_id: number | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: Date;
}

// ============================================
// Saved Search Types
// ============================================

export interface ISavedSearch {
  id: number;
  user_id: number;
  name: string;
  filters: Record<string, unknown>;
  is_default: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

// ============================================
// Scrape History Types
// ============================================

export interface IScrapeHistory {
  id: number;
  job_id: number;
  user_id: number;
  action: string;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: Date;
}
