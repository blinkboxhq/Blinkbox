import { useEffect } from 'react';
import imgCalendar from './logo.svg';
import {
  CalendarDays, CalendarPlus, CalendarClock, CalendarX2, Eye, Plus, Pencil, Trash2,
  Zap, MoveRight, Check, Repeat, Download, Settings2, CalendarRange, Eraser,
  BookOpen, BookmarkMinus, Users, UserPlus, UserMinus, CalendarSearch, Palette,
} from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';
import CredentialPicker from '@/components/ui/CredentialPicker';
import OAuthConnectButton from '@/components/ui/OAuthConnectButton';
import {
  ConfigSection, ConfigLabel, ConfigHeader, ConfigSelect, ConfigInput, ConfigTextarea,
  ConfigPills, ConfigToggleRow,
} from '@/components/ui/ConfigKit';

const ACCENT = '#4d7cff';

export const OPERATIONS = [
  { value: 'listEvents',    label: 'List Events',    icon: CalendarDays,  group: 'Events' },
  { value: 'getEvent',      label: 'Get Event',      icon: Eye,           group: 'Events' },
  { value: 'createEvent',   label: 'Create Event',   icon: CalendarPlus,  group: 'Events' },
  { value: 'updateEvent',   label: 'Update Event',   icon: CalendarClock, group: 'Events' },
  { value: 'deleteEvent',   label: 'Delete Event',   icon: CalendarX2,    group: 'Events' },
  { value: 'quickAddEvent', label: 'Quick Add',      icon: Zap,           group: 'Events' },
  { value: 'moveEvent',     label: 'Move Event',     icon: MoveRight,     group: 'Events' },
  { value: 'respondToEvent',label: 'RSVP',           icon: Check,         group: 'Events' },
  { value: 'listInstances', label: 'List Instances', icon: Repeat,        group: 'Events' },
  { value: 'importEvent',   label: 'Import Event',   icon: Download,      group: 'Events' },
  { value: 'listCalendars', label: 'List Calendars', icon: CalendarRange, group: 'Calendars' },
  { value: 'getCalendar',   label: 'Get Calendar',   icon: Eye,           group: 'Calendars' },
  { value: 'createCalendar',label: 'Create Calendar',icon: Plus,          group: 'Calendars' },
  { value: 'updateCalendar',label: 'Update Calendar',icon: Settings2,     group: 'Calendars' },
  { value: 'deleteCalendar',label: 'Delete Calendar',icon: Trash2,        group: 'Calendars' },
  { value: 'clearCalendar', label: 'Clear Calendar', icon: Eraser,        group: 'Calendars' },
  { value: 'addCalendarToList',      label: 'Subscribe',   icon: BookOpen,       group: 'Calendars' },
  { value: 'removeCalendarFromList', label: 'Unsubscribe', icon: BookmarkMinus,  group: 'Calendars' },
  { value: 'listAcl',        label: 'List Access',  icon: Users,          group: 'Sharing & Availability' },
  { value: 'shareCalendar',  label: 'Share',        icon: UserPlus,       group: 'Sharing & Availability' },
  { value: 'unshareCalendar',label: 'Unshare',      icon: UserMinus,      group: 'Sharing & Availability' },
  { value: 'freeBusy',       label: 'Free/Busy',    icon: CalendarSearch, group: 'Sharing & Availability' },
  { value: 'getColors',      label: 'Get Colors',   icon: Palette,        group: 'Sharing & Availability' },
];

const RESPONSE = [
  { value: 'accepted', label: 'Accept' },
  { value: 'declined', label: 'Decline' },
  { value: 'tentative', label: 'Tentative' },
];

const ROLE_OPTIONS = [
  { value: 'reader', label: 'See all event details (reader)' },
  { value: 'freeBusyReader', label: 'See free/busy only' },
  { value: 'writer', label: 'Make changes (writer)' },
  { value: 'owner', label: 'Make changes & manage sharing (owner)' },
];

const SEND_UPDATES = [
  { value: 'none', label: 'None' },
  { value: 'all', label: 'All guests' },
  { value: 'externalOnly', label: 'External only' },
];

const NO_CALENDAR_ID_OPS = ['listCalendars', 'createCalendar', 'getColors'];

function CalIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M19 4h-1V2h-2v2H8V2H6v2H5C3.9 4 3 4.9 3 6v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11zm0-13H5V6h14v1z" />
    </svg>
  );
}

function Field({ label, hint, children }) {
  return (
    <div className="flex flex-col">
      {label && <ConfigLabel>{label}</ConfigLabel>}
      {children}
      {hint && <p className="text-[9px] text-neutral-600 mt-1.5 font-mono tracking-wide leading-relaxed">{hint}</p>}
    </div>
  );
}

