import { useState } from "react";
import {
  MessageSquare, Layout, Pencil, Trash2, Clock, EyeOff, CornerDownRight, Link2,
  Upload, Smile, SmilePlus, List, PlusCircle, Archive, Tag, AlignLeft, FileText,
  UserPlus, UserMinus, LogIn, LogOut, Hash, History, Info, User, Users, Send,
  MessageCircle, Activity,
} from "lucide-react";
import SmartVariableInput from "@/components/ui/SmartVariableInput";
import OAuthConnectButton from "@/components/ui/OAuthConnectButton";
import CredentialPicker from "@/components/ui/CredentialPicker";

function SlackIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.124 2.521a2.528 2.528 0 0 1 2.52-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.52V8.834zm-1.271 0a2.528 2.528 0 0 1-2.521 2.521 2.528 2.528 0 0 1-2.521-2.521V2.522A2.528 2.528 0 0 1 15.166 0a2.528 2.528 0 0 1 2.521 2.522v6.312zm-2.521 10.124a2.528 2.528 0 0 1 2.521 2.52A2.528 2.528 0 0 1 15.166 24a2.528 2.528 0 0 1-2.521-2.522v-2.52h2.521zm0-1.271a2.528 2.528 0 0 1-2.521-2.521 2.528 2.528 0 0 1 2.521-2.521h6.312A2.528 2.528 0 0 1 24 15.166a2.528 2.528 0 0 1-2.522 2.521h-6.312z" />
    </svg>
  );
}

const OPERATIONS = [
  { value: 'postMessage',      label: 'Post Message',      icon: MessageSquare,   group: 'Messaging' },
  { value: 'postRichMessage',  label: 'Rich Message',      icon: Layout,          group: 'Messaging' },
  { value: 'updateMessage',    label: 'Update Message',    icon: Pencil,          group: 'Messaging' },
  { value: 'deleteMessage',    label: 'Delete Message',    icon: Trash2,          group: 'Messaging' },
  { value: 'scheduleMessage',  label: 'Schedule Message',  icon: Clock,           group: 'Messaging' },
  { value: 'postEphemeral',    label: 'Ephemeral Message', icon: EyeOff,          group: 'Messaging' },
  { value: 'replyInThread',    label: 'Reply in Thread',   icon: CornerDownRight, group: 'Messaging' },
  { value: 'getPermalink',     label: 'Get Permalink',     icon: Link2,           group: 'Messaging' },
  { value: 'uploadFile',       label: 'Upload File',       icon: Upload,          group: 'Messaging' },

  { value: 'addReaction',      label: 'Add Reaction',      icon: Smile,           group: 'Reactions' },
  { value: 'removeReaction',   label: 'Remove Reaction',   icon: SmilePlus,       group: 'Reactions' },
  { value: 'getReactions',     label: 'Get Reactions',     icon: List,            group: 'Reactions' },

  { value: 'createChannel',    label: 'Create Channel',    icon: PlusCircle,      group: 'Channels' },
  { value: 'archiveChannel',   label: 'Archive Channel',   icon: Archive,         group: 'Channels' },
  { value: 'renameChannel',    label: 'Rename Channel',    icon: Tag,             group: 'Channels' },
  { value: 'setTopic',         label: 'Set Topic',         icon: AlignLeft,       group: 'Channels' },
  { value: 'setPurpose',       label: 'Set Purpose',       icon: FileText,        group: 'Channels' },
  { value: 'inviteToChannel',  label: 'Invite to Channel', icon: UserPlus,        group: 'Channels' },
  { value: 'kickFromChannel',  label: 'Remove from Channel', icon: UserMinus,     group: 'Channels' },
  { value: 'joinChannel',      label: 'Join Channel',      icon: LogIn,           group: 'Channels' },
  { value: 'leaveChannel',     label: 'Leave Channel',     icon: LogOut,          group: 'Channels' },
  { value: 'listChannels',     label: 'List Channels',     icon: Hash,            group: 'Channels' },
  { value: 'getChannelHistory',label: 'Channel History',   icon: History,         group: 'Channels' },
  { value: 'getChannelInfo',   label: 'Channel Info',      icon: Info,            group: 'Channels' },

  { value: 'getUser',          label: 'Get User by Email', icon: User,            group: 'Users' },
  { value: 'getUserInfo',      label: 'Get User by ID',    icon: User,            group: 'Users' },
  { value: 'listUsers',        label: 'List Users',        icon: Users,           group: 'Users' },
  { value: 'openDM',           label: 'Open DM',           icon: MessageCircle,   group: 'Users' },
  { value: 'sendDM',           label: 'Send DM',           icon: Send,            group: 'Users' },
  { value: 'setStatus',        label: 'Set My Status',     icon: Activity,        group: 'Users' },
];

