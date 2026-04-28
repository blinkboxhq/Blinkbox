import { Key } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';

export default function EnvVariableNode({ config = {}, updateConfig }) {
  const vars = config.vars ?? [{ key: '', value: '' }];
  const mode = config.mode ?? 'inject'; // 'inject' | 'read' | 'check'

  const updateVar = (i, field, val) => {
    const next = vars.map((v, idx) => idx === i ? { ...v, [field]: val } : v);
    updateConfig('vars', next);
  };
  const addVar = () => updateConfig('vars', [...vars, { key: '', value: '' }]);
  const removeVar = (i) => updateConfig('vars', vars.filter((_, idx) => idx !== i));

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <Key className="w-4 h-4 text-emerald-400" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Environment Variable</div>
          <div className="text-[11px] text-zinc-500">Inject or read env vars in the workflow payload</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Mode</label>
        <div className="flex gap-1.5">
          {[
            { value: 'inject', label: 'Inject into payload' },
            { value: 'read',   label: 'Read from env' },
            { value: 'check',  label: 'Assert exists' },
          ].map((m) => (
            <button key={m.value} onClick={() => updateConfig('mode', m.value)}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${mode === m.value ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
          {mode === 'inject' ? 'Variables to Inject' : mode === 'read' ? 'Variables to Read' : 'Variables to Assert'}
        </label>
        {vars.map((v, i) => (
          <div key={i} className="flex gap-2 items-center">
            <input value={v.key} onChange={(e) => updateVar(i, 'key', e.target.value)}
              placeholder="VAR_NAME"
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[12px] text-zinc-100 font-mono focus:outline-none focus:border-zinc-500" />
            {mode === 'inject' && (
              <>
                <span className="text-zinc-600 text-xs">=</span>
                <div className="flex-1">
                  <SmartVariableInput value={v.value} onChange={(val) => updateVar(i, 'value', val)} placeholder="value or {{ expr }}" />
                </div>
              </>
            )}
            {vars.length > 1 && (
              <button onClick={() => removeVar(i)} className="text-zinc-600 hover:text-red-400 transition-colors px-1">✕</button>
            )}
          </div>
        ))}
        <button onClick={addVar}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 text-[11px] font-medium transition-all">
          + Add variable
        </button>
      </div>

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        {mode === 'inject' && <>Returns: <span className="text-zinc-300">payload merged with injected key-value pairs</span></>}
        {mode === 'read'   && <>Returns: <span className="text-zinc-300">object with env var values keyed by name</span></>}
        {mode === 'check'  && <>Returns: <span className="text-zinc-300">error if any asserted variable is missing</span></>}
      </div>
    </div>
  );
}
