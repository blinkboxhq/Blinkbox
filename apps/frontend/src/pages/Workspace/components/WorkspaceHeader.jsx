import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
import { ArrowLeft, Play, Save, Loader2, Check, Clock, Keyboard, Power, PanelLeft, PanelBottom, Users } from 'lucide-react';
import useWorkspaceStore from '../../../store/workspaceStore';
import VersionHistoryPanel from './VersionHistoryPanel';
import KeyboardShortcutsPanel from '../../../components/KeyboardShortcutsPanel';
import ProfileModal from '../../../components/ProfileModal';
import CollaboratorsModal from './CollaboratorsModal';
import { getSocket } from '../../../lib/socket';
import brianLogo from '../../../assets/brian.webp';

function UserAvatarBubble({ user, size = 'sm', title, onClick, ring }) {
  const sz = size === 'sm' ? 'w-7 h-7 text-[10px]' : 'w-8 h-8 text-[11px]';
  const ringStyle = ring ? `ring-2 ring-[${ring}]` : '';
  const src = user?.avatar || user?.picture;
  const cls = `${sz} rounded-full object-cover shrink-0 border-2 border-neutral-950 ${onClick ? 'cursor-pointer hover:ring-2 hover:ring-neutral-500 transition-all' : ''}`;
  if (src) {
    return <img src={src} alt="" className={`${cls} ${ringStyle}`} referrerPolicy="no-referrer" title={title} onClick={onClick} />;
  }
  const initials = user?.name?.charAt(0) || '?';
  return (
    <div
      className={`${sz} rounded-full bg-neutral-700 flex items-center justify-center font-semibold text-neutral-200 uppercase border-2 border-neutral-950 ${onClick ? 'cursor-pointer hover:ring-2 hover:ring-neutral-500 transition-all' : ''}`}
      title={title}
      onClick={onClick}
      style={ring ? { outline: `2px solid ${ring}`, outlineOffset: '1px' } : {}}
    >
      {initials}
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
  const [presence, setPresence] = useState([]); // other users currently editing

  const workflowName = useWorkspaceStore(state => state.workflowName);
  const isSaving = useWorkspaceStore(state => state.isSaving);
  const isRunning = useWorkspaceStore(state => state.isRunning);
  const isActive = useWorkspaceStore(state => state.isActive);
  const isActivating = useWorkspaceStore(state => state.isActivating);
  const saveEngine = useWorkspaceStore(state => state.saveEngine);
  const runEngine = useWorkspaceStore(state => state.runEngine);
  const activateEngine = useWorkspaceStore(state => state.activateEngine);
  const nodes = useWorkspaceStore(state => state.nodes);
  const liveExecutionState = useWorkspaceStore(state => state.liveExecutionState);
  const panels = useWorkspaceStore(state => state.panels);
  const togglePanel = useWorkspaceStore(state => state.togglePanel);
  const isBrianOpen = useWorkspaceStore(state => state.isBrianOpen);
  const setBrianOpen = useWorkspaceStore(state => state.setBrianOpen);

  const nodeCount = nodes.length;
  const executionStatus = liveExecutionState?.status || (isRunning ? 'running' : 'idle');

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        saveEngine(id);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        runEngine(id);
      }
      if (e.key === '?' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const tag = document.activeElement?.tagName?.toLowerCase();
        if (tag !== 'input' && tag !== 'textarea' && !document.activeElement?.isContentEditable) {
          setShortcutsOpen((v) => !v);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [id, saveEngine, runEngine]);

  // Collaborative presence — join room when workspace opens, leave on unmount
  useEffect(() => {
    if (!id) return;
    const socket = getSocket();
    const currentUser = user;

    socket.emit('collab:join', {
      automationId: id,
      name: currentUser?.name || 'Anonymous',
      avatar: currentUser?.avatar || currentUser?.picture || '',
    });

    socket.on('collab:presence', (members) => {
      // Filter out self
      setPresence(members.filter((m) => m.userId !== currentUser?.id));
    });

    return () => {
      socket.emit('collab:leave', { automationId: id });
      socket.off('collab:presence');
    };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-read user from localStorage whenever profile modal closes (to show updated avatar)
  const handleProfileUpdated = useCallback((updated) => {
    setUser((prev) => ({ ...prev, ...updated }));
  }, []);

  const statusBadgeColor =
    executionStatus === 'failed'   ? 'bg-red-500/5 border-red-500/20 text-red-400' :
    executionStatus === 'executed' ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' :
    executionStatus === 'running'  ? 'bg-blue-500/5 border-blue-500/20 text-blue-400' :
    'bg-neutral-900/50 border-[#333] text-neutral-500';

  const panelToggles = [
    {
      key: 'leftSidebar',
      title: 'Left sidebar',
      active: panels.leftSidebar,
      onClick: () => togglePanel('leftSidebar'),
      icon: <PanelLeft className="w-3.5 h-3.5" />,
    },
    {
      key: 'bottomChat',
      title: 'Chat + Tree',
      active: panels.bottomChat,
      onClick: () => togglePanel('bottomChat'),
      icon: <PanelBottom className="w-3.5 h-3.5" />,
    },
    {
      key: 'brian',
      title: 'Brian AI',
      active: isBrianOpen,
      onClick: () => setBrianOpen(!isBrianOpen),
      icon: <img src={brianLogo} alt="Brian" className="w-3.5 h-3.5 object-contain" />,
    },
  ];

  return (
    <>
    <div className="relative w-full h-14 bg-neutral-950 border-b border-[#333] z-50 flex items-center justify-between px-5 shrink-0">

      {/* Left: Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={() => navigate('/dashboard')}
          className="p-1.5 text-neutral-500 hover:text-neutral-200 hover:bg-white/[0.05] rounded-lg transition-colors shrink-0"
          title="Back to Dashboard"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="w-px h-4 bg-[#333]" />

        <nav className="flex items-center gap-2 text-xs min-w-0">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-neutral-500 hover:text-neutral-300 transition-colors shrink-0"
          >
            Workflows
          </button>
          <span className="text-neutral-700">/</span>
          <span className="text-neutral-200 font-medium tracking-tight truncate max-w-[180px]" title={workflowName}>
            {workflowName}
          </span>
        </nav>
      </div>

      {/* Centre: Panel toggles */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-0.5 bg-neutral-900 border border-[#333] rounded-lg p-1">
        {panelToggles.map(({ key, title, active, onClick, icon }) => (
          <button
            key={key}
            onClick={onClick}
            title={title}
            className={`p-1.5 rounded-md transition-all ${
              active
                ? 'bg-white/10 text-white'
                : 'text-neutral-600 hover:text-neutral-300 hover:bg-white/[0.05]'
            }`}
          >
            {icon}
          </button>
        ))}
      </div>

      {/* Right: Presence + Status + Actions + Profile */}
      <div className="flex items-center gap-3">

        {/* Live presence avatars — other editors in the room */}
        {presence.length > 0 && (
          <div className="flex items-center -space-x-2">
            {presence.slice(0, 4).map((p) => (
              <UserAvatarBubble
                key={p.userId}
                user={{ name: p.name, avatar: p.avatar }}
                title={`${p.name} is editing`}
                ring={p.color}
              />
            ))}
            {presence.length > 4 && (
              <div className="w-7 h-7 rounded-full bg-neutral-800 border-2 border-neutral-950 flex items-center justify-center text-[9px] font-semibold text-neutral-400">
                +{presence.length - 4}
              </div>
            )}
          </div>
        )}

        {/* Share / collaborators button */}
        <button
          onClick={() => setCollabOpen(true)}
          title="Manage collaborators"
          className="flex items-center gap-2 px-2.5 py-1.5 bg-neutral-900 hover:bg-white/[0.05] border border-[#333] rounded-lg text-[11px] font-semibold text-neutral-500 hover:text-neutral-200 transition-colors"
        >
          <Users className="w-3.5 h-3.5" />
          Share
        </button>

        <div className="w-px h-4 bg-[#333]" />

        {/* Node count */}
        <div className="flex items-center gap-2 px-2.5 py-1.5 bg-neutral-900 border border-[#333] rounded-lg">
          <span className="text-[11px] font-mono text-neutral-500">{nodeCount} nodes</span>
        </div>

        {/* Execution status */}
        <div className={`flex items-center gap-2 px-2.5 py-1.5 border rounded-lg transition-colors ${statusBadgeColor}`}>
          {executionStatus === 'running'  && <Loader2 className="w-3 h-3 animate-spin" />}
          {executionStatus === 'executed' && <Check className="w-3 h-3" />}
          <span className="text-[11px] font-semibold uppercase tracking-widest">
            {executionStatus === 'executed' ? 'Success' : executionStatus === 'running' ? 'Running' : executionStatus === 'failed' ? 'Failed' : 'Idle'}
          </span>
        </div>

        {/* Save indicator */}
        <div className="flex items-center gap-1.5 text-[10px] text-neutral-600">
          {isSaving ? (
            <><Loader2 className="w-3 h-3 animate-spin" /><span>Saving</span></>
          ) : (
            <><Check className="w-3 h-3 text-emerald-500/60" /><span>Saved</span></>
          )}
        </div>

        {/* Shortcuts */}
        <button
          onClick={() => setShortcutsOpen(true)}
          title="Keyboard shortcuts (?)"
          className="p-1.5 text-neutral-600 hover:text-neutral-300 hover:bg-white/[0.05] rounded-lg transition-colors"
        >
          <Keyboard className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-4 bg-[#333]" />

        {/* History */}
        <button
          onClick={() => setVersionPanelOpen(true)}
          title="Version history"
          className="flex items-center gap-2 px-2.5 py-1.5 bg-neutral-900 hover:bg-white/[0.05] border border-[#333] rounded-lg text-[11px] font-semibold text-neutral-500 hover:text-neutral-200 transition-colors"
        >
          <Clock className="w-3.5 h-3.5" />
          History
        </button>

        {/* Save */}
        <button
          onClick={() => saveEngine(id)}
          disabled={isSaving}
          title="Save (Cmd+S)"
          className="flex items-center gap-2 px-2.5 py-1.5 bg-neutral-900 hover:bg-white/[0.05] border border-[#333] rounded-lg text-[11px] font-semibold text-neutral-400 hover:text-neutral-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Save
        </button>

        {/* Activate */}
        <button
          onClick={() => activateEngine(id)}
          disabled={isActivating || nodeCount === 0}
          title={isActive ? 'Deactivate trigger' : 'Activate trigger — go live'}
          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
            isActive
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
              : 'bg-neutral-900 border-[#333] text-neutral-400 hover:bg-white/[0.05] hover:text-neutral-100'
          }`}
        >
          {isActivating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Power className="w-3.5 h-3.5" />}
          {isActive ? 'Active' : 'Activate'}
        </button>

        {/* Run */}
        <button
          onClick={() => runEngine(id)}
          disabled={isRunning || nodeCount === 0}
          title="Run (Cmd+Enter)"
          className="flex items-center gap-2 px-3.5 py-1.5 bg-white hover:bg-neutral-100 text-neutral-950 rounded-lg text-[11px] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
          Run Test
        </button>

        <div className="w-px h-4 bg-[#333]" />

        {/* Profile avatar — clickable */}
        <UserAvatarBubble
          user={user}
          title={`${user?.name || 'Profile'} — click to edit`}
          onClick={() => setProfileOpen(true)}
        />
      </div>
    </div>

    <VersionHistoryPanel
      automationId={id}
      isOpen={versionPanelOpen}
      onClose={() => setVersionPanelOpen(false)}
    />
    <KeyboardShortcutsPanel
      isOpen={shortcutsOpen}
      onClose={() => setShortcutsOpen(false)}
    />
    <ProfileModal
      user={user}
      isOpen={profileOpen}
      onClose={() => setProfileOpen(false)}
      onUpdated={handleProfileUpdated}
    />
    <CollaboratorsModal
      automationId={id}
      isOpen={collabOpen}
      onClose={() => setCollabOpen(false)}
    />
    </>
  );
}
