import { Cpu } from 'lucide-react';
import SmartVariableInput from "../../../../components/ui/SmartVariableInput";

const OPERATIONS = [
  { id: "upsert", label: "Upsert Vectors" },
  { id: "query", label: "Query (Search)" },
  { id: "delete", label: "Delete" },
  { id: "fetchById", label: "Fetch by ID" },
];

export default function PineconeNode({ config = {}, updateConfig, nodeId }) {
  const operation = config.operation || "query";

  return (
    <div className="flex flex-col gap-5 w-full">
      <div className="flex items-center gap-3 p-4 bg-green-500/5 border border-green-500/20 rounded-xl">
          <div className="w-8 h-8 rounded-lg bg-[#005F73]/10 border border-[#005F73]/20 flex items-center justify-center shrink-0">
            <Cpu className="w-4 h-4 text-[#005F73]" />
          </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-green-400">Pinecone</span>
          <span className="text-[10px] text-zinc-500">Vector database for semantic search & RAG</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Credential (API Key)</label>
        <input
          value={config.credentialId || ""}
          onChange={(e) => updateConfig("credentialId", e.target.value)}
          placeholder="Pinecone credential ID"
          className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-green-500/40"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Index Host URL</label>
        <input
          value={config.indexHost || ""}
          onChange={(e) => updateConfig("indexHost", e.target.value)}
          placeholder="https://my-index-abc123.svc.us-east1.pinecone.io"
          className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-green-500/40"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Operation</label>
        <select
          value={operation}
          onChange={(e) => updateConfig("operation", e.target.value)}
          className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-green-500/40"
        >
          {OPERATIONS.map((op) => <option key={op.id} value={op.id}>{op.label}</option>)}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Namespace (optional)</label>
        <input
          value={config.namespace || ""}
          onChange={(e) => updateConfig("namespace", e.target.value)}
          placeholder="default"
          className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-green-500/40"
        />
      </div>

      {operation === "upsert" && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Vectors</label>
          <SmartVariableInput
            value={config.vectors || ""}
            onChange={(v) => updateConfig("vectors", v)}
            placeholder='{{upstream.vectors}} or [{"id":"v1","values":[0.1,0.2,...],"metadata":{}}]'
            nodeId={nodeId}
          />
        </div>
      )}

      {operation === "query" && (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Query Vector</label>
            <SmartVariableInput
              value={config.vector || ""}
              onChange={(v) => updateConfig("vector", v)}
              placeholder="{{upstream.embedding}} — array of numbers"
              nodeId={nodeId}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Top K Results</label>
            <input
              type="number" min="1" max="100"
              value={config.topK ?? 5}
              onChange={(e) => updateConfig("topK", parseInt(e.target.value))}
              className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-green-500/40"
            />
          </div>
        </>
      )}

      {(operation === "delete" || operation === "fetchById") && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Vector IDs</label>
          <SmartVariableInput
            value={config.ids || ""}
            onChange={(v) => updateConfig("ids", v)}
            placeholder='["id1", "id2"]'
            nodeId={nodeId}
          />
        </div>
      )}
    </div>
  );
}
