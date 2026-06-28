import { useMemo, useCallback } from 'react';
import { MousePointerClick, Plus, Trash2, Zap, ShieldAlert } from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';

const DEFAULT_FIELDS = [{ key: 'status', value: 'triggered' }];

function parseFields(mockPayload) {
  if (!mockPayload) return DEFAULT_FIELDS;
  try {
    const obj = JSON.parse(mockPayload);
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
      const rows = Object.entries(obj).map(([key, v]) => ({
        key,
        value: typeof v === 'string' ? v : JSON.stringify(v),
      }));
      return rows.length ? rows : DEFAULT_FIELDS;
    }
  } catch {
    /* fall through to default */
  }
  return DEFAULT_FIELDS;
}

function serializeFields(fields) {
  const obj = {};
  for (const { key, value } of fields) {
    if (!key.trim()) continue;
    let parsed = value;
    if (value === 'true') parsed = true;
    else if (value === 'false') parsed = false;
    else if (value !== '' && !Number.isNaN(Number(value)) && !value.includes('{{')) parsed = Number(value);
    obj[key.trim()] = parsed;
  }
  return JSON.stringify(obj, null, 2);
}

export default function TriggerNode({ config = {}, updateConfig, nodeId }) {
  const forceExecution = config.forceExecution ?? true;
  const fields = useMemo(() => parseFields(config.mockPayload), [config.mockPayload]);

  const commit = useCallback(
    (next) => updateConfig?.('mockPayload', serializeFields(next)),
    [updateConfig],
  );

  const setRow = (i, patch) => commit(fields.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  const addRow = () => commit([...fields, { key: '', value: '' }]);
  const removeRow = (i) => {
    const next = fields.filter((_, idx) => idx !== i);
    commit(next.length ? next : DEFAULT_FIELDS);
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
          <MousePointerClick className="w-[18px] h-[18px] text-emerald-400" strokeWidth={1.8} />
        </div>
        <div className="min-w-0">
          <h3 className="text-[14px] font-semibold text-white leading-tight">Trigger Manually</h3>
          <p className="text-[11px] text-neutral-500 leading-snug mt-0.5">Run this workflow on demand from the canvas</p>
        </div>
      </div>

      {/* Test payload builder */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Test Payload</label>
          <span className="text-[10px] text-neutral-600">injected on Run</span>
        </div>

        <div className="flex flex-col gap-2">
          {fields.map((row, i) => (
            <div key={i} className="bb-card group/row flex items-center gap-2 rounded-xl p-1.5">
              <input
                value={row.key}
                onChange={(e) => setRow(i, { key: e.target.value })}
                placeholder="field"
                spellCheck={false}
                className="bb-input bb-glow-border w-[34%] shrink-0 rounded-lg px-2.5 py-2 text-[12px] font-mono text-emerald-300 placeholder:text-neutral-600"
              />
              <span className="text-neutral-700 text-[12px] shrink-0">:</span>
              <div className="flex-1 min-w-0">
                <SmartVariableInput
                  value={row.value}
                  onChange={(val) => setRow(i, { value: val })}
                  placeholder="value or {{ token }}"
                  nodeId={nodeId}
                  className="bb-input bb-glow-border rounded-lg px-2.5 py-2 text-[12px]"
                />
              </div>
              <button
                onClick={() => removeRow(i)}
                className="shrink-0 p-1.5 rounded-lg text-neutral-700 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover/row:opacity-100"
                title="Remove field"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={addRow}
          className="bb-btn-ghost flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl text-[12px] font-semibold text-neutral-400 hover:text-white transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add field
        </button>
      </div>

      {/* Force execution */}
      <div className="bb-card flex items-start gap-3 rounded-xl p-3.5">
        <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" strokeWidth={1.8} />
        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
          <span className="text-[12px] font-semibold text-zinc-200">Force execution</span>
          <span className="text-[10px] text-neutral-500 leading-relaxed">Start the run even if a node fails to initialize.</span>
        </div>
        <button
          onClick={() => updateConfig?.('forceExecution', !forceExecution)}
          className={`w-10 h-5 rounded-full p-0.5 transition-colors shrink-0 mt-0.5 ${forceExecution ? 'bg-emerald-500' : 'bg-zinc-700'}`}
        >
          <span className={`block w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${forceExecution ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
      </div>

      {/* Output reference */}
      <div className="bb-card rounded-xl p-3.5 flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <Zap className="w-3 h-3 text-emerald-400" />
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Available downstream</span>
        </div>
        {[
          ['{{$trigger.triggeredAt}}', 'ISO timestamp of the run'],
          ['{{$trigger.triggerType}}', 'Always "manual"'],
          ['{{$trigger.<field>}}', 'Any field from the payload above'],
        ].map(([token, desc]) => (
          <div key={token} className="flex items-baseline gap-2">
            <code className="text-[10px] font-mono text-emerald-400 shrink-0">{token}</code>
            <span className="text-[10px] text-neutral-600 truncate">{desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
