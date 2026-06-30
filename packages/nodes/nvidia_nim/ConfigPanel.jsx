import { useState } from 'react';
import {
  MessageSquare, Code2, Braces, Wrench, Brain, Image, Network, Binary, Tags,
  FileText, Languages, Smile, PenLine, Wand2, ChevronDown,
  RefreshCw, ArrowDownToLine,
} from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';
import CredentialPicker from '@/components/ui/CredentialPicker';
import api from '@/lib/api';

const ACCENT_HEX = '#76B900';

// ── Operations (mirrors backend OPERATIONS map exactly) ─────────────────────

const OPERATIONS = [
  { value: 'message',          label: 'Message',           icon: MessageSquare, description: 'Chat completion across the NIM catalog' },
  { value: 'code',             label: 'Code',              icon: Code2,         description: 'Generate or refactor code (coder models)' },
  { value: 'structuredOutput', label: 'Structured output', icon: Braces,        description: 'Force valid JSON, optionally to a schema' },
  { value: 'functionCalling',  label: 'Function calling',  icon: Wrench,        description: 'Let the model call your defined tools' },
  { value: 'reasoning',        label: 'Reasoning',         icon: Brain,         description: 'Extended step-by-step reasoning (Nemotron / DeepSeek)' },
  { value: 'analyzeImage',     label: 'Analyze image',     icon: Image,         description: 'Vision: describe or answer questions about an image' },
  { value: 'embeddings',       label: 'Embeddings',        icon: Network,       description: 'Vectorize text for search / RAG' },
  { value: 'extractData',      label: 'Extract data',      icon: Binary,        description: 'Pull structured fields out of text as JSON' },
  { value: 'classify',         label: 'Classify',          icon: Tags,          description: 'Label text into one of N categories' },
  { value: 'summarize',        label: 'Summarize',         icon: FileText,      description: 'Condense long text into a short summary' },
  { value: 'translate',        label: 'Translate',         icon: Languages,     description: 'Translate text between languages' },
  { value: 'sentiment',        label: 'Sentiment',         icon: Smile,         description: 'Sentiment + key-phrase + emotion analysis' },
  { value: 'generatePrompt',   label: 'Generate a prompt', icon: PenLine,       description: 'Write an effective prompt for a task' },
  { value: 'improvePrompt',    label: 'Improve a prompt',  icon: Wand2,         description: 'Rewrite an existing prompt to be stronger' },
];

// ── Latest models (NVIDIA NIM catalog, June 2026) ───────────────────────────

const MODELS_CHAT = [
  'nvidia/nemotron-3-super-120b-a12b',
  'nvidia/nemotron-3-ultra-550b-a55b',
  'nvidia/llama-3.3-nemotron-super-49b-v1',
  'meta/llama-3.3-70b-instruct',
  'deepseek-ai/deepseek-v4-pro',
  'moonshotai/kimi-k2.6',
  'qwen/qwen3.5-397b-a17b',
  'mistralai/mistral-large',
];
const MODELS_CODE = [
  'qwen/qwen3-coder-480b-a35b-instruct',
  'deepseek-ai/deepseek-v4-pro',
  'nvidia/nemotron-3-super-120b-a12b',
];
const MODELS_REASON = [
  'nvidia/nemotron-3-ultra-550b-a55b',
  'nvidia/llama-3.1-nemotron-ultra-253b-v1',
  'deepseek-ai/deepseek-v4-pro',
];
const MODELS_VISION = [
  'meta/llama-4-maverick-17b-128e-instruct',
  'meta/llama-3.2-90b-vision-instruct',
];
const MODELS_EMBED = [
  'nvidia/llama-nemotron-embed-1b-v2',
  'nvidia/nv-embedqa-e5-v5',
];

const SUMMARY_STYLES = [{ value: 'concise', label: 'Concise' }, { value: 'bullets', label: 'Bullets' }, { value: 'detailed', label: 'Detailed' }, { value: 'eli5', label: 'ELI5' }];

// ── Shared primitives ──────────────────────────────────────────────────────

