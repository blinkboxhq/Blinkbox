import { Cpu } from 'lucide-react';
import SmartVariableInput from "../../../../components/ui/SmartVariableInput";

const OPERATIONS = [
  { id: "remember", label: "Remember", icon: "🧠" },
  { id: "recall", label: "Recall", icon: "🔍" },
  { id: "forget", label: "Forget", icon: "🗑️" },
  { id: "listMemories", label: "List All", icon: "📋" },
  { id: "clearAll", label: "Clear All", icon: "✕" },
];

export default function VectorMemoryNode({ config = {}, updateConfig, nodeId }) {
  const operation = config.operation || "recall";
  const needsText = ["remember", "recall"].includes(operation);
  const needsKey = ["remember", "forget"].includes(operation);
  const needsCredential = ["remember", "recall"].includes(operation);

  return (
    <div className="flex flex-col gap-5 w-full">
      <div className="flex items-center gap-3 p-4 bg-violet-500/5 border border-violet-500/20 rounded-xl">
          <div className="w-8 h-8 rounded-lg bg-[#7C3AED]/10 border border-[#7C3AED]/20 flex items-center justify-center shrink-0">
            <Cpu className="w-4 h-4 text-[#7C3AED]" />
          </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-violet-400">Vector Memory</span>
          <span className="text-[10px] text-zinc-500">Persistent semantic memory — store & recall by meaning</span>
        </div>
      </div>

      {needsCredential && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">OpenAI API Key (for embeddings)</label>
          <input
            value={config.credentialId || ""}
            onChange={(e) => updateConfig("credentialId", e.target.value)}
            placeholder="OpenAI credential ID"
            className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-violet-500/40"
          />
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Operation</label>
        <div className="grid grid-cols-2 gap-2">
          {OPERATIONS.map((op) => (
            <button
              key={op.id}
              onClick={() => updateConfig("operation", op.id)}
              className={`py-2.5 rounded-lg border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                operation === op.id
                  ? "bg-violet-500/10 border-violet-500/40 text-violet-400"
                  : "bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]"
              }`}
            >
              <span>{op.icon}</span>{op.label}
            </button>
          ))}
        </div>
      </div>

      {needsText && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
            {operation === "remember" ? "Text to Remember" : "Query (what to recall)"}
          </label>
          <SmartVariableInput
            value={config.text || ""}
            onChange={(v) => updateConfig("text", v)}
            placeholder={operation === "remember" ? "{{upstream.content}}" : "What did we discuss about pricing?"}
            multiline
            nodeId={nodeId}
          />
        </div>
      )}

      {needsKey && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Memory Key (optional label)</label>
          <SmartVariableInput
            value={config.memoryKey || ""}
            onChange={(v) => updateConfig("memoryKey", v)}
            placeholder="user-preference-{{userId}}"
            nodeId={nodeId}
          />
        </div>
      )}

      {operation === "remember" && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Tags (comma-separated)</label>
          <SmartVariableInput
            value={config.tags || ""}
            onChange={(v) => updateConfig("tags", v)}
            placeholder="user-prefs, project-x"
            nodeId={nodeId}
          />
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Namespace</label>
        <input
          value={config.namespace || "default"}
          onChange={(e) => updateConfig("namespace", e.target.value)}
          placeholder="default"
          className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-violet-500/40"
        />
        <span className="text-[9px] text-zinc-600">Logical bucket — isolate memories per agent or project</span>
      </div>

      {operation === "recall" && (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Top K Results</label>
            <input
              type="number" min="1" max="20"
              value={config.topK ?? 5}
              onChange={(e) => updateConfig("topK", parseInt(e.target.value))}
              className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-violet-500/40"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Similarity Threshold</label>
            <input
              type="range" min="0" max="1" step="0.05"
              value={config.threshold ?? 0.7}
              onChange={(e) => updateConfig("threshold", parseFloat(e.target.value))}
              className="accent-violet-500"
            />
            <span className="text-[9px] text-zinc-600 text-center">{config.threshold ?? 0.7} — 0 = anything, 1 = exact</span>
          </div>
        </>
      )}
    </div>
  );
}
