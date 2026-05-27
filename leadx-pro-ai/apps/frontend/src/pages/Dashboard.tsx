import { useEffect, useState, useCallback, useRef } from 'react';
import { analyticsApi } from '../services/api';
import {
  Users, Mail, Briefcase, CheckCircle2, Download, TrendingUp,
  Activity, ArrowUpRight, ArrowDownRight, Loader2, Search,
  Phone, Globe, Clock, Play, FileDown, AlertCircle, XCircle, RotateCcw
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';

const CHART_COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#34d399', '#fbbf24', '#f87171', '#60a5fa'];
const DASHBOARD_POLL_INTERVAL_MS = 10000;

interface DashboardStats {
  totalLeads: number;
  verifiedEmails: number;
  runningJobs: number;
  completedJobs: number;
  totalExports: number;
  successRate: number;
  topCategories: { category: string; count: number }[];
}

interface QueryWiseStat {
  id: number;
  name: string;
  search_query: string | null;
  target_url: string;
  status: string;
  created_at: string;
  total_found: number;
  total_verified: number;
  emails_count: number;
  phones_count: number;
  websites_count: number;
  linkedin_count: number;
  facebook_count: number;
  whatsapp_count: number;
}

const statusConfig: Record<string, { color: string; icon: any; label: string; badgeBg: string }> = {
  pending:   { color: 'text-slate-400',   icon: Clock,        label: 'Pending',   badgeBg: 'bg-slate-400/10 border-slate-400/20' },
  running:   { color: 'text-blue-400',    icon: Play,         label: 'Running',   badgeBg: 'bg-blue-400/10 border-blue-400/20' },
  paused:    { color: 'text-amber-400',   icon: Clock,        label: 'Paused',    badgeBg: 'bg-amber-400/10 border-amber-400/20' },
  completed: { color: 'text-emerald-400', icon: CheckCircle2, label: 'Completed', badgeBg: 'bg-emerald-400/10 border-emerald-400/20' },
  failed:    { color: 'text-red-400',     icon: AlertCircle,  label: 'Failed',    badgeBg: 'bg-red-400/10 border-red-400/20' },
  cancelled: { color: 'text-slate-500',   icon: XCircle,      label: 'Cancelled', badgeBg: 'bg-slate-500/10 border-slate-500/20' },
  retrying:  { color: 'text-purple-400',  icon: RotateCcw,    label: 'Retrying',  badgeBg: 'bg-purple-400/10 border-purple-400/20' },
};

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [trends, setTrends] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [queryStats, setQueryStats] = useState<QueryWiseStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [querySearch, setQuerySearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [exportingJob, setExportingJob] = useState<number | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [statsRes, trendsRes, activityRes, queryRes] = await Promise.all([
        analyticsApi.getDashboard(),
        analyticsApi.getLeadTrends(30),
        analyticsApi.getRecentActivity(10),
        analyticsApi.getQueryWiseStats(),
      ]);
      setStats(statsRes.data.data);
      setTrends(trendsRes.data.data);
      setActivities(activityRes.data.data);
      setQueryStats(queryRes.data.data || []);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleExportJob = async (jobId: number, jobName: string) => {
    try {
      setExportingJob(jobId);
      const res = await analyticsApi.exportQueryWise(jobId);
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${jobName.replace(/[^a-zA-Z0-9]/g, '_')}_leads.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExportingJob(null);
    }
  };

  // ── Auto-polling: refresh dashboard stats every 10 seconds ──
  useEffect(() => {
    loadData();

    pollTimerRef.current = setInterval(() => {
      loadData();
    }, DASHBOARD_POLL_INTERVAL_MS);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const statCards = [
    { label: 'Total Leads', value: stats?.totalLeads || 0, icon: Users, color: 'from-indigo-500 to-indigo-600', change: '+12.5%', positive: true },
    { label: 'Verified Emails', value: stats?.verifiedEmails || 0, icon: Mail, color: 'from-emerald-500 to-emerald-600', change: '+8.2%', positive: true },
    { label: 'Running Jobs', value: stats?.runningJobs || 0, icon: Activity, color: 'from-amber-500 to-orange-500', change: null, positive: true },
    { label: 'Completed Jobs', value: stats?.completedJobs || 0, icon: CheckCircle2, color: 'from-cyan-500 to-blue-500', change: '+5.1%', positive: true },
    { label: 'Total Exports', value: stats?.totalExports || 0, icon: Download, color: 'from-purple-500 to-fuchsia-500', change: '+3.4%', positive: true },
    { label: 'Success Rate', value: `${stats?.successRate || 0}%`, icon: TrendingUp, color: 'from-rose-500 to-pink-500', change: '+1.2%', positive: true },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your lead intelligence platform</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="group relative rounded-xl border border-border bg-card p-4 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5">
            <div className="flex items-start justify-between">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${card.color} shadow-lg`}>
                <card.icon className="h-5 w-5 text-white" />
              </div>
              {card.change && (
                <span className={`flex items-center gap-0.5 text-xs font-medium ${card.positive ? 'text-emerald-500' : 'text-red-500'}`}>
                  {card.positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {card.change}
                </span>
              )}
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold">{typeof card.value === 'number' ? card.value.toLocaleString() : card.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Lead trends chart */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold mb-4">Lead Trends (30 days)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends}>
                <defs>
                  <linearGradient id="leadGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="verifiedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                <Area type="monotone" dataKey="totalLeads" stroke="#6366f1" strokeWidth={2} fill="url(#leadGrad)" name="Total Leads" />
                <Area type="monotone" dataKey="verifiedLeads" stroke="#34d399" strokeWidth={2} fill="url(#verifiedGrad)" name="Verified" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category pie chart */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold mb-4">Top Categories</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats?.topCategories || []}
                  dataKey="count"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={50}
                  paddingAngle={3}
                >
                  {(stats?.topCategories || []).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 space-y-1.5 max-h-32 overflow-y-auto">
            {(stats?.topCategories || []).slice(0, 5).map((cat, i) => (
              <div key={cat.category} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                  <span className="text-muted-foreground">{cat.category}</span>
                </div>
                <span className="font-medium">{cat.count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Query-wise Lead Scrapes & Exports */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 border-b border-border/50 pb-4">
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-indigo-500" />
              Query-wise Lead Scrapes
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">Export leads and view progress per individual search query</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search queries..."
              value={querySearch}
              onChange={(e) => {
                setQuerySearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full sm:w-60 rounded-lg border border-border bg-background pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
          </div>
        </div>

        {queryStats.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No scrape queries recorded yet</p>
        ) : (() => {
          const filtered = queryStats.filter((q) => {
            if (!querySearch) return true;
            const term = querySearch.toLowerCase();
            return q.name.toLowerCase().includes(term) || (q.search_query && q.search_query.toLowerCase().includes(term));
          });
          const totalPages = Math.ceil(filtered.length / 5);
          const startIndex = (currentPage - 1) * 5;
          const paginated = filtered.slice(startIndex, startIndex + 5);

          return (
            <div className="space-y-4">
              <div className="space-y-3">
                {paginated.map((q) => {
                  const cfg = statusConfig[q.status] || statusConfig.pending;
                  const StatusIcon = cfg.icon;

                  return (
                    <div
                      key={q.id}
                      className="flex flex-col md:flex-row md:items-center justify-between rounded-xl border border-border bg-card p-4 transition-all duration-300 hover:shadow-md hover:border-primary/20 gap-4"
                    >
                      {/* Left: Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h4 className="text-sm sm:text-base font-bold text-foreground truncate">{q.name}</h4>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold border shrink-0 ${cfg.badgeBg} ${cfg.color}`}>
                            <StatusIcon className="h-3 w-3" />
                            {cfg.label}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-1.5" title={q.search_query || q.target_url}>
                          {q.search_query || q.target_url}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">
                          Scraped on {new Date(q.created_at).toLocaleDateString()}
                        </p>
                      </div>

                      {/* Middle: Stats */}
                      <div className="flex items-center gap-6 flex-wrap md:flex-nowrap md:px-6">
                        <div className="text-left md:text-center min-w-[70px]">
                          <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">Leads</span>
                          <span className="text-sm sm:text-base font-extrabold text-foreground">{q.total_found.toLocaleString()}</span>
                        </div>
                        <div className="text-left md:text-center min-w-[80px]">
                          <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">Verified</span>
                          <span className="text-sm sm:text-base font-extrabold text-emerald-500">{q.total_verified.toLocaleString()}</span>
                        </div>
                        <div className="text-left md:text-center min-w-[80px]">
                          <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">Emails</span>
                          <span className="text-sm sm:text-base font-extrabold text-indigo-400">{q.emails_count.toLocaleString()}</span>
                        </div>
                        <div className="text-left md:text-center min-w-[80px]">
                          <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">Websites</span>
                          <span className="text-sm sm:text-base font-extrabold text-blue-500">{q.websites_count.toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Right: Export action */}
                      <div className="shrink-0 flex items-center">
                        <button
                          onClick={() => handleExportJob(q.id, q.name)}
                          disabled={exportingJob === q.id || q.total_found === 0}
                          className="w-full md:w-auto flex items-center justify-center gap-2 rounded-lg bg-primary hover:bg-primary/95 text-xs font-bold text-primary-foreground px-4 py-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                        >
                          {exportingJob === q.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <FileDown className="h-4 w-4" />
                          )}
                          Export Query CSV
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-4 border-t border-border/60">
                  <span className="text-xs text-muted-foreground font-medium">
                    Showing <span className="text-foreground font-semibold">{startIndex + 1}</span> to{' '}
                    <span className="text-foreground font-semibold">
                      {Math.min(startIndex + 5, filtered.length)}
                    </span>{' '}
                    of <span className="text-foreground font-semibold">{filtered.length}</span> queries
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-3.5 py-1.5 rounded-lg border border-border bg-card text-xs font-semibold hover:bg-muted disabled:opacity-40 disabled:hover:bg-card transition-all"
                    >
                      Previous
                    </button>
                    <span className="flex items-center px-3 text-xs text-muted-foreground font-semibold">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="px-3.5 py-1.5 rounded-lg border border-border bg-card text-xs font-semibold hover:bg-muted disabled:opacity-40 disabled:hover:bg-card transition-all"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* Recent Activity */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold mb-4">Recent Activity</h3>
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No recent activity</p>
        ) : (
          <div className="space-y-3">
            {activities.map((activity: any) => (
              <div key={activity.id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted/50 transition-colors">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                  <Activity className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{activity.action.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(activity.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
