import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
import {
  ArrowLeft, Play, Save, Loader2, Check, Clock, Keyboard,
  Power, PanelLeft, PanelBottom, Users,
} from 'lucide-react';
import useWorkspaceStore from '../../../store/workspaceStore';
import VersionHistoryPanel from './VersionHistoryPanel';
import KeyboardShortcutsPanel from '../../../components/KeyboardShortcutsPanel';
import ProfileModal from '../../../components/ProfileModal';
import CollaboratorsModal from './CollaboratorsModal';
import { getSocket } from '../../../lib/socket';
import brianLogo from '../../../assets/brian.webp';

function UserAvatarBubble({ user, size = 'sm', title, onClick, color }) {
  const sz = size === 'sm' ? 'w-7 h-7 text-[10px]' : 'w-8 h-8 text-[11px]';
  const src = user?.avatar || user?.picture;
  const base = `${sz} rounded-full shrink-0 border-2 border-neutral-950 transition-all`;
  if (src) {
    return (
      <img
        src={src} alt="" referrerPolicy="no-referrer" title={title}
        className={`${base} object-cover ${onClick ? 'cursor-pointer hover:ring-2 hover:ring-neutral-400' : ''}`}
        style={color ? { outline: `2px solid ${color}`, outlineOffset: 1 } : {}}
        onClick={onClick}
      />
    );
  }
  return (
    <div
      title={title} onClick={onClick}
      className={`${base} bg-neutral-700 flex items-center justify-center font-semibold text-neutral-200 uppercase ${onClick ? 'cursor-pointer hover:ring-2 hover:ring-neutral-400' : ''}`}
      style={color ? { outline: `2px solid ${color}`, outlineOffset: 1 } : {}}
    >
      {user?.name?.charAt(0) || '?'}
    </div>
  );
}

