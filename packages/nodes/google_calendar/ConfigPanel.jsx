import SmartVariableInput from "@/components/ui/SmartVariableInput";
import CredentialPicker from "@/components/ui/CredentialPicker";
import OAuthConnectButton from "@/components/ui/OAuthConnectButton";
import {
  CalendarDays, CalendarPlus, CalendarClock, CalendarX2, Eye, Plus, Pencil, Trash2,
  Zap, MoveRight, Check, Repeat, Download, Settings2, CalendarRange, Eraser,
  BookOpen, BookmarkMinus, Users, UserPlus, UserMinus, CalendarSearch, Palette,
} from "lucide-react";

const ACCENT = "#4285F4";

const GROUPS = [
  {
    title: "Events",
    ops: [
      { value: "listEvents", label: "List Events", icon: CalendarDays },
      { value: "getEvent", label: "Get Event", icon: Eye },
      { value: "createEvent", label: "Create Event", icon: CalendarPlus },
      { value: "updateEvent", label: "Update Event", icon: CalendarClock },
      { value: "deleteEvent", label: "Delete Event", icon: CalendarX2 },
      { value: "quickAddEvent", label: "Quick Add", icon: Zap },
      { value: "moveEvent", label: "Move Event", icon: MoveRight },
      { value: "respondToEvent", label: "RSVP", icon: Check },
      { value: "listInstances", label: "List Instances", icon: Repeat },
      { value: "importEvent", label: "Import Event", icon: Download },
    ],
  },
  {
    title: "Calendars",
    ops: [
      { value: "listCalendars", label: "List Calendars", icon: CalendarRange },
      { value: "getCalendar", label: "Get Calendar", icon: Eye },
      { value: "createCalendar", label: "Create Calendar", icon: Plus },
      { value: "updateCalendar", label: "Update Calendar", icon: Settings2 },
      { value: "deleteCalendar", label: "Delete Calendar", icon: Trash2 },
      { value: "clearCalendar", label: "Clear Calendar", icon: Eraser },
      { value: "addCalendarToList", label: "Subscribe", icon: BookOpen },
      { value: "removeCalendarFromList", label: "Unsubscribe", icon: BookmarkMinus },
    ],
  },
  {
    title: "Sharing & Availability",
    ops: [
      { value: "listAcl", label: "List Access", icon: Users },
      { value: "shareCalendar", label: "Share", icon: UserPlus },
      { value: "unshareCalendar", label: "Unshare", icon: UserMinus },
      { value: "freeBusy", label: "Free/Busy", icon: CalendarSearch },
      { value: "getColors", label: "Get Colors", icon: Palette },
    ],
  },
];

const lbl = "text-[10px] font-bold text-zinc-500 uppercase tracking-widest";
const inputCls = "w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#4285F4]/40";

const RESPONSE = [
  { value: "accepted", label: "Accept" },
  { value: "declined", label: "Decline" },
  { value: "tentative", label: "Tentative" },
];

const NO_CALENDAR_ID_OPS = ["listCalendars", "createCalendar", "getColors"];

function CalIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M19 4h-1V2h-2v2H8V2H6v2H5C3.9 4 3 4.9 3 6v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11zm0-13H5V6h14v1z" />
    </svg>
  );
}

function Field({ label, hint, children }) {
  return (
    <div className="flex flex-col gap-2">
      <label className={lbl}>{label}</label>
      {children}
      {hint && <p className="text-[10px] text-zinc-600">{hint}</p>}
    </div>
  );
}

