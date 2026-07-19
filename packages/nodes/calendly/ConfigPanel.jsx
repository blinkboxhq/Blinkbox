import imgCalendly from './logo.svg';
import {
  User, Building2, Users, UserCheck, UserMinus, Mail, UserPlus, UserX,
  CalendarClock, Calendar, Clock, Link2, CalendarDays, CalendarX, List,
  UserSearch, EyeOff, CalendarCheck, Timer, Webhook, Plus, Trash2,
  FileText, FormInput, Inbox, Layers, ShieldOff,
} from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';
import CredentialPicker from '@/components/ui/CredentialPicker';
import {
  ConfigSection, ConfigLabel, ConfigHeader, ConfigSelect, ConfigPills,
} from '@/components/ui/ConfigKit';

const ACCENT = '#4d7cff';

const OPERATIONS = [
  { value: 'getUser', label: 'Get User', icon: User, group: 'Users & Organization' },
  { value: 'getCurrentOrganization', label: 'Get Org', icon: Building2, group: 'Users & Organization' },
  { value: 'listOrganizationMemberships', label: 'List Members', icon: Users, group: 'Users & Organization' },
  { value: 'getOrganizationMembership', label: 'Get Member', icon: UserCheck, group: 'Users & Organization' },
  { value: 'removeOrganizationMembership', label: 'Remove Member', icon: UserMinus, group: 'Users & Organization' },
  { value: 'listOrganizationInvitations', label: 'List Invites', icon: Mail, group: 'Users & Organization' },
  { value: 'inviteUser', label: 'Invite User', icon: UserPlus, group: 'Users & Organization' },
  { value: 'revokeInvitation', label: 'Revoke Invite', icon: UserX, group: 'Users & Organization' },

  { value: 'listEventTypes', label: 'List Event Types', icon: CalendarClock, group: 'Event Types' },
  { value: 'getEventType', label: 'Get Event Type', icon: Calendar, group: 'Event Types' },
  { value: 'getEventTypeAvailableTimes', label: 'Available Times', icon: Clock, group: 'Event Types' },
  { value: 'createSchedulingLink', label: 'Single-use Link', icon: Link2, group: 'Event Types' },

  { value: 'listEvents', label: 'List Events', icon: CalendarDays, group: 'Scheduled Events' },
  { value: 'getEvent', label: 'Get Event', icon: Calendar, group: 'Scheduled Events' },
  { value: 'cancelEvent', label: 'Cancel Event', icon: CalendarX, group: 'Scheduled Events' },
  { value: 'listInvitees', label: 'List Invitees', icon: List, group: 'Scheduled Events' },
  { value: 'getInvitee', label: 'Get Invitee', icon: UserSearch, group: 'Scheduled Events' },
  { value: 'createInviteeNoShow', label: 'Mark No-Show', icon: EyeOff, group: 'Scheduled Events' },
  { value: 'deleteInviteeNoShow', label: 'Undo No-Show', icon: CalendarCheck, group: 'Scheduled Events' },

  { value: 'listUserAvailabilitySchedules', label: 'List Schedules', icon: CalendarClock, group: 'Availability' },
  { value: 'getAvailabilitySchedule', label: 'Get Schedule', icon: Calendar, group: 'Availability' },
  { value: 'getUserBusyTimes', label: 'Busy Times', icon: Timer, group: 'Availability' },

  { value: 'listWebhooks', label: 'List Webhooks', icon: Webhook, group: 'Webhooks' },
  { value: 'getWebhook', label: 'Get Webhook', icon: Webhook, group: 'Webhooks' },
  { value: 'createWebhook', label: 'Create Webhook', icon: Plus, group: 'Webhooks' },
  { value: 'deleteWebhook', label: 'Delete Webhook', icon: Trash2, group: 'Webhooks' },

  { value: 'listRoutingForms', label: 'List Forms', icon: FormInput, group: 'Routing Forms & Groups' },
  { value: 'getRoutingForm', label: 'Get Form', icon: FileText, group: 'Routing Forms & Groups' },
  { value: 'listRoutingFormSubmissions', label: 'Form Submissions', icon: Inbox, group: 'Routing Forms & Groups' },
  { value: 'listGroups', label: 'List Groups', icon: Layers, group: 'Routing Forms & Groups' },
  { value: 'getGroup', label: 'Get Group', icon: Layers, group: 'Routing Forms & Groups' },
  { value: 'deleteInviteeData', label: 'Delete Invitee Data', icon: ShieldOff, group: 'Routing Forms & Groups' },
];

