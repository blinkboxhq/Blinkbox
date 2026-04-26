import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { Loader2, Save, Play } from 'lucide-react';
import useWorkspaceStore from '../store/workspaceStore';
import ProfileModal from './ProfileModal';
import NotificationBell from './NotificationBell';

function UserAvatar({ user, onClick }) {
  const src = user?.avatar || user?.picture;
  if (src) {
    return (
      <img
        src={src}
        alt=""
        className="w-7 h-7 rounded-full object-cover shrink-0 cursor-pointer hover:ring-2 hover:ring-neutral-500 transition-all"
        referrerPolicy="no-referrer"
        title={`${user?.name || 'Profile'} — click to edit`}
        onClick={onClick}
      />
    );
  }
  const initial = user?.name?.charAt(0) || '?';
  return (
    <div
      className="w-7 h-7 rounded-full bg-neutral-700 flex items-center justify-center text-[10px] font-semibold text-neutral-200 uppercase shrink-0 cursor-pointer hover:ring-2 hover:ring-neutral-500 transition-all"
      title={`${user?.name || 'Profile'} — click to edit`}
      onClick={onClick}
    >
      {initial}
    </div>
  );
}

export default function GlobalHeader({ user: userProp }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  const isWorkspace = location.pathname.startsWith('/workspace');

  const workflowName = useWorkspaceStore((s) => s.workflowName);
  const isSaving = useWorkspaceStore((s) => s.isSaving);
  const isRunning = useWorkspaceStore((s) => s.isRunning);
  const saveEngine = useWorkspaceStore((s) => s.saveEngine);
  const runEngine = useWorkspaceStore((s) => s.runEngine);
  const nodes = useWorkspaceStore((s) => s.nodes);

  const nodeCount = nodes.length;

  // Merge prop user with localStorage (avatar may have been updated mid-session)
  const [user, setUser] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('blinkbox_user') || '{}');
      return { ...userProp, ...stored };
    } catch { return userProp || {}; }
  });
  const [profileOpen, setProfileOpen] = useState(false);

  // Keep in sync when parent passes new user prop (after login)
  useEffect(() => {
    setUser((prev) => ({ ...prev, ...userProp }));
  }, [userProp]);

  const handleProfileUpdated = useCallback((updated) => {
    setUser((prev) => ({ ...prev, ...updated }));
  }, []);

  // Keyboard shortcuts (workspace only)
  useEffect(() => {
    if (!isWorkspace) return;
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        saveEngine(id);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        runEngine(id);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isWorkspace, id, saveEngine, runEngine]);

  return (
    <>
    <header className="w-full h-14 bg-neutral-950 border-b border-[#333] flex items-center justify-between px-4 shrink-0 z-50">

      {/* Left: Breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        <nav className="flex items-center gap-1.5 text-sm min-w-0">
          {isWorkspace ? (
            <>
              <button
                onClick={() => navigate('/dashboard')}
                className="text-neutral-400 hover:text-neutral-200 transition-colors text-sm"
              >
                Workflows
              </button>
              <span className="text-neutral-600 text-sm">/</span>
              <span className="text-neutral-100 font-semibold text-sm truncate max-w-[200px]" title={workflowName}>
                {workflowName || 'Untitled'}
              </span>
            </>
          ) : (
            <span className="text-neutral-100 font-semibold text-sm">Dashboard</span>
          )}
        </nav>
      </div>

      {/* Right: Actions + Avatar */}
      <div className="flex items-center gap-3">
        {isWorkspace && (
          <>
            <button
              onClick={() => saveEngine(id)}
              disabled={isSaving}
              title="Save (Cmd+S)"
              className="flex items-center gap-1.5 px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-md text-[11px] font-semibold text-neutral-300 hover:text-neutral-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save
            </button>

            <button
              onClick={() => runEngine(id)}
              disabled={isRunning || nodeCount === 0}
              title="Run (Cmd+Enter)"
              className="flex items-center gap-1.5 px-3 py-1 bg-neutral-100 hover:bg-white text-neutral-950 rounded-md text-[11px] font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              Run
            </button>
          </>
        )}

        <NotificationBell />
        <UserAvatar user={user} onClick={() => setProfileOpen(true)} />
      </div>
    </header>

    <ProfileModal
      user={user}
      isOpen={profileOpen}
      onClose={() => setProfileOpen(false)}
      onUpdated={handleProfileUpdated}
    />
    </>
  );
}