export default function GoogleCalendarNode({ config = {}, updateConfig, nodeId }) {
  const op = config.operation || "listEvents";
  const set = (k) => (v) => updateConfig(k, v);
  const showCalId = !NO_CALENDAR_ID_OPS.includes(op);

  return (
    <div className="flex flex-col gap-5 w-full">
      <div className="flex items-center gap-3 p-4 bg-[#4285F4]/5 border border-[#4285F4]/20 rounded-xl">
        <div className="p-2 bg-[#4285F4]/10 rounded-lg text-[#4285F4] shrink-0">
          <CalIcon className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-[#4285F4]">Google Calendar</span>
          <span className="text-[10px] text-zinc-500">Events, calendars, sharing & availability</span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <label className={lbl}>Operation</label>
        {GROUPS.map((group) => (
          <div key={group.title} className="flex flex-col gap-2">
            <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">{group.title}</span>
            <div className="grid grid-cols-2 gap-2">
              {group.ops.map((o) => {
                const Icon = o.icon;
                const active = op === o.value;
                return (
                  <button key={o.value} onClick={() => updateConfig("operation", o.value)}
                    className={`flex items-center gap-2 py-2 px-2.5 rounded-lg border text-[11px] font-bold transition-all ${active ? "bg-[#4285F4]/10 border-[#4285F4]/40 text-[#4285F4]" : "bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]"}`}>
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{o.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {showCalId && (
        <Field label="Calendar ID" hint='"primary" for the default calendar, or a specific calendar ID'>
          <SmartVariableInput value={config.calendarId || "primary"} onChange={set("calendarId")} placeholder="primary" />
        </Field>
      )}

      {op === "createCalendar" && (
        <>
          <Field label="Name"><SmartVariableInput value={config.summary || ""} onChange={set("summary")} placeholder="Project Deadlines" /></Field>
          <Field label="Description (optional)"><SmartVariableInput value={config.description || ""} onChange={set("description")} placeholder="" /></Field>
          <Field label="Timezone"><input value={config.timeZone || "UTC"} onChange={(e) => updateConfig("timeZone", e.target.value)} className={inputCls} /></Field>
        </>
      )}

      {op === "updateCalendar" && (
        <>
          <Field label="New Name (optional)"><SmartVariableInput value={config.summary || ""} onChange={set("summary")} placeholder="" /></Field>
          <Field label="Description (optional)"><SmartVariableInput value={config.description || ""} onChange={set("description")} placeholder="" /></Field>
          <Field label="Timezone (optional)"><input value={config.timeZone || ""} onChange={(e) => updateConfig("timeZone", e.target.value)} placeholder="UTC" className={inputCls} /></Field>
        </>
      )}

      {["addCalendarToList", "removeCalendarFromList"].includes(op) && (
        <Field label="Calendar ID to subscribe/unsubscribe" hint="The shared calendar's ID (e.g. team@group.calendar.google.com)">
          <SmartVariableInput value={config.calendarId || ""} onChange={set("calendarId")} placeholder="..." />
        </Field>
      )}

      {op === "listEvents" && (
        <>
          <Field label="From (ISO datetime)"><SmartVariableInput value={config.timeMin || ""} onChange={set("timeMin")} placeholder="{{$now}}  (blank = now)" /></Field>
          <Field label="To (ISO datetime, optional)"><SmartVariableInput value={config.timeMax || ""} onChange={set("timeMax")} placeholder="2024-12-31T23:59:59Z" /></Field>
          <Field label="Search Query (optional)"><SmartVariableInput value={config.query || ""} onChange={set("query")} placeholder="standup" /></Field>
          <Field label="Max Results">
            <input type="number" min="1" max="2500" value={config.limit || 20} onChange={(e) => updateConfig("limit", Number(e.target.value))} className={inputCls} />
          </Field>
        </>
      )}

      {op === "listInstances" && (
        <>
          <Field label="Recurring Event ID"><SmartVariableInput value={config.eventId || ""} onChange={set("eventId")} placeholder="{{n1.id}}" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="From (optional)"><SmartVariableInput value={config.timeMin || ""} onChange={set("timeMin")} placeholder="" /></Field>
            <Field label="To (optional)"><SmartVariableInput value={config.timeMax || ""} onChange={set("timeMax")} placeholder="" /></Field>
          </div>
        </>
      )}

      {["getEvent", "deleteEvent", "moveEvent", "respondToEvent"].includes(op) && (
        <Field label="Event ID"><SmartVariableInput value={config.eventId || ""} onChange={set("eventId")} placeholder="{{n1.id}}" /></Field>
      )}

      {op === "moveEvent" && (
        <Field label="Destination Calendar ID"><SmartVariableInput value={config.destinationCalendarId || ""} onChange={set("destinationCalendarId")} placeholder="other@group.calendar.google.com" /></Field>
      )}

      {op === "respondToEvent" && (
        <>
          <Field label="Response">
            <div className="grid grid-cols-3 gap-1.5">
              {RESPONSE.map((r) => (
                <button key={r.value} onClick={() => updateConfig("responseStatus", r.value)}
                  className={`py-2 rounded-lg border text-[11px] font-bold transition-all ${config.responseStatus === r.value ? "bg-[#4285F4]/10 border-[#4285F4]/40 text-[#4285F4]" : "bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]"}`}>
                  {r.label}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Attendee Email (optional)" hint="Defaults to your own attendee record"><SmartVariableInput value={config.attendeeEmail || ""} onChange={set("attendeeEmail")} placeholder="you@example.com" /></Field>
        </>
      )}

      {op === "quickAddEvent" && (
        <Field label="Natural Language" hint='e.g. "Lunch with Sam tomorrow at 1pm"'>
          <SmartVariableInput value={config.text || ""} onChange={set("text")} placeholder="Dinner Friday 7pm at Nopa" />
        </Field>
      )}

      {op === "importEvent" && (
        <Field label="iCalUID"><SmartVariableInput value={config.iCalUID || ""} onChange={set("iCalUID")} placeholder="abc123@example.com" /></Field>
      )}

      {["createEvent", "updateEvent", "importEvent"].includes(op) && (
        <>
          <Field label={op === "updateEvent" ? "Title (optional)" : "Title"}><SmartVariableInput value={config.summary || ""} onChange={set("summary")} placeholder="Team standup" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start Time (ISO)"><SmartVariableInput value={config.startTime || ""} onChange={set("startTime")} placeholder="2024-06-01T10:00:00" /></Field>
            <Field label="End Time (ISO)"><SmartVariableInput value={config.endTime || ""} onChange={set("endTime")} placeholder="2024-06-01T11:00:00" /></Field>
          </div>
          <div className="flex items-center justify-between bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5">
            <span className="text-[11px] font-bold text-zinc-400">All-day event</span>
            <button onClick={() => updateConfig("allDay", !config.allDay)}
              className={`w-10 h-5 rounded-full transition-all relative ${config.allDay ? "bg-[#4285F4]" : "bg-[#333]"}`}>
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${config.allDay ? "left-[22px]" : "left-0.5"}`} />
            </button>
          </div>
          <Field label="Location (optional)"><SmartVariableInput value={config.location || ""} onChange={set("location")} placeholder="Room 4B / Zoom" /></Field>
          <Field label="Description (optional)"><SmartVariableInput value={config.description || ""} onChange={set("description")} placeholder="" /></Field>
          <Field label="Timezone"><input value={config.timeZone || "UTC"} onChange={(e) => updateConfig("timeZone", e.target.value)} className={inputCls} /></Field>
        </>
      )}

      {["createEvent", "updateEvent"].includes(op) && (
        <>
          <Field label="Attendees (comma-separated emails)"><SmartVariableInput value={config.attendees || ""} onChange={set("attendees")} placeholder="alice@example.com, bob@example.com" /></Field>
          <Field label="Reminder (minutes before, optional)">
            <input type="number" min="0" value={config.reminderMinutes ?? ""} onChange={(e) => updateConfig("reminderMinutes", e.target.value)} placeholder="10" className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Color ID (optional)"><input value={config.colorId || ""} onChange={(e) => updateConfig("colorId", e.target.value)} placeholder="1–11" className={inputCls} /></Field>
            <Field label="Notify Guests">
              <select value={config.sendUpdates || "none"} onChange={(e) => updateConfig("sendUpdates", e.target.value)} className={inputCls}>
                <option value="none">None</option>
                <option value="all">All guests</option>
                <option value="externalOnly">External only</option>
              </select>
            </Field>
          </div>
        </>
      )}

      {op === "createEvent" && (
        <>
          <Field label="Recurrence (RRULE, one per line, optional)" hint="e.g. RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR">
            <textarea value={config.recurrence || ""} onChange={(e) => updateConfig("recurrence", e.target.value)} rows={2} placeholder="RRULE:FREQ=DAILY;COUNT=5" className={inputCls} />
          </Field>
          <div className="flex items-center justify-between bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5">
            <span className="text-[11px] font-bold text-zinc-400">Add Google Meet link</span>
            <button onClick={() => updateConfig("addMeetLink", !config.addMeetLink)}
              className={`w-10 h-5 rounded-full transition-all relative ${config.addMeetLink ? "bg-[#4285F4]" : "bg-[#333]"}`}>
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${config.addMeetLink ? "left-[22px]" : "left-0.5"}`} />
            </button>
          </div>
        </>
      )}

      {op === "shareCalendar" && (
        <>
          <Field label="Share With (email)"><SmartVariableInput value={config.shareEmail || ""} onChange={set("shareEmail")} placeholder="teammate@example.com" /></Field>
          <Field label="Role">
            <select value={config.role || "reader"} onChange={(e) => updateConfig("role", e.target.value)} className={inputCls}>
              <option value="reader">See all event details (reader)</option>
              <option value="freeBusyReader">See free/busy only</option>
              <option value="writer">Make changes (writer)</option>
              <option value="owner">Make changes & manage sharing (owner)</option>
            </select>
          </Field>
        </>
      )}

      {op === "unshareCalendar" && (
        <Field label="ACL Rule ID" hint="From a List Access run"><SmartVariableInput value={config.ruleId || ""} onChange={set("ruleId")} placeholder="user:teammate@example.com" /></Field>
      )}

      {op === "freeBusy" && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="From (ISO)"><SmartVariableInput value={config.timeMin || ""} onChange={set("timeMin")} placeholder="2024-06-01T00:00:00Z" /></Field>
            <Field label="To (ISO)"><SmartVariableInput value={config.timeMax || ""} onChange={set("timeMax")} placeholder="2024-06-02T00:00:00Z" /></Field>
          </div>
          <Field label="Calendar IDs (comma-separated, optional)" hint="Blank = the Calendar ID above"><SmartVariableInput value={config.calendarIds || ""} onChange={set("calendarIds")} placeholder="primary, team@group.calendar.google.com" /></Field>
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
