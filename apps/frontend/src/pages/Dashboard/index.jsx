import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  MoreHorizontal, Clock, AlertTriangle, ChevronLeft, ChevronRight,
  Copy, Trash2, Pencil, Check, X, Loader2, Globe, Bot, Webhook,
  GitBranch, Search as SearchIcon, Timer, Database,
  Zap, Activity, Power, ExternalLink, Play,
} from 'lucide-react';
import api from '../../lib/api';

import GlobalHeader from '../../components/GlobalHeader';
import DashboardSidebar from './components/DashboardSidebar';
import DashboardHeader from './components/DashboardHeader';
import EmptyState from './components/EmptyState';
import CreateModal from './components/CreateModal';
import VaultManager from './components/VaultManager';

// ─── Templates ─────────────────────────────────────────────────────────────
// Each template defines display info + the actual nodes/edges to pre-save.
// Node format matches backend: { id, type, description, data, position }
// Edge format: { id, source, target, type: 'onSuccess', conditionPath: '' }

const TEMPLATES = [
  {
    id: 'lead-enrichment',
    name: 'Lead Enrichment Pipeline',
    desc: 'Webhook receives lead data, AI agent enriches it, pushes to Slack.',
    nodes: ['webhook', 'ai_agent', 'slack'],
    category: 'Sales',
    scaffold: {
      nodes: [
        { id: 'n1', type: 'webhook', description: 'Webhook Trigger', data: { isActive: true }, position: { x: 100, y: 300 } },
        { id: 'n2', type: 'ai_agent', description: 'Enrich Lead', data: { prompt: 'Enrich this lead data and return a JSON summary: {{n1.body}}' }, position: { x: 400, y: 300 } },
        { id: 'n3', type: 'slack', description: 'Notify Sales', data: { message: 'New lead enriched: {{n2.response}}' }, position: { x: 700, y: 300 } },
      ],
      edges: [
        { id: 'e1-2', source: 'n1', target: 'n2', type: 'onSuccess', conditionPath: '' },
        { id: 'e2-3', source: 'n2', target: 'n3', type: 'onSuccess', conditionPath: '' },
      ],
      entryNodeId: 'n1',
    },
  },
  {
    id: 'price-monitor',
    name: 'Competitor Price Monitor',
    desc: 'Scrape competitor pricing page, AI detects changes, alert via Slack.',
    nodes: ['manual', 'web_scraper', 'ai_agent', 'slack'],
    category: 'Research',
    scaffold: {
      nodes: [
        { id: 'n1', type: 'manual', description: 'Manual Trigger', data: {}, position: { x: 100, y: 300 } },
        { id: 'n2', type: 'web_scraper', description: 'Scrape Prices', data: { source: 'https://competitor.com/pricing', particularThing: 'Find all pricing tiers and features' }, position: { x: 400, y: 300 } },
        { id: 'n3', type: 'ai_agent', description: 'Analyze Changes', data: { prompt: 'Compare these pricing details to standard market rates and highlight anomalies:\n{{n2.content}}' }, position: { x: 700, y: 300 } },
        { id: 'n4', type: 'slack', description: 'Alert Team', data: { message: 'Price update: {{n3.response}}' }, position: { x: 1000, y: 300 } },
      ],
      edges: [
        { id: 'e1-2', source: 'n1', target: 'n2', type: 'onSuccess', conditionPath: '' },
        { id: 'e2-3', source: 'n2', target: 'n3', type: 'onSuccess', conditionPath: '' },
        { id: 'e3-4', source: 'n3', target: 'n4', type: 'onSuccess', conditionPath: '' },
      ],
      entryNodeId: 'n1',
    },
  },
  {
    id: 'form-to-api',
    name: 'Form Submission Handler',
    desc: 'Webhook captures form data, data mapper transforms fields, HTTP posts to your API.',
    nodes: ['webhook', 'data_mapper', 'http_request'],
    category: 'Data',
    scaffold: {
      nodes: [
        { id: 'n1', type: 'webhook', description: 'Form Webhook', data: { isActive: true }, position: { x: 100, y: 300 } },
        { id: 'n2', type: 'data_mapper', description: 'Map Fields', data: { mode: 'set', items: [{ key1: 'name', key2: '{{n1.body.name}}' }, { key1: 'email', key2: '{{n1.body.email}}' }] }, position: { x: 400, y: 300 } },
        { id: 'n3', type: 'http_request', description: 'Submit to API', data: { method: 'POST', url: 'https://api.example.com/submissions' }, position: { x: 700, y: 300 } },
      ],
      edges: [
        { id: 'e1-2', source: 'n1', target: 'n2', type: 'onSuccess', conditionPath: '' },
        { id: 'e2-3', source: 'n2', target: 'n3', type: 'onSuccess', conditionPath: '' },
      ],
      entryNodeId: 'n1',
    },
  },
  {
    id: 'daily-digest',
    name: 'Daily AI Summary',
    desc: 'Fetch metrics from an API, AI summarizes them, posts digest to Discord.',
    nodes: ['manual', 'http_request', 'ai_agent', 'discord'],
    category: 'Reporting',
    scaffold: {
      nodes: [
        { id: 'n1', type: 'manual', description: 'Run Report', data: {}, position: { x: 100, y: 300 } },
        { id: 'n2', type: 'http_request', description: 'Fetch Metrics', data: { method: 'GET', url: 'https://api.example.com/metrics' }, position: { x: 400, y: 300 } },
        { id: 'n3', type: 'ai_agent', description: 'Summarize', data: { prompt: 'Write a concise daily digest from these metrics:\n{{n2.data}}' }, position: { x: 700, y: 300 } },
        { id: 'n4', type: 'discord', description: 'Post Digest', data: { message: '{{n3.response}}' }, position: { x: 1000, y: 300 } },
      ],
      edges: [
        { id: 'e1-2', source: 'n1', target: 'n2', type: 'onSuccess', conditionPath: '' },
        { id: 'e2-3', source: 'n2', target: 'n3', type: 'onSuccess', conditionPath: '' },
        { id: 'e3-4', source: 'n3', target: 'n4', type: 'onSuccess', conditionPath: '' },
      ],
      entryNodeId: 'n1',
    },
  },
  {
    id: 'content-pipeline',
    name: 'Content Research Pipeline',
    desc: 'Scrape topics, AI generates content briefs, data mapper structures the output.',
    nodes: ['manual', 'web_scraper', 'ai_agent', 'data_mapper'],
    category: 'Content',
    scaffold: {
      nodes: [
        { id: 'n1', type: 'manual', description: 'Manual Trigger', data: {}, position: { x: 100, y: 300 } },
        { id: 'n2', type: 'web_scraper', description: 'Scrape Topics', data: { source: 'https://trends.example.com', particularThing: 'trending topics and summaries' }, position: { x: 400, y: 300 } },
        { id: 'n3', type: 'ai_agent', description: 'Generate Brief', data: { prompt: 'Write a content brief for this topic:\n{{n2.content}}' }, position: { x: 700, y: 300 } },
        { id: 'n4', type: 'data_mapper', description: 'Structure Output', data: { mode: 'set', items: [{ key1: 'title', key2: '{{n2.title}}' }, { key1: 'brief', key2: '{{n3.response}}' }] }, position: { x: 1000, y: 300 } },
      ],
      edges: [
        { id: 'e1-2', source: 'n1', target: 'n2', type: 'onSuccess', conditionPath: '' },
        { id: 'e2-3', source: 'n2', target: 'n3', type: 'onSuccess', conditionPath: '' },
        { id: 'e3-4', source: 'n3', target: 'n4', type: 'onSuccess', conditionPath: '' },
      ],
      entryNodeId: 'n1',
    },
  },
];

