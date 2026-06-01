import { Settings2, MessageSquare } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';
import CredentialPicker from '../../../../components/ui/CredentialPicker';

const MODELS = [
  { value: 'deepseek-chat', label: 'DeepSeek V3 (Chat)' },
  { value: 'deepseek-reasoner', label: 'DeepSeek R1 (Reasoner)' },
];

function DeepSeekIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M23.748 4.482a.289.289 0 0 0-.34-.29c-.166.029-.306.152-.4.29C21.485 6.483 19.75 7.35 17.965 7.1c-1.786-.25-3.215-1.566-4.001-3.299-.049-.107-.131-.198-.234-.253a.308.308 0 0 0-.347.038.32.32 0 0 0-.099.316c.558 2.343-.41 4.793-2.38 6.088-1.97 1.295-4.56 1.178-6.4-.29-.106-.085-.248-.107-.375-.058a.333.333 0 0 0-.207.28.34.34 0 0 0 .15.306c1.246.9 2.13 2.25 2.45 3.79.32 1.539.04 3.143-.768 4.458a.34.34 0 0 0 .006.351.322.322 0 0 0 .306.146.31.31 0 0 0 .266-.199c.909-2.126 2.96-3.499 5.185-3.411 2.225.088 4.17 1.618 4.916 3.81.05.147.178.254.328.273a.307.307 0 0 0 .337-.213 8.206 8.206 0 0 1 1.583-2.753c.96-1.11 2.2-1.915 3.585-2.316a.332.332 0 0 0 .23-.257.34.34 0 0 0-.12-.321 5.915 5.915 0 0 1-1.957-3.062 5.946 5.946 0 0 1 .351-3.643.328.328 0 0 0-.016-.332z"/>
    </svg>
  );
}

export default function DeepSeekNode({ config = {}, updateConfig, nodeId }) {
  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-[#4D9BF8]/5 border border-[#4D9BF8]/20 rounded-xl">
        <div className="p-2 bg-[#4D9BF8]/10 border border-[#4D9BF8]/20 rounded-lg text-[#4D9BF8] shrink-0">
          <DeepSeekIcon className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-[#4D9BF8]">DeepSeek</span>
          <span className="text-[10px] text-zinc-500 mt-0.5">Powerful reasoning & chat models</span>
        </div>
      </div>

      {/* Config */}
      <div className="flex flex-col gap-3 bg-[#0a0a0a] p-4 border border-[#222] rounded-xl shadow-inner">
        <div className="flex items-center gap-2 pb-3 border-b border-[#222]">
          <Settings2 className="w-4 h-4 text-[#4D9BF8]" />
          <span className="text-xs font-bold text-zinc-300 uppercase tracking-widest">Config</span>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Model</span>
          <div className="flex flex-wrap gap-1.5">
            {MODELS.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => updateConfig('model', m.value)}
                className={`px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition-all duration-150 ${
                  (config.model || 'deepseek-chat') === m.value
                    ? 'bg-[#4D9BF8]/10 border-[#4D9BF8]/30 text-[#4D9BF8]'
                    : 'bg-[#111] border-[#333] text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Output</span>
          <div className="flex gap-1.5">
            {[{ value: 'text', label: 'Raw Text' }, { value: 'json', label: 'Structured JSON' }].map((fmt) => (
              <button
                key={fmt.value}
                type="button"
                onClick={() => updateConfig('outputFormat', fmt.value)}
                className={`px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition-all duration-150 ${
                  (config.outputFormat || 'text') === fmt.value
                    ? 'bg-[#4D9BF8]/10 border-[#4D9BF8]/30 text-[#4D9BF8]'
                    : 'bg-[#111] border-[#333] text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                }`}
              >
                {fmt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Prompt */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
          <MessageSquare className="w-3.5 h-3.5 text-[#4D9BF8]" /> Prompt
        </label>
        <SmartVariableInput
          value={config.prompt || ''}
          onChange={(val) => updateConfig('prompt', val)}
          placeholder="e.g. Reason through this step by step..."
          multiline
          nodeId={nodeId}
        />
      </div>

      {/* Credential */}
      <CredentialPicker
        value={config.credentialId || ''}
        onChange={(id) => updateConfig('credentialId', id)}
        accentColor="blue"
        label="DeepSeek API Key"
        placeholder="Select DeepSeek credential..."
      />
    </div>
  );
}
