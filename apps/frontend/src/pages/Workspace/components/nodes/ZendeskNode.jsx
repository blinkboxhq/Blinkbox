import SmartVariableInput from "../../../../components/ui/SmartVariableInput";
import CredentialPicker from "../../../../components/ui/CredentialPicker";

const OPERATIONS = [
  { value: "createTicket",   label: "Create Ticket" },
  { value: "updateTicket",   label: "Update Ticket" },
  { value: "getTicket",      label: "Get Ticket" },
  { value: "listTickets",    label: "List Tickets" },
  { value: "replyTicket",    label: "Reply to Ticket" },
  { value: "closeTicket",    label: "Close Ticket" },
  { value: "createUser",     label: "Create User" },
  { value: "searchTickets",  label: "Search Tickets" },
];

const PRIORITIES = ["low","normal","high","urgent"];
const STATUSES = ["new","open","pending","hold","solved","closed"];

export default function ZendeskNode({ config = {}, updateConfig, nodeId }) {
  const op = config.operation || "createTicket";

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="#03363D">
            <path d="M11.5 0C5.149 0 0 5.149 0 11.5S5.149 23 11.5 23 23 17.851 23 11.5 17.851 0 11.5 0zm0 4.65a3.85 3.85 0 110 7.7 3.85 3.85 0 010-7.7zm0 14.35C8.05 19 5 16.986 5 14.2 5 12.327 7.694 11 11.5 11s6.5 1.327 6.5 3.2c0 2.787-3.05 4.8-6.5 4.8z" fill="#03363D"/>
          </svg>
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Zendesk</div>
          <div className="text-[11px] text-zinc-500">Tickets, users, replies, search</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Operation</label>
        <div className="grid grid-cols-2 gap-1">
          {OPERATIONS.map((o) => (
            <button key={o.value} onClick={() => updateConfig("operation", o.value)}
              className={`py-1.5 px-2 rounded-lg border text-[11px] font-bold transition-all text-left ${op === o.value ? "bg-zinc-700/50 border-zinc-600 text-white" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Subdomain</label>
        <SmartVariableInput value={config.subdomain || ""} onChange={(v) => updateConfig("subdomain", v)} placeholder="mycompany (from mycompany.zendesk.com)" />
      </div>

      {["updateTicket","getTicket","replyTicket","closeTicket"].includes(op) && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Ticket ID</label>
          <SmartVariableInput value={config.ticketId || ""} onChange={(v) => updateConfig("ticketId", v)} placeholder="{{ $json.id }}" />
        </div>
      )}

      {(op === "createTicket" || op === "updateTicket") && (
        <>
          {op === "createTicket" && (
            <>
              <div>
                <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Subject</label>
                <SmartVariableInput value={config.subject || ""} onChange={(v) => updateConfig("subject", v)} placeholder="{{ $json.subject }}" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Body</label>
                <SmartVariableInput value={config.body || ""} onChange={(v) => updateConfig("body", v)} placeholder="{{ $json.message }}" multiline />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Requester Email</label>
                <SmartVariableInput value={config.requesterEmail || ""} onChange={(v) => updateConfig("requesterEmail", v)} placeholder="{{ $json.email }}" />
              </div>
            </>
          )}
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Priority</label>
            <div className="flex gap-1.5">
              {PRIORITIES.map((p) => (
                <button key={p} onClick={() => updateConfig("priority", p)}
                  className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold border transition-all ${(config.priority||"normal") === p ? "bg-zinc-700/50 border-zinc-600 text-white" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {op === "updateTicket" && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Status</label>
          <div className="flex gap-1 flex-wrap">
            {STATUSES.map((s) => (
              <button key={s} onClick={() => updateConfig("status", s)}
                className={`px-2 py-1 rounded-lg text-[9px] font-bold border transition-all ${config.status === s ? "bg-zinc-700/50 border-zinc-600 text-white" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {op === "replyTicket" && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Reply Body</label>
            <SmartVariableInput value={config.body || ""} onChange={(v) => updateConfig("body", v)} placeholder="Thank you for contacting us, {{ $json.name }}..." multiline />
          </div>
          <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
            <p className="text-[12px] font-semibold text-zinc-300">Public reply</p>
            <button onClick={() => updateConfig("public", !config.public)}
              className={`w-10 h-5 rounded-full border transition-all relative ${config.public !== false ? "bg-zinc-600 border-zinc-500" : "bg-zinc-700 border-zinc-600"}`}>
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${config.public !== false ? "left-5" : "left-0.5"}`} />
            </button>
          </div>
        </>
      )}

      {op === "createUser" && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Name</label>
            <SmartVariableInput value={config.name || ""} onChange={(v) => updateConfig("name", v)} placeholder="{{ $json.name }}" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Email</label>
            <SmartVariableInput value={config.email || ""} onChange={(v) => updateConfig("email", v)} placeholder="{{ $json.email }}" />
          </div>
        </>
      )}

      {op === "searchTickets" && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Search Query</label>
          <SmartVariableInput value={config.query || ""} onChange={(v) => updateConfig("query", v)} placeholder='status:open requester:"{{ $json.email }}"' />
        </div>
      )}

      <CredentialPicker value={config.credentialId || ""} onChange={(id) => updateConfig("credentialId", id)}
        accentColor="zinc" label="Zendesk API Token" placeholder="Select Zendesk credential..." />

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        Returns: <span className="text-zinc-300">id, subject, status, priority, requester, created_at</span>
      </div>
    </div>
  );
}
