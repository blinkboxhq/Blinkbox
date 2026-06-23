import SmartVariableInput from "../../../../components/ui/SmartVariableInput";
import CredentialPicker from "../../../../components/ui/CredentialPicker";

const OPERATIONS = [
  { value: "createContact",   label: "Create Contact" },
  { value: "updateContact",   label: "Update Contact" },
  { value: "getContact",      label: "Get Contact" },
  { value: "sendMessage",     label: "Send Message" },
  { value: "createConversation", label: "New Conversation" },
  { value: "replyConversation",  label: "Reply to Conversation" },
  { value: "addTag",          label: "Add Tag" },
  { value: "createEvent",     label: "Track Event" },
];

export default function IntercomNode({ config = {}, updateConfig, nodeId }) {
  const op = config.operation || "createContact";

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-[#1F8DED]/10 border border-[#1F8DED]/30 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="#1F8DED">
            <path d="M12 0C5.374 0 0 5.373 0 12s5.374 12 12 12 12-5.373 12-12S18.626 0 12 0zm-1.8 16.8c-2.65 0-4.8-2.15-4.8-4.8s2.15-4.8 4.8-4.8h3.6c2.65 0 4.8 2.15 4.8 4.8s-2.15 4.8-4.8 4.8h-3.6z"/>
          </svg>
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Intercom</div>
          <div className="text-[11px] text-zinc-500">Contacts, messages, conversations, events</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Operation</label>
        <div className="grid grid-cols-2 gap-1">
          {OPERATIONS.map((o) => (
            <button key={o.value} onClick={() => updateConfig("operation", o.value)}
              className={`py-1.5 px-2 rounded-lg border text-[11px] font-bold transition-all text-left ${op === o.value ? "bg-[#1F8DED]/10 border-[#1F8DED]/40 text-[#1F8DED]" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {["updateContact","getContact","sendMessage","addTag"].includes(op) && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Contact ID</label>
          <SmartVariableInput nodeId={nodeId} value={config.contactId || ""} onChange={(v) => updateConfig("contactId", v)} placeholder="{{ $json.id }}" />
        </div>
      )}

      {(op === "createContact" || op === "updateContact") && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Email</label>
            <SmartVariableInput nodeId={nodeId} value={config.email || ""} onChange={(v) => updateConfig("email", v)} placeholder="{{ $json.email }}" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Name</label>
            <SmartVariableInput nodeId={nodeId} value={config.name || ""} onChange={(v) => updateConfig("name", v)} placeholder="{{ $json.name }}" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Role</label>
            <div className="flex gap-1.5">
              {["user","lead"].map((r) => (
                <button key={r} onClick={() => updateConfig("role", r)}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${(config.role||"user") === r ? "bg-[#1F8DED]/10 border-[#1F8DED]/40 text-[#1F8DED]" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}>
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Custom Attributes (JSON, optional)</label>
            <SmartVariableInput nodeId={nodeId} value={config.customAttributes || ""} onChange={(v) => updateConfig("customAttributes", v)} placeholder='{"plan":"pro","company":"Acme"}' />
          </div>
        </>
      )}

      {(op === "sendMessage" || op === "createConversation") && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Message</label>
            <SmartVariableInput nodeId={nodeId} value={config.body || ""} onChange={(v) => updateConfig("body", v)} placeholder="Hi {{ $json.name }}, we noticed..." multiline />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Message Type</label>
            <div className="flex gap-1.5">
              {["inapp","email"].map((t) => (
                <button key={t} onClick={() => updateConfig("messageType", t)}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${(config.messageType||"inapp") === t ? "bg-[#1F8DED]/10 border-[#1F8DED]/40 text-[#1F8DED]" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}>
                  {t === "inapp" ? "In-app" : "Email"}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {op === "replyConversation" && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Conversation ID</label>
            <SmartVariableInput nodeId={nodeId} value={config.conversationId || ""} onChange={(v) => updateConfig("conversationId", v)} placeholder="{{ $json.conversationId }}" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Reply Body</label>
            <SmartVariableInput nodeId={nodeId} value={config.body || ""} onChange={(v) => updateConfig("body", v)} placeholder="Thanks for reaching out..." multiline />
          </div>
        </>
      )}

      {op === "addTag" && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Tag Name</label>
          <SmartVariableInput nodeId={nodeId} value={config.tagName || ""} onChange={(v) => updateConfig("tagName", v)} placeholder="vip-customer" />
        </div>
      )}

      {op === "createEvent" && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Event Name</label>
            <SmartVariableInput nodeId={nodeId} value={config.eventName || ""} onChange={(v) => updateConfig("eventName", v)} placeholder="completed-onboarding" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">User ID or Email</label>
            <SmartVariableInput nodeId={nodeId} value={config.userId || ""} onChange={(v) => updateConfig("userId", v)} placeholder="{{ $json.email }}" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Metadata (JSON, optional)</label>
            <SmartVariableInput nodeId={nodeId} value={config.metadata || ""} onChange={(v) => updateConfig("metadata", v)} placeholder='{"plan":"pro","items":3}' />
          </div>
        </>
      )}

      <CredentialPicker value={config.credentialId || ""} onChange={(id) => updateConfig("credentialId", id)}
        accentColor="blue" label="Intercom Access Token" placeholder="Select Intercom credential..." />

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        Returns: <span className="text-zinc-300">id, type, email, name, created_at</span>
      </div>
    </div>
  );
}
