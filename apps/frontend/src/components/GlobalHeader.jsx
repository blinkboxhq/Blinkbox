import { useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { Loader2, Check, Save, Play, Zap } from 'lucide-react';
import useWorkspaceStore from '../store/workspaceStore';
import logo from '../assets/logo.svg';

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
  const liveExecutionState = useWorkspaceStore((s) => s.liveExecutionState);

  const nodeCount = nodes.length;
  const executionStatus = liveExecutionState?.status || (isRunning ? 'running' : 'idle');

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

  const statusBadgeColor =
    executionStatus === 'failed' ? 'bg-red-500/5 border-red-500/20 text-red-400' :
    executionStatus === 'executed' ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' :
    executionStatus === 'running' ? 'bg-blue-500/5 border-blue-500/20 text-blue-400' :
    'bg-neutral-900/50 border-neutral-800 text-neutral-500';

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
    <header className="w-full h-12 bg-neutral-900 border-b border-neutral-700/40 flex items-center justify-between px-4 shrink-0 z-50">

      {/* Left: Logo + Breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        <button onClick={() => navigate('/dashboard')} className="shrink-0 hover:opacity-80 transition-opacity" title="Back to Dashboard">
          <img src={logo} alt="B" className="w-5 h-5 object-contain" />
        </button>

        <nav className="flex items-center gap-1.5 text-sm min-w-0">
          {/* User segment */}
          <div className="flex items-center gap-1.5 shrink-0">
            <UserAvatar />
            <button
              onClick={() => navigate('/dashboard')}
              className="text-neutral-400 hover:text-neutral-200 transition-colors text-sm"
            >
              {displayName}
            </button>
          </div>

          <span className="text-neutral-600 text-sm">/</span>

          {/* Context segment */}
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

      {/* Right: Workspace actions (only in workspace) */}
      {isWorkspace && (
        <div className="flex items-center gap-3">
          {/* Node count */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-neutral-900/50 border border-neutral-800 rounded-md">
            <Zap className="w-3 h-3 text-neutral-500" />
            <span className="text-[11px] font-mono text-neutral-400">{nodeCount} nodes</span>
          </div>

          {/* Execution status */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 border rounded-md transition-colors ${statusBadgeColor}`}>
            {executionStatus === 'running' && <Loader2 className="w-3 h-3 animate-spin" />}
            {executionStatus === 'executed' && <Check className="w-3 h-3" />}
            <span className="text-[11px] font-semibold uppercase tracking-widest">
              {executionStatus === 'executed' ? 'Success' : executionStatus === 'running' ? 'Running' : executionStatus === 'failed' ? 'Failed' : 'Idle'}
            </span>
          </div>

          {/* Save indicator */}
          <div className="flex items-center gap-1 text-[10px] text-neutral-500">
            {isSaving ? (
              <><Loader2 className="w-3 h-3 animate-spin" /><span>Saving</span></>
            ) : (
              <><Check className="w-3 h-3 text-emerald-500/70" /><span>Saved</span></>
            )}
          </div>

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
            Run Test
          </button>
        </div>
      )}
    </header>
  );
}
