import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState, useCallback, useRef } from 'react';
import { ArrowLeft, Loader2, Clock, Keyboard, Power, PanelLeft, PanelBottom, Users, CloudOff, Play, CheckCircle2, XCircle, Activity } from 'lucide-react';
import { playRunStart, playSuccess, playError } from '../../../lib/sounds';
import useWorkspaceStore from '../../../store/workspaceStore';
import VersionHistoryPanel from './VersionHistoryPanel';
import KeyboardShortcutsPanel from '../../../components/KeyboardShortcutsPanel';
import ProfileModal from '../../../components/ProfileModal';
import CollaboratorsModal from './CollaboratorsModal';
import CollabDMChat from './CollabDMChat';
import NotificationBell from '../../../components/NotificationBell';
import { getSocket } from '../../../lib/socket';
import brianLogo from '../../../assets/brian.webp';

// All interactive elements share this height so every "line" is equal
const BTN_H = 'h-7';
const ICON_BTN = `${BTN_H} w-7 flex items-center justify-center rounded-lg text-neutral-600 hover:text-neutral-300 hover:bg-white/[0.05] transition-colors shrink-0`;
const TEXT_BTN = `${BTN_H} flex items-center gap-1.5 px-2.5 rounded-lg border text-[11px] font-semibold transition-colors shrink-0`;

