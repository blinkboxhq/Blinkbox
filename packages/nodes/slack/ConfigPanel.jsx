import { useEffect } from 'react';
import imgSlack from './logo.png';
import {
  MessageSquare, Layout, Pencil, Trash2, Clock, EyeOff, CornerDownRight, Link2,
  Upload, Smile, SmilePlus, List, PlusCircle, Archive, Tag, AlignLeft, FileText,
  UserPlus, UserMinus, LogIn, LogOut, Hash, History, Info, User, Users, Send,
  MessageCircle, Activity,
} from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';
import CredentialPicker from '@/components/ui/CredentialPicker';
import {
  ConfigSection, ConfigLabel, ConfigHeader, ConfigSelect, ConfigInput, ConfigToggleRow
} from '@/components/ui/ConfigKit';

const ACCENT = '#4d7cff';

export const OPERATIONS = [
  { value: 'postMessage',       label: 'Post Message',        icon: MessageSquare,   group: 'Messaging' },
  { value: 'postRichMessage',   label: 'Rich Message',        icon: Layout,          group: 'Messaging' },
  { value: 'updateMessage',     label: 'Update Message',      icon: Pencil,          group: 'Messaging' },
  { value: 'deleteMessage',     label: 'Delete Message',      icon: Trash2,          group: 'Messaging' },
  { value: 'scheduleMessage',   label: 'Schedule Message',    icon: Clock,           group: 'Messaging' },
  { value: 'postEphemeral',     label: 'Ephemeral Message',   icon: EyeOff,          group: 'Messaging' },
  { value: 'replyInThread',     label: 'Reply in Thread',     icon: CornerDownRight, group: 'Messaging' },
  { value: 'getPermalink',      label: 'Get Permalink',       icon: Link2,           group: 'Messaging' },
  { value: 'uploadFile',        label: 'Upload File',         icon: Upload,          group: 'Messaging' },

  { value: 'addReaction',       label: 'Add Reaction',        icon: Smile,           group: 'Reactions' },
  { value: 'removeReaction',    label: 'Remove Reaction',     icon: SmilePlus,       group: 'Reactions' },
  { value: 'getReactions',      label: 'Get Reactions',       icon: List,            group: 'Reactions' },

  { value: 'createChannel',     label: 'Create Channel',      icon: PlusCircle,      group: 'Channels' },
  { value: 'archiveChannel',    label: 'Archive Channel',     icon: Archive,         group: 'Channels' },
  { value: 'renameChannel',     label: 'Rename Channel',      icon: Tag,             group: 'Channels' },
  { value: 'setTopic',          label: 'Set Topic',           icon: AlignLeft,       group: 'Channels' },
  { value: 'setPurpose',        label: 'Set Purpose',         icon: FileText,        group: 'Channels' },
  { value: 'inviteToChannel',   label: 'Invite to Channel',   icon: UserPlus,        group: 'Channels' },
  { value: 'kickFromChannel',   label: 'Remove from Channel', icon: UserMinus,       group: 'Channels' },
  { value: 'joinChannel',       label: 'Join Channel',        icon: LogIn,           group: 'Channels' },
  { value: 'leaveChannel',      label: 'Leave Channel',       icon: LogOut,          group: 'Channels' },
  { value: 'listChannels',      label: 'List Channels',       icon: Hash,            group: 'Channels' },
  { value: 'getChannelHistory', label: 'Channel History',     icon: History,         group: 'Channels' },
  { value: 'getChannelInfo',    label: 'Channel Info',        icon: Info,            group: 'Channels' },

  { value: 'getUser',           label: 'Get User by Email',   icon: User,            group: 'Users' },
  { value: 'getUserInfo',       label: 'Get User by ID',      icon: User,            group: 'Users' },
  { value: 'listUsers',         label: 'List Users',          icon: Users,           group: 'Users' },
  { value: 'openDM',            label: 'Open DM',             icon: MessageCircle,   group: 'Users' },
  { value: 'sendDM',            label: 'Send DM',             icon: Send,            group: 'Users' },
  { value: 'setStatus',         label: 'Set My Status',       icon: Activity,        group: 'Users' },
];

