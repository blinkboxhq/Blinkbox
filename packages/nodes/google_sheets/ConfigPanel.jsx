import imgSheets from './logo.svg';
import {
  PlusCircle, Edit3, Trash2, Download, Settings2, Search, Layers, FilePlus2, Copy, Pencil, ArrowDownToLine,
} from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';
import OAuthConnectButton from '@/components/ui/OAuthConnectButton';
import CredentialPicker from '@/components/ui/CredentialPicker';
import {
  ConfigSection, ConfigLabel, ConfigHeader, ConfigSelect, ConfigInput, ConfigToggleRow, ConfigBanner,
} from '@/components/ui/ConfigKit';

const ACCENT = '#4d7cff';

function SheetsIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M11.318 12.545H7.91v-1.909h3.41v1.91zm4.5-4.772H7.91V9.68h7.91V7.773zm0 9.545H7.91v1.91h7.91v-1.91zm0-4.773H12.41v1.91h3.41v-1.91zM6 3v18l1.5 1.5 1.5-1.5V3L7.5 1.5 6 3zM18 3v18l1.5 1.5 1.5-1.5V3L19.5 1.5 18 3z" />
    </svg>
  );
}

const OPERATIONS = [
  { value: 'readRange',  label: 'Read Range',   icon: Download,        group: 'Values' },
  { value: 'writeRange', label: 'Write Range',  icon: Edit3,           group: 'Values' },
  { value: 'appendRow',  label: 'Append Row',   icon: PlusCircle,      group: 'Values' },
  { value: 'clearRange', label: 'Clear Range',  icon: Trash2,          group: 'Values' },
  { value: 'batchGet',   label: 'Batch Get',    icon: Layers,          group: 'Values' },
  { value: 'lookupRow',  label: 'Lookup Row',   icon: Search,          group: 'Rows' },
  { value: 'updateRow',  label: 'Update Row',   icon: Pencil,          group: 'Rows' },
  { value: 'insertRow',  label: 'Insert Row',   icon: ArrowDownToLine, group: 'Rows' },
  { value: 'deleteRow',  label: 'Delete Row',   icon: Trash2,          group: 'Rows' },
  { value: 'getSheet',          label: 'Get Metadata',    icon: Settings2,  group: 'Spreadsheet & Tabs' },
  { value: 'createSpreadsheet', label: 'New Spreadsheet', icon: FilePlus2,  group: 'Spreadsheet & Tabs' },
  { value: 'createSheet',       label: 'Add Tab',         icon: PlusCircle, group: 'Spreadsheet & Tabs' },
  { value: 'renameSheet',       label: 'Rename Tab',      icon: Pencil,     group: 'Spreadsheet & Tabs' },
  { value: 'duplicateSheet',    label: 'Duplicate Tab',   icon: Copy,       group: 'Spreadsheet & Tabs' },
  { value: 'deleteSheet',       label: 'Delete Tab',      icon: Trash2,     group: 'Spreadsheet & Tabs' },
];

function Field({ label, optional, children }) {
  return (
    <div className="flex flex-col">
      {label && (
        <ConfigLabel>
          {label}{optional && <span className="text-neutral-700 normal-case tracking-normal"> (optional)</span>}
        </ConfigLabel>
      )}
      {children}
    </div>
  );
}

