import { Table } from 'lucide-react';
import SmartVariableInput from "@/components/ui/SmartVariableInput";

export default function CSVParserNode({ config = {}, updateConfig, nodeId }) {
  const mode = config.mode || "toJson";

  return (
    <div className="flex flex-col gap-5 w-full">
      <div className="flex items-center gap-3 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
          <div className="w-8 h-8 rounded-lg bg-[#10B981]/10 border border-[#10B981]/20 flex items-center justify-center shrink-0">
            <Table className="w-4 h-4 text-[#10B981]" />
          </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-emerald-400">CSV Parser</span>
          <span className="text-[10px] text-zinc-500">Convert between CSV and JSON arrays</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Mode</label>
        <div className="grid grid-cols-2 gap-2">
          {[{ value: "toJson", label: "CSV → JSON" }, { value: "toCsv", label: "JSON → CSV" }].map((m) => (
            <button
              key={m.value}
              onClick={() => updateConfig("mode", m.value)}
              className={`py-2.5 rounded-lg border text-xs font-bold transition-all ${
                mode === m.value
                  ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400"
                  : "bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {mode === "toJson" && (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">CSV Input</label>
            <SmartVariableInput
              value={config.csv || ""}
              onChange={(v) => updateConfig("csv", v)}
              placeholder="{{n1.csvText}}"
              multiline
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => updateConfig("hasHeader", !config.hasHeader)}
              className={`w-8 h-4 rounded-full transition-all relative ${config.hasHeader !== false ? "bg-emerald-500" : "bg-zinc-700"}`}
            >
              <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${config.hasHeader !== false ? "left-4" : "left-0.5"}`} />
            </button>
            <span className="text-xs text-zinc-400">First row is header</span>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Output Key</label>
            <input
              value={config.outputKey || "rows"}
              onChange={(e) => updateConfig("outputKey", e.target.value)}
              className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500/40"
            />
          </div>
        </>
      )}

      {mode === "toCsv" && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Data (Array)</label>
          <SmartVariableInput
            value={config.data || ""}
            onChange={(v) => updateConfig("data", v)}
            placeholder="{{n1.items}}"
          />
          <p className="text-[10px] text-zinc-600">Array of objects or array of arrays. Output key: csv</p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Delimiter</label>
        <input
          value={config.delimiter || ","}
          onChange={(e) => updateConfig("delimiter", e.target.value)}
          maxLength={1}
          className="w-20 bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono text-center focus:outline-none focus:border-emerald-500/40"
        />
      </div>
    </div>
  );
}
