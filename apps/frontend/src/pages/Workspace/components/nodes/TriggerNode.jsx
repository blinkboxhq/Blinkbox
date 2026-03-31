import { useState } from 'react';
import { Timer, Settings, MoreHorizontal, Clock, ShieldAlert, Zap, AlertTriangle, Plus } from 'lucide-react';
import { Handle, Position } from '@xyflow/react';
import SmartJsonEditor from '../../../../components/ui/SmartJsonEditor';

export default function TriggerNode({ config = {}, updateConfig, selected }) {
  const [activeTab, setActiveTab] = useState('schedule');

  const schedule = config.schedule || '* * * * *';
  const forceExecution = config.forceExecution ?? true;

  return (
    <div className={`relative flex flex-col w-[280px] bg-[#0A0A0A] rounded-xl border transition-colors shadow-2xl font-sans group ${selected ? 'border-orange-500/50' : 'border-[#2A2A2A]'}`}>

      {/* BULLETPROOF HANDLE: !opacity forces visibility, transform fixes the thread origin, pointer-events-none stops drag hijacking */}
      {/* BULLETPROOF HANDLE */}
      <Handle
        id="output"  
        type="source"
        position={Position.Right}
        className="!w-5 !h-5 !flex items-center justify-center !bg-[#111111] !border !border-[#2A2A2A] !rounded-full !opacity-0 group-hover:!opacity-100 transition-all hover:!bg-orange-500 hover:!border-orange-500 text-zinc-500 hover:text-white shadow-xl z-50 cursor-crosshair"
        style={{ 
          top: '20px', 
          right: '-10px',
          transform: 'translateY(-50%)' 
        }}
      >
        <Plus className="w-3 h-3 pointer-events-none" />
      </Handle>

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#2A2A2A] bg-[#111111] rounded-t-xl">
        <div className="flex items-center gap-2">
          <div className="p-1 bg-[#222] rounded-md border border-[#333]">
            <Timer className="w-3 h-3 text-zinc-300" />
          </div>
          <span className="text-[11px] font-semibold text-zinc-200 tracking-wide">
            Trigger
          </span>
        </div>

        {/* Action Buttons (Visible on hover) */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <button className="p-1.5 hover:bg-[#2A2A2A] rounded-md text-zinc-500 hover:text-zinc-200 transition-colors">
            <Settings className="w-3.5 h-3.5" />
          </button>
          <button className="p-1.5 hover:bg-[#2A2A2A] rounded-md text-zinc-500 hover:text-zinc-200 transition-colors">
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Body Container */}
      <div className="flex p-3">

        {/* LEFT COLUMN: Dot + Line indicator */}
        <div className="flex flex-col items-center mr-3 w-2.5 shrink-0 mt-1">
          <div className="w-2 h-2 rounded-full bg-[#f59e0b] shadow-[0_0_8px_rgba(245,158,11,0.5)] ring-[3px] ring-[#0A0A0A] shrink-0" />
          <div className="w-[1.5px] h-full bg-[#2A2A2A] rounded-full mt-1.5" />
        </div>

        {/* RIGHT COLUMN: Config content */}
        <div className="flex flex-col flex-1 min-w-0 pb-1">

          {/* Tab Navigation */}
          <div className="flex bg-[#0a0a0a] p-1 rounded-lg border border-[#222] mb-3 shrink-0">
            <button
              onClick={() => setActiveTab('schedule')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1 text-[9px] font-bold rounded-md transition-all ${activeTab === 'schedule' ? 'bg-[#222] text-orange-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <Clock className="w-2.5 h-2.5" /> Timing
            </button>
            <button
              onClick={() => setActiveTab('resilience')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1 text-[9px] font-bold rounded-md transition-all ${activeTab === 'resilience' ? 'bg-[#222] text-orange-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <ShieldAlert className="w-2.5 h-2.5" /> Armor
            </button>
            <button
              onClick={() => setActiveTab('fallback')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1 text-[9px] font-bold rounded-md transition-all ${activeTab === 'fallback' ? 'bg-[#222] text-orange-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <Zap className="w-2.5 h-2.5" /> Inject
            </button>
          </div>

          {/* Tab Contents */}
          <div className="flex flex-col w-full">

            {/* Schedule Tab */}
            {activeTab === 'schedule' && (
              <div className="flex flex-col gap-3 animate-in fade-in duration-200">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Cron Expression</label>
                  <input
                    value={schedule}
                    onChange={(e) => updateConfig?.('schedule', e.target.value)}
                    placeholder="* * * * *"
                    className="w-full bg-[#111111] border border-[#222] rounded-md px-2.5 py-1.5 text-xs text-orange-300 focus:outline-none focus:border-orange-500/50 transition-colors font-mono"
                  />
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    <button onClick={() => updateConfig?.('schedule', '* * * * *')} className="text-[9px] bg-[#161616] hover:bg-[#222] text-zinc-400 px-1.5 py-1 rounded border border-[#2A2A2A] transition-colors">Every Min</button>
                    <button onClick={() => updateConfig?.('schedule', '0 * * * *')} className="text-[9px] bg-[#161616] hover:bg-[#222] text-zinc-400 px-1.5 py-1 rounded border border-[#2A2A2A] transition-colors">Hourly</button>
                    <button onClick={() => updateConfig?.('schedule', '0 0 * * *')} className="text-[9px] bg-[#161616] hover:bg-[#222] text-zinc-400 px-1.5 py-1 rounded border border-[#2A2A2A] transition-colors">Daily</button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 mt-1">
                  <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Timezone</label>
                  <select
                    value={config.timezone || 'UTC'}
                    onChange={(e) => updateConfig?.('timezone', e.target.value)}
                    className="w-full bg-[#111111] border border-[#222] rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500/50 transition-colors cursor-pointer appearance-none"
                  >
                    <option value="UTC">UTC (Default)</option>
                    <option value="America/New_York">EST/EDT</option>
                    <option value="America/Los_Angeles">PST/PDT</option>
                    <option value="Europe/London">GMT/BST</option>
                    <option value="Asia/Kolkata">IST</option>
                  </select>
                </div>
              </div>
            )}

            {/* Resilience Tab */}
            {activeTab === 'resilience' && (
              <div className="flex items-start gap-2 p-2.5 bg-red-500/5 border border-red-500/15 rounded-lg animate-in fade-in duration-200">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1 flex-1">
                  <span className="text-[10px] font-bold text-red-400">Force Execution</span>
                  <span className="text-[9px] text-zinc-500 leading-relaxed">
                    Swallow init errors and force-start.
                  </span>
                </div>
                <div
                  className={`w-8 h-4 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 mt-1 ${forceExecution ? 'bg-orange-500' : 'bg-zinc-700'}`}
                  onClick={() => updateConfig?.('forceExecution', !forceExecution)}
                >
                  <div className={`w-3 h-3 bg-white rounded-full transition-transform shadow-sm ${forceExecution ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
              </div>
            )}

            {/* Fallback / Inject Tab */}
            {activeTab === 'fallback' && (
              <div className="flex flex-col gap-2 animate-in fade-in duration-200">
                <label className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">
                  Synthetic Payload
                </label>
                <SmartJsonEditor
                  label="Fallback Data"
                  value={config.fallbackPayload || '{\n  "status": "forced_start"\n}'}
                  onChange={(val) => updateConfig?.('fallbackPayload', val)}
                  rows={6}
                />
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}