import { useEffect } from 'react';
import imgTelegram from './logo.png';
import {
  Send, Hash, BellOff, Image, FileText, Film, Music, Mic, Sticker, MapPin,
  Building2, Contact, BarChart2, Dice5, Images, Copy, Forward, Pencil, Captions,
  Trash2, Pin, PinOff, Loader, Info, Users, UserCheck, Shield, Type, AlignLeft,
  LogOut, Ban, UserPlus, UserMinus, Lock, ArrowUpCircle, Link2, LinkIcon,
  Smile, Bot, ChevronDown,
} from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';
import CredentialPicker from '@/components/ui/CredentialPicker';
import {
  ConfigSection, ConfigLabel, ConfigHeader, ConfigSelect, ConfigToggle, ConfigToggleRow,
} from '@/components/ui/ConfigKit';

const ACCENT = '#4d7cff';

const OPERATIONS = [
  { value: 'sendMessage',           label: 'Send Message',       icon: Send,        group: 'Messaging' },
  { value: 'sendPhoto',             label: 'Send Photo',         icon: Image,       group: 'Messaging' },
  { value: 'sendDocument',          label: 'Send File',          icon: FileText,    group: 'Messaging' },
  { value: 'sendVideo',             label: 'Send Video',         icon: Film,        group: 'Messaging' },
  { value: 'sendAudio',             label: 'Send Audio',         icon: Music,       group: 'Messaging' },
  { value: 'sendVoice',             label: 'Send Voice',         icon: Mic,         group: 'Messaging' },
  { value: 'sendAnimation',         label: 'Send GIF',           icon: Film,        group: 'Messaging' },
  { value: 'sendSticker',           label: 'Send Sticker',       icon: Sticker,     group: 'Messaging' },
  { value: 'sendLocation',          label: 'Send Location',      icon: MapPin,      group: 'Messaging' },
  { value: 'sendVenue',             label: 'Send Venue',         icon: Building2,   group: 'Messaging' },
  { value: 'sendContact',           label: 'Send Contact',       icon: Contact,     group: 'Messaging' },
  { value: 'sendPoll',              label: 'Send Poll',          icon: BarChart2,   group: 'Messaging' },
  { value: 'sendDice',              label: 'Send Dice',          icon: Dice5,       group: 'Messaging' },
  { value: 'sendMediaGroup',        label: 'Send Album',         icon: Images,      group: 'Messaging' },
  { value: 'copyMessage',           label: 'Copy Message',       icon: Copy,        group: 'Messaging' },
  { value: 'forwardMessage',        label: 'Forward Message',    icon: Forward,     group: 'Messaging' },
  { value: 'editMessage',           label: 'Edit Message',       icon: Pencil,      group: 'Manage' },
  { value: 'editMessageCaption',    label: 'Edit Caption',       icon: Captions,    group: 'Manage' },
  { value: 'deleteMessage',         label: 'Delete Message',     icon: Trash2,      group: 'Manage' },
  { value: 'pinMessage',            label: 'Pin Message',        icon: Pin,         group: 'Manage' },
  { value: 'unpinMessage',          label: 'Unpin Message',      icon: PinOff,      group: 'Manage' },
  { value: 'unpinAllMessages',      label: 'Unpin All',          icon: PinOff,      group: 'Manage' },
  { value: 'sendChatAction',        label: 'Send Chat Action',   icon: Loader,      group: 'Manage' },
  { value: 'setMessageReaction',    label: 'React to Message',   icon: Smile,       group: 'Manage' },
  { value: 'getChat',               label: 'Get Chat Info',      icon: Info,        group: 'Chat' },
  { value: 'getChatMemberCount',    label: 'Get Member Count',   icon: Users,       group: 'Chat' },
  { value: 'getChatMember',         label: 'Get Member',         icon: UserCheck,   group: 'Chat' },
  { value: 'getChatAdministrators', label: 'Get Admins',         icon: Shield,      group: 'Chat' },
  { value: 'setChatTitle',          label: 'Set Title',          icon: Type,        group: 'Chat' },
  { value: 'setChatDescription',    label: 'Set Description',    icon: AlignLeft,   group: 'Chat' },
  { value: 'leaveChat',             label: 'Leave Chat',         icon: LogOut,      group: 'Chat' },
  { value: 'banChatMember',         label: 'Ban Member',         icon: Ban,         group: 'Moderation' },
  { value: 'unbanChatMember',       label: 'Unban Member',       icon: UserPlus,    group: 'Moderation' },
  { value: 'restrictChatMember',    label: 'Restrict Member',    icon: Lock,        group: 'Moderation' },
  { value: 'promoteChatMember',     label: 'Promote Member',     icon: ArrowUpCircle, group: 'Moderation' },
  { value: 'createInviteLink',      label: 'Create Invite',      icon: Link2,       group: 'Invites' },
  { value: 'revokeInviteLink',      label: 'Revoke Invite',      icon: LinkIcon,    group: 'Invites' },
  { value: 'exportInviteLink',      label: 'Export Invite',      icon: LinkIcon,    group: 'Invites' },
  { value: 'getMe',                 label: 'Get Bot Info',       icon: Bot,         group: 'Bot' },
];

