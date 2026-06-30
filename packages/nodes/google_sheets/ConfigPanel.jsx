import { PlusCircle, Edit3, Trash2, Download, Settings2, Search, Layers, FilePlus2, Copy, Pencil, ArrowDownToLine } from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';
import OAuthConnectButton from '@/components/ui/OAuthConnectButton';
import CredentialPicker from '@/components/ui/CredentialPicker';

function SheetsIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M11.318 12.545H7.91v-1.909h3.41v1.91zm4.5-4.772H7.91V9.68h7.91V7.773zm0 9.545H7.91v1.91h7.91v-1.91zm0-4.773H12.41v1.91h3.41v-1.91zM6 3v18l1.5 1.5 1.5-1.5V3L7.5 1.5 6 3zM18 3v18l1.5 1.5 1.5-1.5V3L19.5 1.5 18 3z" />
    </svg>
  );
}

const GROUPS = [
  { title: 'Values', ops: [
    { value: 'readRange',  label: 'Read Range',   icon: Download },
    { value: 'writeRange', label: 'Write Range',  icon: Edit3 },
    { value: 'appendRow',  label: 'Append Row',   icon: PlusCircle },
    { value: 'clearRange', label: 'Clear Range',  icon: Trash2 },
    { value: 'batchGet',   label: 'Batch Get',    icon: Layers },
  ]},
  { title: 'Rows', ops: [
    { value: 'lookupRow',  label: 'Lookup Row',  icon: Search },
    { value: 'updateRow',  label: 'Update Row',  icon: Pencil },
    { value: 'insertRow',  label: 'Insert Row',  icon: ArrowDownToLine },
    { value: 'deleteRow',  label: 'Delete Row',  icon: Trash2 },
  ]},
  { title: 'Spreadsheet & Tabs', ops: [
    { value: 'getSheet',          label: 'Get Metadata',      icon: Settings2 },
    { value: 'createSpreadsheet', label: 'New Spreadsheet',   icon: FilePlus2 },
    { value: 'createSheet',       label: 'Add Tab',           icon: PlusCircle },
    { value: 'renameSheet',       label: 'Rename Tab',        icon: Pencil },
    { value: 'duplicateSheet',    label: 'Duplicate Tab',     icon: Copy },
    { value: 'deleteSheet',       label: 'Delete Tab',        icon: Trash2 },
  ]},
];

