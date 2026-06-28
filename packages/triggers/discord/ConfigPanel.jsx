import { useState } from 'react';
import { Copy, Check, Info } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { API_URL } from '@/lib/api';
import imgDiscord from '@/assets/discord.png';
import CredentialPicker from '@/components/ui/CredentialPicker';

const DISCORD_EVENTS = [
  { value: 'MESSAGE_CREATE',           label: 'New Message',         desc: 'Message sent in a channel' },
  { value: 'MESSAGE_REACTION_ADD',     label: 'Reaction Added',      desc: 'Emoji reaction added to a message' },
  { value: 'GUILD_MEMBER_ADD',         label: 'Member Joined',       desc: 'New member joined the server' },
  { value: 'GUILD_MEMBER_REMOVE',      label: 'Member Left',         desc: 'Member left or was kicked' },
  { value: 'GUILD_MEMBER_UPDATE',      label: 'Member Updated',      desc: 'Member role or nickname changed' },
  { value: 'THREAD_CREATE',            label: 'Thread Created',      desc: 'New thread opened in a channel' },
  { value: 'INTERACTION_CREATE',       label: 'Slash Command',       desc: 'Slash command or component interaction' },
];

export default function DiscordTriggerNode({ config = {}, updateConfig, nodeId }) {
  const { id: automationId } = useParams();
  const [activeTab, setActiveTab] = useState('setup');
  const [copied, setCopied] = useState(false);

  const webhookUrl = `${API_URL}/webhook/${automationId}`;
  const selectedEvents = config.events || ['MESSAGE_CREATE'];

  const copy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const toggleEvent = (val) => {
    const updated = selectedEvents.includes(val)
      ? selectedEvents.filter((e) => e !== val)
      : [...selectedEvents, val];
    updateConfig?.('events', updated.length ? updated : ['MESSAGE_CREATE']);
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#2A2A2A] bg-[#111111] rounded-t-xl">
        <div className="p-1 bg-[#222] rounded-md border border-[#333]">
          <img src={imgDiscord} className="w-3 h-3 object-contain" alt="Discord" />
        </div>
        <span className="text-[11px] font-semibold text-zinc-200 tracking-wide">Discord</span>
        <span className="ml-auto text-[9px] font-bold text-[#5865F2] bg-[#5865F2]/10 border border-[#5865F2]/20 px-1.5 py-0.5 rounded">TRIGGER</span>
      </div>

      <div className="flex bg-[#0a0a0a] px-3 pt-2 gap-3 border-b border-[#1a1a1a]">
        {['setup', 'events'].map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`pb-2 text-[9px] font-bold uppercase tracking-widest border-b-2 transition-all ${activeTab === tab ? 'border-[#5865F2] text-[#5865F2]' : 'border-transparent text-zinc-600 hover:text-zinc-400'}`}>
            {tab}
          </button>
        ))}
      </div>

      <div className="p-3 flex flex-col gap-3">
        {activeTab === 'setup' && (
          <>
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Interactions Endpoint URL</label>
              <div className="flex items-center gap-1.5 bg-[#111] border border-[#222] rounded-lg px-2.5 py-2">
                <span className="flex-1 text-[10px] text-zinc-400 font-mono truncate select-all">{webhookUrl}</span>
                <button onClick={() => copy(webhookUrl)} className="p-0.5 text-zinc-600 hover:text-zinc-300 transition-colors shrink-0">
                  {copied ? <Check className="w-3 h-3 text-[#5865F2]" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
              <p className="text-[9px] text-zinc-600">Set in Discord Developer Portal → Your App → General Information.</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <CredentialPicker
                value={config.botToken || ''}
                onChange={(id) => updateConfig?.('botToken', id)}
                accentColor="indigo"
                label="Discord Bot Token"
                placeholder="Select Discord Bot Token..."
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <CredentialPicker
                value={config.publicKey || ''}
                onChange={(id) => updateConfig?.('publicKey', id)}
                accentColor="indigo"
                label="Application Public Key"
                placeholder="Select Application Public Key..."
              />
              <p className="text-[9px] text-zinc-600">Used to verify request signatures (Ed25519).</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Guild ID (optional)</label>
              <input value={config.guildId || ''}
                onChange={(e) => updateConfig?.('guildId', e.target.value)}
                placeholder="Server ID — leave blank for all servers"
                className="w-full bg-[#111] border border-[#222] rounded-md px-2.5 py-1.5 text-xs text-zinc-300 font-mono focus:outline-none focus:border-[#5865F2]/50 transition-colors"
              />
            </div>
          </>
        )}

        {activeTab === 'events' && (
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Gateway Events (via bot)</label>
            <p className="text-[9px] text-zinc-600">Enable privileged intents in Developer Portal for member events.</p>
            <div className="flex flex-col gap-1 mt-1">
              {DISCORD_EVENTS.map(({ value, label, desc }) => {
                const on = selectedEvents.includes(value);
                return (
                  <button key={value} onClick={() => toggleEvent(value)}
                    className={`flex items-start gap-2.5 px-2.5 py-2 rounded-lg border text-left transition-all ${on ? 'bg-[#5865F2]/10 border-[#5865F2]/30' : 'bg-[#0d0d0d] border-[#1a1a1a] hover:border-[#2a2a2a]'}`}>
                    <div className={`w-3.5 h-3.5 rounded border mt-0.5 shrink-0 flex items-center justify-center transition-all ${on ? 'bg-[#5865F2] border-[#5865F2]' : 'border-zinc-600'}`}>
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
      </div>
    </div>
  );
}
