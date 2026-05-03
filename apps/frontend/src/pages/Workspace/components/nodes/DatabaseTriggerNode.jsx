import { useState } from 'react';
import { Database, ChevronDown, Info } from 'lucide-react';

const POLL_INTERVALS = [
  { label: 'Every 30 seconds', value: '*/1 * * * *' }, // BullMQ handles sub-minute via every:ms
  { label: 'Every minute',     value: '* * * * *' },
  { label: 'Every 5 minutes',  value: '*/5 * * * *' },
  { label: 'Every 15 minutes', value: '*/15 * * * *' },
  { label: 'Every 30 minutes', value: '*/30 * * * *' },
];

const DB_TYPES = [
  { value: 'postgres', label: 'PostgreSQL' },
  { value: 'mysql',    label: 'MySQL / MariaDB' },
];

const WATCH_MODES = [
  { value: 'new_rows',     label: 'New rows inserted' },
  { value: 'updated_rows', label: 'Rows updated' },
  { value: 'new_or_updated', label: 'New or updated rows' },
];

export default function DatabaseTriggerNode({ config = {}, updateConfig, nodeId }) {
  const [activeTab, setActiveTab] = useState('setup');

  const dbType = config.dbType || 'postgres';
  const connectionString = config.connectionString || '';
  const tableName = config.tableName || '';
  const watchMode = config.watchMode || 'new_rows';
  const timestampColumn = config.timestampColumn || 'created_at';
  const pollInterval = config.pollInterval || '* * * * *';
  const maxRowsPerPoll = config.maxRowsPerPoll || 100;

  return (
    <div className="flex flex-col">

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#2A2A2A] bg-[#111111] rounded-t-xl">
        <div className="p-1 bg-[#222] rounded-md border border-[#333]">
          <Database className="w-3 h-3 text-emerald-400" />
        </div>
        <span className="text-[11px] font-semibold text-zinc-200 tracking-wide">Database Trigger</span>
      </div>

      {/* Tabs */}
      <div className="flex bg-[#0a0a0a] px-3 pt-2 gap-3 border-b border-[#1a1a1a]">
        {['setup', 'query', 'payload'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-2 text-[9px] font-bold uppercase tracking-widest border-b-2 transition-all ${activeTab === tab ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-zinc-600 hover:text-zinc-400'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="p-3 flex flex-col gap-3">

        {activeTab === 'setup' && (
          <>
            {/* DB type */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Database</label>
              <div className="flex rounded-lg overflow-hidden border border-[#222]">
                {DB_TYPES.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => updateConfig?.('dbType', value)}
                    className={`flex-1 py-1.5 text-[10px] font-semibold transition-all ${dbType === value ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#111] text-zinc-600 hover:text-zinc-400'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Connection string */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Connection String</label>
              <input
                value={connectionString}
                onChange={(e) => updateConfig?.('connectionString', e.target.value)}
                placeholder={dbType === 'postgres' ? 'postgresql://user:pass@host/db' : 'mysql://user:pass@host/db'}
                className="w-full bg-[#111] border border-[#222] rounded-md px-2.5 py-1.5 text-xs text-zinc-300 font-mono focus:outline-none focus:border-emerald-500/50 transition-colors placeholder:text-zinc-700"
              />
              <p className="text-[9px] text-zinc-600">Or use a credential reference: <span className="font-mono text-zinc-500">{'{{ $credential.dbUrl }}'}</span></p>
            </div>

            {/* Table name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Table</label>
              <input
                value={tableName}
                onChange={(e) => updateConfig?.('tableName', e.target.value)}
                placeholder="orders"
                className="w-full bg-[#111] border border-[#222] rounded-md px-2.5 py-1.5 text-xs text-zinc-300 font-mono focus:outline-none focus:border-emerald-500/50 transition-colors"
              />
            </div>

            {/* Poll interval */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Poll every</label>
              <div className="relative">
                <select
                  value={pollInterval}
                  onChange={(e) => updateConfig?.('pollInterval', e.target.value)}
                  className="w-full appearance-none bg-[#111] border border-[#222] rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500/50 transition-colors cursor-pointer pr-7"
                >
                  {POLL_INTERVALS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600 pointer-events-none" />
              </div>
            </div>
          </>
        )}

        {activeTab === 'query' && (
          <>
            {/* Watch mode */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Watch for</label>
              <div className="relative">
                <select
                  value={watchMode}
                  onChange={(e) => updateConfig?.('watchMode', e.target.value)}
                  className="w-full appearance-none bg-[#111] border border-[#222] rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500/50 transition-colors cursor-pointer pr-7"
                >
                  {WATCH_MODES.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600 pointer-events-none" />
              </div>
            </div>

            {/* Timestamp column */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
                {watchMode === 'new_rows' ? 'Created-at column' : watchMode === 'updated_rows' ? 'Updated-at column' : 'Timestamp column'}
              </label>
              <input
                value={timestampColumn}
                onChange={(e) => updateConfig?.('timestampColumn', e.target.value)}
                placeholder={watchMode === 'new_rows' ? 'created_at' : 'updated_at'}
                className="w-full bg-[#111] border border-[#222] rounded-md px-2.5 py-1.5 text-xs text-zinc-300 font-mono focus:outline-none focus:border-emerald-500/50 transition-colors"
              />
              <p className="text-[9px] text-zinc-600">Must be a TIMESTAMP or DATETIME column. BlinkBox queries rows where this column &gt; last poll time.</p>
            </div>

            {/* Max rows */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Max rows per poll</label>
              <input
                type="number"
                value={maxRowsPerPoll}
                min={1}
                max={1000}
                onChange={(e) => updateConfig?.('maxRowsPerPoll', Number(e.target.value))}
                className="w-full bg-[#111] border border-[#222] rounded-md px-2.5 py-1.5 text-xs text-zinc-300 font-mono focus:outline-none focus:border-emerald-500/50 transition-colors"
              />
              <p className="text-[9px] text-zinc-600">One workflow run per row. Capped to prevent runaway triggers.</p>
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
                ['$trigger.row.*', 'All columns of the matched row'],
                ['$trigger.row.id', 'Primary key (if named "id")'],
                ['$trigger.tableName', 'Table that was watched'],
                ['$trigger.event', '"new_row" | "updated_row"'],
                ['$trigger.detectedAt', 'ISO timestamp of detection'],
              ].map(([key, desc]) => (
                <div key={key} className="flex items-baseline gap-2">
                  <span className="text-[10px] font-mono text-emerald-400 shrink-0">{key}</span>
                  <span className="text-[9px] text-zinc-600">{desc}</span>
                </div>
              ))}
            </div>
            <p className="text-[9px] text-zinc-600 leading-relaxed mt-1">
              All column values from the matching row are available as <span className="font-mono text-zinc-500">$trigger.row.column_name</span>.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
