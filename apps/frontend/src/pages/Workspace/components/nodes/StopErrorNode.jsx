import { XCircle } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';

export default function StopErrorNode({ config = {}, updateConfig, nodeId }) {
  const message = config.message ?? '';
  const code = config.code ?? 'WORKFLOW_ERROR';

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <XCircle className="w-4 h-4 text-red-400" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Stop & Error</div>
          <div className="text-[11px] text-zinc-500">Halt workflow and throw a custom error</div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Error Message</label>
          <SmartVariableInput
            value={message}
            onChange={(v) => updateConfig('message', v)}
            placeholder="Something went wrong: {{ $json.reason }}"
            multiline
          />
        </div>

        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Error Code</label>
          <input
            value={code}
            onChange={(e) => updateConfig('code', e.target.value)}
            placeholder="WORKFLOW_ERROR"
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 font-mono focus:outline-none focus:border-zinc-500"
          />
        </div>

        <div className="px-3 py-2.5 rounded-lg bg-red-500/5 border border-red-500/20 text-[11px] text-red-400/80 leading-relaxed">
          This node <span className="font-bold">immediately halts</span> the workflow and marks it as failed. Useful for explicit validation gates.
        </div>
      </div>
    </div>
  );
}
