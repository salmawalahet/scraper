import { useEffect, useState } from 'react';
import { exportsApi } from '../services/api';
import {
  Download, Trash2, Calendar, FileText, CheckCircle2,
  XCircle, Loader2, Plus, AlertCircle, RefreshCw, FileSpreadsheet
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
  filters?: any;
  created_at: string;
}

export default function Exports() {
  const [exportsList, setExportsList] = useState<ExportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [exportFormat, setExportFormat] = useState('csv');
  const [exportTarget, setExportTarget] = useState('all'); // 'all' or specific job
  const [creating, setCreating] = useState(false);

  const getExportName = (item: ExportItem) => {
    if (item.job_name) return item.job_name;

    let filters = item.filters;
    if (typeof filters === 'string') {
      try {
        filters = JSON.parse(filters);
      } catch {
        filters = null;
      }
    }

    if (filters) {
      if (filters.has_email || filters.verificationStatus === 'verified') {
        return 'Only Verified Leads';
      }
      if (filters.jobId) {
        return `Job #${filters.jobId} Leads`;
      }
    }

    return 'All Scraped Leads';
  };

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

  const handleDownload = async (item: ExportItem) => {
    try {
      setActionLoading(item.id);
      const res = await exportsApi.download(item.id);
      const blob = new Blob([res.data], { type: 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Try to extract filename from content-disposition or use default
      const filename = item.file_path.split(/[/\\]/).pop() || `leads_export_${item.id}.${item.format.toLowerCase()}`;
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
      await exportsApi.create({
        format: exportFormat.toUpperCase(),
        filters: exportTarget === 'all' ? {} : { has_email: true }
      });
      setShowCreateModal(false);
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
            onClick={() => setShowCreateModal(true)}
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
            onClick={() => setShowCreateModal(true)}
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
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold truncate max-w-[170px]" title={`${getExportName(item)} #${item.id}`}>
                        {getExportName(item)} #{item.id}
                      </h3>
                      <p className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider mt-0.5">
                        {item.format} File
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(item.status)}
                </div>

                {item.search_query && (
                  <div className="mt-2.5 rounded-lg bg-indigo-500/5 border border-indigo-500/10 px-2.5 py-1.5 text-xs text-indigo-400 truncate">
                    <span className="font-semibold text-indigo-300">Query: </span>{item.search_query}
                  </div>
                )}

                <div className="mt-4 grid grid-cols-2 gap-2 text-xs border-t border-b border-border/50 py-3 my-3">
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
          <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-2xl p-6 animate-scale-up">
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
                      onChange={() => setExportTarget('all')}
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
                      onChange={() => setExportTarget('verified')}
                      className="text-primary focus:ring-primary"
                    />
                    <div>
                      <span className="text-xs font-semibold block">Only Verified Leads</span>
                      <span className="text-[10px] text-muted-foreground">Filter out leads without valid emails or details</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex gap-2 justify-end pt-3 border-t border-border mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={creating}
                  className="rounded-lg border border-border bg-card px-4 py-2 text-xs font-medium hover:bg-muted transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
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
