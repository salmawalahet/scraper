import { useEffect, useState } from 'react';
import { analyticsApi } from '../services/api';
import { Loader2 } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from 'recharts';

const COLORS = ['#6366f1', '#34d399', '#f87171', '#fbbf24', '#60a5fa', '#a78bfa', '#f472b6'];

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [trends, setTrends] = useState<any[]>([]);
  const [jobStats, setJobStats] = useState<any>(null);
  const [exportStats, setExportStats] = useState<any>(null);
  const [quality, setQuality] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      analyticsApi.getLeadTrends(30),
      analyticsApi.getJobAnalytics(),
      analyticsApi.getExportAnalytics(),
      analyticsApi.getQualityDistribution(),
    ]).then(([t, j, e, q]) => {
      setTrends(t.data.data || []);
      setJobStats(j.data.data);
      setExportStats(e.data.data);
      setQuality(q.data.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const qualityData = quality ? [
    { name: 'High (90+)', value: quality.high, color: '#34d399' },
    { name: 'Medium (70-89)', value: quality.medium, color: '#fbbf24' },
    { name: 'Low (<70)', value: quality.low, color: '#f87171' },
  ] : [];

  const jobData = jobStats ? [
    { name: 'Completed', value: jobStats.completedJobs, fill: '#34d399' },
    { name: 'Failed', value: jobStats.failedJobs, fill: '#f87171' },
    { name: 'Total', value: jobStats.totalJobs, fill: '#6366f1' },
  ] : [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-muted-foreground mt-1">Deep insights into your lead intelligence data</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Jobs</p>
          <p className="text-3xl font-bold mt-1">{jobStats?.totalJobs || 0}</p>
          <p className="text-xs text-muted-foreground mt-1">Avg {jobStats?.averageLeadsPerJob || 0} leads/job</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Avg Duration</p>
          <p className="text-3xl font-bold mt-1">{Math.round((jobStats?.averageDuration || 0) / 60)}m</p>
          <p className="text-xs text-muted-foreground mt-1">per scrape job</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Exports</p>
          <p className="text-3xl font-bold mt-1">{exportStats?.totalExports || 0}</p>
          <p className="text-xs text-muted-foreground mt-1">{exportStats?.totalDownloads || 0} downloads</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">High Quality Leads</p>
          <p className="text-3xl font-bold text-emerald-500 mt-1">{quality?.high || 0}</p>
          <p className="text-xs text-muted-foreground mt-1">confidence ≥ 90</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Lead trends */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold mb-4">Lead Acquisition (30 days)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends}>
                <defs>
                  <linearGradient id="aGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                <Area type="monotone" dataKey="totalLeads" stroke="#6366f1" strokeWidth={2} fill="url(#aGrad)" name="Leads" />
                <Area type="monotone" dataKey="verifiedLeads" stroke="#34d399" strokeWidth={2} fillOpacity={0} name="Verified" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quality distribution */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold mb-4">Lead Quality Distribution</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={qualityData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} innerRadius={60} paddingAngle={4}>
                  {qualityData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Job success rate */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold mb-4">Job Performance</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={jobData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {jobData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Export breakdown */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold mb-4">Export Formats</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={exportStats?.byFormat || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="format" type="category" tick={{ fontSize: 11 }} width={60} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                <Bar dataKey="count" fill="#6366f1" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
