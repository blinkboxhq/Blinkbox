import { MapPin } from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';

const FIELDS = [
  { value: 'ip',           label: 'IP Address' },
  { value: 'city',         label: 'City' },
  { value: 'region',       label: 'Region' },
  { value: 'country_name', label: 'Country' },
  { value: 'country_code', label: 'Country Code' },
  { value: 'postal',       label: 'Postal Code' },
  { value: 'latitude',     label: 'Latitude' },
  { value: 'longitude',    label: 'Longitude' },
  { value: 'timezone',     label: 'Timezone' },
  { value: 'org',          label: 'ISP / Org' },
  { value: 'asn',          label: 'ASN' },
  { value: 'currency',     label: 'Currency' },
  { value: 'languages',    label: 'Languages' },
];

export default function IpLookupNode({ config = {}, updateConfig, nodeId }) {
  const ip = config.ip ?? '';
  const fields = config.fields ?? ['ip', 'city', 'region', 'country_name', 'latitude', 'longitude', 'timezone', 'org'];

  const toggleField = (f) => {
    const next = fields.includes(f) ? fields.filter((x) => x !== f) : [...fields, f];
    updateConfig('fields', next);
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
          <MapPin className="w-4 h-4 text-violet-400" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">IP Lookup</div>
          <div className="text-[11px] text-zinc-500">Geolocation and ISP info from an IP address</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">IP Address</label>
        <SmartVariableInput value={ip} onChange={(v) => updateConfig('ip', v)} placeholder='8.8.8.8  or  {{ $json.ip }}' />
        <p className="text-[10px] text-zinc-600 mt-1">Leave blank to look up the current request's IP</p>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Fields to Return</label>
        <div className="grid grid-cols-2 gap-1">
          {FIELDS.map((f) => (
            <button key={f.value} onClick={() => toggleField(f.value)}
              className={`py-1.5 px-2 rounded-lg text-[10px] font-semibold border transition-all text-left ${fields.includes(f.value) ? 'bg-violet-500/15 border-violet-500/30 text-violet-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        Powered by <span className="text-zinc-300">ipapi.co</span> — free tier, no key required
      </div>
    </div>
  );
}