function Field({ label, hint, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline gap-2">
        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{label}</span>
        {hint && <span className="text-[10px] text-zinc-600 normal-case tracking-normal">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function Select({ value, onChange, options }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const val = typeof o === 'string' ? o : o.value;
        const lbl = typeof o === 'string' ? o : o.label;
        const active = value === val;
        return (
          <button
            key={val || 'auto'}
            type="button"
            onClick={() => onChange(val)}
            style={active ? { backgroundColor: `${ACCENT_HEX}1a`, borderColor: `${ACCENT_HEX}55`, color: ACCENT_HEX } : undefined}
            className={`px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition-all duration-150 ${
              active ? '' : 'bg-[#0d0d0d] border-[#222] text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
            }`}
          >
            {lbl || 'Auto'}
          </button>
        );
      })}
    </div>
  );
}

function IOBadge({ label }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider"
      style={{ backgroundColor: `${ACCENT_HEX}1a`, border: `1px solid ${ACCENT_HEX}33`, color: ACCENT_HEX }}
    >
      <ArrowDownToLine className="w-3 h-3" strokeWidth={2.25} />
      {label}
    </span>
  );
}

// ── Model picker with live "fetch latest" ───────────────────────────────────

function ModelPicker({ value, onChange, fallback, credentialId }) {
  const [live, setLive] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const options = live.length ? live : fallback;

  async function fetchLatest() {
    if (!credentialId) { setError('Select a credential first.'); return; }
    setLoading(true); setError('');
    try {
      const res = await api.get(`/api/automation/models/nvidia_nim?credentialId=${encodeURIComponent(credentialId)}`);
      const ids = res.data?.models || [];
      setLive(ids.length ? ids : fallback);
      if (!ids.length) setError('No models returned.');
    } catch (e) {
      setError(e?.response?.data?.error || 'Could not fetch models.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Field label="Model">
      {options.length > 8 ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="bg-[#0d0d0d] border border-[#222] rounded-lg px-3 py-2 text-[12px] text-zinc-200 focus:outline-none"
        >
          {!options.includes(value) && value && <option value={value}>{value}</option>}
          {options.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      ) : (
        <Select value={value} onChange={onChange} options={options} />
      )}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={fetchLatest}
          disabled={loading}
          style={{ color: ACCENT_HEX }}
          className="inline-flex items-center gap-1.5 text-[10px] font-semibold hover:opacity-80 disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} strokeWidth={2} />
          {loading ? 'Fetching…' : 'Fetch latest from API'}
        </button>
        {error && <span className="text-[10px] text-rose-400/80">{error}</span>}
        {live.length > 0 && !error && <span className="text-[10px] text-zinc-600">{live.length} live models</span>}
      </div>
    </Field>
  );
}

// ── Per-operation config fields ─────────────────────────────────────────────

function MessageFields({ config, updateConfig, nodeId }) {
  return (
    <>
      <ModelPicker value={config.model || MODELS_CHAT[0]} onChange={(v) => updateConfig('model', v)} fallback={MODELS_CHAT} credentialId={config.credentialId} />
      <Field label="Output format">
        <Select
          value={config.outputFormat || 'text'}
          onChange={(v) => updateConfig('outputFormat', v)}
          options={[{ value: 'text', label: 'Raw Text' }, { value: 'json', label: 'JSON Object' }]}
        />
      </Field>
      <Field label="System prompt" hint="optional — sets the model's persona">
        <SmartVariableInput value={config.systemPrompt || ''} onChange={(v) => updateConfig('systemPrompt', v)} placeholder="You are a helpful assistant…" multiline nodeId={nodeId} />
      </Field>
      <Field label="Prompt">
        <SmartVariableInput value={config.prompt || ''} onChange={(v) => updateConfig('prompt', v)} placeholder="e.g. Draft a launch announcement for…" multiline nodeId={nodeId} />
      </Field>
    </>
  );
}

function CodeFields({ config, updateConfig, nodeId }) {
  return (
    <>
      <ModelPicker value={config.model || MODELS_CODE[0]} onChange={(v) => updateConfig('model', v)} fallback={MODELS_CODE} credentialId={config.credentialId} />
      <Field label="System prompt" hint="optional">
        <SmartVariableInput value={config.systemPrompt || ''} onChange={(v) => updateConfig('systemPrompt', v)} placeholder="You are an expert software engineer…" multiline nodeId={nodeId} />
      </Field>
      <Field label="Prompt">
        <SmartVariableInput value={config.prompt || ''} onChange={(v) => updateConfig('prompt', v)} placeholder="Write a Python function that…" multiline nodeId={nodeId} />
      </Field>
    </>
  );
}

function StructuredOutputFields({ config, updateConfig, nodeId }) {
  return (
    <>
      <ModelPicker value={config.model || MODELS_CHAT[0]} onChange={(v) => updateConfig('model', v)} fallback={MODELS_CHAT} credentialId={config.credentialId} />
      <Field label="System prompt" hint="optional">
        <SmartVariableInput value={config.systemPrompt || ''} onChange={(v) => updateConfig('systemPrompt', v)} placeholder="You are a structured-data extraction engine…" multiline nodeId={nodeId} />
      </Field>
      <Field label="Prompt">
        <SmartVariableInput value={config.prompt || ''} onChange={(v) => updateConfig('prompt', v)} placeholder="Extract the invoice line items." multiline nodeId={nodeId} />
      </Field>
      <Field label="JSON schema" hint="optional — schema the output should satisfy">
        <SmartVariableInput value={config.jsonSchema || ''} onChange={(v) => updateConfig('jsonSchema', v)} placeholder='{ "type":"object", "properties": { … } }' multiline nodeId={nodeId} />
      </Field>
    </>
  );
}

function FunctionCallingFields({ config, updateConfig, nodeId }) {
  return (
    <>
      <ModelPicker value={config.model || MODELS_CHAT[0]} onChange={(v) => updateConfig('model', v)} fallback={MODELS_CHAT} credentialId={config.credentialId} />
      <Field label="System prompt" hint="optional">
        <SmartVariableInput value={config.systemPrompt || ''} onChange={(v) => updateConfig('systemPrompt', v)} placeholder="You can call tools to answer…" multiline nodeId={nodeId} />
      </Field>
      <Field label="Prompt">
        <SmartVariableInput value={config.prompt || ''} onChange={(v) => updateConfig('prompt', v)} placeholder="What's the weather in Tokyo?" multiline nodeId={nodeId} />
      </Field>
      <Field label="Tools (JSON array)" hint="OpenAI-style function/tool definitions">
        <SmartVariableInput value={config.tools || ''} onChange={(v) => updateConfig('tools', v)} placeholder='[{ "name":"get_weather", "description":"…", "parameters": { … } }]' multiline nodeId={nodeId} />
      </Field>
      <Field label="Tool choice" hint="optional — 'auto', 'required', or a tool name">
        <SmartVariableInput value={config.toolChoice || ''} onChange={(v) => updateConfig('toolChoice', v)} placeholder="auto" nodeId={nodeId} />
      </Field>
    </>
  );
}

function ReasoningFields({ config, updateConfig, nodeId }) {
  return (
    <>
      <ModelPicker value={config.model || MODELS_REASON[0]} onChange={(v) => updateConfig('model', v)} fallback={MODELS_REASON} credentialId={config.credentialId} />
      <Field label="System prompt" hint="optional">
        <SmartVariableInput value={config.systemPrompt || ''} onChange={(v) => updateConfig('systemPrompt', v)} placeholder="Think step by step…" multiline nodeId={nodeId} />
      </Field>
      <Field label="Prompt">
        <SmartVariableInput value={config.prompt || ''} onChange={(v) => updateConfig('prompt', v)} placeholder="Reason through this problem…" multiline nodeId={nodeId} />
      </Field>
    </>
  );
}

function AnalyzeImageFields({ config, updateConfig, nodeId }) {
  return (
    <>
      <div className="flex items-center gap-2"><IOBadge label="Image in" /></div>
      <ModelPicker value={config.model || MODELS_VISION[0]} onChange={(v) => updateConfig('model', v)} fallback={MODELS_VISION} credentialId={config.credentialId} />
      <Field label="Image URL or data URI" hint="public http(s) URL or base64 data URI">
        <SmartVariableInput value={config.imageUrl || ''} onChange={(v) => updateConfig('imageUrl', v)} placeholder="https://… or {{$node.fileUrl}}" nodeId={nodeId} />
      </Field>
      <Field label="Question / Prompt">
        <SmartVariableInput value={config.question || ''} onChange={(v) => updateConfig('question', v)} placeholder="Describe this image in detail." multiline nodeId={nodeId} />
      </Field>
    </>
  );
}

function EmbeddingsFields({ config, updateConfig, nodeId }) {
  return (
    <>
      <ModelPicker value={config.model || MODELS_EMBED[0]} onChange={(v) => updateConfig('model', v)} fallback={MODELS_EMBED} credentialId={config.credentialId} />
      <Field label="Input type" hint="passage = documents to index · query = a search query">
        <Select
          value={config.inputType || 'passage'}
          onChange={(v) => updateConfig('inputType', v)}
          options={[{ value: 'passage', label: 'Passage' }, { value: 'query', label: 'Query' }]}
        />
      </Field>
      <Field label="Text to embed" hint="optional — falls back to previous node output">
        <SmartVariableInput value={config.input || ''} onChange={(v) => updateConfig('input', v)} placeholder="{{$node.content}}" multiline nodeId={nodeId} />
      </Field>
    </>
  );
}

function ExtractDataFields({ config, updateConfig, nodeId }) {
  return (
    <>
      <ModelPicker value={config.model || MODELS_CHAT[0]} onChange={(v) => updateConfig('model', v)} fallback={MODELS_CHAT} credentialId={config.credentialId} />
      <Field label="Fields to extract" hint="e.g. name, email, company">
        <SmartVariableInput value={config.fields || ''} onChange={(v) => updateConfig('fields', v)} placeholder="name, email, company, role" nodeId={nodeId} />
      </Field>
      <Field label="Source text" hint="optional — falls back to previous node output">
        <SmartVariableInput value={config.text || ''} onChange={(v) => updateConfig('text', v)} placeholder="{{$node.content}}" multiline nodeId={nodeId} />
      </Field>
    </>
  );
}

function ClassifyFields({ config, updateConfig, nodeId }) {
  return (
    <>
      <ModelPicker value={config.model || MODELS_CHAT[0]} onChange={(v) => updateConfig('model', v)} fallback={MODELS_CHAT} credentialId={config.credentialId} />
      <Field label="Labels" hint="comma separated">
        <SmartVariableInput value={config.labels || ''} onChange={(v) => updateConfig('labels', v)} placeholder={'positive, neutral, negative'} multiline nodeId={nodeId} />
      </Field>
      <Field label="Text to classify" hint="optional — falls back to previous node output">
        <SmartVariableInput value={config.text || ''} onChange={(v) => updateConfig('text', v)} placeholder="{{$node.content}}" multiline nodeId={nodeId} />
      </Field>
    </>
  );
}

function SummarizeFields({ config, updateConfig, nodeId }) {
  return (
    <>
      <ModelPicker value={config.model || MODELS_CHAT[0]} onChange={(v) => updateConfig('model', v)} fallback={MODELS_CHAT} credentialId={config.credentialId} />
      <Field label="Style">
        <Select value={config.style || 'concise'} onChange={(v) => updateConfig('style', v)} options={SUMMARY_STYLES} />
      </Field>
      <Field label="Max words" hint="optional">
        <SmartVariableInput value={config.maxWords ?? ''} onChange={(v) => updateConfig('maxWords', v)} placeholder="120" nodeId={nodeId} />
      </Field>
      <Field label="Text to summarize" hint="optional — falls back to previous node output">
        <SmartVariableInput value={config.text || ''} onChange={(v) => updateConfig('text', v)} placeholder="{{$node.content}}" multiline nodeId={nodeId} />
      </Field>
    </>
  );
}

function TranslateFields({ config, updateConfig, nodeId }) {
  return (
    <>
      <ModelPicker value={config.model || MODELS_CHAT[0]} onChange={(v) => updateConfig('model', v)} fallback={MODELS_CHAT} credentialId={config.credentialId} />
      <Field label="Target language">
        <SmartVariableInput value={config.targetLanguage || ''} onChange={(v) => updateConfig('targetLanguage', v)} placeholder="French" nodeId={nodeId} />
      </Field>
      <Field label="Text to translate" hint="optional — falls back to previous node output">
        <SmartVariableInput value={config.text || ''} onChange={(v) => updateConfig('text', v)} placeholder="{{$node.content}}" multiline nodeId={nodeId} />
      </Field>
    </>
  );
}

function SentimentFields({ config, updateConfig, nodeId }) {
  return (
    <>
      <ModelPicker value={config.model || MODELS_CHAT[0]} onChange={(v) => updateConfig('model', v)} fallback={MODELS_CHAT} credentialId={config.credentialId} />
      <Field label="Text to analyze" hint="optional — falls back to previous node output">
        <SmartVariableInput value={config.text || ''} onChange={(v) => updateConfig('text', v)} placeholder="{{$node.content}}" multiline nodeId={nodeId} />
      </Field>
    </>
  );
}

function GeneratePromptFields({ config, updateConfig, nodeId }) {
  return (
    <>
      <ModelPicker value={config.model || MODELS_CHAT[0]} onChange={(v) => updateConfig('model', v)} fallback={MODELS_CHAT} credentialId={config.credentialId} />
      <Field label="Task description">
        <SmartVariableInput value={config.task || ''} onChange={(v) => updateConfig('task', v)} placeholder="e.g. Classify support tickets by priority…" multiline nodeId={nodeId} />
      </Field>
    </>
  );
}

function ImprovePromptFields({ config, updateConfig, nodeId }) {
  return (
    <>
      <ModelPicker value={config.model || MODELS_CHAT[0]} onChange={(v) => updateConfig('model', v)} fallback={MODELS_CHAT} credentialId={config.credentialId} />
      <Field label="Prompt to improve">
        <SmartVariableInput value={config.prompt || ''} onChange={(v) => updateConfig('prompt', v)} placeholder="Paste the prompt you want to sharpen…" multiline nodeId={nodeId} />
      </Field>
    </>
  );
}

const OP_FIELDS = {
  message: MessageFields,
  code: CodeFields,
  structuredOutput: StructuredOutputFields,
  functionCalling: FunctionCallingFields,
  reasoning: ReasoningFields,
  analyzeImage: AnalyzeImageFields,
  embeddings: EmbeddingsFields,
  extractData: ExtractDataFields,
  classify: ClassifyFields,
  summarize: SummarizeFields,
  translate: TranslateFields,
  sentiment: SentimentFields,
  generatePrompt: GeneratePromptFields,
  improvePrompt: ImprovePromptFields,
};

// Which ops accept the sampling/advanced block (embeddings & reasoning don't)
const ADVANCED_OPS = new Set(['message', 'code', 'structuredOutput', 'functionCalling', 'analyzeImage', 'summarize']);

// ── Advanced (sampling) section ─────────────────────────────────────────────

function AdvancedSection({ config, updateConfig, nodeId }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-[#222] pt-4">
      <button type="button" onClick={() => setOpen(!open)} className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-500 uppercase tracking-widest hover:text-zinc-300">
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${open ? 'rotate-0' : '-rotate-90'}`} strokeWidth={2.25} />
        Advanced settings
      </button>
      {open && (
        <div className="flex flex-col gap-4 mt-4">
          <Field label="Temperature" hint="0 = deterministic · 2 = wild">
            <SmartVariableInput value={config.temperature ?? ''} onChange={(v) => updateConfig('temperature', v)} placeholder="0.7" nodeId={nodeId} />
          </Field>
          <Field label="Max tokens">
            <SmartVariableInput value={config.maxTokens ?? ''} onChange={(v) => updateConfig('maxTokens', v)} placeholder="2000" nodeId={nodeId} />
          </Field>
          <Field label="Top P" hint="nucleus sampling 0–1">
            <SmartVariableInput value={config.topP ?? ''} onChange={(v) => updateConfig('topP', v)} placeholder="0.9" nodeId={nodeId} />
          </Field>
          <Field label="Frequency penalty" hint="-2 to 2">
            <SmartVariableInput value={config.frequencyPenalty ?? ''} onChange={(v) => updateConfig('frequencyPenalty', v)} placeholder="0" nodeId={nodeId} />
          </Field>
          <Field label="Presence penalty" hint="-2 to 2">
            <SmartVariableInput value={config.presencePenalty ?? ''} onChange={(v) => updateConfig('presencePenalty', v)} placeholder="0" nodeId={nodeId} />
          </Field>
          <Field label="Stop sequences" hint="one per line, max 4">
            <SmartVariableInput value={config.stop || ''} onChange={(v) => updateConfig('stop', v)} placeholder={'###\nEND'} multiline nodeId={nodeId} />
          </Field>
        </div>
      )}
    </div>
  );
}

// ── Operation picker ────────────────────────────────────────────────────────

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
              style={active ? { backgroundColor: `${ACCENT_HEX}1a`, borderColor: `${ACCENT_HEX}55` } : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all duration-150
                ${active ? '' : 'bg-[#0d0d0d] border-[#222] text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200 hover:border-zinc-700/50'}`}
            >
              <Icon className="w-4 h-4 shrink-0" strokeWidth={1.75} style={{ color: active ? ACCENT_HEX : undefined }} />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold leading-tight" style={{ color: active ? ACCENT_HEX : undefined }}>{op.label}</div>
                <div className="text-[10px] text-zinc-600 mt-0.5 leading-snug">{op.description}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Header (NVIDIA mark) ────────────────────────────────────────────────────

function Header() {
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${ACCENT_HEX}1a`, border: `1px solid ${ACCENT_HEX}33` }}
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill={ACCENT_HEX} aria-hidden="true">
          <path d="M8.95 8.6V7.1c.15-.01.3-.02.45-.02 4.1-.13 6.8 3.52 6.8 3.52s-2.9 4.04-6.02 4.04c-.43 0-.84-.07-1.23-.2v-4.6c1.6.19 1.92.9 2.88 2.5l2.14-1.8s-1.56-2.05-4.2-2.05c-.28 0-.56.02-.82.06zm0-4.95v2.25l.45-.03c5.7-.19 9.42 4.67 9.42 4.67s-4.27 5.19-8.71 5.19c-.39 0-.78-.04-1.16-.11v1.39c.32.04.64.07.97.07 4.13 0 7.12-2.11 10.01-4.6.48.38 2.44 1.32 2.84 1.73-2.75 2.3-9.15 4.16-12.79 4.16-.35 0-.69-.02-1.03-.05v1.96H24V3.65H8.95zm0 10.79v1.19c-3.82-.68-4.88-4.65-4.88-4.65s1.83-2.03 4.88-2.36v1.3h-.01c-1.6-.19-2.85 1.3-2.85 1.3s.7 2.51 2.86 3.22z" />
        </svg>
      </div>
      <div className="min-w-0">
        <div className="text-[13px] font-semibold text-zinc-100 leading-tight">NVIDIA NIM</div>
        <div className="text-[10px] text-zinc-500 leading-tight">Nemotron · Llama · DeepSeek · Qwen · vision &amp; embeddings</div>
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export default function NvidiaNimNode({ config = {}, updateConfig, nodeId }) {
  const operation = config.operation || 'message';
  const OpFields = OP_FIELDS[operation] || MessageFields;

  return (
    <div className="flex flex-col gap-5 w-full">
      <Header />

      <CredentialPicker
        value={config.credentialId || ''}
        onChange={(id) => updateConfig('credentialId', id)}
        accentColor="green"
        credentialType="NvidiaNim"
        label="NVIDIA NIM API Key"
        placeholder="Select NVIDIA NIM credential…"
      />

      <div className="border-t border-[#222]" />

      <OperationPicker value={operation} onChange={(v) => updateConfig('operation', v)} />

      <div className="border-t border-[#222]" />

      <OpFields config={config} updateConfig={updateConfig} nodeId={nodeId} />

      {ADVANCED_OPS.has(operation) && (
        <AdvancedSection config={config} updateConfig={updateConfig} nodeId={nodeId} />
      )}
    </div>
  );
}
