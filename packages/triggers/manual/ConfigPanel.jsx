import { useMemo, useCallback } from 'react';
import { MousePointerClick } from 'lucide-react';

const DEFAULT_PAYLOAD = '{\n  "status": "triggered"\n}';

function readPayload(mockPayload) {
  if (!mockPayload) return DEFAULT_PAYLOAD;
  try {
    return JSON.stringify(JSON.parse(mockPayload), null, 2);
  } catch {
    return mockPayload;
  }
}

export default function TriggerNode({ config = {}, updateConfig }) {
  const forceExecution = config.forceExecution ?? true;
  const payload = useMemo(() => readPayload(config.mockPayload), [config.mockPayload]);

  const onPayload = useCallback(
    (e) => {
      const val = e.target.value;
      try {
        updateConfig?.('mockPayload', JSON.stringify(JSON.parse(val)));
      } catch {
        updateConfig?.('mockPayload', val);
      }
    },
    [updateConfig],
  );

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-green-500/10 border border-green-500/25 flex items-center justify-center shrink-0">
          <MousePointerClick className="w-[18px] h-[18px] text-green-400" strokeWidth={1.8} />
        </div>
        <div className="min-w-0">
          <h3 className="text-[14px] font-semibold text-white leading-tight">Trigger Manually</h3>
          <p className="text-[11px] text-neutral-500 leading-snug mt-0.5">Run this workflow on demand from the canvas</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Test Payload</label>
          <span className="text-[10px] text-neutral-600">injected on Run</span>
        </div>
        <textarea
          value={payload}
          onChange={onPayload}
          spellCheck={false}
          rows={6}
          placeholder='{ "status": "triggered" }'
          className="bb-glow-border w-full resize-y rounded-xl border border-white/25 bg-white/[0.03] px-3.5 py-3 text-[12px] font-mono leading-relaxed text-green-300 placeholder:text-neutral-600 outline-none focus:border-white/45 transition-colors"
        />
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-white/15 bg-white/[0.03] p-3.5">
        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
          <span className="text-[12px] font-semibold text-zinc-200">Force execution</span>
          <span className="text-[10px] text-neutral-500 leading-relaxed">Start the run even if a node fails to initialize.</span>
        </div>
        <button
          onClick={() => updateConfig?.('forceExecution', !forceExecution)}
          className={`w-10 h-5 rounded-full p-0.5 transition-colors shrink-0 mt-0.5 ${forceExecution ? 'bg-green-500' : 'bg-zinc-700'}`}
        >
          <span className={`block w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${forceExecution ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
      </div>
    </div>
  );
}
