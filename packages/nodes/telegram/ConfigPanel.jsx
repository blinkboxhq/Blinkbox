import { useState, useEffect } from 'react';
import {
  Send, Hash, BellOff, Image, FileText, Film, Music, Mic, Sticker, MapPin,
  Building2, Contact, BarChart2, Dice5, Images, Copy, Forward, Pencil, Captions,
  Trash2, Pin, PinOff, Loader, Info, Users, UserCheck, Shield, Type, AlignLeft,
  LogOut, Ban, UserPlus, UserMinus, Lock, ArrowUpCircle, Link2, LinkIcon,
  Smile, Bot, ChevronDown,
} from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';
import CredentialPicker from '@/components/ui/CredentialPicker';

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

const lbl = 'text-[10px] font-bold text-zinc-500 uppercase tracking-widest';

function Field({ label, optional, children }) {
  return (
    <div className="flex flex-col gap-2">
      <label className={lbl}>
        {label} {optional && <span className="text-zinc-700">(optional)</span>}
      </label>
      {children}
    </div>
  );
}

function Toggle({ label, on, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2 rounded-lg border text-xs font-bold transition-all ${
        on ? 'bg-sky-500/10 border-sky-500/40 text-sky-400' : 'bg-[#0a0a0a] border-[#222] text-zinc-500'
      }`}
    >
      {label}
    </button>
  );
}

export default function TelegramNode({ config = {}, updateConfig, nodeId }) {
  const operation = resolveOperation(config);
  const currentOp = OPERATIONS.find((o) => o.value === operation);
  const [showPicker, setShowPicker] = useState(false);
  const CurrentIcon = currentOp?.icon || Send;
  const selectOp = (val) => { updateConfig('operation', val); setShowPicker(false); };

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
    <div className="flex flex-col gap-5 w-full">
      <div className="flex items-center gap-3 p-4 bg-sky-500/5 border border-sky-500/20 rounded-xl">
        <div className="p-2 bg-sky-500/10 border border-sky-500/20 rounded-lg text-sky-400 shrink-0">
          <Send className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-sky-400">Telegram</span>
          <span className="text-[10px] text-zinc-500 mt-0.5">Telegram Bot API</span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <label className={lbl}>Action</label>
        <button
          onClick={() => setShowPicker((v) => !v)}
          className="flex items-center gap-2.5 p-3 rounded-lg border border-sky-500/40 bg-sky-500/10 text-sky-400 text-xs font-bold transition-all hover:border-sky-500/60"
        >
          <CurrentIcon className="w-4 h-4 shrink-0" />
          <span className="flex-1 text-left">{currentOp?.label || 'Select action'}</span>
          <span className="text-[10px] font-medium text-sky-400/60">Change</span>
          <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${showPicker ? 'rotate-180' : ''}`} />
        </button>

        {showPicker && GROUPS.map((g) => (
          <div key={g} className="flex flex-col gap-1.5">
            <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">{g}</span>
            <div className="grid grid-cols-2 gap-2">
              {OPERATIONS.filter((o) => o.group === g).map((op) => {
                const Icon = op.icon;
                return (
                  <button
                    key={op.value}
                    onClick={() => selectOp(op.value)}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-bold transition-all ${
                      operation === op.value
                        ? 'bg-sky-500/10 border-sky-500/40 text-sky-400'
                        : 'bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" /> {op.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {!NO_CHAT_OPS.includes(operation) && (
        <Field label={<><Hash className="w-3.5 h-3.5 text-sky-400 inline" /> Chat ID</>}>
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
            <div className="flex flex-col gap-2 flex-1">
              <label className={lbl}>Format</label>
              <select
                value={config.parseMode || 'MarkdownV2'}
                onChange={(e) => updateConfig('parseMode', e.target.value)}
                className="bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-sky-500/50 cursor-pointer appearance-none"
              >
                <option value="MarkdownV2">Markdown</option>
                <option value="HTML">HTML</option>
                <option value="plain">Plain Text</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className={`${lbl} flex items-center gap-1`}><BellOff className="w-3 h-3" /> Silent</label>
              <Toggle label={config.silent ? 'On' : 'Off'} on={config.silent} onClick={() => updateConfig('silent', !config.silent)} />
            </div>
          </div>
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
          <Field label={<>Options <span className="text-zinc-700">(one per line, min 2)</span></>}>
            <SmartVariableInput
              value={Array.isArray(config.options) ? config.options.join('\n') : (config.options || '')}
              onChange={(val) => updateConfig('options', typeof val === 'string' ? val.split('\n').filter(Boolean) : val)}
              placeholder={'Yes\nNo\nMaybe'}
              multiline
              nodeId={nodeId}
            />
          </Field>
          <div className="flex gap-3">
            <Toggle label="Anonymous" on={config.isAnonymous !== false} onClick={() => updateConfig('isAnonymous', config.isAnonymous === false ? true : false)} />
            <Toggle label="Multi-Answer" on={config.allowsMultiple} onClick={() => updateConfig('allowsMultiple', !config.allowsMultiple)} />
          </div>
        </>
      )}

      {operation === 'sendDice' && (
        <Field label="Emoji">
          <div className="grid grid-cols-3 gap-2">
            {['🎲', '🎯', '🏀', '⚽', '🎳', '🎰'].map((e) => (
              <button key={e} onClick={() => updateConfig('emoji', e)} className={`py-2 rounded-lg border text-lg transition-all ${(config.emoji || '🎲') === e ? 'bg-sky-500/10 border-sky-500/40' : 'bg-[#0a0a0a] border-[#222]'}`}>{e}</button>
            ))}
          </div>
        </Field>
      )}

      {operation === 'sendMediaGroup' && (
        <Field label={<>Media items <span className="text-zinc-700">(JSON array, 2–10)</span></>}>
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
            <div className="grid grid-cols-6 gap-2">
              {['👍', '❤️', '🔥', '🎉', '👏', '😁'].map((e) => (
                <button key={e} onClick={() => updateConfig('reactionEmoji', e)} className={`py-2 rounded-lg border text-base transition-all ${config.reactionEmoji === e ? 'bg-sky-500/10 border-sky-500/40' : 'bg-[#0a0a0a] border-[#222]'}`}>{e}</button>
              ))}
            </div>
          </Field>
          <div className="flex gap-3"><Toggle label="Big Reaction" on={config.bigReaction} onClick={() => updateConfig('bigReaction', !config.bigReaction)} /></div>
        </>
      )}

      {operation === 'sendChatAction' && (
        <Field label="Action">
          <select
            value={config.action || 'typing'}
            onChange={(e) => updateConfig('action', e.target.value)}
            className="bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-sky-500/50 cursor-pointer appearance-none"
          >
            {['typing', 'upload_photo', 'record_video', 'upload_video', 'record_voice', 'upload_voice', 'upload_document', 'choose_sticker', 'find_location'].map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </Field>
      )}

      {operation === 'getChatMember' && text('User ID', 'userId', { placeholder: 'Telegram user ID' })}
      {operation === 'setChatTitle' && text('New Title', 'title', { placeholder: 'Chat title' })}
      {operation === 'setChatDescription' && text('Description', 'description', { optional: true, placeholder: 'Chat description', multiline: true })}

      {operation === 'banChatMember' && (
        <>
          {text('User ID', 'userId', { placeholder: 'Telegram user ID' })}
          {text('Until (unix ts)', 'untilDate', { optional: true, placeholder: 'blank = permanent' })}
          <div className="flex gap-3"><Toggle label="Delete their messages" on={config.revokeMessages} onClick={() => updateConfig('revokeMessages', !config.revokeMessages)} /></div>
        </>
      )}
      {operation === 'unbanChatMember' && text('User ID', 'userId', { placeholder: 'Telegram user ID' })}

      {operation === 'restrictChatMember' && (
        <>
          {text('User ID', 'userId', { placeholder: 'Telegram user ID' })}
          <Field label="Permissions">
            <div className="grid grid-cols-2 gap-2">
              <Toggle label="Send Messages" on={config.canSendMessages} onClick={() => updateConfig('canSendMessages', !config.canSendMessages)} />
              <Toggle label="Send Media" on={config.canSendMedia} onClick={() => updateConfig('canSendMedia', !config.canSendMedia)} />
              <Toggle label="Send Polls" on={config.canSendPolls} onClick={() => updateConfig('canSendPolls', !config.canSendPolls)} />
              <Toggle label="Add Previews" on={config.canAddPreviews} onClick={() => updateConfig('canAddPreviews', !config.canAddPreviews)} />
            </div>
          </Field>
        </>
      )}

      {operation === 'promoteChatMember' && (
        <>
          {text('User ID', 'userId', { placeholder: 'Telegram user ID' })}
          <Field label="Admin Rights">
            <div className="grid grid-cols-2 gap-2">
              <Toggle label="Manage Chat" on={config.canManageChat} onClick={() => updateConfig('canManageChat', !config.canManageChat)} />
              <Toggle label="Delete Msgs" on={config.canDeleteMessages} onClick={() => updateConfig('canDeleteMessages', !config.canDeleteMessages)} />
              <Toggle label="Restrict" on={config.canRestrictMembers} onClick={() => updateConfig('canRestrictMembers', !config.canRestrictMembers)} />
              <Toggle label="Promote" on={config.canPromoteMembers} onClick={() => updateConfig('canPromoteMembers', !config.canPromoteMembers)} />
              <Toggle label="Change Info" on={config.canChangeInfo} onClick={() => updateConfig('canChangeInfo', !config.canChangeInfo)} />
              <Toggle label="Invite Users" on={config.canInviteUsers} onClick={() => updateConfig('canInviteUsers', !config.canInviteUsers)} />
              <Toggle label="Pin Messages" on={config.canPinMessages} onClick={() => updateConfig('canPinMessages', !config.canPinMessages)} />
            </div>
          </Field>
        </>
      )}

      {operation === 'createInviteLink' && (
        <>
          {text('Name', 'inviteName', { optional: true, placeholder: 'e.g. Newsletter link' })}
          {text('Expire (unix ts)', 'expireDate', { optional: true, placeholder: 'blank = never' })}
          {text('Member Limit', 'memberLimit', { optional: true, placeholder: '0 = unlimited' })}
          <div className="flex gap-3"><Toggle label="Require Join Request" on={config.createsJoinRequest} onClick={() => updateConfig('createsJoinRequest', !config.createsJoinRequest)} /></div>
        </>
      )}
      {operation === 'revokeInviteLink' && text('Invite Link', 'inviteLink', { placeholder: 'https://t.me/+...' })}

      <CredentialPicker
        value={config.credentialId || ''}
        onChange={(id) => updateConfig('credentialId', id)}
        accentColor="sky"
        label="Bot Token"
        placeholder="Select Telegram bot token..."
      />
    </div>
  );
}
