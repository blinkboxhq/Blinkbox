import { Sparkles, KeyRound, MessageSquare, Settings2 } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';

const MODELS = [
  'gpt-4o-mini',
  'gpt-4.1-mini',
  'gpt-4.1-nano',
  'gpt-4o',
  'gpt-4.1',
  'gpt-4-turbo',
  'gpt-3.5-turbo',
  'o4-mini',
];

export default function OpenAINode({ config = {}, updateConfig }) {
  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
        <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 shrink-0">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-emerald-400">OpenAI</span>
          <span className="text-[10px] text-zinc-500 mt-0.5">GPT chat completions</span>
        </div>
      </div>

      {/* Model Config */}
      <div className="flex flex-col gap-3 bg-[#0a0a0a] p-4 border border-[#222] rounded-xl shadow-inner">
        <div className="flex items-center gap-2 pb-3 border-b border-[#222]">
          <Settings2 className="w-4 h-4 text-emerald-500" />
          <span className="text-xs font-bold text-zinc-300 uppercase tracking-widest">Config</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-zinc-500 w-16">Model</span>
          <select
            value={config.model || 'gpt-4o-mini'}
            onChange={(e) => updateConfig('model', e.target.value)}
            className="flex-1 bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-emerald-500/50 transition-colors cursor-pointer appearance-none"
          >
            {MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-zinc-500 w-16">Output</span>
          <select
            value={config.outputFormat || 'text'}
            onChange={(e) => updateConfig('outputFormat', e.target.value)}
            className="flex-1 bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-emerald-500/50 transition-colors cursor-pointer appearance-none"
          >
            <option value="text">Raw Text</option>
            <option value="json">Structured JSON</option>
          </select>
        </div>
      </div>

      {/* Prompt */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
          <MessageSquare className="w-3.5 h-3.5 text-emerald-400" /> Prompt
        </label>
        <SmartVariableInput
          value={config.prompt || ''}
          onChange={(val) => updateConfig('prompt', val)}
          placeholder="e.g. Summarize the following data into 3 bullet points..."
          multiline
        />
      </div>

      {/* Credential */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
          <KeyRound className="w-3.5 h-3.5 text-emerald-400" /> Vault Credential ID
        </label>
        <input
          type="text"
          value={config.credentialId || ''}
          onChange={(e) => updateConfig('credentialId', e.target.value)}
          placeholder="Paste your OpenAI API Key credential ID"
          className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs font-mono text-zinc-300 focus:outline-none focus:border-emerald-500/50 transition-colors shadow-inner"
        />
      </div>
    </div>
  );
}
