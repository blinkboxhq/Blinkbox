import imgDiscord from './logo.png';
import {
  MessageSquare, Layout, FileText, Send, Pencil, Trash2, List, Pin, PinOff,
  Smile, SmilePlus, GitBranch, PlusCircle, Hash, Info, UserPlus, UserMinus,
  UserX, ShieldOff, User, Users, Server, Shield,
} from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';
import CredentialPicker from '@/components/ui/CredentialPicker';
import {
  ConfigSection, ConfigLabel, ConfigHeader, ConfigSelect, ConfigInput, AddRow, RemovableRow,
} from '@/components/ui/ConfigKit';

const ACCENT = '#4d7cff';

const OPERATIONS = [
  { value: 'sendMessage',    label: 'Send (Webhook)',  icon: MessageSquare,  group: 'Webhook' },
  { value: 'sendEmbed',      label: 'Embed (Webhook)', icon: Layout,         group: 'Webhook' },
  { value: 'sendFile',       label: 'File (Webhook)',  icon: FileText,       group: 'Webhook' },

  { value: 'botSendMessage', label: 'Send Message',    icon: Send,           group: 'Messages' },
  { value: 'editMessage',    label: 'Edit Message',    icon: Pencil,         group: 'Messages' },
  { value: 'deleteMessage',  label: 'Delete Message',  icon: Trash2,         group: 'Messages' },
  { value: 'getMessages',    label: 'Get Messages',    icon: List,           group: 'Messages' },
  { value: 'pinMessage',     label: 'Pin Message',     icon: Pin,            group: 'Messages' },
  { value: 'unpinMessage',   label: 'Unpin Message',   icon: PinOff,         group: 'Messages' },
  { value: 'addReaction',    label: 'Add Reaction',    icon: Smile,          group: 'Messages' },
  { value: 'removeReaction', label: 'Remove Reaction', icon: SmilePlus,      group: 'Messages' },
  { value: 'createThread',   label: 'Create Thread',   icon: GitBranch,      group: 'Messages' },

  { value: 'createChannel',  label: 'Create Channel',  icon: PlusCircle,     group: 'Channels' },
  { value: 'listChannels',   label: 'List Channels',   icon: Hash,           group: 'Channels' },
  { value: 'getChannel',     label: 'Channel Info',    icon: Info,           group: 'Channels' },

  { value: 'addRole',        label: 'Add Role',        icon: UserPlus,       group: 'Members' },
  { value: 'removeRole',     label: 'Remove Role',     icon: UserMinus,      group: 'Members' },
  { value: 'kickMember',     label: 'Kick Member',     icon: UserX,          group: 'Members' },
  { value: 'banMember',      label: 'Ban Member',      icon: ShieldOff,      group: 'Members' },
  { value: 'unbanMember',    label: 'Unban Member',    icon: Shield,         group: 'Members' },
  { value: 'getMember',      label: 'Get Member',      icon: User,           group: 'Members' },
  { value: 'listMembers',    label: 'List Members',    icon: Users,          group: 'Members' },
  { value: 'getGuild',       label: 'Server Info',     icon: Server,         group: 'Members' },
  { value: 'listRoles',      label: 'List Roles',      icon: Shield,         group: 'Members' },
];

const WEBHOOK_OPS = ['sendMessage', 'sendEmbed', 'sendFile'];
const GUILD_OPS = ['createChannel', 'listChannels', 'addRole', 'removeRole', 'kickMember', 'banMember', 'unbanMember', 'getMember', 'listMembers', 'getGuild', 'listRoles'];
const CHANNEL_ID_OPS = ['botSendMessage', 'editMessage', 'deleteMessage', 'getMessages', 'pinMessage', 'unpinMessage', 'addReaction', 'removeReaction', 'createThread', 'getChannel'];
const MESSAGE_ID_OPS = ['editMessage', 'deleteMessage', 'pinMessage', 'unpinMessage', 'addReaction', 'removeReaction'];
const USER_ID_OPS = ['addRole', 'removeRole', 'kickMember', 'banMember', 'unbanMember', 'getMember'];
const ROLE_ID_OPS = ['addRole', 'removeRole'];

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

