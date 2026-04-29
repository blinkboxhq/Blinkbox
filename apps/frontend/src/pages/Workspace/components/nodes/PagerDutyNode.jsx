import SmartVariableInput from "../../../../components/ui/SmartVariableInput";
import CredentialPicker from "../../../../components/ui/CredentialPicker";

const OPERATIONS = [
  { value: "createIncident",  label: "Create Incident" },
  { value: "resolveIncident", label: "Resolve Incident" },
  { value: "acknowledgeIncident", label: "Acknowledge Incident" },
  { value: "getIncident",     label: "Get Incident" },
  { value: "listIncidents",   label: "List Incidents" },
  { value: "addNote",         label: "Add Note" },
  { value: "listOnCalls",     label: "List On-Calls" },
];

const URGENCIES = ["high","low"];
const SEVERITIES = ["critical","error","warning","info"];

export default function PagerDutyNode({ config = {}, updateConfig }) {
  const op = config.operation || "createIncident";

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-[#06AC38]/10 border border-[#06AC38]/30 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="#06AC38">
            <path d="M16.8 2.4c-1.6-.5-3.2-.7-5.2-.7H2.4v9.1h9.1c1.9 0 3.5-.2 4.8-.7 2.5-.9 4-2.8 4-4 0-1.8-1.4-3.3-3.5-3.7zM2.4 14.3V21h3.3v-3.8h5.3c2.7 0 4.8-.6 6.3-1.8.3-.2.6-.5.8-.7l2.6 6.3h3.5L21 14.7c1.4-1.5 2.2-3.4 2.2-5.5 0-2.7-1.4-5-3.8-6.5C17.5.9 15.2.4 12.2.4H0v20.5h2.4V14.3z"/>
          </svg>
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">PagerDuty</div>
          <div className="text-[11px] text-zinc-500">Incidents, on-call schedules, alerts</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Operation</label>
        <div className="grid grid-cols-2 gap-1">
          {OPERATIONS.map((o) => (
            <button key={o.value} onClick={() => updateConfig("operation", o.value)}
              className={`py-1.5 px-2 rounded-lg border text-[11px] font-bold transition-all text-left ${op === o.value ? "bg-[#06AC38]/10 border-[#06AC38]/40 text-[#06AC38]" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {["resolveIncident","acknowledgeIncident","getIncident","addNote"].includes(op) && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Incident ID</label>
          <SmartVariableInput value={config.incidentId || ""} onChange={(v) => updateConfig("incidentId", v)} placeholder="{{ $json.id }}" />
        </div>
      )}

      {op === "createIncident" && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Title</label>
            <SmartVariableInput value={config.title || ""} onChange={(v) => updateConfig("title", v)} placeholder="Production DB is down — {{ $json.service }}" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Service ID</label>
            <SmartVariableInput value={config.serviceId || ""} onChange={(v) => updateConfig("serviceId", v)} placeholder="PagerDuty service ID" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Urgency</label>
            <div className="flex gap-1.5">
              {URGENCIES.map((u) => (
                <button key={u} onClick={() => updateConfig("urgency", u)}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${(config.urgency||"high") === u ? "bg-[#06AC38]/10 border-[#06AC38]/40 text-[#06AC38]" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}>
                  {u}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Severity</label>
            <div className="flex gap-1.5">
              {SEVERITIES.map((s) => (
                <button key={s} onClick={() => updateConfig("severity", s)}
                  className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold border transition-all ${(config.severity||"critical") === s ? "bg-[#06AC38]/10 border-[#06AC38]/40 text-[#06AC38]" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Body (optional)</label>
            <SmartVariableInput value={config.body || ""} onChange={(v) => updateConfig("body", v)} placeholder="Error: {{ $json.error }}\nServer: {{ $json.host }}" multiline />
          </div>
        </>
      )}

      {op === "addNote" && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Note</label>
          <SmartVariableInput value={config.content || ""} onChange={(v) => updateConfig("content", v)} placeholder="Root cause: {{ $json.cause }}" multiline />
        </div>
      )}

      {op === "listIncidents" && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Status Filter</label>
            <div className="flex gap-1.5">
              {["triggered","acknowledged","resolved"].map((s) => (
                <button key={s} onClick={() => updateConfig("statuses", s)}
                  className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold border transition-all ${config.statuses === s ? "bg-[#06AC38]/10 border-[#06AC38]/40 text-[#06AC38]" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Limit</label>
            <SmartVariableInput value={config.limit || "25"} onChange={(v) => updateConfig("limit", v)} placeholder="25" />
          </div>
        </>
      )}

      <CredentialPicker value={config.credentialId || ""} onChange={(id) => updateConfig("credentialId", id)}
        accentColor="green" label="PagerDuty API Key" placeholder="Select PagerDuty credential..." />

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        Returns: <span className="text-zinc-300">id, title, status, urgency, html_url, created_at</span>
      </div>
    </div>
  );
}
