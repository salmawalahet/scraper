import { useEffect, useState, useRef, useCallback } from 'react';
import { jobsApi } from '../services/api';
import { socketClient } from '../services/socket';
import {
  Plus, Play, Pause, RotateCcw, Trash2, XCircle, Loader2,
  Globe, Clock, CheckCircle2, AlertCircle, Briefcase,
} from 'lucide-react';

const statusConfig: Record<string, { color: string; icon: typeof CheckCircle2; label: string }> = {
  pending: { color: 'text-slate-400 bg-slate-400/10', icon: Clock, label: 'Pending' },
  running: { color: 'text-blue-400 bg-blue-400/10', icon: Play, label: 'Running' },
  paused: { color: 'text-amber-400 bg-amber-400/10', icon: Pause, label: 'Paused' },
  completed: { color: 'text-emerald-400 bg-emerald-400/10', icon: CheckCircle2, label: 'Completed' },
  failed: { color: 'text-red-400 bg-red-400/10', icon: AlertCircle, label: 'Failed' },
  cancelled: { color: 'text-slate-500 bg-slate-500/10', icon: XCircle, label: 'Cancelled' },
  retrying: { color: 'text-purple-400 bg-purple-400/10', icon: RotateCcw, label: 'Retrying' },
};

interface Job {
  id: number; name: string; target_url: string; search_query: string;
  status: string; total_found: number; total_verified: number;
  config: any; started_at: string | null; completed_at: string | null; created_at: string;
}

const ACTIVE_STATUSES = ['running', 'pending', 'retrying'];
const POLL_INTERVAL_MS = 5000;

