import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  MoreHorizontal, AlertTriangle, ChevronLeft, ChevronRight,
  Copy, Trash2, Pencil, Check, X, Loader2,
  Activity, Power,
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
// ─── Templates ─────────────────────────────────────────────────────────────
// Each template defines display info + the actual nodes/edges to pre-save.
// Node format matches backend: { id, type, description, data, position }
// Edge format: { id, source, target, type: 'onSuccess', conditionPath: '' }


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

  const [profileName, setProfileName] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState(null);
  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState(null);

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
    try { const p = JSON.parse(u); if (!p.id || !p.email) throw 0; setUser(p); setProfileName(p.name || ''); } catch { handleLogout(); }
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

  // Fetch execution logs — single query across all workflows
  useEffect(() => {
    if (activeTab !== 'logs') return;
    (async () => {
      setExecLoading(true);
      try {
        const res = await api.get('/api/execution/recent', { params: { limit: 50 } });
        setExecutions(res.data?.executions || []);
      } catch {}
      setExecLoading(false);
    })();
  }, [activeTab]);

  const handleBrianSubmit = async (prompt, messageHistory) => {
    try {
      const { data } = await api.post('/api/brian/chat', {
        messages: messageHistory || [{ role: 'user', content: prompt }],
      });

      if (data?.flow?.nodes?.length) {
        const triggerNode  = data.flow.nodes.find(n => n.data?.type === 'trigger');
        const workflowName = prompt.length > 60 ? prompt.slice(0, 57) + '…' : prompt;

        const created = await api.post('/api/automation', {
          name: workflowName,
          description: data.text || '',
          trigger: triggerNode?.data?.backendType || 'manual',
        });

        if (created.data?.success) {
          const wfId      = created.data.automation._id;
          const entryNode = triggerNode || data.flow.nodes[0];
          await api.put(`/api/automation/${wfId}`, {
            name:        workflowName,
            trigger:     entryNode.data?.backendType || 'manual',
            entryNodeId: entryNode.id,
            settings:    { maxParallel: 10 },
            nodes: data.flow.nodes.map(n => ({
              id:          n.id,
              type:        n.data?.backendType || 'manual',
              data:        n.data?.config || {},
              description: n.data?.label || n.data?.backendType || 'Node',
              position:    n.position || { x: 300, y: 100 },
            })),
            edges: (data.flow.edges || []).map(e => ({
              id:           e.id,
              source:       e.source,
              target:       e.target,
              sourceHandle: e.sourceHandle || null,
              targetHandle: e.targetHandle || null,
              type:         'onSuccess',
              conditionPath: '',
            })),
          });

          setWorkflows(prev => [created.data.automation, ...prev]);
          navigate(`/workspace/${wfId}`);
          return { text: data.text, navigated: true };
        }
      }

      // No flow — return text so BrianBar can show it as a chat bubble
      return { text: data?.text || '', navigated: false };
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Brian failed to respond.';
      return { text: msg, navigated: false };
    }
  };

  const handleToggleWorkers = async () => { if (!systemStats || isTogglingPause) return; setIsTogglingPause(true); try { await api.post('/api/admin/kill-switch', { active: !systemStats.status.includes('OFFLINE') }); } catch {} setIsTogglingPause(false); };

  const handleSaveProfile = async () => {
    if (!profileName.trim() || profileSaving) return;
    setProfileSaving(true); setProfileMsg(null);
    try {
      const r = await api.put('/api/profile', { name: profileName.trim() });
      const updated = { ...user, name: r.data.name };
      setUser(updated);
      localStorage.setItem('blinkbox_user', JSON.stringify(updated));
      setProfileMsg({ ok: true, text: 'Name updated.' });
    } catch (e) {
      setProfileMsg({ ok: false, text: e.response?.data?.message || 'Failed to save.' });
    } finally { setProfileSaving(false); setTimeout(() => setProfileMsg(null), 3000); }
  };

  const handleChangePassword = async () => {
    if (!pwCurrent || !pwNew || pwSaving) return;
    setPwSaving(true); setPwMsg(null);
    try {
      await api.post('/api/profile/change-password', { currentPassword: pwCurrent, newPassword: pwNew });
      setPwMsg({ ok: true, text: 'Password updated.' });
      setPwCurrent(''); setPwNew('');
    } catch (e) {
      setPwMsg({ ok: false, text: e.response?.data?.message || 'Failed to update password.' });
    } finally { setPwSaving(false); setTimeout(() => setPwMsg(null), 4000); }
  };

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
                      <tr className="bg-[#0d0d0f]">
                        <th className="w-10" />
                        <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-[#444] uppercase tracking-wider">Name</th>
                        <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-[#444] uppercase tracking-wider">Status</th>
                        <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-[#444] uppercase tracking-wider">Trigger</th>
                        <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-[#444] uppercase tracking-wider">Updated</th>
                        <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-[#444] uppercase tracking-wider">Team</th>
                        <th className="w-10" />
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((wf, i) => (
                        <tr
                          key={wf._id || wf.id}
                          onClick={() => navigate(`/workspace/${wf._id || wf.id}`)}
                          className="group border-t border-[#1a1a1c] hover:bg-white/[0.02] cursor-pointer transition-colors"
                          style={{ animation: `dbSlide 0.12s ease-out ${i * 0.02}s both` }}
                        >
                          {/* Toggle */}
                          <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleToggleActive(wf)}
                              className={`w-7 h-4 rounded-full relative transition-colors duration-200 ${wf.status === 'active' ? 'bg-emerald-500' : 'bg-neutral-800'}`}
                            >
                              <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all duration-200 ${wf.status === 'active' ? 'left-3.5' : 'left-0.5'}`} />
                            </button>
                          </td>
                          <td className="px-4 py-2.5">
                            <p className="text-[13px] font-medium text-[#ccc] group-hover:text-white truncate max-w-[280px]">{wf.name}</p>
                            {wf.description && <p className="text-[11px] text-[#444] truncate max-w-[280px] mt-0.5">{wf.description}</p>}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${wf.status === 'active' ? 'text-emerald-400' : 'text-neutral-600'}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${wf.status === 'active' ? 'bg-emerald-500' : 'bg-neutral-700'}`} />
                              {wf.status === 'active' ? 'Active' : 'Draft'}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-[11px] text-[#444] capitalize">
                            {wf.trigger || 'manual'}
                            {wf.nodeCount > 0 && <span className="ml-1.5 text-[#333]">· {wf.nodeCount}n</span>}
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
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* ── GRID VIEW ── */
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {filtered.map((wf, i) => (
                    <div
                      key={wf._id || wf.id}
                      onClick={() => navigate(`/workspace/${wf._id || wf.id}`)}
                      className="group relative flex flex-col p-4 rounded-xl border border-[#1e1e20] bg-[#0d0d0f] hover:bg-[#111113] hover:border-[#2a2a2d] cursor-pointer transition-all duration-150 overflow-visible"
                      style={{ animation: `dbSlide 0.15s ease-out ${i * 0.025}s both` }}
                    >
                      <div className="flex items-start justify-between mb-2.5">
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleToggleActive(wf); }}
                            className={`w-7 h-4 rounded-full relative transition-colors duration-200 shrink-0 ${wf.status === 'active' ? 'bg-emerald-500' : 'bg-neutral-800'}`}
                          >
                            <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all duration-200 ${wf.status === 'active' ? 'left-3.5' : 'left-0.5'}`} />
                          </button>
                          <h3 className="text-[13px] font-medium text-neutral-300 group-hover:text-white truncate">{wf.name}</h3>
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
                      <p className="text-[11px] text-[#555] mb-auto line-clamp-2 min-h-[2rem] leading-relaxed">{wf.description || 'No description'}</p>
                      <div className="flex items-center justify-between pt-3 mt-3 border-t border-[#1a1a1c]">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-[#444] capitalize">{wf.trigger || 'manual'}</span>
                          {(wf.nodeCount > 0) && (
                            <span className="text-[10px] text-[#333]">· {wf.nodeCount} node{wf.nodeCount !== 1 ? 's' : ''}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <CollabAvatarStack collaborators={wf.collaborators || []} />
                          <span className="text-[10px] text-[#444]">{timeAgo(wf.updatedAt)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
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
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-white">Execution History</h2>
                <p className="text-xs text-neutral-600 mt-0.5">Recent runs across all workflows.</p>
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
                      <th className="text-left px-4 py-2 text-[10px] font-medium text-neutral-600 uppercase tracking-wider">Duration</th>
                      <th className="text-left px-4 py-2 text-[10px] font-medium text-neutral-600 uppercase tracking-wider">When</th>
                    </tr></thead>
                    <tbody>
                      {executions.map((ex, i) => {
                        const sc = { executed: 'bg-emerald-500', completed: 'bg-emerald-500', failed: 'bg-red-500', pending: 'bg-yellow-500', cancelled: 'bg-neutral-600' };
                        const durationMs = ex.completedAt && ex.createdAt ? new Date(ex.completedAt) - new Date(ex.createdAt) : null;
                        const durationStr = durationMs === null ? '—' : durationMs < 1000 ? `${durationMs}ms` : `${(durationMs / 1000).toFixed(1)}s`;
                        return (
                          <tr
                            key={ex._id}
                            onClick={() => ex.automationId && navigate(`/workspace/${ex.automationId}`)}
                            className="border-t border-zinc-800/50 transition-colors hover:bg-white/[0.02] cursor-pointer"
                            style={{ animation: `dbSlide 0.1s ease-out ${i * 0.015}s both` }}
                          >
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-1.5">
                                <span className={`w-1.5 h-1.5 rounded-full ${sc[ex.status] || 'bg-neutral-700'}`} />
                                <span className="text-[11px] text-neutral-400 capitalize">{ex.status}</span>
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-[12px] text-neutral-300 truncate max-w-[220px]">{ex.automationName || '—'}</td>
                            <td className="px-4 py-2.5 text-[11px] text-neutral-600 capitalize">{ex.trigger || 'manual'}</td>
                            <td className="px-4 py-2.5 text-[11px] text-neutral-600 font-mono">{durationStr}</td>
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
                <h2 className="text-lg font-semibold text-white">Settings</h2>
                <p className="text-xs text-neutral-600 mt-0.5">Workspace configuration and account.</p>
              </div>

              {/* Profile */}
              <section className="mb-4 p-5 border border-zinc-800/80 rounded-lg bg-zinc-900/30">
                <h3 className="text-[10px] font-medium text-neutral-600 uppercase tracking-wider mb-4">Profile</h3>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center text-sm font-semibold text-neutral-400 uppercase shrink-0">{user?.name?.charAt(0) || '?'}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-neutral-600 mb-0.5">{user?.email}</p>
                    <span className="text-[10px] font-medium text-neutral-700 uppercase tracking-wider bg-neutral-900 border border-zinc-700/60 px-2 py-0.5 rounded">{user?.role || 'user'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Display name</label>
                    <input
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveProfile()}
                      placeholder="Your name"
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500"
                    />
                  </div>
                  <button
                    onClick={handleSaveProfile}
                    disabled={profileSaving || !profileName.trim()}
                    className="mt-5 px-4 py-2 text-[12px] font-medium bg-white/[0.06] border border-zinc-700 rounded-lg text-white hover:bg-white/[0.09] disabled:opacity-40 transition-all shrink-0"
                  >
                    {profileSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save'}
                  </button>
                </div>
                {profileMsg && (
                  <p className={`text-[11px] mt-2 ${profileMsg.ok ? 'text-emerald-400' : 'text-red-400'}`}>{profileMsg.text}</p>
                )}
              </section>

              {/* Password */}
              {user?.authProvider !== 'google' && (
                <section className="mb-4 p-5 border border-zinc-800/80 rounded-lg bg-zinc-900/30">
                  <h3 className="text-[10px] font-medium text-neutral-600 uppercase tracking-wider mb-4">Change Password</h3>
                  <div className="flex flex-col gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Current password</label>
                      <input
                        type="password"
                        value={pwCurrent}
                        onChange={(e) => setPwCurrent(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">New password</label>
                      <input
                        type="password"
                        value={pwNew}
                        onChange={(e) => setPwNew(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleChangePassword()}
                        placeholder="Min 8 characters"
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500"
                      />
                    </div>
                    <button
                      onClick={handleChangePassword}
                      disabled={pwSaving || !pwCurrent || !pwNew}
                      className="self-start px-4 py-2 text-[12px] font-medium bg-white/[0.06] border border-zinc-700 rounded-lg text-white hover:bg-white/[0.09] disabled:opacity-40 transition-all"
                    >
                      {pwSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin inline" /> : 'Update password'}
                    </button>
                    {pwMsg && (
                      <p className={`text-[11px] ${pwMsg.ok ? 'text-emerald-400' : 'text-red-400'}`}>{pwMsg.text}</p>
                    )}
                  </div>
                </section>
              )}

              {/* Usage */}
              {billingUsage && (
                <section className="mb-4 p-5 border border-zinc-800/80 rounded-lg bg-zinc-900/30">
                  <h3 className="text-[10px] font-medium text-neutral-600 uppercase tracking-wider mb-4">Plan & Usage</h3>
                  <div className="grid grid-cols-4 gap-4">
                    <div><p className="text-[10px] text-neutral-600 mb-0.5">Plan</p><p className="text-[13px] font-medium text-white capitalize">{billingUsage.plan || 'Free'}</p></div>
                    <div><p className="text-[10px] text-neutral-600 mb-0.5">Used</p><p className="text-[13px] font-medium text-white">{billingUsage.creditsUsed || 0}</p></div>
                    <div><p className="text-[10px] text-neutral-600 mb-0.5">Limit</p><p className="text-[13px] font-medium text-white">{billingUsage.monthlyLimit || 0}</p></div>
                    <div><p className="text-[10px] text-neutral-600 mb-0.5">Remaining</p><p className="text-[13px] font-medium text-white">{billingUsage.remaining || 0}</p></div>
                  </div>
                  {billingUsage.monthlyLimit > 0 && (
                    <div className="mt-4">
                      <div className="w-full bg-neutral-900 rounded-full h-1"><div className="bg-white h-1 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, billingUsage.percentUsed || 0)}%` }} /></div>
                    </div>
                  )}
                </section>
              )}

              {/* System */}
              {systemStats && (
                <section className="mb-4 p-5 border border-zinc-800/80 rounded-lg bg-zinc-900/30">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[10px] font-medium text-neutral-600 uppercase tracking-wider">System</h3>
                    <button onClick={handleToggleWorkers} disabled={isTogglingPause} className={`text-[11px] font-medium px-3 py-1 rounded border transition-all ${systemStats.status.includes('OFFLINE') ? 'text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10' : 'text-red-400 border-red-500/20 hover:bg-red-500/10'}`}>
                      {systemStats.status.includes('OFFLINE') ? 'Resume' : 'Pause'}
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div><p className="text-[10px] text-neutral-600 mb-0.5">Status</p><p className={`text-[13px] font-medium ${systemStats.status.includes('ONLINE') ? 'text-emerald-400' : 'text-red-400'}`}>{systemStats.status.includes('ONLINE') ? 'Online' : 'Offline'}</p></div>
                    <div><p className="text-[10px] text-neutral-600 mb-0.5">Uptime</p><p className="text-[13px] font-medium text-white">{systemStats.uptime}</p></div>
                    <div><p className="text-[10px] text-neutral-600 mb-0.5">Memory</p><p className="text-[13px] font-medium text-white">{systemStats.hardware?.freeMem} free</p></div>
                  </div>
                </section>
              )}

              {/* Danger */}
              <section className="p-5 border border-red-500/10 rounded-lg bg-zinc-900/30">
                <h3 className="text-[10px] font-medium text-red-400/50 uppercase tracking-wider mb-3">Danger Zone</h3>
                <div className="flex items-center justify-between">
                  <div><p className="text-[13px] text-neutral-300">End session</p><p className="text-[11px] text-neutral-700 mt-0.5">Log out of your account.</p></div>
                  <button onClick={handleLogout} className="text-[12px] font-medium text-red-400 border border-red-500/20 px-3.5 py-1.5 rounded hover:bg-red-500/10 transition-all">Log Out</button>
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