const GROUPS = ['Messaging', 'Manage', 'Chat', 'Moderation', 'Invites', 'Bot'];
const NO_CHAT_OPS = ['getMe'];

// Action picker drops config.selectedAction as a display label ("Send Photo").
// Resolve it to the operation slug so the panel opens on the chosen action
// instead of re-asking. Label match is 1:1 with OPERATIONS[].label.
const LABEL_TO_OP = Object.fromEntries(OPERATIONS.map((o) => [o.label, o.value]));
const resolveOperation = (config) =>
  config.operation || LABEL_TO_OP[config.selectedAction] || 'sendMessage';

const PARSE_MODES = [
  { value: 'MarkdownV2', label: 'Markdown' },
  { value: 'HTML', label: 'HTML' },
  { value: 'plain', label: 'Plain Text' },
];
const CHAT_ACTIONS = ['typing', 'upload_photo', 'record_video', 'upload_video', 'record_voice', 'upload_voice', 'upload_document', 'choose_sticker', 'find_location']
  .map((a) => ({ value: a, label: a }));

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

export default function TelegramNode({ config = {}, updateConfig, nodeId }) {
  const operation = resolveOperation(config);
  const currentOp = OPERATIONS.find((o) => o.value === operation);

  // Persist the slug the backend reads: when the node arrives from the action
  // picker with only selectedAction, write the resolved operation once so the
  // executor doesn't fail on a missing config.operation.
  useEffect(() => {
    if (!config.operation && operation) updateConfig('operation', operation);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      <ConfigHeader logoUrl={imgTelegram} title="Telegram" subtitle={currentOp?.label || 'Telegram Bot API'} />

      {!NO_CHAT_OPS.includes(operation) && (
        <Field label={<><Hash className="w-3 h-3 inline mr-1" style={{ color: '#6d6d6d' }} />Chat ID</>}>
          <SmartVariableInput
            value={config.chatId || ''}
            onChange={(val) => updateConfig('chatId', val)}
            placeholder="e.g. -1001234567890 or @channelname"
            nodeId={nodeId}
          />
        </Field>
      )}

      {operation === 'sendMessage' && (
        <>
          {text('Message', 'text', { placeholder: 'Type your message...', multiline: true })}
          <div className="flex gap-3">
            <div className="flex-1">
              <ConfigSelect
                label="Format"
                value={config.parseMode || 'MarkdownV2'}
                onChange={(val) => updateConfig('parseMode', val)}
                options={PARSE_MODES}
                accentColor={ACCENT}
              />
            </div>
          </div>
          <ConfigToggleRow
            label="Silent"
            desc="Deliver without a notification sound"
            icon={BellOff}
            on={config.silent}
            onChange={(v) => updateConfig('silent', v)}
            accentColor={ACCENT}
          />
        </>
      )}

      {operation === 'sendPhoto' && (<>{text('Photo URL', 'photoUrl', { placeholder: 'https://example.com/image.jpg' })}{text('Caption', 'caption', { optional: true, multiline: true })}</>)}
      {operation === 'sendDocument' && (<>{text('Document URL', 'documentUrl', { placeholder: 'https://example.com/file.pdf' })}{text('Caption', 'caption', { optional: true })}</>)}
      {operation === 'sendVideo' && (<>{text('Video URL', 'fileUrl', { placeholder: 'https://example.com/clip.mp4' })}{text('Caption', 'caption', { optional: true })}</>)}
      {operation === 'sendAudio' && (<>{text('Audio URL', 'fileUrl', { placeholder: 'https://example.com/song.mp3' })}{text('Title', 'title', { optional: true })}{text('Performer', 'performer', { optional: true })}{text('Caption', 'caption', { optional: true })}</>)}
      {operation === 'sendVoice' && (<>{text('Voice URL (.ogg)', 'fileUrl', { placeholder: 'https://example.com/voice.ogg' })}{text('Caption', 'caption', { optional: true })}</>)}
      {operation === 'sendAnimation' && (<>{text('GIF / MP4 URL', 'fileUrl', { placeholder: 'https://example.com/animation.gif' })}{text('Caption', 'caption', { optional: true })}</>)}
      {operation === 'sendSticker' && text('Sticker (file ID or URL)', 'sticker', { placeholder: 'CAACAgIAAxk... or https://...webp' })}

      {operation === 'sendLocation' && (
        <div className="flex gap-3">
          <div className="flex-1">{text('Latitude', 'latitude', { placeholder: '37.7749' })}</div>
          <div className="flex-1">{text('Longitude', 'longitude', { placeholder: '-122.4194' })}</div>
        </div>
      )}

      {operation === 'sendVenue' && (
        <>
          <div className="flex gap-3">
            <div className="flex-1">{text('Latitude', 'latitude', { placeholder: '37.7749' })}</div>
            <div className="flex-1">{text('Longitude', 'longitude', { placeholder: '-122.4194' })}</div>
          </div>
          {text('Title', 'title', { placeholder: 'Venue name' })}
          {text('Address', 'address', { placeholder: 'Street address' })}
        </>
      )}

      {operation === 'sendContact' && (
        <>
          {text('Phone Number', 'phoneNumber', { placeholder: '+15551234567' })}
          <div className="flex gap-3">
            <div className="flex-1">{text('First Name', 'firstName', { placeholder: 'Jane' })}</div>
            <div className="flex-1">{text('Last Name', 'lastName', { optional: true, placeholder: 'Doe' })}</div>
          </div>
        </>
      )}

      {operation === 'sendPoll' && (
        <>
          {text('Question', 'question', { placeholder: 'What do you think?' })}
          <Field label={<>Options <span className="text-neutral-700 normal-case tracking-normal">(one per line, min 2)</span></>}>
            <SmartVariableInput
              value={Array.isArray(config.options) ? config.options.join('\n') : (config.options || '')}
              onChange={(val) => updateConfig('options', typeof val === 'string' ? val.split('\n').filter(Boolean) : val)}
              placeholder={'Yes\nNo\nMaybe'}
              multiline
              nodeId={nodeId}
            />
          </Field>
          <ConfigToggleRow label="Anonymous" on={config.isAnonymous !== false} onChange={(v) => updateConfig('isAnonymous', v)} accentColor={ACCENT} />
          <ConfigToggleRow label="Multiple Answers" on={config.allowsMultiple} onChange={(v) => updateConfig('allowsMultiple', v)} accentColor={ACCENT} />
        </>
      )}

      {operation === 'sendDice' && (
        <Field label="Emoji">
          <div className="grid grid-cols-3 gap-1.5">
            {['🎲', '🎯', '🏀', '⚽', '🎳', '🎰'].map((e) => {
              const on = (config.emoji || '🎲') === e;
              return (
                <button key={e} type="button" onClick={() => updateConfig('emoji', e)}
                  className="bb-glow-border py-2 rounded-md border text-lg transition-colors"
                  style={on ? { backgroundColor: `${ACCENT}1f`, borderColor: `${ACCENT}66` } : { backgroundColor: '#0f0f0f', borderColor: '#2b2b2b' }}>{e}</button>
              );
            })}
          </div>
        </Field>
      )}

      {operation === 'sendMediaGroup' && (
        <Field label={<>Media items <span className="text-neutral-700 normal-case tracking-normal">(JSON array, 2–10)</span></>}>
          <SmartVariableInput
            value={typeof config.media === 'string' ? config.media : (config.media ? JSON.stringify(config.media, null, 2) : '')}
            onChange={(val) => updateConfig('media', val)}
            placeholder={'[{"type":"photo","media":"https://a.jpg"},{"type":"photo","media":"https://b.jpg"}]'}
            multiline
            nodeId={nodeId}
          />
        </Field>
      )}

      {(operation === 'copyMessage' || operation === 'forwardMessage') && (
        <>
          {text('From Chat ID', 'fromChatId', { placeholder: 'Source chat ID' })}
          {text('Message ID', 'messageId', { placeholder: 'e.g. 123456' })}
        </>
      )}

      {(operation === 'editMessage' || operation === 'deleteMessage' || operation === 'pinMessage' ||
        operation === 'editMessageCaption' || operation === 'setMessageReaction') && text('Message ID', 'messageId', { placeholder: 'e.g. 123456' })}
      {operation === 'unpinMessage' && text('Message ID', 'messageId', { optional: true, placeholder: 'blank = most recent pin' })}
      {operation === 'editMessage' && text('New Text', 'text', { placeholder: 'Updated message text...', multiline: true })}
      {operation === 'editMessageCaption' && text('New Caption', 'caption', { placeholder: 'Updated caption...', multiline: true })}

      {operation === 'setMessageReaction' && (
        <>
          <Field label="Reaction Emoji">
            <div className="grid grid-cols-6 gap-1.5">
              {['👍', '❤️', '🔥', '🎉', '👏', '😁'].map((e) => {
                const on = config.reactionEmoji === e;
                return (
                  <button key={e} type="button" onClick={() => updateConfig('reactionEmoji', e)}
                    className="bb-glow-border py-2 rounded-md border text-base transition-colors"
                    style={on ? { backgroundColor: `${ACCENT}1f`, borderColor: `${ACCENT}66` } : { backgroundColor: '#0f0f0f', borderColor: '#2b2b2b' }}>{e}</button>
                );
              })}
            </div>
          </Field>
          <ConfigToggleRow label="Big Reaction" on={config.bigReaction} onChange={(v) => updateConfig('bigReaction', v)} accentColor={ACCENT} />
        </>
      )}

      {operation === 'sendChatAction' && (
        <ConfigSelect
          label="Action"
          value={config.action || 'typing'}
          onChange={(val) => updateConfig('action', val)}
          options={CHAT_ACTIONS}
          accentColor={ACCENT}
        />
      )}

      {operation === 'getChatMember' && text('User ID', 'userId', { placeholder: 'Telegram user ID' })}
      {operation === 'setChatTitle' && text('New Title', 'title', { placeholder: 'Chat title' })}
      {operation === 'setChatDescription' && text('Description', 'description', { optional: true, placeholder: 'Chat description', multiline: true })}

      {operation === 'banChatMember' && (
        <>
          {text('User ID', 'userId', { placeholder: 'Telegram user ID' })}
          {text('Until (unix ts)', 'untilDate', { optional: true, placeholder: 'blank = permanent' })}
          <ConfigToggleRow label="Delete their messages" on={config.revokeMessages} onChange={(v) => updateConfig('revokeMessages', v)} accentColor={ACCENT} />
        </>
      )}
      {operation === 'unbanChatMember' && text('User ID', 'userId', { placeholder: 'Telegram user ID' })}

      {operation === 'restrictChatMember' && (
        <>
          {text('User ID', 'userId', { placeholder: 'Telegram user ID' })}
          <Field label="Permissions">
            <div className="flex flex-col gap-1.5">
              <ConfigToggleRow label="Send Messages" on={config.canSendMessages} onChange={(v) => updateConfig('canSendMessages', v)} accentColor={ACCENT} />
              <ConfigToggleRow label="Send Media" on={config.canSendMedia} onChange={(v) => updateConfig('canSendMedia', v)} accentColor={ACCENT} />
              <ConfigToggleRow label="Send Polls" on={config.canSendPolls} onChange={(v) => updateConfig('canSendPolls', v)} accentColor={ACCENT} />
              <ConfigToggleRow label="Add Previews" on={config.canAddPreviews} onChange={(v) => updateConfig('canAddPreviews', v)} accentColor={ACCENT} />
            </div>
          </Field>
        </>
      )}

      {operation === 'promoteChatMember' && (
        <>
          {text('User ID', 'userId', { placeholder: 'Telegram user ID' })}
          <Field label="Admin Rights">
            <div className="flex flex-col gap-1.5">
              <ConfigToggleRow label="Manage Chat" on={config.canManageChat} onChange={(v) => updateConfig('canManageChat', v)} accentColor={ACCENT} />
              <ConfigToggleRow label="Delete Messages" on={config.canDeleteMessages} onChange={(v) => updateConfig('canDeleteMessages', v)} accentColor={ACCENT} />
              <ConfigToggleRow label="Restrict Members" on={config.canRestrictMembers} onChange={(v) => updateConfig('canRestrictMembers', v)} accentColor={ACCENT} />
              <ConfigToggleRow label="Promote Members" on={config.canPromoteMembers} onChange={(v) => updateConfig('canPromoteMembers', v)} accentColor={ACCENT} />
              <ConfigToggleRow label="Change Info" on={config.canChangeInfo} onChange={(v) => updateConfig('canChangeInfo', v)} accentColor={ACCENT} />
              <ConfigToggleRow label="Invite Users" on={config.canInviteUsers} onChange={(v) => updateConfig('canInviteUsers', v)} accentColor={ACCENT} />
              <ConfigToggleRow label="Pin Messages" on={config.canPinMessages} onChange={(v) => updateConfig('canPinMessages', v)} accentColor={ACCENT} />
            </div>
          </Field>
        </>
      )}

      {operation === 'createInviteLink' && (
        <>
          {text('Name', 'inviteName', { optional: true, placeholder: 'e.g. Newsletter link' })}
          {text('Expire (unix ts)', 'expireDate', { optional: true, placeholder: 'blank = never' })}
          {text('Member Limit', 'memberLimit', { optional: true, placeholder: '0 = unlimited' })}
          <ConfigToggleRow label="Require Join Request" on={config.createsJoinRequest} onChange={(v) => updateConfig('createsJoinRequest', v)} accentColor={ACCENT} />
        </>
      )}
      {operation === 'revokeInviteLink' && text('Invite Link', 'inviteLink', { placeholder: 'https://t.me/+...' })}

      <CredentialPicker
        value={config.credentialId || ''}
        onChange={(id) => updateConfig('credentialId', id)}
        accentColor="indigo"
        label="Bot Token"
        placeholder="Select Telegram bot token..."
      />
    </ConfigSection>
  );
}
