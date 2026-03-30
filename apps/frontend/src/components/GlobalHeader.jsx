import { useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { Loader2, Save, Play } from 'lucide-react';
import useWorkspaceStore from '../store/workspaceStore';

export default function GlobalHeader({ user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  const isWorkspace = location.pathname.startsWith('/workspace');

  // Workspace-specific store selectors (safe to call unconditionally)
  const workflowName = useWorkspaceStore((s) => s.workflowName);
  const isSaving = useWorkspaceStore((s) => s.isSaving);
  const isRunning = useWorkspaceStore((s) => s.isRunning);
  const saveEngine = useWorkspaceStore((s) => s.saveEngine);
  const runEngine = useWorkspaceStore((s) => s.runEngine);
  const nodes = useWorkspaceStore((s) => s.nodes);

  const nodeCount = nodes.length;

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

  const displayName = user?.name || 'User';

  const UserAvatar = () => {
    if (user?.picture) {
      return <img src={user.picture} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" referrerPolicy="no-referrer" />;
    }
    return (
      <div className="w-5 h-5 rounded-full bg-neutral-700 flex items-center justify-center text-[9px] font-semibold text-neutral-300 uppercase shrink-0">
        {displayName.charAt(0)}
      </div>
    );
  };

  return (
    <header className="w-full h-12 bg-neutral-950 border-b border-[#333] flex items-center justify-between px-4 shrink-0 z-50">

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
            {/* Save button */}
            <button
              onClick={() => saveEngine(id)}
              disabled={isSaving}
              title="Save (Cmd+S)"
              className="flex items-center gap-1.5 px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-md text-[11px] font-semibold text-neutral-300 hover:text-neutral-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save
            </button>

            {/* Run button */}
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

        {/* User avatar */}
        <UserAvatar />
      </div>
    </header>
  );
}
