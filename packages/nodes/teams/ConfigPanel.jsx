import imgTeams from './logo.svg';
import {
  Send, LayoutTemplate, Reply, FolderPlus, List, Users, Video,
} from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';
import CredentialPicker from '@/components/ui/CredentialPicker';
import {
  ConfigSection, ConfigLabel, ConfigHeader, ConfigSelect, ConfigPills, ConfigBanner, ConnectAppGuide,
} from '@/components/ui/ConfigKit';

const ACCENT = '#4d7cff';

const OPERATIONS = [
  { value: 'sendMessage',   label: 'Send Message',       icon: Send },
  { value: 'sendCard',      label: 'Send Adaptive Card', icon: LayoutTemplate },
  { value: 'replyMessage',  label: 'Reply to Thread',    icon: Reply },
  { value: 'createChannel', label: 'Create Channel',     icon: FolderPlus },
  { value: 'listChannels',  label: 'List Channels',      icon: List },
  { value: 'listTeams',     label: 'List Teams',         icon: Users },
  { value: 'createMeeting', label: 'Create Meeting',     icon: Video },
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

export default function TeamsNode({ config = {}, updateConfig, nodeId }) {
  const op = config.operation || 'sendMessage';
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
      <ConfigHeader logoUrl={imgTeams} title="Microsoft Teams" subtitle={currentOp?.label || 'Messages, channels, meetings'} />

      <ConfigSelect
        label="Operation"
        value={op}
        onChange={(val) => updateConfig('operation', val)}
        options={OPERATIONS}
        accentColor={ACCENT}
      />

      {['sendMessage', 'sendCard', 'replyMessage', 'createChannel', 'listChannels'].includes(op) &&
        text('Team ID', 'teamId', { placeholder: '{{ $json.teamId }}' })}

      {['sendMessage', 'sendCard', 'replyMessage'].includes(op) &&
        text('Channel ID', 'channelId', { placeholder: '{{ $json.channelId }}' })}

      {op === 'sendMessage' && text('Message', 'content', { placeholder: 'Deployment complete: {{ $json.version }}', multiline: true })}

      {op === 'sendCard' && text('Adaptive Card JSON', 'card', { placeholder: '{"type":"AdaptiveCard","body":[{"type":"TextBlock","text":"Hello!"}]}', multiline: true })}

      {op === 'replyMessage' && (
        <>
          {text('Message ID (thread to reply to)', 'messageId', { placeholder: '{{ $json.messageId }}' })}
          {text('Reply Content', 'content', { placeholder: 'Thanks for the update!', multiline: true })}
        </>
      )}

      {op === 'createChannel' && (
        <>
          {text('Channel Name', 'displayName', { placeholder: 'alerts-production' })}
          {text('Description', 'description', { optional: true, placeholder: 'Production alerts channel' })}
          <ConfigPills
            label="Membership Type"
            value={config.membershipType || 'standard'}
            onChange={(val) => updateConfig('membershipType', val)}
            options={[{ value: 'standard', label: 'standard' }, { value: 'private', label: 'private' }]}
            accentColor={ACCENT}
          />
        </>
      )}

      {op === 'createMeeting' && (
        <>
          {text('Subject', 'subject', { placeholder: 'Sprint Review' })}
          <div className="flex gap-3">
            <div className="flex-1">{text('Start (ISO)', 'startDateTime', { placeholder: '{{ $json.start }}' })}</div>
            <div className="flex-1">{text('End (ISO)', 'endDateTime', { placeholder: '{{ $json.end }}' })}</div>
          </div>
          {text('Attendees (emails, comma-sep)', 'attendees', { placeholder: 'alice@co.com, bob@co.com' })}
        </>
      )}

      <ConnectAppGuide
        title="Connect your Microsoft 365 account"
        accentColor={ACCENT}
        steps={[
          <>Register an app at <span className="text-[#8fb0ff]">portal.azure.com</span> → App registrations</>,
          <>Grant Microsoft Graph permissions (e.g. <span className="text-neutral-300">ChannelMessage.Send</span>, <span className="text-neutral-300">Team.ReadBasic.All</span>)</>,
          <>Sign in and copy the access token for your account</>,
          <>Save it below as a credential — reuse it across every Teams step</>,
        ]}
      />
      <CredentialPicker
        value={config.credentialId || ''}
        onChange={(id) => updateConfig('credentialId', id)}
        accentColor="violet"
        label="Microsoft 365 (OAuth)"
        placeholder="Select Teams credential..."
      />

      <ConfigBanner>Returns:&nbsp;<span className="text-neutral-300">id, etag, createdDateTime, webUrl</span></ConfigBanner>
    </ConfigSection>
  );
}
