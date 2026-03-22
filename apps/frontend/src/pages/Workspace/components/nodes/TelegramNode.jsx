import { Send, Hash, BellOff } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';
import CredentialPicker from '../../../../components/ui/CredentialPicker';

export default function TelegramNode({ config = {}, updateConfig }) {
  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-sky-500/5 border border-sky-500/20 rounded-xl">
        <div className="p-2 bg-sky-500/10 border border-sky-500/20 rounded-lg text-sky-400 shrink-0">
          <Send className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-sky-400">Telegram</span>
          <span className="text-[10px] text-zinc-500 mt-0.5">Send messages via Bot API</span>
        </div>
      </div>

      {/* Chat ID */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
          <Hash className="w-3.5 h-3.5 text-sky-400" /> Chat ID
        </label>
        <SmartVariableInput
          value={config.chatId || ''}
          onChange={(val) => updateConfig('chatId', val)}
          placeholder="e.g. -1001234567890 or @channelname"
        />
      </div>

      {/* Message */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
          <Send className="w-3.5 h-3.5 text-sky-400" /> Message
        </label>
        <SmartVariableInput
          value={config.text || ''}
          onChange={(val) => updateConfig('text', val)}
          placeholder="Type your message... supports MarkdownV2"
          multiline
        />
      </div>

      {/* Parse Mode + Silent */}
      <div className="flex gap-3">
        <div className="flex flex-col gap-2 flex-1">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Format</label>
          <select
            value={config.parseMode || 'MarkdownV2'}
            onChange={(e) => updateConfig('parseMode', e.target.value)}
            className="bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-sky-500/50 transition-colors cursor-pointer appearance-none"
          >
            <option value="MarkdownV2">Markdown</option>
            <option value="HTML">HTML</option>
            <option value="plain">Plain Text</option>
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1">
            <BellOff className="w-3 h-3" /> Silent
          </label>
          <button
            onClick={() => updateConfig('silent', !config.silent)}
            className={`px-4 py-2 rounded-lg border text-xs font-bold transition-all ${
              config.silent
                ? 'bg-sky-500/10 border-sky-500/40 text-sky-400'
                : 'bg-[#0a0a0a] border-[#222] text-zinc-500'
            }`}
          >
            {config.silent ? 'On' : 'Off'}
          </button>
        </div>
      </div>

      {/* Credential */}
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