export default function GoogleSheetsNode({ config = {}, updateConfig, nodeId }) {
  const operation = config.operation || 'readRange';
  const needsRange = ['readRange', 'writeRange', 'appendRow', 'clearRange', 'lookupRow', 'updateRow'].includes(operation);
  const needsValues = ['writeRange', 'appendRow', 'updateRow', 'insertRow'].includes(operation);
  const noSpreadsheetId = operation === 'createSpreadsheet';
  const needsLookup = ['lookupRow', 'updateRow'].includes(operation);
  const needsSheetName = ['insertRow', 'deleteRow', 'createSheet', 'renameSheet', 'duplicateSheet', 'deleteSheet'].includes(operation);
  const needsRowIndex = ['insertRow', 'deleteRow'].includes(operation);
  const needsNewSheetName = ['renameSheet', 'duplicateSheet'].includes(operation);

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-[#0F9D58]/5 border border-[#0F9D58]/20 rounded-xl">
        <div className="p-2 bg-[#0F9D58]/10 rounded-lg text-[#0F9D58] shrink-0">
          <SheetsIcon className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-[#0F9D58]">Google Sheets</span>
          <span className="text-[10px] text-zinc-500">Read & write spreadsheet data</span>
        </div>
      </div>

      {/* Spreadsheet ID */}
      {!noSpreadsheetId && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Spreadsheet ID</label>
          <input
            value={config.spreadsheetId || ''}
            onChange={(e) => updateConfig('spreadsheetId', e.target.value)}
            placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
            className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#0F9D58]/40 transition-colors"
          />
          <p className="text-[10px] text-zinc-600">Found in the spreadsheet URL between /d/ and /edit</p>
        </div>
      )}

      {/* Operations */}
      <div className="flex flex-col gap-3">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Operation</label>
        {GROUPS.map((group) => (
          <div key={group.title} className="flex flex-col gap-1.5">
            <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">{group.title}</span>
            <div className="grid grid-cols-2 gap-2">
              {group.ops.map((op) => {
                const Icon = op.icon;
                return (
                  <button key={op.value} onClick={() => updateConfig('operation', op.value)}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-bold transition-all ${
                      operation === op.value
                        ? 'bg-[#0F9D58]/10 border-[#0F9D58]/40 text-[#0F9D58]'
                        : 'bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]'
                    }`}>
                    <Icon className="w-3.5 h-3.5 shrink-0" /> {op.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* New spreadsheet title */}
      {operation === 'createSpreadsheet' && (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Title</label>
            <SmartVariableInput nodeId={nodeId} value={config.title || ''} onChange={(val) => updateConfig('title', val)} placeholder="Q3 Sales Report" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Tab Names <span className="text-zinc-700">(comma-separated, optional)</span></label>
            <SmartVariableInput nodeId={nodeId}
              value={typeof config.sheetTitles === 'string' ? config.sheetTitles : (Array.isArray(config.sheetTitles) ? config.sheetTitles.join(', ') : '')}
              onChange={(val) => updateConfig('sheetTitles', val)} placeholder="Leads, Customers, Archive" />
          </div>
        </>
      )}

      {/* Tab name */}
      {needsSheetName && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Tab Name</label>
          <SmartVariableInput nodeId={nodeId} value={config.sheetName || ''} onChange={(val) => updateConfig('sheetName', val)} placeholder="Sheet1" />
        </div>
      )}

      {/* New tab name (rename / duplicate) */}
      {needsNewSheetName && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
            {operation === 'renameSheet' ? 'New Tab Name' : 'Copy Name'}
            {operation === 'duplicateSheet' && <span className="text-zinc-700"> (optional)</span>}
          </label>
          <SmartVariableInput nodeId={nodeId} value={config.newSheetName || ''} onChange={(val) => updateConfig('newSheetName', val)} placeholder={operation === 'renameSheet' ? 'Renamed Tab' : 'Sheet1 Copy'} />
        </div>
      )}

      {/* Row index (insert / delete) */}
      {needsRowIndex && (
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Row Number <span className="text-zinc-700">(1-based)</span></label>
            <input type="number" min={1} value={config.rowIndex || ''} onChange={(e) => updateConfig('rowIndex', Number(e.target.value))}
              className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#0F9D58]/40" placeholder="2" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest"># Rows</label>
            <input type="number" min={1} value={config.rowCount || 1} onChange={(e) => updateConfig('rowCount', Number(e.target.value))}
              className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#0F9D58]/40" />
          </div>
        </div>
      )}

      {/* Lookup column + value */}
      {needsLookup && (
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Lookup Column</label>
            <SmartVariableInput nodeId={nodeId} value={config.lookupColumn || ''} onChange={(val) => updateConfig('lookupColumn', val)} placeholder="Email" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Match Value</label>
            <SmartVariableInput nodeId={nodeId} value={config.lookupValue || ''} onChange={(val) => updateConfig('lookupValue', val)} placeholder="{{trigger.email}}" />
          </div>
        </div>
      )}

      {/* Batch Get ranges */}
      {operation === 'batchGet' && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Ranges <span className="text-zinc-700">(comma-separated)</span></label>
          <SmartVariableInput nodeId={nodeId}
            value={typeof config.ranges === 'string' ? config.ranges : (Array.isArray(config.ranges) ? config.ranges.join(', ') : '')}
            onChange={(val) => updateConfig('ranges', val)} placeholder="Sheet1!A1:C10, Sheet2!A:B" />
        </div>
      )}

      {/* Range */}
      {needsRange && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Range</label>
          <SmartVariableInput
            value={config.range || ''}
            onChange={(val) => updateConfig('range', val)}
            placeholder={operation === 'appendRow' ? 'Sheet1!A:Z' : 'Sheet1!A1:D10'}
            nodeId={nodeId}
          />
          <p className="text-[10px] text-zinc-600">A1 notation — e.g. Sheet1!A1:D10</p>
        </div>
      )}

      {/* Values (write / append) */}
      {needsValues && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
            Values {operation === 'appendRow' ? '(row or rows)' : '(2D array)'}
          </label>
          <SmartVariableInput
            value={typeof config.values === 'string' ? config.values : (config.values ? JSON.stringify(config.values) : '')}
            onChange={(val) => { try { updateConfig('values', JSON.parse(val)); } catch { updateConfig('values', val); } }}
            placeholder={operation === 'appendRow' ? '["Alice", "alice@example.com", 42]' : '[["Name","Email"],["Alice","alice@example.com"]]'}
            multiline
            nodeId={nodeId}
          />
          <div className="flex items-center gap-2 mt-1">
            <button
              onClick={() => updateConfig('rawInput', !config.rawInput)}
              className={`px-2 py-1 rounded text-[10px] font-bold border transition-all ${
                config.rawInput ? 'bg-[#0F9D58]/10 border-[#0F9D58]/40 text-[#0F9D58]' : 'border-[#222] text-zinc-600'
              }`}
            >
              Raw Input
            </button>
            <span className="text-[10px] text-zinc-600">Off = Google parses formulas & dates</span>
          </div>
        </div>
      )}

      {/* Auth */}
      <OAuthConnectButton provider="google" providerLabel="Google" accentColor="green"
        value={config.credentialId || ''} onChange={(id) => updateConfig('credentialId', id)} icon={SheetsIcon} />
      <p className="text-[10px] text-zinc-600 -mt-3">Or use an existing credential:</p>
      <CredentialPicker value={config.credentialId || ''} onChange={(id) => updateConfig('credentialId', id)}
        accentColor="green" label="Google OAuth Token" placeholder="Select Google credential..." />
    </div>
  );
}