function UserAvatarBubble({ user, title, onClick, color }) {
  const src = user?.avatar || user?.picture;
  const base = `${BTN_H} w-7 rounded-full shrink-0 border-2 border-neutral-950 transition-all ${onClick ? 'cursor-pointer hover:ring-2 hover:ring-neutral-400' : ''}`;
  if (src) {
    return (
      <img src={src} alt="" referrerPolicy="no-referrer" title={title} onClick={onClick}
        className={`${base} object-cover`}
        style={color ? { outline: `2px solid ${color}`, outlineOffset: 1 } : {}}
      />
    );
  }
  return (
    <div title={title} onClick={onClick}
      className={`${base} bg-neutral-700 flex items-center justify-center font-semibold text-[10px] text-neutral-200 uppercase`}
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
  const [shortcutsOpen,    setShortcutsOpen]    = useState(false);
  const [profileOpen,      setProfileOpen]      = useState(false);
  const [collabOpen,       setCollabOpen]       = useState(false);
  const [presence,         setPresence]         = useState([]);
  const [activeDM,         setActiveDM]         = useState(null);   // { peer }
  const [dmMessages,       setDmMessages]       = useState({});     // { [userId]: msg[] }
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('blinkbox_user') || '{}'); } catch { return {}; }
  });

  const workflowName        = useWorkspaceStore(s => s.workflowName);
  const isSaving            = useWorkspaceStore(s => s.isSaving);
  const isActive            = useWorkspaceStore(s => s.isActive);
  const isActivating        = useWorkspaceStore(s => s.isActivating);
  const saveEngine          = useWorkspaceStore(s => s.saveEngine);
  const runEngine           = useWorkspaceStore(s => s.runEngine);
  const activateEngine      = useWorkspaceStore(s => s.activateEngine);
  const nodes               = useWorkspaceStore(s => s.nodes);
  const panels              = useWorkspaceStore(s => s.panels);
  const togglePanel         = useWorkspaceStore(s => s.togglePanel);
  const isBrianOpen         = useWorkspaceStore(s => s.isBrianOpen);
  const setBrianOpen        = useWorkspaceStore(s => s.setBrianOpen);
  const isRunning           = useWorkspaceStore(s => s.isRunning);
  const liveExecutionState  = useWorkspaceStore(s => s.liveExecutionState);
  const executionError      = useWorkspaceStore(s => s.executionError);
  const nodeStatuses        = useWorkspaceStore(s => s.nodeStatuses);
  const openTraceSidebar    = useWorkspaceStore(s => s.openTraceSidebar);

  // Track last run result for the status badge
  const [lastRunResult, setLastRunResult] = useState(null); // null | "success" | "error"
  const [runDurationMs, setRunDurationMs] = useState(null);
  const runStartRef = useRef(null);

  useEffect(() => {
    if (isRunning) {
      runStartRef.current = Date.now();
      setLastRunResult(null);
      playRunStart();
    } else if (runStartRef.current) {
      const duration = Date.now() - runStartRef.current;
      setRunDurationMs(duration);
      const statuses = Object.values(nodeStatuses);
      if (statuses.includes("failed") || executionError) {
        setLastRunResult("error");
        playError();
      } else if (statuses.includes("completed") || statuses.length > 0) {
        setLastRunResult("success");
        playSuccess();
      }
      runStartRef.current = null;
    }
  }, [isRunning, nodeStatuses, executionError]);

  const nodeCount = nodes.length;

  // Keyboard shortcuts (Cmd+S / Cmd+Enter still work even without visible buttons)
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

  // Collab presence
  useEffect(() => {
    if (!id) return;
    const socket = getSocket();
    const myId     = user?.id || user?._id || '';
    const myName   = user?.name || 'Anonymous';
    const myAvatar = user?.avatar || user?.picture || '';

    const join = () => socket.emit('collab:join', { automationId: id, name: myName, avatar: myAvatar });

    const onPresence = (members) => setPresence(members.filter(m => String(m.userId) !== String(myId)));

    const onDM = (msg) => {
      const peerId = msg.isSelf ? msg.toUserId : msg.fromUserId;
      setDmMessages(prev => ({ ...prev, [peerId]: [...(prev[peerId] || []), msg] }));
      if (!msg.isSelf) {
        setActiveDM(prev => prev ?? {
          peer: { userId: msg.fromUserId, name: msg.fromName, avatar: msg.fromAvatar, color: msg.fromColor },
        });
      }
    };

    socket.on('connect', join);
    socket.on('collab:presence', onPresence);
    socket.on('collab:dm', onDM);
    if (socket.connected) join();

    return () => {
      socket.emit('collab:leave', { automationId: id });
      socket.off('connect', join);
      socket.off('collab:presence', onPresence);
      socket.off('collab:dm', onDM);
    };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleProfileUpdated = useCallback(updated => setUser(p => ({ ...p, ...updated })), []);

  const panelToggles = [
    { key: 'leftSidebar', title: 'Left sidebar', active: panels.leftSidebar, onClick: () => togglePanel('leftSidebar'), icon: <PanelLeft  className="w-3.5 h-3.5" /> },
    { key: 'bottomChat',  title: 'Chat + Tree',  active: panels.bottomChat,  onClick: () => togglePanel('bottomChat'),  icon: <PanelBottom className="w-3.5 h-3.5" /> },
    { key: 'brian', title: 'Brian AI', active: isBrianOpen, onClick: () => setBrianOpen(!isBrianOpen),
      icon: <img src={brianLogo} alt="Brian" className="w-3.5 h-3.5 object-contain" /> },
  ];

  return (
    <>
    {/*
      Layout: relative container so we can absolute-position the center.
      Left and Right are normal flex children.
      CENTER is inset-0 flex justify-center — always exactly 50% of container.
      pointer-events-none on wrapper so left/right are still clickable underneath.
    */}
    <div className="relative w-full h-14 bg-neutral-950 border-b border-[#333] z-50 flex items-center justify-between px-4 shrink-0">

      {/* ── LEFT ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 min-w-0">
        <button onClick={() => navigate('/dashboard')} title="Dashboard"
          className={ICON_BTN}>
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="w-px h-4 bg-[#333]" />
        <nav className="flex items-center gap-1.5 text-xs min-w-0">
          <button onClick={() => navigate('/dashboard')} className="text-neutral-500 hover:text-neutral-300 transition-colors shrink-0">
            Workflows
          </button>
          <span className="text-neutral-700">/</span>
          <span className="text-neutral-200 font-medium truncate max-w-[180px]" title={workflowName}>
            {workflowName}
          </span>
        </nav>
        {/* Auto-save pulse — only visible while saving */}
        {isSaving && (
          <div className="flex items-center gap-1 text-[10px] text-neutral-600 shrink-0">
            <Loader2 className="w-2.5 h-2.5 animate-spin" />
            <span>Saving…</span>
          </div>
        )}
      </div>

      {/* ── CENTER — absolutely locked to true midpoint ───────────────────── */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-0.5 bg-neutral-900 border border-[#333] rounded-lg p-1">
          {panelToggles.map(({ key, title, active, onClick, icon }) => (
            <button key={key} onClick={onClick} title={title}
              className={`${BTN_H} w-7 flex items-center justify-center rounded-md transition-all
                ${active ? 'bg-white/10 text-white' : 'text-neutral-600 hover:text-neutral-300 hover:bg-white/[0.05]'}`}
            >{icon}</button>
          ))}
        </div>
      </div>

      {/* ── RIGHT ────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">

        {/* Presence avatars — click to open DM */}
        {presence.length > 0 && (
          <div className="flex items-center -space-x-1.5">
            {presence.slice(0, 4).map(p => (
              <UserAvatarBubble key={p.userId} user={{ name: p.name, avatar: p.avatar }}
                title={`${p.name} is editing — click to chat`} color={p.color}
                onClick={() => setActiveDM(prev => prev?.peer.userId === p.userId ? null : { peer: p })} />
            ))}
            {presence.length > 4 && (
              <div className={`${BTN_H} w-7 rounded-full bg-neutral-800 border-2 border-neutral-950 flex items-center justify-center text-[9px] font-semibold text-neutral-500`}>
                +{presence.length - 4}
              </div>
            )}
          </div>
        )}

        {/* Notification bell */}
        <NotificationBell />

        {/* Share */}
        <button onClick={() => setCollabOpen(true)} title="Manage collaborators"
          className={`${TEXT_BTN} bg-neutral-900 border-[#333] text-neutral-500 hover:text-neutral-200`}>
          <Users className="w-3.5 h-3.5" />
          Share
        </button>

        <div className="w-px h-4 bg-[#333]" />

        {/* History */}
        <button onClick={() => setVersionPanelOpen(true)} title="Version history" className={ICON_BTN}>
          <Clock className="w-3.5 h-3.5" />
        </button>

        {/* Shortcuts */}
        <button onClick={() => setShortcutsOpen(true)} title="Keyboard shortcuts (?)" className={ICON_BTN}>
          <Keyboard className="w-3.5 h-3.5" />
        </button>

        {/* Run button with status */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => runEngine(id)}
            disabled={isRunning || nodeCount === 0}
            title="Run workflow (⌘↵)"
            className={`${TEXT_BTN} disabled:opacity-40 disabled:cursor-not-allowed
              ${isRunning
                ? 'bg-blue-500/10 border-blue-500/30 text-blue-400 cursor-not-allowed'
                : 'bg-neutral-900 border-[#333] text-neutral-400 hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-400'}`}
          >
            {isRunning
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Running…</>
              : <><Play className="w-3.5 h-3.5" /> Run</>
            }
          </button>
          {/* Last run result badge */}
          {!isRunning && lastRunResult === "success" && (
            <button
              onClick={() => openTraceSidebar?.()}
              className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
              title="View last run results"
            >
              <CheckCircle2 className="w-3 h-3" />
              {runDurationMs ? `${(runDurationMs / 1000).toFixed(1)}s` : "done"}
            </button>
          )}
          {!isRunning && lastRunResult === "error" && (
            <button
              onClick={() => openTraceSidebar?.()}
              className="flex items-center gap-1 text-[10px] font-semibold text-red-400 hover:text-red-300 transition-colors"
              title="View error details"
            >
              <XCircle className="w-3 h-3" />
              Failed
            </button>
          )}
        </div>

        <div className="w-px h-4 bg-[#333]" />

        {/* Activate */}
        <button onClick={() => activateEngine(id)} disabled={isActivating || nodeCount === 0}
          title={isActive ? 'Deactivate' : 'Activate — go live'}
          className={`${TEXT_BTN} disabled:opacity-40 disabled:cursor-not-allowed
            ${isActive
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
              : 'bg-neutral-900 border-[#333] text-neutral-400 hover:text-neutral-100 hover:bg-white/[0.05]'}`}>
          {isActivating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Power className="w-3.5 h-3.5" />}
          {isActive ? 'Active' : 'Activate'}
        </button>

        <div className="w-px h-4 bg-[#333]" />

        {/* Profile */}
        <UserAvatarBubble user={user} title={`${user?.name || 'Profile'} — click to edit`} onClick={() => setProfileOpen(true)} />
      </div>
    </div>

    <VersionHistoryPanel automationId={id} isOpen={versionPanelOpen} onClose={() => setVersionPanelOpen(false)} />
    <KeyboardShortcutsPanel isOpen={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    <ProfileModal user={user} isOpen={profileOpen} onClose={() => setProfileOpen(false)} onUpdated={handleProfileUpdated} />
    <CollaboratorsModal automationId={id} isOpen={collabOpen} onClose={() => setCollabOpen(false)} />

    {/* DM chat — floats bottom-right, opens when a presence avatar is clicked */}
    {activeDM && (
      <CollabDMChat
        peer={activeDM.peer}
        myUserId={user?.id || user?._id || ''}
        automationId={id}
        messages={dmMessages[activeDM.peer.userId] || []}
        onSend={(text) => {
          getSocket().emit('collab:dm_send', { toUserId: activeDM.peer.userId, text, automationId: id });
        }}
        onClose={() => setActiveDM(null)}
      />
    )}
    </>
  );
}
