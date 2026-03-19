import SmartVariableInput from "../../../../components/ui/SmartVariableInput";

function DiscordIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

export default function DiscordNode({ config = {}, updateConfig }) {
  const webhookUrl = config.webhookUrl || "";
  const message = config.message || "";
  const username = config.username || "";

  const syncHttp = (newUrl, newMessage, newUsername) => {
    updateConfig("url", newUrl);
    updateConfig("method", "POST");
    updateConfig("headers", { "Content-Type": "application/json" });
    const body = {};
    if (newMessage) body.content = newMessage;
    if (newUsername) body.username = newUsername;
    updateConfig("body", JSON.stringify(body));
  };

  const handleWebhookUrl = (val) => {
    updateConfig("webhookUrl", val);
    syncHttp(val, message, username);
  };

  const handleMessage = (val) => {
    updateConfig("message", val);
    syncHttp(webhookUrl, val, username);
  };

  const handleUsername = (val) => {
    updateConfig("username", val);
    syncHttp(webhookUrl, message, val);
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-[#5865F2]/10 border border-[#5865F2]/30 rounded-xl">
        <div className="p-2 bg-[#5865F2]/20 rounded-lg text-[#5865F2] shrink-0">
          <DiscordIcon className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-[#5865F2]">Send Discord Message</span>
          <span className="text-[10px] text-zinc-400 leading-relaxed">
            Post a message to any Discord channel via webhook.
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
          placeholder="https://discord.com/api/webhooks/..."
        />
        <p className="text-[10px] text-zinc-600">
          Server Settings → Integrations → Webhooks → New Webhook
        </p>
      </div>

      {/* Bot Username Override */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
          Bot Name <span className="text-zinc-700">(optional)</span>
        </label>
        <input
          value={username}
          onChange={(e) => handleUsername(e.target.value)}
          placeholder="BlinkBox Bot"
          className="w-full bg-[#0a0a0a] border border-[#222] rounded-xl px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-[#5865F2]/50 transition-colors"
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
          placeholder="Alert: {{trigger.data.event}} just happened!"
          multiline
        />
      </div>
    </div>
  );
}
