import { useState } from 'react';
import { Info, RefreshCw } from 'lucide-react';
import imgGmail from '@/assets/gmail.png';
import CredentialPicker from '@/components/ui/CredentialPicker';

const POLL_INTERVALS = [
  { value: '*/1 * * * *',  label: 'Every minute' },
  { value: '*/5 * * * *',  label: 'Every 5 minutes' },
  { value: '*/15 * * * *', label: 'Every 15 minutes' },
  { value: '*/30 * * * *', label: 'Every 30 minutes' },
  { value: '0 * * * *',    label: 'Every hour' },
];

export default function GmailTriggerNode({ config = {}, updateConfig, nodeId }) {
  const [activeTab, setActiveTab] = useState('setup');

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#2A2A2A] bg-[#111111] rounded-t-xl">
        <div className="p-1 bg-[#222] rounded-md border border-[#333]">
          <img src={imgGmail} className="w-3 h-3 object-contain" alt="Gmail" />
        </div>
        <span className="text-[11px] font-semibold text-zinc-200 tracking-wide">Gmail</span>
        <div className="ml-auto flex items-center gap-1.5">
          <RefreshCw className="w-2.5 h-2.5 text-zinc-600" />
          <span className="text-[9px] font-bold text-[#EA4335] bg-[#EA4335]/10 border border-[#EA4335]/20 px-1.5 py-0.5 rounded">TRIGGER</span>
        </div>
      </div>

      <div className="flex bg-[#0a0a0a] px-3 pt-2 gap-3 border-b border-[#1a1a1a]">
        {['setup', 'filter', 'payload'].map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`pb-2 text-[9px] font-bold uppercase tracking-widest border-b-2 transition-all ${activeTab === tab ? 'border-[#EA4335] text-[#EA4335]' : 'border-transparent text-zinc-600 hover:text-zinc-400'}`}>
            {tab}
          </button>
        ))}
      </div>

      <div className="p-3 flex flex-col gap-3">
        {activeTab === 'setup' && (
          <>
            <CredentialPicker
              label="Google OAuth"
              value={config.credentialId || ''}
              onChange={(v) => updateConfig?.('credentialId', v)}
              oauthProvider="google"
              accentColor="red"
              placeholder="Select Gmail credential…"
              hint="Needs gmail.readonly scope — click Connect with Google to authorize."
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Poll Interval</label>
              <select value={config.pollInterval || '*/5 * * * *'}
                onChange={(e) => updateConfig?.('pollInterval', e.target.value)}
                className="w-full bg-[#111] border border-[#222] rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#EA4335]/50 transition-colors cursor-pointer">
                {POLL_INTERVALS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-[#111] border border-[#1e1e1e] rounded-lg">
              <span className="text-[10px] font-bold text-zinc-300">Only new emails</span>
              <div className={`w-8 h-4 rounded-full p-0.5 transition-colors cursor-pointer ${config.onlyNew !== false ? 'bg-[#EA4335]' : 'bg-zinc-700'}`}
                onClick={() => updateConfig?.('onlyNew', !(config.onlyNew !== false))}>
                <div className={`w-3 h-3 bg-white rounded-full transition-transform shadow-sm ${config.onlyNew !== false ? 'translate-x-4' : 'translate-x-0'}`} />
              </div>
            </div>

            <div className="p-2.5 bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg flex items-start gap-2">
              <RefreshCw className="w-3 h-3 text-zinc-600 shrink-0 mt-0.5" />
              <p className="text-[9px] text-zinc-600 leading-relaxed">
                BlinkBox polls Gmail on the schedule above. Each new matching email fires one workflow run.
              </p>
            </div>
          </>
        )}

        {activeTab === 'filter' && (
          <>
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Gmail Search Query</label>
              <input value={config.query || ''}
                onChange={(e) => updateConfig?.('query', e.target.value)}
                placeholder="is:unread label:inbox"
                className="w-full bg-[#111] border border-[#222] rounded-md px-2.5 py-1.5 text-xs text-zinc-300 font-mono focus:outline-none focus:border-[#EA4335]/50 transition-colors"
              />
              <p className="text-[9px] text-zinc-600">Standard Gmail search operators: <span className="font-mono text-zinc-500">from: to: subject: label: has:attachment</span></p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Max Results per Poll</label>
              <input type="number" min="1" max="50" value={config.maxResults || 10}
                onChange={(e) => updateConfig?.('maxResults', Number(e.target.value))}
                className="w-full bg-[#111] border border-[#222] rounded-md px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-[#EA4335]/50 transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Label Filter</label>
              <input value={config.labelFilter || ''}
                onChange={(e) => updateConfig?.('labelFilter', e.target.value)}
                placeholder="INBOX, UNREAD (comma-separated)"
                className="w-full bg-[#111] border border-[#222] rounded-md px-2.5 py-1.5 text-xs text-zinc-300 font-mono focus:outline-none focus:border-[#EA4335]/50 transition-colors"
              />
            </div>
          </>
        )}

        {activeTab === 'payload' && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Info className="w-3 h-3 text-zinc-600" />
              <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Available in workflow as</span>
            </div>
            <div className="flex flex-col gap-1 p-2.5 bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg">
              {[
                ['$trigger.id', 'Gmail message ID'],
                ['$trigger.threadId', 'Thread ID'],
                ['$trigger.subject', 'Email subject line'],
                ['$trigger.from', 'Sender email address'],
                ['$trigger.to', 'Recipient email addresses'],
                ['$trigger.date', 'Received date (ISO string)'],
                ['$trigger.snippet', 'Short preview of message body'],
                ['$trigger.bodyText', 'Plain text body content'],
                ['$trigger.bodyHtml', 'HTML body content'],
                ['$trigger.attachments', 'Array of attachment metadata'],
                ['$trigger.labels', 'Array of Gmail label IDs'],
              ].map(([key, desc]) => (
                <div key={key} className="flex items-baseline gap-2">
                  <span className="text-[10px] font-mono text-[#EA4335] shrink-0">{key}</span>
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
