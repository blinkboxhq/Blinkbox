import { Scissors } from 'lucide-react';
import SmartVariableInput from "@/components/ui/SmartVariableInput";

const MODES = [
  { id: "characters", label: "Characters" },
  { id: "words", label: "Words" },
  { id: "sentences", label: "Sentences" },
  { id: "paragraphs", label: "Paragraphs" },
];

export default function TextSplitterNode({ config = {}, updateConfig, nodeId }) {
  const mode = config.mode || "characters";
  const showOverlap = mode !== "paragraphs";

  return (
    <div className="flex flex-col gap-5 w-full">
      <div className="flex items-center gap-3 p-4 bg-sky-500/5 border border-sky-500/20 rounded-xl">
          <div className="w-8 h-8 rounded-lg bg-[#06B6D4]/10 border border-[#06B6D4]/20 flex items-center justify-center shrink-0">
            <Scissors className="w-4 h-4 text-[#06B6D4]" />
          </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-sky-400">Text Splitter</span>
          <span className="text-[10px] text-zinc-500">Split text into chunks for AI/RAG pipelines</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Text</label>
        <SmartVariableInput
          value={config.text || ""}
          onChange={(v) => updateConfig("text", v)}
          placeholder="{{upstream.content}}"
          nodeId={nodeId}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Split Mode</label>
        <div className="grid grid-cols-2 gap-2">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => updateConfig("mode", m.id)}
              className={`py-2.5 rounded-lg border text-xs font-bold transition-all ${
                mode === m.id
                  ? "bg-sky-500/10 border-sky-500/40 text-sky-400"
                  : "bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {mode !== "paragraphs" && (
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Chunk Size</label>
            <input
              type="number" min="1" max="10000"
              value={config.chunkSize ?? 500}
              onChange={(e) => updateConfig("chunkSize", parseInt(e.target.value))}
              className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-sky-500/40"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Overlap</label>
            <input
              type="number" min="0" max="500"
              value={config.overlap ?? 50}
              onChange={(e) => updateConfig("overlap", parseInt(e.target.value))}
              className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-sky-500/40"
            />
          </div>
        </div>
      )}

      <div className="p-3 bg-zinc-900 rounded-lg border border-zinc-800 text-[10px] text-zinc-500">
        Output: <code className="text-sky-400">chunks[]</code> array + <code className="text-sky-400">chunkCount</code>
      </div>
    </div>
  );
}
