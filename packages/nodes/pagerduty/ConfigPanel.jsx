import SmartVariableInput from "@/components/ui/SmartVariableInput";
import CredentialPicker from "@/components/ui/CredentialPicker";
import {
  List, FileText, Plus, Pencil, CheckCircle2, BellOff, AlarmClock, Layers,
  MessageSquare, MessagesSquare, UserPlus, Activity, ScrollText,
  Server, ServerCog, Trash2, ShieldAlert, Calendar, CalendarClock, CalendarPlus,
  PhoneCall, Users, User, Contact, UsersRound, Flag, Zap, CheckCheck,
} from "lucide-react";

const ACCENT = "#06AC38";

const GROUPS = [
  {
    title: "Incidents",
    ops: [
      { value: "listIncidents", label: "List Incidents", icon: List },
      { value: "getIncident", label: "Get Incident", icon: FileText },
      { value: "createIncident", label: "Create Incident", icon: Plus },
      { value: "updateIncident", label: "Update Incident", icon: Pencil },
      { value: "resolveIncident", label: "Resolve", icon: CheckCircle2 },
      { value: "acknowledgeIncident", label: "Acknowledge", icon: BellOff },
      { value: "snoozeIncident", label: "Snooze", icon: AlarmClock },
      { value: "mergeIncidents", label: "Merge", icon: Layers },
      { value: "addNote", label: "Add Note", icon: MessageSquare },
      { value: "listNotes", label: "List Notes", icon: MessagesSquare },
      { value: "addResponder", label: "Add Responder", icon: UserPlus },
      { value: "listAlerts", label: "List Alerts", icon: Activity },
      { value: "listLogEntries", label: "Log Entries", icon: ScrollText },
    ],
  },
  {
    title: "Services",
    ops: [
      { value: "listServices", label: "List Services", icon: Server },
      { value: "getService", label: "Get Service", icon: FileText },
      { value: "createService", label: "Create Service", icon: Plus },
      { value: "updateService", label: "Update Service", icon: ServerCog },
      { value: "deleteService", label: "Delete Service", icon: Trash2 },
    ],
  },
  {
    title: "Escalation & Schedules",
    ops: [
      { value: "listEscalationPolicies", label: "List Policies", icon: ShieldAlert },
      { value: "getEscalationPolicy", label: "Get Policy", icon: FileText },
      { value: "deleteEscalationPolicy", label: "Delete Policy", icon: Trash2 },
      { value: "listSchedules", label: "List Schedules", icon: Calendar },
      { value: "getSchedule", label: "Get Schedule", icon: CalendarClock },
      { value: "listOverrides", label: "List Overrides", icon: Calendar },
      { value: "createOverride", label: "Create Override", icon: CalendarPlus },
      { value: "listOnCalls", label: "On-Calls", icon: PhoneCall },
    ],
  },
  {
    title: "Users & Teams",
    ops: [
      { value: "listUsers", label: "List Users", icon: Users },
      { value: "getUser", label: "Get User", icon: User },
      { value: "getCurrentUser", label: "Current User", icon: User },
      { value: "listContactMethods", label: "Contact Methods", icon: Contact },
      { value: "listTeams", label: "List Teams", icon: UsersRound },
      { value: "getTeam", label: "Get Team", icon: FileText },
      { value: "listTeamMembers", label: "Team Members", icon: Users },
      { value: "listPriorities", label: "Priorities", icon: Flag },
    ],
  },
  {
    title: "Events API v2",
    ops: [
      { value: "triggerEvent", label: "Trigger Event", icon: Zap },
      { value: "acknowledgeEvent", label: "Ack Event", icon: BellOff },
      { value: "resolveEvent", label: "Resolve Event", icon: CheckCheck },
    ],
  },
];

const URGENCIES = ["high", "low"];
const SEVERITIES = ["critical", "error", "warning", "info"];
const STATUSES = ["triggered", "acknowledged", "resolved"];
const SERVICE_STATUSES = ["active", "warning", "critical", "maintenance", "disabled"];