export default function GoogleCalendarNode({ config = {}, updateConfig, nodeId }) {
  const LABEL_TO_OP = Object.fromEntries(OPERATIONS.map((o) => [o.label, o.value]));
  const op = LABEL_TO_OP[config.selectedAction] || config.operation || 'listEvents';

  useEffect(() => {
    if (op && op !== config.operation) updateConfig('operation', op);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [op]);
  const currentOp = OPERATIONS.find((o) => o.value === op);
  const set = (k) => (v) => updateConfig(k, v);
  const showCalId = !NO_CALENDAR_ID_OPS.includes(op);

  return (
    <ConfigSection className="gap-5">


      {showCalId && (
        <Field label="Calendar ID" hint='"primary" for the default calendar, or a specific calendar ID'>
          <SmartVariableInput value={config.calendarId || 'primary'} onChange={set('calendarId')} placeholder="primary" nodeId={nodeId} />
        </Field>
      )}

      {op === 'createCalendar' && (
        <>
          <Field label="Name"><SmartVariableInput value={config.summary || ''} onChange={set('summary')} placeholder="Project Deadlines" nodeId={nodeId} /></Field>
          <Field label="Description (optional)"><SmartVariableInput value={config.description || ''} onChange={set('description')} placeholder="" nodeId={nodeId} /></Field>
          <ConfigInput label="Timezone" value={config.timeZone || 'UTC'} onChange={(v) => updateConfig('timeZone', v)} />
        </>
      )}

      {op === 'updateCalendar' && (
        <>
          <Field label="New Name (optional)"><SmartVariableInput value={config.summary || ''} onChange={set('summary')} placeholder="" nodeId={nodeId} /></Field>
          <Field label="Description (optional)"><SmartVariableInput value={config.description || ''} onChange={set('description')} placeholder="" nodeId={nodeId} /></Field>
          <ConfigInput label="Timezone (optional)" value={config.timeZone || ''} onChange={(v) => updateConfig('timeZone', v)} placeholder="UTC" />
        </>
      )}

      {['addCalendarToList', 'removeCalendarFromList'].includes(op) && (
        <Field label="Calendar ID to subscribe/unsubscribe" hint="The shared calendar's ID (e.g. team@group.calendar.google.com)">
          <SmartVariableInput value={config.calendarId || ''} onChange={set('calendarId')} placeholder="..." nodeId={nodeId} />
        </Field>
      )}

      {op === 'listEvents' && (
        <>
          <Field label="From (ISO datetime)"><SmartVariableInput value={config.timeMin || ''} onChange={set('timeMin')} placeholder="{{$now}}  (blank = now)" nodeId={nodeId} /></Field>
          <Field label="To (ISO datetime, optional)"><SmartVariableInput value={config.timeMax || ''} onChange={set('timeMax')} placeholder="2024-12-31T23:59:59Z" nodeId={nodeId} /></Field>
          <Field label="Search Query (optional)"><SmartVariableInput value={config.query || ''} onChange={set('query')} placeholder="standup" nodeId={nodeId} /></Field>
          <ConfigInput label="Max Results" type="number" value={config.limit || 20} onChange={(v) => updateConfig('limit', Number(v))} />
        </>
      )}

      {op === 'listInstances' && (
        <>
          <Field label="Recurring Event ID"><SmartVariableInput value={config.eventId || ''} onChange={set('eventId')} placeholder="{{n1.id}}" nodeId={nodeId} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="From (optional)"><SmartVariableInput value={config.timeMin || ''} onChange={set('timeMin')} placeholder="" nodeId={nodeId} /></Field>
            <Field label="To (optional)"><SmartVariableInput value={config.timeMax || ''} onChange={set('timeMax')} placeholder="" nodeId={nodeId} /></Field>
          </div>
        </>
      )}

      {['getEvent', 'deleteEvent', 'moveEvent', 'respondToEvent'].includes(op) && (
        <Field label="Event ID"><SmartVariableInput value={config.eventId || ''} onChange={set('eventId')} placeholder="{{n1.id}}" nodeId={nodeId} /></Field>
      )}

      {op === 'moveEvent' && (
        <Field label="Destination Calendar ID"><SmartVariableInput value={config.destinationCalendarId || ''} onChange={set('destinationCalendarId')} placeholder="other@group.calendar.google.com" nodeId={nodeId} /></Field>
      )}

      {op === 'respondToEvent' && (
        <>
          <ConfigPills label="Response" value={config.responseStatus} onChange={(v) => updateConfig('responseStatus', v)} options={RESPONSE} accentColor={ACCENT} />
          <Field label="Attendee Email (optional)" hint="Defaults to your own attendee record"><SmartVariableInput value={config.attendeeEmail || ''} onChange={set('attendeeEmail')} placeholder="you@example.com" nodeId={nodeId} /></Field>
        </>
      )}

      {op === 'quickAddEvent' && (
        <Field label="Natural Language" hint='e.g. "Lunch with Sam tomorrow at 1pm"'>
          <SmartVariableInput value={config.text || ''} onChange={set('text')} placeholder="Dinner Friday 7pm at Nopa" nodeId={nodeId} />
        </Field>
      )}

      {op === 'importEvent' && (
        <Field label="iCalUID"><SmartVariableInput value={config.iCalUID || ''} onChange={set('iCalUID')} placeholder="abc123@example.com" nodeId={nodeId} /></Field>
      )}

      {['createEvent', 'updateEvent', 'importEvent'].includes(op) && (
        <>
          <Field label={op === 'updateEvent' ? 'Title (optional)' : 'Title'}><SmartVariableInput value={config.summary || ''} onChange={set('summary')} placeholder="Team standup" nodeId={nodeId} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start Time (ISO)"><SmartVariableInput value={config.startTime || ''} onChange={set('startTime')} placeholder="2024-06-01T10:00:00" nodeId={nodeId} /></Field>
            <Field label="End Time (ISO)"><SmartVariableInput value={config.endTime || ''} onChange={set('endTime')} placeholder="2024-06-01T11:00:00" nodeId={nodeId} /></Field>
          </div>
          <ConfigToggleRow label="All-day event" on={config.allDay} onChange={(v) => updateConfig('allDay', v)} accentColor={ACCENT} />
          <Field label="Location (optional)"><SmartVariableInput value={config.location || ''} onChange={set('location')} placeholder="Room 4B / Zoom" nodeId={nodeId} /></Field>
          <Field label="Description (optional)"><SmartVariableInput value={config.description || ''} onChange={set('description')} placeholder="" nodeId={nodeId} /></Field>
          <ConfigInput label="Timezone" value={config.timeZone || 'UTC'} onChange={(v) => updateConfig('timeZone', v)} />
        </>
      )}

      {['createEvent', 'updateEvent'].includes(op) && (
        <>
          <Field label="Attendees (comma-separated emails)"><SmartVariableInput value={config.attendees || ''} onChange={set('attendees')} placeholder="alice@example.com, bob@example.com" nodeId={nodeId} /></Field>
          <ConfigInput label="Reminder (minutes before, optional)" type="number" value={config.reminderMinutes ?? ''} onChange={(v) => updateConfig('reminderMinutes', v)} placeholder="10" />
          <div className="grid grid-cols-2 gap-3">
            <ConfigInput label="Color ID (optional)" value={config.colorId || ''} onChange={(v) => updateConfig('colorId', v)} placeholder="1–11" />
            <ConfigSelect label="Notify Guests" value={config.sendUpdates || 'none'} onChange={(v) => updateConfig('sendUpdates', v)} options={SEND_UPDATES} accentColor={ACCENT} />
          </div>
        </>
      )}

      {op === 'createEvent' && (
        <>
          <ConfigTextarea
            label="Recurrence (RRULE, one per line, optional)"
            value={config.recurrence || ''}
            onChange={(v) => updateConfig('recurrence', v)}
            rows={2}
            placeholder="RRULE:FREQ=DAILY;COUNT=5"
            hint="e.g. RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR"
          />
          <ConfigToggleRow label="Add Google Meet link" on={config.addMeetLink} onChange={(v) => updateConfig('addMeetLink', v)} accentColor={ACCENT} />
        </>
      )}

      {op === 'shareCalendar' && (
        <>
          <Field label="Share With (email)"><SmartVariableInput value={config.shareEmail || ''} onChange={set('shareEmail')} placeholder="teammate@example.com" nodeId={nodeId} /></Field>
          <ConfigSelect label="Role" value={config.role || 'reader'} onChange={(v) => updateConfig('role', v)} options={ROLE_OPTIONS} accentColor={ACCENT} />
        </>
      )}

      {op === 'unshareCalendar' && (
        <Field label="ACL Rule ID" hint="From a List Access run"><SmartVariableInput value={config.ruleId || ''} onChange={set('ruleId')} placeholder="user:teammate@example.com" nodeId={nodeId} /></Field>
      )}

      {op === 'freeBusy' && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="From (ISO)"><SmartVariableInput value={config.timeMin || ''} onChange={set('timeMin')} placeholder="2024-06-01T00:00:00Z" nodeId={nodeId} /></Field>
            <Field label="To (ISO)"><SmartVariableInput value={config.timeMax || ''} onChange={set('timeMax')} placeholder="2024-06-02T00:00:00Z" nodeId={nodeId} /></Field>
          </div>
          <Field label="Calendar IDs (comma-separated, optional)" hint="Blank = the Calendar ID above"><SmartVariableInput value={config.calendarIds || ''} onChange={set('calendarIds')} placeholder="primary, team@group.calendar.google.com" nodeId={nodeId} /></Field>
        </>
      )}

      <OAuthConnectButton provider="google" providerLabel="Google" accentColor="blue"
        value={config.credentialId || ''} onChange={(id) => updateConfig('credentialId', id)} icon={CalIcon} />
      <p className="text-[10px] text-zinc-600 -mt-3">Or use an existing credential:</p>
      <CredentialPicker value={config.credentialId || ''} onChange={(id) => updateConfig('credentialId', id)}
        accentColor="blue" label="Google OAuth Token" placeholder="Select Google credential..." />
    </ConfigSection>
  );
}
