import { Clock, Webhook } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';

export default function WaitForEventNode({ config = {}, updateConfig, nodeId }) {
  const type = config.type ?? 'webhook'; // 'webhook' | 'condition' | 'time'
  const timeout = config.timeout ?? 3600;
  const conditionField = config.conditionField ?? '';
  const conditionValue = config.conditionValue ?? '';

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
          <Clock className="w-4 h-4 text-sky-400" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Wait for Event</div>
          <div className="text-[11px] text-zinc-500">Pause until an external event arrives</div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Wait For</label>
          <div className="flex gap-1.5">
            {[
              { value: 'webhook', label: 'Webhook', icon: Webhook },
              { value: 'condition', label: 'Condition', icon: Clock },
              { value: 'time', label: 'Timeout Only', icon: Clock },
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => updateConfig('type', value)}
                className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                  type === value
                    ? 'bg-sky-500/20 border-sky-500/40 text-sky-300'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {type === 'condition' && (
          <div className="flex flex-col gap-2">
            <SmartVariableInput
              value={conditionField}
              onChange={(v) => updateConfig('conditionField', v)}
              placeholder="{{ $json.status }}"
            />
            <SmartVariableInput
              value={conditionValue}
              onChange={(v) => updateConfig('conditionValue', v)}
              placeholder="expected value"
            />
          </div>
        )}

        {type === 'webhook' && (
          <div className="px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-400">
            Workflow will pause and resume when a webhook payload is received at the workflow's webhook URL with a matching execution ID.
          </div>
        )}

        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Timeout (seconds)</label>
          <input
            type="number"
            min={60}
            value={timeout}
            onChange={(e) => updateConfig('timeout', Number(e.target.value))}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500"
          />
          <p className="text-[10px] text-zinc-600 mt-1">Max wait: {Math.round(timeout / 60)} min. After timeout the workflow fails.</p>
        </div>
      </div>
    </div>
  );
}
