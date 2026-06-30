import { useState } from 'react';
import {
  Sparkles, MessageSquare, Image, FileText, PenLine, Braces, Wrench, Brain,
  Wand2, FileType2, Mic, Video, Binary, ScanText, Tags, ScrollText, Languages,
  ChevronDown, RefreshCw, FileUp, FileDown,
} from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';
import CredentialPicker from '../../../../components/ui/CredentialPicker';
import api from '../../../../lib/api';

const ACCENT = 'blue';

// ── Operations (mirrors backend OPERATIONS map exactly) ─────────────────────

const OPERATIONS = [
  { value: 'message',          label: 'Message a model',     icon: MessageSquare, description: 'Send a prompt, get a text or JSON response' },
  { value: 'structuredOutput', label: 'Structured output',   icon: Braces,        description: 'Force a strict JSON schema on the response' },
  { value: 'functionCalling',  label: 'Function calling',    icon: Wrench,        description: 'Let the model pick & fill tools you define' },
  { value: 'reasoning',        label: 'Reasoning',           icon: Brain,         description: 'Deep multi-step reasoning with a thinking budget' },
  { value: 'analyzeImage',     label: 'Analyze image',       icon: Image,         description: 'Describe or ask questions about an image' },
  { value: 'generateImage',    label: 'Generate image',      icon: Wand2,         description: 'Create an image natively from text' },
  { value: 'analyzeDocument',  label: 'Analyze document',    icon: FileText,      description: 'Ask questions about a long document or text' },
  { value: 'analyzePdf',       label: 'Analyze PDF',         icon: FileType2,     description: 'Read & answer questions about a PDF file' },
  { value: 'analyzeAudio',     label: 'Analyze audio',       icon: Mic,           description: 'Transcribe or understand audio' },
  { value: 'analyzeVideo',     label: 'Analyze video',       icon: Video,         description: 'Understand and describe a video' },
  { value: 'embeddings',       label: 'Embeddings',          icon: Binary,        description: 'Turn text into vectors for search & RAG' },
  { value: 'extractData',      label: 'Extract data',        icon: ScanText,      description: 'Pull structured fields out of messy text' },
  { value: 'classify',         label: 'Classify text',       icon: Tags,          description: 'Label text into one of your categories' },
  { value: 'summarize',        label: 'Summarize',           icon: ScrollText,    description: 'Condense long text into a summary' },
  { value: 'translate',        label: 'Translate',           icon: Languages,     description: 'Translate text into another language' },
  { value: 'generatePrompt',   label: 'Generate a prompt',   icon: PenLine,       description: 'Let Gemini write an effective prompt for a task' },
];

// ── Latest models (June 2026) ───────────────────────────────────────────────

const MODELS_CHAT    = ['gemini-3.5-flash', 'gemini-3.1-pro-preview', 'gemini-3-flash-preview', 'gemini-3.1-flash-lite', 'gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'];
const MODELS_REASON  = ['gemini-3.1-pro-preview', 'gemini-3.5-flash', 'gemini-2.5-pro', 'gemini-2.5-flash'];
const MODELS_VISION  = ['gemini-3.5-flash', 'gemini-3.1-pro-preview', 'gemini-2.5-pro', 'gemini-2.5-flash'];
const MODELS_IMAGE   = ['gemini-3.1-flash-image', 'gemini-3-pro-image', 'gemini-2.5-flash-image'];
const MODELS_EMBED   = ['gemini-embedding-2', 'gemini-embedding-001'];

const EMBED_DIMS     = ['', '256', '512', '768', '1536', '3072'];

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
            className={`px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition-all duration-150 ${
              active
                ? 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                : 'bg-[#0d0d0d] border-[#222] text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
            }`}
          >
            {lbl || 'Auto'}
          </button>
        );
      })}
    </div>
  );
}

