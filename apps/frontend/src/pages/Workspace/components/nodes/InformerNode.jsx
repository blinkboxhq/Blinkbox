import { Search, Target, Globe, ShieldCheck } from 'lucide-react';

export default function InformerNode({ config = {}, updateConfig }) {
  const source = config.source || '';
  const particularThing = config.particularThing || '';

  const isValidUrl = source.length > 0 && (source.startsWith('http://') || source.startsWith('https://'));

  return (
    <div className="flex flex-col gap-5 w-full">

      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-purple-500/5 border border-zinc-800 rounded-xl">
        <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded-lg text-purple-400 shrink-0">
          <Search className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-purple-400">Web Scraper</span>
          <span className="text-[10px] text-zinc-500 mt-0.5">
            Fetch and parse web page content via headless browser.
          </span>
        </div>
      </div>

      {/* URL Input */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center justify-between">
          <span className="flex items-center gap-2"><Globe className="w-3.5 h-3.5 text-purple-400" /> Source URL</span>
          {isValidUrl && (
            <span className="flex items-center gap-1 text-[9px] text-emerald-500">
              <ShieldCheck className="w-3 h-3" /> Valid
            </span>
          )}
        </label>
        <input
          type="text"
          value={source}
          onChange={(e) => updateConfig('source', e.target.value)}
          placeholder="https://example.com/page"
          className={`w-full bg-surface-1 border rounded-lg px-3 py-2.5 text-xs font-mono focus:outline-none transition-all placeholder-zinc-700 ${
            isValidUrl
              ? 'border-purple-500/30 text-purple-200 focus:border-purple-500/50'
              : 'border-zinc-800 text-zinc-300 focus:border-purple-500/30'
          }`}
        />
      </div>

      {/* Extraction Objective */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
          <Target className="w-3.5 h-3.5 text-purple-400" /> Extraction Goal
        </label>
        <div className="relative">
          <textarea
            value={particularThing}
            onChange={(e) => updateConfig('particularThing', e.target.value)}
            placeholder="e.g. Find all pricing plans and the features included in the Pro tier..."
            rows={4}
            className="w-full bg-surface-1 border border-zinc-800 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-purple-500/30 transition-colors resize-none leading-relaxed placeholder-zinc-600"
          />
          <div className="absolute bottom-2.5 right-3 text-[9px] text-zinc-700 font-mono pointer-events-none uppercase">
            Plain English
          </div>
        </div>
      </div>
    </div>
  );
}
