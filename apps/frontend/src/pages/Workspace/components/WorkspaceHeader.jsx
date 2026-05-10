import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState, useCallback, useRef } from 'react';
import {
  ArrowLeft, Loader2, Clock, Keyboard, Power,
  PanelLeft, PanelBottom, Users, ChevronDown,
} from 'lucide-react';
import useWorkspaceStore from '../../../store/workspaceStore';
import VersionHistoryPanel from './VersionHistoryPanel';
import KeyboardShortcutsPanel from '../../../components/KeyboardShortcutsPanel';
import ProfileModal from '../../../components/ProfileModal';
import CollaboratorsModal from './CollaboratorsModal';
import CollabDMChat from './CollabDMChat';
import NotificationBell from '../../../components/NotificationBell';
import { getSocket } from '../../../lib/socket';
import brianLogo from '../../../assets/brian.webp';

// ── Unified button tokens ─────────────────────────────────────────────────────
const H = 'h-7';
const ICON = `${H} w-7 flex items-center justify-center rounded-md text-neutral-500 hover:text-neutral-200 hover:bg-white/[0.06] transition-all duration-150 shrink-0 cursor-pointer`;
const TEXT = `${H} flex items-center gap-1.5 px-2.5 rounded-md text-[11px] font-semibold transition-all duration-150 shrink-0 cursor-pointer border`;
const DIV  = 'w-px h-4 bg-[#2a2a2a] shrink-0';

function UserBubble({ user, title, onClick, color, pulse = false }) {
  const src = user?.avatar || user?.picture;
  const ring = color ? { outline: `2px solid ${color}`, outlineOffset: 2 } : {};
  const base = `${H} w-7 rounded-full shrink-0 border-2 border-neutral-950 transition-all duration-200
    ${onClick ? 'cursor-pointer hover:scale-110' : ''}`;
  return (
    <div className="relative" onClick={onClick} title={title}>
      {src
        ? <img src={src} alt="" referrerPolicy="no-referrer" className={`${base} object-cover`} style={ring} />
        : <div className={`${base} bg-neutral-700 flex items-center justify-center font-semibold text-[10px] text-neutral-200 uppercase`} style={ring}>
            {user?.name?.charAt(0) || '?'}
          </div>
      }
      {pulse && (
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-neutral-950 animate-pulse" />
      )}
    </div>
  );
}

