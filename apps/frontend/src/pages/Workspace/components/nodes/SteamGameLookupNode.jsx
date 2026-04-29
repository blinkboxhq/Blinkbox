import { Gamepad2 } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';

const FIELDS = [
  { value: 'name',              label: 'Game Name' },
  { value: 'description',       label: 'Description' },
  { value: 'price',             label: 'Price' },
  { value: 'release_date',      label: 'Release Date' },
  { value: 'developers',        label: 'Developers' },
  { value: 'publishers',        label: 'Publishers' },
  { value: 'genres',            label: 'Genres' },
  { value: 'tags',              label: 'Tags' },
  { value: 'review_score',      label: 'Review Score' },
  { value: 'metacritic',        label: 'Metacritic Score' },
  { value: 'header_image',      label: 'Header Image' },
  { value: 'screenshots',       label: 'Screenshots' },
  { value: 'platforms',         label: 'Platforms' },
  { value: 'achievements',      label: 'Achievements Count' },
  { value: 'dlc',               label: 'DLC List' },
];

export default function SteamGameLookupNode({ config = {}, updateConfig }) {
  const query   = config.query   ?? '';
  const mode    = config.mode    ?? 'search'; // search | appid | player_summary
  const fields  = config.fields  ?? ['name','description','price','review_score','genres','header_image'];
  const country = config.country ?? 'US';

  const toggleField = (f) => {
    const next = fields.includes(f) ? fields.filter((x) => x !== f) : [...fields, f];
    updateConfig('fields', next);
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-[#1b2838]/80 border border-[#2a475e]/60 flex items-center justify-center">
          <Gamepad2 className="w-4 h-4 text-[#66c0f4]" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Steam Game Lookup</div>
          <div className="text-[11px] text-zinc-500">Fetch game info, reviews and player data from Steam</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Mode</label>
        <div className="flex gap-1.5">
          {[
            { value: 'search',         label: 'Search by Name' },
            { value: 'appid',          label: 'Lookup by App ID' },
            { value: 'player_summary', label: 'Player Summary' },
          ].map((m) => (
            <button key={m.value} onClick={() => updateConfig('mode', m.value)}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${mode === m.value ? 'bg-[#66c0f4]/20 border-[#66c0f4]/40 text-[#66c0f4]' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">
          {mode === 'search' ? 'Game Name' : mode === 'appid' ? 'App ID' : 'Steam ID64'}
        </label>
        <SmartVariableInput value={query} onChange={(v) => updateConfig('query', v)}
          placeholder={mode === 'search' ? 'Counter-Strike 2' : mode === 'appid' ? '730' : '76561198000000000'} />
      </div>

      {mode !== 'player_summary' && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Price Country (ISO code)</label>
            <input value={country} onChange={(e) => updateConfig('country', e.target.value)} placeholder="US"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 font-mono focus:outline-none focus:border-zinc-500" />
            <p className="text-[10px] text-zinc-600 mt-1">Affects price currency. Use IN for INR, GB for GBP etc.</p>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Fields to Return</label>
            <div className="grid grid-cols-2 gap-1">
              {FIELDS.map((f) => (
                <button key={f.value} onClick={() => toggleField(f.value)}
                  className={`py-1.5 px-2 rounded-lg text-[10px] font-semibold border transition-all text-left ${fields.includes(f.value) ? 'bg-[#66c0f4]/15 border-[#66c0f4]/30 text-[#66c0f4]' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        Powered by <span className="text-zinc-300">Steam Web API + Store API</span> — no key needed for public data
      </div>
    </div>
  );
}
