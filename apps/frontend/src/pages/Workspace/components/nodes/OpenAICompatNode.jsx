import { Sparkles, MessageSquare, Settings2 } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';
import CredentialPicker from '../../../../components/ui/CredentialPicker';

/**
 * Generic config panel for OpenAI-compatible providers.
 * Each provider passes its own label, accent color, models list, and defaults.
 *
 * Usage:
 *   makeOpenAICompatNode({ label, accent, subtitle, models, defaultModel })
 */
export default function makeOpenAICompatNode({ label, accent, subtitle, models, defaultModel }) {
  return function OpenAICompatNodePanel({ config = {}, updateConfig, nodeId }) {
    const selectedModel = config.model || defaultModel;
    const outputFormat = config.outputFormat || 'text';

    return (
      <div className="flex flex-col gap-5 w-full">
        {/* Header */}
        <div className={`flex items-center gap-3 p-4 bg-${accent}-500/5 border border-${accent}-500/20 rounded-xl`}>
          <div className={`p-2 bg-${accent}-500/10 border border-${accent}-500/20 rounded-lg text-${accent}-400 shrink-0`}>
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className={`text-sm font-bold text-${accent}-400`}>{label}</span>
            <span className="text-[10px] text-zinc-500 mt-0.5">{subtitle}</span>
          </div>
        </div>

        {/* Model */}
        <div className="flex flex-col gap-3 bg-[#0a0a0a] p-4 border border-[#222] rounded-xl shadow-inner">
          <div className="flex items-center gap-2 pb-3 border-b border-[#222]">
            <Settings2 className={`w-4 h-4 text-${accent}-500`} />
            <span className="text-xs font-bold text-zinc-300 uppercase tracking-widest">Config</span>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Model</span>
            <div className="flex flex-col gap-1.5">
              {models.map((m) => (
                <button key={m.value} onClick={() => updateConfig('model', m.value)}
                  className={`w-full py-2 px-3 rounded-lg border text-xs font-bold text-left transition-all ${selectedModel === m.value ? `bg-${accent}-500/10 border-${accent}-500/40 text-${accent}-400` : 'bg-[#111] border-[#333] text-zinc-400 hover:border-[#444]'}`}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Output Format</span>
            <div className="grid grid-cols-2 gap-1.5">
              {[{ value: 'text', label: 'Raw Text' }, { value: 'json', label: 'Structured JSON' }].map((o) => (
                <button key={o.value} onClick={() => updateConfig('outputFormat', o.value)}
                  className={`py-2 rounded-lg border text-xs font-bold transition-all ${outputFormat === o.value ? `bg-${accent}-500/10 border-${accent}-500/40 text-${accent}-400` : 'bg-[#111] border-[#333] text-zinc-400 hover:border-[#444]'}`}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Prompt */}
        <div className="flex flex-col gap-2">
          <label className={`text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2`}>
            <MessageSquare className={`w-3.5 h-3.5 text-${accent}-400`} /> Prompt
          </label>
          <SmartVariableInput
            value={config.prompt || ''}
            onChange={(val) => updateConfig('prompt', val)}
            placeholder={`e.g. Summarize this data using ${label}...`}
            multiline
            nodeId={nodeId}
          />
        </div>

        {/* Credential */}
        <CredentialPicker
          value={config.credentialId || ''}
          onChange={(id) => updateConfig('credentialId', id)}
          accentColor={accent}
          label={`${label} API Key`}
          placeholder={`Select ${label} credential...`}
        />
      </div>
    );
  };
}
