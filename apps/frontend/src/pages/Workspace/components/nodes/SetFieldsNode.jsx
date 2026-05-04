import { Edit2, Database, ArrowRight } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';

export default function SetFieldsNode({ config = {}, updateConfig, nodeId }) {
  const fields = config.fields || [{ key: '', value: '' }];

  const addField = () => updateConfig('fields', [...fields, { key: '', value: '' }]);
  const updateField = (index, field, value) => {
    const updated = fields.map((f, i) => (i === index ? { ...f, [field]: value } : f));
    updateConfig('fields', updated);
  };
  const removeField = (index) => updateConfig('fields', fields.filter((_, i) => i !== index));

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl shadow-sm">
        <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400 shrink-0">
          <Edit2 className="w-6 h-6" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-emerald-400 tracking-tight">Set Fields</span>
          <span className="text-[11px] text-zinc-400 mt-0.5">Add or update data fields</span>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between px-1">
          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Data Mappings</label>
          <button 
            onClick={addField}
            className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors uppercase tracking-wider bg-emerald-500/10 px-2 py-1 rounded-md"
          >
            + Add Field
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {fields.map((field, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl group hover:border-emerald-500/30 transition-all shadow-inner">
              <div className="flex-1">
                <input
                  value={field.key}
                  onChange={(e) => updateField(i, 'key', e.target.value)}
                  placeholder="field_name"
                  className="w-full bg-transparent border-none text-xs text-emerald-400 font-mono focus:outline-none placeholder:text-zinc-700"
                />
              </div>
              
              <ArrowRight className="w-3 h-3 text-zinc-700 shrink-0" />

              <div className="flex-[1.5]">
                <SmartVariableInput
                  value={field.value}
                  onChange={(val) => updateField(i, 'value', val)}
                  placeholder="value"
                  className="bg-transparent border-none text-xs"
                />
              </div>

              <button 
                onClick={() => removeField(i)}
                className="p-1.5 text-zinc-700 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
              >
                <Database className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {fields.length === 0 && (
        <div className="text-center py-8 border-2 border-dashed border-[#111] rounded-2xl text-xs text-zinc-600 font-medium">
          No fields defined. Click "Add Field" to start.
        </div>
      )}
    </div>
  );
}
