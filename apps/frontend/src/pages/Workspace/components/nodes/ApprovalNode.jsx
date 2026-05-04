import { CheckCircle2 } from 'lucide-react';
import SmartVariableInput from "../../../../components/ui/SmartVariableInput";

export default function ApprovalNode({ config = {}, updateConfig, nodeId }) {
  const channels = config.notifyChannels || ["email"];
  const toggle = (ch) => {
    const next = channels.includes(ch) ? channels.filter((c) => c !== ch) : [...channels, ch];
    updateConfig("notifyChannels", next.length ? next : ["email"]);
  };

  return (
    <div className="flex flex-col gap-5 w-full">
      <div className="flex items-center gap-3 p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-xl">
          <div className="w-8 h-8 rounded-lg bg-[#10B981]/10 border border-[#10B981]/20 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
          </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-yellow-400">Approval Gate</span>
          <span className="text-[10px] text-zinc-500">Pause execution until a human approves</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Approval Label</label>
        <input
          value={config.label || ""}
          onChange={(e) => updateConfig("label", e.target.value)}
          placeholder="Approve order fulfillment"
          className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-yellow-500/40"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Notify Via</label>
        <div className="flex gap-2">
          {["email", "slack"].map((ch) => (
            <button
              key={ch}
              onClick={() => toggle(ch)}
              className={`px-3 py-2 rounded-lg border text-xs font-bold capitalize transition-all ${
                channels.includes(ch)
                  ? "bg-yellow-500/10 border-yellow-500/40 text-yellow-400"
                  : "bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]"
              }`}
            >
              {ch}
            </button>
          ))}
        </div>
      </div>

      {channels.includes("email") && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Notify Email</label>
          <SmartVariableInput
            value={config.notifyTo || ""}
            onChange={(v) => updateConfig("notifyTo", v)}
            placeholder="approver@company.com"
          />
        </div>
      )}

      {channels.includes("slack") && (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Slack Channel</label>
            <SmartVariableInput value={config.slackChannel || ""} onChange={(v) => updateConfig("slackChannel", v)} placeholder="#approvals" />
          </div>
        </>
      )}

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Timeout</label>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            min="1"
            value={config.timeoutValue || 72}
            onChange={(e) => updateConfig("timeoutValue", Number(e.target.value))}
            className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-yellow-500/40"
          />
          <select
            value={config.timeoutUnit || "hours"}
            onChange={(e) => updateConfig("timeoutUnit", e.target.value)}
            className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-yellow-500/40"
          >
            <option value="minutes">Minutes</option>
            <option value="hours">Hours</option>
            <option value="days">Days</option>
          </select>
        </div>
        <p className="text-[10px] text-zinc-600">After timeout, workflow resumes with approved = false</p>
      </div>
    </div>
  );
}
