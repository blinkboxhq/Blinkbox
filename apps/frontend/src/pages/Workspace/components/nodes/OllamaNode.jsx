import {
  MessageSquare, Image, Layers, ChevronDown,
} from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';

const OPERATIONS = [
  {
    value: 'message',
    label: 'Message a model',
    icon: MessageSquare,
    description: 'Chat with any local Ollama model (llama3, mistral, gemma…)',
  },
  {
    value: 'analyzeImage',
    label: 'Analyze image',
    icon: Image,
    description: 'Vision with llava, bakllava, or moondream',
  },
  {
    value: 'generateEmbedding',
    label: 'Generate embedding',
    icon: Layers,
    description: 'Produce a vector from text using nomic-embed-text or any embed model',
  },
];

const MODELS_CHAT = ['llama3', 'llama3.1', 'mistral', 'gemma', 'phi3', 'qwen2', 'codellama'];
const MODELS_VISION = ['llava', 'llava:13b', 'bakllava', 'moondream'];
const MODELS_EMBED = ['nomic-embed-text', 'mxbai-embed-large', 'all-minilm'];

// ── Shared primitives ──────────────────────────────────────────────────────

function Field({ label, hint, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{label}</span>
      {children}
      {hint && <span className="text-[10px] text-zinc-600 leading-snug">{hint}</span>}
    </div>
  );
}

function Select({ value, onChange, options, freeform = false }) {
  return (
    <div className="relative">
      <select
        value={options.includes(value) ? value : '__custom__'}
        onChange={(e) => e.target.value !== '__custom__' && onChange(e.target.value)}
        className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2 pr-8 text-xs text-white font-semibold focus:outline-none focus:border-slate-500/50 transition-colors cursor-pointer appearance-none"
      >
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
        {freeform && <option value="__custom__">Other (type below)…</option>}
      </select>
      <ChevronDown className="w-3.5 h-3.5 text-zinc-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
    </div>
  );
}

// ── Operation picker ───────────────────────────────────────────────────────

function OperationPicker({ value, onChange }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Operation</span>
      <div className="grid grid-cols-1 gap-1">
        {OPERATIONS.map((op) => {
          const Icon = op.icon;
          const active = value === op.value;
          return (
            <button
              key={op.value}
              type="button"
              onClick={() => onChange(op.value)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all duration-150
                ${active
                  ? 'bg-slate-500/10 border-slate-500/30'
                  : 'bg-[#0d0d0d] border-[#222] hover:bg-zinc-800/60 hover:border-zinc-700/50'
                }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-slate-300' : 'text-zinc-500'}`} strokeWidth={1.75} />
              <div className="flex-1 min-w-0">
                <div className={`text-xs font-semibold leading-tight ${active ? 'text-slate-200' : 'text-zinc-300'}`}>{op.label}</div>
                <div className="text-[10px] text-zinc-600 mt-0.5 leading-snug">{op.description}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Per-operation config fields ────────────────────────────────────────────

function MessageFields({ config, updateConfig }) {
  return (
    <>
      <Field label="Model">
        <Select value={config.model || 'llama3'} onChange={(v) => updateConfig('model', v)} options={MODELS_CHAT} freeform />
        {!MODELS_CHAT.includes(config.model || 'llama3') && (
          <input
            value={config.model || ''}
            onChange={(e) => updateConfig('model', e.target.value)}
            placeholder="custom model name…"
            className="mt-1.5 w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-slate-500/50"
          />
        )}
      </Field>
      <Field label="Output format">
        <Select
          value={config.outputFormat || 'text'}
          onChange={(v) => updateConfig('outputFormat', v)}
          options={['text', 'json']}
        />
      </Field>
      <Field label="Prompt">
        <SmartVariableInput value={config.prompt || ''} onChange={(v) => updateConfig('prompt', v)} placeholder="e.g. Summarize the following text..." multiline />
      </Field>
      <Field label="Server URL" hint="Default: http://localhost:11434">
        <SmartVariableInput value={config.baseUrl || ''} onChange={(v) => updateConfig('baseUrl', v)} placeholder="http://localhost:11434" />
      </Field>
    </>
  );
}

function AnalyzeImageFields({ config, updateConfig }) {
  return (
    <>
      <Field label="Vision model" hint="Must be a vision model: llava, bakllava, moondream">
        <Select value={config.model || 'llava'} onChange={(v) => updateConfig('model', v)} options={MODELS_VISION} freeform />
      </Field>
      <Field label="Image URL">
        <SmartVariableInput value={config.imageUrl || ''} onChange={(v) => updateConfig('imageUrl', v)} placeholder="https://... or {{$node.imageUrl}}" />
      </Field>
      <Field label="Question / Prompt">
        <SmartVariableInput value={config.prompt || ''} onChange={(v) => updateConfig('prompt', v)} placeholder="Describe this image in detail." multiline />
      </Field>
      <Field label="Server URL" hint="Default: http://localhost:11434">
        <SmartVariableInput value={config.baseUrl || ''} onChange={(v) => updateConfig('baseUrl', v)} placeholder="http://localhost:11434" />
      </Field>
    </>
  );
}

function GenerateEmbeddingFields({ config, updateConfig }) {
  return (
    <>
      <Field label="Embedding model">
        <Select value={config.embeddingModel || 'nomic-embed-text'} onChange={(v) => updateConfig('embeddingModel', v)} options={MODELS_EMBED} freeform />
      </Field>
      <Field label="Text to embed" hint="Output: { embedding: [...], dimensions: N }">
        <SmartVariableInput value={config.text || ''} onChange={(v) => updateConfig('text', v)} placeholder="{{$node.content}} or type text directly..." multiline />
      </Field>
      <Field label="Server URL" hint="Default: http://localhost:11434">
        <SmartVariableInput value={config.baseUrl || ''} onChange={(v) => updateConfig('baseUrl', v)} placeholder="http://localhost:11434" />
      </Field>
    </>
  );
}

const OP_FIELDS = {
  message: MessageFields,
  analyzeImage: AnalyzeImageFields,
  generateEmbedding: GenerateEmbeddingFields,
};

// ── Main component ─────────────────────────────────────────────────────────

export default function OllamaNode({ config = {}, updateConfig }) {
  const operation = config.operation || 'message';
  const OpFields = OP_FIELDS[operation] || MessageFields;

  return (
    <div className="flex flex-col gap-5 w-full">
      <OperationPicker value={operation} onChange={(v) => updateConfig('operation', v)} />
      <div className="border-t border-[#222]" />
      <OpFields config={config} updateConfig={updateConfig} />
      {/* No CredentialPicker — Ollama is local, no API key needed */}
      <div className="flex items-center gap-2 px-3 py-2 bg-zinc-800/40 border border-zinc-700/30 rounded-lg">
        <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
        <span className="text-[10px] text-zinc-500">No API key required — runs locally via Ollama</span>
      </div>
    </div>
  );
}
