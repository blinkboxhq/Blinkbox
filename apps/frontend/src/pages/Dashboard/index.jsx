import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  MoreHorizontal, AlertTriangle, ChevronLeft, ChevronRight,
  Copy, Trash2, Pencil, Check, X, Loader2,
  Activity, Power, Zap, Clock, Box, Layers,
} from 'lucide-react';
import api from '../../lib/api';

import GlobalHeader from '../../components/GlobalHeader';
import { NodeCardSkeleton } from '../../components/ui/Skeleton';
import OnboardingModal from '../../components/onboarding/OnboardingModal';
import DashboardSidebar from './components/DashboardSidebar';
import DashboardHeader from './components/DashboardHeader';
import EmptyState from './components/EmptyState';
import CreateAutomationBox from './components/CreateAutomationBox';
import VaultManager from './components/VaultManager';
import Analytics from './components/Analytics';
import BrianBar from './components/BrianBar';
import NodeLibrary from './components/NodeLibrary';
const TRIGGER_BADGE = {
  webhook:  'bg-blue-500/10 text-blue-400 border-blue-500/20',
  schedule: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  cron:     'bg-violet-500/10 text-violet-400 border-violet-500/20',
  http:     'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  email:    'bg-amber-500/10 text-amber-400 border-amber-500/20',
  manual:   'bg-zinc-900 text-neutral-600 border-zinc-800',
};

