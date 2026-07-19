import { useState } from 'react';
import { Check, Copy, RefreshCw } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { API_URL } from '@/lib/api';
import imgNotion from '@/assets/Notion-Logo--Streamline-Radix.svg';
import CredentialPicker from '@/components/ui/CredentialPicker';

const POLL_INTERVALS = [
  { value: '*/1 * * * *',  label: 'Every minute' },
  { value: '*/5 * * * *',  label: 'Every 5 minutes' },
  { value: '*/15 * * * *', label: 'Every 15 minutes' },
  { value: '*/30 * * * *', label: 'Every 30 minutes' },
  { value: '0 * * * *',    label: 'Every hour' },
];

export default function NotionTriggerNode({ config = {}, updateConfig, nodeId }) {
  const { id: automationId } = useParams();
  const [activeTab, setActiveTab] = useState('setup');
  const [copied, setCopied] = useState('');

  const webhookUrl = `${API_URL}/webhook/${automationId}`;
  const copy = (key, text) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 1500);
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#2A2A2A] bg-[#111111] rounded-t-xl">
        <div className="p-1 bg-[#222] rounded-md border border-[#333]">
          <img src={imgNotion} className="w-3 h-3 object-contain" style={{ filter: 'invert(1)' }} alt="Notion" />
        </div>
        <span className="text-[11px] font-semibold text-zinc-200 tracking-wide">Notion</span>
        <div className="ml-auto flex items-center gap-1.5">
          <RefreshCw className="w-2.5 h-2.5 text-zinc-600" />
          <span className="text-[9px] font-bold text-zinc-300 bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 rounded">TRIGGER</span>
        </div>
      </div>

      <div className="flex bg-[#0a0a0a] px-3 pt-2 gap-3 border-b border-[#1a1a1a]">
        {['setup', 'filter'].map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`pb-2 text-[9px] font-bold uppercase tracking-widest border-b-2 transition-all ${activeTab === tab ? 'border-white text-white' : 'border-transparent text-zinc-600 hover:text-zinc-400'}`}>
            {tab}
          </button>
        ))}
      </div>

      <div className="p-3 flex flex-col gap-3">
        {activeTab === 'setup' && (
          <>
            <div className="flex flex-col gap-1.5">
              <CredentialPicker
                value={config.apiKey || ''}
                onChange={(id) => updateConfig?.('apiKey', id)}
                accentColor="blue"
                label="Notion OAuth"
                oauthProvider="notion"
                placeholder="Select Notion credential..."
              />
              <p className="text-[9px] text-zinc-600">From notion.so/profile/integrations. Share the database with your integration.</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Database ID</label>
              <input value={config.databaseId || ''}
                onChange={(e) => updateConfig?.('databaseId', e.target.value)}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                className="w-full bg-[#111] border border-[#222] rounded-md px-2.5 py-1.5 text-xs text-zinc-300 font-mono focus:outline-none focus:border-white/30 transition-colors"
              />
              <p className="text-[9px] text-zinc-600">From the database URL: notion.so/workspace/<span className="font-mono text-zinc-500">DATABASE_ID</span>?v=...</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Poll Interval</label>
              <select value={config.pollInterval || '*/5 * * * *'}
                onChange={(e) => updateConfig?.('pollInterval', e.target.value)}
                className="w-full bg-[#111] border border-[#222] rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-white/30 transition-colors cursor-pointer">
                {POLL_INTERVALS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-[#111] border border-[#1e1e1e] rounded-lg">
              <div>
                <span className="text-[10px] font-bold text-zinc-300 block">Trigger on edits too</span>
                <span className="text-[9px] text-zinc-600">Fire when existing pages are modified</span>
              </div>
              <div className={`w-8 h-4 rounded-full p-0.5 transition-colors cursor-pointer ${config.triggerOnUpdate ? 'bg-white' : 'bg-zinc-700'}`}
                onClick={() => updateConfig?.('triggerOnUpdate', !config.triggerOnUpdate)}>
                <div className={`w-3 h-3 rounded-full transition-transform shadow-sm ${config.triggerOnUpdate ? 'bg-black translate-x-4' : 'bg-white translate-x-0'}`} />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Instant Delivery (optional)</label>
              {config.webhookRegistered && config.notionWebhookSecret ? (
                <>
                  <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-2.5 py-2">
                    <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span className="text-[10px] text-emerald-400">Webhook connected — events arrive instantly. If Notion asks to verify, paste this token.</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input readOnly value={config.notionWebhookSecret}
                      className="flex-1 bg-[#111] border border-[#222] rounded-md px-2.5 py-1.5 text-[10px] text-zinc-400 font-mono focus:outline-none" />
                    <button onClick={() => copy('token', config.notionWebhookSecret)}
                      className="p-1.5 bg-[#111] border border-[#222] rounded-md text-zinc-500 hover:text-white transition-colors shrink-0">
                      {copied === 'token' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-1.5">
                    <input readOnly value={webhookUrl}
                      className="flex-1 bg-[#111] border border-[#222] rounded-md px-2.5 py-1.5 text-[10px] text-zinc-400 font-mono focus:outline-none" />
                    <button onClick={() => copy('url', webhookUrl)}
                      className="p-1.5 bg-[#111] border border-[#222] rounded-md text-zinc-500 hover:text-white transition-colors shrink-0">
                      {copied === 'url' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                  <p className="text-[9px] text-zinc-600">Add this URL as a webhook on your integration at notion.so/profile/integrations. Notion sends a verification token — reopen this panel, copy it from here, and paste it into Notion's verify dialog. Polling keeps working until then.</p>
                </>
              )}
            </div>
          </>
        )}

        {activeTab === 'filter' && (
          <>
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Filter Property</label>
              <input value={config.filterProperty || ''}
                onChange={(e) => updateConfig?.('filterProperty', e.target.value)}
                placeholder="Status"
                className="w-full bg-[#111] border border-[#222] rounded-md px-2.5 py-1.5 text-xs text-zinc-300 font-mono focus:outline-none focus:border-white/30 transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Filter Value</label>
              <input value={config.filterValue || ''}
                onChange={(e) => updateConfig?.('filterValue', e.target.value)}
                placeholder="In Progress"
                className="w-full bg-[#111] border border-[#222] rounded-md px-2.5 py-1.5 text-xs text-zinc-300 font-mono focus:outline-none focus:border-white/30 transition-colors"
              />
              <p className="text-[9px] text-zinc-600">Only fire when this property equals this value. Leave blank to fire for any new page.</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Max Pages per Poll</label>
              <input type="number" min="1" max="100" value={config.maxPages || 20}
                onChange={(e) => updateConfig?.('maxPages', Number(e.target.value))}
                className="w-full bg-[#111] border border-[#222] rounded-md px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-white/30 transition-colors"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
