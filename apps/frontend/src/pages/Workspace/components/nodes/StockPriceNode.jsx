import { TrendingUp } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';
import CredentialPicker from '../../../../components/ui/CredentialPicker';

export default function StockPriceNode({ config = {}, updateConfig, nodeId }) {
  const symbol = config.symbol ?? '';
  const mode = config.mode ?? 'quote'; // 'quote' | 'history' | 'search'
  const interval = config.interval ?? 'daily';
  const outputSize = config.outputSize ?? 'compact';
  const apiKey = config.apiKey ?? '';

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Stock Price</div>
          <div className="text-[11px] text-zinc-500">Live and historical stock data via Alpha Vantage</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Ticker Symbol</label>
        <SmartVariableInput value={symbol} onChange={(v) => updateConfig('symbol', v)} placeholder='AAPL  or  {{ $json.ticker }}' />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Mode</label>
        <div className="flex gap-1.5">
          {[
            { value: 'quote',   label: 'Live Quote' },
            { value: 'history', label: 'History' },
            { value: 'search',  label: 'Search' },
          ].map((m) => (
            <button key={m.value} onClick={() => updateConfig('mode', m.value)}
              className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${mode === m.value ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {mode === 'history' && (
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Interval</label>
            <select value={interval} onChange={(e) => updateConfig('interval', e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-200 focus:outline-none cursor-pointer">
              <option value="1min">1 Min</option>
              <option value="5min">5 Min</option>
              <option value="15min">15 Min</option>
              <option value="60min">1 Hour</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Output Size</label>
            <select value={outputSize} onChange={(e) => updateConfig('outputSize', e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-200 focus:outline-none cursor-pointer">
              <option value="compact">Compact (100)</option>
              <option value="full">Full (20 yrs)</option>
            </select>
          </div>
        </div>
      )}

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Alpha Vantage API Key</label>
        <CredentialPicker
        value={config.credentialId || ''}
        onChange={(id) => updateConfig('credentialId', id)}
        accentColor="blue"
        label="Alpha Vantage / FMP Key"
        placeholder="Select Alpha Vantage / FMP Key..."
      />
      </div>

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        {mode === 'quote'
          ? <>Returns: <span className="text-zinc-300">price, open, high, low, volume, change, change%</span></>
          : mode === 'history'
          ? <>Returns: <span className="text-zinc-300">time-series OHLCV data array</span></>
          : <>Returns: <span className="text-zinc-300">matching tickers with name, type, region</span></>
        }
      </div>
    </div>
  );
}
