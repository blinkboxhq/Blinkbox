import { useState } from 'react';
import { Copy, Check, Info } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { API_URL } from '@/lib/api';
import imgSlack from '@/assets/slack.png';
import CredentialPicker from '@/components/ui/CredentialPicker';

const SLACK_EVENTS = [
  { value: 'message',             label: 'New Message',        desc: 'Any message posted in a channel' },
  { value: 'app_mention',         label: 'App Mention',        desc: 'Someone @mentions your bot' },
  { value: 'message.im',          label: 'DM to Bot',          desc: 'Direct message sent to your app' },
  { value: 'channel_created',     label: 'Channel Created',    desc: 'New public channel created' },
  { value: 'member_joined_channel', label: 'Member Joined',    desc: 'User joins a channel' },
  { value: 'reaction_added',      label: 'Reaction Added',     desc: 'Emoji reaction added to a message' },
  { value: 'file_shared',         label: 'File Shared',        desc: 'File uploaded to a channel' },
];

export default function SlackTriggerNode({ config = {}, updateConfig, nodeId }) {
  const { id: automationId } = useParams();
  const [activeTab, setActiveTab] = useState('setup');
  const [copied, setCopied] = useState(false);

  const webhookUrl = `${API_URL}/webhook/${automationId}`;
  const selectedEvents = config.events || ['message', 'app_mention'];

  const copy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const toggleEvent = (val) => {
    const updated = selectedEvents.includes(val)
      ? selectedEvents.filter((e) => e !== val)
      : [...selectedEvents, val];
    updateConfig?.('events', updated.length ? updated : ['app_mention']);
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#2A2A2A] bg-[#111111] rounded-t-xl">
        <div className="p-1 bg-[#222] rounded-md border border-[#333]">
          <img src={imgSlack} className="w-3 h-3 object-contain" alt="Slack" />
        </div>
        <span className="text-[11px] font-semibold text-zinc-200 tracking-wide">Slack</span>
        <span className="ml-auto text-[9px] font-bold text-[#E01E5A] bg-[#E01E5A]/10 border border-[#E01E5A]/20 px-1.5 py-0.5 rounded">TRIGGER</span>
      </div>

      <div className="flex bg-[#0a0a0a] px-3 pt-2 gap-3 border-b border-[#1a1a1a]">
        {['setup', 'events'].map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`pb-2 text-[9px] font-bold uppercase tracking-widest border-b-2 transition-all ${activeTab === tab ? 'border-[#E01E5A] text-[#E01E5A]' : 'border-transparent text-zinc-600 hover:text-zinc-400'}`}>
            {tab}
          </button>
        ))}
      </div>

      <div className="p-3 flex flex-col gap-3">
        {activeTab === 'setup' && (
          <>
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Request URL</label>
              <div className="flex items-center gap-1.5 bg-[#111] border border-[#222] rounded-lg px-2.5 py-2">
                <span className="flex-1 text-[10px] text-zinc-400 font-mono truncate select-all">{webhookUrl}</span>
                <button onClick={() => copy(webhookUrl)} className="p-0.5 text-zinc-600 hover:text-zinc-300 transition-colors shrink-0">
                  {copied ? <Check className="w-3 h-3 text-[#E01E5A]" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
              <p className="text-[9px] text-zinc-600">Paste this into your Slack App → Event Subscriptions → Request URL.</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <CredentialPicker
                label="Signing Secret"
                credentialType="slack"
                value={config.slackSigningSecret || ''}
                onChange={(v) => updateConfig?.('slackSigningSecret', v)}
                placeholder="Select signing secret credential…"
              />
              <p className="text-[9px] text-zinc-600">BlinkBox verifies the <span className="font-mono text-zinc-500">X-Slack-Signature</span> header on every request.</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <CredentialPicker
                label="Bot OAuth Token (optional)"
                credentialType="slack"
                value={config.botToken || ''}
                onChange={(v) => updateConfig?.('botToken', v)}
                placeholder="Select bot token credential…"
              />
            </div>

            <div className="p-2.5 bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg">
              <p className="text-[9px] text-zinc-600 leading-relaxed">
                BlinkBox auto-responds to Slack URL verification challenges — no extra setup needed.
              </p>
            </div>
          </>
        )}

        {activeTab === 'events' && (
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Subscribe to Events</label>
            <p className="text-[9px] text-zinc-600">Also add these in Slack App → Event Subscriptions → Subscribe to bot events.</p>
            <div className="flex flex-col gap-1 mt-1">
              {SLACK_EVENTS.map(({ value, label, desc }) => {
                const on = selectedEvents.includes(value);
                return (
                  <button key={value} onClick={() => toggleEvent(value)}
                    className={`flex items-start gap-2.5 px-2.5 py-2 rounded-lg border text-left transition-all ${on ? 'bg-[#E01E5A]/10 border-[#E01E5A]/30' : 'bg-[#0d0d0d] border-[#1a1a1a] hover:border-[#2a2a2a]'}`}>
                    <div className={`w-3.5 h-3.5 rounded border mt-0.5 shrink-0 flex items-center justify-center transition-all ${on ? 'bg-[#E01E5A] border-[#E01E5A]' : 'border-zinc-600'}`}>
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
