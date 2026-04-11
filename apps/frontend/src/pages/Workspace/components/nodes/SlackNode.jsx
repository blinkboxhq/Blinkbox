import { useState } from "react";
import { MessageSquare, Layout, Upload, User, Hash, PlusCircle, Smile, AlignLeft } from "lucide-react";
import SmartVariableInput from "../../../../components/ui/SmartVariableInput";
import OAuthConnectButton from "../../../../components/ui/OAuthConnectButton";
import CredentialPicker from "../../../../components/ui/CredentialPicker";

function SlackIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.124 2.521a2.528 2.528 0 0 1 2.52-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.52V8.834zm-1.271 0a2.528 2.528 0 0 1-2.521 2.521 2.528 2.528 0 0 1-2.521-2.521V2.522A2.528 2.528 0 0 1 15.166 0a2.528 2.528 0 0 1 2.521 2.522v6.312zm-2.521 10.124a2.528 2.528 0 0 1 2.521 2.52A2.528 2.528 0 0 1 15.166 24a2.528 2.528 0 0 1-2.521-2.522v-2.52h2.521zm0-1.271a2.528 2.528 0 0 1-2.521-2.521 2.528 2.528 0 0 1 2.521-2.521h6.312A2.528 2.528 0 0 1 24 15.166a2.528 2.528 0 0 1-2.522 2.521h-6.312z" />
    </svg>
  );
}

const OPERATIONS = [
  { value: 'postMessage',     label: 'Post Message',     icon: MessageSquare },
  { value: 'postRichMessage', label: 'Rich Message',      icon: Layout },
  { value: 'uploadFile',      label: 'Upload File',       icon: Upload },
  { value: 'getUser',         label: 'Get User',          icon: User },
  { value: 'createChannel',   label: 'Create Channel',    icon: PlusCircle },
  { value: 'inviteToChannel', label: 'Invite to Channel', icon: Hash },
  { value: 'addReaction',     label: 'Add Reaction',      icon: Smile },
  { value: 'setTopic',        label: 'Set Topic',         icon: AlignLeft },
];

