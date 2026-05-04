import { GitBranch, PlusCircle, Trash2, PlusCircle as PlusIcon } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';

const OPERATORS = [
  { group: 'Equality', ops: [
    { value: 'equals', label: '== equals' },
    { value: 'notEquals', label: '!= not equals' },
    { value: 'looseEquals', label: '≈ loose equals' },
  ]},
  { group: 'Numeric', ops: [
    { value: 'gt', label: '> greater than' },
    { value: 'gte', label: '>= greater or equal' },
    { value: 'lt', label: '< less than' },
    { value: 'lte', label: '<= less or equal' },
  ]},
  { group: 'String', ops: [
    { value: 'contains', label: 'contains' },
    { value: 'notContains', label: 'not contains' },
    { value: 'startsWith', label: 'starts with' },
    { value: 'endsWith', label: 'ends with' },
    { value: 'matches', label: 'matches regex' },
    { value: 'notMatches', label: 'not matches regex' },
  ]},
  { group: 'Existence', ops: [
    { value: 'exists', label: 'exists' },
    { value: 'notExists', label: 'not exists' },
    { value: 'isEmpty', label: 'is empty' },
    { value: 'isNotEmpty', label: 'is not empty' },
  ]},
  { group: 'Array', ops: [
    { value: 'arrayContains', label: 'array contains' },
    { value: 'arrayNotContains', label: 'array not contains' },
    { value: 'arrayLength', label: 'array length ==' },
    { value: 'arrayLengthGt', label: 'array length >' },
    { value: 'arrayLengthLt', label: 'array length <' },
  ]},
];

const NO_RIGHT_OPERATORS = new Set(['exists', 'notExists', 'isEmpty', 'isNotEmpty']);

