import { useState } from 'react';
import { Timer, ShieldAlert, Zap, Clock, AlertTriangle } from 'lucide-react';
import SmartJsonEditor from '../../../../components/ui/SmartJsonEditor';

export default function TriggerNode({ config = {}, updateConfig }) {
  const [activeTab, setActiveTab] = useState('schedule');
  
  // Default fallbacks
  const schedule = config.schedule || '* * * * *';
  const forceExecution = config.forceExecution ?? true;

  return (
    <div className="flex flex-col gap-5 w-full">
      
      {/* 1. NUCLEAR HEADER SUMMARY */}
      <div className="flex items-center gap-3 p-4 bg-orange-500/5 border border-orange-500/20 rounded-xl relative overflow-hidden">
        {/* Animated hazard striping */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, #f97316 10px, #f97316 20px)' }}></div>
        
        <div className="p-2 rounded-lg shrink-0 text-orange-400 bg-orange-500/10 border-orange-500/30 border z-10">
          <Timer className="w-5 h-5 animate-pulse" />
        </div>
        <div className="flex flex-col overflow-hidden z-10">
          <span className="text-sm font-bold text-orange-400 truncate">
            Indestructible Schedule
          </span>
          <span className="text-[10px] text-orange-600/70 uppercase tracking-widest mt-0.5 font-mono">
            {schedule} • {config.timezone || 'UTC'}
          </span>
        </div>
      </div>

      {/* 2. TAB NAVIGATION */}
      <div className="flex bg-[#0a0a0a] p-1 rounded-lg border border-[#222]">
        <button 
          onClick={() => setActiveTab('schedule')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'schedule' ? 'bg-[#222] text-orange-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          <Clock className="w-3.5 h-3.5" /> Timing
        </button>
        <button 
          onClick={() => setActiveTab('resilience')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'resilience' ? 'bg-[#222] text-orange-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          <ShieldAlert className="w-3.5 h-3.5" /> Armor
        </button>
        <button 
          onClick={() => setActiveTab('fallback')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'fallback' ? 'bg-[#222] text-orange-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          <Zap className="w-3.5 h-3.5" /> Inject
        </button>
      </div>

      {/* 3. TAB CONTENTS */}
      <div className="flex flex-col relative min-h-[250px]">
        
        {/* --- SCHEDULE TAB --- */}
        <div className={`absolute inset-0 transition-opacity duration-200 flex flex-col gap-4 ${activeTab === 'schedule' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Cron Expression</label>
            <input 
              value={schedule}
              onChange={(e) => updateConfig('schedule', e.target.value)}
              placeholder="* * * * *"
              className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2 text-xs text-orange-300 focus:outline-none focus:border-orange-500 transition-colors font-mono"
            />
            <div className="flex gap-2 mt-2">
              <button onClick={() => updateConfig('schedule', '* * * * *')} className="text-[10px] bg-[#222] hover:bg-[#333] text-zinc-400 px-2 py-1 rounded">Every Minute</button>
              <button onClick={() => updateConfig('schedule', '0 * * * *')} className="text-[10px] bg-[#222] hover:bg-[#333] text-zinc-400 px-2 py-1 rounded">Hourly</button>
              <button onClick={() => updateConfig('schedule', '0 0 * * *')} className="text-[10px] bg-[#222] hover:bg-[#333] text-zinc-400 px-2 py-1 rounded">Daily</button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Timezone</label>
            <select 
              value={config.timezone || 'UTC'} 
              onChange={(e) => updateConfig('timezone', e.target.value)}
              className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-orange-500 transition-colors cursor-pointer appearance-none"
            >
              <option value="UTC">UTC (Default)</option>
              <option value="America/New_York">America/New_York (EST/EDT)</option>
              <option value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</option>
              <option value="Europe/London">Europe/London (GMT/BST)</option>
              <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
            </select>
          </div>
        </div>

        {/* --- RESILIENCE TAB --- */}
        <div className={`absolute inset-0 transition-opacity duration-200 flex flex-col gap-4 ${activeTab === 'resilience' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
          <div className="flex items-start gap-3 p-3 bg-red-500/5 border border-red-500/20 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold text-red-400">Force Execution</span>
              <span className="text-[10px] text-zinc-400 leading-relaxed">
                If the scheduling engine fails to provide valid initialization data, this node will swallow the error and force the workflow to start anyway using synthetic data.
              </span>
            </div>
            <div 
              className={`w-10 h-5 rounded-full p-1 transition-colors cursor-pointer shrink-0 mt-1 ${forceExecution ? 'bg-orange-500' : 'bg-zinc-700'}`}
              onClick={() => updateConfig('forceExecution', !forceExecution)}
            >
              <div className={`w-3 h-3 bg-white rounded-full transition-transform ${forceExecution ? 'translate-x-5' : 'translate-x-0'}`} />
            </div>
          </div>
        </div>

        {/* --- FALLBACK TAB --- */}
        <div className={`absolute inset-0 transition-opacity duration-200 flex flex-col gap-2 ${activeTab === 'fallback' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
           <div className="mb-2 text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
             Synthetic Injection Payload
           </div>
           <SmartJsonEditor
            label="Fallback Data"
            value={config.fallbackPayload || '{\n  "warning": "Data reconstructed by Nuclear Core",\n  "status": "forced_start"\n}'}
            onChange={(val) => updateConfig('fallbackPayload', val)}
            rows={8}
          />
        </div>

      </div>
    </div>
  );
}