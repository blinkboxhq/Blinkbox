/**
 * VECTOR MEMORY NODE — Config Panel
 *
 * Semantic memory retrieval via vector database (Pinecone / Qdrant).
 * Embeds the search query and returns the most relevant past conversations.
 *
 * Config fields:
 *   sessionId    — Conversation session filter
 *   credentialId — Vector DB API key credential
 *   searchQuery  — The query to embed and search against
 *   topK         — Number of results to return (default: 5)
 */

import { Brain, Settings2, Hash, Search } from "lucide-react";
import SmartVariableInput from "../../../../components/ui/SmartVariableInput";
import CredentialPicker from "../../../../components/ui/CredentialPicker";

export default function VectorMemoryNode({ config = {}, updateConfig }) {
  return (
    <div className="flex flex-col gap-5 w-full">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 p-4 bg-purple-500/5 border border-purple-500/20 rounded-xl">
        <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded-lg text-purple-400 shrink-0">
          <Brain className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-purple-400">Vector Memory</span>
          <span className="text-[10px] text-zinc-500 mt-0.5">
            Semantic search over past conversations
          </span>
        </div>
      </div>

      {/* ── Config ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 bg-[#0a0a0a] p-4 border border-[#222] rounded-xl shadow-inner">
        <div className="flex items-center gap-2 pb-3 border-b border-[#222]">
          <Settings2 className="w-4 h-4 text-purple-500" />
          <span className="text-xs font-bold text-zinc-300 uppercase tracking-widest">
            Config
          </span>
        </div>

        {/* Session ID */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
            <Hash className="w-3 h-3 text-purple-400" /> Session ID
          </label>
          <SmartVariableInput
            value={config.sessionId || ""}
            onChange={(val) => updateConfig("sessionId", val)}
            placeholder="e.g. {{webhook.body.sessionId}}"
          />
        </div>

        {/* Search Query */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
            <Search className="w-3 h-3 text-purple-400" /> Search Query
          </label>
          <SmartVariableInput
            value={config.searchQuery || ""}
            onChange={(val) => updateConfig("searchQuery", val)}
            placeholder="e.g. {{webhook.body.message}}"
            multiline
          />
        </div>

        {/* Top K */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-zinc-500 w-28">Top K Results</span>
          <input
            type="number"
            min={1}
            max={100}
            value={config.topK ?? 5}
            onChange={(e) =>
              updateConfig("topK", Math.max(1, parseInt(e.target.value, 10) || 5))
            }
            className="flex-1 bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-purple-500/50 transition-colors"
          />
        </div>
      </div>

      {/* ── Credential ──────────────────────────────────────────────────── */}
      <CredentialPicker
        value={config.credentialId || ""}
        onChange={(id) => updateConfig("credentialId", id)}
        accentColor="purple"
        label="Vector DB API Key"
        placeholder="Select Pinecone / Qdrant credential..."
      />
    </div>
  );
}