export default function WorkspaceHeader() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [versionPanelOpen, setVersionPanelOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [collabOpen, setCollabOpen] = useState(false);
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('blinkbox_user') || '{}'); } catch { return {}; }
  });
  const [presence, setPresence] = useState([]);

  const workflowName = useWorkspaceStore(s => s.workflowName);
  const isSaving    = useWorkspaceStore(s => s.isSaving);
  const isRunning   = useWorkspaceStore(s => s.isRunning);
  const isActive    = useWorkspaceStore(s => s.isActive);
  const isActivating= useWorkspaceStore(s => s.isActivating);
  const saveEngine  = useWorkspaceStore(s => s.saveEngine);
  const runEngine   = useWorkspaceStore(s => s.runEngine);
  const activateEngine = useWorkspaceStore(s => s.activateEngine);
  const nodes       = useWorkspaceStore(s => s.nodes);
  const liveExec    = useWorkspaceStore(s => s.liveExecutionState);
  const panels      = useWorkspaceStore(s => s.panels);
  const togglePanel = useWorkspaceStore(s => s.togglePanel);
  const isBrianOpen = useWorkspaceStore(s => s.isBrianOpen);
  const setBrianOpen= useWorkspaceStore(s => s.setBrianOpen);

  const nodeCount = nodes.length;
  const executionStatus = liveExec?.status || (isRunning ? 'running' : 'idle');

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const h = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); saveEngine(id); }
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); runEngine(id); }
      if (e.key === '?' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const tag = document.activeElement?.tagName?.toLowerCase();
        if (tag !== 'input' && tag !== 'textarea' && !document.activeElement?.isContentEditable)
          setShortcutsOpen(v => !v);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [id, saveEngine, runEngine]);

  // ── Collab presence ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;

    const socket = getSocket();

    // Snapshot user at effect-run time (stable for the lifetime of this room)
    const myId   = user?.id   || user?._id || '';
    const myName = user?.name || 'Anonymous';
    const myAvatar = user?.avatar || user?.picture || '';

    const join = () => {
      socket.emit('collab:join', { automationId: id, name: myName, avatar: myAvatar });
    };

    const onPresence = (members) => {
      // Filter self out (compare as strings to handle ObjectId vs string mismatches)
      setPresence(members.filter(m => String(m.userId) !== String(myId)));
    };

    // Re-join after server restarts / reconnects
    socket.on('connect', join);
    socket.on('collab:presence', onPresence);

    // Join immediately if already connected
    if (socket.connected) join();

    return () => {
      socket.emit('collab:leave', { automationId: id });
      socket.off('connect', join);
      socket.off('collab:presence', onPresence);
    };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleProfileUpdated = useCallback((updated) => {
    setUser(prev => ({ ...prev, ...updated }));
  }, []);

  const statusColor =
    executionStatus === 'failed'   ? 'bg-red-500/5 border-red-500/20 text-red-400' :
    executionStatus === 'executed' ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' :
    executionStatus === 'running'  ? 'bg-blue-500/5 border-blue-500/20 text-blue-400' :
    'bg-neutral-900/50 border-[#333] text-neutral-500';

  const panelToggles = [
    { key: 'leftSidebar', title: 'Left sidebar', active: panels.leftSidebar, onClick: () => togglePanel('leftSidebar'), icon: <PanelLeft className="w-3.5 h-3.5" /> },
    { key: 'bottomChat',  title: 'Chat + Tree',  active: panels.bottomChat,  onClick: () => togglePanel('bottomChat'),  icon: <PanelBottom className="w-3.5 h-3.5" /> },
    { key: 'brian', title: 'Brian AI', active: isBrianOpen, onClick: () => setBrianOpen(!isBrianOpen), icon: <img src={brianLogo} alt="Brian" className="w-3.5 h-3.5 object-contain" /> },
  ];

  return (
    <>
    {/* 3-column grid via inline style — guaranteed regardless of Tailwind JIT scan */}
    <div
      style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center' }}
      className="w-full h-14 bg-neutral-950 border-b border-[#333] z-50 px-4 shrink-0"
    >

      {/* ── LEFT: breadcrumb ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 min-w-0">
        <button onClick={() => navigate('/dashboard')} title="Dashboard" className="p-1.5 text-neutral-500 hover:text-neutral-200 hover:bg-white/[0.05] rounded-lg transition-colors shrink-0">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="w-px h-4 bg-[#333]" />
        <nav className="flex items-center gap-1.5 text-xs min-w-0">
          <button onClick={() => navigate('/dashboard')} className="text-neutral-500 hover:text-neutral-300 transition-colors shrink-0">Workflows</button>
          <span className="text-neutral-700">/</span>
          <span className="text-neutral-200 font-medium tracking-tight truncate max-w-[180px]" title={workflowName}>{workflowName}</span>
        </nav>
      </div>

      {/* ── CENTER: panel toggles (truly centered via grid) ──────────────── */}
      <div className="flex items-center gap-0.5 bg-neutral-900 border border-[#333] rounded-lg p-1">
        {panelToggles.map(({ key, title, active, onClick, icon }) => (
          <button key={key} onClick={onClick} title={title}
            className={`p-1.5 rounded-md transition-all ${active ? 'bg-white/10 text-white' : 'text-neutral-600 hover:text-neutral-300 hover:bg-white/[0.05]'}`}
          >{icon}</button>
        ))}
      </div>

      {/* ── RIGHT: status, actions, collab, profile ───────────────────────── */}
      <div className="flex items-center gap-2 justify-end">

        {/* Live presence (other editors) */}
        {presence.length > 0 && (
          <div className="flex items-center -space-x-1.5 mr-1">
            {presence.slice(0, 4).map(p => (
              <UserAvatarBubble key={p.userId} user={{ name: p.name, avatar: p.avatar }} title={`${p.name} is editing`} color={p.color} />
            ))}
            {presence.length > 4 && (
              <div className="w-7 h-7 rounded-full bg-neutral-800 border-2 border-neutral-950 flex items-center justify-center text-[9px] font-semibold text-neutral-500">
                +{presence.length - 4}
              </div>
            )}
          </div>
        )}

        {/* Share */}
        <button onClick={() => setCollabOpen(true)} title="Manage collaborators"
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-neutral-900 hover:bg-white/[0.05] border border-[#333] rounded-lg text-[11px] font-semibold text-neutral-500 hover:text-neutral-200 transition-colors">
          <Users className="w-3.5 h-3.5" />
          Share
        </button>

        <div className="w-px h-4 bg-[#333]" />

        {/* Execution status badge */}
        <div className={`flex items-center gap-1.5 px-2.5 py-1.5 border rounded-lg transition-colors ${statusColor}`}>
          {executionStatus === 'running'  && <Loader2 className="w-3 h-3 animate-spin" />}
          {executionStatus === 'executed' && <Check className="w-3 h-3" />}
          <span className="text-[11px] font-semibold uppercase tracking-widest">
            {executionStatus === 'executed' ? 'Success' : executionStatus === 'running' ? 'Running' : executionStatus === 'failed' ? 'Failed' : 'Idle'}
          </span>
        </div>

        {/* History */}
        <button onClick={() => setVersionPanelOpen(true)} title="Version history"
          className="p-1.5 text-neutral-600 hover:text-neutral-300 hover:bg-white/[0.05] rounded-lg transition-colors">
          <Clock className="w-3.5 h-3.5" />
        </button>

        {/* Shortcuts */}
        <button onClick={() => setShortcutsOpen(true)} title="Keyboard shortcuts (?)"
          className="p-1.5 text-neutral-600 hover:text-neutral-300 hover:bg-white/[0.05] rounded-lg transition-colors">
          <Keyboard className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-4 bg-[#333]" />

        {/* Save */}
        <button onClick={() => saveEngine(id)} disabled={isSaving} title="Save (Cmd+S)"
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-neutral-900 hover:bg-white/[0.05] border border-[#333] rounded-lg text-[11px] font-semibold text-neutral-400 hover:text-neutral-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
          {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Save
        </button>

        {/* Activate */}
        <button onClick={() => activateEngine(id)} disabled={isActivating || nodeCount === 0}
          title={isActive ? 'Deactivate trigger' : 'Activate — go live'}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
            isActive ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20' : 'bg-neutral-900 border-[#333] text-neutral-400 hover:bg-white/[0.05] hover:text-neutral-100'
          }`}>
          {isActivating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Power className="w-3.5 h-3.5" />}
          {isActive ? 'Active' : 'Activate'}
        </button>

        {/* Run */}
        <button onClick={() => runEngine(id)} disabled={isRunning || nodeCount === 0} title="Run (Cmd+Enter)"
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white hover:bg-neutral-100 text-neutral-950 rounded-lg text-[11px] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
          {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
          Run
        </button>

        <div className="w-px h-4 bg-[#333]" />

        {/* Profile avatar */}
        <UserAvatarBubble user={user} title={`${user?.name || 'Profile'} — click to edit`} onClick={() => setProfileOpen(true)} />
      </div>
    </div>

    <VersionHistoryPanel automationId={id} isOpen={versionPanelOpen} onClose={() => setVersionPanelOpen(false)} />
    <KeyboardShortcutsPanel isOpen={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    <ProfileModal user={user} isOpen={profileOpen} onClose={() => setProfileOpen(false)} onUpdated={handleProfileUpdated} />
    <CollaboratorsModal automationId={id} isOpen={collabOpen} onClose={() => setCollabOpen(false)} />
    </>
  );
}
