import { GitBranch } from 'lucide-react';
import SmartVariableInput from "@/components/ui/SmartVariableInput";

export default function SwitchNode({ config = {}, updateConfig, nodeId }) {
  const cases = Array.isArray(config.cases) ? config.cases : [];

  function updateCase(index, field, value) {
    const updated = cases.map((c, i) => (i === index ? { ...c, [field]: value } : c));
    updateConfig("cases", updated);
  }

  function addCase() {
    updateConfig("cases", [...cases, { match: "", label: `case_${cases.length + 1}` }]);
  }

  function removeCase(index) {
    updateConfig("cases", cases.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-5 w-full">
      <div className="flex items-center gap-3 p-4 bg-pink-500/5 border border-pink-500/20 rounded-xl">
          <div className="w-8 h-8 rounded-lg bg-[#F59E0B]/10 border border-[#F59E0B]/20 flex items-center justify-center shrink-0">
            <GitBranch className="w-4 h-4 text-[#F59E0B]" />
          </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-pink-400">Switch</span>
          <span className="text-[10px] text-zinc-500">Route by exact value match (like a switch statement)</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Switch On Value</label>
        <SmartVariableInput
          value={config.value || ""}
          onChange={(v) => updateConfig("value", v)}
          placeholder="{{upstream.status}}"
          nodeId={nodeId}
        />
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Cases</label>
          <button
            onClick={addCase}
            className="text-[10px] text-pink-400 hover:text-pink-300 font-bold px-2 py-1 rounded border border-pink-500/30 hover:border-pink-500/50 transition-all"
          >
            + Add Case
          </button>
        </div>

        {cases.map((c, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={c.match || ""}
              onChange={(e) => updateCase(i, "match", e.target.value)}
              placeholder="Match value"
              className="flex-1 bg-[#0a0a0a] border border-[#222] rounded-lg px-2.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-pink-500/40"
            />
            <span className="text-zinc-600 text-xs">→</span>
            <input
              value={c.label || ""}
              onChange={(e) => updateCase(i, "label", e.target.value)}
              placeholder="Path label"
              className="flex-1 bg-[#0a0a0a] border border-[#222] rounded-lg px-2.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-pink-500/40"
            />
            <button
              onClick={() => removeCase(i)}
              className="text-zinc-600 hover:text-red-400 text-xs font-bold px-2 transition-colors"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Default Case Label</label>
        <input
          value={config.defaultCase || "default"}
          onChange={(e) => updateConfig("defaultCase", e.target.value)}
          className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-pink-500/40"
        />
      </div>

      <div className="flex items-center justify-between p-3 bg-zinc-900 rounded-lg border border-zinc-800">
        <span className="text-[10px] text-zinc-500">Case-insensitive matching</span>
        <button
          onClick={() => updateConfig("caseInsensitive", !config.caseInsensitive)}
          className={`relative w-8 h-[18px] rounded-full transition-colors ${config.caseInsensitive ? "bg-pink-500" : "bg-zinc-700"}`}
        >
          <span className={`absolute top-[2px] left-[2px] w-[14px] h-[14px] rounded-full bg-white transition-transform ${config.caseInsensitive ? "translate-x-[14px]" : ""}`} />
        </button>
      </div>
    </div>
  );
}
