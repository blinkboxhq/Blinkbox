import SmartVariableInput from "@/components/ui/SmartVariableInput";
import CredentialPicker from "@/components/ui/CredentialPicker";

const MEMORY_TYPES = [
  { id: "window_buffer", label: "Window Buffer", desc: "Last N messages in RAM", icon: "⚡" },
  { id: "redis",         label: "Redis",         desc: "Fast persistent sessions", icon: "🔴" },
  { id: "postgres",      label: "PostgreSQL",     desc: "Durable DB-backed memory", icon: "🐘" },
  { id: "vector",        label: "Vector Store",   desc: "Semantic similarity search", icon: "🧬" },
  { id: "mem0",          label: "Mem0",           desc: "Long-term AI memory layer", icon: "🌀" },
];

export default function AgentMemoryNode({ config = {}, updateConfig, nodeId }) {
  const type = config.memoryType || "window_buffer";
  const selected = MEMORY_TYPES.find(m => m.id === type) || MEMORY_TYPES[0];
  const needsCredential = ["redis","postgres","vector","mem0"].includes(type);
  const needsUrl = ["redis","postgres"].includes(type);
  const needsCollection = type === "vector";

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
          <span className="text-sm">🧠</span>
        </div>
        <div>
          <p className="text-[12px] font-bold text-zinc-100">Memory</p>
          <p className="text-[10px] text-zinc-600">Stores conversation history for the agent</p>
        </div>
      </div>

      {/* Memory type */}
      <div>
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Memory Type</label>
        <div className="flex flex-col gap-1">
          {MEMORY_TYPES.map(m => (
            <button key={m.id} onClick={() => updateConfig("memoryType", m.id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all ${
                type === m.id
                  ? "bg-purple-500/10 border-purple-500/30 text-zinc-100"
                  : "bg-zinc-950 border-zinc-800/60 text-zinc-500 hover:border-zinc-700"
              }`}>
              <span className="text-base leading-none shrink-0">{m.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold">{m.label}</p>
                <p className="text-[9px] text-zinc-700">{m.desc}</p>
              </div>
              {type === m.id && <div className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />}
            </button>
          ))}
        </div>
      </div>

      {/* Session ID */}
      <div>
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 block">Session ID</label>
        <SmartVariableInput
          value={config.sessionId || ""}
          onChange={v => updateConfig("sessionId", v)}
          placeholder="{{ $json.chatId }}  or  {{ $json.userId }}"
          nodeId={nodeId}
        />
        <p className="text-[9px] text-zinc-700 mt-1">Unique per conversation — separates memories between users.</p>
      </div>

      {/* Window size (for window buffer) */}
      {type === "window_buffer" && (
        <div>
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 block">Window Size (messages)</label>
          <div className="flex gap-1.5">
            {[10, 20, 50, 100].map(n => (
              <button key={n} onClick={() => updateConfig("windowSize", n)}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
                  (config.windowSize || 20) === n
                    ? "bg-purple-500/10 border-purple-500/30 text-purple-300"
                    : "bg-zinc-900 border-zinc-800 text-zinc-600 hover:border-zinc-700"
                }`}>
                {n}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Connection URL for Redis/Postgres */}
      {needsUrl && (
        <div>
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 block">
            {type === "redis" ? "Redis URL" : "Postgres Connection String"}
          </label>
          <SmartVariableInput
            value={config.connectionUrl || ""}
            onChange={v => updateConfig("connectionUrl", v)}
            placeholder={type === "redis" ? "redis://localhost:6379" : "postgresql://user:pass@host/db"}
            nodeId={nodeId}
          />
        </div>
      )}

      {/* Collection for vector */}
      {needsCollection && (
        <div>
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 block">Collection Name</label>
          <SmartVariableInput value={config.collection || ""} onChange={v => updateConfig("collection", v)} placeholder="agent-memory" nodeId={nodeId} />
        </div>
      )}

      {/* Credential */}
      {needsCredential && (
        <CredentialPicker
          value={config.credentialId || ""}
          onChange={id => updateConfig("credentialId", id)}
          accentColor="violet"
          label={`${selected.label} Credential`}
          placeholder={`Select ${selected.label} credential…`}
        />
      )}

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-600">
        Connect the <span className="text-zinc-400 font-semibold">output</span> of this node to the <span className="text-purple-400 font-semibold">Memory</span> slot on the AI Agent.
      </div>
    </div>
  );
}
