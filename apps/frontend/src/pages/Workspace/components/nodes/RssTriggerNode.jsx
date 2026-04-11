import { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Plus, Rss, Info, ChevronDown } from 'lucide-react';

const POLL_INTERVALS = [
  { label: 'Every 5 minutes',  value: '*/5 * * * *' },
  { label: 'Every 15 minutes', value: '*/15 * * * *' },
  { label: 'Every 30 minutes', value: '*/30 * * * *' },
  { label: 'Every hour',       value: '0 * * * *' },
  { label: 'Every 6 hours',    value: '0 */6 * * *' },
  { label: 'Once a day',       value: '0 9 * * *' },
];

export default function RssTriggerNode({ config = {}, updateConfig, selected }) {
  const [activeTab, setActiveTab] = useState('setup');

  const feedUrl = config.feedUrl || '';
  const pollInterval = config.pollInterval || '*/15 * * * *';
  const onlyNew = config.onlyNew ?? true;

  return (
    <div className={`relative flex flex-col w-[280px] bg-[#0A0A0A] rounded-xl border transition-colors shadow-2xl font-sans group ${selected ? 'border-orange-500/50' : 'border-[#2A2A2A]'}`}>

      <Handle
        id="output"
        type="source"
        position={Position.Right}
        className="!w-5 !h-5 !flex items-center justify-center !bg-[#111111] !border !border-[#2A2A2A] !rounded-full !opacity-0 group-hover:!opacity-100 transition-all hover:!bg-orange-500 hover:!border-orange-500 text-zinc-500 hover:text-white shadow-xl z-50 cursor-crosshair"
        style={{ top: '20px', right: '-10px', transform: 'translateY(-50%)' }}
      >
        <Plus className="w-3 h-3 pointer-events-none" />
      </Handle>

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#2A2A2A] bg-[#111111] rounded-t-xl">
        <div className="p-1 bg-[#222] rounded-md border border-[#333]">
          <Rss className="w-3 h-3 text-orange-400" />
        </div>
        <span className="text-[11px] font-semibold text-zinc-200 tracking-wide">RSS / Atom Feed</span>
      </div>

      {/* Tabs */}
      <div className="flex bg-[#0a0a0a] px-3 pt-2 gap-3 border-b border-[#1a1a1a]">
        {['setup', 'payload'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-2 text-[9px] font-bold uppercase tracking-widest border-b-2 transition-all ${activeTab === tab ? 'border-orange-500 text-orange-400' : 'border-transparent text-zinc-600 hover:text-zinc-400'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="p-3 flex flex-col gap-3">

        {activeTab === 'setup' && (
          <>
            {/* Feed URL */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Feed URL</label>
              <input
                value={feedUrl}
                onChange={(e) => updateConfig?.('feedUrl', e.target.value)}
                placeholder="https://example.com/feed.xml"
                className="w-full bg-[#111] border border-[#222] rounded-md px-2.5 py-1.5 text-xs text-zinc-300 font-mono focus:outline-none focus:border-orange-500/50 transition-colors placeholder:text-zinc-700"
              />
              <p className="text-[9px] text-zinc-600">RSS or Atom feed URL. Must be publicly accessible.</p>
            </div>

            {/* Poll interval */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Check every</label>
              <div className="relative">
                <select
                  value={pollInterval}
                  onChange={(e) => updateConfig?.('pollInterval', e.target.value)}
                  className="w-full appearance-none bg-[#111] border border-[#222] rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-orange-500/50 transition-colors cursor-pointer pr-7"
                >
                  {POLL_INTERVALS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600 pointer-events-none" />
              </div>
            </div>

            {/* Only new items toggle */}
            <div className="flex items-start gap-3 p-2.5 bg-[#111] border border-[#1e1e1e] rounded-lg">
              <div className="flex-1">
                <span className="text-[10px] font-bold text-zinc-300 block">Only trigger on new items</span>
                <span className="text-[9px] text-zinc-600 mt-0.5 block leading-relaxed">
                  Skip items already seen. Disable to re-process all items every poll.
                </span>
              </div>
              <div
                className={`w-8 h-4 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 mt-0.5 ${onlyNew ? 'bg-orange-500' : 'bg-zinc-700'}`}
                onClick={() => updateConfig?.('onlyNew', !onlyNew)}
              >
                <div className={`w-3 h-3 bg-white rounded-full transition-transform shadow-sm ${onlyNew ? 'translate-x-4' : 'translate-x-0'}`} />
              </div>
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
                ['$trigger.item.title', 'Article title'],
                ['$trigger.item.link', 'Article URL'],
                ['$trigger.item.description', 'Summary / excerpt'],
                ['$trigger.item.pubDate', 'Publication date (ISO)'],
                ['$trigger.item.author', 'Author name'],
                ['$trigger.item.guid', 'Unique item identifier'],
                ['$trigger.item.content', 'Full content (if available)'],
                ['$trigger.feedUrl', 'The feed URL that was polled'],
              ].map(([key, desc]) => (
                <div key={key} className="flex items-baseline gap-2">
                  <span className="text-[10px] font-mono text-orange-400 shrink-0">{key}</span>
                  <span className="text-[9px] text-zinc-600">{desc}</span>
                </div>
              ))}
            </div>
            <p className="text-[9px] text-zinc-600 leading-relaxed mt-1">
              One workflow run per new feed item. If 3 new articles arrive at once, 3 runs are queued.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
