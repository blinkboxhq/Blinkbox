import { Database, Filter, Scissors, Edit2, SlidersHorizontal, PlusCircle, Trash2 } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';

const MODES = [
  { value: 'set', label: 'Set / Add Fields', icon: Edit2 },
  { value: 'rename', label: 'Rename Fields', icon: SlidersHorizontal },
  { value: 'filter', label: 'Filter Array', icon: Filter },
  { value: 'remove', label: 'Remove Fields', icon: Trash2 },
];

export default function DataMapperNode({ config = {}, updateConfig }) {
  const mode = config.mode || 'set';
  const items = config.items || [];

  const addItem = () => updateConfig('items', [...items, { key1: '', key2: '' }]);
  const updateItem = (index, field, value) => {
    const updated = items.map((item, i) => (i === index ? { ...item, [field]: value } : item));
    updateConfig('items', updated);
  };
  const removeItem = (index) => updateConfig('items', items.filter((_, i) => i !== index));

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
        <div className="p-2 bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-emerald-400 shrink-0">
          <Database className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-emerald-400 tracking-wide">Data Mapper</span>
          <span className="text-[10px] text-zinc-400 truncate mt-0.5">Transform & reshape data</span>
        </div>
      </div>

      {/* Mode Selection */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Operation Mode</label>
        <div className="grid grid-cols-2 gap-2">
          {MODES.map((m) => {
            const Icon = m.icon;
            return (
              <button
                key={m.value}
                onClick={() => { updateConfig('mode', m.value); updateConfig('items', []); }}
                className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-bold transition-all ${
                  mode === m.value ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400' : 'bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" /> {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Dynamic List Editor */}
      <div className="flex flex-col gap-3 bg-[#0a0a0a] p-4 border border-[#222] rounded-xl shadow-inner">
        <div className="flex items-center justify-between border-b border-[#222] pb-3">
          <span className="text-xs font-bold text-zinc-300 uppercase tracking-widest flex items-center gap-2">
            <Scissors className="w-3.5 h-3.5 text-emerald-500" /> Rules
          </span>
          <button onClick={addItem} className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors uppercase">
            <PlusCircle className="w-3 h-3" /> Add
          </button>
        </div>

        {items.length === 0 ? (
           <div className="text-center py-4 text-xs text-zinc-600">No rules added.</div>
        ) : (
          <div className="flex flex-col gap-2">
            {items.map((item, i) => (
              <div key={i} className="flex items-center gap-2 group">
                <input
                  value={item.key1}
                  onChange={(e) => updateItem(i, 'key1', e.target.value)}
                  placeholder={mode === 'rename' ? 'Old Key' : 'Field Name'}
                  className="w-1/2 bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500 transition-colors"
                />
                {(mode === 'set' || mode === 'rename' || mode === 'filter') && (
                  <div className="w-1/2">
                    <SmartVariableInput
                      value={item.key2}
                      onChange={(val) => updateItem(i, 'key2', val)}
                      placeholder={mode === 'rename' ? 'New Key' : 'Value / Target'}
                    />
                  </div>
                )}
                <button onClick={() => removeItem(i)} className="p-1.5 text-zinc-600 hover:text-red-400 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}