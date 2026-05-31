import { RotateCcw } from 'lucide-react';

export default function RetryNode({ config = {}, updateConfig }) {
  const maxRetries = config.maxRetries ?? 3;
  const delayMs = config.delayMs ?? 1000;
  const backoff = config.backoff ?? 'fixed'; // 'fixed' | 'exponential'

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
          <RotateCcw className="w-4 h-4 text-amber-400" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Retry</div>
          <div className="text-[11px] text-zinc-500">Retry the previous node on failure</div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Max Retries</label>
          <input
            type="number"
            min={1}
            max={10}
            value={maxRetries}
            onChange={(e) => updateConfig('maxRetries', Number(e.target.value))}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500"
          />
        </div>

        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Delay Between Retries (ms)</label>
          <input
            type="number"
            min={0}
            step={500}
            value={delayMs}
            onChange={(e) => updateConfig('delayMs', Number(e.target.value))}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500"
          />
        </div>

        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Backoff Strategy</label>
          <div className="flex gap-1.5">
            {[{ value: 'fixed', label: 'Fixed' }, { value: 'exponential', label: 'Exponential' }].map((opt) => (
              <button
                key={opt.value}
                onClick={() => updateConfig('backoff', opt.value)}
                className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                  backoff === opt.value
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500 leading-relaxed">
          Will retry up to <span className="text-amber-400 font-bold">{maxRetries}×</span> with{' '}
          <span className="text-amber-400 font-bold">{(delayMs / 1000).toFixed(1)}s</span> {backoff === 'exponential' ? 'exponential' : 'fixed'} delay.
        </div>
      </div>
    </div>
  );
}
