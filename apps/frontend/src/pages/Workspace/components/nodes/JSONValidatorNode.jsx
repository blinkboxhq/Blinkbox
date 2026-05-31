import { Braces } from 'lucide-react';
import SmartVariableInput from "../../../../components/ui/SmartVariableInput";

export default function JSONValidatorNode({ config = {}, updateConfig, nodeId }) {
  return (
    <div className="flex flex-col gap-5 w-full">
      <div className="flex items-center gap-3 p-4 bg-red-500/5 border border-red-500/20 rounded-xl">
          <div className="w-8 h-8 rounded-lg bg-[#6366F1]/10 border border-[#6366F1]/20 flex items-center justify-center shrink-0">
            <Braces className="w-4 h-4 text-[#6366F1]" />
          </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-red-400">JSON Schema Validator</span>
          <span className="text-[10px] text-zinc-500">Validate data structure before it continues</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Data to Validate</label>
        <SmartVariableInput
          value={config.data || ""}
          onChange={(v) => updateConfig("data", v)}
          placeholder="{{upstream.data}}"
          nodeId={nodeId}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">JSON Schema</label>
        <textarea
          rows={7}
          value={config.schema || ""}
          onChange={(e) => updateConfig("schema", e.target.value)}
          placeholder={'{\n  "type": "object",\n  "required": ["email", "name"],\n  "properties": {\n    "email": { "type": "string", "format": "email" },\n    "name": { "type": "string" }\n  }\n}'}
          className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-zinc-300 font-mono resize-y focus:outline-none focus:border-red-500/40"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">On Failure</label>
        <div className="grid grid-cols-2 gap-2">
          {[{ id: "stop", label: "Stop & Error" }, { id: "continue", label: "Continue (tag)" }].map((opt) => (
            <button
              key={opt.id}
              onClick={() => updateConfig("failMode", opt.id)}
              className={`py-2.5 rounded-lg border text-xs font-bold transition-all ${
                (config.failMode || "stop") === opt.id
                  ? "bg-red-500/10 border-red-500/40 text-red-400"
                  : "bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
