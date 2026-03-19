import { useState } from "react";
import SmartVariableInput from "../../../../components/ui/SmartVariableInput";

function SlackIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.124 2.521a2.528 2.528 0 0 1 2.52-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.52V8.834zm-1.271 0a2.528 2.528 0 0 1-2.521 2.521 2.528 2.528 0 0 1-2.521-2.521V2.522A2.528 2.528 0 0 1 15.166 0a2.528 2.528 0 0 1 2.521 2.522v6.312zm-2.521 10.124a2.528 2.528 0 0 1 2.521 2.52A2.528 2.528 0 0 1 15.166 24a2.528 2.528 0 0 1-2.521-2.522v-2.52h2.521zm0-1.271a2.528 2.528 0 0 1-2.521-2.521 2.528 2.528 0 0 1 2.521-2.521h6.312A2.528 2.528 0 0 1 24 15.166a2.528 2.528 0 0 1-2.522 2.521h-6.312z" />
    </svg>
  );
}

export default function SlackNode({ config = {}, updateConfig }) {
  const webhookUrl = config.webhookUrl || "";
  const message = config.message || "";
  const channel = config.channel || "";

  // Sync user-friendly fields → HTTP request config
  const syncHttp = (newWebhookUrl, newMessage, newChannel) => {
    updateConfig("url", newWebhookUrl);
    updateConfig("method", "POST");
    updateConfig("headers", { "Content-Type": "application/json" });
    const body = {};
    if (newMessage) body.text = newMessage;
    if (newChannel) body.channel = newChannel;
    updateConfig("body", JSON.stringify(body));
  };

  const handleWebhookUrl = (val) => {
    updateConfig("webhookUrl", val);
    syncHttp(val, message, channel);
  };

  const handleMessage = (val) => {
    updateConfig("message", val);
    syncHttp(webhookUrl, val, channel);
  };

  const handleChannel = (val) => {
    updateConfig("channel", val);
    syncHttp(webhookUrl, message, val);
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-[#4A154B]/20 border border-[#4A154B]/40 rounded-xl">
        <div className="p-2 bg-[#4A154B]/30 rounded-lg text-[#E01E5A] shrink-0">
          <SlackIcon className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-[#ECB22E]">Send Slack Message</span>
          <span className="text-[10px] text-zinc-400 leading-relaxed">
            Post a message to any Slack channel via Incoming Webhook.
          </span>
        </div>
      </div>

      {/* Webhook URL */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
          Webhook URL
        </label>
        <SmartVariableInput
          value={webhookUrl}
          onChange={handleWebhookUrl}
          placeholder="https://hooks.slack.com/services/T00/B00/xxx"
        />
        <p className="text-[10px] text-zinc-600">
          Create one at <span className="text-zinc-400">api.slack.com/apps</span> → Incoming Webhooks
        </p>
      </div>

      {/* Channel (optional override) */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
          Channel Override <span className="text-zinc-700">(optional)</span>
        </label>
        <input
          value={channel}
          onChange={(e) => handleChannel(e.target.value)}
          placeholder="#general"
          className="w-full bg-[#0a0a0a] border border-[#222] rounded-xl px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-[#4A154B]/60 transition-colors"
        />
      </div>

      {/* Message */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
          Message
        </label>
        <SmartVariableInput
          value={message}
          onChange={handleMessage}
          placeholder="New lead: {{trigger.data.name}} signed up!"
          multiline
        />
      </div>
    </div>
  );
}
