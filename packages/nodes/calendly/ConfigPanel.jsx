import {
  User, Building2, Users, UserCheck, UserMinus, Mail, UserPlus, UserX,
  CalendarClock, Calendar, Clock, Link2, CalendarDays, CalendarX, List,
  UserSearch, EyeOff, CalendarCheck, Timer, Webhook, Plus, Trash2,
  FileText, FormInput, Inbox, Layers, ShieldOff,
} from "lucide-react";
import SmartVariableInput from "@/components/ui/SmartVariableInput";
import CredentialPicker from "@/components/ui/CredentialPicker";

const ACCENT = "#006BFF";

const GROUPS = [
  {
    title: "Users & Organization",
    ops: [
      { value: "getUser", label: "Get User", icon: User },
      { value: "getCurrentOrganization", label: "Get Org", icon: Building2 },
      { value: "listOrganizationMemberships", label: "List Members", icon: Users },
      { value: "getOrganizationMembership", label: "Get Member", icon: UserCheck },
      { value: "removeOrganizationMembership", label: "Remove Member", icon: UserMinus },
      { value: "listOrganizationInvitations", label: "List Invites", icon: Mail },
      { value: "inviteUser", label: "Invite User", icon: UserPlus },
      { value: "revokeInvitation", label: "Revoke Invite", icon: UserX },
    ],
  },
  {
    title: "Event Types",
    ops: [
      { value: "listEventTypes", label: "List Event Types", icon: CalendarClock },
      { value: "getEventType", label: "Get Event Type", icon: Calendar },
      { value: "getEventTypeAvailableTimes", label: "Available Times", icon: Clock },
      { value: "createSchedulingLink", label: "Single-use Link", icon: Link2 },
    ],
  },
  {
    title: "Scheduled Events",
    ops: [
      { value: "listEvents", label: "List Events", icon: CalendarDays },
      { value: "getEvent", label: "Get Event", icon: Calendar },
      { value: "cancelEvent", label: "Cancel Event", icon: CalendarX },
      { value: "listInvitees", label: "List Invitees", icon: List },
      { value: "getInvitee", label: "Get Invitee", icon: UserSearch },
      { value: "createInviteeNoShow", label: "Mark No-Show", icon: EyeOff },
      { value: "deleteInviteeNoShow", label: "Undo No-Show", icon: CalendarCheck },
    ],
  },
  {
    title: "Availability",
    ops: [
      { value: "listUserAvailabilitySchedules", label: "List Schedules", icon: CalendarClock },
      { value: "getAvailabilitySchedule", label: "Get Schedule", icon: Calendar },
      { value: "getUserBusyTimes", label: "Busy Times", icon: Timer },
    ],
  },
  {
    title: "Webhooks",
    ops: [
      { value: "listWebhooks", label: "List Webhooks", icon: Webhook },
      { value: "getWebhook", label: "Get Webhook", icon: Webhook },
      { value: "createWebhook", label: "Create Webhook", icon: Plus },
      { value: "deleteWebhook", label: "Delete Webhook", icon: Trash2 },
    ],
  },
  {
    title: "Routing Forms & Groups",
    ops: [
      { value: "listRoutingForms", label: "List Forms", icon: FormInput },
      { value: "getRoutingForm", label: "Get Form", icon: FileText },
      { value: "listRoutingFormSubmissions", label: "Form Submissions", icon: Inbox },
      { value: "listGroups", label: "List Groups", icon: Layers },
      { value: "getGroup", label: "Get Group", icon: Layers },
      { value: "deleteInviteeData", label: "Delete Invitee Data", icon: ShieldOff },
    ],
  },
];

const lbl = "text-[10px] font-bold text-zinc-500 uppercase tracking-widest";
const inputCls =
  "w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#006BFF]/40";

