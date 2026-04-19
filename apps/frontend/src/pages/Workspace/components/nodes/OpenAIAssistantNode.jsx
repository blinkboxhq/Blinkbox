import SmartVariableInput from "../../../../components/ui/SmartVariableInput";

export default function OpenAIAssistantNode({ config = {}, updateConfig, nodeId }) {
  const operation = config.operation || "addMessageAndRun";

  return (
    <div className="flex flex-col gap-5 w-full">
      <div className="flex items-center gap-3 p-4 bg-[#10A37F]/10 border border-[#10A37F]/30 rounded-xl">
        <div className="flex flex-col">
          <span className="text-sm font-bold text-[#10A37F]">OpenAI Assistants</span>
          <span className="text-[10px] text-zinc-500">Persistent threads with file search & code interpreter</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Credential</label>
        <input
          value={config.credentialId || ""}
          onChange={(e) => updateConfig("credentialId", e.target.value)}
          placeholder="OpenAI credential ID"
          className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#10A37F]/40"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Operation</label>
        <select
          value={operation}
          onChange={(e) => updateConfig("operation", e.target.value)}
          className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#10A37F]/40"
        >
          <option value="addMessageAndRun">Send Message & Run</option>
          <option value="createThread">Create Thread</option>
          <option value="listMessages">List Messages</option>
          <option value="deleteThread">Delete Thread</option>
        </select>
      </div>

      {(operation === "addMessageAndRun") && (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Assistant ID</label>
            <input
              value={config.assistantId || ""}
              onChange={(e) => updateConfig("assistantId", e.target.value)}
              placeholder="asst_abc123..."
              className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#10A37F]/40"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Thread ID</label>
            <SmartVariableInput
              value={config.threadId || ""}
              onChange={(v) => updateConfig("threadId", v)}
              placeholder="{{upstream.threadId}}  (blank = auto-create new thread)"
              nodeId={nodeId}
            />
            <p className="text-[9px] text-zinc-600">Leave blank to start a new thread each run</p>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Message</label>
            <SmartVariableInput
              value={config.message || ""}
              onChange={(v) => updateConfig("message", v)}
              placeholder="{{telegram_trigger.text}}"
              nodeId={nodeId}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Instructions Override (optional)</label>
            <SmartVariableInput
              value={config.instructions || ""}
              onChange={(v) => updateConfig("instructions", v)}
              placeholder="Custom system instructions for this run"
              nodeId={nodeId}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Tools</label>
            <div className="flex flex-col gap-2">
              {[{ key: "enableFileSearch", label: "File Search" }, { key: "enableCodeInterpreter", label: "Code Interpreter" }].map((t) => (
                <div key={t.key} className="flex items-center justify-between p-2.5 bg-zinc-900 rounded-lg border border-zinc-800">
                  <span className="text-xs text-zinc-400">{t.label}</span>
                  <button
                    onClick={() => updateConfig(t.key, !config[t.key])}
                    className={`relative w-8 h-[18px] rounded-full transition-colors ${config[t.key] ? "bg-[#10A37F]" : "bg-zinc-700"}`}
                  >
                    <span className={`absolute top-[2px] left-[2px] w-[14px] h-[14px] rounded-full bg-white transition-transform ${config[t.key] ? "translate-x-[14px]" : ""}`} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {(operation === "listMessages" || operation === "deleteThread") && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Thread ID</label>
          <SmartVariableInput
            value={config.threadId || ""}
            onChange={(v) => updateConfig("threadId", v)}
            placeholder="{{upstream.threadId}}"
            nodeId={nodeId}
          />
        </div>
      )}
    </div>
  );
}
