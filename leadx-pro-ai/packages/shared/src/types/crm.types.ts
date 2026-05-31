// ============================================
// CRM Integration Types
// ============================================

export enum CrmProvider {
  HUBSPOT = 'hubspot',
  ZOHO = 'zoho',
  SALESFORCE = 'salesforce',
}

export interface ICrmConnection {
  id: number;
  user_id: number;
  provider: CrmProvider;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: Date | null;
  created_at: Date;
}
