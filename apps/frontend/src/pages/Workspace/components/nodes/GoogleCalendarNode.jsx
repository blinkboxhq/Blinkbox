import SmartVariableInput from "../../../../components/ui/SmartVariableInput";
import CredentialPicker from "../../../../components/ui/CredentialPicker";
import OAuthConnectButton from "../../../../components/ui/OAuthConnectButton";

const OPERATIONS = [
  { value: "listEvents",    label: "List Events" },
  { value: "getEvent",      label: "Get Event" },
  { value: "createEvent",   label: "Create Event" },
  { value: "updateEvent",   label: "Update Event" },
  { value: "deleteEvent",   label: "Delete Event" },
  { value: "listCalendars", label: "List Calendars" },
];

function CalIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M19 4h-1V2h-2v2H8V2H6v2H5C3.9 4 3 4.9 3 6v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11zm0-13H5V6h14v1z"/>
    </svg>
  );
}

export default function GoogleCalendarNode({ config = {}, updateConfig }) {
  const op = config.operation || "listEvents";

  return (
    <div className="flex flex-col gap-5 w-full">
      <div className="flex items-center gap-3 p-4 bg-[#4285F4]/5 border border-[#4285F4]/20 rounded-xl">
        <div className="p-2 bg-[#4285F4]/10 rounded-lg text-[#4285F4] shrink-0">
          <CalIcon className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-[#4285F4]">Google Calendar</span>
          <span className="text-[10px] text-zinc-500">Read, create, and manage events</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Calendar ID</label>
        <SmartVariableInput value={config.calendarId || "primary"} onChange={(v) => updateConfig("calendarId", v)} placeholder="primary" />
        <p className="text-[10px] text-zinc-600">"primary" for the default calendar, or a specific calendar ID</p>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Operation</label>
        <div className="grid grid-cols-2 gap-1.5">
          {OPERATIONS.map((o) => (
            <button key={o.value} onClick={() => updateConfig("operation", o.value)}
              className={`py-2 rounded-lg border text-xs font-bold transition-all ${op === o.value ? "bg-[#4285F4]/10 border-[#4285F4]/40 text-[#4285F4]" : "bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]"}`}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {op === "listEvents" && (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">From (ISO datetime)</label>
            <SmartVariableInput value={config.timeMin || ""} onChange={(v) => updateConfig("timeMin", v)} placeholder="{{$now}}  (blank = now)" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">To (ISO datetime, optional)</label>
            <SmartVariableInput value={config.timeMax || ""} onChange={(v) => updateConfig("timeMax", v)} placeholder="2024-12-31T23:59:59Z" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Max Results</label>
            <input type="number" min="1" max="250" value={config.limit || 20} onChange={(e) => updateConfig("limit", Number(e.target.value))}
              className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#4285F4]/40" />
          </div>
        </>
      )}

      {["getEvent", "updateEvent", "deleteEvent"].includes(op) && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Event ID</label>
          <SmartVariableInput value={config.eventId || ""} onChange={(v) => updateConfig("eventId", v)} placeholder="{{n1.id}}" />
        </div>
      )}

      {["createEvent", "updateEvent"].includes(op) && (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Title</label>
            <SmartVariableInput value={config.summary || ""} onChange={(v) => updateConfig("summary", v)} placeholder="Team standup" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Start Time (ISO)</label>
              <SmartVariableInput value={config.startTime || ""} onChange={(v) => updateConfig("startTime", v)} placeholder="2024-06-01T10:00:00" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">End Time (ISO)</label>
              <SmartVariableInput value={config.endTime || ""} onChange={(v) => updateConfig("endTime", v)} placeholder="2024-06-01T11:00:00" />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Attendees (comma-separated emails)</label>
            <SmartVariableInput value={config.attendees || ""} onChange={(v) => updateConfig("attendees", v)} placeholder="alice@example.com, bob@example.com" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Timezone</label>
            <input value={config.timeZone || "UTC"} onChange={(e) => updateConfig("timeZone", e.target.value)}
              className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#4285F4]/40" />
          </div>
        </>
      )}

      <OAuthConnectButton provider="google" providerLabel="Google" accentColor="blue"
        value={config.credentialId || ""} onChange={(id) => updateConfig("credentialId", id)} icon={CalIcon} />
      <p className="text-[10px] text-zinc-600 -mt-3">Or use an existing credential:</p>
      <CredentialPicker value={config.credentialId || ""} onChange={(id) => updateConfig("credentialId", id)}
        accentColor="blue" label="Google OAuth Token" placeholder="Select Google credential..." />
    </div>
  );
}
