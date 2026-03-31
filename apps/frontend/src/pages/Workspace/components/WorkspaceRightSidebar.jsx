import { useState, useEffect } from 'react';
import useWorkspaceStore from '../../../store/workspaceStore';
import { NodeRegistry } from '../../Workspace/nodeRegistry';
import { Settings2, Activity, X, Check, ArrowRight } from 'lucide-react';
import TriggerPicker from './TriggerPicker';


export default function WorkspaceRightSidebar() {
  const selectedNodeId = useWorkspaceStore((state) => state.selectedNodeId);
  const setSelectedNodeId = useWorkspaceStore((state) => state.setSelectedNodeId);
  const isRightSidebarOpen = useWorkspaceStore((state) => state.isRightSidebarOpen);
  const setRightSidebarOpen = useWorkspaceStore((state) => state.setRightSidebarOpen);
  const isTriggerPickerOpen = useWorkspaceStore((state) => state.isTriggerPickerOpen);
  const setTriggerPickerOpen = useWorkspaceStore((state) => state.setTriggerPickerOpen);
  const nodes = useWorkspaceStore((state) => state.nodes);
  const edges = useWorkspaceStore((state) => state.edges);
  const updateNodeConfig = useWorkspaceStore((state) => state.updateNodeConfig);

  const isExecutionLive = useWorkspaceStore((state) => state.isExecutionLive);
  const liveExecutionState = useWorkspaceStore((state) => state.liveExecutionState);
  const closeLiveExecution = useWorkspaceStore((state) => state.closeLiveExecution);

  const [activeTab, setActiveTab] = useState('config');

  useEffect(() => {
    if (isExecutionLive) setActiveTab('logs');
  }, [isExecutionLive]);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const nodeDef = selectedNode ? NodeRegistry[selectedNode.data.backendType] : null;
  const ConfigPanel = nodeDef?.ConfigPanel;

  const overallStatus = liveExecutionState?.status || (isExecutionLive ? 'starting' : 'idle');

  const handleContinue = () => {
    if (closeLiveExecution) closeLiveExecution();
    setActiveTab('config');
    if (!selectedNodeId) setSelectedNodeId(null);
  };

  const isOpen = selectedNodeId || activeTab === 'logs' || isTriggerPickerOpen;

  // ── Trigger Picker Mode ──────────────────────────────────────────────────
  if (isTriggerPickerOpen) {
    return (
      <aside className={`w-[400px] h-full bg-zinc-950 border-l border-zinc-800/60 flex flex-col z-20 transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full absolute right-0 opacity-0 pointer-events-none'}`}>
        <TriggerPicker />
      </aside>
    );
  }

  return (
    <aside className={`w-[400px] h-full bg-zinc-950 border-l border-zinc-800/60 flex flex-col z-20 transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full absolute right-0 opacity-0 pointer-events-none'}`}>

      {/* Header & Tabs */}
      <div className="flex flex-col border-b border-zinc-800/60">
        <div className="flex items-center justify-between px-6 py-4">
          {selectedNode ? (
            <div className="flex items-center gap-3">
              <div className={`p-1.5 rounded-lg ${nodeDef?.bgClass} ${nodeDef?.colorClass}`}>
                {nodeDef && <nodeDef.icon className="w-4 h-4" />}
              </div>
              <h2 className="text-[13px] font-medium text-zinc-200 tracking-tight">{selectedNode.data.label}</h2>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
                <Activity className="w-4 h-4" />
              </div>
              <h2 className="text-[13px] font-medium text-zinc-200 tracking-tight">Execution Monitor</h2>
            </div>
          )}

          <button onClick={handleContinue} className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex px-6 gap-8">
          {selectedNode && (
            <button onClick={() => setActiveTab('config')} className={`pb-3 text-xs font-semibold uppercase tracking-widest border-b-2 transition-all ${activeTab === 'config' ? 'border-zinc-400 text-zinc-200' : 'border-transparent text-zinc-600 hover:text-zinc-400'}`}>
              <div className="flex items-center gap-2"><Settings2 className="w-3.5 h-3.5" /> Config</div>
            </button>
          )}
          <button onClick={() => setActiveTab('logs')} className={`pb-3 text-xs font-semibold uppercase tracking-widest border-b-2 transition-all ${activeTab === 'logs' ? 'border-zinc-400 text-zinc-200' : 'border-transparent text-zinc-600 hover:text-zinc-400'}`}>
            <div className="flex items-center gap-2"><Activity className="w-3.5 h-3.5" /> Execution</div>
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6 bg-zinc-950 relative">

        {/* Configuration Tab */}
        {activeTab === 'config' && selectedNode && (
          <div>
            {ConfigPanel ? (
              <ConfigPanel
                config={selectedNode.data?.config || {}}
                updateConfig={(key, value) => updateNodeConfig(selectedNode.id, key, value)}
                nodeId={selectedNode.id}
                edges={edges}
              />
            ) : (
              <p className="text-xs text-zinc-500">No configuration required.</p>
            )}
          </div>
        )}

        {/* Live Execution Timeline */}
        {activeTab === 'logs' && (
          <div className="flex flex-col h-full">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-6">
              Status: <span className={
                overallStatus === 'failed' ? 'text-red-400' :
                overallStatus === 'executed' ? 'text-emerald-400' : 'text-blue-400'
              }>{overallStatus}</span>
            </h3>

            <div className="flex flex-col flex-1">
              {nodes.map((n, index) => {
                const isLast = index === nodes.length - 1;
                const cursor = liveExecutionState?.cursors?.find(c => c.nodeId === n.id);
                const status = cursor ? cursor.status : (isExecutionLive ? 'pending' : 'idle');

                return (
                  <div key={n.id} className="flex gap-4 min-h-[60px]">
                    {/* Timeline Rail */}
                    <div className="flex flex-col items-center">
                      {status === 'completed' && <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center shrink-0 z-10"><Check className="w-3 h-3 text-white" strokeWidth={3} /></div>}
                      {(status === 'running' || status === 'waiting') && <div className="w-6 h-6 rounded-full bg-zinc-950 border-2 border-blue-500 flex items-center justify-center shrink-0 z-10"><div className="w-2 h-2 bg-blue-500 rounded-full animate-ping" /></div>}
                      {status === 'failed' && <div className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center shrink-0 z-10"><X className="w-3 h-3 text-white" strokeWidth={3} /></div>}
                      {(status === 'pending' || status === 'idle') && <div className="w-6 h-6 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center shrink-0 z-10" />}

                      {!isLast && <div className={`w-[1.5px] flex-1 my-1 rounded-full transition-colors ${status === 'completed' ? 'bg-emerald-600/40' : 'bg-zinc-800'}`} />}
                    </div>

                    {/* Label */}
                    <div className="pt-0.5 pb-4 w-full">
                      <div className={`text-[13px] font-medium ${status === 'completed' ? 'text-zinc-100' : status === 'failed' ? 'text-red-400' : status === 'running' ? 'text-blue-400' : 'text-zinc-500'}`}>
                        {n.data.label}
                      </div>
                      <div className="text-[10px] text-zinc-600 font-mono mt-0.5 uppercase tracking-widest">
                        {status === 'running' && <span className="text-blue-400/70 animate-pulse">Processing...</span>}
                        {status === 'failed' && (
                          <div className="flex flex-col gap-1">
                            <span className="text-red-400/70">Failed</span>
                            {cursor?.errorMessage && (
                              <div className="bg-red-950/30 border border-red-900/30 rounded-md px-2.5 py-1.5 mt-1 text-[11px] text-red-300 font-mono normal-case tracking-normal break-all leading-relaxed">
                                {cursor.errorMessage}
                              </div>
                            )}
                          </div>
                        )}
                        {status === 'completed' && <span className="text-zinc-500">Success</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer Action */}
            {(overallStatus === 'executed' || overallStatus === 'failed') && (
              <div className="mt-auto pt-6 border-t border-zinc-800/60">
                <button
                  onClick={handleContinue}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                    overallStatus === 'failed'
                      ? 'bg-zinc-100 text-zinc-950 hover:bg-white'
                      : 'bg-emerald-600 text-white hover:bg-emerald-500'
                  }`}
                >
                  {overallStatus === 'failed' ? 'Fix Error & Continue' : 'Back to Canvas'}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
