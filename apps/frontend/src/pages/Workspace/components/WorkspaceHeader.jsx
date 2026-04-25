import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ArrowLeft, Play, Save, Loader2, Check, Zap, Clock, Keyboard, Power, PanelLeft, PanelBottom, PanelRight, LayoutTemplate } from 'lucide-react';
import useWorkspaceStore from '../../../store/workspaceStore';
import VersionHistoryPanel from './VersionHistoryPanel';
import KeyboardShortcutsPanel from '../../../components/KeyboardShortcutsPanel';

export default function WorkspaceHeader() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [versionPanelOpen, setVersionPanelOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

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

  const nodeCount = nodes.length;
  const executionStatus = liveExecutionState?.status || (isRunning ? 'running' : 'idle');

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

  const statusBadgeColor =
    executionStatus === 'failed' ? 'bg-red-500/5 border-red-500/20 text-red-400' :
    executionStatus === 'executed' ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' :
    executionStatus === 'running' ? 'bg-blue-500/5 border-blue-500/20 text-blue-400' :
    'bg-zinc-900/50 border-zinc-800 text-zinc-500';

  return (
    <>
    <div className="relative w-full h-14 bg-zinc-950 border-b border-zinc-800/60 z-50 flex items-center justify-between px-6 shrink-0">

      {/* Left: Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/dashboard')}
          className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
          title="Back to Dashboard"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="w-px h-4 bg-zinc-800" />

        <nav className="flex items-center gap-2 text-xs">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Workflows
          </button>
          <span className="text-zinc-700">/</span>
          <span className="text-zinc-200 font-medium tracking-tight truncate max-w-xs" title={workflowName}>
            {workflowName}
          </span>
        </nav>
      </div>

      {/* Centre: Panel toggles */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-0.5 bg-zinc-900/80 border border-zinc-800 rounded-lg p-1">
        {[
          { key: 'leftSidebar', icon: PanelLeft,   title: 'Left sidebar' },
          { key: 'canvas',      icon: LayoutTemplate, title: 'Canvas (always on)' },
          { key: 'bottomChat',  icon: PanelBottom, title: 'Chat panel' },
          { key: 'nodeTree',    icon: PanelRight,  title: 'Node tree' },
        ].map(({ key, icon: Icon, title }) => {
          const on = key === 'canvas' ? true : panels[key];
          return (
            <button
              key={key}
              onClick={() => key !== 'canvas' && togglePanel(key)}
              title={title}
              className={`p-1.5 rounded-md transition-all ${on ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800'} ${key === 'canvas' ? 'cursor-default' : ''}`}
            >
              <Icon className="w-3.5 h-3.5" />
            </button>
          );
        })}
      </div>

      {/* Right: Status + Actions */}
      <div className="flex items-center gap-4">

        {/* Node count */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/50 border border-zinc-800 rounded-lg">
          <Zap className="w-3 h-3 text-zinc-500" />
          <span className="text-[11px] font-mono text-zinc-400">{nodeCount} nodes</span>
        </div>

        {/* Execution status */}
        <div className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg transition-colors ${statusBadgeColor}`}>
          {executionStatus === 'running' && <Loader2 className="w-3 h-3 animate-spin" />}
          {executionStatus === 'executed' && <Check className="w-3 h-3" />}
          <span className="text-[11px] font-semibold uppercase tracking-widest">
            {executionStatus === 'executed' ? 'Success' : executionStatus === 'running' ? 'Running' : executionStatus === 'failed' ? 'Failed' : 'Idle'}
          </span>
        </div>

        {/* Save indicator */}
        <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
          {isSaving ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Saving</span>
            </>
          ) : (
            <>
              <Check className="w-3 h-3 text-emerald-500/70" />
              <span>Saved</span>
            </>
          )}
        </div>

        {/* Shortcuts button */}
        <button
          onClick={() => setShortcutsOpen(true)}
          title="Keyboard shortcuts (?)"
          className="p-1.5 text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
        >
          <Keyboard className="w-3.5 h-3.5" />
        </button>

        {/* History button */}
        <button
          onClick={() => setVersionPanelOpen(true)}
          title="Version history"
          className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-[11px] font-semibold text-zinc-400 hover:text-zinc-100 transition-colors"
        >
          <Clock className="w-3.5 h-3.5" />
          History
        </button>

        {/* Save button */}
        <button
          onClick={() => saveEngine(id)}
          disabled={isSaving}
          title="Save (Cmd+S)"
          className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-[11px] font-semibold text-zinc-300 hover:text-zinc-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Save
        </button>

        {/* Activate toggle */}
        <button
          onClick={() => activateEngine(id)}
          disabled={isActivating || nodeCount === 0}
          title={isActive ? "Deactivate trigger" : "Activate trigger — go live"}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            isActive
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
          }`}
        >
          {isActivating
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <Power className="w-3.5 h-3.5" />}
          {isActive ? 'Active' : 'Activate'}
        </button>

        {/* Run button */}
        <button
          onClick={() => runEngine(id)}
          disabled={isRunning || nodeCount === 0}
          title="Run (Cmd+Enter)"
          className="flex items-center gap-2 px-4 py-1.5 bg-zinc-100 hover:bg-white text-zinc-950 rounded-lg text-[11px] font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
          Run Test
        </button>
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
    </>
  );
}