const GROUPS = ['Messaging', 'Reactions', 'Channels', 'Users'];

const CHANNEL_OPS = [
  'postMessage', 'postRichMessage', 'updateMessage', 'deleteMessage', 'scheduleMessage',
  'postEphemeral', 'replyInThread', 'getPermalink', 'uploadFile', 'addReaction',
  'removeReaction', 'getReactions', 'archiveChannel', 'renameChannel', 'setTopic',
  'setPurpose', 'inviteToChannel', 'kickFromChannel', 'joinChannel', 'leaveChannel',
  'getChannelHistory', 'getChannelInfo',
];

const lbl = "text-[10px] font-bold text-zinc-500 uppercase tracking-widest";
const inputCls = "w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E01E5A]/40 transition-colors";

export default function SlackNode({ config = {}, updateConfig, nodeId }) {
  const [authMode, setAuthMode] = useState(config.credentialId ? "oauth" : "webhook");
  const operation = config.operation || "postMessage";

  const isWebhookOp = operation === "postMessage" && authMode === "webhook";
  const needsChannel = CHANNEL_OPS.includes(operation) && !isWebhookOp;

  const Field = ({ label, optional, hint, children }) => (
    <div className="flex flex-col gap-2">
      <label className={lbl}>{label}{optional && <span className="text-zinc-700"> (optional)</span>}</label>
      {children}
      {hint && <p className="text-[10px] text-zinc-600">{hint}</p>}
    </div>
  );

  const SVI = ({ k, placeholder, multiline, alias }) => (
    <SmartVariableInput
      value={config[k] || (alias ? config[alias] : '') || ''}
      onChange={(val) => { updateConfig(k, val); if (alias) updateConfig(alias, val); }}
      placeholder={placeholder}
      multiline={multiline}
      nodeId={nodeId}
    />
  );

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-[#4A154B]/20 border border-[#4A154B]/40 rounded-xl">
        <div className="p-2 bg-[#4A154B]/30 rounded-lg text-[#E01E5A] shrink-0">
          <SlackIcon className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-[#ECB22E]">Slack</span>
          <span className="text-[10px] text-zinc-400">Slack Web API</span>
        </div>
      </div>

      {/* Operation picker, grouped */}
      <div className="flex flex-col gap-3">
        {GROUPS.map((grp) => (
          <div key={grp} className="flex flex-col gap-2">
            <label className={lbl}>{grp}</label>
            <div className="grid grid-cols-2 gap-2">
              {OPERATIONS.filter((o) => o.group === grp).map((op) => {
                const Icon = op.icon;
                return (
                  <button
                    key={op.value}
                    onClick={() => updateConfig('operation', op.value)}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-bold transition-all ${
                      operation === op.value
                        ? 'bg-[#E01E5A]/10 border-[#E01E5A]/40 text-[#ECB22E]'
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

      {/* Auth mode toggle (only relevant for postMessage) */}
      {operation === "postMessage" && (
        <div className="flex bg-[#0a0a0a] p-1 rounded-lg border border-[#222]">
          <button
            onClick={() => setAuthMode("oauth")}
            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
              authMode === "oauth" ? "bg-[#222] text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Bot Token
          </button>
          <button
            onClick={() => setAuthMode("webhook")}
            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
              authMode === "webhook" ? "bg-[#222] text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Webhook URL
          </button>
        </div>
      )}

      {/* Webhook URL (legacy postMessage only) */}
      {isWebhookOp && (
        <Field label="Webhook URL" hint="api.slack.com/apps → Incoming Webhooks">
          <SVI k="webhookUrl" placeholder="https://hooks.slack.com/services/T00/B00/xxx" />
        </Field>
      )}

      {/* Channel (shared) */}
      {needsChannel && (
        <Field label="Channel" hint="#general or C01ABCDEF">
          <SVI k="channel" placeholder="#general or C01ABCDEF" />
        </Field>
      )}

      {/* ── Messaging ─────────────────────────────────────────────── */}
      {operation === "postMessage" && (
        <Field label="Message">
          <SVI k="message" alias="text" multiline placeholder="New lead: {{trigger.data.name}} signed up!" />
        </Field>
      )}

      {operation === "postRichMessage" && (
        <>
          <Field label="Title" optional>
            <SVI k="title" placeholder="Alert: New signup" />
          </Field>
          <Field label="Body Text">
            <SVI k="text" multiline placeholder="*Name:* {{trigger.data.name}}" />
          </Field>
          <Field label="Button Label" optional>
            <SVI k="buttonLabel" placeholder="View in Dashboard" />
          </Field>
          {config.buttonLabel && (
            <Field label="Button URL">
              <SVI k="buttonUrl" placeholder="https://app.example.com/..." />
            </Field>
          )}
        </>
      )}

      {operation === "updateMessage" && (
        <>
          <Field label="Message Timestamp (ts)" hint="The ts of the message to update">
            <SVI k="timestamp" alias="ts" placeholder="{{previousNode.ts}}" />
          </Field>
          <Field label="New Message">
            <SVI k="message" alias="text" multiline placeholder="Updated content" />
          </Field>
        </>
      )}

      {operation === "deleteMessage" && (
        <Field label="Message Timestamp (ts)">
          <SVI k="timestamp" alias="ts" placeholder="{{previousNode.ts}}" />
        </Field>
      )}

      {operation === "scheduleMessage" && (
        <>
          <Field label="Message">
            <SVI k="message" alias="text" multiline placeholder="Reminder: standup in 5 min" />
          </Field>
          <Field label="Post At (Unix timestamp)" hint="Seconds since epoch, in the future">
            <SVI k="postAt" placeholder="1735689600" />
          </Field>
        </>
      )}

      {operation === "postEphemeral" && (
        <>
          <Field label="User ID" hint="Only this user sees the message">
            <SVI k="userId" placeholder="U01ABCDEF" />
          </Field>
          <Field label="Message">
            <SVI k="message" alias="text" multiline placeholder="Only you can see this" />
          </Field>
        </>
      )}

      {operation === "replyInThread" && (
        <>
          <Field label="Parent Message TS" hint="thread_ts of the message to reply under">
            <SVI k="threadTs" placeholder="{{previousNode.ts}}" />
          </Field>
          <Field label="Reply">
            <SVI k="message" alias="text" multiline placeholder="Thread reply" />
          </Field>
          <button
            onClick={() => updateConfig('broadcast', !config.broadcast)}
            className={`py-2 rounded-lg border text-xs font-bold transition-all ${
              config.broadcast ? 'bg-[#E01E5A]/10 border-[#E01E5A]/40 text-[#ECB22E]' : 'bg-[#0a0a0a] border-[#222] text-zinc-500'
            }`}
          >
            {config.broadcast ? 'Also send to channel' : 'Thread only'}
          </button>
        </>
      )}

      {operation === "getPermalink" && (
        <Field label="Message Timestamp (ts)">
          <SVI k="timestamp" alias="ts" placeholder="{{previousNode.ts}}" />
        </Field>
      )}

      {operation === "uploadFile" && (
        <>
          <Field label="File Name">
            <input
              value={config.filename || ''}
              onChange={(e) => updateConfig('filename', e.target.value)}
              placeholder="output.txt"
              className={inputCls}
            />
          </Field>
          <Field label="File Content">
            <SVI k="content" multiline placeholder="{{previousNode.result}}" />
          </Field>
        </>
      )}

      {/* ── Reactions ─────────────────────────────────────────────── */}
      {(operation === "addReaction" || operation === "removeReaction") && (
        <>
          <Field label="Emoji" hint="Without colons — e.g. thumbsup, rocket, white_check_mark">
            <SVI k="emoji" placeholder="thumbsup" />
          </Field>
          <Field label="Message Timestamp (ts)">
            <SVI k="timestamp" alias="ts" placeholder="{{previousNode.ts}}" />
          </Field>
        </>
      )}

      {operation === "getReactions" && (
        <Field label="Message Timestamp (ts)">
          <SVI k="timestamp" alias="ts" placeholder="{{previousNode.ts}}" />
        </Field>
      )}

      {/* ── Channels ──────────────────────────────────────────────── */}
      {operation === "createChannel" && (
        <>
          <Field label="Channel Name">
            <SVI k="channelName" placeholder="team-alerts" />
          </Field>
          <button
            onClick={() => updateConfig('isPrivate', !config.isPrivate)}
            className={`py-2 rounded-lg border text-xs font-bold transition-all ${
              config.isPrivate ? 'bg-[#E01E5A]/10 border-[#E01E5A]/40 text-[#ECB22E]' : 'bg-[#0a0a0a] border-[#222] text-zinc-500'
            }`}
          >
            {config.isPrivate ? 'Private Channel' : 'Public Channel'}
          </button>
        </>
      )}

      {operation === "renameChannel" && (
        <Field label="New Channel Name">
          <SVI k="channelName" placeholder="renamed-channel" />
        </Field>
      )}

      {operation === "setTopic" && (
        <Field label="Topic">
          <SVI k="topic" placeholder="Weekly standup at 10am" />
        </Field>
      )}

      {operation === "setPurpose" && (
        <Field label="Purpose">
          <SVI k="purpose" multiline placeholder="Channel for incident response" />
        </Field>
      )}

      {(operation === "inviteToChannel" || operation === "kickFromChannel") && (
        <Field label="User ID" hint="Comma-separate IDs to invite multiple (invite only)">
          <SVI k="userId" placeholder="U01ABCDEF" />
        </Field>
      )}

      {operation === "listChannels" && (
        <>
          <Field label="Channel Types" optional hint="Comma list: public_channel, private_channel, mpim, im">
            <input
              value={config.channelTypes || ''}
              onChange={(e) => updateConfig('channelTypes', e.target.value)}
              placeholder="public_channel,private_channel"
              className={inputCls}
            />
          </Field>
          <Field label="Limit" optional>
            <input
              type="number"
              value={config.limit || ''}
              onChange={(e) => updateConfig('limit', e.target.value)}
              placeholder="100"
              className={inputCls}
            />
          </Field>
          <button
            onClick={() => updateConfig('excludeArchived', config.excludeArchived === false ? true : false)}
            className={`py-2 rounded-lg border text-xs font-bold transition-all ${
              config.excludeArchived !== false ? 'bg-[#E01E5A]/10 border-[#E01E5A]/40 text-[#ECB22E]' : 'bg-[#0a0a0a] border-[#222] text-zinc-500'
            }`}
          >
            {config.excludeArchived !== false ? 'Exclude archived' : 'Include archived'}
          </button>
        </>
      )}

      {operation === "getChannelHistory" && (
        <Field label="Limit" optional hint="Most recent messages, max 1000">
          <input
            type="number"
            value={config.limit || ''}
            onChange={(e) => updateConfig('limit', e.target.value)}
            placeholder="50"
            className={inputCls}
          />
        </Field>
      )}

      {/* ── Users ─────────────────────────────────────────────────── */}
      {operation === "getUser" && (
        <Field label="User Email">
          <SVI k="email" placeholder="user@company.com" />
        </Field>
      )}

      {(operation === "getUserInfo" || operation === "openDM") && (
        <Field label="User ID">
          <SVI k="userId" placeholder="U01ABCDEF" />
        </Field>
      )}

      {operation === "sendDM" && (
        <>
          <Field label="User ID">
            <SVI k="userId" placeholder="U01ABCDEF" />
          </Field>
          <Field label="Message">
            <SVI k="message" alias="text" multiline placeholder="Direct message text" />
          </Field>
        </>
      )}

      {operation === "listUsers" && (
        <Field label="Limit" optional>
          <input
            type="number"
            value={config.limit || ''}
            onChange={(e) => updateConfig('limit', e.target.value)}
            placeholder="100"
            className={inputCls}
          />
        </Field>
      )}

      {operation === "setStatus" && (
        <>
          <Field label="Status Text">
            <SVI k="statusText" placeholder="In a meeting" />
          </Field>
          <Field label="Status Emoji" optional hint="With colons — e.g. :spiral_calendar_pad:">
            <SVI k="statusEmoji" placeholder=":calendar:" />
          </Field>
          <Field label="Expiration (Unix timestamp)" optional hint="0 = never expires">
            <SVI k="statusExpiration" placeholder="0" />
          </Field>
        </>
      )}

      {/* Credential (not needed for webhook mode) */}
      {!isWebhookOp && (
        <>
          <OAuthConnectButton
            provider="slack"
            providerLabel="Slack"
            accentColor="purple"
            value={config.credentialId || ""}
            onChange={(id) => updateConfig("credentialId", id)}
            icon={SlackIcon}
          />
          <p className="text-[10px] text-zinc-600 -mt-4">Or select an existing credential:</p>
          <CredentialPicker
            value={config.credentialId || ""}
            onChange={(id) => updateConfig("credentialId", id)}
            accentColor="purple"
            label="Slack Bot Token"
            placeholder="Select Slack credential..."
          />
        </>
      )}
    </div>
  );
}
