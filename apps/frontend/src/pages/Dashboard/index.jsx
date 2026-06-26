import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  MoreHorizontal, AlertTriangle, ChevronLeft, ChevronRight,
  Copy, Trash2, Pencil, Check, X, Loader2,
  Power, Globe, Clock, Mail, Zap, Hash,
  Rss, MessageSquare, GitBranch, ShoppingCart, CreditCard, Database,
  Search, LayoutGrid, List, Plus, Activity,
} from 'lucide-react';
import api from '../../lib/api';
import { toast } from 'sonner';

import OnboardingModal from '../../components/onboarding/OnboardingModal';
import DashboardSidebar from './components/DashboardSidebar';
import UsagePage from './components/UsagePage';
import EmptyState from './components/EmptyState';
import DashboardHero from './components/DashboardHero';
import CreateAutomationBox from './components/CreateAutomationBox';
import WorkflowPreview from './components/WorkflowPreview';
import WorkspaceHeader from '../Workspace/components/WorkspaceHeader';
import VaultManager from './components/VaultManager';
import Analytics from './components/Analytics';
import NodeLibrary from './components/NodeLibrary';
import Settings from './components/Settings';
import ConnectMCP from './components/ConnectMCP';

const TRIGGER_META = {
  manual:           { label: 'Manual',       Icon: Zap,           color: 'text-neutral-400',  bg: 'bg-neutral-800/60' },
  webhook:          { label: 'Webhook',       Icon: Globe,         color: 'text-blue-400',     bg: 'bg-blue-500/10' },
  cron_trigger:     { label: 'Scheduled',     Icon: Clock,         color: 'text-amber-400',    bg: 'bg-amber-500/10' },
  gmail_trigger:    { label: 'Gmail',         Icon: Mail,          color: 'text-red-400',      bg: 'bg-red-500/10' },
  imap_trigger:     { label: 'Email (IMAP)',  Icon: Mail,          color: 'text-blue-400',     bg: 'bg-blue-500/10' },
  slack_trigger:    { label: 'Slack',         Icon: Hash,          color: 'text-purple-400',   bg: 'bg-purple-500/10' },
  discord_trigger:  { label: 'Discord',       Icon: MessageSquare, color: 'text-indigo-400',   bg: 'bg-indigo-500/10' },
  github_trigger:   { label: 'GitHub',        Icon: GitBranch,     color: 'text-neutral-300',  bg: 'bg-neutral-800/60' },
  gitlab_trigger:   { label: 'GitLab',        Icon: GitBranch,     color: 'text-orange-400',   bg: 'bg-orange-500/10' },
  rss_trigger:      { label: 'RSS Feed',      Icon: Rss,           color: 'text-orange-400',   bg: 'bg-orange-500/10' },
  shopify_trigger:  { label: 'Shopify',       Icon: ShoppingCart,  color: 'text-emerald-400',  bg: 'bg-emerald-500/10' },
  stripe_trigger:   { label: 'Stripe',        Icon: CreditCard,    color: 'text-violet-400',   bg: 'bg-violet-500/10' },
  database_trigger: { label: 'Database',      Icon: Database,      color: 'text-cyan-400',     bg: 'bg-cyan-500/10' },
  telegram_trigger: { label: 'Telegram',      Icon: MessageSquare, color: 'text-sky-400',      bg: 'bg-sky-500/10' },
};

const TRIGGER_COLOR = {
  webhook: '#3b82f6', cron_trigger: '#f59e0b', gmail_trigger: '#ef4444',
  imap_trigger: '#3b82f6', slack_trigger: '#8b5cf6', discord_trigger: '#6366f1',
  github_trigger: '#a3a3a3', gitlab_trigger: '#f97316', rss_trigger: '#f97316',
  shopify_trigger: '#10b981', stripe_trigger: '#8b5cf6', database_trigger: '#06b6d4',
  telegram_trigger: '#0ea5e9', manual: '#525252',
};

