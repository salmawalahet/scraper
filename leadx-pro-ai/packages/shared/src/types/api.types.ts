// ============================================
// API Response Types
// ============================================

export interface IApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: IValidationError[];
  meta?: IPaginationMeta;
}

export interface IValidationError {
  field: string;
  message: string;
}

export interface IPaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface IPaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ============================================
// Socket Event Types
// ============================================

export enum SocketEvent {
  // Job events
  JOB_PROGRESS = 'job:progress',
  JOB_COMPLETED = 'job:completed',
  JOB_FAILED = 'job:failed',
  JOB_STARTED = 'job:started',
  JOB_PAUSED = 'job:paused',
  JOB_RESUMED = 'job:resumed',

  // Lead events
  LEAD_FOUND = 'lead:found',
  LEAD_VERIFIED = 'lead:verified',

  // Export events
  EXPORT_COMPLETED = 'export:completed',
  EXPORT_FAILED = 'export:failed',

  // Dashboard events
  DASHBOARD_UPDATE = 'dashboard:update',
  STATS_UPDATE = 'stats:update',

  // Notification events
  NOTIFICATION = 'notification',
}

export interface ISocketMessage<T = unknown> {
  event: SocketEvent;
  data: T;
  timestamp: Date;
  userId?: number;
}

// ============================================
// Integration Types
// ============================================

export enum IntegrationType {
  GOOGLE_SHEETS = 'google_sheets',
  HUBSPOT = 'hubspot',
  ZOHO = 'zoho',
  WEBHOOK = 'webhook',
}

export interface IIntegrationConfig {
  type: IntegrationType;
  apiKey?: string;
  webhookUrl?: string;
  sheetId?: string;
  enabled: boolean;
}

export interface IWebhookPayload {
  event: string;
  data: Record<string, unknown>;
  timestamp: string;
  signature: string;
}