const NODE_ICONS = {
  webhook: Webhook, cron_trigger: Timer, manual: Zap, http_request: Globe,
  ai_agent: Bot, web_scraper: SearchIcon, logic_router: GitBranch,
  data_mapper: Database, delay: Timer, loop: Zap, code: Zap,
  slack: Webhook, discord: Webhook, stripe: Globe,
};

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
function ActionMenu({ wf, onDelete, onDuplicate, onRename, onClose }) {
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
      <div ref={ref} className="absolute right-0 top-full mt-1 z-40 w-56 bg-[#111] border border-zinc-700 rounded-lg shadow-2xl p-2" onClick={(e) => e.stopPropagation()}>
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
      <div ref={ref} className="absolute right-0 top-full mt-1 z-40 w-56 bg-[#111] border border-zinc-700 rounded-lg shadow-2xl p-3" onClick={(e) => e.stopPropagation()}>
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

  return (
    <div ref={ref} className="absolute right-0 top-full mt-1 z-40 w-44 bg-[#111] border border-zinc-700 rounded-lg shadow-2xl py-1" onClick={(e) => e.stopPropagation()}>
      <button onClick={() => setMode('rename')} className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-neutral-400 hover:text-white hover:bg-white/[0.04] transition-colors"><Pencil className="w-3.5 h-3.5" /> Rename</button>
      <button onClick={() => exec(onDuplicate, wf._id || wf.id)} disabled={busy} className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-neutral-400 hover:text-white hover:bg-white/[0.04] transition-colors disabled:opacity-50">
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Copy className="w-3.5 h-3.5" />} Duplicate
      </button>
      <div className="border-t border-zinc-700/60 my-1" />
      <button onClick={() => setMode('confirmDelete')} className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-red-400/80 hover:text-red-400 hover:bg-red-500/[0.05] transition-colors"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
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
        const r = await api.get('/api/automation', { params: { page: currentPage, limit: 20 } });
        setWorkflows(r.data?.automations || []);
        setPagination(r.data?.pagination || null);
      } catch { setSystemError('Failed to load workflows.'); }
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

  const handleCreateTemplate = async (t) => {
    setIsCreating(true);
    try {
      // 1. Create the automation record
      const triggerType = t.scaffold.nodes[0]?.type || 'manual';
      const r = await api.post('/api/automation', { name: t.name, description: t.desc, trigger: triggerType });
      if (!r.data?.success) { setIsCreating(false); return; }
      const id = r.data.automation._id;

      // 2. Immediately save the pre-built scaffold nodes + edges
      await api.put(`/api/automation/${id}`, {
        entryNodeId: t.scaffold.entryNodeId,
        nodes: t.scaffold.nodes,
        edges: t.scaffold.edges,
      });

      setWorkflows([{ ...r.data.automation, name: t.name }, ...workflows]);
      navigate(`/workspace/${id}`);
    } catch {}
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
        await api.put(`/api/automation/${id}`, { status: 'draft', active: false });
        setWorkflows(workflows.map((w) => (w._id || w.id) === id ? { ...w, status: 'draft', active: false } : w));
      } else {
        await api.post(`/api/automation/${id}/activate`);
        setWorkflows(workflows.map((w) => (w._id || w.id) === id ? { ...w, status: 'active', active: true } : w));
      }
    } catch {}
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

      <CreateModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreate}
        onCreateTemplate={(templateId) => {
          const t = TEMPLATES.find((t) => t.id === templateId);
          if (t) handleCreateTemplate(t);
        }}
        isLoading={isCreating}
      />
      <DashboardSidebar user={user} onLogout={handleLogout} activeTab={activeTab} setActiveTab={setActiveTab} usage={billingUsage} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <GlobalHeader user={user} />
        <main className="flex-1 overflow-y-auto bg-[#333333]">
        <div className="p-8 max-w-[1100px] mx-auto">

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

              {filtered.length === 0 ? (
                <EmptyState onDeploy={() => setIsModalOpen(true)} isSearch={!!(search || statusFilter !== 'all')} />
              ) : viewMode === 'list' ? (
                /* ── LIST VIEW ── */
                <div className="border border-zinc-800/80 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-zinc-900/50">
                        <th className="w-10" />
                        <th className="text-left px-4 py-2 text-[10px] font-medium text-neutral-600 uppercase tracking-wider">Name</th>
                        <th className="text-left px-4 py-2 text-[10px] font-medium text-neutral-600 uppercase tracking-wider">Status</th>
                        <th className="text-left px-4 py-2 text-[10px] font-medium text-neutral-600 uppercase tracking-wider">Trigger</th>
                        <th className="text-left px-4 py-2 text-[10px] font-medium text-neutral-600 uppercase tracking-wider">Updated</th>
                        <th className="w-10" />
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((wf, i) => (
                        <tr
                          key={wf._id || wf.id}
                          onClick={() => navigate(`/workspace/${wf._id || wf.id}`)}
                          className="group border-t border-zinc-800/50 hover:bg-white/[0.015] cursor-pointer transition-colors"
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
                            <p className="text-[13px] font-medium text-neutral-200 group-hover:text-white truncate max-w-[280px]">{wf.name}</p>
                            {wf.description && <p className="text-[11px] text-neutral-700 truncate max-w-[280px] mt-0.5">{wf.description}</p>}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${wf.status === 'active' ? 'text-emerald-400' : 'text-neutral-600'}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${wf.status === 'active' ? 'bg-emerald-500' : 'bg-neutral-700'}`} />
                              {wf.status === 'active' ? 'Active' : 'Draft'}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-[11px] text-neutral-600 capitalize">{wf.trigger || 'manual'}</td>
                          <td className="px-4 py-2.5 text-[11px] text-neutral-700">{timeAgo(wf.updatedAt)}</td>
                          <td className="px-3 py-2.5 relative" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => setOpenMenuId(openMenuId === (wf._id || wf.id) ? null : (wf._id || wf.id))}
                              className="p-1 text-neutral-700 hover:text-neutral-400 rounded opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                            {openMenuId === (wf._id || wf.id) && (
                              <ActionMenu wf={wf} onDelete={handleDelete} onDuplicate={handleDuplicate} onRename={handleRename} onClose={() => setOpenMenuId(null)} />
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
                      className="group relative flex flex-col p-4 rounded-lg border border-zinc-800/80 bg-zinc-900/50 hover:border-zinc-700 cursor-pointer transition-all duration-150"
                      style={{ animation: `dbSlide 0.15s ease-out ${i * 0.025}s both` }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          {/* Toggle */}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleToggleActive(wf); }}
                            className={`w-7 h-4 rounded-full relative transition-colors duration-200 shrink-0 ${wf.status === 'active' ? 'bg-emerald-500' : 'bg-neutral-800'}`}
                          >
                            <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all duration-200 ${wf.status === 'active' ? 'left-3.5' : 'left-0.5'}`} />
                          </button>
                          <h3 className="text-[13px] font-medium text-neutral-200 group-hover:text-white truncate">{wf.name}</h3>
                        </div>
                        <div className="relative shrink-0 ml-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === (wf._id || wf.id) ? null : (wf._id || wf.id)); }}
                            className="p-1 text-neutral-700 hover:text-neutral-400 rounded opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                          {openMenuId === (wf._id || wf.id) && (
                            <ActionMenu wf={wf} onDelete={handleDelete} onDuplicate={handleDuplicate} onRename={handleRename} onClose={() => setOpenMenuId(null)} />
                          )}
                        </div>
                      </div>
                      <p className="text-[11px] text-neutral-600 mb-auto line-clamp-2 min-h-[2rem]">{wf.description || 'No description'}</p>
                      <div className="flex items-center justify-between text-[10px] text-neutral-700 pt-3 mt-3 border-t border-zinc-800/60">
                        <span className="capitalize">{wf.trigger || 'manual'}</span>
                        <span>{timeAgo(wf.updatedAt)}</span>
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

          {/* ═══ TEMPLATES ═══ */}
          {activeTab === 'templates' && (
            <div style={{ animation: 'dbFadeIn 0.15s ease-out' }}>
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-white">Templates</h2>
                <p className="text-xs text-neutral-600 mt-0.5">Start from a pre-built workflow pattern.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {TEMPLATES.map((t, i) => (
                  <div key={t.id} className="group flex flex-col p-4 rounded-lg border border-zinc-800/80 bg-zinc-900/50 hover:border-zinc-700 transition-all duration-150" style={{ animation: `dbSlide 0.15s ease-out ${i * 0.03}s both` }}>
                    <span className="text-[10px] font-medium text-neutral-700 uppercase tracking-wider mb-2">{t.category}</span>
                    <h3 className="text-[13px] font-medium text-neutral-200 mb-1">{t.name}</h3>
                    <p className="text-[11px] text-neutral-600 mb-4 flex-1">{t.desc}</p>
                    <div className="flex items-center gap-1 mb-3">
                      {t.nodes.map((n, j) => { const I = NODE_ICONS[n] || Zap; return <div key={`${n}-${j}`} className="w-5 h-5 rounded bg-neutral-900 border border-zinc-700/60 flex items-center justify-center" title={n}><I className="w-2.5 h-2.5 text-neutral-500" /></div>; })}
                      {t.nodes.length > 1 && <span className="text-[9px] text-neutral-700 ml-1">{t.nodes.length} nodes</span>}
                    </div>
                    <button onClick={() => handleCreateTemplate(t)} disabled={isCreating} className="w-full py-1.5 text-[12px] font-medium text-neutral-500 border border-zinc-800 rounded hover:text-white hover:border-neutral-700 hover:bg-neutral-900/50 transition-all disabled:opacity-50">Use Template</button>
                  </div>
                ))}
              </div>
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
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center text-sm font-semibold text-neutral-400 uppercase">{user?.name?.charAt(0) || '?'}</div>
                  <div className="flex-1">
                    <p className="text-[13px] font-medium text-white">{user?.name}</p>
                    <p className="text-[11px] text-neutral-600">{user?.email}</p>
                  </div>
                  <span className="text-[10px] font-medium text-neutral-700 uppercase tracking-wider bg-neutral-900 border border-zinc-700/60 px-2 py-0.5 rounded">{user?.role || 'user'}</span>
                </div>
              </section>

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
