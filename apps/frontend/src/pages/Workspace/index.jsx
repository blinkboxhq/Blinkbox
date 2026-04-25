import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ReactFlowProvider } from '@xyflow/react';
import { Monitor, ArrowLeft } from 'lucide-react';
import useWorkspaceStore from '../../store/workspaceStore';
import WorkspaceRightSidebar from './components/WorkspaceRightSidebar';
import logo from '../../assets/logo.svg';

// 1. Layout Components
import GlobalHeader from '../../components/GlobalHeader';
import DashboardSidebar from '../Dashboard/components/DashboardSidebar';
import Canvas from './components/Canvas';
import ExecutionTraceSidebar from './components/ExecutionTraceSidebar';
import NodeConfigModal from './components/NodeConfigModal';
import BrianPanel from './components/BrianPanel';

// Re-export from the centralized registry
export { NodeRegistry } from './nodeRegistry';

function MobileGate() {
  const navigate = useNavigate();
  return (
    <div className="w-screen h-screen bg-zinc-900 flex flex-col items-center justify-center px-8 text-center">
      <img src={logo} alt="BlinkBox" className="w-10 h-10 mb-8 opacity-60" />

      <div className="w-12 h-12 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center mb-6">
        <Monitor className="w-5 h-5 text-zinc-400" strokeWidth={1.5} />
      </div>

      <h1 className="text-white text-xl font-semibold tracking-tight mb-2">
        Open on a larger screen
      </h1>
      <p className="text-zinc-500 text-sm leading-relaxed max-w-[260px]">
        The automation canvas requires a tablet or laptop. Phone screens are too small to wire up workflows.
      </p>

      <button
        onClick={() => navigate('/dashboard')}
        className="mt-8 flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to dashboard
      </button>
    </div>
  );
}

export default function Workspace() {
  const { id } = useParams();
  const navigate = useNavigate();
  const loadEngine = useWorkspaceStore((state) => state.loadEngine);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  useEffect(() => {
    if (id && !isMobile) loadEngine(id);
  }, [id, loadEngine, isMobile]);

  if (isMobile) return <MobileGate />;

  return (
    <div className="flex h-screen overflow-hidden bg-[#1E1E20]">
      <DashboardSidebar
        user={{ name: 'User', email: '' }}
        onLogout={() => navigate('/login')}
        activeTab="workflows"
        setActiveTab={(tab) => navigate(`/dashboard?tab=${tab}`)}
        usage={null}
      />
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <GlobalHeader user={{ name: 'User' }} />
        <div className="flex-1 w-full flex overflow-hidden relative">
          <ReactFlowProvider>
            <Canvas />
            <WorkspaceRightSidebar />
            <BrianPanel />
            <NodeConfigModal />
          </ReactFlowProvider>
        </div>
      </div>
    </div>
  );
}
