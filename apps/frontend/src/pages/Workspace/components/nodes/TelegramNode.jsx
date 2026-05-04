import { Send, Hash, BellOff, Image, FileText, BarChart2, Pencil, Trash2, Pin, Info } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';
import CredentialPicker from '../../../../components/ui/CredentialPicker';

const OPERATIONS = [
  { value: 'sendMessage',   label: 'Send Message',   icon: Send },
  { value: 'sendPhoto',     label: 'Send Photo',      icon: Image },
  { value: 'sendDocument',  label: 'Send Document',   icon: FileText },
  { value: 'sendPoll',      label: 'Send Poll',       icon: BarChart2 },
  { value: 'editMessage',   label: 'Edit Message',    icon: Pencil },
  { value: 'deleteMessage', label: 'Delete Message',  icon: Trash2 },
  { value: 'pinMessage',    label: 'Pin Message',     icon: Pin },
  { value: 'getChat',       label: 'Get Chat Info',   icon: Info },
];

export default function TelegramNode({ config = {}, updateConfig, nodeId }) {
  const operation = config.operation || 'sendMessage';

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-sky-500/5 border border-sky-500/20 rounded-xl">
        <div className="p-2 bg-sky-500/10 border border-sky-500/20 rounded-lg text-sky-400 shrink-0">
          <Send className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-sky-400">Telegram</span>
          <span className="text-[10px] text-zinc-500 mt-0.5">Telegram Bot API</span>
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

      {/* Chat ID — all ops need it */}
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

      {/* sendMessage */}
      {operation === 'sendMessage' && (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Message</label>
            <SmartVariableInput
              value={config.text || ''}
              onChange={(val) => updateConfig('text', val)}
              placeholder="Type your message... supports MarkdownV2"
              multiline
            />
          </div>
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
        </>
      )}

      {/* sendPhoto */}
      {operation === 'sendPhoto' && (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Photo URL</label>
            <SmartVariableInput
              value={config.photoUrl || ''}
              onChange={(val) => updateConfig('photoUrl', val)}
              placeholder="https://example.com/image.jpg"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Caption <span className="text-zinc-700">(optional)</span></label>
            <SmartVariableInput
              value={config.caption || ''}
              onChange={(val) => updateConfig('caption', val)}
              placeholder="Photo caption..."
              multiline
            />
          </div>
        </>
      )}

      {/* sendDocument */}
      {operation === 'sendDocument' && (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Document URL</label>
            <SmartVariableInput
              value={config.documentUrl || ''}
              onChange={(val) => updateConfig('documentUrl', val)}
              placeholder="https://example.com/file.pdf"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Caption <span className="text-zinc-700">(optional)</span></label>
            <SmartVariableInput
              value={config.caption || ''}
              onChange={(val) => updateConfig('caption', val)}
              placeholder="Document caption..."
            />
          </div>
        </>
      )}

      {/* sendPoll */}
      {operation === 'sendPoll' && (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Question</label>
            <SmartVariableInput
              value={config.question || ''}
              onChange={(val) => updateConfig('question', val)}
              placeholder="What do you think?"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Options <span className="text-zinc-700">(one per line, min 2)</span></label>
            <textarea
              value={Array.isArray(config.options) ? config.options.join('\n') : (config.options || '')}
              onChange={(e) => updateConfig('options', e.target.value.split('\n').filter(Boolean))}
              placeholder={"Yes\nNo\nMaybe"}
              rows={4}
              className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-sky-500/50 transition-colors resize-none"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => updateConfig('isAnonymous', !config.isAnonymous)}
              className={`flex-1 py-2 rounded-lg border text-xs font-bold transition-all ${
                config.isAnonymous !== false
                  ? 'bg-sky-500/10 border-sky-500/40 text-sky-400'
                  : 'bg-[#0a0a0a] border-[#222] text-zinc-500'
              }`}
            >
              Anonymous
            </button>
            <button
              onClick={() => updateConfig('allowsMultiple', !config.allowsMultiple)}
              className={`flex-1 py-2 rounded-lg border text-xs font-bold transition-all ${
                config.allowsMultiple
                  ? 'bg-sky-500/10 border-sky-500/40 text-sky-400'
                  : 'bg-[#0a0a0a] border-[#222] text-zinc-500'
              }`}
            >
              Multi-Answer
            </button>
          </div>
        </>
      )}

      {/* editMessage / deleteMessage / pinMessage — need messageId */}
      {(operation === 'editMessage' || operation === 'deleteMessage' || operation === 'pinMessage') && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Message ID</label>
          <SmartVariableInput
            value={config.messageId || ''}
            onChange={(val) => updateConfig('messageId', val)}
            placeholder="e.g. 123456"
          />
        </div>
      )}
      {operation === 'editMessage' && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">New Text</label>
          <SmartVariableInput
            value={config.text || ''}
            onChange={(val) => updateConfig('text', val)}
            placeholder="Updated message text..."
            multiline
          />
        </div>
      )}

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
