import SmartVariableInput from '@/components/ui/SmartVariableInput';
import CredentialPicker from '@/components/ui/CredentialPicker';

const INTERVALS = [
  { label: 'Every 1 min', value: '1' }, { label: 'Every 5 min', value: '5' },
  { label: 'Every 15 min', value: '15' }, { label: 'Every 30 min', value: '30' },
];

export default function GoogleSheetsTriggerNode({ config = {}, updateConfig, nodeId }) {
  return (
    <div className="flex flex-col">
      <div className="px-3 py-2 border-b border-[#2A2A2A] bg-[#111] rounded-t-xl">
        <span className="text-[11px] font-semibold text-[#34A853]">Google Sheets — New Row</span>
      </div>
      <div className="p-3 flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Spreadsheet ID</label>
          <SmartVariableInput value={config.spreadsheetId || ''} onChange={(v) => updateConfig?.('spreadsheetId', v)} placeholder="From URL: /spreadsheets/d/…/edit" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Sheet / Range</label>
          <SmartVariableInput value={config.range || 'Sheet1'} onChange={(v) => updateConfig?.('range', v)} placeholder="Sheet1 or Sheet1!A:Z" />
        </div>
        <div className="flex flex-col gap-1">
          <CredentialPicker
            label="Google OAuth"
            value={config.accessToken || ''}
            onChange={(v) => updateConfig?.('accessToken', v)}
            oauthProvider="google"
            accentColor="green"
            placeholder="Select Google credential…"
          />
        </div>
        <div className="flex items-center justify-between p-2 bg-[#111] border border-[#1e1e1e] rounded-lg">
          <span className="text-[10px] text-zinc-300">First row is header</span>
          <div className={`w-8 h-4 rounded-full p-0.5 cursor-pointer transition-colors ${config.hasHeader !== false ? 'bg-[#34A853]' : 'bg-zinc-700'}`}
            onClick={() => updateConfig?.('hasHeader', config.hasHeader === false ? true : false)}>
            <div className={`w-3 h-3 bg-white rounded-full transition-transform shadow-sm ${config.hasHeader !== false ? 'translate-x-4' : 'translate-x-0'}`} />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Poll interval</label>
          <select value={config.pollIntervalMinutes || '5'} onChange={(e) => updateConfig?.('pollIntervalMinutes', e.target.value)}
            className="w-full bg-[#111] border border-[#222] rounded-lg px-2.5 py-1.5 text-[10px] text-zinc-200 outline-none">
            {INTERVALS.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}
          </select>
        </div>
        <div className="p-2 bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg">
          <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest block mb-0.5">Available as</span>
          {['$trigger.{columnName}', '$trigger._rowNumber', '$trigger._spreadsheetId'].map((v) => (
            <span key={v} className="text-[9px] font-mono text-zinc-500 block">{v}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
