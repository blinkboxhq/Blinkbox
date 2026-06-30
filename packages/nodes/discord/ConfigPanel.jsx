import {
  MessageSquare, Layout, FileText, Send, Pencil, Trash2, List, Pin, PinOff,
  Smile, SmilePlus, GitBranch, PlusCircle, Hash, Info, UserPlus, UserMinus,
  UserX, ShieldOff, User, Users, Server, Shield,
} from "lucide-react";
import SmartVariableInput from "@/components/ui/SmartVariableInput";
import CredentialPicker from "@/components/ui/CredentialPicker";

function DiscordIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

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

const GROUPS = ['Webhook', 'Messages', 'Channels', 'Members'];
const WEBHOOK_OPS = ['sendMessage', 'sendEmbed', 'sendFile'];
const GUILD_OPS = ['createChannel', 'listChannels', 'addRole', 'removeRole', 'kickMember', 'banMember', 'unbanMember', 'getMember', 'listMembers', 'getGuild', 'listRoles'];
const CHANNEL_ID_OPS = ['botSendMessage', 'editMessage', 'deleteMessage', 'getMessages', 'pinMessage', 'unpinMessage', 'addReaction', 'removeReaction', 'createThread', 'getChannel'];
const MESSAGE_ID_OPS = ['editMessage', 'deleteMessage', 'pinMessage', 'unpinMessage', 'addReaction', 'removeReaction'];
const USER_ID_OPS = ['addRole', 'removeRole', 'kickMember', 'banMember', 'unbanMember', 'getMember'];
const ROLE_ID_OPS = ['addRole', 'removeRole'];

const lbl = "text-[10px] font-bold text-zinc-500 uppercase tracking-widest";
const inputCls = "w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#5865F2]/50 transition-colors";

