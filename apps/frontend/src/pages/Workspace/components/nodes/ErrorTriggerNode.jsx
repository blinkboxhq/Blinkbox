import { AlertTriangle, Info } from 'lucide-react';

export default function ErrorTriggerNode({ config = {}, updateConfig, nodeId }) {
  const watchAll = config.watchAll ?? true;
  const watchedAutomation = config.watchedAutomation || '';

  return (
    <div className="flex flex-col">

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#2A2A2A] bg-[#111111] rounded-t-xl">
        <div className="p-1 bg-[#222] rounded-md border border-[#333]">
          <AlertTriangle className="w-3 h-3 text-white" />
        </div>
        <span className="text-[11px] font-semibold text-zinc-200 tracking-wide">On Workflow Error</span>
      </div>

      <div className="p-3 flex flex-col gap-3">

        {/* Watch scope toggle */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Watch</label>
          <div className="flex rounded-lg overflow-hidden border border-[#222]">
            {[
              { label: 'Any workflow', val: true },
              { label: 'Specific workflow', val: false },
            ].map(({ label, val }) => (
              <button
                key={String(val)}
                onClick={() => updateConfig?.('watchAll', val)}
                className={`flex-1 py-1.5 text-[10px] font-semibold transition-all ${watchAll === val ? 'bg-red-500/20 text-red-400' : 'bg-[#111] text-zinc-600 hover:text-zinc-400'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Specific automation ID */}
        {!watchAll && (
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Workflow ID</label>
            <input
              value={watchedAutomation}
              onChange={(e) => updateConfig?.('watchedAutomation', e.target.value)}
              placeholder="Paste automation ID…"
              className="w-full bg-[#111] border border-[#222] rounded-md px-2.5 py-1.5 text-xs text-zinc-300 font-mono focus:outline-none focus:border-red-500/50 transition-colors placeholder:text-zinc-700"
            />
            <p className="text-[9px] text-zinc-600">Find the ID in the URL when editing that workflow.</p>
          </div>
        )}

        {/* Available variables */}
        <div className="flex flex-col gap-1.5 p-2.5 bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg">          {[
            ['$trigger.error.message', 'Error message text'],
            ['$trigger.error.nodeId', 'Node that failed'],
            ['$trigger.error.nodeType', 'Type of failed node'],
            ['$trigger.error.automationId', 'Workflow that failed'],
            ['$trigger.error.automationName', 'Workflow name'],
            ['$trigger.error.executionId', 'Failed execution ID'],
            ['$trigger.error.failedAt', 'ISO timestamp of failure'],
          ].map(([key, desc]) => (
            <div key={key} className="flex items-baseline gap-2">
              <span className="text-[10px] font-mono text-red-400 shrink-0">{key}</span>
              <span className="text-[9px] text-zinc-600">{desc}</span>
            </div>
          ))}
        </div>

        <p className="text-[9px] text-zinc-600 leading-relaxed">
          This workflow fires automatically when another workflow fails. Wire it to a Slack or email node to get instant failure alerts.
        </p>

      </div>
    </div>
  );
}
