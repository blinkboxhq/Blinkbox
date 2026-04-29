import { ToggleLeft } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';

export default function VariableSetGetNode({ config = {}, updateConfig }) {
  const mode    = config.mode    ?? 'set'; // set | get | delete | list
  const key     = config.key     ?? '';
  const value   = config.value   ?? '';
  const scope   = config.scope   ?? 'execution'; // execution | workflow | global
  const ttl     = config.ttl     ?? 0;
  const defaultVal = config.defaultVal ?? '';

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
          <ToggleLeft className="w-4 h-4 text-cyan-400" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Variable Set / Get</div>
          <div className="text-[11px] text-zinc-500">Store and retrieve values across workflow nodes</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Action</label>
        <div className="flex gap-1.5">
          {['set','get','delete','list'].map((m) => (
            <button key={m} onClick={() => updateConfig('mode', m)}
              className={`flex-1 py-1.5 capitalize rounded-lg text-[11px] font-bold border transition-all ${mode === m ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
              {m}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Scope</label>
        <div className="flex gap-1.5">
          {[
            { value: 'execution', label: 'Execution',  desc: 'This run only' },
            { value: 'workflow',  label: 'Workflow',   desc: 'Persists across runs' },
            { value: 'global',    label: 'Global',     desc: 'Shared across all workflows' },
          ].map((s) => (
            <button key={s.value} onClick={() => updateConfig('scope', s.value)}
              className={`flex-1 flex flex-col py-2 rounded-lg border transition-all ${scope === s.value ? 'bg-cyan-500/20 border-cyan-500/40' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'}`}>
              <span className={`text-[10px] font-bold ${scope === s.value ? 'text-cyan-300' : 'text-zinc-400'}`}>{s.label}</span>
              <span className="text-[9px] text-zinc-600">{s.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {mode !== 'list' && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Variable Key</label>
          <SmartVariableInput value={key} onChange={(v) => updateConfig('key', v)} placeholder='userCount  or  {{ $json.varName }}' />
        </div>
      )}

      {mode === 'set' && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Value</label>
            <SmartVariableInput value={value} onChange={(v) => updateConfig('value', v)} placeholder='{{ $json.result }}  or  "hello"  or  42' multiline />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">TTL in seconds (0 = no expiry)</label>
            <input type="number" min={0} value={ttl} onChange={(e) => updateConfig('ttl', Number(e.target.value))}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
          </div>
        </>
      )}

      {mode === 'get' && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Default Value (if not found)</label>
          <SmartVariableInput value={defaultVal} onChange={(v) => updateConfig('defaultVal', v)} placeholder='null  or  0  or  ""' />
        </div>
      )}

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        {mode === 'set'    && <>Returns: <span className="text-zinc-300">key, value, scope, expiresAt</span></>}
        {mode === 'get'    && <>Returns: <span className="text-zinc-300">key, value, found, scope</span></>}
        {mode === 'delete' && <>Returns: <span className="text-zinc-300">key, deleted, scope</span></>}
        {mode === 'list'   && <>Returns: <span className="text-zinc-300">variables[] with key, value, scope, expiresAt</span></>}
      </div>
    </div>
  );
}