function Toggle({ value, onChange, label }) {
  return (
    <button type="button" onClick={() => onChange(!value)} className="flex items-center gap-2.5 group">
      <span className={`w-10 h-5 rounded-full p-0.5 transition-all duration-150 ${value ? 'bg-blue-500/80' : 'bg-zinc-700'}`}>
        <span className={`block w-4 h-4 rounded-full bg-white transition-transform duration-150 ${value ? 'translate-x-5' : 'translate-x-0'}`} />
      </span>
      <span className="text-[11px] font-semibold text-zinc-400 group-hover:text-zinc-200">{label}</span>
    </button>
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
      const res = await api.get(`/api/automation/models/gemini?credentialId=${encodeURIComponent(credentialId)}`);
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
          className="bg-[#0d0d0d] border border-[#222] rounded-lg px-3 py-2 text-[12px] text-zinc-200 focus:outline-none focus:border-blue-500/40"
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
          className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-blue-400/80 hover:text-blue-300 disabled:opacity-50"
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

// ── File I/O badges ─────────────────────────────────────────────────────────

function IOBadge({ dir, label }) {
  const Icon = dir === 'in' ? FileUp : FileDown;
  return (
    <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border border-blue-500/20 bg-blue-500/5 text-blue-400/80">
      <Icon className="w-2.5 h-2.5" strokeWidth={2.25} />{label}
    </span>
  );
}

// ── Per-operation config fields ─────────────────────────────────────────────

function MessageFields({ config, updateConfig, nodeId }) {
  return (
    <>
      <ModelPicker value={config.model || 'gemini-3.5-flash'} onChange={(v) => updateConfig('model', v)} fallback={MODELS_CHAT} credentialId={config.credentialId} />
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
        <SmartVariableInput value={config.prompt || ''} onChange={(v) => updateConfig('prompt', v)} placeholder="e.g. Summarize the following data…" multiline nodeId={nodeId} />
      </Field>
    </>
  );
}

function StructuredOutputFields({ config, updateConfig, nodeId }) {
  return (
    <>
      <ModelPicker value={config.model || 'gemini-3.5-flash'} onChange={(v) => updateConfig('model', v)} fallback={MODELS_CHAT} credentialId={config.credentialId} />
      <Field label="System prompt" hint="optional">
        <SmartVariableInput value={config.systemPrompt || ''} onChange={(v) => updateConfig('systemPrompt', v)} placeholder="You are a structured-data extraction engine…" multiline nodeId={nodeId} />
      </Field>
      <Field label="Prompt">
        <SmartVariableInput value={config.prompt || ''} onChange={(v) => updateConfig('prompt', v)} placeholder="Extract the order details from the input." multiline nodeId={nodeId} />
      </Field>
      <Field label="Response schema (JSON)" hint="optional — OpenAPI-subset schema Gemini enforces">
        <SmartVariableInput value={config.jsonSchema || ''} onChange={(v) => updateConfig('jsonSchema', v)} placeholder='{ "type":"object", "properties": { … }, "required": [ … ] }' multiline nodeId={nodeId} />
      </Field>
    </>
  );
}

function FunctionCallingFields({ config, updateConfig, nodeId }) {
  return (
    <>
      <ModelPicker value={config.model || 'gemini-3.5-flash'} onChange={(v) => updateConfig('model', v)} fallback={MODELS_CHAT} credentialId={config.credentialId} />
      <Field label="System prompt" hint="optional">
        <SmartVariableInput value={config.systemPrompt || ''} onChange={(v) => updateConfig('systemPrompt', v)} placeholder="You can call the provided tools…" multiline nodeId={nodeId} />
      </Field>
      <Field label="Prompt">
        <SmartVariableInput value={config.prompt || ''} onChange={(v) => updateConfig('prompt', v)} placeholder="What's the weather in Tokyo right now?" multiline nodeId={nodeId} />
      </Field>
      <Field label="Tools (JSON array)" hint="function declarations">
        <SmartVariableInput value={config.tools || ''} onChange={(v) => updateConfig('tools', v)} placeholder='[ { "name":"get_weather", "description":"…", "parameters": { … } } ]' multiline nodeId={nodeId} />
      </Field>
      <Field label="Tool choice" hint="auto · required · none">
        <Select
          value={config.toolChoice || 'auto'}
          onChange={(v) => updateConfig('toolChoice', v)}
          options={[{ value: 'auto', label: 'Auto' }, { value: 'required', label: 'Required' }, { value: 'none', label: 'None' }]}
        />
      </Field>
    </>
  );
}

function ReasoningFields({ config, updateConfig, nodeId }) {
  return (
    <>
      <ModelPicker value={config.model || 'gemini-3.1-pro-preview'} onChange={(v) => updateConfig('model', v)} fallback={MODELS_REASON} credentialId={config.credentialId} />
      <Field label="Thinking budget">
        <Select
          value={config.reasoningEffort || 'medium'}
          onChange={(v) => updateConfig('reasoningEffort', v)}
          options={[{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }]}
        />
      </Field>
      <Field label="System prompt" hint="optional">
        <SmartVariableInput value={config.systemPrompt || ''} onChange={(v) => updateConfig('systemPrompt', v)} placeholder="Think step by step…" multiline nodeId={nodeId} />
      </Field>
      <Field label="Prompt">
        <SmartVariableInput value={config.prompt || ''} onChange={(v) => updateConfig('prompt', v)} placeholder="Solve this multi-step problem…" multiline nodeId={nodeId} />
      </Field>
      <Field label="Max output tokens" hint="optional">
        <SmartVariableInput value={config.maxTokens || ''} onChange={(v) => updateConfig('maxTokens', v)} placeholder="8000" nodeId={nodeId} />
      </Field>
    </>
  );
}

function AnalyzeImageFields({ config, updateConfig, nodeId }) {
  return (
    <>
      <div className="flex items-center gap-1.5"><IOBadge dir="in" label="image in" /></div>
      <ModelPicker value={config.model || 'gemini-3.5-flash'} onChange={(v) => updateConfig('model', v)} fallback={MODELS_VISION} credentialId={config.credentialId} />
      <Field label="Image" hint="URL, data-URI, or base64 from a previous node">
        <SmartVariableInput value={config.imageUrl || ''} onChange={(v) => updateConfig('imageUrl', v)} placeholder="https://… or {{$node.dataUri}}" nodeId={nodeId} />
      </Field>
      <Field label="Question / Prompt">
        <SmartVariableInput value={config.prompt || ''} onChange={(v) => updateConfig('prompt', v)} placeholder="Describe this image in detail." multiline nodeId={nodeId} />
      </Field>
    </>
  );
}

function GenerateImageFields({ config, updateConfig, nodeId }) {
  return (
    <>
      <div className="flex items-center gap-1.5"><IOBadge dir="in" label="image in (opt)" /><IOBadge dir="out" label="image out" /></div>
      <ModelPicker value={config.model || 'gemini-3.1-flash-image'} onChange={(v) => updateConfig('model', v)} fallback={MODELS_IMAGE} credentialId={config.credentialId} />
      <Field label="Image description">
        <SmartVariableInput value={config.imagePrompt || ''} onChange={(v) => updateConfig('imagePrompt', v)} placeholder="A photorealistic cat in a spacesuit…" multiline nodeId={nodeId} />
      </Field>
      <Field label="Source image" hint="optional — edit / remix an existing image">
        <SmartVariableInput value={config.fileInput || ''} onChange={(v) => updateConfig('fileInput', v)} placeholder="https://… or {{$node.dataUri}}" nodeId={nodeId} />
      </Field>
    </>
  );
}

function AnalyzeDocumentFields({ config, updateConfig, nodeId }) {
  return (
    <>
      <ModelPicker value={config.model || 'gemini-3.5-flash'} onChange={(v) => updateConfig('model', v)} fallback={MODELS_CHAT} credentialId={config.credentialId} />
      <Field label="Question / Prompt">
        <SmartVariableInput value={config.prompt || ''} onChange={(v) => updateConfig('prompt', v)} placeholder="Summarize this document." multiline nodeId={nodeId} />
      </Field>
      <Field label="Document text" hint="optional — falls back to previous node output">
        <SmartVariableInput value={config.documentText || ''} onChange={(v) => updateConfig('documentText', v)} placeholder="{{$node.content}}" multiline nodeId={nodeId} />
      </Field>
    </>
  );
}

function AnalyzePdfFields({ config, updateConfig, nodeId }) {
  return (
    <>
      <div className="flex items-center gap-1.5"><IOBadge dir="in" label="pdf in" /></div>
      <ModelPicker value={config.model || 'gemini-3.5-flash'} onChange={(v) => updateConfig('model', v)} fallback={MODELS_VISION} credentialId={config.credentialId} />
      <Field label="PDF file" hint="URL, data-URI, or base64">
        <SmartVariableInput value={config.fileInput || ''} onChange={(v) => updateConfig('fileInput', v)} placeholder="https://… or {{$node.dataUri}}" nodeId={nodeId} />
      </Field>
      <Field label="Question / Prompt">
        <SmartVariableInput value={config.prompt || ''} onChange={(v) => updateConfig('prompt', v)} placeholder="Summarize this PDF." multiline nodeId={nodeId} />
      </Field>
    </>
  );
}

function AnalyzeAudioFields({ config, updateConfig, nodeId }) {
  return (
    <>
      <div className="flex items-center gap-1.5"><IOBadge dir="in" label="audio in" /></div>
      <ModelPicker value={config.model || 'gemini-3.5-flash'} onChange={(v) => updateConfig('model', v)} fallback={MODELS_VISION} credentialId={config.credentialId} />
      <Field label="Audio file" hint="URL, data-URI, or base64 — mp3/wav/m4a/ogg">
        <SmartVariableInput value={config.fileInput || ''} onChange={(v) => updateConfig('fileInput', v)} placeholder="https://… or {{$node.dataUri}}" nodeId={nodeId} />
      </Field>
      <Field label="Question / Prompt">
        <SmartVariableInput value={config.prompt || ''} onChange={(v) => updateConfig('prompt', v)} placeholder="Transcribe this audio." multiline nodeId={nodeId} />
      </Field>
    </>
  );
}

function AnalyzeVideoFields({ config, updateConfig, nodeId }) {
  return (
    <>
      <div className="flex items-center gap-1.5"><IOBadge dir="in" label="video in" /></div>
      <ModelPicker value={config.model || 'gemini-3.5-flash'} onChange={(v) => updateConfig('model', v)} fallback={MODELS_VISION} credentialId={config.credentialId} />
      <Field label="Video file" hint="URL, data-URI, or base64 — mp4/mov/webm">
        <SmartVariableInput value={config.fileInput || ''} onChange={(v) => updateConfig('fileInput', v)} placeholder="https://… or {{$node.dataUri}}" nodeId={nodeId} />
      </Field>
      <Field label="Question / Prompt">
        <SmartVariableInput value={config.prompt || ''} onChange={(v) => updateConfig('prompt', v)} placeholder="Describe what happens in this video." multiline nodeId={nodeId} />
      </Field>
    </>
  );
}

function EmbeddingsFields({ config, updateConfig, nodeId }) {
  return (
    <>
      <ModelPicker value={config.model || 'gemini-embedding-001'} onChange={(v) => updateConfig('model', v)} fallback={MODELS_EMBED} credentialId={config.credentialId} />
      <Field label="Text to embed" hint="string or array of strings">
        <SmartVariableInput value={config.text || ''} onChange={(v) => updateConfig('text', v)} placeholder="{{$node.content}} or paste text…" multiline nodeId={nodeId} />
      </Field>
      <Field label="Dimensions" hint="optional — shorten the vector">
        <Select value={config.dimensions || ''} onChange={(v) => updateConfig('dimensions', v)} options={EMBED_DIMS} />
      </Field>
    </>
  );
}

function ExtractDataFields({ config, updateConfig, nodeId }) {
  return (
    <>
      <ModelPicker value={config.model || 'gemini-3.5-flash'} onChange={(v) => updateConfig('model', v)} fallback={MODELS_CHAT} credentialId={config.credentialId} />
      <Field label="Fields to extract" hint="e.g. name, email, total amount, due date">
        <SmartVariableInput value={config.fields || ''} onChange={(v) => updateConfig('fields', v)} placeholder="name, email, order total" nodeId={nodeId} />
      </Field>
      <Field label="Source text" hint="optional — falls back to previous node output">
        <SmartVariableInput value={config.prompt || ''} onChange={(v) => updateConfig('prompt', v)} placeholder="{{$node.content}}" multiline nodeId={nodeId} />
      </Field>
    </>
  );
}

function ClassifyFields({ config, updateConfig, nodeId }) {
  return (
    <>
      <ModelPicker value={config.model || 'gemini-3.5-flash'} onChange={(v) => updateConfig('model', v)} fallback={MODELS_CHAT} credentialId={config.credentialId} />
      <Field label="Categories" hint="comma or newline separated">
        <SmartVariableInput value={config.categories || ''} onChange={(v) => updateConfig('categories', v)} placeholder="positive, neutral, negative" multiline nodeId={nodeId} />
      </Field>
      <Field label="Text to classify" hint="optional — falls back to previous node output">
        <SmartVariableInput value={config.prompt || ''} onChange={(v) => updateConfig('prompt', v)} placeholder="{{$node.content}}" multiline nodeId={nodeId} />
      </Field>
    </>
  );
}

function SummarizeFields({ config, updateConfig, nodeId }) {
  return (
    <>
      <ModelPicker value={config.model || 'gemini-3.5-flash'} onChange={(v) => updateConfig('model', v)} fallback={MODELS_CHAT} credentialId={config.credentialId} />
      <Field label="Style">
        <Select
          value={config.summaryStyle || 'paragraph'}
          onChange={(v) => updateConfig('summaryStyle', v)}
          options={[{ value: 'paragraph', label: 'Paragraph' }, { value: 'bullets', label: 'Bullets' }, { value: 'tweet', label: 'Tweet' }, { value: 'eli5', label: 'ELI5' }]}
        />
      </Field>
      <Field label="Text to summarize" hint="optional — falls back to previous node output">
        <SmartVariableInput value={config.prompt || ''} onChange={(v) => updateConfig('prompt', v)} placeholder="{{$node.content}}" multiline nodeId={nodeId} />
      </Field>
    </>
  );
}

function TranslateFields({ config, updateConfig, nodeId }) {
  return (
    <>
      <ModelPicker value={config.model || 'gemini-3.5-flash'} onChange={(v) => updateConfig('model', v)} fallback={MODELS_CHAT} credentialId={config.credentialId} />
      <Field label="Target language">
        <SmartVariableInput value={config.targetLanguage || ''} onChange={(v) => updateConfig('targetLanguage', v)} placeholder="Spanish" nodeId={nodeId} />
      </Field>
      <Field label="Text to translate" hint="optional — falls back to previous node output">
        <SmartVariableInput value={config.prompt || ''} onChange={(v) => updateConfig('prompt', v)} placeholder="{{$node.content}}" multiline nodeId={nodeId} />
      </Field>
    </>
  );
}

function GeneratePromptFields({ config, updateConfig, nodeId }) {
  return (
    <>
      <ModelPicker value={config.model || 'gemini-3.5-flash'} onChange={(v) => updateConfig('model', v)} fallback={MODELS_CHAT} credentialId={config.credentialId} />
      <Field label="Task description">
        <SmartVariableInput value={config.task || ''} onChange={(v) => updateConfig('task', v)} placeholder="e.g. Classify support tickets by priority…" multiline nodeId={nodeId} />
      </Field>
    </>
  );
}

const OP_FIELDS = {
  message: MessageFields,
  structuredOutput: StructuredOutputFields,
  functionCalling: FunctionCallingFields,
  reasoning: ReasoningFields,
  analyzeImage: AnalyzeImageFields,
  generateImage: GenerateImageFields,
  analyzeDocument: AnalyzeDocumentFields,
  analyzePdf: AnalyzePdfFields,
  analyzeAudio: AnalyzeAudioFields,
  analyzeVideo: AnalyzeVideoFields,
  embeddings: EmbeddingsFields,
  extractData: ExtractDataFields,
  classify: ClassifyFields,
  summarize: SummarizeFields,
  translate: TranslateFields,
  generatePrompt: GeneratePromptFields,
};

// Which ops accept the chat sampling/advanced block
const ADVANCED_OPS = new Set(['message', 'structuredOutput', 'functionCalling', 'analyzeImage', 'analyzeDocument', 'analyzePdf']);

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
          <Field label="Max output tokens">
            <SmartVariableInput value={config.maxTokens ?? ''} onChange={(v) => updateConfig('maxTokens', v)} placeholder="2000" nodeId={nodeId} />
          </Field>
          <Field label="Top P" hint="nucleus sampling 0–1">
            <SmartVariableInput value={config.topP ?? ''} onChange={(v) => updateConfig('topP', v)} placeholder="0.95" nodeId={nodeId} />
          </Field>
          <Field label="Top K" hint="optional">
            <SmartVariableInput value={config.topK ?? ''} onChange={(v) => updateConfig('topK', v)} placeholder="40" nodeId={nodeId} />
          </Field>
          <Field label="Stop sequences" hint="one per line, max 5">
            <SmartVariableInput value={config.stop ?? ''} onChange={(v) => updateConfig('stop', v)} placeholder={'###\nEND'} multiline nodeId={nodeId} />
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
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all duration-150
                ${active
                  ? 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                  : 'bg-[#0d0d0d] border-[#222] text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200 hover:border-zinc-700/50'
                }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-blue-400' : 'text-zinc-500'}`} strokeWidth={1.75} />
              <div className="flex-1 min-w-0">
                <div className={`text-xs font-semibold leading-tight ${active ? 'text-blue-300' : 'text-zinc-300'}`}>{op.label}</div>
                <div className="text-[10px] text-zinc-600 mt-0.5 leading-snug">{op.description}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export default function GeminiNode({ config = {}, updateConfig, nodeId }) {
  const operation = config.operation || 'message';
  const OpFields = OP_FIELDS[operation] || MessageFields;

  return (
    <div className="flex flex-col gap-5 w-full">
      <CredentialPicker
        value={config.credentialId || ''}
        onChange={(id) => updateConfig('credentialId', id)}
        accentColor={ACCENT}
        label="Google AI API Key"
        placeholder="Select Gemini credential…"
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
