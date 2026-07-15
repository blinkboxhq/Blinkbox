import imgTeams from './logo.svg';
import {
  Send, LayoutTemplate, Reply, FolderPlus, List, Users, Video,
  Eye, Pencil, Trash2, Undo2, MessagesSquare, Folder, FolderX,
  UserPlus, MessageCircle, MessageSquare,
} from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';
import CredentialPicker from '@/components/ui/CredentialPicker';
import {
  ConfigSection, ConfigLabel, ConfigHeader, ConfigSelect, ConfigPills, ConfigBanner, ConfigToggleRow, ConfigInput,
} from '@/components/ui/ConfigKit';

const ACCENT = '#4d7cff';

const OPERATIONS = [
  { value: 'sendMessage',       label: 'Send Message',       icon: Send,            desc: 'Messages' },
  { value: 'sendCard',          label: 'Send Adaptive Card', icon: LayoutTemplate,  desc: 'Messages' },
  { value: 'replyMessage',      label: 'Reply to Thread',    icon: Reply,           desc: 'Messages' },
  { value: 'listMessages',      label: 'List Messages',      icon: List,            desc: 'Messages' },
  { value: 'getMessage',        label: 'Get Message',        icon: Eye,             desc: 'Messages' },
  { value: 'listReplies',       label: 'List Replies',       icon: MessagesSquare,  desc: 'Messages' },
  { value: 'updateMessage',     label: 'Update Message',     icon: Pencil,          desc: 'Messages' },
  { value: 'deleteMessage',     label: 'Delete Message',     icon: Trash2,          desc: 'Messages' },
  { value: 'undoDeleteMessage', label: 'Restore Message',    icon: Undo2,           desc: 'Messages' },
  { value: 'createChannel',     label: 'Create Channel',     icon: FolderPlus,      desc: 'Channels' },
  { value: 'listChannels',      label: 'List Channels',      icon: List,            desc: 'Channels' },
  { value: 'getChannel',        label: 'Get Channel',        icon: Folder,          desc: 'Channels' },
  { value: 'updateChannel',     label: 'Update Channel',     icon: Pencil,          desc: 'Channels' },
  { value: 'deleteChannel',     label: 'Delete Channel',     icon: FolderX,         desc: 'Channels' },
  { value: 'listChannelMembers',label: 'List Members',       icon: Users,           desc: 'Channels' },
  { value: 'addChannelMember',  label: 'Add Member',         icon: UserPlus,        desc: 'Channels' },
  { value: 'listTeams',         label: 'List Teams',         icon: Users,           desc: 'Teams' },
  { value: 'getTeam',           label: 'Get Team',           icon: Eye,             desc: 'Teams' },
  { value: 'listChats',         label: 'List Chats',         icon: MessageCircle,   desc: 'Chats' },
  { value: 'getChat',           label: 'Get Chat',           icon: Eye,             desc: 'Chats' },
  { value: 'sendChatMessage',   label: 'Send Chat Message',  icon: MessageSquare,   desc: 'Chats' },
  { value: 'listChatMessages',  label: 'List Chat Messages', icon: List,            desc: 'Chats' },
  { value: 'createMeeting',     label: 'Create Meeting',     icon: Video,           desc: 'Meetings' },
  { value: 'getMeeting',        label: 'Get Meeting',        icon: Eye,             desc: 'Meetings' },
];

const TEAM_OPS = ['sendMessage', 'sendCard', 'replyMessage', 'listMessages', 'getMessage', 'listReplies', 'updateMessage', 'deleteMessage', 'undoDeleteMessage', 'createChannel', 'listChannels', 'getChannel', 'updateChannel', 'deleteChannel', 'listChannelMembers', 'addChannelMember', 'getTeam'];
const CHANNEL_OPS = ['sendMessage', 'sendCard', 'replyMessage', 'listMessages', 'getMessage', 'listReplies', 'updateMessage', 'deleteMessage', 'undoDeleteMessage', 'getChannel', 'updateChannel', 'deleteChannel', 'listChannelMembers', 'addChannelMember'];
const MESSAGE_ID_OPS = ['replyMessage', 'getMessage', 'listReplies', 'updateMessage', 'deleteMessage', 'undoDeleteMessage'];
const CHAT_ID_OPS = ['getChat', 'sendChatMessage', 'listChatMessages'];
const HTML_OPS = ['sendMessage', 'replyMessage', 'updateMessage', 'sendChatMessage'];
const LIMIT_OPS = ['listMessages', 'listChats', 'listChatMessages'];

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

      {TEAM_OPS.includes(op) &&
        text('Team ID', 'teamId', { placeholder: '{{ $json.teamId }}' })}

      {CHANNEL_OPS.includes(op) &&
        text('Channel ID', 'channelId', { placeholder: '{{ $json.channelId }}' })}

      {MESSAGE_ID_OPS.includes(op) &&
        text('Message ID', 'messageId', { placeholder: '{{ $json.messageId }}' })}

      {CHAT_ID_OPS.includes(op) &&
        text('Chat ID', 'chatId', { placeholder: '{{ $json.chatId }}' })}

      {op === 'sendMessage' && text('Message', 'content', { placeholder: 'Deployment complete: {{ $json.version }}', multiline: true })}

      {op === 'sendChatMessage' && text('Message', 'content', { placeholder: 'Heads up: {{ $json.summary }}', multiline: true })}

      {op === 'replyMessage' && text('Reply Content', 'content', { placeholder: 'Thanks for the update!', multiline: true })}

      {op === 'updateMessage' && text('New Content', 'content', { placeholder: 'Edited message text', multiline: true })}

      {op === 'sendCard' && text('Adaptive Card JSON', 'card', { placeholder: '{"type":"AdaptiveCard","body":[{"type":"TextBlock","text":"Hello!"}]}', multiline: true })}

      {HTML_OPS.includes(op) && (
        <ConfigToggleRow
          label="Send as HTML"
          on={!!config.isHtml}
          onChange={(v) => updateConfig('isHtml', v)}
          accentColor={ACCENT}
        />
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

      {op === 'updateChannel' && (
        <>
          {text('New Channel Name', 'displayName', { optional: true, placeholder: 'alerts-production' })}
          {text('New Description', 'description', { optional: true, placeholder: 'Updated description' })}
        </>
      )}

      {op === 'addChannelMember' && (
        <>
          {text('User ID', 'userId', { placeholder: 'AAD user ID or {{ $json.userId }}' })}
          <ConfigToggleRow
            label="Add as owner"
            on={!!config.owner}
            onChange={(v) => updateConfig('owner', v)}
            accentColor={ACCENT}
          />
        </>
      )}

      {op === 'getMeeting' &&
        text('Meeting ID', 'meetingId', { placeholder: '{{ $json.meetingId }}' })}

      {LIMIT_OPS.includes(op) && (
        <ConfigInput
          label="Limit"
          type="number"
          value={config.limit ?? 20}
          onChange={(val) => updateConfig('limit', Number(val))}
          hint="Max results"
        />
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
