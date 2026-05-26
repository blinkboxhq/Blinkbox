import { Timer } from 'lucide-react';

export default function RateLimiterNode({ config = {}, updateConfig }) {
  const limit = config.limit ?? 10;
  const window = config.window ?? 'minute'; // 'second' | 'minute' | 'hour'
  const strategy = config.strategy ?? 'drop'; // 'drop' | 'queue' | 'error'

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
          <Timer className="w-4 h-4 text-orange-400" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Rate Limiter</div>
          <div className="text-[11px] text-zinc-500">Throttle workflow to N executions per window</div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Max Requests</label>
            <input
              type="number"
              min={1}
              value={limit}
              onChange={(e) => updateConfig('limit', Number(e.target.value))}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500"
            />
          </div>
          <div className="flex-1">
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Per</label>
            <select
              value={window}
              onChange={(e) => updateConfig('window', e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-200 focus:outline-none focus:border-zinc-500 cursor-pointer"
            >
              <option value="second">Second</option>
              <option value="minute">Minute</option>
              <option value="hour">Hour</option>
              <option value="day">Day</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">When Limit Exceeded</label>
          <div className="flex flex-col gap-1.5">
            {[
              { value: 'drop', label: 'Drop', desc: 'Silently skip excess executions' },
              { value: 'queue', label: 'Queue', desc: 'Queue and process when available' },
              { value: 'error', label: 'Error', desc: 'Throw error and stop' },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => updateConfig('strategy', opt.value)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-left ${
                  strategy === opt.value
                    ? 'bg-orange-500/10 border-orange-500/30 text-orange-300'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${strategy === opt.value ? 'bg-orange-400' : 'bg-zinc-700'}`} />
                <span className="text-[12px] font-semibold">{opt.label}</span>
                <span className="text-[11px] opacity-60">{opt.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
          Allows max <span className="text-orange-400 font-bold">{limit}</span> runs per <span className="text-orange-400 font-bold">{window}</span>.
        </div>
      </div>
    </div>
  );
}
