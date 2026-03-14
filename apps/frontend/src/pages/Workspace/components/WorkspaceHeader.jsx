import { useNavigate, useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { ArrowLeft, Play, Save, Loader2, Check, Zap } from 'lucide-react';
import useWorkspaceStore from '../../../store/workspaceStore';

export default function WorkspaceHeader() {
  const navigate = useNavigate();
  const { id } = useParams();

  const workflowName = useWorkspaceStore(state => state.workflowName);
  const isSaving = useWorkspaceStore(state => state.isSaving);
  const isRunning = useWorkspaceStore(state => state.isRunning);
  const saveEngine = useWorkspaceStore(state => state.saveEngine);
  const runEngine = useWorkspaceStore(state => state.runEngine);
  const nodes = useWorkspaceStore(state => state.nodes);
  const edges = useWorkspaceStore(state => state.edges);
  const liveExecutionState = useWorkspaceStore(state => state.liveExecutionState);

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
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [id, saveEngine, runEngine]);

  const statusBadgeColor =
    executionStatus === 'failed' ? 'bg-red-500/10 border-red-500/30 text-red-400' :
    executionStatus === 'executed' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
    executionStatus === 'running' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' :
    'bg-neutral-900/50 border-neutral-800 text-neutral-500';

  return (
    <div className="relative w-full h-16 bg-[#050505] border-b border-white/5 z-50 flex flex-col shadow-[0_4px_12px_rgba(0,0,0,0.4)] shrink-0">
      {/* Top row: Breadcrumb + Status badges */}
      <div className="flex-1 flex items-center justify-between px-6 gap-4">

        {/* Left: Breadcrumb navigation */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-1.5 text-slate-500 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
            title="Back to Dashboard (Escape)"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="w-px h-5 bg-white/10"></div>

          <nav className="flex items-center gap-2 text-xs">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-slate-500 hover:text-slate-300 transition-colors"
            >
              Workflows
            </button>
            <span className="text-slate-700">/</span>
            <span className="text-white font-semibold truncate max-w-xs" title={workflowName}>
              {workflowName}
            </span>
          </nav>
        </div>

        {/* Right: Status badges + Actions */}
        <div className="flex items-center gap-4">

          {/* Node count badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-neutral-900/50 border border-neutral-800 rounded-lg">
            <Zap className="w-3.5 h-3.5 text-neutral-500" />
            <span className="text-xs font-mono text-neutral-400">{nodeCount} nodes</span>
          </div>

          {/* Execution status badge */}
          <div className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg transition-colors ${statusBadgeColor}`}>
            {executionStatus === 'running' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {executionStatus === 'executed' && <Check className="w-3.5 h-3.5" />}
            <span className="text-xs font-bold uppercase tracking-wider">
              {executionStatus === 'executed' ? 'Success' : executionStatus === 'running' ? 'Executing' : executionStatus === 'failed' ? 'Failed' : 'Idle'}
            </span>
          </div>

          {/* Save status indicator */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] text-slate-500">
            {isSaving ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Check className="w-3 h-3 text-emerald-500" />
                <span>Saved</span>
              </>
            )}
          </div>

          {/* 💾 SAVE BUTTON */}
          <button
            onClick={() => saveEngine(id)}
            disabled={isSaving}
            title="Save workflow (Cmd+S)"
            className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-bold text-slate-300 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save
          </button>

          {/* 🚀 RUN BUTTON */}
          <button
            onClick={() => runEngine(id)}
            disabled={isRunning || nodeCount === 0}
            title="Execute workflow (Cmd+Enter)"
            className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 border border-blue-500/50 rounded-lg text-xs font-bold text-white shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
          >
            {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            Run Test
          </button>
        </div>
      </div>

      {/* Bottom row: Keyboard hints */}
      <div className="h-0.5 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
    </div>
  );
}