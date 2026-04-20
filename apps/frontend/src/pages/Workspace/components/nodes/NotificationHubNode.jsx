import { useState } from "react";
import SmartVariableInput from "../../../../components/ui/SmartVariableInput";

const CHANNEL_TYPES = [
  { id: "slack", label: "Slack", color: "text-[#4A154B]", bg: "bg-[#4A154B]/10 border-[#4A154B]/40" },
  { id: "telegram", label: "Telegram", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/40" },
  { id: "discord", label: "Discord", color: "text-indigo-400", bg: "bg-indigo-500/10 border-indigo-500/40" },
  { id: "email", label: "Email (Resend)", color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/40" },
  { id: "sendgrid", label: "SendGrid", color: "text-blue-300", bg: "bg-blue-400/10 border-blue-400/40" },
  { id: "sms", label: "SMS (Twilio)", color: "text-green-400", bg: "bg-green-500/10 border-green-500/40" },
];

const PRIORITY_OPTIONS = [
  { id: "critical", label: "🔴 Critical" },
  { id: "normal", label: "🔵 Normal" },
  { id: "low", label: "⚪ Low" },
];

function ChannelCard({ ch, index, onChange, onRemove, accent }) {
  const updateField = (key, val) => onChange(index, { ...ch, [key]: val });

  return (
    <div className={`p-3 rounded-lg border flex flex-col gap-2 bg-[#0d0d0d] border-[#222]`}>
      <div className="flex items-center justify-between gap-2">
        <select
          value={ch.type || ""}
          onChange={(e) => updateField("type", e.target.value)}
          className="flex-1 bg-[#0a0a0a] border border-[#222] rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none"
        >
          <option value="">Select channel type...</option>
          {CHANNEL_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
        <label className="flex items-center gap-1 text-[10px] text-zinc-500 cursor-pointer">
          <input type="checkbox" checked={ch.enabled !== false} onChange={(e) => updateField("enabled", e.target.checked)} className="accent-amber-500" />
          On
        </label>
        <button onClick={() => onRemove(index)} className="text-zinc-600 hover:text-red-400 text-xs">✕</button>
      </div>

      <input
        value={ch.credentialId || ""}
        onChange={(e) => updateField("credentialId", e.target.value)}
        placeholder="Credential ID"
        className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg px-2 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500/30"
      />

      {ch.type === "slack" && (
        <input value={ch.channel || ""} onChange={(e) => updateField("channel", e.target.value)} placeholder="#general or @user" className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg px-2 py-1.5 text-xs text-white font-mono focus:outline-none" />
      )}
      {ch.type === "telegram" && (
        <input value={ch.chatId || ""} onChange={(e) => updateField("chatId", e.target.value)} placeholder="Chat ID (e.g. -100123456789)" className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg px-2 py-1.5 text-xs text-white font-mono focus:outline-none" />
      )}
      {ch.type === "discord" && (
        <input value={ch.webhookUrl || ""} onChange={(e) => updateField("webhookUrl", e.target.value)} placeholder="Discord webhook URL" className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg px-2 py-1.5 text-xs text-white font-mono focus:outline-none" />
      )}
      {(ch.type === "email" || ch.type === "sendgrid" || ch.type === "resend") && (
        <>
          <input value={ch.to || ""} onChange={(e) => updateField("to", e.target.value)} placeholder="To: user@email.com" className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg px-2 py-1.5 text-xs text-white font-mono focus:outline-none" />
          <input value={ch.from || ""} onChange={(e) => updateField("from", e.target.value)} placeholder="From: noreply@yourdomain.com" className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg px-2 py-1.5 text-xs text-white font-mono focus:outline-none" />
        </>
      )}
      {ch.type === "sms" && (
        <>
          <input value={ch.to || ""} onChange={(e) => updateField("to", e.target.value)} placeholder="To: +15551234567" className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg px-2 py-1.5 text-xs text-white font-mono focus:outline-none" />
          <input value={ch.phoneFrom || ""} onChange={(e) => updateField("phoneFrom", e.target.value)} placeholder="From: +15559876543 (Twilio #)" className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg px-2 py-1.5 text-xs text-white font-mono focus:outline-none" />
        </>
      )}
    </div>
  );
}

export default function NotificationHubNode({ config = {}, updateConfig, nodeId }) {
  const [showFallback, setShowFallback] = useState(false);
  const [showDedup, setShowDedup] = useState(false);
  const channels = Array.isArray(config.channels) ? config.channels : [];
  const fallbackChannels = Array.isArray(config.fallbackChannels) ? config.fallbackChannels : [];
  const priority = config.priority || "normal";

  const updateChannel = (i, val) => updateConfig("channels", channels.map((c, idx) => idx === i ? val : c));
  const addChannel = () => updateConfig("channels", [...channels, { type: "slack", enabled: true }]);
  const removeChannel = (i) => updateConfig("channels", channels.filter((_, idx) => idx !== i));

  const updateFallback = (i, val) => updateConfig("fallbackChannels", fallbackChannels.map((c, idx) => idx === i ? val : c));
  const addFallback = () => updateConfig("fallbackChannels", [...fallbackChannels, { type: "email", enabled: true }]);
  const removeFallback = (i) => updateConfig("fallbackChannels", fallbackChannels.filter((_, idx) => idx !== i));

  return (
    <div className="flex flex-col gap-5 w-full">
      <div className="flex items-center gap-3 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
        <div className="flex flex-col">
          <span className="text-sm font-bold text-amber-400">Notification Hub</span>
          <span className="text-[10px] text-zinc-500">Blast to ALL channels at once — Slack, Telegram, Email, SMS, Discord</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Priority</label>
        <div className="grid grid-cols-3 gap-2">
          {PRIORITY_OPTIONS.map((p) => (
            <button
              key={p.id}
              onClick={() => updateConfig("priority", p.id)}
              className={`py-2 rounded-lg border text-xs font-bold transition-all ${
                priority === p.id
                  ? "bg-amber-500/10 border-amber-500/40 text-amber-400"
                  : "bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Message</label>
        <SmartVariableInput
          value={config.message || ""}
          onChange={(v) => updateConfig("message", v)}
          placeholder="{{upstream.alertText}} or Alert: something happened"
          multiline
          nodeId={nodeId}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Subject (for email channels)</label>
        <SmartVariableInput
          value={config.subject || ""}
          onChange={(v) => updateConfig("subject", v)}
          placeholder="{{upstream.subject}} or Notification"
          nodeId={nodeId}
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Channels ({channels.length})</label>
          <button onClick={addChannel} className="text-[10px] text-amber-400 hover:text-amber-300 font-bold">+ Add Channel</button>
        </div>
        {channels.length === 0 && (
          <div className="p-3 rounded-lg border border-dashed border-[#333] text-center text-[10px] text-zinc-600">
            No channels yet — click + Add Channel
          </div>
        )}
        {channels.map((ch, i) => (
          <ChannelCard key={i} ch={ch} index={i} onChange={updateChannel} onRemove={removeChannel} />
        ))}
      </div>

      <button
        onClick={() => setShowFallback(!showFallback)}
        className="text-[10px] text-zinc-500 hover:text-zinc-300 text-left flex items-center gap-1"
      >
        <span>{showFallback ? "▼" : "▶"}</span> Fallback Channels (if all primary fail)
        {fallbackChannels.length > 0 && <span className="text-amber-400">({fallbackChannels.length})</span>}
      </button>

      {showFallback && (
        <div className="flex flex-col gap-2 pl-2 border-l border-[#222]">
          {fallbackChannels.map((ch, i) => (
            <ChannelCard key={i} ch={ch} index={i} onChange={updateFallback} onRemove={removeFallback} />
          ))}
          <button onClick={addFallback} className="text-[10px] text-amber-400 hover:text-amber-300 font-bold self-start">+ Add Fallback</button>
        </div>
      )}

      <button
        onClick={() => setShowDedup(!showDedup)}
        className="text-[10px] text-zinc-500 hover:text-zinc-300 text-left flex items-center gap-1"
      >
        <span>{showDedup ? "▼" : "▶"}</span> Deduplication Settings
      </button>

      {showDedup && (
        <div className="flex flex-col gap-3 pl-2 border-l border-[#222]">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Dedup Window (seconds, 0 = off)</label>
            <input
              type="number" min="0"
              value={config.dedupeWindowSeconds ?? 0}
              onChange={(e) => updateConfig("dedupeWindowSeconds", parseInt(e.target.value) || 0)}
              className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Custom Dedup Key</label>
            <SmartVariableInput
              value={config.dedupeKey || ""}
              onChange={(v) => updateConfig("dedupeKey", v)}
              placeholder="{{execution.id}} or leave blank for auto"
              nodeId={nodeId}
            />
          </div>
        </div>
      )}
    </div>
  );
}
