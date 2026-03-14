import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ReactFlowProvider } from '@xyflow/react';
import useWorkspaceStore from '../../store/workspaceStore';

// 1. Layout Components
import WorkspaceHeader from './components/WorkspaceHeader';
import WorkspaceLeftSidebar from './components/WorkspaceLeftSidebar';
import WorkspaceRightSidebar from './components/WorkspaceRightSidebar';
import Canvas from './components/Canvas';
import ExecutionTraceSidebar from './components/ExecutionTraceSidebar';

// 🚀 SINGLE SOURCE OF TRUTH: Re-export from the centralized registry
// Every component (LeftSidebar, RightSidebar, CustomNode) should import from here
export { NodeRegistry } from './nodeRegistry';

export default function Workspace() {
  const { id } = useParams();
  const loadEngine = useWorkspaceStore((state) => state.loadEngine);

  // 📥 Boot up the engine and fetch the data when the page loads
  useEffect(() => {
    if (id) loadEngine(id);
  }, [id, loadEngine]);

  return (

    <div className="w-screen h-screen bg-[#020202] overflow-hidden flex flex-col">
      <WorkspaceHeader />
      <div className="flex-1 w-full flex overflow-hidden">
        {/* ReactFlowProvider MUST be the parent of Canvas and Sidebars */}
        <ReactFlowProvider>
          <WorkspaceLeftSidebar />
          <Canvas />
          <WorkspaceRightSidebar />
          <ExecutionTraceSidebar />
        </ReactFlowProvider>
      </div>
    </div>
  );
}