function ConditionRow({ condition, onChange, onRemove, showRemove }) {
  const needsRight = !NO_RIGHT_OPERATORS.has(condition.operator);
  return (
    <div className="grid grid-cols-[1fr_auto_1fr_auto] gap-1.5 items-center">
      <SmartVariableInput value={condition.left} onChange={(v) => onChange({ ...condition, left: v })} placeholder="{{ field }}" />
      <select
        value={condition.operator}
        onChange={(e) => onChange({ ...condition, operator: e.target.value })}
        className="bg-[#111] border border-[#333] rounded-md px-1.5 py-1.5 text-[10px] text-white font-bold focus:outline-none cursor-pointer min-w-[90px]"
      >
        {OPERATORS.map(group => (
          <optgroup key={group.group} label={group.group}>
            {group.ops.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
          </optgroup>
        ))}
      </select>
      {needsRight
        ? <SmartVariableInput value={condition.right} onChange={(v) => onChange({ ...condition, right: v })} placeholder="value" />
        : <div className="text-[10px] text-zinc-600 italic px-1">—</div>
      }
      {showRemove && (
        <button onClick={onRemove} className="p-1 text-zinc-600 hover:text-red-400 transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

function RouteConditionBuilder({ route, updateRoute, index }) {
  const conditionMode = route.conditionMode || 'simple'; // 'simple' | 'and' | 'or'

  const setMode = (mode) => {
    if (mode === 'simple') {
      updateRoute(index, 'conditionMode', 'simple');
      updateRoute(index, 'conditions', undefined);
    } else {
      updateRoute(index, 'conditionMode', mode);
      if (!route.conditions || route.conditions.length === 0) {
        updateRoute(index, 'conditions', [
          { left: route.left || '', operator: route.operator || 'equals', right: route.right || '' },
          { left: '', operator: 'equals', right: '' },
        ]);
      }
    }
  };

  const updateSubCondition = (ci, updated) => {
    const next = (route.conditions || []).map((c, i) => i === ci ? updated : c);
    updateRoute(index, 'conditions', next);
  };

  const addSubCondition = () => {
    updateRoute(index, 'conditions', [...(route.conditions || []), { left: '', operator: 'equals', right: '' }]);
  };

  const removeSubCondition = (ci) => {
    updateRoute(index, 'conditions', (route.conditions || []).filter((_, i) => i !== ci));
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Mode picker */}
      <div className="flex items-center gap-1">
        {['simple', 'and', 'or'].map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase transition-colors ${conditionMode === m ? 'bg-pink-500/30 text-pink-300 border border-pink-500/40' : 'bg-[#111] text-zinc-500 border border-[#333] hover:text-zinc-300'}`}
          >
            {m === 'simple' ? 'Single' : m.toUpperCase()}
          </button>
        ))}
        <span className="text-[9px] text-zinc-600 ml-1">condition mode</span>
      </div>

      {conditionMode === 'simple' ? (
        <ConditionRow
          condition={{ left: route.left || '', operator: route.operator || 'equals', right: route.right || '' }}
          onChange={(c) => { updateRoute(index, 'left', c.left); updateRoute(index, 'operator', c.operator); updateRoute(index, 'right', c.right); }}
          showRemove={false}
        />
      ) : (
        <div className="flex flex-col gap-1.5">
          <div className="text-[9px] text-zinc-500 font-bold uppercase">
            {conditionMode === 'and' ? 'ALL must be true (AND)' : 'ANY must be true (OR)'}
          </div>
          {(route.conditions || []).map((cond, ci) => (
            <ConditionRow
              key={ci}
              condition={cond}
              onChange={(c) => updateSubCondition(ci, c)}
              onRemove={() => removeSubCondition(ci)}
              showRemove={(route.conditions || []).length > 2}
            />
          ))}
          <button onClick={addSubCondition} className="flex items-center gap-1 text-[10px] text-pink-400 hover:text-pink-300 transition-colors mt-0.5">
            <PlusIcon className="w-3 h-3" /> Add condition
          </button>
        </div>
      )}
    </div>
  );
}

export default function LogicRouterNode({ config = {}, updateConfig, nodeId }) {
  const routes = config.routes || [];

  const addRoute = () => updateConfig('routes', [...routes, {
    path: `path_${routes.length + 1}`,
    left: '',
    operator: 'equals',
    right: '',
    conditionMode: 'simple',
  }]);

  const updateRoute = (index, field, value) => {
    const updated = routes.map((r, i) => (i === index ? { ...r, [field]: value } : r));
    updateConfig('routes', updated);
  };

  const removeRoute = (index) => updateConfig('routes', routes.filter((_, i) => i !== index));

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-pink-500/10 border border-pink-500/20 rounded-xl relative overflow-hidden shadow-[0_0_20px_rgba(244,114,182,0.05)]">
        <div className="p-2 bg-pink-500/20 border border-pink-500/30 rounded-lg text-pink-400 shrink-0 z-10">
          <GitBranch className="w-5 h-5" />
        </div>
        <div className="flex flex-col z-10">
          <span className="text-sm font-bold text-pink-400 tracking-wide">Logic Router</span>
          <span className="text-[10px] text-zinc-400 truncate mt-0.5">Route data based on conditions — supports AND/OR/regex</span>
        </div>
      </div>

      {/* Routes List */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Routing Paths</label>
          <button onClick={addRoute} className="flex items-center gap-1 text-[10px] font-bold text-pink-400 hover:text-pink-300 transition-colors uppercase">
            <PlusCircle className="w-3 h-3" /> Add Path
          </button>
        </div>

        {routes.length === 0 ? (
          <div className="text-center py-6 border border-dashed border-[#222] rounded-xl text-xs text-zinc-600 bg-[#0a0a0a]">
            No routes defined. Everything goes to "default".
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {routes.map((route, i) => (
              <div key={i} className="flex flex-col gap-2 p-3 bg-[#0a0a0a] border border-[#222] rounded-xl relative group">
                <button onClick={() => removeRoute(i)} className="absolute top-2 right-2 p-1 text-zinc-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                <div className="flex flex-col gap-1.5 pr-6">
                  <label className="text-[9px] font-bold text-zinc-500 uppercase">Path Name</label>
                  <input
                    value={route.path}
                    onChange={(e) => updateRoute(i, 'path', e.target.value)}
                    placeholder="high_value_customer"
                    className="w-full bg-[#111] border border-[#333] rounded-md px-2 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-pink-500/50 transition-colors"
                  />
                </div>

                <RouteConditionBuilder route={route} updateRoute={updateRoute} index={i} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-3 bg-pink-500/5 border border-pink-500/10 rounded-lg text-[10px] text-zinc-500 leading-relaxed">
        💡 Supports single conditions, AND (all true), OR (any true), regex matching, and array operators. Click an edge on the canvas to link it to a Path Name.
      </div>
    </div>
  );
}