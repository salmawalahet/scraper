// ============================================
// Analytics Types
// ============================================

export interface IDashboardStats {
  totalLeads: number;
  verifiedEmails: number;
  runningJobs: number;
  completedJobs: number;
  totalExports: number;
  successRate: number;
  topCategories: ICategoryCount[];
}

export interface ICategoryCount {
  category: string;
  count: number;
}

export interface IDailyMetric {
  date: string;
  count: number;
}

export interface ILeadTrend {
  date: string;
  totalLeads: number;
  verifiedLeads: number;
}

export interface IJobAnalytics {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  averageLeadsPerJob: number;
  averageDuration: number;
}

export interface IExportAnalytics {
  totalExports: number;
  totalDownloads: number;
  byFormat: { format: string; count: number }[];
}

export interface IQualityDistribution {
  high: number;
  medium: number;
  low: number;
}

export interface IQueryWiseStat {
  id: number;
  name: string;
  search_query: string | null;
  target_url: string;
  status: string;
  created_at: string;
  total_found: number;
  total_verified: number;
  unique_leads: number;
  emails_count: number;
  phones_count: number;
  websites_count: number;
  linkedin_count: number;
  facebook_count: number;
  whatsapp_count: number;
  duplicates_blocked: number;
}

export interface IAnalyticsOverview {
  dashboard: IDashboardStats;
  leadTrends: ILeadTrend[];
  jobAnalytics: IJobAnalytics;
  exportAnalytics: IExportAnalytics;
  qualityDistribution: IQualityDistribution;
}
