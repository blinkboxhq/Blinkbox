import { useEffect } from 'react';
import imgOutlook from './logo.svg';
import { Send, Reply, Mail, Inbox, CalendarPlus, CalendarDays, UserPlus, FolderInput, Flag } from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';
import CredentialPicker from '@/components/ui/CredentialPicker';
import {
  ConfigSection, ConfigLabel, ConfigHeader, ConfigSelect, ConfigToggleRow, ConfigBanner
} from '@/components/ui/ConfigKit';

const ACCENT = '#4d7cff';

export const OPERATIONS = [
  { value: 'sendEmail',     label: 'Send Email',            icon: Send },
  { value: 'replyEmail',    label: 'Reply to Email',        icon: Reply },
  { value: 'getEmail',      label: 'Get Email',             icon: Mail },
  { value: 'listEmails',    label: 'List Emails',           icon: Inbox },
  { value: 'createEvent',   label: 'Create Calendar Event', icon: CalendarPlus },
  { value: 'getCalendar',   label: 'List Calendar Events',  icon: CalendarDays },
  { value: 'createContact', label: 'Create Contact',        icon: UserPlus },
  { value: 'moveEmail',     label: 'Move to Folder',        icon: FolderInput },
  { value: 'flagEmail',     label: 'Flag / Unflag',         icon: Flag },
];

function Field({ label, optional, children }) {
  return (
    <div className="flex flex-col">
      {label && (
        <ConfigLabel>
          {label}{optional && <span className="text-neutral-700 normal-case tracking-normal"> (optional)</span>}
        </ConfigLabel>
      )}
      {children}
    </div>
  );
}

export default function OutlookNode({ config = {}, updateConfig, nodeId }) {
  const LABEL_TO_OP = Object.fromEntries(OPERATIONS.map((o) => [o.label, o.value]));
  const op = LABEL_TO_OP[config.selectedAction] || config.operation || 'sendEmail';

  useEffect(() => {
    if (op && op !== config.operation) updateConfig('operation', op);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [op]);
  const currentOp = OPERATIONS.find((o) => o.value === op);

  const text = (label, key, opts = {}) => (
    <Field label={label} optional={opts.optional}>
      <SmartVariableInput
        value={config[key] || ''}
        onChange={(val) => updateConfig(key, val)}
        placeholder={opts.placeholder || ''}
        multiline={opts.multiline}
        nodeId={nodeId}
      />
    </Field>
  );

  return (
    <ConfigSection className="gap-5">


      {(op === 'sendEmail' || op === 'replyEmail') && (
        <>
          {op === 'replyEmail' && text('Message ID', 'messageId', { placeholder: '{{ $json.id }}' })}
          {text('To', 'to', { placeholder: '{{ $json.email }}' })}
          {op === 'sendEmail' && (
            <>
              {text('CC', 'cc', { optional: true, placeholder: 'manager@company.com' })}
              {text('Subject', 'subject', { placeholder: 'Weekly report — {{ $json.week }}' })}
            </>
          )}
          {text('Body', 'body', { placeholder: 'Hi {{ $json.name }},\n\nHere is your report...', multiline: true })}
          <ConfigToggleRow
            label="Send as HTML"
            on={!!config.isHtml}
            onChange={(v) => updateConfig('isHtml', v)}
            accentColor={ACCENT}
          />
        </>
      )}

      {op === 'createEvent' && (
        <>
          {text('Subject', 'subject', { placeholder: 'Team sync — {{ $json.team }}' })}
          <div className="grid grid-cols-2 gap-2">
            {text('Start (ISO)', 'start', { placeholder: '{{ $json.startTime }}' })}
            {text('End (ISO)', 'end', { placeholder: '{{ $json.endTime }}' })}
          </div>
          {text('Attendees (emails, comma-sep)', 'attendees', { placeholder: 'alice@co.com, bob@co.com' })}
          {text('Location / Teams link', 'location', { optional: true, placeholder: 'Conference Room B' })}
        </>
      )}

      {op === 'createContact' && (
        <>
          {text('First Name', 'firstName', { placeholder: '{{ $json.firstName }}' })}
          {text('Last Name', 'lastName', { placeholder: '{{ $json.lastName }}' })}
          {text('Email', 'email', { placeholder: '{{ $json.email }}' })}
        </>
      )}

      {op === 'getCalendar' && (
        <div className="grid grid-cols-2 gap-2">
          {text('Start Date', 'startDate', { placeholder: '2024-01-01' })}
          {text('End Date', 'endDate', { placeholder: '2024-01-31' })}
        </div>
      )}

      {op === 'getEmail' && text('Message ID', 'messageId', { placeholder: '{{ $json.id }}' })}

      {op === 'listEmails' && (
        <>
          {text('Limit', 'limit', { optional: true, placeholder: '20' })}
          {text('OData Filter', 'filter', { optional: true, placeholder: 'isRead eq false' })}
        </>
      )}

      {op === 'moveEmail' && (
        <>
          {text('Message ID', 'messageId', { placeholder: '{{ $json.id }}' })}
          {text('Destination Folder', 'destinationId', { placeholder: 'Archive or folder ID' })}
        </>
      )}

      {op === 'flagEmail' && (
        <>
          {text('Message ID', 'messageId', { placeholder: '{{ $json.id }}' })}
          <ConfigToggleRow
            label="Flag message"
            on={config.flagged !== false}
            onChange={(v) => updateConfig('flagged', v)}
            accentColor={ACCENT}
          />
        </>
      )}

      <CredentialPicker
        value={config.credentialId || ''}
        onChange={(id) => updateConfig('credentialId', id)}
        accentColor="blue"
        label="Microsoft 365 (OAuth)"
        placeholder="Select Outlook credential..."
      />

      <ConfigBanner>
        Returns: <span className="text-neutral-300 ml-1">id, subject, from, receivedDateTime, bodyPreview</span>
      </ConfigBanner>
    </ConfigSection>
  );
}
