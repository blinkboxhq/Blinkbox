import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Play, Save, Loader2 } from 'lucide-react';
import useWorkspaceStore from '../../../store/workspaceStore'; // 👈 Plug into the brain

export default function WorkspaceHeader() {
  const navigate = useNavigate();
  const { id } = useParams(); // 👈 Grab the automation ID from the URL

  // Pull states and actions from the store
  const workflowName = useWorkspaceStore(state => state.workflowName);
  const isSaving = useWorkspaceStore(state => state.isSaving);
  const isRunning = useWorkspaceStore(state => state.isRunning);
  const saveEngine = useWorkspaceStore(state => state.saveEngine);
  const runEngine = useWorkspaceStore(state => state.runEngine);

  return (
    <div className="relative w-full h-14 bg-[#050505] border-b border-white/5 z-50 flex items-center justify-between px-6 shadow-md shrink-0">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/dashboard')} 
          className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        
        <div className="w-px h-5 bg-white/10"></div>
        
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-bold text-white tracking-wide">
            {workflowName}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* 💾 SAVE BUTTON */}
        <button 
          onClick={() => saveEngine(id)} // 👈 Fire the API
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-bold text-slate-300 hover:text-white transition-all disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          {isSaving ? 'Saving...' : 'Save'}
        </button>

        {/* 🚀 RUN BUTTON */}
        <button 
          onClick={() => runEngine(id)} // 👈 Fire the API
          disabled={isRunning}
          className="flex items-center gap-2 px-5 py-1.5 bg-blue-600 hover:bg-blue-500 border border-blue-500/50 rounded-lg text-xs font-bold text-white shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all disabled:opacity-50"
        >
          {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
          {isRunning ? 'Executing...' : 'Run Test'}
        </button>
      </div>
    </div>
  );
}