import { MessageSquare, Cpu, Image, FileText, Layers, ChevronDown } from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';
import CredentialPicker from '@/components/ui/CredentialPicker';

const OPERATIONS = [
  { value: 'chat',       label: 'Chat',       icon: MessageSquare },
  { value: 'code',       label: 'Code',       icon: Cpu           },
  { value: 'vision',     label: 'Vision',     icon: Image         },
  { value: 'summarize',  label: 'Summarize',  icon: FileText      },
  { value: 'embeddings', label: 'Embeddings', icon: Layers        },
];

const MODELS = {
  chat: [
    { value: 'nvidia/nemotron-3-ultra-550b-a55b',              label: 'Nemotron 3 Ultra 550B ✦' },
    { value: 'nvidia/nemotron-3-super-120b-a12b',              label: 'Nemotron 3 Super 120B' },
    { value: 'nvidia/llama-3.1-nemotron-ultra-253b-v1',        label: 'Nemotron Ultra 253B' },
    { value: 'nvidia/llama-3.3-nemotron-super-49b-v1',         label: 'Nemotron Super 49B' },
    { value: 'nvidia/nemotron-3-nano-30b-a3b',                 label: 'Nemotron Nano 30B (fast)' },
    { value: 'meta/llama-4-maverick-17b-128e-instruct',        label: 'Llama 4 Maverick 17B×128E ✦' },
    { value: 'meta/llama-3.3-70b-instruct',                    label: 'Llama 3.3 70B' },
    { value: 'meta/llama-3.1-8b-instruct',                     label: 'Llama 3.1 8B (fast)' },
    { value: 'deepseek-ai/deepseek-v4-pro',                    label: 'DeepSeek V4 Pro ✦' },
    { value: 'deepseek-ai/deepseek-v4-flash',                  label: 'DeepSeek V4 Flash' },
    { value: 'moonshotai/kimi-k2.6',                           label: 'Kimi K2.6' },
    { value: 'qwen/qwen3-coder-480b-a35b-instruct',            label: 'Qwen3-Coder 480B' },
    { value: 'qwen/qwen3.5-397b-a17b',                         label: 'Qwen 3.5 397B' },
    { value: 'qwen/qwen3.5-122b-a10b',                         label: 'Qwen 3.5 122B' },
    { value: 'mistralai/mistral-nemotron',                     label: 'Mistral Nemotron' },
    { value: 'mistralai/mistral-large',                        label: 'Mistral Large' },
    { value: 'microsoft/phi-4-mini-instruct',                  label: 'Phi-4 Mini (edge)' },
    { value: 'minimaxai/minimax-m2.7',                         label: 'MiniMax M2.7' },
  ],
  code: [
    { value: 'qwen/qwen3-coder-480b-a35b-instruct',            label: 'Qwen3-Coder 480B ✦' },
    { value: 'nvidia/llama-3.3-nemotron-super-49b-v1',         label: 'Nemotron Super 49B' },
    { value: 'deepseek-ai/deepseek-v4-pro',                    label: 'DeepSeek V4 Pro' },
    { value: 'mistralai/codestral-22b-instruct-v0.1',          label: 'Codestral 22B' },
    { value: 'google/codegemma-7b',                            label: 'CodeGemma 7B' },
    { value: 'bigcode/starcoder2-15b',                         label: 'StarCoder2 15B' },
    { value: 'meta/codellama-70b',                             label: 'CodeLlama 70B' },
  ],
  vision: [
    { value: 'meta/llama-4-maverick-17b-128e-instruct',        label: 'Llama 4 Maverick ✦' },
    { value: 'meta/llama-3.2-90b-vision-instruct',             label: 'Llama 3.2 90B Vision' },
    { value: 'meta/llama-3.2-11b-vision-instruct',             label: 'Llama 3.2 11B Vision' },
    { value: 'nvidia/llama-3.1-nemotron-nano-vl-8b-v1',        label: 'Nemotron Nano VL 8B' },
    { value: 'nvidia/nemotron-nano-12b-v2-vl',                 label: 'Nemotron Nano 12B VL' },
    { value: 'microsoft/phi-4-multimodal-instruct',            label: 'Phi-4 Multimodal' },
    { value: 'mistralai/mistral-medium-3.5-128b',              label: 'Mistral Medium 3.5' },
    { value: 'google/gemma-4-31b-it',                          label: 'Gemma 4 31B' },
  ],
  summarize: [
    { value: 'nvidia/llama-3.1-nemotron-ultra-253b-v1',        label: 'Nemotron Ultra 253B ✦' },
    { value: 'meta/llama-3.3-70b-instruct',                    label: 'Llama 3.3 70B' },
    { value: 'mistralai/mistral-large',                        label: 'Mistral Large' },
    { value: 'microsoft/phi-4-mini-instruct',                  label: 'Phi-4 Mini (fast)' },
  ],
  embeddings: [
    { value: 'nvidia/llama-nemotron-embed-1b-v2',              label: 'Nemotron Embed 1B v2 ✦' },
    { value: 'nvidia/llama-nemotron-embed-vl-1b-v2',           label: 'Nemotron Embed VL 1B v2' },
    { value: 'nvidia/nv-embedqa-e5-v5',                        label: 'NV-EmbedQA E5 v5' },
    { value: 'nvidia/nv-embedqa-mistral-7b-v2',                label: 'NV-EmbedQA Mistral 7B' },
    { value: 'baai/bge-m3',                                    label: 'BGE-M3 (multilingual)' },
    { value: 'snowflake/arctic-embed-l',                       label: 'Snowflake Arctic Embed L' },
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

export default function NvidiaNimNode({ config = {}, updateConfig, nodeId }) {
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
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'rgba(118,185,0,0.12)', border: '1px solid rgba(118,185,0,0.25)' }}>
          <svg viewBox="0 0 163.3 108" className="w-4 h-4" fill="#76B900">
            <path d="M60.6 36.5v-9.8C61.5 13 73.2 1.5 87.2.1c0 0-26.4 6.8-26.6 36.4zM60.6 44.5v18.7s8.1 4.2 16.7.4c10.5-4.6 27.8-24.8 47.7-18.6 0 0-14.7-17.6-37.4-14.6-12.3 1.6-21.3 8.6-27 14.1zM60.6 71.5v12.4C37.8 77.3 21.2 55.5 21.2 30c0-8.4 2-16.3 5.5-23.3C10.1 14.6 0 29.2 0 46.1c0 26.6 21.3 47.3 47.6 47.3 6.3 0 12.3-1.2 17.8-3.4v-22l-4.8 3.5z"/>
          </svg>
        </div>
        <div>
          <div className="text-[13px] font-bold text-white leading-tight">NVIDIA NIM</div>
          <div className="text-[10px] text-zinc-500">Inference Microservices API</div>
        </div>
      </div>

      {/* Credential */}
      <div className="px-4 py-3 border-b border-[#1a1a1a]">
        <CredentialPicker
          value={config.credentialId || ''}
          onChange={(id) => updateConfig('credentialId', id)}
          accentColor="green"
          credentialType="NvidiaNim"
          label="API Key"
          placeholder="Select NVIDIA NIM credential…"
        />
      </div>

      {/* Operation tabs */}
      <div className="px-4 py-3 border-b border-[#1a1a1a]">
        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Operation</span>
        <div className="flex gap-1 flex-wrap">
          {OPERATIONS.map(op => {
            const Icon = op.icon;
            const active = operation === op.value;
            return (
              <button key={op.value} type="button" onClick={() => setOperation(op.value)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-all duration-150"
                style={active
                  ? { background: 'rgba(118,185,0,0.12)', borderColor: 'rgba(118,185,0,0.35)', color: '#a3d94d' }
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
      {operation === 'embeddings' ? (
        <div className="px-4 py-3">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Input Text</span>
          <SmartVariableInput
            value={config.input || ''}
            onChange={v => updateConfig('input', v)}
            placeholder="Text to embed…"
            multiline
            nodeId={nodeId}
          />
        </div>
      ) : (
        <>
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
          {['chat', 'code', 'summarize'].includes(operation) && (
            <div className="px-4 py-3">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Max Tokens</span>
              <input
                type="number"
                value={config.maxTokens || 1024}
                onChange={e => updateConfig('maxTokens', parseInt(e.target.value) || 1024)}
                min={64} max={32768}
                className="w-full bg-[#0d0d0f] border border-zinc-800 rounded-lg px-3 py-2 text-[12px] text-zinc-100 focus:outline-none focus:border-zinc-600"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