export default function WorkspaceHeader() {
  const navigate    = useNavigate();
  const { id }     = useParams();

  const [versionOpen,  setVersionOpen]  = useState(false);
  const [shortcutsOpen,setShortcutsOpen]= useState(false);
  const [profileOpen,  setProfileOpen]  = useState(false);
  const [collabOpen,   setCollabOpen]   = useState(false);
  const [presence,     setPresence]     = useState([]);
  const [activeDM,     setActiveDM]     = useState(null);
  const [dmMessages,   setDmMessages]   = useState({});
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('blinkbox_user') || '{}'); } catch { return {}; }
  });

  const workflowName   = useWorkspaceStore(s => s.workflowName);
  const isSaving       = useWorkspaceStore(s => s.isSaving);
  const isActive       = useWorkspaceStore(s => s.isActive);
  const isActivating   = useWorkspaceStore(s => s.isActivating);
  const saveEngine     = useWorkspaceStore(s => s.saveEngine);
  const runEngine      = useWorkspaceStore(s => s.runEngine);
  const activateEngine = useWorkspaceStore(s => s.activateEngine);
  const nodes          = useWorkspaceStore(s => s.nodes);
  const panels         = useWorkspaceStore(s => s.panels);
  const togglePanel    = useWorkspaceStore(s => s.togglePanel);
  const isBrianOpen    = useWorkspaceStore(s => s.isBrianOpen);
  const setBrianOpen   = useWorkspaceStore(s => s.setBrianOpen);
  const nodeCount      = nodes.length;

  // Keyboard shortcuts — Cmd+S / Cmd+Enter still work without visible Run
  useEffect(() => {
    const h = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's')     { e.preventDefault(); saveEngine(id); }
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
    const socket  = getSocket();
    const myId    = user?.id || user?._id || '';
    const myName  = user?.name || 'Anonymous';
    const myAvatar= user?.avatar || user?.picture || '';

    const join       = () => socket.emit('collab:join', { automationId: id, name: myName, avatar: myAvatar });
    const onPresence = (members) => setPresence(members.filter(m => String(m.userId) !== String(myId)));
    const onDM       = (msg) => {
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

  const handleProfileUpdated = useCallback(u => setUser(p => ({ ...p, ...u })), []);

  const panelToggles = [
    { key: 'leftSidebar', title: 'Left sidebar (⌘1)',  active: panels.leftSidebar, onClick: () => togglePanel('leftSidebar'), icon: <PanelLeft  className="w-3.5 h-3.5" /> },
    { key: 'bottomChat',  title: 'Chat panel (⌘2)',    active: panels.bottomChat,  onClick: () => togglePanel('bottomChat'),  icon: <PanelBottom className="w-3.5 h-3.5" /> },
    { key: 'brian',       title: 'Brian AI (⌘3)',       active: isBrianOpen,        onClick: () => setBrianOpen(!isBrianOpen),
      icon: <img src={brianLogo} alt="Brian" className="w-3.5 h-3.5 object-contain rounded" /> },
  ];

  return (
    <>
      <div className="relative w-full h-12 bg-neutral-950 border-b border-[#222] z-50 flex items-center justify-between px-3 shrink-0">

        {/* ── LEFT ─────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={() => navigate('/dashboard')} title="Back to dashboard" className={ICON}>
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>

          <div className={DIV} />

          <nav className="flex items-center gap-1 text-[11px] min-w-0">
            <button onClick={() => navigate('/dashboard')}
              className="text-neutral-600 hover:text-neutral-400 transition-colors shrink-0">
              Workflows
            </button>
            <ChevronDown className="w-3 h-3 text-neutral-700 rotate-[-90deg] shrink-0" />
            <span className="text-neutral-300 font-medium truncate max-w-[160px]" title={workflowName}>
              {workflowName || 'Untitled'}
            </span>
          </nav>

          {isSaving && (
            <div className="flex items-center gap-1 text-[10px] text-neutral-700 shrink-0 ml-1">
              <Loader2 className="w-2.5 h-2.5 animate-spin" />
              <span>Saving</span>
            </div>
          )}
        </div>

        {/* ── CENTER — panel toggles ────────────────────────────── */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-0.5 bg-neutral-900 border border-[#2a2a2a] rounded-lg p-0.5">
            {panelToggles.map(({ key, title, active, onClick, icon }) => (
              <button key={key} onClick={onClick} title={title}
                className={`${H} w-7 flex items-center justify-center rounded-md transition-all duration-150
                  ${active ? 'bg-white/[0.08] text-white' : 'text-neutral-600 hover:text-neutral-300 hover:bg-white/[0.04]'}`}>
                {icon}
              </button>
            ))}
          </div>
        </div>

        {/* ── RIGHT ────────────────────────────────────────────── */}
        <div className="flex items-center gap-1.5">

          {/* Live collaborators */}
          {presence.length > 0 && (
            <>
              <div className="flex items-center -space-x-1.5 mr-0.5">
                {presence.slice(0, 4).map(p => (
                  <UserBubble key={p.userId}
                    user={{ name: p.name, avatar: p.avatar }}
                    title={`${p.name} — click to message`}
                    color={p.color}
                    pulse
                    onClick={() => setActiveDM(prev =>
                      prev?.peer.userId === p.userId ? null : { peer: p }
                    )}
                  />
                ))}
                {presence.length > 4 && (
                  <div className={`${H} w-7 rounded-full bg-neutral-800 border-2 border-neutral-950 flex items-center justify-center text-[9px] font-bold text-neutral-500`}>
                    +{presence.length - 4}
                  </div>
                )}
              </div>
              <div className={DIV} />
            </>
          )}

          <NotificationBell />

          <button onClick={() => setCollabOpen(true)} title="Share & collaborators"
            className={`${TEXT} bg-neutral-900 border-[#2a2a2a] text-neutral-500 hover:text-neutral-200 hover:bg-white/[0.04]`}>
            <Users className="w-3.5 h-3.5" />
            Share
            {presence.length > 0 && (
              <span className="ml-0.5 min-w-[16px] h-4 px-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[9px] font-bold flex items-center justify-center">
                {presence.length}
              </span>
            )}
          </button>

          <div className={DIV} />

          <button onClick={() => setVersionOpen(true)} title="Version history" className={ICON}>
            <Clock className="w-3.5 h-3.5" />
          </button>

          <button onClick={() => setShortcutsOpen(true)} title="Keyboard shortcuts (?)" className={ICON}>
            <Keyboard className="w-3.5 h-3.5" />
          </button>

          <div className={DIV} />

          {/* Activate toggle */}
          <button
            onClick={() => activateEngine(id)}
            disabled={isActivating || nodeCount === 0}
            title={isActive ? 'Click to deactivate' : 'Activate — go live'}
            className={`${TEXT} disabled:opacity-40 disabled:cursor-not-allowed
              ${isActive
                ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20'
                : 'bg-neutral-900 border-[#2a2a2a] text-neutral-500 hover:text-neutral-200 hover:bg-white/[0.04]'}`}
          >
            {isActivating
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Power className="w-3.5 h-3.5" />
            }
            {isActive ? 'Active' : 'Activate'}
          </button>

          <div className={DIV} />

          <UserBubble user={user} title={`${user?.name || 'Profile'} — click to edit`} onClick={() => setProfileOpen(true)} />
        </div>
      </div>

      <VersionHistoryPanel automationId={id} isOpen={versionOpen} onClose={() => setVersionOpen(false)} />
      <KeyboardShortcutsPanel isOpen={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <ProfileModal user={user} isOpen={profileOpen} onClose={() => setProfileOpen(false)} onUpdated={handleProfileUpdated} />
      <CollaboratorsModal automationId={id} isOpen={collabOpen} onClose={() => setCollabOpen(false)} />

      {activeDM && (
        <CollabDMChat
          peer={activeDM.peer}
          myUserId={user?.id || user?._id || ''}
          automationId={id}
          messages={dmMessages[activeDM.peer.userId] || []}
          onSend={(text) => getSocket().emit('collab:dm_send', { toUserId: activeDM.peer.userId, text, automationId: id })}
          onClose={() => setActiveDM(null)}
        />
      )}
    </>
  );
}