export default function CalendlyNode({ config = {}, updateConfig }) {
  const op = config.operation || "listEvents";
  const set = (k) => (v) => updateConfig(k, v);
  const show = (...ops) => ops.includes(op);

  const Field = ({ label, hint, children }) => (
    <div className="flex flex-col gap-2">
      <label className={lbl}>{label}</label>
      {children}
      {hint && <span className="text-[10px] text-zinc-600">{hint}</span>}
    </div>
  );

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
    <div className="grid grid-cols-3 gap-1.5">
      {items.map((v) => {
        const active = (config[k] ?? def) === v;
        return (
          <button
            key={v}
            onClick={() => updateConfig(k, v)}
            className={`py-1.5 rounded-lg border text-[10px] font-bold capitalize transition-all ${
              active ? "text-[#006BFF] border-[#006BFF]/40 bg-[#006BFF]/10" : "bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]"
            }`}
          >
            {v}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="flex flex-col gap-5 w-full">
      <div className="flex items-center gap-3 p-4 bg-[#006BFF]/5 border border-[#006BFF]/20 rounded-xl">
        <div className="w-8 h-8 rounded-lg bg-[#006BFF]/10 border border-[#006BFF]/25 flex items-center justify-center shrink-0">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill={ACCENT}>
            <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11zm-7-9c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm1 4.41V17h-2v-1.59l-1.41-1.41 1.41-1.41L12 13.17l.59-.58 1.41 1.41-1 1z" />
          </svg>
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-[#006BFF]">Calendly</span>
          <span className="text-[10px] text-zinc-500">Events, invitees, availability & webhooks</span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <span className={lbl}>Operation</span>
        {GROUPS.map((group) => (
          <div key={group.title} className="flex flex-col gap-2">
            <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">{group.title}</span>
            <div className="grid grid-cols-2 gap-2">
              {group.ops.map((o) => {
                const Icon = o.icon;
                const active = op === o.value;
                return (
                  <button
                    key={o.value}
                    onClick={() => updateConfig("operation", o.value)}
                    style={active ? { backgroundColor: `${ACCENT}1a`, borderColor: `${ACCENT}66`, color: ACCENT } : undefined}
                    className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border transition-all ${
                      active ? "" : "bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]"
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

      {show("getEvent", "cancelEvent", "listInvitees") && (
        <Field label="Event URI" hint="Full URI or UUID of the scheduled event">
          <Var k="eventUri" placeholder="https://api.calendly.com/scheduled_events/{{n1.uuid}}" />
        </Field>
      )}

      {show("getInvitee") && (
        <>
          <Field label="Event URI">
            <Var k="eventUri" placeholder="{{n1.event}}" />
          </Field>
          <Field label="Invitee UUID / URI">
            <Var k="inviteeUuid" placeholder="{{n1.inviteeUuid}}" />
          </Field>
        </>
      )}

      {show("cancelEvent") && (
        <Field label="Cancellation Reason">
          <Var k="reason" placeholder="Rescheduling requested" multiline />
        </Field>
      )}

      {show("listInvitees") && (
        <Field label="Invitee Status">
          <Pills k="status" items={["active", "canceled"]} def="active" />
        </Field>
      )}

      {show("getEventType", "getEventTypeAvailableTimes", "createSchedulingLink") && (
        <Field label="Event Type URI">
          <Var k="eventTypeUri" placeholder="https://api.calendly.com/event_types/{{n1.uuid}}" />
        </Field>
      )}

      {show("createSchedulingLink") && (
        <Field label="Max Event Count" hint="Uses of this single-use link">
          <Var k="maxEventCount" placeholder="1" def="1" />
        </Field>
      )}

      {show("listEventTypes", "listEvents") && (
        <Field label="Status Filter">
          <Pills k="status" items={["active", "canceled"]} def="" />
        </Field>
      )}

      {show("getEventTypeAvailableTimes", "getUserBusyTimes") && (
        <>
          <Field label="Start Time (ISO)">
            <Var k="startTime" placeholder="2026-07-01T00:00:00Z" />
          </Field>
          <Field label="End Time (ISO)">
            <Var k="endTime" placeholder="2026-07-07T00:00:00Z" />
          </Field>
        </>
      )}

      {show("listEvents") && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Min Start Time (ISO)">
              <Var k="minStartTime" placeholder="2026-07-01T00:00:00Z" />
            </Field>
            <Field label="Max Start Time (ISO)">
              <Var k="maxStartTime" placeholder="2026-07-31T00:00:00Z" />
            </Field>
          </div>
          <Field label="Invitee Email (optional)">
            <Var k="inviteeEmail" placeholder="{{n1.email}}" />
          </Field>
        </>
      )}

      {show("listOrganizationMemberships") && (
        <Field label="Filter by Email (optional)">
          <Var k="email" placeholder="{{n1.email}}" />
        </Field>
      )}

      {show("getOrganizationMembership", "removeOrganizationMembership") && (
        <Field label="Membership URI">
          <Var k="membershipUri" placeholder="{{n1.uri}}" />
        </Field>
      )}

      {show("inviteUser") && (
        <Field label="Invitee Email">
          <Var k="email" placeholder="teammate@company.com" />
        </Field>
      )}

      {show("revokeInvitation") && (
        <Field label="Invitation URI">
          <Var k="invitationUri" placeholder="{{n1.uri}}" />
        </Field>
      )}

      {show("createInviteeNoShow") && (
        <Field label="Invitee URI">
          <Var k="inviteeUri" placeholder="{{n1.uri}}" />
        </Field>
      )}

      {show("deleteInviteeNoShow") && (
        <Field label="No-Show URI">
          <Var k="noShowUri" placeholder="{{n1.uri}}" />
        </Field>
      )}

      {show("getAvailabilitySchedule") && (
        <Field label="Schedule URI">
          <Var k="scheduleUri" placeholder="{{n1.uri}}" />
        </Field>
      )}

      {show("createWebhook") && (
        <>
          <Field label="Callback URL" hint="Must be an https:// endpoint">
            <Var k="url" placeholder="https://your-app.com/webhooks/calendly" />
          </Field>
          <Field label="Events (comma-sep)" hint="e.g. invitee.created, invitee.canceled">
            <Var k="events" placeholder="invitee.created, invitee.canceled" />
          </Field>
          <Field label="Scope">
            <Pills k="scope" items={["user", "organization"]} def="user" />
          </Field>
          <Field label="Signing Key (optional)">
            <Var k="signingKey" placeholder="whsec_..." />
          </Field>
        </>
      )}

      {show("getWebhook", "deleteWebhook") && (
        <Field label="Webhook URI">
          <Var k="webhookUri" placeholder="{{n1.uri}}" />
        </Field>
      )}

      {show("listWebhooks") && (
        <Field label="Scope">
          <Pills k="scope" items={["user", "organization"]} def="user" />
        </Field>
      )}

      {show("getRoutingForm", "listRoutingFormSubmissions") && (
        <Field label="Routing Form URI">
          <Var k="routingFormUri" placeholder="{{n1.uri}}" />
        </Field>
      )}

      {show("getGroup") && (
        <Field label="Group URI">
          <Var k="groupUri" placeholder="{{n1.uri}}" />
        </Field>
      )}

      {show("deleteInviteeData") && (
        <Field label="Invitee Emails (comma-sep)" hint="GDPR deletion request">
          <Var k="emails" placeholder="{{n1.email}}" />
        </Field>
      )}

      {show("getUser", "listEventTypes", "getUserBusyTimes", "listUserAvailabilitySchedules") && (
        <Field label="User URI (optional)" hint="Defaults to the authenticated user">
          <Var k="userUri" placeholder="{{n1.userUri}}" />
        </Field>
      )}

      {show(
        "listOrganizationMemberships", "listOrganizationInvitations", "listEventTypes", "listEvents",
        "listInvitees", "listWebhooks", "listRoutingForms", "listRoutingFormSubmissions", "listGroups",
      ) && (
        <Field label="Count" hint="Max 100 per page">
          <Var k="count" placeholder="20" def="20" />
        </Field>
      )}

      <CredentialPicker
        provider="calendly"
        value={config.credentialId || ""}
        onChange={set("credentialId")}
        accentColor={ACCENT}
        label="Calendly Access Token"
        placeholder="Select Calendly credential..."
      />
    </div>
  );
}
