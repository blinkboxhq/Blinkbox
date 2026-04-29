import { Hash } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';

export default function CounterNode({ config = {}, updateConfig }) {
  const mode      = config.mode      ?? 'increment'; // increment | decrement | reset | get | set
  const counterId = config.counterId ?? 'counter_1';
  const amount    = config.amount    ?? 1;
  const startAt   = config.startAt   ?? 0;
  const scope     = config.scope     ?? 'execution';
  const setValue  = config.setValue  ?? '';

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
          <Hash className="w-4 h-4 text-orange-400" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Counter</div>
          <div className="text-[11px] text-zinc-500">Increment, decrement or reset a named counter</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Action</label>
        <div className="flex flex-wrap gap-1.5">
          {['increment','decrement','reset','get','set'].map((m) => (
            <button key={m} onClick={() => updateConfig('mode', m)}
              className={`flex-1 py-1.5 capitalize rounded-lg text-[10px] font-bold border transition-all ${mode === m ? 'bg-orange-500/20 border-orange-500/40 text-orange-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
              {m}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Counter Name</label>
        <SmartVariableInput value={counterId} onChange={(v) => updateConfig('counterId', v)} placeholder='pageViews  or  {{ $json.counterName }}' />
      </div>

      {(mode === 'increment' || mode === 'decrement') && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Amount</label>
          <input type="number" value={amount} onChange={(e) => updateConfig('amount', Number(e.target.value))}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
        </div>
      )}

      {mode === 'reset' && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Reset To</label>
          <input type="number" value={startAt} onChange={(e) => updateConfig('startAt', Number(e.target.value))}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
        </div>
      )}

      {mode === 'set' && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Set Value To</label>
          <SmartVariableInput value={setValue} onChange={(v) => updateConfig('setValue', v)} placeholder='{{ $json.count }}' />
        </div>
      )}

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Scope</label>
        <div className="flex gap-1.5">
          {['execution','workflow','global'].map((s) => (
            <button key={s} onClick={() => updateConfig('scope', s)}
              className={`flex-1 capitalize py-1.5 rounded-lg text-[10px] font-bold border transition-all ${scope === s ? 'bg-orange-500/20 border-orange-500/40 text-orange-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        Returns: <span className="text-zinc-300">counterId, value, previousValue, scope</span>
      </div>
    </div>
  );
}
