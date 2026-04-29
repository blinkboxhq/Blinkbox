import { Briefcase } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';

export default function PayrollCalculatorNode({ config = {}, updateConfig }) {
  const country     = config.country     ?? 'IN';
  const ctc         = config.ctc         ?? '';
  const employeeName= config.employeeName?? '';
  const panNumber   = config.panNumber   ?? '';
  const pfOpt       = config.pfOpt       ?? true;
  const esiOpt      = config.esiOpt      ?? true;
  const regime      = config.regime      ?? 'new'; // new | old (India)
  const month       = config.month       ?? '';
  const lop         = config.lop         ?? 0;
  const bonus       = config.bonus       ?? 0;
  const workingDays = config.workingDays ?? 26;
  const allowances  = config.allowances  ?? '';

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
          <Briefcase className="w-4 h-4 text-violet-400" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Payroll Calculator</div>
          <div className="text-[11px] text-zinc-500">Compute net salary with PF, ESI, TDS and deductions</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Country</label>
        <div className="flex gap-1.5">
          {[{ value: 'IN', label: 'India' }, { value: 'US', label: 'USA' }, { value: 'GB', label: 'UK' }, { value: 'AE', label: 'UAE' }].map((c) => (
            <button key={c.value} onClick={() => updateConfig('country', c.value)}
              className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${country === c.value ? 'bg-violet-500/20 border-violet-500/40 text-violet-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Employee Name (optional)</label>
        <SmartVariableInput value={employeeName} onChange={(v) => updateConfig('employeeName', v)} placeholder="{{ $json.name }}" />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">
          {country === 'IN' ? 'Annual CTC (₹)' : country === 'US' ? 'Annual Salary ($)' : country === 'GB' ? 'Annual Salary (£)' : 'Annual Salary (AED)'}
        </label>
        <SmartVariableInput value={ctc} onChange={(v) => updateConfig('ctc', v)} placeholder="{{ $json.ctc }}" />
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Pay Month</label>
          <input type="month" value={month} onChange={(e) => updateConfig('month', e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
        </div>
        <div className="flex-1">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Working Days/Month</label>
          <input type="number" min={1} max={31} value={workingDays} onChange={(e) => updateConfig('workingDays', Number(e.target.value))}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
        </div>
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Loss of Pay Days</label>
          <input type="number" min={0} value={lop} onChange={(e) => updateConfig('lop', Number(e.target.value))}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
        </div>
        <div className="flex-1">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Bonus / Incentive</label>
          <SmartVariableInput value={bonus} onChange={(v) => updateConfig('bonus', v)} placeholder="0" />
        </div>
      </div>

      {country === 'IN' && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Tax Regime</label>
            <div className="flex gap-1.5">
              {[{ value: 'new', label: 'New Regime (FY 2024-25)' }, { value: 'old', label: 'Old Regime' }].map((r) => (
                <button key={r.value} onClick={() => updateConfig('regime', r.value)}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${regime === r.value ? 'bg-violet-500/20 border-violet-500/40 text-violet-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">PAN Number (for TDS)</label>
            <SmartVariableInput value={panNumber} onChange={(v) => updateConfig('panNumber', v)} placeholder="{{ $json.pan }}" />
          </div>

          <div className="flex flex-col gap-2">
            {[
              { key: 'pfOpt',  label: 'Include PF (Provident Fund)',  desc: 'Employee 12% + Employer 12% of basic' },
              { key: 'esiOpt', label: 'Include ESI',                  desc: 'Applicable if gross < ₹21,000/month' },
            ].map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
                <div>
                  <p className="text-[12px] font-semibold text-zinc-300">{label}</p>
                  <p className="text-[10px] text-zinc-600">{desc}</p>
                </div>
                <button onClick={() => updateConfig(key, !config[key])}
                  className={`w-10 h-5 rounded-full border transition-all relative ${config[key] ? 'bg-violet-500 border-violet-400' : 'bg-zinc-700 border-zinc-600'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${config[key] ? 'left-5' : 'left-0.5'}`} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Extra Allowances (JSON, optional)</label>
        <textarea value={allowances} onChange={(e) => updateConfig('allowances', e.target.value)} rows={2}
          placeholder={'{ "HRA": 5000, "Travel": 1600, "Medical": 1250 }'}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[12px] text-zinc-100 font-mono focus:outline-none focus:border-zinc-500 resize-none" />
      </div>

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500 leading-relaxed">
        Returns: <span className="text-zinc-300">grossSalary, netSalary, ctcAnnual, deductions{`{`}pf, esi, tds, lop{`}`},
          {country === 'IN' ? ' taxableIncome, tds, regime,' : ''} payslip object</span>
      </div>
    </div>
  );
}
