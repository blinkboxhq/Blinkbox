import { BarChart2 } from 'lucide-react';
import SmartVariableInput from "@/components/ui/SmartVariableInput";

export default function AggregateNode({ config = {}, updateConfig, nodeId }) {
  return (
    <div className="flex flex-col gap-5 w-full">
      <div className="flex items-center gap-3 p-4 bg-teal-500/5 border border-teal-500/20 rounded-xl">
          <div className="w-8 h-8 rounded-lg bg-[#8B5CF6]/10 border border-[#8B5CF6]/20 flex items-center justify-center shrink-0">
            <BarChart2 className="w-4 h-4 text-[#8B5CF6]" />
          </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-teal-400">Aggregate</span>
          <span className="text-[10px] text-zinc-500">Collect N items from a loop then emit as a batch</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Expected Count</label>
        <SmartVariableInput
          value={config.expectedCount || ""}
          onChange={(v) => updateConfig("expectedCount", v)}
          placeholder="{{loop.totalItems}} or 10"
          nodeId={nodeId}
        />
        <p className="text-[9px] text-zinc-600">How many items to collect before emitting the batch</p>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Session ID</label>
        <SmartVariableInput
          value={config.sessionId || ""}
          onChange={(v) => updateConfig("sessionId", v)}
          placeholder="{{trigger.messageId}}-batch"
          nodeId={nodeId}
        />
        <p className="text-[9px] text-zinc-600">Unique per loop run to separate concurrent batches</p>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Collect Field (optional)</label>
        <input
          value={config.aggregateKey || ""}
          onChange={(e) => updateConfig("aggregateKey", e.target.value)}
          placeholder="result  (blank = collect entire item)"
          className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-teal-500/40"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">TTL (seconds)</label>
        <input
          type="number" min="10" max="3600"
          value={config.ttlSeconds ?? 300}
          onChange={(e) => updateConfig("ttlSeconds", parseInt(e.target.value))}
          className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-teal-500/40"
        />
        <p className="text-[9px] text-zinc-600">Auto-clear partial batches after this many seconds</p>
      </div>
    </div>
  );
}
