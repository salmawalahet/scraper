import { useEffect, useState, useCallback, useRef } from 'react';
import { analyticsApi } from '../services/api';
import {
  Users, Mail, Briefcase, CheckCircle2, Download, TrendingUp,
  Activity, ArrowUpRight, ArrowDownRight, Loader2,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend,
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

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [trends, setTrends] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [statsRes, trendsRes, activityRes] = await Promise.all([
        analyticsApi.getDashboard(),
        analyticsApi.getLeadTrends(30),
        analyticsApi.getRecentActivity(10),
      ]);
      setStats(statsRes.data.data);
      setTrends(trendsRes.data.data);
      setActivities(activityRes.data.data);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, []);

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
