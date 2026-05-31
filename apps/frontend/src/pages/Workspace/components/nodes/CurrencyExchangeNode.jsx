import { DollarSign } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';

const COMMON_CURRENCIES = ['USD','EUR','GBP','INR','JPY','AUD','CAD','CHF','CNY','SGD','AED','SAR','MXN','BRL','KRW','HKD'];

export default function CurrencyExchangeNode({ config = {}, updateConfig, nodeId }) {
  const from = config.from ?? 'USD';
  const to = config.to ?? 'INR';
  const amount = config.amount ?? '1';
  const mode = config.mode ?? 'convert'; // 'convert' | 'rate' | 'list'

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
          <DollarSign className="w-4 h-4 text-yellow-400" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Currency Exchange</div>
          <div className="text-[11px] text-zinc-500">Live FX rates via ExchangeRate-API (free)</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Mode</label>
        <div className="flex gap-1.5">
          {[
            { value: 'convert', label: 'Convert Amount' },
            { value: 'rate',    label: 'Get Rate' },
            { value: 'list',    label: 'All Rates' },
          ].map((m) => (
            <button key={m.value} onClick={() => updateConfig('mode', m.value)}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${mode === m.value ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">From</label>
          <select value={from} onChange={(e) => updateConfig('from', e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-200 focus:outline-none cursor-pointer">
            {COMMON_CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="text-zinc-600 text-lg pb-2">→</div>
        <div className="flex-1">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">To</label>
          <select value={to} onChange={(e) => updateConfig('to', e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-200 focus:outline-none cursor-pointer">
            {COMMON_CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {mode === 'convert' && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Amount</label>
          <SmartVariableInput value={amount} onChange={(v) => updateConfig('amount', v)} placeholder='100  or  {{ $json.amount }}' />
        </div>
      )}

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        {mode === 'convert'
          ? <>Returns: <span className="text-zinc-300">result, rate, from, to, timestamp</span></>
          : mode === 'rate'
          ? <>Returns: <span className="text-zinc-300">rate, from, to, timestamp</span></>
          : <>Returns: <span className="text-zinc-300">base currency + all conversion rates</span></>
        }
        <span className="text-zinc-600 ml-1">— No API key needed</span>
      </div>
    </div>
  );
}
