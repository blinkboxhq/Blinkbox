import { PlusCircle, Edit3, Trash2, Download, Settings2 } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';
import CredentialPicker from '../../../../components/ui/CredentialPicker';
import { ConfigSection, ConfigLabel, ConfigSelect, ConfigPills } from '../../../../components/ui/ConfigKit';

const SHEETS_ACCENT = '#0F9D58';

function SheetsIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M11.318 12.545H7.91v-1.909h3.41v1.91zm4.5-4.772H7.91V9.68h7.91V7.773zm0 9.545H7.91v1.91h7.91v-1.91zm0-4.773H12.41v1.91h3.41v-1.91zM6 3v18l1.5 1.5 1.5-1.5V3L7.5 1.5 6 3zM18 3v18l1.5 1.5 1.5-1.5V3L19.5 1.5 18 3z" />
    </svg>
  );
}

const OPERATIONS = [
  { value: 'readRange',  label: 'Read Range',   icon: Download },
  { value: 'writeRange', label: 'Write Range',  icon: Edit3 },
  { value: 'appendRow',  label: 'Append Row',   icon: PlusCircle },
  { value: 'clearRange', label: 'Clear Range',  icon: Trash2 },
  { value: 'getSheet',   label: 'Get Metadata', icon: Settings2 },
];

export default function GoogleSheetsNode({ config = {}, updateConfig, nodeId }) {
  const operation = config.operation || 'readRange';
  const needsRange = operation !== 'getSheet';
  const needsValues = ['writeRange', 'appendRow'].includes(operation);

  return (
    <ConfigSection className="gap-5">
      {/* Header */}
      <div className="bb-glow-border flex items-center gap-3 p-4 rounded-xl bg-[#0F9D58]/[0.06] backdrop-blur-sm">
        <div className="w-9 h-9 rounded-lg bg-[#0F9D58]/10 text-[#0F9D58] flex items-center justify-center shrink-0">
          <SheetsIcon className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-[14px] font-bold text-[#0F9D58]">Google Sheets</span>
          <span className="text-[11px] text-neutral-500">Read &amp; write spreadsheet data</span>
        </div>
      </div>

      {/* Credential — real "Sign in with Google" + setup manually */}
      <CredentialPicker
        value={config.credentialId || ''}
        onChange={(id) => updateConfig('credentialId', id)}
        oauthProvider="google"
        credentialType="google"
        accentColor="green"
        label="Credential"
        placeholder="Select Google credential…"
        hint="Connect with Google or pick an existing credential."
      />

      {/* Operation */}
      <ConfigSelect
        label="Operation"
        value={operation}
        onChange={(v) => updateConfig('operation', v)}
        options={OPERATIONS}
        accentColor={SHEETS_ACCENT}
      />

      {/* Spreadsheet ID */}
      <div className="flex flex-col">
        <ConfigLabel>Spreadsheet ID</ConfigLabel>
        <SmartVariableInput
          value={config.spreadsheetId || ''}
          onChange={(val) => updateConfig('spreadsheetId', val)}
          placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
          nodeId={nodeId}
        />
        <p className="text-[10px] text-neutral-600 mt-1">Found in the spreadsheet URL between /d/ and /edit</p>
      </div>

      {/* Range */}
      {needsRange && (
        <div className="flex flex-col">
          <ConfigLabel>Range</ConfigLabel>
          <SmartVariableInput
            value={config.range || ''}
            onChange={(val) => updateConfig('range', val)}
            placeholder={operation === 'appendRow' ? 'Sheet1!A:Z' : 'Sheet1!A1:D10'}
            nodeId={nodeId}
          />
          <p className="text-[10px] text-neutral-600 mt-1">A1 notation — e.g. Sheet1!A1:D10</p>
        </div>
      )}

      {/* Values (write / append) */}
      {needsValues && (
        <div className="flex flex-col">
          <ConfigLabel>Values {operation === 'appendRow' ? '(row or rows)' : '(2D array)'}</ConfigLabel>
          <SmartVariableInput
            value={typeof config.values === 'string' ? config.values : (config.values ? JSON.stringify(config.values) : '')}
            onChange={(val) => { try { updateConfig('values', JSON.parse(val)); } catch { updateConfig('values', val); } }}
            placeholder={operation === 'appendRow' ? '["Alice", "alice@example.com", 42]' : '[["Name","Email"],["Alice","alice@example.com"]]'}
            multiline
            nodeId={nodeId}
          />
          <div className="mt-2">
            <ConfigPills
              label="Value Input"
              value={config.rawInput ? 'raw' : 'parsed'}
              onChange={(v) => updateConfig('rawInput', v === 'raw')}
              options={[
                { value: 'parsed', label: 'Parsed (formulas & dates)' },
                { value: 'raw', label: 'Raw Input' },
              ]}
              accentColor={SHEETS_ACCENT}
            />
          </div>
        </div>
      )}
    </ConfigSection>
  );
}