export default function SlackNode({ config = {}, updateConfig }) {
  const [authMode, setAuthMode] = useState(config.credentialId ? "oauth" : "webhook");
  const operation = config.operation || "postMessage";
  const message = config.message || config.text || "";
  const channel = config.channel || "";
  const webhookUrl = config.webhookUrl || "";

  const handleWebhookUrl = (val) => updateConfig("webhookUrl", val);
  const handleMessage = (val) => { updateConfig("message", val); updateConfig("text", val); };
  const handleChannel = (val) => updateConfig("channel", val);

  const needsChannel = ["postMessage", "postRichMessage", "uploadFile", "inviteToChannel", "setTopic", "addReaction"].includes(operation);
  const isWebhookOp = operation === "postMessage" && authMode === "webhook";

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-[#4A154B]/20 border border-[#4A154B]/40 rounded-xl">
        <div className="p-2 bg-[#4A154B]/30 rounded-lg text-[#E01E5A] shrink-0">
          <SlackIcon className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-[#ECB22E]">Slack</span>
          <span className="text-[10px] text-zinc-400">Slack Bot API</span>
        </div>
      </div>

      {/* Operation */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Operation</label>
        <div className="grid grid-cols-2 gap-2">
          {OPERATIONS.map((op) => {
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
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Webhook URL</label>
          <SmartVariableInput
            value={webhookUrl}
            onChange={handleWebhookUrl}
            placeholder="https://hooks.slack.com/services/T00/B00/xxx"
          />
          <p className="text-[10px] text-zinc-600">api.slack.com/apps → Incoming Webhooks</p>
        </div>
      )}

      {/* Channel */}
      {needsChannel && !isWebhookOp && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Channel</label>
          <SmartVariableInput
            value={channel}
            onChange={handleChannel}
            placeholder="#general or C01ABCDEF"
          />
        </div>
      )}

      {/* postMessage */}
      {operation === "postMessage" && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Message</label>
          <SmartVariableInput
            value={message}
            onChange={handleMessage}
            placeholder="New lead: {{trigger.data.name}} signed up!"
            multiline
          />
        </div>
      )}

      {/* postRichMessage */}
      {operation === "postRichMessage" && (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Title <span className="text-zinc-700">(optional)</span></label>
            <SmartVariableInput
              value={config.title || ''}
              onChange={(val) => updateConfig('title', val)}
              placeholder="Alert: New signup"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Body Text</label>
            <SmartVariableInput
              value={config.text || ''}
              onChange={(val) => updateConfig('text', val)}
              placeholder="*Name:* {{trigger.data.name}}\n*Email:* {{trigger.data.email}}"
              multiline
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Button Label <span className="text-zinc-700">(optional)</span></label>
            <SmartVariableInput
              value={config.buttonLabel || ''}
              onChange={(val) => updateConfig('buttonLabel', val)}
              placeholder="View in Dashboard"
            />
          </div>
          {config.buttonLabel && (
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Button URL</label>
              <SmartVariableInput
                value={config.buttonUrl || ''}
                onChange={(val) => updateConfig('buttonUrl', val)}
                placeholder="https://app.example.com/..."
              />
            </div>
          )}
        </>
      )}

      {/* uploadFile */}
      {operation === "uploadFile" && (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">File Name</label>
            <input
              value={config.filename || ''}
              onChange={(e) => updateConfig('filename', e.target.value)}
              placeholder="output.txt"
              className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E01E5A]/40 transition-colors"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">File Content</label>
            <SmartVariableInput
              value={config.content || ''}
              onChange={(val) => updateConfig('content', val)}
              placeholder="{{previousNode.result}}"
              multiline
            />
          </div>
        </>
      )}

      {/* getUser */}
      {operation === "getUser" && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">User Email</label>
          <SmartVariableInput
            value={config.email || ''}
            onChange={(val) => updateConfig('email', val)}
            placeholder="user@company.com"
          />
        </div>
      )}

      {/* createChannel */}
      {operation === "createChannel" && (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Channel Name</label>
            <SmartVariableInput
              value={config.channelName || ''}
              onChange={(val) => updateConfig('channelName', val)}
              placeholder="team-alerts"
            />
          </div>
          <button
            onClick={() => updateConfig('isPrivate', !config.isPrivate)}
            className={`py-2 rounded-lg border text-xs font-bold transition-all ${
              config.isPrivate
                ? 'bg-[#E01E5A]/10 border-[#E01E5A]/40 text-[#ECB22E]'
                : 'bg-[#0a0a0a] border-[#222] text-zinc-500'
            }`}
          >
            {config.isPrivate ? 'Private Channel' : 'Public Channel'}
          </button>
        </>
      )}

      {/* inviteToChannel */}
      {operation === "inviteToChannel" && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">User ID</label>
          <SmartVariableInput
            value={config.userId || ''}
            onChange={(val) => updateConfig('userId', val)}
            placeholder="U01ABCDEF"
          />
        </div>
      )}

      {/* addReaction */}
      {operation === "addReaction" && (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Emoji</label>
            <SmartVariableInput
              value={config.emoji || ''}
              onChange={(val) => updateConfig('emoji', val)}
              placeholder="thumbsup"
            />
            <p className="text-[10px] text-zinc-600">Without colons — e.g. thumbsup, rocket, white_check_mark</p>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Message Timestamp (ts)</label>
            <SmartVariableInput
              value={config.timestamp || ''}
              onChange={(val) => updateConfig('timestamp', val)}
              placeholder="{{previousNode.messageId}}"
            />
          </div>
        </>
      )}

      {/* setTopic */}
      {operation === "setTopic" && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Topic</label>
          <SmartVariableInput
            value={config.topic || ''}
            onChange={(val) => updateConfig('topic', val)}
            placeholder="Weekly standup at 10am"
          />
        </div>
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
