import { useState } from 'react';
import { Timer, Play, Settings, MoreHorizontal, Clock, ShieldAlert, Zap, AlertTriangle } from 'lucide-react';
import { Handle, Position } from '@xyflow/react';
import SmartJsonEditor from '../../../../components/ui/SmartJsonEditor';

export default function TriggerNode({ config = {}, updateConfig, selected }) {
  const [activeTab, setActiveTab] = useState('schedule');

  const schedule = config.schedule || '* * * * *';
  const forceExecution = config.forceExecution ?? true;

  return (
    <div className={`relative flex flex-col w-[320px] bg-[#0A0A0A] rounded-xl border transition-colors shadow-2xl font-sans group ${selected ? 'border-orange-500/50' : 'border-[#2A2A2A]'}`}>

      {/* React Flow Source Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-orange-500 border-2 border-[#0A0A0A]"
      />

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#2A2A2A] bg-[#111111] rounded-t-xl">
        <div className="flex items-center gap-2">
          <div className="p-1 bg-[#222] rounded-md border border-[#333]">
            <Timer className="w-3.5 h-3.5 text-zinc-300" />
          </div>
          <span className="text-xs font-semibold text-zinc-200 tracking-wide">
            Trigger
          </span>
        </div>

        {/* Action Buttons (Visible on hover) */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button className="p-1.5 hover:bg-[#2A2A2A] rounded-md text-zinc-500 hover:text-zinc-200 transition-colors">
            <Play className="w-3.5 h-3.5" />
          </button>
          <button className="p-1.5 hover:bg-[#2A2A2A] rounded-md text-zinc-500 hover:text-zinc-200 transition-colors">
            <Settings className="w-3.5 h-3.5" />
          </button>
          <button className="p-1.5 hover:bg-[#2A2A2A] rounded-md text-zinc-500 hover:text-zinc-200 transition-colors">
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Body Container */}
      <div className="relative flex p-4 min-h-[120px]">

        {/* LEFT COLUMN: Dot + Line indicator */}
        <div className="relative flex flex-col items-center mr-4 w-2.5">
          <div className="absolute top-1 w-2.5 h-2.5 rounded-full bg-[#f59e0b] shadow-[0_0_8px_rgba(245,158,11,0.5)] ring-4 ring-[#0A0A0A] z-10" />
          <div className="absolute top-4 bottom-0 w-[1.5px] bg-[#2A2A2A] rounded-full" />
        </div>

        {/* RIGHT COLUMN: Config content */}
        <div className="flex flex-col flex-1 pb-2">

          {/* Tab Navigation */}
          <div className="flex bg-[#0a0a0a] p-1 rounded-lg border border-[#222] mb-4">
            <button
              onClick={() => setActiveTab('schedule')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-bold rounded-md transition-all ${activeTab === 'schedule' ? 'bg-[#222] text-orange-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <Clock className="w-3 h-3" /> Timing
            </button>
            <button
              onClick={() => setActiveTab('resilience')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-bold rounded-md transition-all ${activeTab === 'resilience' ? 'bg-[#222] text-orange-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <ShieldAlert className="w-3 h-3" /> Armor
            </button>
            <button
              onClick={() => setActiveTab('fallback')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-bold rounded-md transition-all ${activeTab === 'fallback' ? 'bg-[#222] text-orange-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <Zap className="w-3 h-3" /> Inject
            </button>
          </div>

          {/* Tab Contents */}
          <div className="relative min-h-[200px]">

            {/* Schedule Tab */}
            <div className={`absolute inset-0 transition-opacity duration-200 flex flex-col gap-4 ${activeTab === 'schedule' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Cron Expression</label>
                <input
                  value={schedule}
                  onChange={(e) => updateConfig?.('schedule', e.target.value)}
                  placeholder="* * * * *"
                  className="w-full bg-[#111111] border border-[#222] rounded-lg px-3 py-2 text-xs text-orange-300 focus:outline-none focus:border-orange-500/50 transition-colors font-mono"
                />
                <div className="flex gap-1.5 mt-2">
                  <button onClick={() => updateConfig?.('schedule', '* * * * *')} className="text-[10px] bg-[#161616] hover:bg-[#222] text-zinc-400 px-2 py-1 rounded border border-[#2A2A2A] transition-colors">Every Min</button>
                  <button onClick={() => updateConfig?.('schedule', '0 * * * *')} className="text-[10px] bg-[#161616] hover:bg-[#222] text-zinc-400 px-2 py-1 rounded border border-[#2A2A2A] transition-colors">Hourly</button>
                  <button onClick={() => updateConfig?.('schedule', '0 0 * * *')} className="text-[10px] bg-[#161616] hover:bg-[#222] text-zinc-400 px-2 py-1 rounded border border-[#2A2A2A] transition-colors">Daily</button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Timezone</label>
                <select
                  value={config.timezone || 'UTC'}
                  onChange={(e) => updateConfig?.('timezone', e.target.value)}
                  className="w-full bg-[#111111] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-orange-500/50 transition-colors cursor-pointer appearance-none"
                >
                  <option value="UTC">UTC (Default)</option>
                  <option value="America/New_York">America/New_York (EST/EDT)</option>
                  <option value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</option>
                  <option value="Europe/London">Europe/London (GMT/BST)</option>
                  <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                </select>
              </div>
            </div>

            {/* Resilience Tab */}
            <div className={`absolute inset-0 transition-opacity duration-200 flex flex-col gap-4 ${activeTab === 'resilience' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
              <div className="flex items-start gap-3 p-3 bg-red-500/5 border border-red-500/15 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1 flex-1">
                  <span className="text-[11px] font-bold text-red-400">Force Execution</span>
                  <span className="text-[10px] text-zinc-500 leading-relaxed">
                    Swallow initialization errors and force-start with synthetic data.
                  </span>
                </div>
                <div
                  className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 mt-1 ${forceExecution ? 'bg-orange-500' : 'bg-zinc-700'}`}
                  onClick={() => updateConfig?.('forceExecution', !forceExecution)}
                >
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${forceExecution ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
              </div>
            </div>

            {/* Fallback / Inject Tab */}
            <div className={`absolute inset-0 transition-opacity duration-200 flex flex-col gap-2 ${activeTab === 'fallback' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
              <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
                Synthetic Injection Payload
              </label>
              <SmartJsonEditor
                label="Fallback Data"
                value={config.fallbackPayload || '{\n  "warning": "Data reconstructed by Trigger Core",\n  "status": "forced_start"\n}'}
                onChange={(val) => updateConfig?.('fallbackPayload', val)}
                rows={8}
              />
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
