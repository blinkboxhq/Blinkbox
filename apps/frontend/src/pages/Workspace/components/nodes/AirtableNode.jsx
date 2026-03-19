import { Table2, KeyRound, Settings2, PlusCircle, Search, Pencil, Trash2 } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';

const ACTIONS = [
  { value: 'create', label: 'Create Record', icon: PlusCircle },
  { value: 'read', label: 'Read Records', icon: Search },
  { value: 'update', label: 'Update Record', icon: Pencil },
  { value: 'delete', label: 'Delete Record', icon: Trash2 },
];

export default function AirtableNode({ config = {}, updateConfig }) {
  const action = config.action || 'create';
  const fields = config.fields || {};
  const fieldEntries = Object.entries(fields);

  const updateField = (oldKey, newKey, newValue) => {
    const newFields = { ...fields };
    if (oldKey !== newKey) delete newFields[oldKey];
    if (newKey) newFields[newKey] = newValue;
    updateConfig('fields', newFields);
  };

  const removeField = (key) => {
    const newFields = { ...fields };
    delete newFields[key];
    updateConfig('fields', newFields);
  };

  const addField = () => {
    updateConfig('fields', { ...fields, ['Column']: '' });
  };

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-xl">
        <div className="p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-400 shrink-0">
          <Table2 className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-yellow-400">Airtable</span>
          <span className="text-[10px] text-zinc-500 mt-0.5">Read & write Airtable records</span>
        </div>
      </div>

      {/* Base + Table */}
      <div className="flex flex-col gap-3 bg-[#0a0a0a] p-4 border border-[#222] rounded-xl shadow-inner">
        <div className="flex items-center gap-2 pb-3 border-b border-[#222]">
          <Settings2 className="w-4 h-4 text-yellow-500" />
          <span className="text-xs font-bold text-zinc-300 uppercase tracking-widest">Connection</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-zinc-500 w-16 shrink-0">Base ID</span>
          <input
            type="text"
            value={config.baseId || ''}
            onChange={(e) => updateConfig('baseId', e.target.value)}
            placeholder="appXXXXXXXXXXXXXX"
            className="flex-1 bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-xs text-yellow-300 font-mono focus:outline-none focus:border-yellow-500/50 transition-colors"
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-zinc-500 w-16 shrink-0">Table</span>
          <input
            type="text"
            value={config.tableName || ''}
            onChange={(e) => updateConfig('tableName', e.target.value)}
            placeholder="Table name or ID"
            className="flex-1 bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-500/50 transition-colors"
          />
        </div>
      </div>

      {/* Action */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Action</label>
        <div className="grid grid-cols-2 gap-2">
          {ACTIONS.map((a) => {
            const Icon = a.icon;
            return (
              <button
                key={a.value}
                onClick={() => updateConfig('action', a.value)}
                className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-bold transition-all ${
                  action === a.value
                    ? 'bg-yellow-500/10 border-yellow-500/40 text-yellow-400'
                    : 'bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" /> {a.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Record ID (update/delete) */}
      {(action === 'update' || action === 'delete') && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Record ID</label>
          <SmartVariableInput
            value={config.recordId || ''}
            onChange={(val) => updateConfig('recordId', val)}
            placeholder="recXXXXXXXXXXXXXX"
          />
        </div>
      )}

      {/* Fields mapping (create/update) */}
      {(action === 'create' || action === 'update') && (
        <div className="flex flex-col gap-3 bg-[#0a0a0a] p-4 border border-[#222] rounded-xl shadow-inner">
          <div className="flex items-center justify-between border-b border-[#222] pb-3">
            <span className="text-xs font-bold text-zinc-300 uppercase tracking-widest">Field Mapping</span>
            <button onClick={addField} className="flex items-center gap-1 text-[10px] font-bold text-yellow-400 hover:text-yellow-300 uppercase">
              <PlusCircle className="w-3 h-3" /> Add
            </button>
          </div>
          {fieldEntries.length === 0 ? (
            <div className="text-center py-4 text-xs text-zinc-600">No fields mapped. Click Add to map upstream data.</div>
          ) : (
            <div className="flex flex-col gap-2">
              {fieldEntries.map(([k, v], i) => (
                <div key={i} className="flex items-center gap-2 group">
                  <input
                    value={k}
                    onChange={(e) => updateField(k, e.target.value, v)}
                    placeholder="Column Name"
                    className="w-1/3 bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-yellow-500 transition-colors"
                  />
                  <div className="flex-1">
                    <SmartVariableInput
                      value={v}
                      onChange={(val) => updateField(k, k, val)}
                      placeholder="Value"
                    />
                  </div>
                  <button onClick={() => removeField(k)} className="p-1.5 text-zinc-600 hover:text-red-400 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Filter (read) */}
      {action === 'read' && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Filter Formula (optional)</label>
          <input
            type="text"
            value={config.filterFormula || ''}
            onChange={(e) => updateConfig('filterFormula', e.target.value)}
            placeholder='{Status} = "Active"'
            className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs font-mono text-zinc-300 focus:outline-none focus:border-yellow-500/50 transition-colors shadow-inner"
          />
        </div>
      )}

      {/* Credential */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
          <KeyRound className="w-3.5 h-3.5 text-yellow-400" /> Vault Credential ID
        </label>
        <input
          type="text"
          value={config.credentialId || ''}
          onChange={(e) => updateConfig('credentialId', e.target.value)}
          placeholder="Paste your Airtable Personal Access Token credential ID"
          className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs font-mono text-zinc-300 focus:outline-none focus:border-yellow-500/50 transition-colors shadow-inner"
        />
      </div>
    </div>
  );
}
