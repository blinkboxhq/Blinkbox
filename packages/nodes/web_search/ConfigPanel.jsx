import { Globe, Search, Settings2 } from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';
import CredentialPicker from '@/components/ui/CredentialPicker';

export default function WebSearchNode({ config = {}, updateConfig, nodeId }) {
  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-xl">
        <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-400 shrink-0">
          <Globe className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-indigo-400">Web Search</span>
          <span className="text-[10px] text-zinc-500 mt-0.5">Query the live internet via Tavily</span>
        </div>
      </div>

      {/* Search Query */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
          <Search className="w-3.5 h-3.5 text-indigo-400" /> Search Query
        </label>
        <SmartVariableInput
          value={config.query || ''}
          onChange={(val) => updateConfig('query', val)}
          placeholder="e.g. Latest pricing for competitor X"
          multiline
        />
      </div>

      {/* Settings */}
      <div className="flex flex-col gap-3 bg-[#0a0a0a] p-4 border border-[#222] rounded-xl shadow-inner">
        <div className="flex items-center gap-2 pb-3 border-b border-[#222]">
          <Settings2 className="w-4 h-4 text-indigo-500" />
          <span className="text-xs font-bold text-zinc-300 uppercase tracking-widest">Settings</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-zinc-500 w-20 shrink-0">Depth</span>
          <select
            value={config.searchDepth || 'basic'}
            onChange={(e) => updateConfig('searchDepth', e.target.value)}
            className="flex-1 bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-indigo-500/50 transition-colors cursor-pointer appearance-none"
          >
            <option value="basic">Basic (fast)</option>
            <option value="advanced">Advanced (deep)</option>
          </select>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-zinc-500 w-20 shrink-0">Topic</span>
          <select
            value={config.topic || 'general'}
            onChange={(e) => updateConfig('topic', e.target.value)}
            className="flex-1 bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-indigo-500/50 transition-colors cursor-pointer appearance-none"
          >
            <option value="general">General</option>
            <option value="news">News</option>
            <option value="finance">Finance</option>
          </select>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-zinc-500 w-20 shrink-0">Results</span>
          <input
            type="number"
            min={1}
            max={20}
            value={config.maxResults || 5}
            onChange={(e) => updateConfig('maxResults', parseInt(e.target.value) || 5)}
            className="w-20 bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500/50 transition-colors"
          />
        </div>
      </div>

      {/* Credential */}
      <CredentialPicker
        value={config.credentialId || ''}
        onChange={(id) => updateConfig('credentialId', id)}
        accentColor="indigo"
        label="Tavily API Key"
        placeholder="Select Tavily credential..."
      />
    </div>
  );
}