export default function DiscordNode({ config = {}, updateConfig, nodeId }) {
  const operation = config.operation || 'sendMessage';
  const currentOp = OPERATIONS.find((o) => o.value === operation);
  const fields = Array.isArray(config.fields) ? config.fields : [];
  const isWebhook = WEBHOOK_OPS.includes(operation);
  const isEmbedCapable = operation === 'sendEmbed' || operation === 'botSendMessage';

  const addField = () => updateConfig('fields', [...fields, { name: '', value: '', inline: true }]);
  const removeField = (i) => updateConfig('fields', fields.filter((_, idx) => idx !== i));
  const updateField = (i, key, val) => updateConfig('fields', fields.map((f, idx) => (idx === i ? { ...f, [key]: val } : f)));

  const svi = (k, { placeholder, multiline } = {}) => (
    <SmartVariableInput value={config[k] || ''} onChange={(val) => updateConfig(k, val)} placeholder={placeholder} multiline={multiline} nodeId={nodeId} />
  );

  return (
    <ConfigSection className="gap-5">
      <ConfigHeader logoUrl={imgDiscord} title="Discord" subtitle={isWebhook ? 'Discord Webhook' : 'Discord Bot API'} />

      <ConfigSelect
        label="Action"
        value={operation}
        onChange={(val) => updateConfig('operation', val)}
        options={OPERATIONS}
        accentColor={ACCENT}
      />

      {isWebhook ? (
        <Field label="Discord Webhook Credential" hint="Create a credential with your Webhook URL — Server Settings → Integrations → Webhooks">
          <CredentialPicker
            value={config.credentialId || ''}
            onChange={(val) => updateConfig('credentialId', val)}
            accentColor="indigo"
            placeholder="Select Discord webhook credential…"
          />
        </Field>
      ) : (
        <Field label="Discord Bot Token Credential" hint="Bot token from discord.com/developers → your app → Bot. Invite the bot to your server with the needed permissions.">
          <CredentialPicker
            value={config.credentialId || ''}
            onChange={(val) => updateConfig('credentialId', val)}
            accentColor="indigo"
            label="Discord Bot Token"
            placeholder="Select Discord Bot Token credential…"
          />
        </Field>
      )}

      {isWebhook && (
        <ConfigInput label="Bot Name" value={config.username || ''} onChange={(v) => updateConfig('username', v)} placeholder="BlinkBox Bot" />
      )}

      {GUILD_OPS.includes(operation) && (
        <Field label="Server (Guild) ID" hint="Enable Developer Mode → right-click server → Copy Server ID">
          {svi('guildId', { placeholder: '123456789012345678' })}
        </Field>
      )}
      {CHANNEL_ID_OPS.includes(operation) && (
        <Field label="Channel ID" hint="Right-click channel → Copy Channel ID">
          {svi('channelId', { placeholder: '123456789012345678' })}
        </Field>
      )}
      {MESSAGE_ID_OPS.includes(operation) && (
        <Field label="Message ID">{svi('messageId', { placeholder: '{{previousNode.messageId}}' })}</Field>
      )}
      {USER_ID_OPS.includes(operation) && (
        <Field label="User ID">{svi('userId', { placeholder: '123456789012345678' })}</Field>
      )}
      {ROLE_ID_OPS.includes(operation) && (
        <Field label="Role ID">{svi('roleId', { placeholder: '123456789012345678' })}</Field>
      )}

      {(operation === 'sendMessage' || operation === 'botSendMessage' || operation === 'editMessage') && (
        <Field label="Message" hint="Max 2000 characters. Supports Discord markdown.">
          {svi('message', { multiline: true, placeholder: 'Alert: {{trigger.data.event}} just happened!' })}
        </Field>
      )}

      {isEmbedCapable && (
        <>
          <Field label="Embed Title" optional>{svi('title', { placeholder: 'New Event' })}</Field>
          <Field label="Embed Description" optional>{svi('description', { multiline: true, placeholder: 'Something happened you should know about...' })}</Field>
          <div className="flex gap-3">
            <div className="flex flex-col flex-1">
              <ConfigLabel>Color</ConfigLabel>
              <input
                type="color"
                value={config.color || '#5865F2'}
                onChange={(e) => updateConfig('color', e.target.value)}
                className="bb-glow-border w-full h-10 rounded-md border border-[#3b3b3b] bg-[#0f0f0f] cursor-pointer"
              />
            </div>
            <div className="flex-1">
              <Field label="Thumbnail URL" optional>{svi('thumbnailUrl', { placeholder: 'https://...' })}</Field>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <ConfigLabel>Embed Fields</ConfigLabel>
            {fields.map((f, i) => (
              <RemovableRow key={i} onRemove={() => removeField(i)}>
                <div className="flex items-center gap-2">
                  <input
                    value={f.name}
                    onChange={(e) => updateField(i, 'name', e.target.value)}
                    placeholder="Field name"
                    className="w-1/3 bg-[#0f0f0f] border border-[#3b3b3b] rounded-md px-2 py-1.5 text-[12px] text-neutral-100 font-mono outline-none focus:border-[#545454]"
                  />
                  <div className="flex-1 min-w-0">
                    <SmartVariableInput value={f.value} onChange={(val) => updateField(i, 'value', val)} placeholder="Value" nodeId={nodeId} />
                  </div>
                  <button
                    type="button"
                    onClick={() => updateField(i, 'inline', !f.inline)}
                    className="px-2 py-1.5 rounded-md text-[10px] font-mono font-bold border shrink-0 transition-colors"
                    style={f.inline
                      ? { color: ACCENT, backgroundColor: `${ACCENT}1f`, borderColor: `${ACCENT}66` }
                      : { color: '#6d6d6d', backgroundColor: '#0f0f0f', borderColor: '#2b2b2b' }}
                  >
                    Inline
                  </button>
                </div>
              </RemovableRow>
            ))}
            <AddRow label="Add Field" onClick={addField} accentColor={ACCENT} />
          </div>

          {operation === 'sendEmbed' && (
            <Field label="Footer Text" optional>{svi('footerText', { placeholder: 'Sent by BlinkBox' })}</Field>
          )}
        </>
      )}

      {operation === 'sendFile' && (
        <>
          <ConfigInput label="File Name" value={config.filename || ''} onChange={(v) => updateConfig('filename', v)} placeholder="output.txt" />
          <Field label="File Content">{svi('content', { multiline: true, placeholder: '{{previousNode.result}}' })}</Field>
          <Field label="Message" optional>{svi('message', { placeholder: "Here's the file you requested" })}</Field>
        </>
      )}

      {(operation === 'addReaction' || operation === 'removeReaction') && (
        <Field label="Emoji" hint="A unicode emoji (👍) or custom name:id">{svi('emoji', { placeholder: '👍' })}</Field>
      )}

      {operation === 'createThread' && (
        <>
          <Field label="Thread Name">{svi('threadName', { placeholder: 'Discussion' })}</Field>
          <Field label="Anchor Message ID" optional hint="Leave blank for a standalone thread">
            {svi('messageId', { placeholder: '{{previousNode.messageId}}' })}
          </Field>
        </>
      )}

      {(operation === 'getMessages' || operation === 'listMembers') && (
        <ConfigInput
          label="Limit"
          type="number"
          value={config.limit || ''}
          onChange={(v) => updateConfig('limit', v)}
          placeholder={operation === 'getMessages' ? '50' : '100'}
        />
      )}

      {operation === 'createChannel' && (
        <>
          <Field label="Channel Name">{svi('channelName', { placeholder: 'general' })}</Field>
          <ConfigInput
            label="Channel Type"
            type="number"
            value={config.channelType ?? ''}
            onChange={(v) => updateConfig('channelType', v)}
            placeholder="0"
            hint="0 = Text, 2 = Voice, 4 = Category, 5 = Announcement"
          />
          <Field label="Topic" optional>{svi('topic', { placeholder: 'Channel topic' })}</Field>
        </>
      )}

      {operation === 'banMember' && (
        <ConfigInput
          label="Delete Message History (seconds)"
          type="number"
          value={config.deleteMessageSeconds || ''}
          onChange={(v) => updateConfig('deleteMessageSeconds', v)}
          placeholder="0"
          hint="0–604800. Deletes the banned user's recent messages."
        />
      )}
    </ConfigSection>
  );
}
