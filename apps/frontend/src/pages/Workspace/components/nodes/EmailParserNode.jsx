import SmartVariableInput from "../../../../components/ui/SmartVariableInput";

const OPERATIONS = [
  { id: "extractInvoice", label: "Invoice", icon: "🧾" },
  { id: "extractOrder", label: "Order", icon: "📦" },
  { id: "extractContact", label: "Contact", icon: "👤" },
  { id: "extractMeeting", label: "Meeting", icon: "📅" },
  { id: "extractCustom", label: "Custom", icon: "⚙️" },
];

export default function EmailParserNode({ config = {}, updateConfig, nodeId }) {
  const operation = config.operation || "extractInvoice";
  const provider = config.provider || "openai";

  return (
    <div className="flex flex-col gap-5 w-full">
      <div className="flex items-center gap-3 p-4 bg-orange-500/5 border border-orange-500/20 rounded-xl">
        <div className="flex flex-col">
          <span className="text-sm font-bold text-orange-400">Email Parser</span>
          <span className="text-[10px] text-zinc-500">AI-powered email → structured JSON extraction</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Credential (API Key)</label>
        <input
          value={config.credentialId || ""}
          onChange={(e) => updateConfig("credentialId", e.target.value)}
          placeholder="OpenAI or Anthropic credential ID"
          className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-orange-500/40"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Extract Type</label>
        <div className="grid grid-cols-2 gap-2">
          {OPERATIONS.map((op) => (
            <button
              key={op.id}
              onClick={() => updateConfig("operation", op.id)}
              className={`py-2.5 rounded-lg border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                operation === op.id
                  ? "bg-orange-500/10 border-orange-500/40 text-orange-400"
                  : "bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]"
              }`}
            >
              <span>{op.icon}</span>{op.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Email Body</label>
        <SmartVariableInput
          value={config.emailText || ""}
          onChange={(v) => updateConfig("emailText", v)}
          placeholder="{{gmail_trigger.body}} or {{imap_trigger.body}}"
          multiline
          nodeId={nodeId}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Subject</label>
          <SmartVariableInput
            value={config.emailSubject || ""}
            onChange={(v) => updateConfig("emailSubject", v)}
            placeholder="{{gmail_trigger.subject}}"
            nodeId={nodeId}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">From</label>
          <SmartVariableInput
            value={config.emailFrom || ""}
            onChange={(v) => updateConfig("emailFrom", v)}
            placeholder="{{gmail_trigger.from}}"
            nodeId={nodeId}
          />
        </div>
      </div>

      {operation === "extractCustom" && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Custom Schema</label>
          <SmartVariableInput
            value={config.customSchema || ""}
            onChange={(v) => updateConfig("customSchema", v)}
            placeholder='name, email, amount  OR  [{"name":"price","type":"number"}]'
            multiline
            nodeId={nodeId}
          />
          <span className="text-[9px] text-zinc-600">Comma-separated field names or JSON array of {"{"}"name","type","description"{"}"}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Provider</label>
          <select
            value={provider}
            onChange={(e) => updateConfig("provider", e.target.value)}
            className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-orange-500/40"
          >
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic</option>
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Model</label>
          <input
            value={config.model || (provider === "anthropic" ? "claude-3-haiku-20240307" : "gpt-4o-mini")}
            onChange={(e) => updateConfig("model", e.target.value)}
            placeholder={provider === "anthropic" ? "claude-3-haiku-20240307" : "gpt-4o-mini"}
            className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-orange-500/40"
          />
        </div>
      </div>
    </div>
  );
}
