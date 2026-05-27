import { useEffect, useState } from 'react';
import { exportsApi, jobsApi } from '../services/api';
import {
  Download, Trash2, Calendar, FileText, CheckCircle2,
  XCircle, Loader2, Plus, AlertCircle, RefreshCw, FileSpreadsheet,
  Search, Briefcase,
} from 'lucide-react';

interface ExportItem {
  id: number;
  user_id: number;
  job_id: number | null;
  job_name?: string;
  search_query?: string;
  format: string;
  file_path: string;
  file_size: number;
  total_records: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  download_count: number;
  created_at: string;
}

interface JobOption {
  id: number;
  name: string;
  search_query: string | null;
  total_found: number;
}

export default function Exports() {
  const [exportsList, setExportsList] = useState<ExportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [exportFormat, setExportFormat] = useState('csv');
  const [exportTarget, setExportTarget] = useState<'all' | 'verified' | 'job'>('all');
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [jobs, setJobs] = useState<JobOption[]>([]);
  const [jobSearch, setJobSearch] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadExports();
  }, []);

  const loadExports = async () => {
    try {
      setLoading(true);
      const res = await exportsApi.list({ page: 1, limit: 100 });
      setExportsList(res.data.data || []);
    } catch (err) {
      console.error('Failed to load exports:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadJobs = async () => {
    try {
      const res = await jobsApi.list({ page: 1, limit: 200 });
      setJobs((res.data.data || []).map((j: any) => ({
        id: j.id,
        name: j.name,
        search_query: j.search_query,
        total_found: j.total_found,
      })));
    } catch (err) {
      console.error('Failed to load jobs:', err);
    }
  };

  const handleOpenCreateModal = () => {
    setShowCreateModal(true);
    loadJobs();
  };

  const handleDownload = async (item: ExportItem) => {
    try {
      setActionLoading(item.id);
      const res = await exportsApi.download(item.id);
      const blob = new Blob([res.data], { type: 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // Use job name in filename if available
      const jobLabel = item.job_name
        ? item.job_name.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_').substring(0, 40)
        : `all_leads`;
      const filename = item.file_path?.split(/[/\\]/).pop() || `${jobLabel}_export_${item.id}.${item.format.toLowerCase()}`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      // Increment local count
      setExportsList(prev => prev.map(e => e.id === item.id ? { ...e, download_count: e.download_count + 1 } : e));
    } catch (err) {
      console.error('Failed to download export:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this export record? The file will be permanently removed.')) return;
    try {
      setActionLoading(id);
      await exportsApi.delete(id);
      setExportsList(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      console.error('Failed to delete export:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateExport = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreating(true);

      const payload: { format: string; filters?: Record<string, unknown>; jobId?: number } = {
        format: exportFormat.toUpperCase(),
      };

      if (exportTarget === 'verified') {
        payload.filters = { has_email: true };
      } else if (exportTarget === 'job' && selectedJobId) {
        payload.jobId = selectedJobId;
      }

      await exportsApi.create(payload);
      setShowCreateModal(false);
      setExportTarget('all');
      setSelectedJobId(null);
      loadExports();
    } catch (err) {
      console.error('Failed to create export:', err);
      alert('Failed to generate export. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const formatBytes = (bytes: number | null | undefined) => {
    if (bytes === null || bytes === undefined) return '—';
    const num = Number(bytes);
    if (isNaN(num)) return '—';
    if (num === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(num) / Math.log(k));
    return parseFloat((num / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFormatIcon = (format: string) => {
    switch (format.toUpperCase()) {
      case 'CSV':
      case 'XLSX':
      case 'EXCEL':
        return <FileSpreadsheet className="h-8 w-8 text-emerald-500" />;
      default:
        return <FileText className="h-8 w-8 text-blue-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status ? status.toUpperCase() : 'PENDING') {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-500">
            <CheckCircle2 className="h-3 w-3" /> Completed
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-semibold text-rose-500">
            <XCircle className="h-3 w-3" /> Failed
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-blue-500">
            <Loader2 className="h-3 w-3 animate-spin" /> Processing
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-500">
            <RefreshCw className="h-3 w-3 animate-spin" /> Pending
          </span>
        );
    }
  };

  const filteredJobs = jobs.filter((j) => {
    if (!jobSearch) return true;
    const term = jobSearch.toLowerCase();
    return j.name.toLowerCase().includes(term) || (j.search_query && j.search_query.toLowerCase().includes(term));
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Data Exports</h1>
          <p className="text-muted-foreground mt-1">Download and manage your extracted business intelligence records</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadExports}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            New Export
          </button>
        </div>
      </div>

      {/* Main List */}
      {loading ? (
        <div className="flex items-center justify-center h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : exportsList.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
            <Download className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold">No exports generated</h3>
          <p className="text-sm text-muted-foreground max-w-sm mt-1 mb-6">
            Exported lead files will appear here. Create a new export to download your scraped leads in various formats.
          </p>
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Generate First Export
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {exportsList.map((item) => (
            <div
              key={item.id}
              className="group relative flex flex-col justify-between rounded-xl border border-border bg-card p-5 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5"
            >
              <div>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted border border-border">
                      {getFormatIcon(item.format)}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold truncate max-w-[180px]">
                        {item.job_name || `All Leads Export #${item.id}`}
                      </h3>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mt-0.5">
                        {item.format} File
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(item.status)}
                </div>

                {/* Search query info */}
                {item.search_query && (
                  <div className="mt-2 flex items-center gap-1.5 rounded-md bg-indigo-500/5 border border-indigo-500/10 px-2.5 py-1.5">
                    <Search className="h-3 w-3 text-indigo-400 shrink-0" />
                    <p className="text-[10px] text-indigo-300 truncate font-medium">{item.search_query}</p>
                  </div>
                )}

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs border-t border-b border-border/50 py-3 my-3">
                  <div>
                    <span className="text-muted-foreground block">Leads Count</span>
                    <span className="font-semibold text-sm">{item.total_records.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">File Size</span>
                    <span className="font-semibold text-sm">{formatBytes(item.file_size)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{new Date(item.created_at).toLocaleDateString()}</span>
                  <span className="text-border">•</span>
                  <span>{item.download_count} downloads</span>
                </div>
              </div>

              <div className="flex gap-2 mt-5">
                {(item.status ? item.status.toUpperCase() : '') === 'COMPLETED' ? (
                  <button
                    disabled={actionLoading !== null}
                    onClick={() => handleDownload(item)}
                    className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-primary py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50"
                  >
                    {actionLoading === item.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                    Download
                  </button>
                ) : (
                  <button
                    disabled
                    className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-muted py-2 text-xs font-semibold text-muted-foreground cursor-not-allowed"
                  >
                    <AlertCircle className="h-3.5 w-3.5" />
                    Unavailable
                  </button>
                )}
                <button
                  disabled={actionLoading !== null}
                  onClick={() => handleDelete(item.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:bg-destructive/10 hover:border-destructive/30 text-muted-foreground hover:text-destructive transition-colors shrink-0 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Export Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl p-6 animate-scale-up">
            <h2 className="text-lg font-bold">Generate Leads Export</h2>
            <p className="text-sm text-muted-foreground mt-1">Export your collected leads into a high-fidelity tabular data format.</p>

            <form onSubmit={handleCreateExport} className="mt-4 space-y-4">
              {/* Format selection */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">Export Format</label>
                <div className="grid grid-cols-3 gap-2">
                  {['csv', 'excel', 'json'].map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => setExportFormat(fmt)}
                      className={`flex flex-col items-center justify-center rounded-lg border p-3.5 transition-all
                        ${exportFormat === fmt
                          ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary'
                          : 'border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground'
                        }
                      `}
                    >
                      <span className="text-xs font-bold uppercase">{fmt === 'excel' ? 'XLSX' : fmt}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Data Range / Filters */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">Target Data</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 rounded-lg border border-border bg-card p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                    <input
                      type="radio"
                      name="exportTarget"
                      checked={exportTarget === 'all'}
                      onChange={() => { setExportTarget('all'); setSelectedJobId(null); }}
                      className="text-primary focus:ring-primary"
                    />
                    <div>
                      <span className="text-xs font-semibold block">All Scraped Leads</span>
                      <span className="text-[10px] text-muted-foreground">Export everything collected across all jobs</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 rounded-lg border border-border bg-card p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                    <input
                      type="radio"
                      name="exportTarget"
                      checked={exportTarget === 'verified'}
                      onChange={() => { setExportTarget('verified'); setSelectedJobId(null); }}
                      className="text-primary focus:ring-primary"
                    />
                    <div>
                      <span className="text-xs font-semibold block">Only Verified Leads</span>
                      <span className="text-[10px] text-muted-foreground">Filter out leads without valid emails or details</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 rounded-lg border border-border bg-card p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                    <input
                      type="radio"
                      name="exportTarget"
                      checked={exportTarget === 'job'}
                      onChange={() => setExportTarget('job')}
                      className="text-primary focus:ring-primary"
                    />
                    <div>
                      <span className="text-xs font-semibold block">Export by Query / Job</span>
                      <span className="text-[10px] text-muted-foreground">Export leads from a specific scrape query</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Job Picker — shown only when 'job' target is selected */}
              {exportTarget === 'job' && (
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                    Select Query / Job
                  </label>
                  {/* Search bar */}
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search queries..."
                      value={jobSearch}
                      onChange={(e) => setJobSearch(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    />
                  </div>
                  {/* Job list */}
                  <div className="max-h-48 overflow-y-auto space-y-1.5 rounded-lg border border-border p-2 bg-background">
                    {filteredJobs.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">No jobs found</p>
                    ) : (
                      filteredJobs.map((job) => (
                        <button
                          key={job.id}
                          type="button"
                          onClick={() => setSelectedJobId(job.id)}
                          className={`w-full flex items-center gap-3 rounded-lg p-2.5 text-left transition-all ${
                            selectedJobId === job.id
                              ? 'bg-primary/10 border border-primary/30 ring-1 ring-primary/20'
                              : 'hover:bg-muted border border-transparent'
                          }`}
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-indigo-500/10 shrink-0">
                            <Briefcase className="h-4 w-4 text-indigo-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold truncate">{job.name}</p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {job.search_query || 'Direct URL'} • {job.total_found} leads
                            </p>
                          </div>
                          {selectedJobId === job.id && (
                            <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex gap-2 justify-end pt-3 border-t border-border mt-6">
                <button
                  type="button"
                  onClick={() => { setShowCreateModal(false); setExportTarget('all'); setSelectedJobId(null); }}
                  disabled={creating}
                  className="rounded-lg border border-border bg-card px-4 py-2 text-xs font-medium hover:bg-muted transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || (exportTarget === 'job' && !selectedJobId)}
                  className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50"
                >
                  {creating && <Loader2 className="h-3 w-3 animate-spin" />}
                  Generate Export
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