export default function Jobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [activeTab, setActiveTab] = useState<'directory' | 'url'>('directory');
  const [jobField, setJobField] = useState('');
  const [location, setLocation] = useState('');
  const [newJob, setNewJob] = useState({ name: '', target_url: '', search_query: '' });
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState('');
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadJobs = useCallback(async () => {
    try {
      const res = await jobsApi.list({ page: 1, limit: 50 });
      setJobs(res.data.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  // ── Auto-polling: re-fetch every 5s when active jobs exist ──
  useEffect(() => {
    loadJobs();

    // Start polling
    pollTimerRef.current = setInterval(() => {
      loadJobs();
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [loadJobs]);

  // ── Socket.io real-time listeners for instant updates ──
  useEffect(() => {
    socketClient.connect();

    const handleJobUpdate = () => loadJobs();

    socketClient.on('job:progress', handleJobUpdate);
    socketClient.on('job:completed', handleJobUpdate);
    socketClient.on('job:failed', handleJobUpdate);
    socketClient.on('job:status', handleJobUpdate);

    return () => {
      socketClient.off('job:progress', handleJobUpdate);
      socketClient.off('job:completed', handleJobUpdate);
      socketClient.off('job:failed', handleJobUpdate);
      socketClient.off('job:status', handleJobUpdate);
    };
  }, [loadJobs]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      let payload;
      if (activeTab === 'directory') {
        const generatedName = `${jobField} in ${location}`;
        const searchQuery = `${jobField} ${location}`;
        // Set target_url to a DuckDuckGo search URL
        const targetUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(searchQuery)}`;
        payload = {
          name: generatedName,
          target_url: targetUrl,
          search_query: searchQuery,
        };
      } else {
        payload = newJob;
      }
      await jobsApi.create(payload);
      setShowCreate(false);
      setJobField('');
      setLocation('');
      setNewJob({ name: '', target_url: '', search_query: '' });
      loadJobs();
    } catch (e) { console.error(e); }
    finally { setCreating(false); }
  };

  const handleAction = async (id: number, action: 'pause' | 'resume' | 'cancel' | 'retry' | 'delete') => {
    try {
      switch (action) {
        case 'pause': await jobsApi.pause(id); break;
        case 'resume': await jobsApi.resume(id); break;
        case 'cancel': await jobsApi.cancel(id); break;
        case 'retry': await jobsApi.retry(id); break;
        case 'delete': await jobsApi.delete(id); break;
      }
      loadJobs();
    } catch (e) { console.error(e); }
  };

  const filteredJobs = filter ? jobs.filter((j) => j.status === filter) : jobs;

  if (loading) return <div className="flex items-center justify-center h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Scrape Jobs</h1>
          <p className="text-muted-foreground mt-1">Manage your web scraping jobs</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-all shadow-lg shadow-primary/25">
          <Plus className="h-4 w-4" /> New Job
        </button>
      </div>

      {/* Status filters */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilter('')}
          className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${!filter ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
          All ({jobs.length})
        </button>
        {Object.entries(statusConfig).map(([key, cfg]) => {
          const count = jobs.filter((j) => j.status === key).length;
          if (count === 0) return null;
          return (
            <button key={key} onClick={() => setFilter(key)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${filter === key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
              {cfg.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Jobs list */}
      <div className="space-y-3">
        {filteredJobs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center">
            <Briefcase className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground">No jobs found. Create your first scrape job!</p>
          </div>
        ) : filteredJobs.map((job) => {
          const cfg = statusConfig[job.status] || statusConfig.pending;
          const StatusIcon = cfg.icon;
          return (
            <div key={job.id} className="group rounded-xl border border-border bg-card p-4 transition-all hover:shadow-md hover:border-primary/20">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold truncate">{job.name}</h3>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.color}`}>
                      <StatusIcon className="h-3 w-3" />
                      {cfg.label}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Globe className="h-3 w-3" />{job.target_url.substring(0, 50)}{job.target_url.length > 50 ? '...' : ''}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(job.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="mt-3 flex gap-6 text-sm">
                    <div><span className="text-muted-foreground text-xs">Found:</span> <span className="font-semibold">{job.total_found.toLocaleString()}</span></div>
                    <div><span className="text-muted-foreground text-xs">Verified:</span> <span className="font-semibold text-emerald-500">{job.total_verified.toLocaleString()}</span></div>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {job.status === 'running' && (
                    <button onClick={() => handleAction(job.id, 'pause')} className="rounded-lg p-2 text-muted-foreground hover:bg-amber-500/10 hover:text-amber-500 transition-colors" title="Pause">
                      <Pause className="h-4 w-4" />
                    </button>
                  )}
                  {job.status === 'paused' && (
                    <button onClick={() => handleAction(job.id, 'resume')} className="rounded-lg p-2 text-muted-foreground hover:bg-green-500/10 hover:text-green-500 transition-colors" title="Resume">
                      <Play className="h-4 w-4" />
                    </button>
                  )}
                  {['running', 'paused', 'pending'].includes(job.status) && (
                    <button onClick={() => handleAction(job.id, 'cancel')} className="rounded-lg p-2 text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-colors" title="Cancel">
                      <XCircle className="h-4 w-4" />
                    </button>
                  )}
                  {['failed', 'cancelled'].includes(job.status) && (
                    <button onClick={() => handleAction(job.id, 'retry')} className="rounded-lg p-2 text-muted-foreground hover:bg-purple-500/10 hover:text-purple-500 transition-colors" title="Retry">
                      <RotateCcw className="h-4 w-4" />
                    </button>
                  )}
                  <button onClick={() => handleAction(job.id, 'delete')} className="rounded-lg p-2 text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-colors" title="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {job.status === 'running' && (
                <div className="mt-3">
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 animate-pulse-soft" style={{ width: '60%' }} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Create Job Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl animate-fade-in mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">Create New Scrape Job</h2>
            
            {/* Modal Tabs */}
            <div className="flex border-b border-border/80 mb-5">
              <button
                type="button"
                onClick={() => setActiveTab('directory')}
                className={`flex-1 pb-2.5 text-sm font-medium border-b-2 transition-all ${
                  activeTab === 'directory'
                    ? 'border-primary text-primary font-semibold'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Local B2B Directory Search
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('url')}
                className={`flex-1 pb-2.5 text-sm font-medium border-b-2 transition-all ${
                  activeTab === 'url'
                    ? 'border-primary text-primary font-semibold'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Single Website Crawl
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              {activeTab === 'directory' ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-300">Job Field / Industry</label>
                      <input
                        value={jobField}
                        onChange={(e) => setJobField(e.target.value)}
                        placeholder="e.g., Marketing Agency"
                        required
                        className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 ring-ring"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-300">Location</label>
                      <input
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="e.g., New York, NY"
                        required
                        className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 ring-ring"
                      />
                    </div>
                  </div>

                  <div className="rounded-lg bg-slate-900/60 p-3.5 border border-border/60 text-xs text-muted-foreground space-y-1.5 mt-2">
                    <div className="flex justify-between">
                      <span>Generated Job Name:</span>
                      <span className="font-semibold text-slate-200">
                        {jobField && location ? `${jobField} in ${location}` : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Automatic Target Query:</span>
                      <span className="font-semibold text-slate-200">
                        {jobField && location ? `Find ${jobField} websites in ${location}` : '—'}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Job Name</label>
                    <input value={newJob.name} onChange={(e) => setNewJob({ ...newJob, name: e.target.value })}
                      placeholder="e.g., Marketing Agencies in NYC" required
                      className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 ring-ring" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Target URL</label>
                    <input value={newJob.target_url} onChange={(e) => setNewJob({ ...newJob, target_url: e.target.value })}
                      placeholder="https://example.com" required type="url"
                      className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 ring-ring" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Search Query <span className="text-muted-foreground">(optional)</span></label>
                    <input value={newJob.search_query} onChange={(e) => setNewJob({ ...newJob, search_query: e.target.value })}
                      placeholder="e.g., marketing agency"
                      className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 ring-ring" />
                  </div>
                </>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
                <button type="submit" disabled={creating}
                  className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-primary/25">
                  {creating ? <><Loader2 className="h-4 w-4 animate-spin" />Creating...</> : <><Plus className="h-4 w-4" />Create Job</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