export default function GoogleSheetsNode({ config = {}, updateConfig, nodeId }) {
  const operation = config.operation || 'readRange';
  const currentOp = OPERATIONS.find((o) => o.value === operation);
  const needsRange = ['readRange', 'writeRange', 'appendRow', 'clearRange', 'lookupRow', 'updateRow'].includes(operation);
  const needsValues = ['writeRange', 'appendRow', 'updateRow', 'insertRow'].includes(operation);
  const noSpreadsheetId = operation === 'createSpreadsheet';
  const needsLookup = ['lookupRow', 'updateRow'].includes(operation);
  const needsSheetName = ['insertRow', 'deleteRow', 'createSheet', 'renameSheet', 'duplicateSheet', 'deleteSheet'].includes(operation);
  const needsRowIndex = ['insertRow', 'deleteRow'].includes(operation);
  const needsNewSheetName = ['renameSheet', 'duplicateSheet'].includes(operation);

  const text = (label, key, opts = {}) => (
    <Field label={label} optional={opts.optional}>
      <SmartVariableInput
        value={config[key] || ''}
        onChange={(val) => updateConfig(key, val)}
        placeholder={opts.placeholder || ''}
        multiline={opts.multiline}
        nodeId={nodeId}
      />
    </Field>
  );

  return (
    <ConfigSection className="gap-5">
      <ConfigHeader logoUrl={imgSheets} title="Google Sheets" subtitle={currentOp?.label || 'Read & write spreadsheet data'} />

      <ConfigSelect
        label="Operation"
        value={operation}
        onChange={(val) => updateConfig('operation', val)}
        options={OPERATIONS}
        accentColor={ACCENT}
      />

      {!noSpreadsheetId && (
        <ConfigInput
          label="Spreadsheet ID"
          value={config.spreadsheetId || ''}
          onChange={(val) => updateConfig('spreadsheetId', val)}
          placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
          hint="Found in the spreadsheet URL between /d/ and /edit"
        />
      )}

      {operation === 'createSpreadsheet' && (
        <>
          {text('Title', 'title', { placeholder: 'Q3 Sales Report' })}
          <Field label={<>Tab Names <span className="text-neutral-700 normal-case tracking-normal">(comma-separated, optional)</span></>}>
            <SmartVariableInput nodeId={nodeId}
              value={typeof config.sheetTitles === 'string' ? config.sheetTitles : (Array.isArray(config.sheetTitles) ? config.sheetTitles.join(', ') : '')}
              onChange={(val) => updateConfig('sheetTitles', val)} placeholder="Leads, Customers, Archive" />
          </Field>
        </>
      )}

      {needsSheetName && text('Tab Name', 'sheetName', { placeholder: 'Sheet1' })}

      {needsNewSheetName && (
        <Field label={<>{operation === 'renameSheet' ? 'New Tab Name' : 'Copy Name'}{operation === 'duplicateSheet' && <span className="text-neutral-700 normal-case tracking-normal"> (optional)</span>}</>}>
          <SmartVariableInput nodeId={nodeId} value={config.newSheetName || ''} onChange={(val) => updateConfig('newSheetName', val)} placeholder={operation === 'renameSheet' ? 'Renamed Tab' : 'Sheet1 Copy'} />
        </Field>
      )}

      {needsRowIndex && (
        <div className="grid grid-cols-2 gap-3">
          <ConfigInput
            label={<>Row Number <span className="text-neutral-700 normal-case tracking-normal">(1-based)</span></>}
            type="number"
            value={config.rowIndex || ''}
            onChange={(val) => updateConfig('rowIndex', Number(val))}
            placeholder="2"
          />
          <ConfigInput
            label="# Rows"
            type="number"
            value={config.rowCount ?? 1}
            onChange={(val) => updateConfig('rowCount', Number(val))}
          />
        </div>
      )}

      {needsLookup && (
        <div className="grid grid-cols-2 gap-3">
          {text('Lookup Column', 'lookupColumn', { placeholder: 'Email' })}
          {text('Match Value', 'lookupValue', { placeholder: '{{trigger.email}}' })}
        </div>
      )}

      {operation === 'batchGet' && (
        <Field label={<>Ranges <span className="text-neutral-700 normal-case tracking-normal">(comma-separated)</span></>}>
          <SmartVariableInput nodeId={nodeId}
            value={typeof config.ranges === 'string' ? config.ranges : (Array.isArray(config.ranges) ? config.ranges.join(', ') : '')}
            onChange={(val) => updateConfig('ranges', val)} placeholder="Sheet1!A1:C10, Sheet2!A:B" />
        </Field>
      )}

      {needsRange && (
        <Field label="Range">
          <SmartVariableInput
            value={config.range || ''}
            onChange={(val) => updateConfig('range', val)}
            placeholder={operation === 'appendRow' ? 'Sheet1!A:Z' : 'Sheet1!A1:D10'}
            nodeId={nodeId}
          />
          <p className="text-[9px] text-neutral-600 mt-1.5 font-mono tracking-wide">A1 notation — e.g. Sheet1!A1:D10</p>
        </Field>
      )}

      {needsValues && (
        <Field label={<>Values <span className="text-neutral-700 normal-case tracking-normal">{operation === 'appendRow' ? '(row or rows)' : '(2D array)'}</span></>}>
          <SmartVariableInput
            value={typeof config.values === 'string' ? config.values : (config.values ? JSON.stringify(config.values) : '')}
            onChange={(val) => { try { updateConfig('values', JSON.parse(val)); } catch { updateConfig('values', val); } }}
            placeholder={operation === 'appendRow' ? '["Alice", "alice@example.com", 42]' : '[["Name","Email"],["Alice","alice@example.com"]]'}
            multiline
            nodeId={nodeId}
          />
          <div className="mt-2">
            <ConfigToggleRow
              label="Raw Input"
              desc="Off = Google parses formulas & dates"
              on={config.rawInput}
              onChange={(v) => updateConfig('rawInput', v)}
              accentColor={ACCENT}
            />
          </div>
        </Field>
      )}

      <OAuthConnectButton provider="google" providerLabel="Google" accentColor="blue"
        value={config.credentialId || ''} onChange={(id) => updateConfig('credentialId', id)} icon={SheetsIcon} />
      <p className="text-[10px] text-zinc-600 -mt-3">Or use an existing credential:</p>
      <CredentialPicker value={config.credentialId || ''} onChange={(id) => updateConfig('credentialId', id)}
        accentColor="blue" label="Google OAuth Token" placeholder="Select Google credential..." />
    </ConfigSection>
  );
}
