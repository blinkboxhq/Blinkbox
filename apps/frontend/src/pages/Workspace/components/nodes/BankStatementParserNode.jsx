import { Table2 } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';
import CredentialPicker from '../../../../components/ui/CredentialPicker';

export default function BankStatementParserNode({ config = {}, updateConfig, nodeId }) {
  const csvData     = config.csvData     ?? '';
  const bank        = config.bank        ?? 'auto';
  const dateFormat  = config.dateFormat  ?? 'auto';
  const currency    = config.currency    ?? 'INR';
  const categorize  = config.categorize  ?? true;
  const summary     = config.summary     ?? true;
  const aiModel     = config.aiModel     ?? 'gpt-4o-mini';
  const debitCol    = config.debitCol    ?? '';
  const creditCol   = config.creditCol   ?? '';
  const dateCol     = config.dateCol     ?? '';
  const descCol     = config.descCol     ?? '';

  const BANKS = [
    { value: 'auto',  label: 'Auto Detect' },
    { value: 'sbi',   label: 'SBI' },
    { value: 'hdfc',  label: 'HDFC' },
    { value: 'icici', label: 'ICICI' },
    { value: 'axis',  label: 'Axis Bank' },
    { value: 'kotak', label: 'Kotak' },
    { value: 'custom',label: 'Custom CSV' },
  ];

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
          <Table2 className="w-4 h-4 text-indigo-400" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Bank Statement Parser</div>
          <div className="text-[11px] text-zinc-500">Parse CSV bank statements and categorize transactions</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">CSV Data</label>
        <SmartVariableInput value={csvData} onChange={(v) => updateConfig('csvData', v)}
          placeholder="{{ $json.csvContent }}  (raw CSV string or URL)" multiline nodeId={nodeId} />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Bank Format</label>
        <div className="flex flex-wrap gap-1.5">
          {BANKS.map((b) => (
            <button key={b.value} onClick={() => updateConfig('bank', b.value)}
              className={`py-1.5 px-3 rounded-lg text-[10px] font-bold border transition-all ${bank === b.value ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
              {b.label}
            </button>
          ))}
        </div>
      </div>

      {bank === 'custom' && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Column Mapping</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { key: 'dateCol',   label: 'Date Column',        ph: 'Date or column index 0' },
              { key: 'descCol',   label: 'Description Column', ph: 'Narration' },
              { key: 'debitCol',  label: 'Debit Column',       ph: 'Withdrawal Amt' },
              { key: 'creditCol', label: 'Credit Column',      ph: 'Deposit Amt' },
            ].map(({ key, label, ph }) => (
              <div key={key}>
                <label className="text-[9px] text-zinc-500 uppercase tracking-wider mb-1 block">{label}</label>
                <input value={config[key] ?? ''} onChange={(e) => updateConfig(key, e.target.value)} placeholder={ph}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-[12px] text-zinc-100 font-mono focus:outline-none focus:border-zinc-500" />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Currency</label>
          <input value={currency} onChange={(e) => updateConfig('currency', e.target.value)} placeholder="INR"
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 font-mono focus:outline-none focus:border-zinc-500" />
        </div>
        <div className="flex-1">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Date Format</label>
          <input value={dateFormat} onChange={(e) => updateConfig('dateFormat', e.target.value)} placeholder="auto  or  DD/MM/YYYY"
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 font-mono focus:outline-none focus:border-zinc-500" />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {[
          { key: 'categorize', label: 'AI Categorize',  desc: 'Auto-label transactions (food, salary, rent…)' },
          { key: 'summary',    label: 'Generate Summary', desc: 'Total credits, debits, balance, top categories' },
        ].map(({ key, label, desc }) => (
          <div key={key} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
            <div>
              <p className="text-[12px] font-semibold text-zinc-300">{label}</p>
              <p className="text-[10px] text-zinc-600">{desc}</p>
            </div>
            <button onClick={() => updateConfig(key, !config[key])}
              className={`w-10 h-5 rounded-full border transition-all relative ${config[key] ? 'bg-indigo-500 border-indigo-400' : 'bg-zinc-700 border-zinc-600'}`}>
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${config[key] ? 'left-5' : 'left-0.5'}`} />
            </button>
          </div>
        ))}
      </div>

      {(categorize || summary) && (
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">AI Model</label>
            <select value={aiModel} onChange={(e) => updateConfig('aiModel', e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-200 focus:outline-none cursor-pointer">
              <option value="gpt-4o-mini">GPT-4o Mini</option>
              <option value="gpt-4o">GPT-4o</option>
              <option value="claude-haiku-4-5-20251001">Claude Haiku</option>
            </select>
          </div>
          <div className="flex-1">
            <CredentialPicker
              value={config.credentialId || ''}
              onChange={(id) => updateConfig('credentialId', id)}
              accentColor="emerald"
              label="LLM API Key"
              placeholder="Select API key..."
            />
          </div>
        </div>
      )}

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        Returns: <span className="text-zinc-300">transactions[], totalCredit, totalDebit, closingBalance
          {categorize ? ', categories{}' : ''}{summary ? ', summary string' : ''}</span>
      </div>
    </div>
  );
}
