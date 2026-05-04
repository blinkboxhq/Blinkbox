import { TrendingUp } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';

export default function CompoundInterestNode({ config = {}, updateConfig, nodeId }) {
  const mode        = config.mode        ?? 'compound'; // compound | simple | emi | sip | lumpsum | fd
  const principal   = config.principal   ?? '';
  const rate        = config.rate        ?? '';
  const time        = config.time        ?? '';
  const timeUnit    = config.timeUnit    ?? 'years';
  const frequency   = config.frequency   ?? 'annually';
  const emi         = config.emi         ?? '';
  const monthlyInv  = config.monthlyInv  ?? '';
  const currency    = config.currency    ?? 'INR';

  const MODES = [
    { value: 'compound', label: 'Compound Interest' },
    { value: 'simple',   label: 'Simple Interest' },
    { value: 'emi',      label: 'EMI (Loan)' },
    { value: 'sip',      label: 'SIP Returns' },
    { value: 'lumpsum',  label: 'Lumpsum Returns' },
    { value: 'fd',       label: 'FD Maturity' },
  ];

  const FREQUENCIES = ['annually','semi-annually','quarterly','monthly','daily'];

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center">
          <TrendingUp className="w-4 h-4 text-green-400" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Compound Interest</div>
          <div className="text-[11px] text-zinc-500">Financial calculations — CI, SI, EMI, SIP, FD</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Calculation Mode</label>
        <div className="grid grid-cols-3 gap-1.5">
          {MODES.map((m) => (
            <button key={m.value} onClick={() => updateConfig('mode', m.value)}
              className={`py-1.5 rounded-lg text-[10px] font-bold border transition-all ${mode === m.value ? 'bg-green-500/20 border-green-500/40 text-green-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {mode === 'sip' ? (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Monthly Investment</label>
          <SmartVariableInput value={monthlyInv} onChange={(v) => updateConfig('monthlyInv', v)} placeholder="{{ $json.monthlyAmount }}" />
        </div>
      ) : (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">
            {mode === 'emi' ? 'Loan Amount (Principal)' : 'Principal Amount'}
          </label>
          <SmartVariableInput value={principal} onChange={(v) => updateConfig('principal', v)} placeholder="{{ $json.amount }}" />
        </div>
      )}

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Annual Rate (%)</label>
          <SmartVariableInput value={rate} onChange={(v) => updateConfig('rate', v)} placeholder="{{ $json.rate }}" />
        </div>
        <div className="flex-1">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Currency</label>
          <input value={currency} onChange={(e) => updateConfig('currency', e.target.value)} placeholder="INR"
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 font-mono focus:outline-none focus:border-zinc-500" />
        </div>
      </div>

      <div className="flex gap-2">
        <div className="flex-[2]">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">
            {mode === 'emi' ? 'Loan Tenure' : 'Time Period'}
          </label>
          <SmartVariableInput value={time} onChange={(v) => updateConfig('time', v)} placeholder="{{ $json.years }}" />
        </div>
        <div className="flex-1">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Unit</label>
          <select value={timeUnit} onChange={(e) => updateConfig('timeUnit', e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-200 focus:outline-none cursor-pointer">
            <option value="months">Months</option>
            <option value="years">Years</option>
          </select>
        </div>
      </div>

      {(mode === 'compound' || mode === 'fd') && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Compounding Frequency</label>
          <div className="flex flex-wrap gap-1.5">
            {FREQUENCIES.map((f) => (
              <button key={f} onClick={() => updateConfig('frequency', f)}
                className={`py-1.5 px-2.5 capitalize rounded-lg text-[10px] font-bold border transition-all ${frequency === f ? 'bg-green-500/20 border-green-500/40 text-green-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
                {f}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        {mode === 'compound' && <>Returns: <span className="text-zinc-300">maturityAmount, interestEarned, principal, rate, years, breakdown[]</span></>}
        {mode === 'simple'   && <>Returns: <span className="text-zinc-300">totalAmount, simpleInterest, principal, rate, time</span></>}
        {mode === 'emi'      && <>Returns: <span className="text-zinc-300">emi, totalPayment, totalInterest, principal, schedule[]</span></>}
        {mode === 'sip'      && <>Returns: <span className="text-zinc-300">maturityAmount, totalInvested, wealthGain, xirr</span></>}
        {mode === 'lumpsum'  && <>Returns: <span className="text-zinc-300">maturityAmount, absoluteReturn, cagr, years</span></>}
        {mode === 'fd'       && <>Returns: <span className="text-zinc-300">maturityAmount, interestEarned, effectiveRate, tds</span></>}
      </div>
    </div>
  );
}
