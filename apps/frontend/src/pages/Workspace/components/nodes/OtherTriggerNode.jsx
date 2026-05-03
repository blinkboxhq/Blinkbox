import { useState } from 'react';
import { FolderOpen, Copy, Check, ChevronDown } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { API_URL } from '../../../../lib/api';

const EVENT_TYPES = [
  { value: 'error_hook',       label: 'Error Hook' },
  { value: 'file_change',      label: 'File Change' },
  { value: 'external_system',  label: 'External System' },
  { value: 'custom',           label: 'Custom' },
];

export default function OtherTriggerNode({ config = {}, updateConfig, nodeId }) {
  const { id: automationId } = useParams();
  const [copied, setCopied] = useState(false);

  const webhookUrl = `${API_URL}/webhook/${automationId}`;
  const eventType = config.eventType || 'custom';
  const description = config.description || '';

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
          <FolderOpen className="w-3 h-3 text-zinc-400" />
        </div>
        <span className="text-[11px] font-semibold text-zinc-200 tracking-wide">Other Trigger</span>
      </div>

      <div className="p-3 flex flex-col gap-3">

        {/* Webhook URL */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Webhook URL</label>
          <div className="flex items-center gap-1.5 bg-[#111] border border-[#222] rounded-lg px-2.5 py-2">
            <span className="flex-1 text-[10px] text-zinc-400 font-mono truncate select-all">{webhookUrl}</span>
            <button onClick={copyUrl} className="p-0.5 text-zinc-600 hover:text-zinc-300 transition-colors shrink-0">
              {copied ? <Check className="w-3 h-3 text-zinc-300" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* Event type */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Event Type</label>
          <div className="relative">
            <select
              value={eventType}
              onChange={(e) => updateConfig?.('eventType', e.target.value)}
              className="w-full appearance-none bg-[#111] border border-[#222] rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500/50 transition-colors cursor-pointer pr-7"
            >
              {EVENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600 pointer-events-none" />
          </div>
        </div>

        {/* Description */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Description</label>
          <textarea
            value={description}
            onChange={(e) => updateConfig?.('description', e.target.value)}
            placeholder="What triggers this workflow? Describe the event source…"
            rows={3}
            className="w-full bg-[#111] border border-[#222] rounded-md px-2.5 py-2 text-xs text-zinc-300 focus:outline-none focus:border-zinc-500/50 transition-colors resize-none leading-relaxed placeholder:text-zinc-700"
          />
        </div>

        {/* Variables */}
        <div className="flex flex-col gap-1 p-2.5 bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg">
          <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-0.5">Available in workflow as</span>
          {[
            ['$trigger.body', 'Full JSON body from the request'],
            ['$trigger.body.*', 'Any field from the posted payload'],
            ['$trigger.headers', 'Request headers'],
            ['$trigger.query', 'URL query parameters'],
            ['$trigger.method', 'HTTP method used'],
          ].map(([key, desc]) => (
            <div key={key} className="flex items-baseline gap-2">
              <span className="text-[10px] font-mono text-zinc-400 shrink-0">{key}</span>
              <span className="text-[9px] text-zinc-600">{desc}</span>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
