import { GitBranch } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';

const OPERATIONS = [
  { value: 'gt',           label: 'A > B',        desc: 'Is A greater than B?' },
  { value: 'gte',          label: 'A >= B',       desc: 'Is A greater or equal?' },
  { value: 'lt',           label: 'A < B',        desc: 'Is A less than B?' },
  { value: 'lte',          label: 'A <= B',       desc: 'Is A less or equal?' },
  { value: 'eq',           label: 'A == B',       desc: 'Are they equal?' },
  { value: 'neq',          label: 'A != B',       desc: 'Are they different?' },
  { value: 'satisfies',    label: 'satisfies',    desc: 'Does A satisfy a range?' },
  { value: 'diff',         label: 'diff type',    desc: 'major / minor / patch / null' },
  { value: 'sort',         label: 'sort array',   desc: 'Sort a version array' },
  { value: 'max',          label: 'max version',  desc: 'Highest version in array' },
  { value: 'coerce',       label: 'coerce',       desc: 'Force "v1.2" → "1.2.0"' },
  { value: 'valid',        label: 'is valid',     desc: 'Is A a valid semver string?' },
];

export default function SemverCompareNode({ config = {}, updateConfig }) {
  const operation = config.operation ?? 'gt';
  const versionA = config.versionA ?? '';
  const versionB = config.versionB ?? '';
  const range = config.range ?? '';
  const versions = config.versions ?? '';
  const outputField = config.outputField ?? 'result';

  const needsB = ['gt','gte','lt','lte','eq','neq','diff'].includes(operation);
  const needsRange = operation === 'satisfies';
  const needsArray = ['sort','max'].includes(operation);
  const needsA = !needsArray;

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
          <GitBranch className="w-4 h-4 text-indigo-400" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Semver Compare</div>
          <div className="text-[11px] text-zinc-500">Compare, sort and validate semantic version strings</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Operation</label>
        <div className="grid grid-cols-2 gap-1">
          {OPERATIONS.map((op) => (
            <button key={op.value} onClick={() => updateConfig('operation', op.value)}
              className={`flex flex-col py-1.5 px-2 rounded-lg text-left border transition-all ${operation === op.value ? 'bg-indigo-500/20 border-indigo-500/40' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'}`}>
              <span className={`text-[11px] font-bold font-mono ${operation === op.value ? 'text-indigo-300' : 'text-zinc-400'}`}>{op.label}</span>
              <span className="text-[9px] text-zinc-600">{op.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {needsA && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Version A</label>
          <SmartVariableInput value={versionA} onChange={(v) => updateConfig('versionA', v)} placeholder='1.2.3  or  {{ $json.version }}' />
        </div>
      )}

      {needsB && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Version B</label>
          <SmartVariableInput value={versionB} onChange={(v) => updateConfig('versionB', v)} placeholder='2.0.0  or  {{ $json.latestVersion }}' />
        </div>
      )}

      {needsRange && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Version Range</label>
          <SmartVariableInput value={range} onChange={(v) => updateConfig('range', v)} placeholder='>=1.2.3 <2.0.0  or  ^1.0.0' />
          <p className="text-[10px] text-zinc-600 mt-1">Supports npm semver range syntax</p>
        </div>
      )}

      {needsArray && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Versions (JSON array or field)</label>
          <SmartVariableInput value={versions} onChange={(v) => updateConfig('versions', v)} placeholder='{{ $json.versions }}  or  ["1.0.0","2.1.0","1.5.3"]' />
        </div>
      )}

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Output Field</label>
        <input value={outputField} onChange={(e) => updateConfig('outputField', e.target.value)} placeholder="result"
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 font-mono focus:outline-none focus:border-zinc-500" />
      </div>

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        {needsB && <>Returns: <span className="text-zinc-300">boolean{operation === 'diff' ? ' or "major"/"minor"/"patch"' : ''}</span></>}
        {needsRange && <>Returns: <span className="text-zinc-300">boolean</span></>}
        {operation === 'sort' && <>Returns: <span className="text-zinc-300">sorted versions array (ascending)</span></>}
        {operation === 'max' && <>Returns: <span className="text-zinc-300">highest version string</span></>}
        {operation === 'coerce' && <>Returns: <span className="text-zinc-300">normalized version string or null</span></>}
        {operation === 'valid' && <>Returns: <span className="text-zinc-300">boolean</span></>}
      </div>
    </div>
  );
}