function TriggerBadge({ trigger }) {
  const meta = TRIGGER_META[trigger] || { label: trigger || 'Manual', Icon: Zap, color: 'text-neutral-500', bg: 'bg-neutral-800/60' };
  const { label, Icon, color, bg } = meta;
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${color} ${bg}`}>
      <Icon className="w-2.5 h-2.5 shrink-0" />
      {label}
    </span>
  );
}

function CollabAvatarStack({ collaborators = [] }) {
  if (!collaborators.length) return null;
  const shown = collaborators.slice(0, 3);
  return (
    <div className="flex items-center -space-x-1.5">
      {shown.map((c, i) => {
        const src = c.avatar || c.picture;
        return src ? (
          <img key={c.userId || i} src={src} alt={c.name} title={c.name} referrerPolicy="no-referrer"
            className="w-5 h-5 rounded-full border border-[var(--bb-surface-0)] object-cover" />
        ) : (
          <div key={c.userId || i} title={c.name}
            className="w-5 h-5 rounded-full border border-[var(--bb-surface-0)] flex items-center justify-center text-[8px] font-semibold uppercase"
            style={{ background: 'var(--bb-surface-3)', color: 'var(--bb-text-mid)' }}>
            {c.name?.charAt(0) || '?'}
          </div>
        );
      })}
      {collaborators.length > 3 && (
        <div className="w-5 h-5 rounded-full border border-[var(--bb-surface-0)] flex items-center justify-center text-[8px] font-semibold text-[var(--bb-text-lo)]"
          style={{ background: 'var(--bb-surface-2)' }}>
          +{collaborators.length - 3}
        </div>
      )}
    </div>
  );
}

function timeAgo(d) {
  if (!d) return '—';
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 2592000) return `${Math.floor(s / 86400)}d ago`;
  return new Date(d).toLocaleDateString();
}

function ActionMenu({ wf, onDelete, onDuplicate, onRename, onToggleActive, onClose, anchorRect }) {
  const [mode, setMode] = useState('menu');
  const [val, setVal] = useState(wf.name);
  const [busy, setBusy] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [onClose]);

  const exec = async (fn, ...args) => { setBusy(true); await fn(...args); setBusy(false); onClose(); };

  const menuW = mode === 'rename' || mode === 'confirmDelete' ? 224 : 160;
  const pos = anchorRect
    ? { top: anchorRect.bottom + 6, left: Math.min(anchorRect.right - menuW, window.innerWidth - menuW - 8) }
    : { top: 80, right: 16 };

  const shell = (children) => createPortal(
    <div ref={ref} style={{ position: 'fixed', zIndex: 9999, width: menuW, ...pos, fontSize: 12 }}
      className="bb-glass-strong overflow-hidden"
      onClick={e => e.stopPropagation()}>
      {children}
    </div>,
    document.body
  );

  if (mode === 'rename') return shell(
    <div className="p-2.5">
      <p className="bb-eyebrow px-1 mb-2">Rename</p>
      <div className="flex items-center gap-1.5">
        <input autoFocus value={val} onChange={e => setVal(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && val.trim() && exec(onRename, wf._id || wf.id, val.trim())}
          className="bb-input bb-focus-ring flex-1 px-2.5 py-1.5 text-[12px]" />
        <button onClick={() => val.trim() && exec(onRename, wf._id || wf.id, val.trim())} disabled={busy}
          className="p-1.5 text-[var(--bb-text-mid)] hover:text-[var(--bb-text-hi)] disabled:opacity-50"><Check className="w-3.5 h-3.5" /></button>
        <button onClick={() => setMode('menu')} className="p-1.5 text-[var(--bb-text-dim)] hover:text-[var(--bb-text-hi)]"><X className="w-3.5 h-3.5" /></button>
      </div>
    </div>
  );

  if (mode === 'confirmDelete') return shell(
    <div className="p-3">
      <p className="text-[12px] text-[var(--bb-text-mid)] mb-3 leading-relaxed">Delete <strong className="text-[var(--bb-text-hi)]">{wf.name}</strong>? This cannot be undone.</p>
      <div className="flex items-center gap-2 justify-end">
        <button onClick={() => setMode('menu')} className="text-[11px] text-[var(--bb-text-lo)] hover:text-[var(--bb-text-hi)] px-2.5 py-1.5 rounded-lg transition-colors">Cancel</button>
        <button onClick={() => exec(onDelete, wf._id || wf.id)} disabled={busy}
          className="text-[11px] text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-lg hover:bg-red-500/20 disabled:opacity-50 transition-all">
          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Delete'}
        </button>
      </div>
    </div>
  );

  const isActive = wf.status === 'active';
  const btnCls = 'w-full flex items-center gap-2.5 px-3 py-2 text-[var(--bb-text-lo)] hover:text-[var(--bb-text-hi)] hover:bg-white/[0.04] transition-colors text-left';
  const iconSz = { width: 13, height: 13, flexShrink: 0 };

  return shell(
    <div className="py-1">
      <button onClick={() => exec(onToggleActive, wf)} className={btnCls}>
        <Power style={iconSz} /> {isActive ? 'Deactivate' : 'Set Active'}
      </button>
      <div className="border-t bb-divider my-1" />
      <button onClick={() => setMode('rename')} className={btnCls}>
        <Pencil style={iconSz} /> Rename
      </button>
      <button onClick={() => exec(onDuplicate, wf._id || wf.id)} disabled={busy} className={`${btnCls} disabled:opacity-40`}>
        {busy ? <Loader2 style={iconSz} className="animate-spin" /> : <Copy style={iconSz} />} Duplicate
      </button>
      <div className="border-t bb-divider my-1" />
      <button onClick={() => setMode('confirmDelete')}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-red-400/70 hover:text-red-400 hover:bg-red-500/[0.05] transition-colors text-left">
        <Trash2 style={iconSz} /> Delete
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
export default function Dashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const heroRef = useRef(null);
  const [workflows, setWorkflows] = useState([]);
  const [workflowsLoading, setWorkflowsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [systemError, setSystemError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [openMenuId, setOpenMenuId] = useState(null);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [billingUsage, setBillingUsage] = useState(null);
  const [activeTab, setActiveTab] = useState('workflows');

  // execution logs
  const [executions, setExecutions] = useState([]);
  const [execLoading, setExecLoading] = useState(false);


  const openMenu = (e, id) => { e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); setMenuAnchor(r); setOpenMenuId(openMenuId === id ? null : id); };
  const closeMenu = () => { setOpenMenuId(null); setMenuAnchor(null); };

  const handleLogout = useCallback(() => {
    localStorage.removeItem('blinkbox_token');
    localStorage.removeItem('blinkbox_user');
    delete api.defaults.headers.common['Authorization'];
    navigate('/login', { replace: true });
  }, [navigate]);

  useEffect(() => {
    const i = api.interceptors.response.use((r) => r, (e) => {
      if (e.response?.status === 401 || e.response?.status === 403) handleLogout();
      return Promise.reject(e);
    });
    return () => api.interceptors.response.eject(i);
  }, [handleLogout]);

  useEffect(() => {
    const t = localStorage.getItem('blinkbox_token');
    const u = localStorage.getItem('blinkbox_user');
    if (!t || !u || u === 'undefined') { handleLogout(); return; }
    try { const p = JSON.parse(u); if (!p.id || !p.email) throw 0; setUser(p); } catch { handleLogout(); }
  }, [handleLogout]);

  const fetchWorkflows = useCallback(async () => {
    if (!user) return;
    setSystemError(null);
    setWorkflowsLoading(true);
    try {
      const r = await api.get('/api/automation', { params: { page: currentPage, limit: 21 } });
      setWorkflows(r.data?.automations || []);
      setPagination(r.data?.pagination || null);
    } catch { setSystemError('Failed to load workflows.'); }
    finally { setWorkflowsLoading(false); }
  }, [user, currentPage]);

  useEffect(() => { fetchWorkflows(); }, [fetchWorkflows]);

  // Re-fetch when a collab invite is accepted elsewhere (NotificationBell fires this)
  useEffect(() => {
    const handler = () => fetchWorkflows();
    window.addEventListener('blinkbox:workflows:refresh', handler);
    return () => window.removeEventListener('blinkbox:workflows:refresh', handler);
  }, [fetchWorkflows]);

  useEffect(() => {
    if (!user) return;
    api.get('/api/billing/usage').then(r => setBillingUsage(r.data)).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!user || activeTab !== 'logs') return;
    setExecLoading(true);
    api.get('/api/execution/history', { params: { limit: 50 } })
      .then(r => setExecutions(r.data?.executions || r.data || []))
      .catch(() => {})
      .finally(() => setExecLoading(false));
  }, [user, activeTab]);

  const handleCreate = async (data) => {
    if (isCreating) return;
    setIsCreating(true); setSystemError(null);
    try {
      const r = await api.post('/api/automation', { name: data.name.trim(), description: data.description?.trim() || '', trigger: 'manual' });
      if (r.data?.success) { setWorkflows([r.data.automation, ...workflows]); setIsModalOpen(false); navigate(`/workspace/${r.data.automation._id}`); }
    } catch (e) { setSystemError(e.message || 'Failed.'); }
    setIsCreating(false);
  };

  const handleDelete = async (id) => {
    try { await api.delete(`/api/automation/${id}`); setWorkflows(workflows.filter((w) => (w._id || w.id) !== id)); }
    catch { toast.error('Failed to delete workflow'); }
  };

  const handleDuplicate = async (id) => {
    try {
      const r = await api.post(`/api/automation/${id}/duplicate`);
      if (r.data?.success) { setWorkflows([r.data.automation, ...workflows]); toast.success('Workflow duplicated'); }
    } catch { toast.error('Failed to duplicate workflow'); }
  };

  const handleRename = async (id, name) => {
    try {
      const r = await api.patch(`/api/automation/${id}/rename`, { name });
      if (r.data?.success) setWorkflows(workflows.map((w) => (w._id || w.id) === id ? { ...w, name } : w));
    } catch { toast.error('Failed to rename workflow'); }
  };

  const handleToggleActive = async (wf) => {
    const id = wf._id || wf.id;
    const isActive = wf.status === 'active';
    try {
      if (isActive) {
        await api.post(`/api/automation/${id}/deactivate`);
        setWorkflows((prev) => prev.map((w) => (w._id || w.id) === id ? { ...w, status: 'draft', active: false } : w));
      } else {
        await api.post(`/api/automation/${id}/activate`);
        setWorkflows((prev) => prev.map((w) => (w._id || w.id) === id ? { ...w, status: 'active', active: true } : w));
      }
    } catch (e) {
      toast.error(e.response?.data?.message || e.message || 'Failed to update status.');
    }
  };

  let filtered = workflows;
  if (statusFilter !== 'all') filtered = filtered.filter((w) => (w.status || 'draft') === statusFilter);
  if (search) filtered = filtered.filter((w) => w.name.toLowerCase().includes(search.toLowerCase()));

  if (!user) return (
    <div className="h-screen w-screen bg-neutral-950 flex items-center justify-center">
      <Loader2 className="w-5 h-5 text-neutral-700 animate-spin" />
    </div>
  );

  return (
    <div className="flex h-screen bg-[#080808] text-white overflow-hidden">
      <style>{`
        @keyframes dbFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes dbSlide  { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <OnboardingModal />
      <CreateAutomationBox isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onCreate={handleCreate} isLoading={isCreating} />

      <DashboardSidebar user={user} onLogout={handleLogout} activeTab={activeTab} setActiveTab={setActiveTab} usage={billingUsage} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Universal header — matches workspace header exactly */}
        <WorkspaceHeader forceDashboard={true} />

        {/* ── Non-workflow tabs rendered full-height ── */}
        {activeTab === 'nodes' && (
          <div className="bb-page flex-1 overflow-y-auto">
            <NodeLibrary />
          </div>
        )}
        {activeTab === 'analytics' && (
          <div className="bb-page flex-1 overflow-y-auto px-8 py-6" style={{ animation: 'dbFadeIn 0.2s ease-out' }}>
            <div className="max-w-[1400px] mx-auto">
              <Analytics />
            </div>
          </div>
        )}
        {activeTab === 'vault' && (
          <div className="bb-page flex-1 overflow-y-auto px-8 py-6" style={{ animation: 'dbFadeIn 0.2s ease-out' }}>
            <div className="max-w-[1400px] mx-auto">
              <VaultManager />
            </div>
          </div>
        )}
        {activeTab === 'logs' && (
          <div className="bb-page flex-1 overflow-y-auto px-8 py-6" style={{ animation: 'dbFadeIn 0.2s ease-out' }}>
            <h2 className="text-[15px] font-bold text-[var(--bb-text-hi)] mb-5">Execution History</h2>
            {execLoading ? (
              <div className="flex items-center gap-2 text-[var(--bb-text-lo)] text-[13px]"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
            ) : executions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <Activity className="w-8 h-8 text-[var(--bb-text-dim)] mb-3" />
                <p className="text-[13px] text-[var(--bb-text-lo)]">No executions yet.</p>
              </div>
            ) : (
              <div className="bb-panel overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-white/[0.02] border-b bb-divider">
                      <th className="text-left px-4 py-3 bb-eyebrow">Workflow</th>
                      <th className="text-left px-4 py-3 bb-eyebrow">Status</th>
                      <th className="text-left px-4 py-3 bb-eyebrow">Started</th>
                      <th className="text-left px-4 py-3 bb-eyebrow">Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {executions.map((ex, i) => {
                      const dur = ex.completedAt && ex.startedAt
                        ? `${((new Date(ex.completedAt) - new Date(ex.startedAt)) / 1000).toFixed(1)}s`
                        : '—';
                      return (
                        <tr key={ex._id || i} className="border-t bb-divider hover:bg-white/[0.015] transition-colors">
                          <td className="px-4 py-3 text-[12px] text-[var(--bb-text-mid)] truncate max-w-[260px]">{ex.automationName || ex.automationId || '—'}</td>
                          <td className="px-4 py-3">
                            <span className={`text-[11px] font-medium ${ex.status === 'completed' || ex.status === 'executed' ? 'text-emerald-400' : ex.status === 'failed' ? 'text-red-400' : 'text-amber-400'}`}>
                              {ex.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-[11px] text-[var(--bb-text-dim)]">{timeAgo(ex.startedAt || ex.createdAt)}</td>
                          <td className="px-4 py-3 text-[11px] text-[var(--bb-text-dim)] font-mono">{dur}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        {activeTab === 'usage' && (
          <div className="bb-page flex-1 overflow-y-auto px-8 py-6" style={{ animation: 'dbFadeIn 0.2s ease-out' }}>
            <div className="max-w-[760px]">
              <UsagePage usage={billingUsage} />
            </div>
          </div>
        )}
        {activeTab === 'mcp' && (
          <div className="bb-page flex-1 overflow-y-auto px-8 py-6" style={{ animation: 'dbFadeIn 0.2s ease-out' }}>
            <div className="max-w-[1000px] mx-auto">
              <ConnectMCP />
            </div>
          </div>
        )}
        {activeTab === 'settings' && (
          <div className="bb-page flex-1 overflow-y-auto px-8 py-6" style={{ animation: 'dbFadeIn 0.2s ease-out' }}>
            <div className="max-w-[640px]">
              <Settings user={user} />
            </div>
          </div>
        )}

        {/* Scrollable workflows area */}
        {activeTab === 'workflows' && (
        <main className="bb-page flex-1 overflow-y-auto">
          <div className="px-8 py-6 max-w-[1400px] mx-auto" style={{ animation: 'dbFadeIn 0.2s ease-out' }}>

            {systemError && (
              <div className="mb-5 px-3 py-2 rounded-xl border border-red-500/15 bg-red-500/5 flex items-center gap-2 text-[12px] text-red-400">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {systemError}
              </div>
            )}

            {/* Brian builder — full hero when empty, compact composer once workflows exist */}
            {!workflowsLoading && (
              <DashboardHero
                ref={heroRef}
                userName={user?.name}
                compact={workflows.length > 0}
              />
            )}

            {/* Section header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <h2 className="text-[15px] font-bold text-white tracking-tight">Workflows</h2>
                {workflows.length > 0 && (
                  <span className="bb-pill text-[11px] font-mono px-2 py-0.5">
                    {workflows.length}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {/* Status filter */}
                <div className="bb-seg flex items-center">
                  {['all', 'active', 'draft'].map(f => (
                    <button key={f} onClick={() => setStatusFilter(f)}
                      className={`bb-seg-btn px-3 py-1 text-[11px] font-medium ${statusFilter === f ? 'is-active' : ''}`}>
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--bb-text-dim)]" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
                    className="bb-input pl-7 pr-3 py-[5px] text-[11px] w-[140px]" />
                </div>

                {/* View toggle */}
                <div className="bb-seg flex items-center">
                  <button onClick={() => setViewMode('grid')} title="Grid view"
                    className={`bb-seg-btn p-1.5 ${viewMode === 'grid' ? 'is-active' : ''}`}>
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setViewMode('list')} title="List view"
                    className={`bb-seg-btn p-1.5 ${viewMode === 'list' ? 'is-active' : ''}`}>
                    <List className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* New workflow */}
                <button onClick={() => setIsModalOpen(true)}
                  className="bb-btn bb-btn-primary flex items-center gap-1.5 px-3.5 py-[6px] text-[12px] shrink-0">
                  <Plus className="w-3.5 h-3.5" /> New workflow
                </button>
              </div>
            </div>

            {/* Content */}
            {workflowsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bb-card h-[210px] animate-pulse" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState onDeploy={() => setIsModalOpen(true)} isSearch={!!(search || statusFilter !== 'all')} onPickTemplate={(p) => heroRef.current?.run(p)} />

            ) : viewMode === 'list' ? (
              /* ── LIST VIEW ── */
              <div className="bb-panel overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bb-divider" style={{ background: 'var(--bb-surface-0)' }}>
                      <th className="w-10" />
                      <th className="text-left px-4 py-3 bb-eyebrow">Name</th>
                      <th className="text-left px-4 py-3 bb-eyebrow">Status</th>
                      <th className="text-left px-4 py-3 bb-eyebrow">Trigger</th>
                      <th className="text-left px-4 py-3 bb-eyebrow">Updated</th>
                      <th className="text-left px-4 py-3 bb-eyebrow">Team</th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((wf, i) => (
                      <tr key={wf._id || wf.id} onClick={() => navigate(`/workspace/${wf._id || wf.id}`)}
                        className="bb-rise group border-t bb-divider hover:bg-white/[0.02] cursor-pointer transition-colors"
                        style={{ '--bb-i': Math.min(i, 12) }}>
                        <td className="pl-4 py-3">
                          <div className="w-2 h-2 rounded-full" style={{ background: TRIGGER_COLOR[wf.trigger] || '#525252' }} />
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-[13px] font-medium text-neutral-300 group-hover:text-white truncate max-w-[260px]">{wf.name}</p>
                          {wf.description && <p className="text-[11px] text-[var(--bb-text-dim)] truncate max-w-[260px] mt-0.5">{wf.description}</p>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${wf.status === 'active' ? 'text-emerald-400' : 'text-neutral-700'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${wf.status === 'active' ? 'bg-emerald-500' : 'bg-[#2a2a2a]'}`} />
                            {wf.status === 'active' ? 'Active' : 'Draft'}
                          </span>
                        </td>
                        <td className="px-4 py-3"><TriggerBadge trigger={wf.trigger || 'manual'} /></td>
                        <td className="px-4 py-3 text-[11px] text-[var(--bb-text-dim)]">{timeAgo(wf.updatedAt)}</td>
                        <td className="px-4 py-3"><CollabAvatarStack collaborators={wf.collaborators || []} /></td>
                        <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                          <button onClick={e => openMenu(e, wf._id || wf.id)}
                            className="p-1 text-neutral-800 hover:text-neutral-500 rounded opacity-0 group-hover:opacity-100 transition-all">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                          {openMenuId === (wf._id || wf.id) && (
                            <ActionMenu wf={wf} anchorRect={menuAnchor} onDelete={handleDelete} onDuplicate={handleDuplicate} onRename={handleRename} onToggleActive={handleToggleActive} onClose={closeMenu} />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            ) : (
              /* ── GRID VIEW — 3 columns with canvas thumbnails ── */
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4" style={{ animation: 'dbFadeIn 0.15s ease-out' }}>
                {filtered.map((wf, i) => {
                  const accentColor = TRIGGER_COLOR[wf.trigger] || '#525252';
                  const isActive = wf.status === 'active';
                  const wfId = wf._id || wf.id;
                  return (
                    <div key={wfId} onClick={() => navigate(`/workspace/${wfId}`)}
                      className="bb-card bb-card-hover bb-rise group relative flex flex-col cursor-pointer overflow-hidden"
                      style={{ '--bb-i': Math.min(i, 10) }}>

                      {/* Trigger-accent wash on hover */}
                      <div className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                        style={{ background: `linear-gradient(90deg, transparent, ${accentColor}66, transparent)` }} />

                      {/* Canvas thumbnail */}
                      <div className="p-3 pb-2">
                        <WorkflowPreview
                          nodeCount={wf.nodeCount}
                          trigger={wf.trigger}
                          accentColor={accentColor}
                          lastRunStatus={wf.lastRunStatus}
                        />
                      </div>

                      {/* Name + status + menu */}
                      <div className="flex items-start justify-between px-4 pt-1 pb-1">
                        <div className="flex-1 min-w-0 pr-2">
                          <h3 className="text-[13px] font-semibold text-neutral-200 group-hover:text-white truncate leading-snug">{wf.name}</h3>
                          {wf.description && (
                            <p className="text-[11px] text-[var(--bb-text-dim)] mt-0.5 truncate">{wf.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0 mt-0.5">
                          <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                            isActive ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/[0.08]' : 'text-[var(--bb-text-dim)] border-[var(--bb-border-subtle)]'
                          }`}>
                            {isActive ? 'Active' : 'Draft'}
                          </span>
                          <button onClick={e => openMenu(e, wfId)}
                            className={`p-1 rounded-md text-[var(--bb-text-dim)] hover:text-neutral-400 hover:bg-white/[0.04] transition-all ${openMenuId === wfId ? 'opacity-100 text-neutral-400' : 'opacity-0 group-hover:opacity-100'}`}>
                            <MoreHorizontal className="w-3.5 h-3.5" />
                          </button>
                          {openMenuId === wfId && (
                            <ActionMenu wf={wf} anchorRect={menuAnchor} onDelete={handleDelete} onDuplicate={handleDuplicate} onRename={handleRename} onToggleActive={handleToggleActive} onClose={closeMenu} />
                          )}
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between px-4 pb-3 pt-1.5">
                        <div className="flex items-center gap-2">
                          {isActive
                            ? <span className="flex items-center gap-1.5 text-[10px] text-emerald-500"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />live</span>
                            : <span className="flex items-center gap-1.5 text-[10px] text-[var(--bb-text-dim)]"><span className="w-1.5 h-1.5 rounded-full bg-[var(--bb-border)]" />draft</span>
                          }
                          <span className="text-[var(--bb-border-subtle)]">·</span>
                          <TriggerBadge trigger={wf.trigger || 'manual'} />
                          {wf.nodeCount > 0 && (
                            <span className="text-[10px] text-[var(--bb-text-dim)] font-mono">{wf.nodeCount}n</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <CollabAvatarStack collaborators={wf.collaborators || []} />
                          <span className="text-[10px] text-[var(--bb-text-dim)]">{timeAgo(wf.updatedAt)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-8">
                <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}
                  className="bb-btn bb-btn-ghost flex items-center gap-1.5 px-3 py-1.5 text-[11px] disabled:opacity-30">
                  <ChevronLeft className="w-3 h-3" /> Prev
                </button>
                <span className="text-[11px] text-[var(--bb-text-lo)] font-mono">{pagination.page} / {pagination.totalPages}</span>
                <button onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))} disabled={currentPage >= pagination.totalPages}
                  className="bb-btn bb-btn-ghost flex items-center gap-1.5 px-3 py-1.5 text-[11px] disabled:opacity-30">
                  Next <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </main>
        )}
      </div>
    </div>
  );
}
