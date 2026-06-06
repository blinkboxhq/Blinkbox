import { MessageSquare, Cpu, Zap, FileText, Image, Layers } from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';
import CredentialPicker from '@/components/ui/CredentialPicker';

const ACCENT_COLOR = '#76B900';

const OPERATIONS = [
  { value: 'chat',           label: 'Chat completion',    icon: MessageSquare, description: 'Send a prompt to any NIM-hosted model' },
  { value: 'embeddings',     label: 'Generate embeddings', icon: Layers,        description: 'Convert text to vector embeddings' },
  { value: 'vision',         label: 'Vision / image',     icon: Image,         description: 'Analyze images with multimodal models' },
  { value: 'summarize',      label: 'Summarize text',     icon: FileText,      description: 'Condense long documents or passages' },
  { value: 'code',           label: 'Code generation',    icon: Cpu,           description: 'Generate or explain code with CodeLlama / Starcoder' },
];

const MODELS_CHAT = [
  { value: 'meta/llama-3.3-70b-instruct',        label: 'Llama 3.3 70B Instruct' },
  { value: 'meta/llama-3.1-405b-instruct',       label: 'Llama 3.1 405B Instruct' },
  { value: 'meta/llama-3.1-8b-instruct',         label: 'Llama 3.1 8B Instruct' },
  { value: 'nvidia/llama-3.1-nemotron-70b-instruct', label: 'Nemotron 70B' },
  { value: 'mistralai/mistral-large-2-instruct', label: 'Mistral Large 2' },
  { value: 'mistralai/mixtral-8x22b-instruct-v0.1', label: 'Mixtral 8x22B' },
  { value: 'qwen/qwen2.5-72b-instruct',          label: 'Qwen 2.5 72B' },
  { value: 'google/gemma-2-27b-it',              label: 'Gemma 2 27B' },
  { value: 'microsoft/phi-3-medium-128k-instruct', label: 'Phi-3 Medium 128K' },
];

const MODELS_EMBED = [
  { value: 'nvidia/nv-embedqa-e5-v5',             label: 'NV-EmbedQA E5 v5' },
  { value: 'nvidia/llama-3.2-nv-embedqa-1b-v2',  label: 'Llama 3.2 EmbedQA 1B v2' },
  { value: 'baai/bge-m3',                         label: 'BGE-M3' },
];

const MODELS_VISION = [
  { value: 'meta/llama-3.2-90b-vision-instruct', label: 'Llama 3.2 90B Vision' },
  { value: 'meta/llama-3.2-11b-vision-instruct', label: 'Llama 3.2 11B Vision' },
  { value: 'microsoft/phi-3.5-vision-instruct',  label: 'Phi-3.5 Vision' },
];

const MODELS_CODE = [
  { value: 'meta/codellama-70b',                  label: 'CodeLlama 70B' },
  { value: 'bigcode/starcoder2-15b',              label: 'StarCoder2 15B' },
  { value: 'nvidia/llama-3.1-nemotron-70b-instruct', label: 'Nemotron 70B' },
];

function modelsForOp(op) {
  if (op === 'embeddings') return MODELS_EMBED;
  if (op === 'vision')     return MODELS_VISION;
  if (op === 'code')       return MODELS_CODE;
  return MODELS_CHAT;
}

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{label}</span>
      {children}
    </div>
  );
}

