import { useState } from 'react';
import { Info, RefreshCw } from 'lucide-react';
import imgAirtable from '../../../../assets/Airtable--Streamline-Svg-Logos.svg';

const POLL_INTERVALS = [
  { value: '*/1 * * * *',  label: 'Every minute' },
  { value: '*/5 * * * *',  label: 'Every 5 minutes' },
  { value: '*/15 * * * *', label: 'Every 15 minutes' },
  { value: '*/30 * * * *', label: 'Every 30 minutes' },
  { value: '0 * * * *',    label: 'Every hour' },
];

export default function AirtableTriggerNode({ config = {}, updateConfig, nodeId }) {
  const [activeTab, setActiveTab] = useState('setup');

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#2A2A2A] bg-[#111111] rounded-t-xl">
        <div className="p-1 bg-[#222] rounded-md border border-[#333]">
          <img src={imgAirtable} className="w-3 h-3 object-contain" alt="Airtable" />
        </div>
        <span className="text-[11px] font-semibold text-zinc-200 tracking-wide">Airtable</span>
        <div className="ml-auto flex items-center gap-1.5">
          <RefreshCw className="w-2.5 h-2.5 text-zinc-600" />
          <span className="text-[9px] font-bold text-[#F65858] bg-[#F65858]/10 border border-[#F65858]/20 px-1.5 py-0.5 rounded">TRIGGER</span>
        </div>
      </div>

      <div className="flex bg-[#0a0a0a] px-3 pt-2 gap-3 border-b border-[#1a1a1a]">
        {['setup', 'filter', 'payload'].map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`pb-2 text-[9px] font-bold uppercase tracking-widest border-b-2 transition-all ${activeTab === tab ? 'border-[#F65858] text-[#F65858]' : 'border-transparent text-zinc-600 hover:text-zinc-400'}`}>
            {tab}
          </button>
        ))}
      </div>

      <div className="p-3 flex flex-col gap-3">
        {activeTab === 'setup' && (
          <>
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Personal Access Token</label>
              <input type="password" value={config.apiKey || ''}
                onChange={(e) => updateConfig?.('apiKey', e.target.value)}
                placeholder="pat…"
                className="w-full bg-[#111] border border-[#222] rounded-md px-2.5 py-1.5 text-xs text-zinc-300 font-mono focus:outline-none focus:border-[#F65858]/50 transition-colors"
              />
              <p className="text-[9px] text-zinc-600">From airtable.com/create/tokens — needs <span className="font-mono text-zinc-500">data.records:read</span> scope.</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Base ID</label>
              <input value={config.baseId || ''}
                onChange={(e) => updateConfig?.('baseId', e.target.value)}
                placeholder="appXXXXXXXXXXXXXX"
                className="w-full bg-[#111] border border-[#222] rounded-md px-2.5 py-1.5 text-xs text-zinc-300 font-mono focus:outline-none focus:border-[#F65858]/50 transition-colors"
              />
              <p className="text-[9px] text-zinc-600">Found in the Airtable URL: airtable.com/<span className="font-mono text-zinc-500">appXXX</span>/...</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Table Name or ID</label>
              <input value={config.tableId || ''}
                onChange={(e) => updateConfig?.('tableId', e.target.value)}
                placeholder="tblXXXXXXXXXXXXXX or Table Name"
                className="w-full bg-[#111] border border-[#222] rounded-md px-2.5 py-1.5 text-xs text-zinc-300 font-mono focus:outline-none focus:border-[#F65858]/50 transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Poll Interval</label>
              <select value={config.pollInterval || '*/5 * * * *'}
                onChange={(e) => updateConfig?.('pollInterval', e.target.value)}
                className="w-full bg-[#111] border border-[#222] rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#F65858]/50 transition-colors cursor-pointer">
                {POLL_INTERVALS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </>
        )}

        {activeTab === 'filter' && (
          <>
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">View Name (optional)</label>
              <input value={config.viewName || ''}
                onChange={(e) => updateConfig?.('viewName', e.target.value)}
                placeholder="Grid view"
                className="w-full bg-[#111] border border-[#222] rounded-md px-2.5 py-1.5 text-xs text-zinc-300 font-mono focus:outline-none focus:border-[#F65858]/50 transition-colors"
              />
              <p className="text-[9px] text-zinc-600">Only return records visible in this view.</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Filter Formula (optional)</label>
              <input value={config.filterFormula || ''}
                onChange={(e) => updateConfig?.('filterFormula', e.target.value)}
                placeholder='{Status} = "New"'
                className="w-full bg-[#111] border border-[#222] rounded-md px-2.5 py-1.5 text-xs text-zinc-300 font-mono focus:outline-none focus:border-[#F65858]/50 transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Max Records per Poll</label>
              <input type="number" min="1" max="100" value={config.maxRecords || 20}
                onChange={(e) => updateConfig?.('maxRecords', Number(e.target.value))}
                className="w-full bg-[#111] border border-[#222] rounded-md px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-[#F65858]/50 transition-colors"
              />
            </div>

            <div className="flex items-center justify-between p-2.5 bg-[#111] border border-[#1e1e1e] rounded-lg">
              <div>
                <span className="text-[10px] font-bold text-zinc-300 block">Trigger on updates too</span>
                <span className="text-[9px] text-zinc-600">Fire when existing records are modified</span>
              </div>
              <div className={`w-8 h-4 rounded-full p-0.5 transition-colors cursor-pointer ${config.triggerOnUpdate ? 'bg-[#F65858]' : 'bg-zinc-700'}`}
                onClick={() => updateConfig?.('triggerOnUpdate', !config.triggerOnUpdate)}>
                <div className={`w-3 h-3 bg-white rounded-full transition-transform shadow-sm ${config.triggerOnUpdate ? 'translate-x-4' : 'translate-x-0'}`} />
              </div>
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
                ['$trigger.id', 'Airtable record ID (recXXXXXX)'],
                ['$trigger.createdTime', 'When the record was created (ISO)'],
                ['$trigger.fields', 'Object with all field values'],
                ['$trigger.fields.Name', 'Value of the "Name" field (example)'],
                ['$trigger.fields.Status', 'Value of the "Status" field (example)'],
                ['$trigger._meta.baseId', 'Base ID the record came from'],
                ['$trigger._meta.tableId', 'Table ID the record came from'],
              ].map(([key, desc]) => (
                <div key={key} className="flex items-baseline gap-2">
                  <span className="text-[10px] font-mono text-[#F65858] shrink-0">{key}</span>
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
