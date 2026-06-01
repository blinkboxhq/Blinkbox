import { Cpu } from 'lucide-react';
import SmartVariableInput from "../../../../components/ui/SmartVariableInput";
import CredentialPicker from "../../../../components/ui/CredentialPicker";

const OPERATIONS = [
  { id: "upsert", label: "Upsert Vectors" },
  { id: "query", label: "Query (Search)" },
  { id: "delete", label: "Delete" },
  { id: "fetchById", label: "Fetch by ID" },
];

export default function PineconeNode({ config = {}, updateConfig, nodeId, nodes, edges }) {
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
        <CredentialPicker value={config.credentialId || ""} onChange={v => updateConfig("credentialId", v)} type="Pinecone" />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Index Host URL</label>
        <SmartVariableInput value={config.indexHost || ""} onChange={v => updateConfig("indexHost", v)}
          placeholder="https://my-index-abc123.svc.us-east1.pinecone.io"
          nodeId={nodeId} nodes={nodes} edges={edges} />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Operation</label>
        <div className="flex gap-1.5 flex-wrap">
          {OPERATIONS.map((op) => (
            <button key={op.id} onClick={() => updateConfig("operation", op.id)}
              className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-all ${
                operation === op.id ? "bg-green-500/10 border-green-400/40 text-green-300"
                                   : "bg-[#0a0a0a] border-[#222] text-zinc-500 hover:border-[#333]"}`}>
              {op.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Namespace (optional)</label>
        <SmartVariableInput value={config.namespace || ""} onChange={v => updateConfig("namespace", v)}
          placeholder="default" nodeId={nodeId} nodes={nodes} edges={edges} />
      </div>

      {operation === "upsert" && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Vectors</label>
          <SmartVariableInput
            value={config.vectors || ""}
            onChange={(v) => updateConfig("vectors", v)}
            placeholder='{{upstream.vectors}} or [{"id":"v1","values":[0.1,0.2,...],"metadata":{}}]'
            nodeId={nodeId} nodes={nodes} edges={edges}
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
              nodeId={nodeId} nodes={nodes} edges={edges}
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
            nodeId={nodeId} nodes={nodes} edges={edges}
          />
        </div>
      )}
    </div>
  );
}