function ModelPicker({ value, onChange, models }) {
  return (
    <div className="flex flex-col gap-1">
      {models.map((m) => {
        const active = value === m.value;
        return (
          <button key={m.value} type="button" onClick={() => onChange(m.value)}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-left text-[12px] font-medium transition-all duration-150 ${
              active
                ? 'border-[#76B900]/40 text-white'
                : 'bg-[#0d0d0d] border-[#222] text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
            }`}
            style={active ? { background: 'rgba(118,185,0,0.08)', color: '#a3d94d' } : undefined}
          >
            {m.label}
          </button>
        );
      })}
    </div>
  );
}

function OperationPicker({ value, onChange }) {
  return (
    <div className="flex flex-col gap-1">
      {OPERATIONS.map((op) => {
        const Icon = op.icon;
        const active = value === op.value;
        return (
          <button key={op.value} type="button" onClick={() => onChange(op.value)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all duration-150 ${
              active
                ? 'border-[#76B900]/40 text-[#a3d94d]'
                : 'bg-[#0d0d0d] border-[#222] text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200 hover:border-zinc-700/50'
            }`}
            style={active ? { background: 'rgba(118,185,0,0.08)' } : undefined}
          >
            <Icon className="w-4 h-4 shrink-0" strokeWidth={1.75}
              style={active ? { color: '#76B900' } : undefined} />
            <div className="flex-1 min-w-0">
              <div className={`text-xs font-semibold leading-tight ${active ? 'text-[#a3d94d]' : 'text-zinc-300'}`}>{op.label}</div>
              <div className="text-[10px] text-zinc-600 mt-0.5 leading-snug">{op.description}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default function NvidiaNimNode({ config = {}, updateConfig, nodeId }) {
  const operation = config.operation || 'chat';
  const models = modelsForOp(operation);
  const defaultModel = models[0].value;

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Header */}
      <div className="flex items-center gap-3 pb-1">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'rgba(118,185,0,0.12)', border: '1px solid rgba(118,185,0,0.25)' }}>
          <Zap size={15} style={{ color: '#76B900' }} />
        </div>
        <div>
          <div className="text-[14px] font-bold text-white leading-tight">NVIDIA NIM</div>
          <div className="text-[11px] text-zinc-500">Inference Microservices API</div>
        </div>
      </div>

      <div className="border-t border-[#1a1a1a]" />

      {/* Operation */}
      <Field label="Operation">
        <OperationPicker value={operation} onChange={(v) => {
          updateConfig('operation', v);
          updateConfig('model', modelsForOp(v)[0].value);
        }} />
      </Field>

      <div className="border-t border-[#1a1a1a]" />

      {/* Model */}
      <Field label="Model">
        <ModelPicker
          value={config.model || defaultModel}
          onChange={(v) => updateConfig('model', v)}
          models={models}
        />
      </Field>

      {/* Operation-specific fields */}
      {operation !== 'embeddings' && (
        <>
          <div className="border-t border-[#1a1a1a]" />
          <Field label={operation === 'vision' ? 'Image URL' : 'Prompt'}>
            <SmartVariableInput
              value={config.prompt || ''}
              onChange={(v) => updateConfig('prompt', v)}
              placeholder={operation === 'vision' ? 'https://... or {{$node.imageUrl}}' : 'Enter your prompt…'}
              multiline
              nodeId={nodeId}
            />
          </Field>
          {operation === 'vision' && (
            <Field label="Question / Prompt">
              <SmartVariableInput
                value={config.question || ''}
                onChange={(v) => updateConfig('question', v)}
                placeholder="Describe this image in detail."
                multiline
                nodeId={nodeId}
              />
            </Field>
          )}
        </>
      )}

      {operation === 'embeddings' && (
        <>
          <div className="border-t border-[#1a1a1a]" />
          <Field label="Input text">
            <SmartVariableInput
              value={config.input || ''}
              onChange={(v) => updateConfig('input', v)}
              placeholder="Text to embed…"
              multiline
              nodeId={nodeId}
            />
          </Field>
        </>
      )}

      {/* Max tokens — only for generation ops */}
      {['chat', 'code', 'summarize'].includes(operation) && (
        <Field label="Max tokens">
          <input
            type="number"
            value={config.maxTokens || 1024}
            onChange={(e) => updateConfig('maxTokens', parseInt(e.target.value) || 1024)}
            min={64}
            max={4096}
            className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500 w-full"
          />
        </Field>
      )}

      <div className="border-t border-[#1a1a1a]" />

      <CredentialPicker
        value={config.credentialId || ''}
        onChange={(id) => updateConfig('credentialId', id)}
        accentColor="lime"
        label="NVIDIA NIM API Key"
        placeholder="Select NVIDIA NIM credential…"
      />
    </div>
  );
}