function Field({ label, optional, hint, children }) {
  return (
    <div className="flex flex-col">
      {label && (
        <ConfigLabel>
          {label}{optional && <span className="text-neutral-700 normal-case tracking-normal"> (optional)</span>}
        </ConfigLabel>
      )}
      {children}
      {hint && <p className="text-[9px] text-neutral-600 mt-1.5 font-mono tracking-wide leading-relaxed">{hint}</p>}
    </div>
  );
}

export default function CalendlyNode({ config = {}, updateConfig, nodeId }) {
  const op = config.operation || 'listEvents';
  const currentOp = OPERATIONS.find((o) => o.value === op);
  const show = (...ops) => ops.includes(op);

  const text = (label, key, opts = {}) => (
    <Field label={label} optional={opts.optional} hint={opts.hint}>
      <SmartVariableInput
        value={config[key] ?? opts.def ?? ''}
        onChange={(val) => updateConfig(key, val)}
        placeholder={opts.placeholder || ''}
        multiline={opts.multiline}
        nodeId={nodeId}
      />
    </Field>
  );

  return (
    <ConfigSection className="gap-5">
      <ConfigHeader logoUrl={imgCalendly} title="Calendly" subtitle={currentOp?.label || 'Events, invitees, availability & webhooks'} />

      <ConfigSelect
        label="Operation"
        value={op}
        onChange={(val) => updateConfig('operation', val)}
        options={OPERATIONS}
        accentColor={ACCENT}
      />

      {show('getEvent', 'cancelEvent', 'listInvitees') &&
        text('Event URI', 'eventUri', { hint: 'Full URI or UUID of the scheduled event', placeholder: 'https://api.calendly.com/scheduled_events/{{n1.uuid}}' })}

      {show('getInvitee') && (
        <>
          {text('Event URI', 'eventUri', { placeholder: '{{n1.event}}' })}
          {text('Invitee UUID / URI', 'inviteeUuid', { placeholder: '{{n1.inviteeUuid}}' })}
        </>
      )}

      {show('cancelEvent') && text('Cancellation Reason', 'reason', { placeholder: 'Rescheduling requested', multiline: true })}

      {show('listInvitees') && (
        <Field label="Invitee Status">
          <ConfigPills
            value={config.status ?? 'active'}
            onChange={(val) => updateConfig('status', val)}
            options={[{ value: 'active', label: 'active' }, { value: 'canceled', label: 'canceled' }]}
            accentColor={ACCENT}
          />
        </Field>
      )}

      {show('getEventType', 'getEventTypeAvailableTimes', 'createSchedulingLink') &&
        text('Event Type URI', 'eventTypeUri', { placeholder: 'https://api.calendly.com/event_types/{{n1.uuid}}' })}

      {show('createSchedulingLink') &&
        text('Max Event Count', 'maxEventCount', { def: '1', hint: 'Uses of this single-use link', placeholder: '1' })}

      {show('listEventTypes', 'listEvents') && (
        <Field label="Status Filter">
          <ConfigPills
            value={config.status ?? ''}
            onChange={(val) => updateConfig('status', val)}
            options={[{ value: 'active', label: 'active' }, { value: 'canceled', label: 'canceled' }]}
            accentColor={ACCENT}
          />
        </Field>
      )}

      {show('getEventTypeAvailableTimes', 'getUserBusyTimes') && (
        <>
          {text('Start Time (ISO)', 'startTime', { placeholder: '2026-07-01T00:00:00Z' })}
          {text('End Time (ISO)', 'endTime', { placeholder: '2026-07-07T00:00:00Z' })}
        </>
      )}

      {show('listEvents') && (
        <>
          <div className="flex gap-3">
            <div className="flex-1">{text('Min Start Time (ISO)', 'minStartTime', { placeholder: '2026-07-01T00:00:00Z' })}</div>
            <div className="flex-1">{text('Max Start Time (ISO)', 'maxStartTime', { placeholder: '2026-07-31T00:00:00Z' })}</div>
          </div>
          {text('Invitee Email', 'inviteeEmail', { optional: true, placeholder: '{{n1.email}}' })}
        </>
      )}

      {show('listOrganizationMemberships') &&
        text('Filter by Email', 'email', { optional: true, placeholder: '{{n1.email}}' })}

      {show('getOrganizationMembership', 'removeOrganizationMembership') &&
        text('Membership URI', 'membershipUri', { placeholder: '{{n1.uri}}' })}

      {show('inviteUser') &&
        text('Invitee Email', 'email', { placeholder: 'teammate@company.com' })}

      {show('revokeInvitation') &&
        text('Invitation URI', 'invitationUri', { placeholder: '{{n1.uri}}' })}

      {show('createInviteeNoShow') &&
        text('Invitee URI', 'inviteeUri', { placeholder: '{{n1.uri}}' })}

      {show('deleteInviteeNoShow') &&
        text('No-Show URI', 'noShowUri', { placeholder: '{{n1.uri}}' })}

      {show('getAvailabilitySchedule') &&
        text('Schedule URI', 'scheduleUri', { placeholder: '{{n1.uri}}' })}

      {show('createWebhook') && (
        <>
          {text('Callback URL', 'url', { hint: 'Must be an https:// endpoint', placeholder: 'https://your-app.com/webhooks/calendly' })}
          {text('Events (comma-sep)', 'events', { hint: 'e.g. invitee.created, invitee.canceled', placeholder: 'invitee.created, invitee.canceled' })}
          <Field label="Scope">
            <ConfigPills
              value={config.scope ?? 'user'}
              onChange={(val) => updateConfig('scope', val)}
              options={[{ value: 'user', label: 'user' }, { value: 'organization', label: 'organization' }]}
              accentColor={ACCENT}
            />
          </Field>
          {text('Signing Key', 'signingKey', { optional: true, placeholder: 'whsec_...' })}
        </>
      )}

      {show('getWebhook', 'deleteWebhook') &&
        text('Webhook URI', 'webhookUri', { placeholder: '{{n1.uri}}' })}

      {show('listWebhooks') && (
        <Field label="Scope">
          <ConfigPills
            value={config.scope ?? 'user'}
            onChange={(val) => updateConfig('scope', val)}
            options={[{ value: 'user', label: 'user' }, { value: 'organization', label: 'organization' }]}
            accentColor={ACCENT}
          />
        </Field>
      )}

      {show('getRoutingForm', 'listRoutingFormSubmissions') &&
        text('Routing Form URI', 'routingFormUri', { placeholder: '{{n1.uri}}' })}

      {show('getGroup') &&
        text('Group URI', 'groupUri', { placeholder: '{{n1.uri}}' })}

      {show('deleteInviteeData') &&
        text('Invitee Emails (comma-sep)', 'emails', { hint: 'GDPR deletion request', placeholder: '{{n1.email}}' })}

      {show('getUser', 'listEventTypes', 'getUserBusyTimes', 'listUserAvailabilitySchedules') &&
        text('User URI', 'userUri', { optional: true, hint: 'Defaults to the authenticated user', placeholder: '{{n1.userUri}}' })}

      {show(
        'listOrganizationMemberships', 'listOrganizationInvitations', 'listEventTypes', 'listEvents',
        'listInvitees', 'listWebhooks', 'listRoutingForms', 'listRoutingFormSubmissions', 'listGroups',
      ) &&
        text('Count', 'count', { def: '20', hint: 'Max 100 per page', placeholder: '20' })}

      <CredentialPicker
        value={config.credentialId || ''}
        onChange={(id) => updateConfig('credentialId', id)}
        accentColor="blue"
        label="Calendly Access Token"
        placeholder="Select Calendly credential..."
      />
    </ConfigSection>
  );
}
