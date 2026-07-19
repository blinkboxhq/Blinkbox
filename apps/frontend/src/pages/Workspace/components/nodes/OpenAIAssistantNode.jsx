import SmartVariableInput from "../../../../components/ui/SmartVariableInput";
import CredentialPicker from "../../../../components/ui/CredentialPicker";

const OPERATIONS = [
  { value: "addMessageAndRun", label: "Send & Run" },
  { value: "createThread",     label: "Create Thread" },
  { value: "listMessages",     label: "List Messages" },
  { value: "deleteThread",     label: "Delete Thread" },
];

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

      <CredentialPicker
        value={config.credentialId || ""}
        onChange={(id) => updateConfig("credentialId", id)}
        accentColor="blue"
        label="OpenAI API Key"
        placeholder="Select OpenAI credential..."
      />

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Operation</label>
        <div className="grid grid-cols-2 gap-1.5">
          {OPERATIONS.map((o) => (
            <button key={o.value} onClick={() => updateConfig("operation", o.value)}
              className={`py-2 rounded-lg border text-xs font-bold transition-all ${operation === o.value ? "bg-[#10A37F]/10 border-[#10A37F]/40 text-[#10A37F]" : "bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]"}`}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {(operation === "addMessageAndRun") && (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Assistant ID</label>
            <SmartVariableInput
              value={config.assistantId || ""}
              onChange={(v) => updateConfig("assistantId", v)}
              placeholder="asst_abc123..."
              nodeId={nodeId}
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
