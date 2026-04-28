import { Pill } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';

export default function DrugLookupNode({ config = {}, updateConfig }) {
  const query = config.query ?? '';
  const searchBy = config.searchBy ?? 'name'; // 'name' | 'ndc' | 'application_number'
  const infoFields = config.infoFields ?? ['brand_name', 'generic_name', 'dosage_form', 'route', 'warnings', 'indications_and_usage'];

  const ALL_FIELDS = [
    { value: 'brand_name',            label: 'Brand Name' },
    { value: 'generic_name',          label: 'Generic Name' },
    { value: 'dosage_form',           label: 'Dosage Form' },
    { value: 'route',                 label: 'Route' },
    { value: 'indications_and_usage', label: 'Indications & Usage' },
    { value: 'warnings',              label: 'Warnings' },
    { value: 'contraindications',     label: 'Contraindications' },
    { value: 'adverse_reactions',     label: 'Adverse Reactions' },
    { value: 'drug_interactions',     label: 'Drug Interactions' },
    { value: 'dosage_and_administration', label: 'Dosage & Admin' },
    { value: 'manufacturer_name',     label: 'Manufacturer' },
  ];

  const toggleField = (f) => {
    const next = infoFields.includes(f) ? infoFields.filter((x) => x !== f) : [...infoFields, f];
    updateConfig('infoFields', next);
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center">
          <Pill className="w-4 h-4 text-green-400" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Drug Lookup</div>
          <div className="text-[11px] text-zinc-500">Query FDA drug database (openFDA)</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Search By</label>
        <div className="flex gap-1.5">
          {[
            { value: 'name',               label: 'Drug Name' },
            { value: 'ndc',                label: 'NDC Code' },
            { value: 'application_number', label: 'App Number' },
          ].map((s) => (
            <button key={s.value} onClick={() => updateConfig('searchBy', s.value)}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${searchBy === s.value ? 'bg-green-500/20 border-green-500/40 text-green-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">
          {searchBy === 'name' ? 'Drug Name' : searchBy === 'ndc' ? 'NDC Code' : 'Application Number'}
        </label>
        <SmartVariableInput value={query} onChange={(v) => updateConfig('query', v)}
          placeholder={searchBy === 'name' ? 'aspirin' : searchBy === 'ndc' ? '0363-0133' : '021069'} />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Fields to Return</label>
        <div className="grid grid-cols-2 gap-1">
          {ALL_FIELDS.map((f) => (
            <button key={f.value} onClick={() => toggleField(f.value)}
              className={`py-1.5 px-2 rounded-lg text-[10px] font-semibold border transition-all text-left ${infoFields.includes(f.value) ? 'bg-green-500/15 border-green-500/30 text-green-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        Powered by <span className="text-zinc-300">openFDA API</span> — no API key required
      </div>
    </div>
  );
}
