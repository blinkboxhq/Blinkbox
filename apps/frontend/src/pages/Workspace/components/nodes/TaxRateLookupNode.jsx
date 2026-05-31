import { Search } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';

const COUNTRIES = [
  { code: 'IN', label: 'India (GST)' },
  { code: 'US', label: 'United States (Sales Tax)' },
  { code: 'GB', label: 'United Kingdom (VAT)' },
  { code: 'AU', label: 'Australia (GST)' },
  { code: 'DE', label: 'Germany (MwSt)' },
  { code: 'FR', label: 'France (TVA)' },
  { code: 'CA', label: 'Canada (GST/HST)' },
  { code: 'SG', label: 'Singapore (GST)' },
  { code: 'AE', label: 'UAE (VAT)' },
  { code: 'JP', label: 'Japan (Consumption Tax)' },
  { code: 'BR', label: 'Brazil (ICMS/ISS)' },
  { code: 'ZA', label: 'South Africa (VAT)' },
];

export default function TaxRateLookupNode({ config = {}, updateConfig, nodeId }) {
  const country   = config.country   ?? 'IN';
  const category  = config.category  ?? 'general'; // general | food | medical | services | luxury
  const state     = config.state     ?? '';
  const hsn       = config.hsn       ?? '';
  const mode      = config.mode      ?? 'rate'; // rate | validate_gstin | hsn_lookup

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <Search className="w-4 h-4 text-emerald-400" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Tax Rate Lookup</div>
          <div className="text-[11px] text-zinc-500">Fetch current tax rates by country, category or HSN</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Mode</label>
        <div className="flex gap-1.5">
          {[
            { value: 'rate',            label: 'Get Tax Rate' },
            { value: 'hsn_lookup',      label: 'HSN / SAC Lookup' },
            { value: 'validate_gstin',  label: 'Validate GSTIN' },
          ].map((m) => (
            <button key={m.value} onClick={() => updateConfig('mode', m.value)}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${mode === m.value ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {mode === 'validate_gstin' ? (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">GSTIN</label>
          <SmartVariableInput value={hsn} onChange={(v) => updateConfig('hsn', v)} placeholder="27AAPFU0939F1ZV  or  {{ $json.gstin }}" />
          <p className="text-[10px] text-zinc-600 mt-1">Validates via GST portal, returns business name, state and status</p>
        </div>
      ) : mode === 'hsn_lookup' ? (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">HSN / SAC Code</label>
            <SmartVariableInput value={hsn} onChange={(v) => updateConfig('hsn', v)} placeholder="0101  or  {{ $json.hsnCode }}" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Country</label>
            <select value={country} onChange={(e) => updateConfig('country', e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-200 focus:outline-none cursor-pointer">
              {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
            </select>
          </div>
        </>
      ) : (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Country</label>
            <select value={country} onChange={(e) => updateConfig('country', e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-200 focus:outline-none cursor-pointer">
              {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Category</label>
            <div className="flex flex-wrap gap-1.5">
              {['general','food','medical','education','services','luxury','exports','exempt'].map((c) => (
                <button key={c} onClick={() => updateConfig('category', c)}
                  className={`py-1.5 px-3 capitalize rounded-lg text-[10px] font-bold border transition-all ${category === c ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>
          {(country === 'IN' || country === 'US' || country === 'CA') && (
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">
                {country === 'IN' ? 'State (for CGST/SGST split)' : 'State / Province'}
              </label>
              <SmartVariableInput value={state} onChange={(v) => updateConfig('state', v)}
                placeholder={country === 'IN' ? 'Maharashtra' : country === 'US' ? 'California' : 'Ontario'} />
            </div>
          )}
        </>
      )}

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        {mode === 'rate'           && <>Returns: <span className="text-zinc-300">rate (%), breakdown, category, country, effectiveDate</span></>}
        {mode === 'hsn_lookup'     && <>Returns: <span className="text-zinc-300">hsnCode, description, gstRate, cess, category</span></>}
        {mode === 'validate_gstin' && <>Returns: <span className="text-zinc-300">valid, businessName, state, status, registrationDate</span></>}
      </div>
    </div>
  );
}
