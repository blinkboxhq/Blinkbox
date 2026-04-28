import { Package } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';

const INFO_FIELDS = [
  { value: 'version',         label: 'Latest Version' },
  { value: 'description',     label: 'Description' },
  { value: 'author',          label: 'Author' },
  { value: 'license',         label: 'License' },
  { value: 'homepage',        label: 'Homepage' },
  { value: 'repository',      label: 'Repository' },
  { value: 'downloads',       label: 'Weekly Downloads' },
  { value: 'dependencies',    label: 'Dependencies' },
  { value: 'keywords',        label: 'Keywords' },
  { value: 'versions',        label: 'All Versions' },
  { value: 'publishedAt',     label: 'Published At' },
  { value: 'maintainers',     label: 'Maintainers' },
];

export default function NpmPackageInfoNode({ config = {}, updateConfig }) {
  const packageName = config.packageName ?? '';
  const version = config.version ?? 'latest';
  const fields = config.fields ?? ['version', 'description', 'author', 'license', 'homepage', 'downloads'];

  const toggleField = (f) => {
    const next = fields.includes(f) ? fields.filter((x) => x !== f) : [...fields, f];
    updateConfig('fields', next);
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <Package className="w-4 h-4 text-red-400" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">NPM Package Info</div>
          <div className="text-[11px] text-zinc-500">Fetch metadata for any npm package</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Package Name</label>
        <SmartVariableInput value={packageName} onChange={(v) => updateConfig('packageName', v)} placeholder='react  or  @anthropic-ai/sdk  or  {{ $json.package }}' />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Version</label>
        <input value={version} onChange={(e) => updateConfig('version', e.target.value)} placeholder="latest or 18.2.0"
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 font-mono focus:outline-none focus:border-zinc-500" />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Fields to Return</label>
        <div className="grid grid-cols-2 gap-1">
          {INFO_FIELDS.map((f) => (
            <button key={f.value} onClick={() => toggleField(f.value)}
              className={`py-1.5 px-2 rounded-lg text-[10px] font-semibold border transition-all text-left ${fields.includes(f.value) ? 'bg-red-500/15 border-red-500/30 text-red-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        Powered by <span className="text-zinc-300">registry.npmjs.org</span> — no API key required
      </div>
    </div>
  );
}
