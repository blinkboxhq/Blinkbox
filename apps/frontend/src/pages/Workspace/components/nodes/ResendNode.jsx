import SmartVariableInput from "../../../../components/ui/SmartVariableInput";

export default function ResendNode({ config = {}, updateConfig, nodeId }) {
  const operation = config.operation || "sendEmail";

  return (
    <div className="flex flex-col gap-5 w-full">
      <div className="flex items-center gap-3 p-4 bg-orange-500/5 border border-orange-500/20 rounded-xl">
          <div className="w-8 h-8 rounded-lg bg-[#0F0F0F]/10 border border-[#0F0F0F]/20 flex items-center justify-center shrink-0">
            <Send className="w-4 h-4 text-[#0F0F0F]" />
          </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-orange-400">Resend</span>
          <span className="text-[10px] text-zinc-500">Modern transactional email API</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Credential (API Key)</label>
        <input
          value={config.credentialId || ""}
          onChange={(e) => updateConfig("credentialId", e.target.value)}
          placeholder="Resend credential ID"
          className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-orange-500/40"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Operation</label>
        <div className="grid grid-cols-2 gap-2">
          {[{ id: "sendEmail", label: "Send Email" }, { id: "sendBatch", label: "Batch Send" }].map((op) => (
            <button
              key={op.id}
              onClick={() => updateConfig("operation", op.id)}
              className={`py-2.5 rounded-lg border text-xs font-bold transition-all ${
                operation === op.id
                  ? "bg-orange-500/10 border-orange-500/40 text-orange-400"
                  : "bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]"
              }`}
            >
              {op.label}
            </button>
          ))}
        </div>
      </div>

      {operation === "sendEmail" && (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">From</label>
            <SmartVariableInput
              value={config.from || ""}
              onChange={(v) => updateConfig("from", v)}
              placeholder="BlinkBox <hello@yourdomain.com>"
              nodeId={nodeId}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">To</label>
            <SmartVariableInput
              value={config.to || ""}
              onChange={(v) => updateConfig("to", v)}
              placeholder="{{upstream.email}} or user@example.com"
              nodeId={nodeId}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Subject</label>
            <SmartVariableInput
              value={config.subject || ""}
              onChange={(v) => updateConfig("subject", v)}
              placeholder="Your order is confirmed!"
              nodeId={nodeId}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">HTML Body</label>
            <SmartVariableInput
              value={config.html || ""}
              onChange={(v) => updateConfig("html", v)}
              placeholder="{{template_renderer.rendered}} or paste HTML"
              nodeId={nodeId}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Reply-To (optional)</label>
            <SmartVariableInput
              value={config.replyTo || ""}
              onChange={(v) => updateConfig("replyTo", v)}
              placeholder="support@yourdomain.com"
              nodeId={nodeId}
            />
          </div>
        </>
      )}

      {operation === "sendBatch" && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Emails Array</label>
          <SmartVariableInput
            value={config.emails || ""}
            onChange={(v) => updateConfig("emails", v)}
            placeholder='{{upstream.emails}} — array of {from, to, subject, html} objects'
            nodeId={nodeId}
          />
        </div>
      )}
    </div>
  );
}
