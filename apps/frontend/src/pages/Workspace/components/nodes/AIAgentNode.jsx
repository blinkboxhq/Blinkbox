import { Bot, KeyRound, MessageSquare, Settings2, Sparkles } from 'lucide-react';

export default function AIAgentNode({ config = {}, updateConfig }) {
  const provider = config.provider || 'openai';
  const outputFormat = config.outputFormat || 'json';

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Premium Header */}
      <div className="flex items-center gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl relative overflow-hidden shadow-[0_0_20px_rgba(59,130,246,0.05)]">
        <div className="absolute right-0 top-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
        <div className="p-2 bg-blue-500/20 border border-blue-500/30 rounded-lg text-blue-400 shrink-0 z-10">
          <Bot className="w-5 h-5" />
        </div>
        <div className="flex flex-col z-10">
          <span className="text-sm font-bold text-blue-400 tracking-wide">AI Agent</span>
          <span className="text-[10px] text-slate-400 truncate mt-0.5">Process data with LLMs</span>
        </div>
      </div>

      {/* Model Config */}
      <div className="flex flex-col gap-4 bg-[#0a0a0a] p-4 border border-[#222] rounded-xl shadow-inner">
        <div className="flex items-center gap-2 pb-3 border-b border-[#222]">
          <Settings2 className="w-4 h-4 text-blue-500" />
          <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">Model Config</span>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-500 w-16">Provider</span>
            <select 
              value={provider}
              onChange={(e) => updateConfig('provider', e.target.value)}
              className="flex-1 bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-blue-500/50 transition-colors cursor-pointer outline-none appearance-none"
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-500 w-16">Model</span>
            <input 
              type="text"
              value={config.model || (provider === 'openai' ? 'gpt-4o-mini' : 'claude-3-haiku-20240307')}
              onChange={(e) => updateConfig('model', e.target.value)}
              className="flex-1 bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-xs text-blue-300 font-mono focus:outline-none focus:border-blue-500/50 transition-colors"
            />
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-500 w-16">Output</span>
            <select 
              value={outputFormat}
              onChange={(e) => updateConfig('outputFormat', e.target.value)}
              className="flex-1 bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-blue-500/50 transition-colors cursor-pointer outline-none appearance-none"
            >
              <option value="json">Structured JSON</option>
              <option value="text">Raw Text</option>
            </select>
          </div>
        </div>
      </div>

      {/* Prompt */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center justify-between">
          <span className="flex items-center gap-2"><MessageSquare className="w-3.5 h-3.5 text-blue-400" /> Instructions</span>
          <Sparkles className="w-3 h-3 text-blue-500 animate-pulse" />
        </label>
        <textarea 
          value={config.prompt || ''}
          onChange={(e) => updateConfig('prompt', e.target.value)}
          placeholder="e.g. Extract the pricing tiers from the input data and format them as a JSON array..."
          rows={5}
          className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg p-3 text-xs text-white focus:outline-none focus:border-blue-500/50 transition-colors resize-none shadow-inner leading-relaxed placeholder-slate-600"
        />
      </div>

      {/* Vault Credential */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <KeyRound className="w-3.5 h-3.5 text-blue-400" /> Vault Credential ID
        </label>
        <input 
          type="text"
          value={config.credentialId || ''}
          onChange={(e) => updateConfig('credentialId', e.target.value)}
          placeholder="Paste API Key Credential ID here"
          className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs font-mono text-slate-300 focus:outline-none focus:border-blue-500/50 transition-colors shadow-inner"
        />
      </div>
    </div>
  );
}