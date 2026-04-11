import { Table2, Settings2, PlusCircle, Search, Pencil, Trash2, Download, Layers, Copy } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';
import CredentialPicker from '../../../../components/ui/CredentialPicker';
import OAuthConnectButton from '../../../../components/ui/OAuthConnectButton';

const OPERATIONS = [
  { value: 'create',     label: 'Create Record',   icon: PlusCircle },
  { value: 'read',       label: 'Read Records',    icon: Search },
  { value: 'update',     label: 'Update Record',   icon: Pencil },
  { value: 'delete',     label: 'Delete Record',   icon: Trash2 },
  { value: 'getRecord',  label: 'Get Record',      icon: Download },
  { value: 'search',     label: 'Search Records',  icon: Search },
  { value: 'bulkCreate', label: 'Bulk Create',     icon: Layers },
  { value: 'bulkUpdate', label: 'Bulk Update',     icon: Copy },
];

export default function AirtableNode({ config = {}, updateConfig }) {
  const operation = config.operation || 'create';
  const fields = config.fields || {};
  const fieldEntries = Object.entries(fields);

  const updateField = (oldKey, newKey, newValue) => {
    const newFields = { ...fields };
    if (oldKey !== newKey) delete newFields[oldKey];
    if (newKey) newFields[newKey] = newValue;
    updateConfig('fields', newFields);
  };
  const removeField = (key) => { const f = { ...fields }; delete f[key]; updateConfig('fields', f); };
  const addField = () => updateConfig('fields', { ...fields, ['Column']: '' });

  const needsRecordId = ['update', 'delete', 'getRecord'].includes(operation);
  const needsFields = ['create', 'update'].includes(operation);
  const needsFilter = ['read'].includes(operation);
  const isBulk = ['bulkCreate', 'bulkUpdate'].includes(operation);

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

      {/* Connection */}
      <div className="flex flex-col gap-3 bg-[#0a0a0a] p-4 border border-[#222] rounded-xl shadow-inner">
        <div className="flex items-center gap-2 pb-3 border-b border-[#222]">
          <Settings2 className="w-4 h-4 text-yellow-500" />
          <span className="text-xs font-bold text-zinc-300 uppercase tracking-widest">Connection</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-zinc-500 w-16 shrink-0">Base ID</span>
          <input type="text" value={config.baseId || ''} onChange={(e) => updateConfig('baseId', e.target.value)}
            placeholder="appXXXXXXXXXXXXXX"
            className="flex-1 bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-xs text-yellow-300 font-mono focus:outline-none focus:border-yellow-500/50 transition-colors" />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-zinc-500 w-16 shrink-0">Table</span>
          <input type="text" value={config.tableName || ''} onChange={(e) => updateConfig('tableName', e.target.value)}
            placeholder="Table name or ID"
            className="flex-1 bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-500/50 transition-colors" />
        </div>
      </div>

      {/* Operation */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Operation</label>
        <div className="grid grid-cols-2 gap-2">
          {OPERATIONS.map((op) => {
            const Icon = op.icon;
            return (
              <button key={op.value} onClick={() => updateConfig('operation', op.value)}
                className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-bold transition-all ${
                  operation === op.value
                    ? 'bg-yellow-500/10 border-yellow-500/40 text-yellow-400'
                    : 'bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" /> {op.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Record ID */}
      {needsRecordId && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Record ID</label>
          <SmartVariableInput value={config.recordId || ''} onChange={(val) => updateConfig('recordId', val)} placeholder="recXXXXXXXXXXXXXX" />
        </div>
      )}

      {/* Field mapping (create/update) */}
      {needsFields && (
        <div className="flex flex-col gap-3 bg-[#0a0a0a] p-4 border border-[#222] rounded-xl shadow-inner">
          <div className="flex items-center justify-between border-b border-[#222] pb-3">
            <span className="text-xs font-bold text-zinc-300 uppercase tracking-widest">Field Mapping</span>
            <button onClick={addField} className="flex items-center gap-1 text-[10px] font-bold text-yellow-400 hover:text-yellow-300 uppercase">
              <PlusCircle className="w-3 h-3" /> Add
            </button>
          </div>
          {fieldEntries.length === 0 ? (
            <div className="text-center py-4 text-xs text-zinc-600">No fields mapped. Click Add.</div>
          ) : (
            <div className="flex flex-col gap-2">
              {fieldEntries.map(([k, v], i) => (
                <div key={i} className="flex items-center gap-2 group">
                  <input value={k} onChange={(e) => updateField(k, e.target.value, v)} placeholder="Column Name"
                    className="w-1/3 bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-yellow-500 transition-colors" />
                  <div className="flex-1">
                    <SmartVariableInput value={v} onChange={(val) => updateField(k, k, val)} placeholder="Value" />
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
      {needsFilter && (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Filter Formula <span className="text-zinc-700">(optional)</span></label>
            <input type="text" value={config.filterFormula || ''} onChange={(e) => updateConfig('filterFormula', e.target.value)}
              placeholder='{Status} = "Active"'
              className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs font-mono text-zinc-300 focus:outline-none focus:border-yellow-500/50 transition-colors shadow-inner" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Max Records</label>
            <input type="number" min={1} max={1000} value={config.maxRecords || 100} onChange={(e) => updateConfig('maxRecords', Number(e.target.value))}
              className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-yellow-500/50 transition-colors" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">View <span className="text-zinc-700">(optional)</span></label>
            <input type="text" value={config.view || ''} onChange={(e) => updateConfig('view', e.target.value)}
              placeholder="Grid view"
              className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-yellow-500/50 transition-colors" />
          </div>
        </>
      )}

      {/* Search */}
      {operation === 'search' && (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Search Field</label>
            <input type="text" value={config.searchField || ''} onChange={(e) => updateConfig('searchField', e.target.value)}
              placeholder="Email"
              className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-yellow-500/50 transition-colors" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Search Value</label>
            <SmartVariableInput value={config.searchValue || ''} onChange={(val) => updateConfig('searchValue', val)} placeholder="{{trigger.data.email}}" />
          </div>
        </>
      )}

      {/* Bulk */}
      {isBulk && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
            Records <span className="text-zinc-700">(array, max 10)</span>
          </label>
          <SmartVariableInput
            value={typeof config.records === 'string' ? config.records : (config.records ? JSON.stringify(config.records, null, 2) : '')}
            onChange={(val) => { try { updateConfig('records', JSON.parse(val)); } catch { updateConfig('records', val); } }}
            placeholder={operation === 'bulkCreate'
              ? '[{"Name":"Alice"},{"Name":"Bob"}]'
              : '[{"id":"recXXX","fields":{"Status":"Done"}}]'}
            multiline
          />
          <p className="text-[10px] text-zinc-600">
            {operation === 'bulkCreate' ? 'Array of field objects.' : 'Array of {id, fields} objects.'}
          </p>
        </div>
      )}

      {/* Authorization */}
      <OAuthConnectButton provider="airtable" providerLabel="Airtable" accentColor="yellow"
        value={config.credentialId || ''} onChange={(id) => updateConfig('credentialId', id)} icon={Table2} />
      <p className="text-[10px] text-zinc-600 -mt-3">Or use an existing credential:</p>
      <CredentialPicker value={config.credentialId || ''} onChange={(id) => updateConfig('credentialId', id)}
        accentColor="yellow" label="Airtable Token" placeholder="Select Airtable credential..." />
    </div>
  );
}
