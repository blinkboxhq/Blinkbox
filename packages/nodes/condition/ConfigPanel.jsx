import { CheckCheck, XCircle, Plus, Trash2 } from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';

const OPERATORS = [
  { value: 'equals',       label: '== equals' },
  { value: 'notEquals',    label: '!= not equals' },
  { value: 'gt',           label: '> greater than' },
  { value: 'gte',          label: '>= greater or equal' },
  { value: 'lt',           label: '< less than' },
  { value: 'lte',          label: '<= less or equal' },
  { value: 'contains',     label: 'contains' },
  { value: 'notContains',  label: 'not contains' },
  { value: 'startsWith',   label: 'starts with' },
  { value: 'endsWith',     label: 'ends with' },
  { value: 'exists',       label: 'exists' },
  { value: 'isEmpty',      label: 'is empty' },
  { value: 'isNotEmpty',   label: 'is not empty' },
];

const NO_RIGHT = new Set(['exists', 'notExists', 'isEmpty', 'isNotEmpty']);

const emptyCondition = () => ({ left: '', operator: 'equals', right: '' });

export default function ConditionNode({ config = {}, updateConfig, nodeId }) {
  const mode = config.mode || 'simple'; // 'simple' | 'and' | 'or'
  const condition = config.condition || emptyCondition();
  const conditions = config.conditions || [emptyCondition()];

  const setMode = (m) => {
    updateConfig('mode', m);
    if (m === 'simple') updateConfig('condition', emptyCondition());
    else updateConfig('conditions', [emptyCondition(), emptyCondition()]);
  };

  const updateCondition = (key, val) => updateConfig('condition', { ...condition, [key]: val });

  const updateMulti = (i, key, val) => {
    const next = conditions.map((c, idx) => idx === i ? { ...c, [key]: val } : c);
    updateConfig('conditions', next);
  };

  const addCondition = () => updateConfig('conditions', [...conditions, emptyCondition()]);
  const removeCondition = (i) => updateConfig('conditions', conditions.filter((_, idx) => idx !== i));

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <CheckCheck className="w-4 h-4 text-emerald-400" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Condition</div>
          <div className="text-[11px] text-zinc-500">Routes to True or False output</div>
        </div>
      </div>

      {/* Output preview */}
      <div className="flex gap-2">
        <div className="flex-1 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[11px] font-bold text-emerald-400">TRUE path</span>
        </div>
        <div className="flex-1 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
          <XCircle className="w-3.5 h-3.5 text-red-400" />
          <span className="text-[11px] font-bold text-red-400">FALSE path</span>
        </div>
      </div>

      {/* Mode picker */}
      <div className="flex gap-1.5">
        {['simple', 'and', 'or'].map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider border transition-all ${
              mode === m
                ? 'bg-violet-500/20 border-violet-500/40 text-violet-300'
                : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'
            }`}
          >
            {m === 'simple' ? 'Simple' : m.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Condition builder */}
      {mode === 'simple' ? (
        <ConditionRow condition={condition} onChange={(c) => updateConfig('condition', c)} nodeId={nodeId} />
      ) : (
        <div className="flex flex-col gap-2">
          {conditions.map((c, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              {i > 0 && (
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px bg-zinc-800" />
                  <span className="text-[10px] font-bold text-zinc-500 uppercase">{mode}</span>
                  <div className="flex-1 h-px bg-zinc-800" />
                </div>
              )}
              <ConditionRow
                condition={c}
                onChange={(updated) => {
                  const next = conditions.map((x, idx) => idx === i ? updated : x);
                  updateConfig('conditions', next);
                }}
                onRemove={() => removeCondition(i)}
                showRemove={conditions.length > 1}
                nodeId={nodeId}
              />
            </div>
          ))}
          <button
            onClick={addCondition}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 transition-all text-[11px] font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            Add condition
          </button>
        </div>
      )}
    </div>
  );
}

function ConditionRow({ condition, onChange, onRemove, showRemove, nodeId }) {
  const needsRight = !NO_RIGHT.has(condition.operator);
  return (
    <div className="flex flex-col gap-1.5">
      <SmartVariableInput
        value={condition.left}
        onChange={(v) => onChange({ ...condition, left: v })}
        placeholder="{{ $json.field }}"
        nodeId={nodeId}
      />
      <div className="flex gap-1.5 items-center">
        <select
          value={condition.operator}
          onChange={(e) => onChange({ ...condition, operator: e.target.value })}
          className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-[11px] text-zinc-200 font-medium focus:outline-none focus:border-zinc-600 cursor-pointer"
        >
          {OPERATORS.map((op) => (
            <option key={op.value} value={op.value}>{op.label}</option>
          ))}
        </select>
        {showRemove && (
          <button onClick={onRemove} className="p-1.5 text-zinc-600 hover:text-red-400 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {needsRight && (
        <SmartVariableInput
          value={condition.right}
          onChange={(v) => onChange({ ...condition, right: v })}
          placeholder="value"
          nodeId={nodeId}
        />
      )}
    </div>
  );
}
