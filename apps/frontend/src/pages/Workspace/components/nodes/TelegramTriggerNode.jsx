import { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Plus, Copy, Check, Info } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { API_URL } from '../../../../lib/api';
import imgTelegram from '../../../../assets/telegram.png';

const UPDATE_TYPES = [
  { value: 'message',           label: 'Message',           desc: 'New message in chat' },
  { value: 'edited_message',    label: 'Edited Message',    desc: 'User edited a message' },
  { value: 'channel_post',      label: 'Channel Post',      desc: 'New post in a channel' },
  { value: 'callback_query',    label: 'Button Click',      desc: 'Inline keyboard button pressed' },
  { value: 'inline_query',      label: 'Inline Query',      desc: 'User types in inline mode' },
  { value: 'my_chat_member',    label: 'Bot Status Changed',desc: 'Bot added to / removed from chat' },
];

export default function TelegramTriggerNode({ config = {}, updateConfig, selected }) {
  const { id: automationId } = useParams();
  const [activeTab, setActiveTab] = useState('setup');
  const [copied, setCopied] = useState(false);

  const webhookUrl = `${API_URL}/webhook/${automationId}`;
  const selectedTypes = config.updateTypes || ['message'];

  const copy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const toggleType = (val) => {
    const updated = selectedTypes.includes(val)
      ? selectedTypes.filter((t) => t !== val)
      : [...selectedTypes, val];
    updateConfig?.('updateTypes', updated.length ? updated : ['message']);
  };

  return (
    <div className={`relative flex flex-col w-[280px] bg-[#0A0A0A] rounded-xl border transition-colors shadow-2xl font-sans group ${selected ? 'border-[#26A5E4]/50' : 'border-[#2A2A2A]'}`}>
      <Handle id="output" type="source" position={Position.Right}
        className="!w-5 !h-5 !flex items-center justify-center !bg-[#111111] !border !border-[#2A2A2A] !rounded-full !opacity-0 group-hover:!opacity-100 transition-all hover:!bg-[#26A5E4] hover:!border-[#26A5E4] text-zinc-500 hover:text-white shadow-xl z-50 cursor-crosshair"
        style={{ top: '20px', right: '-10px', transform: 'translateY(-50%)' }}>
        <Plus className="w-3 h-3 pointer-events-none" />
      </Handle>

      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#2A2A2A] bg-[#111111] rounded-t-xl">
        <div className="p-1 bg-[#222] rounded-md border border-[#333]">
          <img src={imgTelegram} className="w-3 h-3 object-contain" alt="Telegram" />
        </div>
        <span className="text-[11px] font-semibold text-zinc-200 tracking-wide">Telegram</span>
        <span className="ml-auto text-[9px] font-bold text-[#26A5E4] bg-[#26A5E4]/10 border border-[#26A5E4]/20 px-1.5 py-0.5 rounded">TRIGGER</span>
      </div>

      <div className="flex bg-[#0a0a0a] px-3 pt-2 gap-3 border-b border-[#1a1a1a]">
        {['setup', 'events', 'payload'].map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`pb-2 text-[9px] font-bold uppercase tracking-widest border-b-2 transition-all ${activeTab === tab ? 'border-[#26A5E4] text-[#26A5E4]' : 'border-transparent text-zinc-600 hover:text-zinc-400'}`}>
            {tab}
          </button>
        ))}
      </div>

      <div className="p-3 flex flex-col gap-3">
        {activeTab === 'setup' && (
          <>
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Webhook URL</label>
              <div className="flex items-center gap-1.5 bg-[#111] border border-[#222] rounded-lg px-2.5 py-2">
                <span className="flex-1 text-[10px] text-zinc-400 font-mono truncate select-all">{webhookUrl}</span>
                <button onClick={() => copy(webhookUrl)} className="p-0.5 text-zinc-600 hover:text-zinc-300 transition-colors shrink-0">
                  {copied ? <Check className="w-3 h-3 text-[#26A5E4]" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
              <p className="text-[9px] text-zinc-600 leading-relaxed">
                Register this URL via <span className="font-mono text-zinc-500">setWebhook</span> in the Telegram Bot API.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Bot Token</label>
              <input type="password" value={config.botToken || ''}
                onChange={(e) => updateConfig?.('botToken', e.target.value)}
                placeholder="123456:ABC-DEF1234…"
                className="w-full bg-[#111] border border-[#222] rounded-md px-2.5 py-1.5 text-xs text-zinc-300 font-mono focus:outline-none focus:border-[#26A5E4]/50 transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Secret Token (optional)</label>
              <input type="password" value={config.telegramSecretToken || ''}
                onChange={(e) => updateConfig?.('telegramSecretToken', e.target.value)}
                placeholder="Random string for request verification"
                className="w-full bg-[#111] border border-[#222] rounded-md px-2.5 py-1.5 text-xs text-zinc-300 font-mono focus:outline-none focus:border-[#26A5E4]/50 transition-colors"
              />
              <p className="text-[9px] text-zinc-600">BlinkBox verifies the <span className="font-mono text-zinc-500">X-Telegram-Bot-Api-Secret-Token</span> header.</p>
            </div>

            <div className="p-2.5 bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg">
              <p className="text-[9px] text-zinc-600 leading-relaxed">
                Register webhook: <span className="font-mono text-[10px] text-zinc-500">POST https://api.telegram.org/bot&lt;TOKEN&gt;/setWebhook</span> with <span className="font-mono text-zinc-500">url</span> and optional <span className="font-mono text-zinc-500">secret_token</span>.
              </p>
            </div>
          </>
        )}

        {activeTab === 'events' && (
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Allowed Updates</label>
            <div className="flex flex-col gap-1">
              {UPDATE_TYPES.map(({ value, label, desc }) => {
                const on = selectedTypes.includes(value);
                return (
                  <button key={value} onClick={() => toggleType(value)}
                    className={`flex items-start gap-2.5 px-2.5 py-2 rounded-lg border text-left transition-all ${on ? 'bg-[#26A5E4]/10 border-[#26A5E4]/30' : 'bg-[#0d0d0d] border-[#1a1a1a] hover:border-[#2a2a2a]'}`}>
                    <div className={`w-3.5 h-3.5 rounded border mt-0.5 shrink-0 flex items-center justify-center transition-all ${on ? 'bg-[#26A5E4] border-[#26A5E4]' : 'border-zinc-600'}`}>
                      {on && <div className="w-1.5 h-1 bg-white rounded-sm" />}
                    </div>
                    <div>
                      <span className={`text-[10px] font-semibold block ${on ? 'text-zinc-200' : 'text-zinc-500'}`}>{label}</span>
                      <span className="text-[9px] text-zinc-600">{desc}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'payload' && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Info className="w-3 h-3 text-zinc-600" />
              <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Available in workflow as</span>
            </div>
            <div className="flex flex-col gap-1 p-2.5 bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg">
              {[
                ['$trigger.body.message.text', 'Message text content'],
                ['$trigger.body.message.from.id', 'Sender user ID'],
                ['$trigger.body.message.from.username', 'Sender username'],
                ['$trigger.body.message.from.first_name', 'Sender first name'],
                ['$trigger.body.message.chat.id', 'Chat ID (use for replies)'],
                ['$trigger.body.message.chat.type', '"private", "group", "supergroup", "channel"'],
                ['$trigger.body.message.photo', 'Photo array (if photo sent)'],
                ['$trigger.body.message.document', 'Document object (if file sent)'],
                ['$trigger.body.callback_query.data', 'Button payload (inline keyboards)'],
              ].map(([key, desc]) => (
                <div key={key} className="flex items-baseline gap-2">
                  <span className="text-[10px] font-mono text-[#26A5E4] shrink-0">{key}</span>
                  <span className="text-[9px] text-zinc-600">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
