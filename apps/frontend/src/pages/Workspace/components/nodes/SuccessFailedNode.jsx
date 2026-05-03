import { CheckCheck, XCircle } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';

export default function SuccessFailedNode({ config = {}, updateConfig, nodeId }) {
  const outcome = config.outcome ?? 'success'; // 'success' | 'failed'
  const message = config.message ?? '';

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
          outcome === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/10 border border-red-500/20'
        }`}>
          {outcome === 'success'
            ? <CheckCheck className="w-4 h-4 text-emerald-400" />
            : <XCircle className="w-4 h-4 text-red-400" />
          }
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Success / Failed</div>
          <div className="text-[11px] text-zinc-500">Explicitly mark this branch as succeeded or failed</div>
        </div>
      </div>

      <div className="flex gap-1.5">
        <button
          onClick={() => updateConfig('outcome', 'success')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-bold text-[12px] border transition-all ${
            outcome === 'success'
              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
              : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'
          }`}
        >
          <CheckCheck className="w-4 h-4" />
          Success
        </button>
        <button
          onClick={() => updateConfig('outcome', 'failed')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-bold text-[12px] border transition-all ${
            outcome === 'failed'
              ? 'bg-red-500/20 border-red-500/40 text-red-300'
              : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'
          }`}
        >
          <XCircle className="w-4 h-4" />
          Failed
        </button>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Message (optional)</label>
        <SmartVariableInput
          value={message}
          onChange={(v) => updateConfig('message', v)}
          placeholder={outcome === 'success' ? 'Workflow completed successfully' : 'Workflow failed: {{ $json.reason }}'}
          multiline
          nodeId={nodeId}
        />
      </div>

      <div className={`px-3 py-2.5 rounded-lg text-[11px] leading-relaxed ${
        outcome === 'success'
          ? 'bg-emerald-500/5 border border-emerald-500/15 text-emerald-400/70'
          : 'bg-red-500/5 border border-red-500/15 text-red-400/70'
      }`}>
        This branch will be marked as <span className="font-bold">{outcome}</span> in the execution log. Useful for marking the end of conditional paths.
      </div>
    </div>
  );
}
