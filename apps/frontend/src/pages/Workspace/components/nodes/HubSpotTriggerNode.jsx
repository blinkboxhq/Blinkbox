import { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Plus, Info, RefreshCw } from 'lucide-react';

const OBJECT_TYPES = [
  { value: 'contacts', label: 'Contacts' },
  { value: 'deals',    label: 'Deals' },
  { value: 'companies', label: 'Companies' },
  { value: 'tickets',  label: 'Tickets' },
];

const POLL_INTERVALS = [
  { value: '*/1 * * * *',  label: 'Every minute' },
  { value: '*/5 * * * *',  label: 'Every 5 minutes' },
  { value: '*/15 * * * *', label: 'Every 15 minutes' },
  { value: '*/30 * * * *', label: 'Every 30 minutes' },
  { value: '0 * * * *',    label: 'Every hour' },
];

export default function HubSpotTriggerNode({ config = {}, updateConfig, selected }) {
  const [activeTab, setActiveTab] = useState('setup');

  return (
    <div className={`relative flex flex-col w-[280px] bg-[#0A0A0A] rounded-xl border transition-colors shadow-2xl font-sans group ${selected ? 'border-[#FF7A59]/50' : 'border-[#2A2A2A]'}`}>
      <Handle id="output" type="source" position={Position.Right}
        className="!w-5 !h-5 !flex items-center justify-center !bg-[#111111] !border !border-[#2A2A2A] !rounded-full !opacity-0 group-hover:!opacity-100 transition-all hover:!bg-[#FF7A59] hover:!border-[#FF7A59] text-zinc-500 hover:text-white shadow-xl z-50 cursor-crosshair"
        style={{ top: '20px', right: '-10px', transform: 'translateY(-50%)' }}>
        <Plus className="w-3 h-3 pointer-events-none" />
      </Handle>

      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#2A2A2A] bg-[#111111] rounded-t-xl">
        <div className="p-1 bg-[#222] rounded-md border border-[#333]">
          <span className="text-[10px] font-black text-[#FF7A59]">HS</span>
        </div>
        <span className="text-[11px] font-semibold text-zinc-200 tracking-wide">HubSpot</span>
        <div className="ml-auto flex items-center gap-1.5">
          <RefreshCw className="w-2.5 h-2.5 text-zinc-600" />
          <span className="text-[9px] font-bold text-[#FF7A59] bg-[#FF7A59]/10 border border-[#FF7A59]/20 px-1.5 py-0.5 rounded">TRIGGER</span>
        </div>
      </div>

      <div className="flex bg-[#0a0a0a] px-3 pt-2 gap-3 border-b border-[#1a1a1a]">
        {['setup', 'filter', 'payload'].map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`pb-2 text-[9px] font-bold uppercase tracking-widest border-b-2 transition-all ${activeTab === tab ? 'border-[#FF7A59] text-[#FF7A59]' : 'border-transparent text-zinc-600 hover:text-zinc-400'}`}>
            {tab}
          </button>
        ))}
      </div>

      <div className="p-3 flex flex-col gap-3">
        {activeTab === 'setup' && (
          <>
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Private App Token</label>
              <input type="password" value={config.apiKey || ''}
                onChange={(e) => updateConfig?.('apiKey', e.target.value)}
                placeholder="pat-na1-…"
                className="w-full bg-[#111] border border-[#222] rounded-md px-2.5 py-1.5 text-xs text-zinc-300 font-mono focus:outline-none focus:border-[#FF7A59]/50 transition-colors"
              />
              <p className="text-[9px] text-zinc-600">From HubSpot → Settings → Integrations → Private Apps.</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Object Type</label>
              <div className="grid grid-cols-2 gap-1.5">
                {OBJECT_TYPES.map(({ value, label }) => {
                  const active = (config.objectType || 'contacts') === value;
                  return (
                    <button key={value} onClick={() => updateConfig?.('objectType', value)}
                      className={`py-2 rounded-lg border text-[10px] font-bold transition-all ${active ? 'bg-[#FF7A59]/10 border-[#FF7A59]/40 text-[#FF7A59]' : 'bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]'}`}>
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Poll Interval</label>
              <select value={config.pollInterval || '*/5 * * * *'}
                onChange={(e) => updateConfig?.('pollInterval', e.target.value)}
                className="w-full bg-[#111] border border-[#222] rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#FF7A59]/50 transition-colors cursor-pointer">
                {POLL_INTERVALS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-[#111] border border-[#1e1e1e] rounded-lg">
              <div>
                <span className="text-[10px] font-bold text-zinc-300 block">Trigger on updates too</span>
                <span className="text-[9px] text-zinc-600">Also fire when records are modified</span>
              </div>
              <div className={`w-8 h-4 rounded-full p-0.5 transition-colors cursor-pointer ${config.triggerOnUpdate ? 'bg-[#FF7A59]' : 'bg-zinc-700'}`}
                onClick={() => updateConfig?.('triggerOnUpdate', !config.triggerOnUpdate)}>
                <div className={`w-3 h-3 bg-white rounded-full transition-transform shadow-sm ${config.triggerOnUpdate ? 'translate-x-4' : 'translate-x-0'}`} />
              </div>
            </div>
          </>
        )}

        {activeTab === 'filter' && (
          <>
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Filter Property</label>
              <input value={config.filterProperty || ''}
                onChange={(e) => updateConfig?.('filterProperty', e.target.value)}
                placeholder="lifecyclestage"
                className="w-full bg-[#111] border border-[#222] rounded-md px-2.5 py-1.5 text-xs text-zinc-300 font-mono focus:outline-none focus:border-[#FF7A59]/50 transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Filter Value</label>
              <input value={config.filterValue || ''}
                onChange={(e) => updateConfig?.('filterValue', e.target.value)}
                placeholder="lead"
                className="w-full bg-[#111] border border-[#222] rounded-md px-2.5 py-1.5 text-xs text-zinc-300 font-mono focus:outline-none focus:border-[#FF7A59]/50 transition-colors"
              />
              <p className="text-[9px] text-zinc-600">Only fire when this property equals this value.</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Max Records per Poll</label>
              <input type="number" min="1" max="100" value={config.limit || 20}
                onChange={(e) => updateConfig?.('limit', Number(e.target.value))}
                className="w-full bg-[#111] border border-[#222] rounded-md px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-[#FF7A59]/50 transition-colors"
              />
            </div>
          </>
        )}

        {activeTab === 'payload' && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Info className="w-3 h-3 text-zinc-600" />
              <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Available in workflow as</span>
            </div>
            <div className="flex flex-col gap-1 p-2.5 bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg">
              {[
                ['$trigger.id', 'HubSpot object ID'],
                ['$trigger.createdAt', 'When the record was created'],
                ['$trigger.updatedAt', 'When the record was last updated'],
                ['$trigger.properties.email', 'Contact email (contacts only)'],
                ['$trigger.properties.firstname', 'First name (contacts)'],
                ['$trigger.properties.lastname', 'Last name (contacts)'],
                ['$trigger.properties.dealname', 'Deal name (deals)'],
                ['$trigger.properties.dealstage', 'Deal stage (deals)'],
                ['$trigger.properties.amount', 'Deal amount (deals)'],
              ].map(([key, desc]) => (
                <div key={key} className="flex items-baseline gap-2">
                  <span className="text-[10px] font-mono text-[#FF7A59] shrink-0">{key}</span>
                  <span className="text-[9px] text-zinc-600">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
