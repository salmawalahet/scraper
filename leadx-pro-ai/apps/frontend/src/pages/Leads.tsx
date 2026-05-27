import { useEffect, useState, useCallback } from 'react';
import { socketClient } from '../services/socket';
import { leadsApi, exportsApi } from '../services/api';
import {
  Search, Filter, Download, Trash2, ChevronLeft, ChevronRight,
  Mail, Phone, Globe, MapPin, X, ExternalLink,
  CheckCircle2, AlertCircle, Clock, Loader2, Eye,
  Sparkles, Copy, Check,
} from 'lucide-react';

function Linkedin(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

interface Lead {
  id: number; company_name: string; email: string | null; phone: string | null;
  whatsapp: string | null; website: string | null; linkedin: string | null;
  facebook: string | null; address: string | null; category: string | null;
  company_size: string; source_url: string; verification_status: string;
  confidence_score: number; website_status: string; lead_priority: string;
  tags: string[]; created_at: string;
  ai_summary: string | null;
  cold_email_draft: string | null;
  ai_enriched_at: string | null;
}

const priorityColors: Record<string, string> = {
  high: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  medium: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  low: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
};

const verificationIcons: Record<string, { icon: typeof CheckCircle2; color: string }> = {
  verified: { icon: CheckCircle2, color: 'text-emerald-500' },
  unverified: { icon: AlertCircle, color: 'text-amber-500' },
  invalid: { icon: X, color: 'text-red-500' },
  pending: { icon: Clock, color: 'text-slate-400' },
};

export default function Leads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [isEnriching, setIsEnriching] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyEmail = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAiEnrich = async (id: number) => {
    setIsEnriching(true);
    try {
      await leadsApi.aiEnrich(id);
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        try {
          const res = await leadsApi.getById(id);
          const updatedLead = res.data?.data?.lead;
          if (updatedLead && updatedLead.ai_enriched_at) {
            clearInterval(interval);
            setSelectedLead(updatedLead);
            setLeads((prev) => prev.map((l) => (l.id === id ? updatedLead : l)));
            setIsEnriching(false);
          } else if (attempts >= 15) {
            clearInterval(interval);
            setIsEnriching(false);
            alert('AI Enrichment is taking longer than expected. Please check settings or try again.');
          }
        } catch (err: any) {
          clearInterval(interval);
          setIsEnriching(false);
          console.error(err);
        }
      }, 3000);
    } catch (err: any) {
      setIsEnriching(false);
      const errMsg = err.response?.data?.error || err.message || 'Failed to queue AI Enrichment';
      alert(errMsg);
    }
  };

  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, limit, ...filters };
      if (search) params.search = search;
      const res = await leadsApi.search(params);
      setLeads(res.data.data || []);
      setTotal(res.data.meta?.total || 0);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [page, limit, search, filters]);

  useEffect(() => { loadLeads(); }, [loadLeads]);

  // Listen for AI enrichment errors
  useEffect(() => {
    const handleError = (data: { leadId: number; error: string }) => {
      if (selectedLead && data.leadId === selectedLead.id) {
        alert(`AI Enrichment Error: ${data.error}`);
      }
    };
    socketClient.on('lead:ai-enriched:error', handleError);
    return () => {
      // Cleanup listener on unmount
      // Assuming socketClient.off method exists
      // If not, we cannot remove; but we'll attempt
      // @ts-ignore
      socketClient.off && socketClient.off('lead:ai-enriched:error', handleError);
    };
  }, [selectedLead]);

  const totalPages = Math.ceil(total / limit);

  const toggleSelect = (id: number) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === leads.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(leads.map((l) => l.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    try {
      await leadsApi.bulkAction({ ids: Array.from(selectedIds), action: 'delete' });
      setSelectedIds(new Set());
      loadLeads();
    } catch (e) { console.error(e); }
  };

  const handleExport = async (format: string) => {
    try {
      const data: any = { format };
      if (selectedIds.size > 0) {
        data.leadIds = Array.from(selectedIds);
      } else {
        data.filters = filters;
      }
      await exportsApi.create(data);
      alert('Export queued! Check the Exports page.');
    } catch (e) { console.error(e); }
  };

  const confidenceColor = (score: number) => {
    if (score >= 90) return 'text-emerald-500';
    if (score >= 70) return 'text-amber-500';
    return 'text-red-400';
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Leads</h1>
          <p className="text-muted-foreground mt-1">{total.toLocaleString()} leads found</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => handleExport('csv')} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted transition-colors">
            <Download className="h-4 w-4" /> Export CSV
          </button>
          <button onClick={() => handleExport('excel')} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted transition-colors">
            <Download className="h-4 w-4" /> Export Excel
          </button>
        </div>
      </div>

      {/* Search & Filter bar */}
      <div className="flex gap-3 items-center">
        <div className="flex-1 flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by company name, email, address..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
          {search && <button onClick={() => setSearch('')}><X className="h-3.5 w-3.5 text-muted-foreground" /></button>}
        </div>
        <button onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm border transition-colors ${showFilters ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted'}`}>
          <Filter className="h-4 w-4" /> Filters
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="rounded-xl border border-border bg-card p-4 grid grid-cols-2 md:grid-cols-4 gap-3 animate-fade-in">
          <select value={filters.verificationStatus || ''} onChange={(e) => { setFilters({ ...filters, verificationStatus: e.target.value }); setPage(1); }}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none">
            <option value="">All Verification</option>
            <option value="verified">Verified</option>
            <option value="unverified">Unverified</option>
            <option value="pending">Pending</option>
          </select>
          <select value={filters.leadPriority || ''} onChange={(e) => { setFilters({ ...filters, leadPriority: e.target.value }); setPage(1); }}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none">
            <option value="">All Priority</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select value={filters.hasEmail || ''} onChange={(e) => { setFilters({ ...filters, hasEmail: e.target.value }); setPage(1); }}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none">
            <option value="">Email: Any</option>
            <option value="true">Has Email</option>
          </select>
          <select value={filters.hasLinkedin || ''} onChange={(e) => { setFilters({ ...filters, hasLinkedin: e.target.value }); setPage(1); }}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none">
            <option value="">LinkedIn: Any</option>
            <option value="true">Has LinkedIn</option>
          </select>
        </div>
      )}

      {/* Bulk actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5 animate-fade-in">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <div className="h-4 w-px bg-border" />
          <button onClick={handleBulkDelete} className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-400 transition-colors">
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
          <button onClick={() => handleExport('csv')} className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors">
            <Download className="h-3.5 w-3.5" /> Export
          </button>
          <button onClick={() => setSelectedIds(new Set())} className="ml-auto text-xs text-muted-foreground hover:text-foreground">Clear</button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : leads.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">No leads match your criteria</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-left">
                    <input type="checkbox" checked={selectedIds.size === leads.length && leads.length > 0}
                      onChange={toggleSelectAll} className="rounded border-border" />
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Company</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Contact</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Category</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">Score</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">Priority</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {leads.map((lead) => {
                  const vIcon = verificationIcons[lead.verification_status] || verificationIcons.pending;
                  const VIcon = vIcon.icon;
                  return (
                    <tr key={lead.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <input type="checkbox" checked={selectedIds.has(lead.id)}
                          onChange={() => toggleSelect(lead.id)} className="rounded border-border" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium truncate max-w-[200px]">{lead.company_name}</div>
                        {lead.website && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                            <Globe className="h-3 w-3" />{lead.website.replace(/https?:\/\//, '').substring(0, 30)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-0.5">
                          {lead.email && <div className="flex items-center gap-1 text-xs"><Mail className="h-3 w-3 text-indigo-400" />{lead.email}</div>}
                          {lead.phone && <div className="flex items-center gap-1 text-xs"><Phone className="h-3 w-3 text-emerald-400" />{lead.phone}</div>}
                          {lead.linkedin && <div className="flex items-center gap-1 text-xs"><Linkedin className="h-3 w-3 text-blue-400" />LinkedIn</div>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{lead.category || '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-bold ${confidenceColor(lead.confidence_score)}`}>{lead.confidence_score}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${priorityColors[lead.lead_priority] || priorityColors.low}`}>
                          {lead.lead_priority.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <VIcon className={`h-4 w-4 mx-auto ${vIcon.color}`} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => setSelectedLead(lead)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <span className="text-xs text-muted-foreground">
              Showing {(page - 1) * limit + 1}-{Math.min(page * limit, total)} of {total.toLocaleString()}
            </span>
            <div className="flex gap-1">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-30 transition-colors">
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = page <= 3 ? i + 1 : page + i - 2;
                if (p < 1 || p > totalPages) return null;
                return (
                  <button key={p} onClick={() => setPage(p)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${p === page ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>
                    {p}
                  </button>
                );
              })}
              <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-30 transition-colors">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Lead Detail Drawer */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setSelectedLead(null)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative w-full max-w-md bg-card border-l border-border h-full overflow-y-auto animate-slide-in p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Lead Details</h2>
              <button onClick={() => setSelectedLead(null)} className="rounded-lg p-1.5 hover:bg-muted transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-bold">{selectedLead.company_name}</h3>
                <span className={`inline-flex items-center gap-1 mt-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${priorityColors[selectedLead.lead_priority]}`}>
                  {selectedLead.lead_priority.toUpperCase()} PRIORITY
                </span>
              </div>

              <div className="grid gap-3">
                {[
                  { icon: Mail, label: 'Email', value: selectedLead.email },
                  { icon: Phone, label: 'Phone', value: selectedLead.phone },
                  { icon: Globe, label: 'Website', value: selectedLead.website },
                  { icon: Linkedin, label: 'LinkedIn', value: selectedLead.linkedin },
                  { icon: MapPin, label: 'Address', value: selectedLead.address },
                ].map((item) => item.value && (
                  <div key={item.label} className="flex items-start gap-3 rounded-lg border border-border p-3">
                    <item.icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{item.label}</p>
                      <p className="text-sm font-medium break-all">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Category</p>
                  <p className="text-sm font-medium">{selectedLead.category || 'Unknown'}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Size</p>
                  <p className="text-sm font-medium">{selectedLead.company_size}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Confidence</p>
                  <p className={`text-lg font-bold ${confidenceColor(selectedLead.confidence_score)}`}>{selectedLead.confidence_score}/100</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Verification</p>
                  <p className="text-sm font-medium capitalize">{selectedLead.verification_status}</p>
                </div>
              </div>

              {selectedLead.tags && selectedLead.tags.length > 0 && (
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedLead.tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">{tag}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Insights & Cold Outreach Section */}
              <div className="border-t border-border pt-4 mt-2 space-y-4">
                <div className="flex items-center gap-2 text-primary">
                  <Sparkles className="h-4 w-4 shrink-0 animate-pulse text-indigo-400" />
                  <span className="text-xs font-bold uppercase tracking-wider">AI Lead Intelligence</span>
                </div>

                {isEnriching ? (
                  <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3 animate-pulse">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <span>Enriching lead intelligence...</span>
                    </div>
                    <div className="h-3 bg-muted rounded-full w-full"></div>
                    <div className="h-3 bg-muted rounded-full w-5/6"></div>
                    <div className="h-3 bg-muted rounded-full w-4/5"></div>
                  </div>
                ) : selectedLead.ai_enriched_at && !selectedLead.ai_summary ? (
                  <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 space-y-3 animate-fade-in">
                    <div className="flex items-start gap-2.5 text-xs text-red-400 font-medium">
                      <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
                      <div>
                        <p className="font-bold text-red-400">Enrichment Failed (API Quota Exceeded)</p>
                        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                          The request was sent successfully but your OpenAI key returned a **429 Quota Exceeded** error. Please check your OpenAI billing plan.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAiEnrich(selectedLead.id)}
                      disabled={isEnriching}
                      className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-200"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-indigo-400" /> Try Again
                    </button>
                  </div>
                ) : selectedLead.ai_summary ? (
                  <div className="space-y-4">
                    {/* Summary */}
                    <div className="rounded-lg border border-border bg-indigo-500/5 p-4 space-y-2">
                      <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">Business Summary</p>
                      <p className="text-sm font-normal leading-relaxed text-foreground/90">{selectedLead.ai_summary}</p>
                    </div>

                    {/* Cold Outreach */}
                    {selectedLead.cold_email_draft && (
                      <div className="rounded-lg border border-border bg-card p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Personalized Cold Outreach</p>
                          <button
                            onClick={() => handleCopyEmail(selectedLead.cold_email_draft!)}
                            className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                          >
                            {copied ? (
                              <>
                                <Check className="h-3.5 w-3.5 text-emerald-400" />
                                <span className="text-emerald-400 font-semibold">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5" />
                                <span>Copy Draft</span>
                              </>
                            )}
                          </button>
                        </div>
                        <div className="relative">
                          <textarea
                            readOnly
                            value={selectedLead.cold_email_draft}
                            rows={6}
                            className="w-full text-xs font-mono bg-muted/40 text-muted-foreground border border-border rounded-md p-3 outline-none resize-none leading-relaxed"
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAiEnrich(selectedLead.id)}
                        disabled={isEnriching}
                        className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-200"
                      >
                        <Sparkles className="h-3.5 w-3.5 text-indigo-400" /> Re-generate Insights
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-border border-dashed p-6 text-center space-y-3">
                    <p className="text-xs text-muted-foreground leading-normal">
                      Get instant business model analysis, value proposition, and highly customized cold email drafts.
                    </p>
                    <button
                      onClick={() => handleAiEnrich(selectedLead.id)}
                      disabled={isEnriching}
                      className="w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-3 text-xs shadow-md shadow-indigo-600/10 hover:shadow-indigo-500/20 active:scale-95 transition-all duration-150"
                    >
                      <Sparkles className="h-3.5 w-3.5" /> Generate AI Insights
                    </button>
                  </div>
                )}
              </div>

              {selectedLead.source_url && (
                <a href={selectedLead.source_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm hover:bg-muted transition-colors">
                  <ExternalLink className="h-4 w-4" /> View Source Page
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
