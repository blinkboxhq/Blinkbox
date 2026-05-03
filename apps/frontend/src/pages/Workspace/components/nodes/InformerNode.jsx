import { Search, Target, Globe, ShieldCheck } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';

export default function InformerNode({ config = {}, updateConfig, nodeId }) {
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
        <SmartVariableInput
          value={source}
          onChange={(val) => updateConfig('source', val)}
          placeholder="https://example.com/page"
          nodeId={nodeId}
        />
      </div>

      {/* Extraction Objective */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
          <Target className="w-3.5 h-3.5 text-purple-400" /> Extraction Goal
        </label>
        <SmartVariableInput
          value={particularThing}
          onChange={(val) => updateConfig('particularThing', val)}
          placeholder="e.g. Find all pricing plans and the features included in the Pro tier..."
          multiline
          nodeId={nodeId}
        />
      </div>
    </div>
  );
}
