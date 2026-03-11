import { useState, useEffect } from 'react';
import useWorkspaceStore from '../../../store/workspaceStore';
import { NodeRegistry } from '../../Workspace/nodeRegistry'; // 👈 THE FIX IS HERE
import { Settings2, Activity, X, Check, ArrowRight } from 'lucide-react';

export default function WorkspaceRightSidebar() {
  const selectedNodeId = useWorkspaceStore((state) => state.selectedNodeId);
  const setSelectedNodeId = useWorkspaceStore((state) => state.setSelectedNodeId);
  const nodes = useWorkspaceStore((state) => state.nodes);
  const updateNodeConfig = useWorkspaceStore((state) => state.updateNodeConfig);
  
  const isExecutionLive = useWorkspaceStore((state) => state.isExecutionLive);
  const liveExecutionState = useWorkspaceStore((state) => state.liveExecutionState);
  const closeLiveExecution = useWorkspaceStore((state) => state.closeLiveExecution);
  
  const [activeTab, setActiveTab] = useState('config'); 

  // 🪄 AUTO-SWITCH: When the engine fires, snap to the Execution tab
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

  // 🛡️ BULLETPROOF VISIBILITY: Instead of returning null, we slide it out of view.
  const isOpen = selectedNodeId || activeTab === 'logs';

  return (
    <aside className={`w-[400px] h-full bg-[#050505] border-l border-[#111] flex flex-col z-20 shadow-[-20px_0_40px_rgba(0,0,0,0.7)] transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full absolute right-0 opacity-0 pointer-events-none'}`}>
      
      {/* 1. HEADER & TABS */}
      <div className="flex flex-col border-b border-[#111] bg-[#0a0a0a]">
        <div className="flex items-center justify-between p-4 pb-2 h-14">
           {selectedNode ? (
             <div className="flex items-center gap-3">
               <div className={`p-1.5 rounded-md ${nodeDef?.bgClass} ${nodeDef?.colorClass}`}>
                 {nodeDef && <nodeDef.icon className="w-4 h-4" />}
               </div>
               <h2 className="text-sm font-bold text-slate-200 tracking-wide">{selectedNode.data.label}</h2>
             </div>
           ) : (
             <div className="flex items-center gap-3">
               <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-400">
                 <Activity className="w-4 h-4 animate-pulse" />
               </div>
               <h2 className="text-sm font-bold text-slate-200 tracking-wide">Execution Monitor</h2>
             </div>
           )}
           
           <button onClick={handleContinue} className="p-1 text-slate-500 hover:text-white rounded">
             <X className="w-5 h-5" />
           </button>
        </div>
        
        {/* Tab Switcher */}
        <div className="flex px-4 gap-6 mt-2">
          {selectedNode && (
            <button onClick={() => setActiveTab('config')} className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${activeTab === 'config' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-600 hover:text-slate-300'}`}>
              <div className="flex items-center gap-2"><Settings2 className="w-3.5 h-3.5"/> Config</div>
            </button>
          )}
          <button onClick={() => setActiveTab('logs')} className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${activeTab === 'logs' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-600 hover:text-slate-300'}`}>
            <div className="flex items-center gap-2"><Activity className="w-3.5 h-3.5"/> Live Execution</div>
          </button>
        </div>
      </div>

      {/* 2. DYNAMIC CONTENT AREA */}
      <div className="flex-1 overflow-y-auto p-6 bg-[#020202] relative">
        
        {/* === CONFIGURATION TAB === */}
        {activeTab === 'config' && selectedNode && (
          <div className="animate-in fade-in duration-200">
            {ConfigPanel ? (
              <ConfigPanel 
                config={selectedNode.data?.config || {}} 
                updateConfig={(key, value) => updateNodeConfig(selectedNode.id, key, value)} 
              />
            ) : (
              <p className="text-xs text-slate-500">No configuration required.</p>
            )}
          </div>
        )}
        
        {/* === LIVE EXECUTION TIMELINE === */}
        {activeTab === 'logs' && (
          <div className="animate-in fade-in duration-200 flex flex-col h-full">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6">
              Status: <span className={
                overallStatus === 'failed' ? 'text-red-400' : 
                overallStatus === 'executed' ? 'text-green-400' : 'text-blue-400'
              }>{overallStatus}</span>
            </h3>
            
            <div className="flex flex-col flex-1">
              {nodes.map((n, index) => {
                const isLast = index === nodes.length - 1;
                
                // Read Live State from Backend
                const cursor = liveExecutionState?.cursors?.find(c => c.nodeId === n.id);
                const status = cursor ? cursor.status : (isExecutionLive ? 'pending' : 'idle');

                return (
                  <div key={n.id} className="flex gap-5 min-h-[70px]">
                    
                    {/* Visual Line & Icon */}
                    <div className="flex flex-col items-center">
                      {status === 'completed' && <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center shrink-0 z-10 shadow-[0_0_10px_rgba(37,99,235,0.4)]"><Check className="w-4 h-4 text-white" /></div>}
                      {(status === 'running' || status === 'waiting') && <div className="w-7 h-7 rounded-full bg-[#0a0a0a] border-2 border-blue-500 flex items-center justify-center shrink-0 z-10"><div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-ping"></div></div>}
                      {status === 'failed' && <div className="w-7 h-7 rounded-full bg-red-600 flex items-center justify-center shrink-0 z-10 shadow-[0_0_10px_rgba(220,38,38,0.4)]"><X className="w-4 h-4 text-white" /></div>}
                      {(status === 'pending' || status === 'idle') && <div className="w-7 h-7 rounded-full bg-[#111] border border-[#333] flex items-center justify-center shrink-0 z-10"></div>}

                      {!isLast && <div className={`w-[2px] flex-1 my-1.5 rounded-full transition-colors ${status === 'completed' ? 'bg-blue-600/50' : 'bg-[#222]'}`}></div>}
                    </div>

                    {/* Text Label */}
                    <div className="pt-1 pb-6 w-full">
                      <div className={`text-sm font-bold ${status === 'completed' ? 'text-white' : status === 'failed' ? 'text-red-400' : status === 'running' ? 'text-blue-400' : 'text-slate-500'}`}>
                        {n.data.label}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-1 uppercase tracking-widest">
                        {status === 'running' && <span className="text-blue-400 animate-pulse">Processing...</span>}
                        {status === 'failed' && <span className="text-red-400">Failed</span>}
                        {status === 'completed' && <span className="text-slate-400">Success</span>}
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>

            {/* THE ESCAPE HATCH: Appears when engine finishes or crashes */}
            {(overallStatus === 'executed' || overallStatus === 'failed') && (
              <div className="mt-auto pt-6 border-t border-[#222] animate-in slide-in-from-bottom-2">
                <button 
                  onClick={handleContinue}
                  className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all shadow-lg hover:-translate-y-0.5 ${
                    overallStatus === 'failed' 
                      ? 'bg-white text-black hover:bg-slate-200' 
                      : 'bg-blue-600 text-white hover:bg-blue-500'
                  }`}
                >
                  {overallStatus === 'failed' ? 'Fix Error & Continue' : 'Back to Canvas'} 
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
            
          </div>
        )}
      </div>
    </aside>
  );
}