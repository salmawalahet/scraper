// ============================================
// Webhook Types
// ============================================

export enum WebhookEvent {
  JOB_COMPLETED = 'job.completed',
  JOB_FAILED = 'job.failed',
}

export interface IWebhookEndpoint {
  id: number;
  user_id: number;
  url: string;
  secret: string;
  events: string[];
  is_active: boolean;
  created_at: Date;
}

export interface IWebhookDelivery {
  id: number;
  endpoint_id: number;
  event: string;
  payload: Record<string, unknown>;
  status_code: number | null;
  response_body: string | null;
  delivered_at: Date | null;
  created_at: Date;
}
