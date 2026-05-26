import CredentialPicker from "@/components/ui/CredentialPicker";

export default function makeAgentMemoryPanel({
  label,
  credentialType,
  hasConnectionString = false,
  connectionStringPlaceholder = "connection string",
  isVector = false,
  hasWindowSize = false,
}) {
  return function AgentMemoryPanel({ config = {}, updateConfig }) {
    return (
      <div className="flex flex-col gap-4 p-4 bg-[#0d0d0f] min-h-full">

        {/* Header */}
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border bg-violet-500/10 border-violet-500/20">
          <div className="w-1.5 h-5 rounded-full shrink-0 bg-violet-400" />
          <div>
            <p className="text-[13px] font-bold text-zinc-100">{label}</p>
            <p className="text-[10px] text-zinc-500 mt-0.5">Agent memory provider</p>
          </div>
        </div>

        {/* Connection string */}
        {hasConnectionString && (
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2 block">Connection String</label>
            <input
              value={config.connectionString || ""}
              onChange={(e) => updateConfig("connectionString", e.target.value)}
              placeholder={connectionStringPlaceholder}
              className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-[13px] text-zinc-100 font-mono focus:outline-none focus:border-zinc-500"
            />
          </div>
        )}

        {/* Session / Collection name */}
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2 block">
            {isVector ? "Collection Name" : "Session Name"}
          </label>
          <input
            value={config.sessionName || ""}
            onChange={(e) => updateConfig("sessionName", e.target.value)}
            placeholder="agent-memory"
            className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500"
          />
        </div>

        {/* Window size — sliding window / Zep */}
        {hasWindowSize && (
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2 block">Message Window</label>
            <input
              type="number"
              min={1}
              max={200}
              step={1}
              value={config.windowSize !== undefined ? config.windowSize : 20}
              onChange={(e) => updateConfig("windowSize", parseInt(e.target.value, 10))}
              className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500"
            />
            <p className="text-[10px] text-zinc-600 mt-1">Number of recent messages to keep in context</p>
          </div>
        )}

        {/* Max memories */}
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2 block">Max Memories</label>
          <input
            type="number"
            min={10}
            max={10000}
            step={10}
            value={config.maxMemories !== undefined ? config.maxMemories : 1000}
            onChange={(e) => updateConfig("maxMemories", parseInt(e.target.value, 10))}
            className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500"
          />
        </div>

        {/* Vector store fields */}
        {isVector && (
          <>
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2 block">
                {label === "Pinecone" ? "Index Name" : "Table Name"}
              </label>
              <input
                value={config.indexName || ""}
                onChange={(e) => updateConfig("indexName", e.target.value)}
                placeholder={label === "Pinecone" ? "my-index" : "embeddings"}
                className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2 block">Embedding Model</label>
              <div className="flex flex-col gap-1">
                {["text-embedding-3-small", "text-embedding-3-large", "text-embedding-ada-002"].map((m) => {
                  const isSelected = (config.embeddingModel || "text-embedding-3-small") === m;
                  return (
                    <button
                      key={m}
                      onClick={() => updateConfig("embeddingModel", m)}
                      className="w-full text-left px-3 py-2 rounded-lg text-[12px] font-medium transition-all duration-150 border"
                      style={
                        isSelected
                          ? { background: "#7C3AED22", borderColor: "#7C3AED55", color: "#a78bfa" }
                          : { background: "#111", borderColor: "#333", color: "#a1a1aa" }
                      }
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Similarity Threshold</label>
                <span className="text-[12px] font-semibold text-zinc-300 tabular-nums">
                  {(config.similarityThreshold !== undefined ? config.similarityThreshold : 0.7).toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={config.similarityThreshold !== undefined ? config.similarityThreshold : 0.7}
                onChange={(e) => updateConfig("similarityThreshold", parseFloat(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #7C3AED 0%, #7C3AED ${(config.similarityThreshold !== undefined ? config.similarityThreshold : 0.7) * 100}%, #333 ${(config.similarityThreshold !== undefined ? config.similarityThreshold : 0.7) * 100}%, #333 100%)`,
                }}
              />
              <div className="flex justify-between mt-1">
                <span className="text-[9px] text-zinc-600">Broad</span>
                <span className="text-[9px] text-zinc-600">Exact</span>
              </div>
            </div>
          </>
        )}

        {/* Credential picker */}
        {credentialType && (
          <CredentialPicker
            value={config.credentialId || ""}
            onChange={(id) => updateConfig("credentialId", id)}
            type={credentialType}
            label={`${label} Credential`}
            placeholder={`Select ${label} credential…`}
          />
        )}

      </div>
    );
  };
}