export default function DiscordNode({ config = {}, updateConfig, nodeId }) {
  const operation = config.operation || "sendMessage";
  const fields = Array.isArray(config.fields) ? config.fields : [];
  const isWebhook = WEBHOOK_OPS.includes(operation);
  const isEmbedCapable = operation === "sendEmbed" || operation === "botSendMessage";

  const addField = () => updateConfig('fields', [...fields, { name: '', value: '', inline: true }]);
  const removeField = (i) => updateConfig('fields', fields.filter((_, idx) => idx !== i));
  const updateField = (i, key, val) => updateConfig('fields', fields.map((f, idx) => idx === i ? { ...f, [key]: val } : f));

  const Field = ({ label, optional, hint, children }) => (
    <div className="flex flex-col gap-2">
      <label className={lbl}>{label}{optional && <span className="text-zinc-700"> (optional)</span>}</label>
      {children}
      {hint && <p className="text-[10px] text-zinc-600">{hint}</p>}
    </div>
  );

  const SVI = ({ k, placeholder, multiline }) => (
    <SmartVariableInput value={config[k] || ""} onChange={(val) => updateConfig(k, val)} placeholder={placeholder} multiline={multiline} nodeId={nodeId} />
  );

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-[#5865F2]/10 border border-[#5865F2]/30 rounded-xl">
        <div className="p-2 bg-[#5865F2]/20 rounded-lg text-[#5865F2] shrink-0">
          <DiscordIcon className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-[#5865F2]">Discord</span>
          <span className="text-[10px] text-zinc-400">{isWebhook ? "Discord Webhook" : "Discord Bot API"}</span>
        </div>
      </div>

      {/* Operation picker, grouped */}
      <div className="flex flex-col gap-3">
        {GROUPS.map((grp) => (
          <div key={grp} className="flex flex-col gap-2">
            <label className={lbl}>{grp}</label>
            <div className="grid grid-cols-3 gap-2">
              {OPERATIONS.filter((o) => o.group === grp).map((op) => {
                const Icon = op.icon;
                return (
                  <button
                    key={op.value}
                    onClick={() => updateConfig('operation', op.value)}
                    className={`flex flex-col items-center gap-1.5 p-2.5 rounded-lg border text-[11px] font-bold text-center transition-all ${
                      operation === op.value
                        ? 'bg-[#5865F2]/10 border-[#5865F2]/40 text-[#5865F2]'
                        : 'bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" /> {op.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Credential — webhook vs bot token */}
      {isWebhook ? (
        <Field label="Discord Webhook Credential" hint="Create a credential with your Webhook URL — Server Settings → Integrations → Webhooks">
          <CredentialPicker
            value={config.credentialId || ""}
            onChange={(val) => updateConfig("credentialId", val)}
            accentColor="#5865F2"
            placeholder="Select Discord webhook credential…"
          />
        </Field>
      ) : (
        <Field label="Discord Bot Token Credential" hint="Bot token from discord.com/developers → your app → Bot. Invite the bot to your server with the needed permissions.">
          <CredentialPicker
            value={config.credentialId || ""}
            onChange={(val) => updateConfig("credentialId", val)}
            accentColor="#5865F2"
            label="Discord Bot Token"
            placeholder="Select Discord Bot Token credential…"
          />
        </Field>
      )}

      {/* Bot name override (webhook ops only) */}
      {isWebhook && (
        <Field label="Bot Name" optional>
          <input value={config.username || ""} onChange={(e) => updateConfig("username", e.target.value)} placeholder="BlinkBox Bot" className={inputCls} />
        </Field>
      )}

      {/* ── Shared bot identifiers ── */}
      {GUILD_OPS.includes(operation) && (
        <Field label="Server (Guild) ID" hint="Enable Developer Mode → right-click server → Copy Server ID">
          <SVI k="guildId" placeholder="123456789012345678" />
        </Field>
      )}
      {CHANNEL_ID_OPS.includes(operation) && (
        <Field label="Channel ID" hint="Right-click channel → Copy Channel ID">
          <SVI k="channelId" placeholder="123456789012345678" />
        </Field>
      )}
      {MESSAGE_ID_OPS.includes(operation) && (
        <Field label="Message ID">
          <SVI k="messageId" placeholder="{{previousNode.messageId}}" />
        </Field>
      )}
      {USER_ID_OPS.includes(operation) && (
        <Field label="User ID">
          <SVI k="userId" placeholder="123456789012345678" />
        </Field>
      )}
      {ROLE_ID_OPS.includes(operation) && (
        <Field label="Role ID">
          <SVI k="roleId" placeholder="123456789012345678" />
        </Field>
      )}

      {/* ── Webhook: sendMessage / Bot: botSendMessage ── */}
      {(operation === "sendMessage" || operation === "botSendMessage" || operation === "editMessage") && (
        <Field label="Message" hint="Max 2000 characters. Supports Discord markdown.">
          <SVI k="message" multiline placeholder="Alert: {{trigger.data.event}} just happened!" />
        </Field>
      )}

      {/* ── Embed builder (sendEmbed + botSendMessage) ── */}
      {isEmbedCapable && (
        <>
          <Field label="Embed Title" optional>
            <SVI k="title" placeholder="New Event" />
          </Field>
          <Field label="Embed Description" optional>
            <SVI k="description" multiline placeholder="Something happened you should know about..." />
          </Field>
          <div className="flex gap-3">
            <div className="flex flex-col gap-2 flex-1">
              <label className={lbl}>Color</label>
              <input type="color" value={config.color || "#5865F2"} onChange={(e) => updateConfig("color", e.target.value)} className="w-full h-9 rounded-lg border border-[#222] bg-[#0a0a0a] cursor-pointer" />
            </div>
            <div className="flex flex-col gap-2 flex-1">
              <label className={lbl}>Thumbnail URL <span className="text-zinc-700">(opt)</span></label>
              <SVI k="thumbnailUrl" placeholder="https://..." />
            </div>
          </div>

          <div className="flex flex-col gap-3 bg-[#0a0a0a] p-4 border border-[#222] rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-300 uppercase tracking-widest">Embed Fields</span>
              <button onClick={addField} className="flex items-center gap-1 text-[10px] font-bold text-[#5865F2] hover:text-blue-400 uppercase">
                <PlusCircle className="w-3 h-3" /> Add
              </button>
            </div>
            {fields.length === 0 ? (
              <p className="text-xs text-zinc-600 text-center py-2">No fields. Click Add to create key-value pairs.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {fields.map((f, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input value={f.name} onChange={(e) => updateField(i, 'name', e.target.value)} placeholder="Field name" className="w-1/3 bg-[#111] border border-[#333] rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-[#5865F2]/50" />
                    <SmartVariableInput value={f.value} onChange={(val) => updateField(i, 'value', val)} placeholder="Value" nodeId={nodeId} />
                    <button onClick={() => updateField(i, 'inline', !f.inline)} className={`px-2 py-1.5 rounded text-[10px] font-bold border shrink-0 ${f.inline ? 'bg-[#5865F2]/10 border-[#5865F2]/40 text-[#5865F2]' : 'border-[#222] text-zinc-600'}`}>Inline</button>
                    <button onClick={() => removeField(i)} className="p-1 text-zinc-600 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {operation === "sendEmbed" && (
            <Field label="Footer Text" optional>
              <SVI k="footerText" placeholder="Sent by BlinkBox" />
            </Field>
          )}
        </>
      )}

      {/* ── Webhook: sendFile ── */}
      {operation === "sendFile" && (
        <>
          <Field label="File Name">
            <input value={config.filename || ""} onChange={(e) => updateConfig("filename", e.target.value)} placeholder="output.txt" className={inputCls} />
          </Field>
          <Field label="File Content">
            <SVI k="content" multiline placeholder="{{previousNode.result}}" />
          </Field>
          <Field label="Message" optional>
            <SVI k="message" placeholder="Here's the file you requested" />
          </Field>
        </>
      )}

      {/* ── Reactions ── */}
      {(operation === "addReaction" || operation === "removeReaction") && (
        <Field label="Emoji" hint="A unicode emoji (👍) or custom name:id">
          <SVI k="emoji" placeholder="👍" />
        </Field>
      )}

      {/* ── createThread ── */}
      {operation === "createThread" && (
        <>
          <Field label="Thread Name">
            <SVI k="threadName" placeholder="Discussion" />
          </Field>
          <Field label="Anchor Message ID" optional hint="Leave blank for a standalone thread">
            <SVI k="messageId" placeholder="{{previousNode.messageId}}" />
          </Field>
        </>
      )}

      {/* ── getMessages / listMembers limit ── */}
      {(operation === "getMessages" || operation === "listMembers") && (
        <Field label="Limit" optional>
          <input type="number" value={config.limit || ""} onChange={(e) => updateConfig("limit", e.target.value)} placeholder={operation === "getMessages" ? "50" : "100"} className={inputCls} />
        </Field>
      )}

      {/* ── createChannel ── */}
      {operation === "createChannel" && (
        <>
          <Field label="Channel Name">
            <SVI k="channelName" placeholder="general" />
          </Field>
          <Field label="Channel Type" optional hint="0 = Text, 2 = Voice, 4 = Category, 5 = Announcement">
            <input type="number" value={config.channelType ?? ""} onChange={(e) => updateConfig("channelType", e.target.value)} placeholder="0" className={inputCls} />
          </Field>
          <Field label="Topic" optional>
            <SVI k="topic" placeholder="Channel topic" />
          </Field>
        </>
      )}

      {/* ── banMember ── */}
      {operation === "banMember" && (
        <Field label="Delete Message History (seconds)" optional hint="0–604800. Deletes the banned user's recent messages.">
          <input type="number" value={config.deleteMessageSeconds || ""} onChange={(e) => updateConfig("deleteMessageSeconds", e.target.value)} placeholder="0" className={inputCls} />
        </Field>
      )}
    </div>
  );
}
