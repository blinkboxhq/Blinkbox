import SmartVariableInput from "../../../../components/ui/SmartVariableInput";
import CredentialPicker from "../../../../components/ui/CredentialPicker";

const OPERATIONS = [
  { value: "listEventTypes",  label: "List Event Types" },
  { value: "listEvents",      label: "List Scheduled Events" },
  { value: "getEvent",        label: "Get Event" },
  { value: "cancelEvent",     label: "Cancel Event" },
  { value: "listInvitees",    label: "List Invitees" },
  { value: "getInvitee",      label: "Get Invitee" },
  { value: "createWebhook",   label: "Create Webhook" },
];

export default function CalendlyNode({ config = {}, updateConfig }) {
  const op = config.operation || "listEvents";

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-[#006BFF]/10 border border-[#006BFF]/30 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="#006BFF">
            <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11zm-7-9c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm1 4.41V17h-2v-1.59l-1.41-1.41 1.41-1.41L12 13.17l.59-.58 1.41 1.41-1 1z"/>
          </svg>
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Calendly</div>
          <div className="text-[11px] text-zinc-500">Events, invitees, event types</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Operation</label>
        <div className="grid grid-cols-2 gap-1">
          {OPERATIONS.map((o) => (
            <button key={o.value} onClick={() => updateConfig("operation", o.value)}
              className={`py-1.5 px-2 rounded-lg border text-[11px] font-bold transition-all text-left ${op === o.value ? "bg-[#006BFF]/10 border-[#006BFF]/40 text-[#006BFF]" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {["listEvents","cancelEvent","listInvitees"].includes(op) && op !== "listEventTypes" && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">{op === "listEvents" ? "Organization URI (blank = all)" : "Event URI"}</label>
          <SmartVariableInput value={config.eventUri || ""} onChange={(v) => updateConfig("eventUri", v)} placeholder="{{ $json.uri }}" />
        </div>
      )}

      {op === "listEvents" && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Status</label>
            <div className="flex gap-1.5">
              {["active","canceled"].map((s) => (
                <button key={s} onClick={() => updateConfig("status", s)}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${config.status === s ? "bg-[#006BFF]/10 border-[#006BFF]/40 text-[#006BFF]" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Min Start (ISO)</label>
              <SmartVariableInput value={config.minStartTime || ""} onChange={(v) => updateConfig("minStartTime", v)} placeholder="{{ $json.from }}" />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Max Start (ISO)</label>
              <SmartVariableInput value={config.maxStartTime || ""} onChange={(v) => updateConfig("maxStartTime", v)} placeholder="{{ $json.to }}" />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Count</label>
            <SmartVariableInput value={config.count || "20"} onChange={(v) => updateConfig("count", v)} placeholder="20" />
          </div>
        </>
      )}

      {op === "cancelEvent" && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Cancel Reason</label>
          <SmartVariableInput value={config.reason || ""} onChange={(v) => updateConfig("reason", v)} placeholder="Meeting rescheduled" />
        </div>
      )}

      {op === "getInvitee" && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Invitee UUID</label>
          <SmartVariableInput value={config.inviteeUuid || ""} onChange={(v) => updateConfig("inviteeUuid", v)} placeholder="{{ $json.uuid }}" />
        </div>
      )}

      {op === "createWebhook" && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Callback URL</label>
            <SmartVariableInput value={config.url || ""} onChange={(v) => updateConfig("url", v)} placeholder="https://my-app.com/webhooks/calendly" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Events to Subscribe</label>
            <div className="flex gap-1 flex-wrap">
              {["invitee.created","invitee.canceled","routing_form_submission.created"].map((e) => (
                <button key={e} onClick={() => {
                  const current = config.events || [];
                  const next = current.includes(e) ? current.filter(x => x !== e) : [...current, e];
                  updateConfig("events", next);
                }}
                  className={`px-2 py-1 rounded-lg text-[9px] font-bold border transition-all ${(config.events||[]).includes(e) ? "bg-[#006BFF]/10 border-[#006BFF]/40 text-[#006BFF]" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}>
                  {e.split(".")[1]}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <CredentialPicker value={config.credentialId || ""} onChange={(id) => updateConfig("credentialId", id)}
        accentColor="blue" label="Calendly API Token" placeholder="Select Calendly credential..." />

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        Returns: <span className="text-zinc-300">uri, name, start_time, end_time, status, invitees_counter</span>
      </div>
    </div>
  );
}