function StatCard({ label, value, icon: Icon, colorClass, ringClass }) {
  return (
    <div className="flex items-center gap-3 p-3.5 rounded-xl border border-[#1e1e20] bg-[#0d0d0f]">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${ringClass}`}>
        <Icon className={`w-3.5 h-3.5 ${colorClass}`} />
      </div>
      <div>
        <p className="text-[22px] font-bold text-white leading-none">{value}</p>
        <p className="text-[9px] font-semibold text-neutral-600 mt-1 uppercase tracking-wider">{label}</p>
      </div>
    </div>
  );
}

// Stacked avatars for collaborators on a card
function CollabAvatarStack({ collaborators = [] }) {
  if (!collaborators.length) return null;
  const shown = collaborators.slice(0, 3);
  return (
    <div className="flex items-center -space-x-1.5">
      {shown.map((c, i) => {
        const src = c.avatar || c.picture;
        return src ? (
          <img
            key={c.userId || i}
            src={src}
            alt={c.name}
            title={c.name}
            referrerPolicy="no-referrer"
            className="w-5 h-5 rounded-full border border-neutral-900 object-cover"
          />
        ) : (
          <div
            key={c.userId || i}
            title={c.name}
            className="w-5 h-5 rounded-full border border-neutral-900 bg-neutral-700 flex items-center justify-center text-[8px] font-semibold text-neutral-300 uppercase"
          >
            {c.name?.charAt(0) || '?'}
          </div>
        );
      })}
      {collaborators.length > 3 && (
        <div className="w-5 h-5 rounded-full border border-neutral-900 bg-neutral-800 flex items-center justify-center text-[8px] font-semibold text-neutral-500">
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

// ─── Dropdown menu ─────────────────────────────────────────────────────────
function ActionMenu({ wf, onDelete, onDuplicate, onRename, onToggleActive, onClose }) {
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

  if (mode === 'rename') {
    return (
      <div ref={ref} className="absolute right-0 bottom-full mb-1 z-40 w-56 bg-[#111] border border-zinc-700 rounded-lg shadow-2xl p-2" onClick={(e) => e.stopPropagation()}>
        <p className="text-[10px] text-neutral-500 font-medium uppercase tracking-wider px-1 mb-1.5">Rename</p>
        <div className="flex items-center gap-1.5">
          <input autoFocus value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && val.trim() && exec(onRename, wf._id || wf.id, val.trim())} className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-[12px] text-white focus:outline-none focus:border-neutral-600" />
          <button onClick={() => val.trim() && exec(onRename, wf._id || wf.id, val.trim())} disabled={busy} className="p-1 text-neutral-400 hover:text-white disabled:opacity-50"><Check className="w-3.5 h-3.5" /></button>
          <button onClick={() => setMode('menu')} className="p-1 text-neutral-600 hover:text-white"><X className="w-3.5 h-3.5" /></button>
        </div>
      </div>
    );
  }

  if (mode === 'confirmDelete') {
    return (
      <div ref={ref} className="absolute right-0 bottom-full mb-1 z-40 w-56 bg-[#111] border border-zinc-700 rounded-lg shadow-2xl p-3" onClick={(e) => e.stopPropagation()}>
        <p className="text-[12px] text-neutral-300 mb-3">Delete <strong>{wf.name}</strong>? This cannot be undone.</p>
        <div className="flex items-center gap-2 justify-end">
          <button onClick={() => setMode('menu')} className="text-[12px] text-neutral-500 hover:text-white px-2 py-1">Cancel</button>
          <button onClick={() => exec(onDelete, wf._id || wf.id)} disabled={busy} className="text-[12px] text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-1 rounded hover:bg-red-500/20 disabled:opacity-50">
            {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Delete'}
          </button>
        </div>
      </div>
    );
  }

  const isActive = wf.status === 'active';
  const btnCls = 'w-full flex items-center gap-2 px-3 py-[5px] text-neutral-400 hover:text-white hover:bg-white/[0.04] transition-colors';
  const iconSz = { width: 13, height: 13, flexShrink: 0 };

  return (
    <div ref={ref} style={{ fontSize: 12 }} className="absolute right-0 bottom-full mb-1 z-40 w-40 bg-[#111] border border-zinc-800 rounded-lg shadow-2xl py-1 overflow-hidden" onClick={(e) => e.stopPropagation()}>
      <button onClick={() => exec(onToggleActive, wf)} className={btnCls}>
        <Power style={iconSz} /> {isActive ? 'Deactivate' : 'Set Active'}
      </button>
      <div className="border-t border-zinc-800 my-1" />
      <button onClick={() => setMode('rename')} className={btnCls}>
        <Pencil style={iconSz} /> Rename
      </button>
      <button onClick={() => exec(onDuplicate, wf._id || wf.id)} disabled={busy} className={`${btnCls} disabled:opacity-40`}>
        {busy ? <Loader2 style={iconSz} className="animate-spin" /> : <Copy style={iconSz} />} Duplicate
      </button>
      <div className="border-t border-zinc-800 my-1" />
      <button onClick={() => setMode('confirmDelete')} style={{ fontSize: 12 }} className="w-full flex items-center gap-2 px-3 py-[5px] text-red-400/70 hover:text-red-400 hover:bg-red-500/[0.05] transition-colors">
        <Trash2 style={iconSz} /> Delete
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
export default function Dashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') || 'workflows');
  const [isModalOpen, setIsModalOpen] = useState(false);
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

  const [systemStats, setSystemStats] = useState(null);
  const [isTogglingPause, setIsTogglingPause] = useState(false);
  const [billingUsage, setBillingUsage] = useState(null);
  const [executions, setExecutions] = useState([]);
  const [execLoading, setExecLoading] = useState(false);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('blinkbox_token');
    localStorage.removeItem('blinkbox_user');
    delete api.defaults.headers.common['Authorization'];
    navigate('/login', { replace: true });
  }, [navigate]);

  useEffect(() => {
    const i = api.interceptors.response.use((r) => r, (e) => { if (e.response?.status === 401 || e.response?.status === 403) handleLogout(); return Promise.reject(e); });
    return () => api.interceptors.response.eject(i);
  }, [handleLogout]);

  useEffect(() => {
    const t = localStorage.getItem('blinkbox_token');
    const u = localStorage.getItem('blinkbox_user');
    if (!t || !u || u === 'undefined') { handleLogout(); return; }
    try { const p = JSON.parse(u); if (!p.id || !p.email) throw 0; setUser(p); } catch { handleLogout(); }
  }, [handleLogout]);

  // Fetch workflows
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        setSystemError(null);
        setWorkflowsLoading(true);
        const r = await api.get('/api/automation', { params: { page: currentPage, limit: 20 } });
        setWorkflows(r.data?.automations || []);
        setPagination(r.data?.pagination || null);
      } catch { setSystemError('Failed to load workflows.'); }
      finally { setWorkflowsLoading(false); }
    })();
  }, [user, currentPage]);

  // Fetch billing
  useEffect(() => {
    if (!user) return;
    (async () => { try { const r = await api.get('/api/billing/usage'); setBillingUsage(r.data); } catch {} })();
  }, [user]);

  // Fetch stats on settings tab (admin only)
  useEffect(() => {
    if (activeTab !== 'settings') return;
    const f = async () => {
      if (user?.role === 'admin') {
        try { const r = await api.get('/api/admin/stats'); setSystemStats(r.data.stats); } catch {}
      }
      try { const r = await api.get('/api/billing/usage'); setBillingUsage(r.data); } catch {}
    };
    f(); const iv = setInterval(f, 5000); return () => clearInterval(iv);
  }, [activeTab, user]);

  // Fetch execution logs
  useEffect(() => {
    if (activeTab !== 'logs' || !workflows.length) return;
    (async () => {
      setExecLoading(true);
      try {
        const all = [];
        const res = await Promise.allSettled(workflows.slice(0, 10).map((w) => api.get(`/api/execution/automation/${w._id || w.id}`)));
        for (const r of res) if (r.status === 'fulfilled') all.push(...(r.value.data?.executions || []));
        all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setExecutions(all.slice(0, 50));
      } catch {}
      setExecLoading(false);
    })();
  }, [activeTab, workflows]);

  const handleBrianSubmit = async (prompt) => {
    // TODO: POST /api/ai/chat with prompt, get back a box name/config, navigate to it
    await new Promise((r) => setTimeout(r, 1200));
    setActiveTab('workflows');
  };

  const handleToggleWorkers = async () => { if (!systemStats || isTogglingPause) return; setIsTogglingPause(true); try { await api.post('/api/admin/kill-switch', { active: !systemStats.status.includes('OFFLINE') }); } catch {} setIsTogglingPause(false); };

  const handleCreate = async (data) => {
    if (isCreating) return;
    setIsCreating(true); setSystemError(null);
    try {
      const r = await api.post('/api/automation', { name: data.name.trim(), description: data.description?.trim() || '', trigger: 'manual' });
      if (r.data?.success) { setWorkflows([r.data.automation, ...workflows]); setIsModalOpen(false); navigate(`/workspace/${r.data.automation._id}`); }
    } catch (e) { setSystemError(e.message || 'Failed.'); }
    setIsCreating(false);
  };


  const handleDelete = async (id) => { try { await api.delete(`/api/automation/${id}`); setWorkflows(workflows.filter((w) => (w._id || w.id) !== id)); } catch {} };
  const handleDuplicate = async (id) => { try { const r = await api.post(`/api/automation/${id}/duplicate`); if (r.data?.success) setWorkflows([r.data.automation, ...workflows]); } catch {} };
  const handleRename = async (id, name) => { try { const r = await api.patch(`/api/automation/${id}/rename`, { name }); if (r.data?.success) setWorkflows(workflows.map((w) => (w._id || w.id) === id ? { ...w, name } : w)); } catch {} };

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
      const msg = e.response?.data?.message || e.message || 'Failed to update status.';
      setSystemError(msg);
      setTimeout(() => setSystemError(null), 4000);
    }
  };

  // Filter
  let filtered = workflows;
  if (statusFilter !== 'all') filtered = filtered.filter((w) => (w.status || 'draft') === statusFilter);
  if (search) filtered = filtered.filter((w) => w.name.toLowerCase().includes(search.toLowerCase()));

  if (!user) return <div className="h-screen w-screen bg-neutral-950 flex items-center justify-center"><Loader2 className="w-5 h-5 text-neutral-700 animate-spin" /></div>;

  return (
    <div className="flex h-screen bg-neutral-950 text-white overflow-hidden">
      <style>{`
        @keyframes dbFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes dbScaleIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
        @keyframes dbSlide { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <OnboardingModal />

      <CreateAutomationBox
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreate}
        isLoading={isCreating}
      />
      <DashboardSidebar user={user} onLogout={handleLogout} activeTab={activeTab} setActiveTab={setActiveTab} usage={billingUsage} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <GlobalHeader user={user} />
        <main className="flex-1 overflow-y-auto bg-[#060606]">
        <div className="p-8 max-w-[1100px] mx-auto">

          <BrianBar onSubmit={handleBrianSubmit} />

          {systemError && (
            <div className="mb-5 px-3 py-2 rounded-md border border-zinc-800 bg-zinc-900 flex items-center gap-2 text-[13px] text-red-400" style={{ animation: 'dbSlide 0.15s ease-out' }}>
              <AlertTriangle className="w-4 h-4 shrink-0" /> {systemError}
            </div>
          )}

          {/* ═══ WORKFLOWS ═══ */}
          {activeTab === 'workflows' && (
            <div style={{ animation: 'dbFadeIn 0.15s ease-out' }}>
              <DashboardHeader
                onInitialize={() => setIsModalOpen(true)}
                search={search} setSearch={setSearch}
                statusFilter={statusFilter} setStatusFilter={setStatusFilter}
                viewMode={viewMode} setViewMode={setViewMode}
                total={workflows.length}
              />

              {/* Stats row */}
              {!workflowsLoading && workflows.length > 0 && (
                <div className="grid grid-cols-3 gap-3 mb-5">
                  <StatCard label="Total Boxes" value={workflows.length} icon={Layers} colorClass="text-violet-400" ringClass="bg-violet-500/10 border-violet-500/20" />
                  <StatCard label="Active" value={workflows.filter(w => w.status === 'active').length} icon={Zap} colorClass="text-emerald-400" ringClass="bg-emerald-500/10 border-emerald-500/20" />
                  <StatCard label="Drafts" value={workflows.filter(w => w.status !== 'active').length} icon={Clock} colorClass="text-neutral-500" ringClass="bg-zinc-900 border-zinc-800" />
                </div>
              )}

              {workflowsLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                  {Array.from({ length: 6 }).map((_, i) => <NodeCardSkeleton key={i} />)}
                </div>
              ) : filtered.length === 0 ? (
                <EmptyState onDeploy={() => setIsModalOpen(true)} isSearch={!!(search || statusFilter !== 'all')} />
              ) : viewMode === 'list' ? (
                /* ── LIST VIEW ── */
                <div className="border border-[#1e1e20] rounded-xl overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-[#0a0a0c]">
                        <th className="w-1" />
                        <th className="w-10" />
                        <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-[#3a3a3e] uppercase tracking-wider">Name</th>
                        <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-[#3a3a3e] uppercase tracking-wider">Status</th>
                        <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-[#3a3a3e] uppercase tracking-wider">Trigger</th>
                        <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-[#3a3a3e] uppercase tracking-wider">Updated</th>
                        <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-[#3a3a3e] uppercase tracking-wider">Team</th>
                        <th className="w-10" />
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((wf, i) => {
                        const isActive = wf.status === 'active';
                        const trigK = (wf.trigger||'manual').toLowerCase();
                        return (
                        <tr
                          key={wf._id || wf.id}
                          onClick={() => navigate(`/workspace/${wf._id || wf.id}`)}
                          className="group border-t border-[#1a1a1c] hover:bg-white/[0.025] cursor-pointer transition-colors"
                          style={{ animation: `dbSlide 0.12s ease-out ${i * 0.02}s both` }}
                        >
                          {/* Left accent */}
                          <td className="p-0 w-1">
                            <div className={`w-[3px] min-h-[42px] ${isActive ? 'bg-emerald-500' : 'bg-transparent'} rounded-r`} />
                          </td>
                          {/* Toggle */}
                          <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleToggleActive(wf)}
                              className={`w-7 h-4 rounded-full relative transition-colors duration-200 ${isActive ? 'bg-emerald-500' : 'bg-neutral-800'}`}
                            >
                              <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all duration-200 ${isActive ? 'left-3.5' : 'left-0.5'}`} />
                            </button>
                          </td>
                          <td className="px-4 py-2.5">
                            <p className="text-[13px] font-semibold text-[#ccc] group-hover:text-white truncate max-w-[280px]">{wf.name}</p>
                            {wf.description && <p className="text-[11px] text-[#444] truncate max-w-[280px] mt-0.5">{wf.description}</p>}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${isActive ? 'text-emerald-400' : 'text-neutral-600'}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-neutral-700'}`} />
                              {isActive ? 'Active' : 'Draft'}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${TRIGGER_BADGE[trigK]||TRIGGER_BADGE.manual}`}>{wf.trigger||'manual'}</span>
                          </td>
                          <td className="px-4 py-2.5 text-[11px] text-[#444]">{timeAgo(wf.updatedAt)}</td>
                          <td className="px-4 py-2.5"><CollabAvatarStack collaborators={wf.collaborators || []} /></td>
                          <td className="px-3 py-2.5 relative" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => setOpenMenuId(openMenuId === (wf._id || wf.id) ? null : (wf._id || wf.id))}
                              className="p-1 text-neutral-700 hover:text-neutral-400 rounded opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                            {openMenuId === (wf._id || wf.id) && (
                              <ActionMenu wf={wf} onDelete={handleDelete} onDuplicate={handleDuplicate} onRename={handleRename} onToggleActive={handleToggleActive} onClose={() => setOpenMenuId(null)} />
                            )}
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* ── GRID VIEW ── */
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {filtered.map((wf, i) => {
                    const isActive = wf.status === 'active';
                    const triggerKey = (wf.trigger || 'manual').toLowerCase();
                    const badgeCls = TRIGGER_BADGE[triggerKey] || TRIGGER_BADGE.manual;
                    return (
                      <div
                        key={wf._id || wf.id}
                        onClick={() => navigate(`/workspace/${wf._id || wf.id}`)}
                        className="group relative flex flex-col rounded-xl border border-[#1e1e20] bg-[#0d0d0f] hover:border-[#2e2e32] hover:bg-[#0f0f12] cursor-pointer transition-all duration-150 overflow-hidden"
                        style={{ animation: `dbSlide 0.15s ease-out ${i * 0.025}s both` }}
                      >
                        {/* Left accent strip */}
                        <div className={`absolute left-0 top-0 bottom-0 w-[3px] transition-colors duration-300 ${isActive ? 'bg-emerald-500' : 'bg-[#252528]'}`} />

                        <div className="pl-5 pr-4 pt-4 pb-4 flex flex-col h-full">
                          {/* Header: toggle + name + menu */}
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleToggleActive(wf); }}
                                className={`w-7 h-4 rounded-full relative transition-colors duration-200 shrink-0 ${isActive ? 'bg-emerald-500' : 'bg-neutral-800'}`}
                              >
                                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all duration-200 ${isActive ? 'left-3.5' : 'left-0.5'}`} />
                              </button>
                              <h3 className="text-[13px] font-semibold text-neutral-300 group-hover:text-white truncate">{wf.name}</h3>
                            </div>
                            <div className="relative shrink-0">
                              <button
                                onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === (wf._id || wf.id) ? null : (wf._id || wf.id)); }}
                                className={`p-1 text-neutral-700 hover:text-neutral-400 rounded transition-all ${openMenuId === (wf._id || wf.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                              {openMenuId === (wf._id || wf.id) && (
                                <ActionMenu wf={wf} onDelete={handleDelete} onDuplicate={handleDuplicate} onRename={handleRename} onToggleActive={handleToggleActive} onClose={() => setOpenMenuId(null)} />
                              )}
                            </div>
                          </div>

                          {/* Description */}
                          <p className="text-[11px] text-[#525258] mb-auto line-clamp-2 min-h-[2rem] leading-relaxed">{wf.description || 'No description'}</p>

                          {/* Footer */}
                          <div className="flex items-center justify-between pt-3 mt-3 border-t border-[#1a1a1c]">
                            <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${badgeCls}`}>
                              {wf.trigger || 'manual'}
                            </span>
                            <div className="flex items-center gap-2">
                              <CollabAvatarStack collaborators={wf.collaborators || []} />
                              {wf.nodes?.length > 0 && (
                                <span className="flex items-center gap-0.5 text-[10px] text-neutral-700">
                                  <Box className="w-2.5 h-2.5" />{wf.nodes.length}
                                </span>
                              )}
                              <span className="text-[10px] text-[#444]">{timeAgo(wf.updatedAt)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 mt-6">
                  <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="flex items-center gap-1 px-2.5 py-1 text-[11px] text-neutral-600 hover:text-white border border-zinc-800 rounded hover:bg-zinc-900 transition-all disabled:opacity-30"><ChevronLeft className="w-3 h-3" /> Prev</button>
                  <span className="text-[11px] text-neutral-700 font-mono">{pagination.page} / {pagination.totalPages}</span>
                  <button onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))} disabled={currentPage >= pagination.totalPages} className="flex items-center gap-1 px-2.5 py-1 text-[11px] text-neutral-600 hover:text-white border border-zinc-800 rounded hover:bg-zinc-900 transition-all disabled:opacity-30">Next <ChevronRight className="w-3 h-3" /></button>
                </div>
              )}
            </div>
          )}

          {/* ═══ EXECUTION LOGS ═══ */}
          {activeTab === 'logs' && (
            <div style={{ animation: 'dbFadeIn 0.15s ease-out' }}>
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-[15px] font-bold text-white">Execution History</h2>
                  <p className="text-[11px] text-neutral-600 mt-0.5">Recent runs across all workflows.</p>
                </div>
                {executions.length > 0 && (
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5 text-[11px] text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {executions.filter(e => ['executed','completed'].includes(e.status)).length} succeeded
                    </span>
                    <span className="flex items-center gap-1.5 text-[11px] text-red-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      {executions.filter(e => e.status === 'failed').length} failed
                    </span>
                  </div>
                )}
              </div>
              {execLoading ? (
                <div className="flex items-center justify-center py-20"><Loader2 className="w-5 h-5 text-neutral-700 animate-spin" /></div>
              ) : executions.length === 0 ? (
                <div className="flex flex-col items-center py-20 text-center">
                  <Activity className="w-8 h-8 text-neutral-800 mb-3" />
                  <p className="text-[13px] text-neutral-500">No executions yet.</p>
                  <p className="text-[11px] text-neutral-700 mt-1">Run a workflow to see history here.</p>
                </div>
              ) : (
                <div className="border border-zinc-800/80 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead><tr className="bg-zinc-900/50">
                      <th className="text-left px-4 py-2 text-[10px] font-medium text-neutral-600 uppercase tracking-wider">Status</th>
                      <th className="text-left px-4 py-2 text-[10px] font-medium text-neutral-600 uppercase tracking-wider">Workflow</th>
                      <th className="text-left px-4 py-2 text-[10px] font-medium text-neutral-600 uppercase tracking-wider">Trigger</th>
                      <th className="text-left px-4 py-2 text-[10px] font-medium text-neutral-600 uppercase tracking-wider">Nodes</th>
                      <th className="text-left px-4 py-2 text-[10px] font-medium text-neutral-600 uppercase tracking-wider">Time</th>
                    </tr></thead>
                    <tbody>
                      {executions.map((ex, i) => {
                        const sc = { executed: 'bg-emerald-500', completed: 'bg-emerald-500', failed: 'bg-red-500', pending: 'bg-yellow-500', cancelled: 'bg-neutral-600' };
                        return (
                          <tr key={ex._id} className="border-t border-zinc-800/50 hover:bg-white/[0.015] transition-colors" style={{ animation: `dbSlide 0.1s ease-out ${i * 0.015}s both` }}>
                            <td className="px-4 py-2.5"><div className="flex items-center gap-1.5"><span className={`w-1.5 h-1.5 rounded-full ${sc[ex.status] || 'bg-neutral-700'}`} /><span className="text-[11px] text-neutral-400 capitalize">{ex.status}</span></div></td>
                            <td className="px-4 py-2.5 text-[12px] text-neutral-300 truncate max-w-[220px]">{ex.name || '—'}</td>
                            <td className="px-4 py-2.5 text-[11px] text-neutral-600 capitalize">{ex.trigger || 'manual'}</td>
                            <td className="px-4 py-2.5 text-[11px] text-neutral-600">{ex.cursors?.length || 0}</td>
                            <td className="px-4 py-2.5 text-[11px] text-neutral-700">{timeAgo(ex.createdAt)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ═══ ANALYTICS ═══ */}
          {activeTab === 'analytics' && <Analytics />}

          {/* ═══ NODE LIBRARY ═══ */}
          {activeTab === 'nodes' && <NodeLibrary />}

          {/* ═══ VAULT ═══ */}
          {activeTab === 'vault' && <div style={{ animation: 'dbFadeIn 0.15s ease-out' }}><VaultManager /></div>}

          {/* ═══ SETTINGS ═══ */}
          {activeTab === 'settings' && (
            <div style={{ animation: 'dbFadeIn 0.15s ease-out' }}>
              <div className="mb-6">
                <h2 className="text-[15px] font-bold text-white">Settings</h2>
                <p className="text-[11px] text-neutral-600 mt-0.5">Workspace configuration and account.</p>
              </div>

              {/* Profile */}
              <section className="mb-4 p-5 border border-[#1e1e20] rounded-xl bg-[#0d0d0f]">
                <h3 className="text-[9px] font-bold text-neutral-600 uppercase tracking-wider mb-4">Profile</h3>
                <div className="flex items-center gap-4">
                  {user?.picture
                    ? <img src={user.picture} referrerPolicy="no-referrer" alt="" className="w-12 h-12 rounded-full object-cover border border-neutral-800" />
                    : <div className="w-12 h-12 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-[16px] font-bold text-violet-400 uppercase">{user?.name?.charAt(0) || '?'}</div>
                  }
                  <div className="flex-1">
                    <p className="text-[14px] font-semibold text-white">{user?.name}</p>
                    <p className="text-[12px] text-neutral-500 mt-0.5">{user?.email}</p>
                  </div>
                  <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-full">{user?.role || 'user'}</span>
                </div>
              </section>

              {/* Usage */}
              {billingUsage && (
                <section className="mb-4 p-5 border border-[#1e1e20] rounded-xl bg-[#0d0d0f]">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[9px] font-bold text-neutral-600 uppercase tracking-wider">Plan & Usage</h3>
                    <span className="text-[10px] font-semibold text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2.5 py-0.5 rounded-full capitalize">{billingUsage.plan || 'Free'}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    {[
                      { label: 'Used', value: billingUsage.creditsUsed || 0 },
                      { label: 'Limit', value: billingUsage.monthlyLimit || 0 },
                      { label: 'Remaining', value: billingUsage.remaining || 0 },
                    ].map(({ label, value }) => (
                      <div key={label} className="p-3 rounded-lg bg-zinc-950 border border-[#1a1a1c]">
                        <p className="text-[9px] font-semibold text-neutral-600 uppercase tracking-wider mb-1">{label}</p>
                        <p className="text-[18px] font-bold text-white leading-none">{value.toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                  {billingUsage.monthlyLimit > 0 && (
                    <>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] text-neutral-600">Credit usage</span>
                        <span className="text-[10px] text-neutral-500">{Math.min(100, billingUsage.percentUsed || 0).toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-zinc-950 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-1.5 rounded-full transition-all duration-700 ${(billingUsage.percentUsed||0) > 80 ? 'bg-red-400' : (billingUsage.percentUsed||0) > 50 ? 'bg-amber-400' : 'bg-violet-500'}`}
                          style={{ width: `${Math.min(100, billingUsage.percentUsed || 0)}%` }}
                        />
                      </div>
                    </>
                  )}
                </section>
              )}

              {/* System */}
              {systemStats && (
                <section className="mb-4 p-5 border border-[#1e1e20] rounded-xl bg-[#0d0d0f]">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[9px] font-bold text-neutral-600 uppercase tracking-wider">System</h3>
                    <button onClick={handleToggleWorkers} disabled={isTogglingPause} className={`text-[11px] font-semibold px-3 py-1 rounded-full border transition-all disabled:opacity-50 ${systemStats.status.includes('OFFLINE') ? 'text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10' : 'text-red-400 border-red-500/20 hover:bg-red-500/10'}`}>
                      {systemStats.status.includes('OFFLINE') ? 'Resume workers' : 'Pause workers'}
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Status', value: systemStats.status.includes('ONLINE') ? 'Online' : 'Offline', cls: systemStats.status.includes('ONLINE') ? 'text-emerald-400' : 'text-red-400' },
                      { label: 'Uptime', value: systemStats.uptime, cls: 'text-white' },
                      { label: 'Free Memory', value: systemStats.hardware?.freeMem, cls: 'text-white' },
                    ].map(({ label, value, cls }) => (
                      <div key={label} className="p-3 rounded-lg bg-zinc-950 border border-[#1a1a1c]">
                        <p className="text-[9px] font-semibold text-neutral-600 uppercase tracking-wider mb-1">{label}</p>
                        <p className={`text-[13px] font-semibold ${cls}`}>{value}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Danger */}
              <section className="p-5 border border-red-500/10 rounded-xl bg-red-500/[0.02]">
                <h3 className="text-[9px] font-bold text-red-400/40 uppercase tracking-wider mb-4">Danger Zone</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[13px] font-medium text-neutral-300">End session</p>
                    <p className="text-[11px] text-neutral-700 mt-0.5">Log out of your account on this device.</p>
                  </div>
                  <button onClick={handleLogout} className="text-[12px] font-semibold text-red-400 border border-red-500/20 px-4 py-1.5 rounded-lg hover:bg-red-500/10 transition-all">Log Out</button>
                </div>
              </section>
            </div>
          )}

        </div>
      </main>
      </div>
    </div>
  );
}
