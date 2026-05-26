import { useState } from 'react';
import { useAuthStore } from '../stores/auth.store';
import { useThemeStore } from '../stores/theme.store';
import {
  User, Shield, Key, Sliders, Globe, RefreshCw,
  CheckCircle2, AlertCircle, Loader2, Sparkles, Server
} from 'lucide-react';

export default function Settings() {
  const { user } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const [activeTab, setActiveTab] = useState<'profile' | 'scraper' | 'integrations'>('profile');

  // Form states
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileEmail, setProfileEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Scraper config states
  const [concurrency, setConcurrency] = useState(5);
  const [depth, setDepth] = useState(3);
  const [respectRobots, setRespectRobots] = useState(true);
  const [proxyEnabled, setProxyEnabled] = useState(false);
  const [proxyServers, setProxyServers] = useState('');
  const [savingScraper, setSavingScraper] = useState(false);
  const [scraperSuccess, setScraperSuccess] = useState(false);

  // Integration states
  const [webhookUrl, setWebhookUrl] = useState('');
  const [googleSheetsId, setGoogleSheetsId] = useState('');
  const [hubspotKey, setHubspotKey] = useState('');
  const [savingIntegrations, setSavingIntegrations] = useState(false);
  const [integrationsSuccess, setIntegrationsSuccess] = useState(false);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingProfile(true);
      setProfileSuccess(false);
      // Simulate API call for profile update
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setProfileSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      console.error(err);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleScraperSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingScraper(true);
      setScraperSuccess(false);
      // Simulate API call for scraping settings update
      await new Promise((resolve) => setTimeout(resolve, 800));
      setScraperSuccess(true);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingScraper(false);
    }
  };

  const handleIntegrationsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingIntegrations(true);
      setIntegrationsSuccess(false);
      // Simulate API call for integration keys
      await new Promise((resolve) => setTimeout(resolve, 1200));
      setIntegrationsSuccess(true);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingIntegrations(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">Platform Settings</h1>
        <p className="text-muted-foreground mt-1">Configure your personal profile and deep scraper engine integrations</p>
      </div>

      {/* Main Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
        {/* Navigation Sidebar Tabs */}
        <div className="flex flex-col gap-1 rounded-xl border border-border bg-card p-2 md:col-span-1 shadow-sm">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-semibold tracking-wide uppercase transition-all
              ${activeTab === 'profile'
                ? 'bg-primary/10 text-primary shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }
            `}
          >
            <User className="h-4 w-4 shrink-0" />
            Profile & Security
          </button>
          <button
            onClick={() => setActiveTab('scraper')}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-semibold tracking-wide uppercase transition-all
              ${activeTab === 'scraper'
                ? 'bg-primary/10 text-primary shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }
            `}
          >
            <Sliders className="h-4 w-4 shrink-0" />
            Scraper Engine
          </button>
          <button
            onClick={() => setActiveTab('integrations')}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-semibold tracking-wide uppercase transition-all
              ${activeTab === 'integrations'
                ? 'bg-primary/10 text-primary shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }
            `}
          >
            <Globe className="h-4 w-4 shrink-0" />
            CRM Integrations
          </button>
        </div>

        {/* Tab content */}
        <div className="md:col-span-3 space-y-6">
          {activeTab === 'profile' && (
            <div className="rounded-xl border border-border bg-card shadow-sm">
              <div className="border-b border-border p-5">
                <h3 className="text-sm font-semibold">Profile Information</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Manage your personal credentials and platform details</p>
              </div>

              <form onSubmit={handleProfileSubmit} className="p-5 space-y-4">
                {profileSuccess && (
                  <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 p-3 text-xs font-medium text-emerald-500">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Profile settings updated successfully!</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Full Name</label>
                    <input
                      type="text"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      required
                      className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm outline-none focus:border-primary transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Email Address</label>
                    <input
                      type="email"
                      value={profileEmail}
                      onChange={(e) => setProfileEmail(e.target.value)}
                      required
                      className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm outline-none focus:border-primary transition-colors"
                    />
                  </div>
                </div>

                <div className="border-t border-border/50 pt-4 mt-6">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Update Password</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Current Password</label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm outline-none focus:border-primary transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">New Password</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm outline-none focus:border-primary transition-colors"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-border/50">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={toggleTheme}
                      className="flex items-center gap-2 rounded-lg border border-border px-3.5 py-2 text-xs font-semibold hover:bg-muted transition-colors"
                    >
                      <Sparkles className="h-4 w-4 text-amber-500" />
                      Toggle Theme ({theme === 'dark' ? 'Light' : 'Dark'})
                    </button>
                  </div>
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50"
                  >
                    {savingProfile && <Loader2 className="h-3 w-3 animate-spin" />}
                    Save Profile
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'scraper' && (
            <div className="rounded-xl border border-border bg-card shadow-sm">
              <div className="border-b border-border p-5">
                <h3 className="text-sm font-semibold">Deep Scraper Engine Configurations</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Control concurrency rates, network depths, and proxy options</p>
              </div>

              <form onSubmit={handleScraperSubmit} className="p-5 space-y-4">
                {scraperSuccess && (
                  <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 p-3 text-xs font-medium text-emerald-500">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Scraper engine configurations saved.</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Max Concurrent Browsers</label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={concurrency}
                      onChange={(e) => setConcurrency(parseInt(e.target.value))}
                      className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm outline-none focus:border-primary transition-colors"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">Limits browser threads spawned on Windows system</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Max Scraping Depth (Links)</label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={depth}
                      onChange={(e) => setDepth(parseInt(e.target.value))}
                      className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm outline-none focus:border-primary transition-colors"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">How many internal domain levels to follow for contact details</p>
                  </div>
                </div>

                <div className="border-t border-border/50 pt-4 mt-4 space-y-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={respectRobots}
                      onChange={(e) => setRespectRobots(e.target.checked)}
                      className="rounded text-primary focus:ring-primary h-4 w-4"
                    />
                    <div>
                      <span className="text-xs font-semibold block">Respect Robots.txt file guidelines</span>
                      <span className="text-[10px] text-muted-foreground">Always fetch robots.txt prior to crawlers launching</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer border-t border-border/30 pt-4">
                    <input
                      type="checkbox"
                      checked={proxyEnabled}
                      onChange={(e) => setProxyEnabled(e.target.checked)}
                      className="rounded text-primary focus:ring-primary h-4 w-4"
                    />
                    <div>
                      <span className="text-xs font-semibold block">Enable IP Proxy Rotation</span>
                      <span className="text-[10px] text-muted-foreground">Distribute scraping across configured proxy servers</span>
                    </div>
                  </label>

                  {proxyEnabled && (
                    <div className="animate-fade-in pl-6">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Proxy Servers List (One per line)</label>
                      <textarea
                        value={proxyServers}
                        onChange={(e) => setProxyServers(e.target.value)}
                        placeholder="http://user:password@proxy.example.com:8080"
                        rows={3}
                        className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs outline-none focus:border-primary font-mono transition-colors"
                      />
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-4 border-t border-border/50 mt-6">
                  <button
                    type="submit"
                    disabled={savingScraper}
                    className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50"
                  >
                    {savingScraper && <Loader2 className="h-3 w-3 animate-spin" />}
                    Save Config
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'integrations' && (
            <div className="rounded-xl border border-border bg-card shadow-sm">
              <div className="border-b border-border p-5">
                <h3 className="text-sm font-semibold">CRM & Webhook Integrations</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Sync newly discovered high-scoring leads automatically into external CRM platforms</p>
              </div>

              <form onSubmit={handleIntegrationsSubmit} className="p-5 space-y-4">
                {integrationsSuccess && (
                  <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 p-3 text-xs font-medium text-emerald-500">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>CRM API keys and webhook configurations updated!</span>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Custom Dispatch Webhook URL</label>
                    <input
                      type="url"
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      placeholder="https://yourserver.com/lead-receiver"
                      className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm outline-none focus:border-primary transition-colors"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">Dispatches a JSON payload automatically when leads are verified</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-border/50 pt-4">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Google Sheets Document ID</label>
                      <input
                        type="text"
                        value={googleSheetsId}
                        onChange={(e) => setGoogleSheetsId(e.target.value)}
                        placeholder="1A2B3C4D5E6F7G8H9I0J..."
                        className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm outline-none focus:border-primary transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">HubSpot Access Token</label>
                      <input
                        type="password"
                        value={hubspotKey}
                        onChange={(e) => setHubspotKey(e.target.value)}
                        placeholder="pat-na1-••••••••••••"
                        className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm outline-none focus:border-primary transition-colors"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-border/50 mt-6">
                  <button
                    type="submit"
                    disabled={savingIntegrations}
                    className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50"
                  >
                    {savingIntegrations && <Loader2 className="h-3 w-3 animate-spin" />}
                    Save Keys
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