const CHANNEL_OPS = [
  'postMessage', 'postRichMessage', 'updateMessage', 'deleteMessage', 'scheduleMessage',
  'postEphemeral', 'replyInThread', 'getPermalink', 'uploadFile', 'addReaction',
  'removeReaction', 'getReactions', 'archiveChannel', 'renameChannel', 'setTopic',
  'setPurpose', 'inviteToChannel', 'kickFromChannel', 'joinChannel', 'leaveChannel',
  'getChannelHistory', 'getChannelInfo',
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

export default function SlackNode({ config = {}, updateConfig, nodeId }) {
  const LABEL_TO_OP = Object.fromEntries(OPERATIONS.map((o) => [o.label, o.value]));
  const operation = LABEL_TO_OP[config.selectedAction] || config.operation || 'postMessage';

  useEffect(() => {
    if (operation && operation !== config.operation) updateConfig('operation', operation);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operation]);
  const currentOp = OPERATIONS.find((o) => o.value === operation);

  const needsChannel = CHANNEL_OPS.includes(operation);

  const svi = (k, { placeholder, multiline, alias } = {}) => (
    <SmartVariableInput
      value={config[k] || (alias ? config[alias] : '') || ''}
      onChange={(val) => { updateConfig(k, val); if (alias) updateConfig(alias, val); }}
      placeholder={placeholder}
      multiline={multiline}
      nodeId={nodeId}
    />
  );

  return (
    <ConfigSection className="gap-5">


      <CredentialPicker
        value={config.credentialId || ''}
        onChange={(id) => updateConfig('credentialId', id)}
        accentColor="blue"
        label="Slack Bot Token"
        credentialType="slack"
        placeholder="Select or add a Slack credential…"
        hint="Paste your app's Bot User OAuth Token (xoxb-…). Stored encrypted in your Vault."
      />


      {needsChannel && (
        <Field label="Channel" hint="#general or C01ABCDEF">
          {svi('channel', { placeholder: '#general or C01ABCDEF' })}
        </Field>
      )}

      {operation === 'postMessage' && (
        <Field label="Message">
          {svi('message', { alias: 'text', multiline: true, placeholder: 'New lead: {{trigger.data.name}} signed up!' })}
        </Field>
      )}

      {operation === 'postRichMessage' && (
        <>
          <Field label="Title" optional>{svi('title', { placeholder: 'Alert: New signup' })}</Field>
          <Field label="Body Text">{svi('text', { multiline: true, placeholder: '*Name:* {{trigger.data.name}}' })}</Field>
          <Field label="Button Label" optional>{svi('buttonLabel', { placeholder: 'View in Dashboard' })}</Field>
          {config.buttonLabel && (
            <Field label="Button URL">{svi('buttonUrl', { placeholder: 'https://app.example.com/...' })}</Field>
          )}
        </>
      )}

      {operation === 'updateMessage' && (
        <>
          <Field label="Message Timestamp (ts)" hint="The ts of the message to update">
            {svi('timestamp', { alias: 'ts', placeholder: '{{previousNode.ts}}' })}
          </Field>
          <Field label="New Message">{svi('message', { alias: 'text', multiline: true, placeholder: 'Updated content' })}</Field>
        </>
      )}

      {operation === 'deleteMessage' && (
        <Field label="Message Timestamp (ts)">{svi('timestamp', { alias: 'ts', placeholder: '{{previousNode.ts}}' })}</Field>
      )}

      {operation === 'scheduleMessage' && (
        <>
          <Field label="Message">{svi('message', { alias: 'text', multiline: true, placeholder: 'Reminder: standup in 5 min' })}</Field>
          <Field label="Post At (Unix timestamp)" hint="Seconds since epoch, in the future">
            {svi('postAt', { placeholder: '1735689600' })}
          </Field>
        </>
      )}

      {operation === 'postEphemeral' && (
        <>
          <Field label="User ID" hint="Only this user sees the message">{svi('userId', { placeholder: 'U01ABCDEF' })}</Field>
          <Field label="Message">{svi('message', { alias: 'text', multiline: true, placeholder: 'Only you can see this' })}</Field>
        </>
      )}

      {operation === 'replyInThread' && (
        <>
          <Field label="Parent Message TS" hint="thread_ts of the message to reply under">
            {svi('threadTs', { placeholder: '{{previousNode.ts}}' })}
          </Field>
          <Field label="Reply">{svi('message', { alias: 'text', multiline: true, placeholder: 'Thread reply' })}</Field>
          <ConfigToggleRow
            label="Also send to channel"
            desc="Broadcast this reply to the whole channel, not just the thread"
            on={config.broadcast}
            onChange={(v) => updateConfig('broadcast', v)}
            accentColor={ACCENT}
          />
        </>
      )}

      {operation === 'getPermalink' && (
        <Field label="Message Timestamp (ts)">{svi('timestamp', { alias: 'ts', placeholder: '{{previousNode.ts}}' })}</Field>
      )}

      {operation === 'uploadFile' && (
        <>
          <ConfigInput label="File Name" value={config.filename || ''} onChange={(v) => updateConfig('filename', v)} placeholder="output.txt" />
          <Field label="File Content">{svi('content', { multiline: true, placeholder: '{{previousNode.result}}' })}</Field>
        </>
      )}

      {(operation === 'addReaction' || operation === 'removeReaction') && (
        <>
          <Field label="Emoji" hint="Without colons — e.g. thumbsup, rocket, white_check_mark">
            {svi('emoji', { placeholder: 'thumbsup' })}
          </Field>
          <Field label="Message Timestamp (ts)">{svi('timestamp', { alias: 'ts', placeholder: '{{previousNode.ts}}' })}</Field>
        </>
      )}

      {operation === 'getReactions' && (
        <Field label="Message Timestamp (ts)">{svi('timestamp', { alias: 'ts', placeholder: '{{previousNode.ts}}' })}</Field>
      )}

      {operation === 'createChannel' && (
        <>
          <Field label="Channel Name">{svi('channelName', { placeholder: 'team-alerts' })}</Field>
          <ConfigToggleRow
            label="Private Channel"
            desc="Only invited members can see it"
            on={config.isPrivate}
            onChange={(v) => updateConfig('isPrivate', v)}
            accentColor={ACCENT}
          />
        </>
      )}

      {operation === 'renameChannel' && (
        <Field label="New Channel Name">{svi('channelName', { placeholder: 'renamed-channel' })}</Field>
      )}

      {operation === 'setTopic' && <Field label="Topic">{svi('topic', { placeholder: 'Weekly standup at 10am' })}</Field>}

      {operation === 'setPurpose' && (
        <Field label="Purpose">{svi('purpose', { multiline: true, placeholder: 'Channel for incident response' })}</Field>
      )}

      {(operation === 'inviteToChannel' || operation === 'kickFromChannel') && (
        <Field label="User ID" hint="Comma-separate IDs to invite multiple (invite only)">
          {svi('userId', { placeholder: 'U01ABCDEF' })}
        </Field>
      )}

      {operation === 'listChannels' && (
        <>
          <ConfigInput
            label="Channel Types"
            value={config.channelTypes || ''}
            onChange={(v) => updateConfig('channelTypes', v)}
            placeholder="public_channel,private_channel"
            hint="Comma list: public_channel, private_channel, mpim, im"
          />
          <ConfigInput label="Limit" type="number" value={config.limit || ''} onChange={(v) => updateConfig('limit', v)} placeholder="100" />
          <ConfigToggleRow
            label="Exclude archived"
            on={config.excludeArchived !== false}
            onChange={(v) => updateConfig('excludeArchived', v)}
            accentColor={ACCENT}
          />
        </>
      )}

      {operation === 'getChannelHistory' && (
        <ConfigInput
          label="Limit"
          type="number"
          value={config.limit || ''}
          onChange={(v) => updateConfig('limit', v)}
          placeholder="50"
          hint="Most recent messages, max 1000"
        />
      )}

      {operation === 'getUser' && <Field label="User Email">{svi('email', { placeholder: 'user@company.com' })}</Field>}

      {(operation === 'getUserInfo' || operation === 'openDM') && (
        <Field label="User ID">{svi('userId', { placeholder: 'U01ABCDEF' })}</Field>
      )}

      {operation === 'sendDM' && (
        <>
          <Field label="User ID">{svi('userId', { placeholder: 'U01ABCDEF' })}</Field>
          <Field label="Message">{svi('message', { alias: 'text', multiline: true, placeholder: 'Direct message text' })}</Field>
        </>
      )}

      {operation === 'listUsers' && (
        <ConfigInput label="Limit" type="number" value={config.limit || ''} onChange={(v) => updateConfig('limit', v)} placeholder="100" />
      )}

      {operation === 'setStatus' && (
        <>
          <Field label="Status Text">{svi('statusText', { placeholder: 'In a meeting' })}</Field>
          <Field label="Status Emoji" optional hint="With colons — e.g. :spiral_calendar_pad:">
            {svi('statusEmoji', { placeholder: ':calendar:' })}
          </Field>
          <Field label="Expiration (Unix timestamp)" optional hint="0 = never expires">
            {svi('statusExpiration', { placeholder: '0' })}
          </Field>
        </>
      )}

    </ConfigSection>
  );
}
