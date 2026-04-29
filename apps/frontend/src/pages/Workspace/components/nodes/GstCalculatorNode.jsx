import { Calculator } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';

const GST_RATES = [0, 0.1, 0.25, 3, 5, 12, 18, 28];

export default function GstCalculatorNode({ config = {}, updateConfig }) {
  const amount      = config.amount      ?? '';
  const gstRate     = config.gstRate     ?? 18;
  const mode        = config.mode        ?? 'exclusive'; // exclusive | inclusive
  const breakdown   = config.breakdown   ?? 'igst'; // igst | cgst_sgst
  const state       = config.state       ?? '';
  const customRate  = config.customRate  ?? false;
  const cess        = config.cess        ?? 0;

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
          <Calculator className="w-4 h-4 text-orange-400" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">GST Calculator</div>
          <div className="text-[11px] text-zinc-500">Indian GST compute with CGST/SGST/IGST breakdown</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Amount (₹)</label>
        <SmartVariableInput value={amount} onChange={(v) => updateConfig('amount', v)} placeholder="{{ $json.amount }}" />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">GST Rate (%)</label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {GST_RATES.map((r) => (
            <button key={r} onClick={() => { updateConfig('gstRate', r); updateConfig('customRate', false); }}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${!customRate && gstRate === r ? 'bg-orange-500/20 border-orange-500/40 text-orange-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
              {r}%
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => updateConfig('customRate', !customRate)}
            className={`text-[10px] font-bold px-2.5 py-1 rounded border transition-all ${customRate ? 'bg-orange-500/20 border-orange-500/40 text-orange-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}>
            Custom
          </button>
          {customRate && (
            <input type="number" min={0} max={100} step={0.01} value={gstRate}
              onChange={(e) => updateConfig('gstRate', Number(e.target.value))}
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
          )}
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Amount Type</label>
        <div className="flex gap-1.5">
          {[
            { value: 'exclusive', label: 'Exclusive (add GST)',    desc: 'Base amount, GST added on top' },
            { value: 'inclusive', label: 'Inclusive (extract GST)', desc: 'Total includes GST' },
          ].map((m) => (
            <button key={m.value} onClick={() => updateConfig('mode', m.value)}
              className={`flex-1 flex flex-col py-2 px-3 rounded-lg border transition-all text-left ${mode === m.value ? 'bg-orange-500/20 border-orange-500/40' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'}`}>
              <span className={`text-[11px] font-bold ${mode === m.value ? 'text-orange-300' : 'text-zinc-400'}`}>{m.label}</span>
              <span className="text-[9px] text-zinc-600 mt-0.5">{m.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Tax Breakdown</label>
        <div className="flex gap-1.5">
          {[
            { value: 'igst',      label: 'IGST',       desc: 'Interstate / exports' },
            { value: 'cgst_sgst', label: 'CGST + SGST', desc: 'Intrastate transaction' },
          ].map((b) => (
            <button key={b.value} onClick={() => updateConfig('breakdown', b.value)}
              className={`flex-1 flex flex-col py-2 px-3 rounded-lg border transition-all text-left ${breakdown === b.value ? 'bg-orange-500/20 border-orange-500/40' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'}`}>
              <span className={`text-[11px] font-bold ${breakdown === b.value ? 'text-orange-300' : 'text-zinc-400'}`}>{b.label}</span>
              <span className="text-[9px] text-zinc-600 mt-0.5">{b.desc}</span>
            </button>
          ))}
        </div>
        {breakdown === 'cgst_sgst' && (
          <input value={state} onChange={(e) => updateConfig('state', e.target.value)} placeholder="State name (e.g. Maharashtra)"
            className="w-full mt-2 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
        )}
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Cess (% on top of GST)</label>
        <input type="number" min={0} max={100} step={0.01} value={cess} onChange={(e) => updateConfig('cess', Number(e.target.value))}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
        <p className="text-[10px] text-zinc-600 mt-1">Applies to luxury goods, tobacco etc. Set 0 if not applicable.</p>
      </div>

      <div className="px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500 leading-relaxed">
        Returns: <span className="text-zinc-300">baseAmount, gstAmount, totalAmount, gstRate,
          {breakdown === 'igst' ? ' igst' : ' cgst, sgst'}{cess > 0 ? ', cess' : ''}, breakdown object</span>
      </div>
    </div>
  );
}
