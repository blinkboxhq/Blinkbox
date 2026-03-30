import { useEffect, useMemo } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import {
  Loader2,
  Check,
  Save,
  Play,
  Workflow,
  Activity,
  KeyRound,
  Settings,
} from 'lucide-react';
import useWorkspaceStore from '../store/workspaceStore';

// ── Navigation items ────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: 'editor',      label: 'Editor',      icon: Workflow },
  { id: 'executions',  label: 'Executions',  icon: Activity },
  { id: 'credentials', label: 'Credentials', icon: KeyRound },
  { id: 'settings',    label: 'Settings',    icon: Settings },
];

export default function GlobalHeader({ user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  const isWorkspace = location.pathname.startsWith('/workspace');

  // Workspace store selectors
  const workflowName    = useWorkspaceStore((s) => s.workflowName);
  const isSaving        = useWorkspaceStore((s) => s.isSaving);
  const isRunning       = useWorkspaceStore((s) => s.isRunning);
  const saveEngine      = useWorkspaceStore((s) => s.saveEngine);
  const runEngine       = useWorkspaceStore((s) => s.runEngine);
  const nodes           = useWorkspaceStore((s) => s.nodes);
  const liveExecutionState = useWorkspaceStore((s) => s.liveExecutionState);
  const isTraceSidebarOpen = useWorkspaceStore((s) => s.isTraceSidebarOpen);
  const setSelectedNodeId  = useWorkspaceStore((s) => s.setSelectedNodeId);

  const nodeCount       = nodes.length;
  const executionStatus = liveExecutionState?.status || (isRunning ? 'running' : 'idle');

  // Derive active tab from current workspace state
  const activeTab = useMemo(() => {
    if (!isWorkspace) return null;
    if (isTraceSidebarOpen) return 'executions';
    return 'editor';
  }, [isWorkspace, isTraceSidebarOpen]);

  // Handle tab clicks
  const handleTabClick = (tabId) => {
    if (!isWorkspace) return;

    if (tabId === 'editor') {
      // Close trace sidebar, deselect node → clean canvas
      const store = useWorkspaceStore.getState();
      if (store.closeTraceSidebar) store.closeTraceSidebar();
      setSelectedNodeId(null);
    } else if (tabId === 'executions') {
      const store = useWorkspaceStore.getState();
      if (store.openTraceSidebar) {
        store.openTraceSidebar();
      } else {
        // Fallback: set isTraceSidebarOpen directly
        useWorkspaceStore.setState({ isTraceSidebarOpen: true });
      }
    }
    // credentials / settings are placeholders for now
  };

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

  return (
    <header className="w-full h-12 bg-[#161616]/80 backdrop-blur-md border-b border-zinc-800/50 flex items-center justify-between px-4 shrink-0 z-50">

      {/* ── Left: Breadcrumbs ──────────────────────────────────────────── */}
      <div className="flex items-center gap-2.5 min-w-0">
        <nav className="flex items-center gap-1.5 text-sm min-w-0">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-zinc-500 hover:text-zinc-300 transition-colors duration-200 text-sm"
          >
            {displayName}
          </button>

          <span className="text-zinc-700 text-xs">/</span>

          {isWorkspace ? (
            <>
              <button
                onClick={() => navigate('/dashboard')}
                className="text-zinc-500 hover:text-zinc-300 transition-colors duration-200 text-sm"
              >
                Workflows
              </button>
              <span className="text-zinc-700 text-xs">/</span>
              <span
                className="text-zinc-100 font-semibold text-sm truncate max-w-[180px]"
                title={workflowName}
              >
                {workflowName || 'Untitled'}
              </span>
            </>
          ) : (
            <span className="text-zinc-100 font-semibold text-sm">Dashboard</span>
          )}
        </nav>
      </div>

      {/* ── Center: Navigation tabs (workspace only) ───────────────────── */}
      {isWorkspace && (
        <div className="flex items-center gap-1">
          {NAV_ITEMS.map(({ id: tabId, label, icon: Icon }) => {
            const isActive = activeTab === tabId;
            const isDisabled = tabId === 'credentials' || tabId === 'settings';

            return (
              <button
                key={tabId}
                onClick={() => !isDisabled && handleTabClick(tabId)}
                disabled={isDisabled}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                  transition-all duration-200
                  ${isActive
                    ? 'text-zinc-100 bg-zinc-800 border border-zinc-700/50 shadow-sm'
                    : isDisabled
                      ? 'text-zinc-600 cursor-not-allowed'
                      : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                  }
                `}
              >
                <Icon className="w-3.5 h-3.5" strokeWidth={1.75} />
                {label}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Right: Actions (workspace only) ────────────────────────────── */}
      {isWorkspace ? (
        <div className="flex items-center gap-2.5">
          {/* Save status indicator */}
          <div className="flex items-center gap-1 text-[10px] text-zinc-500">
            {isSaving ? (
              <><Loader2 className="w-3 h-3 animate-spin" /><span>Saving…</span></>
            ) : (
              <><Check className="w-3 h-3 text-emerald-500/70" /><span>Saved</span></>
            )}
          </div>

          {/* Save button */}
          <button
            onClick={() => saveEngine(id)}
            disabled={isSaving}
            title="Save (⌘S)"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium
              bg-zinc-900 hover:bg-zinc-800 border border-zinc-800/80 hover:border-zinc-700/60
              text-zinc-400 hover:text-zinc-200
              transition-all duration-200
              disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save
          </button>

          {/* Run button */}
          <button
            onClick={() => runEngine(id)}
            disabled={isRunning || nodeCount === 0}
            title="Run (⌘↵)"
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-semibold
              bg-zinc-100 hover:bg-white text-zinc-950
              transition-all duration-200
              disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            Run
          </button>
        </div>
      ) : (
        /* Spacer to keep breadcrumbs left-aligned on dashboard */
        <div />
      )}
    </header>
  );
}
