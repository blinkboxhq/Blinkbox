import { useState } from 'react';
import { AppWindow, Copy, Check, RefreshCw, Info } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { API_URL } from '../../../../lib/api';

export default function AppEventTriggerNode({ config = {}, updateConfig, nodeId }) {
  const { id: automationId } = useParams();
  const [copied, setCopied] = useState(false);

  const webhookUrl = `${API_URL}/webhook/${automationId}`;
  const expectedEvents = config.expectedEvents || '';
  const retryOnFailure = config.retryOnFailure ?? false;

  const copyUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="flex flex-col">

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#2A2A2A] bg-[#111111] rounded-t-xl">
        <div className="p-1 bg-[#222] rounded-md border border-[#333]">
          <AppWindow className="w-3 h-3 text-white" />
        </div>
        <span className="text-[11px] font-semibold text-zinc-200 tracking-wide">App Event Trigger</span>
      </div>

      <div className="p-3 flex flex-col gap-3">

        {/* Webhook URL */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Webhook URL</label>
          <div className="flex items-center gap-1.5 bg-[#111] border border-[#222] rounded-lg px-2.5 py-2">
            <span className="flex-1 text-[10px] text-zinc-400 font-mono truncate select-all">{webhookUrl}</span>
            <button onClick={copyUrl} className="p-0.5 text-zinc-600 hover:text-zinc-300 transition-colors shrink-0" title="Copy URL">
              {copied ? <Check className="w-3 h-3 text-violet-400" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* Info callout */}
        <div className="flex items-start gap-2.5 p-2.5 bg-violet-500/5 border border-violet-500/15 rounded-lg">
          <Info className="w-3.5 h-3.5 text-violet-400 shrink-0 mt-0.5" />
          <p className="text-[10px] text-zinc-500 leading-relaxed">
            Point your app's webhook to this URL. Send event data as a JSON body — every field becomes available downstream.
          </p>
        </div>

        {/* Expected event types */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Expected Event Types</label>
          <input
            value={expectedEvents}
            onChange={(e) => updateConfig?.('expectedEvents', e.target.value)}
            placeholder="user.created, order.paid, message.sent"
            className="w-full bg-[#111] border border-[#222] rounded-md px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-violet-500/50 transition-colors placeholder:text-zinc-700"
          />
          <p className="text-[9px] text-zinc-600 leading-relaxed">Comma-separated. Documentation only — all events are accepted.</p>
        </div>

        {/* Retry toggle */}
        <div className="flex items-center justify-between p-2.5 bg-[#111] border border-[#1e1e1e] rounded-lg">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5 text-zinc-600" />
            <div>
              <span className="text-[10px] font-bold text-zinc-300 block">Retry on failure</span>
              <span className="text-[9px] text-zinc-600">Auto-retry failed executions up to 3×</span>
            </div>
          </div>
          <div
            className={`w-8 h-4 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${retryOnFailure ? 'bg-violet-500' : 'bg-zinc-700'}`}
            onClick={() => updateConfig?.('retryOnFailure', !retryOnFailure)}
          >
            <div className={`w-3 h-3 bg-white rounded-full transition-transform shadow-sm ${retryOnFailure ? 'translate-x-4' : 'translate-x-0'}`} />
          </div>
        </div>

        {/* Variables */}
      </div>
    </div>
  );
}
