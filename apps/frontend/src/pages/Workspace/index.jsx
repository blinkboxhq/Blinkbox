import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ReactFlowProvider } from '@xyflow/react';
import { Monitor, ArrowLeft } from 'lucide-react';
import useWorkspaceStore from '../../store/workspaceStore';
import WorkspaceRightSidebar from './components/WorkspaceRightSidebar';
import logo from '../../assets/logo.svg';

import DashboardSidebar from '../Dashboard/components/DashboardSidebar';
import Canvas from './components/Canvas';
import NodeConfigModal from './components/NodeConfigModal';
import BrianPanel from './components/BrianPanel';
import BottomChatPanel from './components/BottomChatPanel';
import WorkspaceHeader from './components/WorkspaceHeader';
import CommandPalette from './components/CommandPalette';

export { NodeRegistry } from './nodeRegistry';

// ── Resize hook ────────────────────────────────────────────────────────────────
function useResize({ initial, min, max, direction = 'horizontal' }) {
  const [size, setSize] = useState(initial);
  const ref = useRef(null);

  const onMouseDown = useCallback((e) => {
    e.preventDefault();
    const startPos = direction === 'horizontal' ? e.clientX : e.clientY;
    const startSize = size;

    const onMove = (ev) => {
      const delta = direction === 'horizontal'
        ? ev.clientX - startPos
        : startPos - ev.clientY;
      setSize(Math.min(max, Math.max(min, startSize + delta)));
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [size, min, max, direction]);

  return [size, onMouseDown, ref];
}

// ── Vertical drag handle ───────────────────────────────────────────────────────
function VHandle({ onMouseDown, side = 'right' }) {
  return (
    <div
      onMouseDown={onMouseDown}
      className={`w-1 h-full flex-shrink-0 cursor-col-resize group relative z-10
        ${side === 'right' ? 'border-r border-[#333]' : 'border-l border-[#333]'}
        hover:bg-white/[0.06] active:bg-violet-500/20 transition-colors`}
    >
      <div className={`absolute inset-y-0 ${side === 'right' ? '-right-1' : '-left-1'} w-3`} />
    </div>
  );
}

function MobileGate() {
  const navigate = useNavigate();
  return (
    <div className="w-screen h-screen bg-zinc-900 flex flex-col items-center justify-center px-8 text-center">
      <img src={logo} alt="BlinkBox" className="w-10 h-10 mb-8 opacity-60" />
      <div className="w-12 h-12 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center mb-6">
        <Monitor className="w-5 h-5 text-zinc-400" strokeWidth={1.5} />
      </div>
      <h1 className="text-white text-xl font-semibold tracking-tight mb-2">Open on a larger screen</h1>
      <p className="text-zinc-500 text-sm leading-relaxed max-w-[260px]">
        The automation canvas requires a tablet or laptop.
      </p>
      <button onClick={() => navigate('/dashboard')} className="mt-8 flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to dashboard
      </button>
    </div>
  );
}

export default function Workspace() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const loadEngine = useWorkspaceStore(s => s.loadEngine);
  const panels     = useWorkspaceStore(s => s.panels);

  const brianPrompt = location.state?.brianPrompt || null;
  useEffect(() => {
    if (brianPrompt) navigate(location.pathname, { replace: true, state: {} });
  }, [brianPrompt]); // eslint-disable-line

  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640);

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  useEffect(() => {
    if (id && !isMobile) loadEngine(id);
  }, [id, loadEngine, isMobile]);

  // Auto-save every 5 s. Reads live store state so it catches every kind of
  // change (node moves, config edits, edge changes, etc.) without needing
  // to track a generation counter.
  useEffect(() => {
    if (!id || isMobile) return;
    const interval = setInterval(() => {
      const { isLoading, isSaving, nodes, saveEngine } = useWorkspaceStore.getState();
      if (isLoading || isSaving) return;           // still loading or mid-save
      if (!nodes.find(n => n.data?.type === 'trigger')) return; // no trigger = nothing to save
      saveEngine(id, true);                        // silent — no success toast
    }, 5000);
    return () => clearInterval(interval);
  }, [id, isMobile]);

  // ── Per-panel resize state ───────────────────────────────────────────────
  const [chatH,     onChatResizeStart] = useResize({ initial: 220, min: 140, max: 480, direction: 'vertical' });
  const [brianW,    onBrianResize]     = useResize({ initial: 340, min: 260, max: 600, direction: 'horizontal' });
  const [rightW,    onRightResize]     = useResize({ initial: 320, min: 220, max: 520, direction: 'horizontal' });

  if (isMobile) return <MobileGate />;

  return (
    <div className="flex h-screen overflow-hidden bg-[#1E1E20]">

      {/* Left sidebar — has its own internal collapse toggle */}
      {panels.leftSidebar && (
        <DashboardSidebar
          user={{ name: 'User', email: '' }}
          onLogout={() => navigate('/login')}
          activeTab="workflows"
          setActiveTab={tab => navigate(`/dashboard?tab=${tab}`)}
          usage={null}
        />
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col relative overflow-hidden min-w-0">
        <WorkspaceHeader />

        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          {/* Canvas row */}
          <div className="flex-1 flex overflow-hidden min-h-0 relative">
            <ReactFlowProvider>
              <Canvas />

              {/* Right sidebar with drag handle */}
              <WorkspaceRightSidebar width={rightW} onResizeStart={onRightResize} />
              <NodeConfigModal />
              <CommandPalette />
            </ReactFlowProvider>

            {/* Brian panel with drag handle on its left edge */}
            {panels.brian !== false && (
              <BrianPanel width={brianW} onResizeStart={onBrianResize} initialPrompt={brianPrompt} />
            )}
          </div>

          {/* Bottom chat panel (already has its own resize) */}
          {panels.bottomChat && (
            <BottomChatPanel height={chatH} onResizeStart={onChatResizeStart} />
          )}
        </div>
      </div>
    </div>
  );
}