const lbl = "text-[10px] font-bold text-zinc-500 uppercase tracking-widest";
const inputCls =
  "w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#06AC38]/40";

const INCIDENT_OPS = [
  "getIncident", "updateIncident", "resolveIncident", "acknowledgeIncident",
  "snoozeIncident", "mergeIncidents", "addNote", "listNotes", "addResponder",
  "listAlerts", "listLogEntries",
];
const FROM_OPS = [
  "createIncident", "updateIncident", "resolveIncident", "acknowledgeIncident",
  "snoozeIncident", "mergeIncidents", "addNote", "addResponder",
];

function Field({ label, hint, children }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className={lbl}>{label}</span>
        {hint && <span className="text-[9px] text-zinc-600">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

export default function PagerDutyNode({ config = {}, updateConfig }) {
  const op = config.operation || "listIncidents";
  const set = (k) => (v) => updateConfig(k, v);
  const show = (...ops) => ops.includes(op);

  const Var = ({ k, placeholder, multiline, def }) => (
    <SmartVariableInput
      value={config[k] ?? def ?? ""}
      onChange={set(k)}
      placeholder={placeholder}
      multiline={multiline}
      className={inputCls}
    />
  );

  const Pills = ({ k, items, def }) => (
    <div className="flex flex-wrap gap-1.5">
      {items.map((it) => {
        const active = (config[k] ?? def) === it;
        return (
          <button
            key={it}
            onClick={() => updateConfig(k, it)}
            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
              active
                ? "bg-[#06AC38]/10 border-[#06AC38]/40 text-[#2bd968]"
                : "bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]"
            }`}
          >
            {it}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-[#06AC38]/10 border border-[#06AC38]/25 flex items-center justify-center shrink-0">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="#06AC38">
            <path d="M16.8 2.4c-1.6-.5-3.2-.7-5.2-.7H2.4v9.1h9.1c1.9 0 3.5-.2 4.8-.7 2.5-.9 4-2.8 4-4 0-1.8-1.4-3.3-3.5-3.7zM2.4 14.3V21h3.3v-3.8h5.3c2.7 0 4.8-.6 6.3-1.8.3-.2.6-.5.8-.7l2.6 6.3h3.5L21 14.7c1.4-1.5 2.2-3.4 2.2-5.5 0-2.7-1.4-5-3.8-6.5C17.5.9 15.2.4 12.2.4H0v20.5h2.4V14.3z" />
          </svg>
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">PagerDuty</div>
          <div className="text-[11px] text-zinc-500">Incidents, on-call, alerts & events</div>
        </div>
      </div>

      <div>
        <span className={lbl}>Operation</span>
        <div className="flex flex-col gap-3 mt-2">
          {GROUPS.map((group) => (
            <div key={group.title}>
              <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">{group.title}</span>
              <div className="grid grid-cols-2 gap-2 mt-1.5">
                {group.ops.map((o) => {
                  const Icon = o.icon;
                  const active = op === o.value;
                  return (
                    <button
                      key={o.value}
                      onClick={() => updateConfig("operation", o.value)}
                      className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg border transition-all ${
                        active
                          ? "bg-[#06AC38]/10 border-[#06AC38]/40 text-[#2bd968]"
                          : "bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span className="text-[11px] font-semibold truncate">{o.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {INCIDENT_OPS.includes(op) && (
        <Field label="Incident ID" hint="required">
          <Var k="incidentId" placeholder="{{ $json.id }}" />
        </Field>
      )}

      {show("createIncident") && (
        <>
          <Field label="Title" hint="required">
            <Var k="title" placeholder="Production DB is down — {{ $json.service }}" />
          </Field>
          <Field label="Service ID" hint="required">
            <Var k="serviceId" placeholder="PXXXXXX" />
          </Field>
          <Field label="Urgency">
            <Pills k="urgency" items={URGENCIES} def="high" />
          </Field>
          <Field label="Escalation Policy ID" hint="optional">
            <Var k="escalationPolicyId" placeholder="PXXXXXX" />
          </Field>
          <Field label="Priority ID" hint="optional">
            <Var k="priorityId" placeholder="PXXXXXX" />
          </Field>
          <Field label="Assignee User ID" hint="optional">
            <Var k="assigneeId" placeholder="PXXXXXX" />
          </Field>
          <Field label="Incident Key" hint="dedup, optional">
            <Var k="incidentKey" placeholder="{{ $json.fingerprint }}" />
          </Field>
          <Field label="Body" hint="optional">
            <Var k="body" placeholder="Error: {{ $json.error }}" multiline />
          </Field>
        </>
      )}

      {show("updateIncident") && (
        <>
          <Field label="Title" hint="optional">
            <Var k="title" placeholder="New title" />
          </Field>
          <Field label="Status" hint="optional">
            <Pills k="status" items={STATUSES} />
          </Field>
          <Field label="Urgency" hint="optional">
            <Pills k="urgency" items={URGENCIES} />
          </Field>
          <Field label="Priority ID" hint="optional">
            <Var k="priorityId" placeholder="PXXXXXX" />
          </Field>
        </>
      )}

      {show("snoozeIncident") && (
        <Field label="Duration (seconds)" hint="default 3600">
          <Var k="duration" placeholder="3600" def="3600" />
        </Field>
      )}

      {show("mergeIncidents") && (
        <Field label="Source Incident IDs" hint="comma-separated, required">
          <Var k="sourceIncidentIds" placeholder="PABC123, PDEF456" />
        </Field>
      )}

      {show("addNote") && (
        <Field label="Note" hint="required">
          <Var k="content" placeholder="Root cause: {{ $json.cause }}" multiline />
        </Field>
      )}

      {show("addResponder") && (
        <>
          <Field label="Responder User ID" hint="required">
            <Var k="assigneeId" placeholder="PXXXXXX" />
          </Field>
          <Field label="Requester User ID" hint="optional">
            <Var k="requesterId" placeholder="PXXXXXX" />
          </Field>
          <Field label="Message" hint="optional">
            <Var k="message" placeholder="Please help with this incident." multiline />
          </Field>
        </>
      )}

      {show("getService", "updateService", "deleteService") && (
        <Field label="Service ID" hint="required">
          <Var k="serviceId" placeholder="PXXXXXX" />
        </Field>
      )}

      {show("createService") && (
        <>
          <Field label="Name" hint="required">
            <Var k="name" placeholder="API Production" />
          </Field>
          <Field label="Escalation Policy ID" hint="required">
            <Var k="escalationPolicyId" placeholder="PXXXXXX" />
          </Field>
          <Field label="Description" hint="optional">
            <Var k="description" placeholder="Customer-facing API service" multiline />
          </Field>
        </>
      )}

      {show("updateService") && (
        <>
          <Field label="Name" hint="optional">
            <Var k="name" placeholder="New name" />
          </Field>
          <Field label="Status" hint="optional">
            <Pills k="status" items={SERVICE_STATUSES} />
          </Field>
          <Field label="Escalation Policy ID" hint="optional">
            <Var k="escalationPolicyId" placeholder="PXXXXXX" />
          </Field>
          <Field label="Description" hint="optional">
            <Var k="description" placeholder="Updated description" multiline />
          </Field>
        </>
      )}

      {show("getEscalationPolicy", "deleteEscalationPolicy") && (
        <Field label="Escalation Policy ID" hint="required">
          <Var k="escalationPolicyId" placeholder="PXXXXXX" />
        </Field>
      )}

      {show("getSchedule", "listOverrides", "createOverride") && (
        <Field label="Schedule ID" hint="required">
          <Var k="scheduleId" placeholder="PXXXXXX" />
        </Field>
      )}

      {show("createOverride") && (
        <Field label="Override User ID" hint="required">
          <Var k="assigneeId" placeholder="PXXXXXX" />
        </Field>
      )}

      {show("getUser", "listContactMethods") && (
        <Field label="User ID" hint="required">
          <Var k="userId" placeholder="PXXXXXX" />
        </Field>
      )}

      {show("getTeam", "listTeamMembers") && (
        <Field label="Team ID" hint="required">
          <Var k="teamId" placeholder="PXXXXXX" />
        </Field>
      )}

      {show("listOnCalls") && (
        <>
          <Field label="Escalation Policy ID" hint="optional filter">
            <Var k="escalationPolicyId" placeholder="PXXXXXX" />
          </Field>
          <Field label="Schedule ID" hint="optional filter">
            <Var k="scheduleId" placeholder="PXXXXXX" />
          </Field>
          <Field label="User ID" hint="optional filter">
            <Var k="userId" placeholder="PXXXXXX" />
          </Field>
        </>
      )}

      {show("listIncidents") && (
        <>
          <Field label="Status Filter" hint="comma-separated, optional">
            <Var k="statuses" placeholder="triggered, acknowledged" />
          </Field>
          <Field label="Service ID Filter" hint="optional">
            <Var k="serviceId" placeholder="PXXXXXX" />
          </Field>
          <Field label="Urgency" hint="optional">
            <Pills k="urgency" items={URGENCIES} />
          </Field>
        </>
      )}

      {show("listServices", "listEscalationPolicies", "listSchedules", "listUsers", "listTeams") && (
        <Field label="Search Query" hint="optional">
          <Var k="query" placeholder="search text" />
        </Field>
      )}

      {show("listOverrides", "createOverride", "getSchedule", "listIncidents", "listOnCalls") && (
        <div className="grid grid-cols-2 gap-2">
          <Field label="Since" hint="ISO time">
            <Var k="since" placeholder="2026-06-30T00:00:00Z" />
          </Field>
          <Field label="Until" hint="ISO time">
            <Var k="until" placeholder="2026-07-01T00:00:00Z" />
          </Field>
        </div>
      )}

      {show("triggerEvent", "resolveEvent", "acknowledgeEvent") && (
        <Field label="Routing Key" hint="integration key, required">
          <Var k="routingKey" placeholder="R0XXXXXXXXXXXXXXXXXXXXXX" />
        </Field>
      )}

      {show("triggerEvent") && (
        <>
          <Field label="Summary" hint="required">
            <Var k="summary" placeholder="Disk usage at 95% on {{ $json.host }}" />
          </Field>
          <Field label="Source" hint="optional">
            <Var k="source" placeholder="{{ $json.host }}" def="blinkbox" />
          </Field>
          <Field label="Severity">
            <Pills k="severity" items={SEVERITIES} def="critical" />
          </Field>
          <Field label="Dedup Key" hint="optional">
            <Var k="dedupKey" placeholder="{{ $json.fingerprint }}" />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Component" hint="optional">
              <Var k="component" placeholder="database" />
            </Field>
            <Field label="Class" hint="optional">
              <Var k="eventClass" placeholder="disk" />
            </Field>
          </div>
        </>
      )}

      {show("resolveEvent", "acknowledgeEvent") && (
        <Field label="Dedup Key" hint="required">
          <Var k="dedupKey" placeholder="{{ $json.dedup_key }}" />
        </Field>
      )}

      {show(
        "listIncidents", "listNotes", "listAlerts", "listLogEntries", "listServices",
        "listEscalationPolicies", "listSchedules", "listOnCalls", "listUsers", "listTeams", "listTeamMembers"
      ) && (
        <Field label="Limit" hint="default 25">
          <Var k="limit" placeholder="25" def="25" />
        </Field>
      )}

      {FROM_OPS.includes(op) && (
        <Field label="From Email" hint="acting user, required by PagerDuty">
          <Var k="fromEmail" placeholder="you@company.com" />
        </Field>
      )}

      {!show("triggerEvent", "resolveEvent", "acknowledgeEvent") && (
        <CredentialPicker
          provider="pagerduty"
          value={config.credentialId || ""}
          onChange={set("credentialId")}
          accentColor={ACCENT}
          label="PagerDuty API Key"
          placeholder="Select PagerDuty credential..."
        />
      )}

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        Returns: <span className="text-zinc-300">id, status, html_url, summary, created_at</span>
      </div>
    </div>
  );
}
