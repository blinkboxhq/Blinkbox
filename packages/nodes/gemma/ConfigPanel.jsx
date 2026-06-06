import { MessageSquare, Code2, Image, ChevronDown } from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';
import CredentialPicker from '@/components/ui/CredentialPicker';

const OPERATIONS = [
  { value: 'chat',   label: 'Chat',   icon: MessageSquare },
  { value: 'vision', label: 'Vision', icon: Image         },
  { value: 'code',   label: 'Code',   icon: Code2         },
];

const MODELS = {
  chat: [
    { value: 'google/gemma-4-31b-it',   label: 'Gemma 4 31B ✦ (256K, multimodal)' },
    { value: 'google/gemma-3-12b-it',   label: 'Gemma 3 12B' },
    { value: 'google/gemma-3-4b-it',    label: 'Gemma 3 4B (fast)' },
    { value: 'google/gemma-3n-e4b-it',  label: 'Gemma 3n E4B (edge)' },
    { value: 'google/gemma-3n-e2b-it',  label: 'Gemma 3n E2B (edge, fast)' },
    { value: 'google/gemma-2-2b-it',    label: 'Gemma 2 2B (ultra-fast)' },
  ],
  vision: [
    { value: 'google/gemma-4-31b-it',   label: 'Gemma 4 31B ✦ (image + video)' },
    { value: 'google/gemma-3n-e4b-it',  label: 'Gemma 3n E4B (img + audio + video)' },
    { value: 'google/gemma-3n-e2b-it',  label: 'Gemma 3n E2B (edge)' },
  ],
  code: [
    { value: 'google/codegemma-1.1-7b', label: 'CodeGemma 1.1 7B ✦' },
    { value: 'google/codegemma-7b',     label: 'CodeGemma 7B' },
    { value: 'google/gemma-4-31b-it',   label: 'Gemma 4 31B (general + code)' },
    { value: 'google/gemma-3-12b-it',   label: 'Gemma 3 12B' },
  ],
};

function Select({ value, onChange, options }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full appearance-none bg-[#0d0d0f] border border-zinc-800 rounded-lg px-3 py-2 pr-8 text-[12px] text-zinc-100 focus:outline-none focus:border-zinc-600 cursor-pointer"
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
    </div>
  );
}

export default function GemmaNimNode({ config = {}, updateConfig, nodeId }) {
  const operation = config.operation || 'chat';
  const models = MODELS[operation] || MODELS.chat;
  const currentModel = config.model || models[0].value;

  function setOperation(op) {
    updateConfig('operation', op);
    updateConfig('model', MODELS[op][0].value);
  }

  return (
    <div className="flex flex-col gap-0 w-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-[#1a1a1a]">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-blue-500/10 border border-blue-500/20">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
            <circle cx="12" cy="12" r="10" fill="#4285F4" opacity="0.15"/>
            <path d="M12 4C7.6 4 4 7.6 4 12s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm0 3c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm0 11.2c-2.5 0-4.7-1.3-6-3.2.03-2 4-3.1 6-3.1s5.97 1.1 6 3.1c-1.3 1.9-3.5 3.2-6 3.2z" fill="#4285F4"/>
          </svg>
        </div>
        <div>
          <div className="text-[13px] font-bold text-white leading-tight">Google Gemma</div>
          <div className="text-[10px] text-zinc-500">via NVIDIA NIM</div>
        </div>
      </div>

      {/* Credential */}
      <div className="px-4 py-3 border-b border-[#1a1a1a]">
        <CredentialPicker
          value={config.credentialId || ''}
          onChange={(id) => updateConfig('credentialId', id)}
          accentColor="blue"
          credentialType="NvidiaNim"
          label="API Key"
          placeholder="Select NVIDIA NIM credential…"
        />
      </div>

      {/* Operation tabs */}
      <div className="px-4 py-3 border-b border-[#1a1a1a]">
        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Operation</span>
        <div className="flex gap-1">
          {OPERATIONS.map(op => {
            const Icon = op.icon;
            const active = operation === op.value;
            return (
              <button key={op.value} type="button" onClick={() => setOperation(op.value)}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-all duration-150"
                style={active
                  ? { background: 'rgba(66,133,244,0.12)', borderColor: 'rgba(66,133,244,0.35)', color: '#93bbfc' }
                  : { background: 'transparent', borderColor: '#262626', color: '#71717a' }}>
                <Icon className="w-3 h-3 shrink-0" strokeWidth={2} />
                {op.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Model */}
      <div className="px-4 py-3 border-b border-[#1a1a1a]">
        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Model</span>
        <Select
          value={currentModel}
          onChange={v => updateConfig('model', v)}
          options={models}
        />
      </div>

      {/* Input fields */}
      {operation === 'vision' && (
        <div className="px-4 py-3 border-b border-[#1a1a1a]">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Image URL</span>
          <SmartVariableInput
            value={config.imageUrl || ''}
            onChange={v => updateConfig('imageUrl', v)}
            placeholder="https://… or {{$node.imageUrl}}"
            nodeId={nodeId}
          />
        </div>
      )}

      <div className="px-4 py-3 border-b border-[#1a1a1a]">
        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">
          {operation === 'vision' ? 'Question' : 'Prompt'}
        </span>
        <SmartVariableInput
          value={config.prompt || ''}
          onChange={v => updateConfig('prompt', v)}
          placeholder={operation === 'vision' ? 'Describe this image…' : 'Enter your prompt…'}
          multiline
          nodeId={nodeId}
        />
      </div>

      <div className="px-4 py-3">
        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Max Tokens</span>
        <input
          type="number"
          value={config.maxTokens || 1024}
          onChange={e => updateConfig('maxTokens', parseInt(e.target.value) || 1024)}
          min={64} max={8192}
          className="w-full bg-[#0d0d0f] border border-zinc-800 rounded-lg px-3 py-2 text-[12px] text-zinc-100 focus:outline-none focus:border-zinc-600"
        />
      </div>
    </div>
  );
}
