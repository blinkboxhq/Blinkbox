import { useState } from 'react';
import {
  Sparkles, MessageSquare, Image, Mic, FileText, ShieldCheck, Wand2, PenLine,
  Braces, Wrench, Brain, ImagePlus, Volume2, Languages, Binary, ChevronDown,
  RefreshCw, FileUp, FileDown,
} from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';
import CredentialPicker from '../../../../components/ui/CredentialPicker';
import api from '../../../../lib/api';

const ACCENT = 'emerald';

// ── Operations (mirrors backend OPERATIONS map exactly) ─────────────────────

const OPERATIONS = [
  { value: 'message',          label: 'Message a model',     icon: MessageSquare, description: 'Send a prompt, get a text or JSON response' },
  { value: 'structuredOutput', label: 'Structured output',   icon: Braces,        description: 'Force a strict JSON schema on the response' },
  { value: 'functionCalling',  label: 'Function calling',    icon: Wrench,        description: 'Let the model pick & fill tools you define' },
  { value: 'reasoning',        label: 'Reasoning',           icon: Brain,         description: 'Deep multi-step reasoning with effort control' },
  { value: 'analyzeImage',     label: 'Analyze image',       icon: Image,         description: 'Describe or ask questions about an image' },
  { value: 'generateImage',    label: 'Generate image',      icon: Wand2,         description: 'Create an image from a text description' },
  { value: 'editImage',        label: 'Edit image',          icon: ImagePlus,     description: 'Edit a source image with an optional mask' },
  { value: 'textToSpeech',     label: 'Text to speech',      icon: Volume2,       description: 'Synthesize natural speech audio from text' },
  { value: 'transcribeAudio',  label: 'Transcribe audio',    icon: Mic,           description: 'Convert speech to text (Whisper / GPT-4o)' },
  { value: 'translateAudio',   label: 'Translate audio',     icon: Languages,     description: 'Transcribe foreign-language audio into English' },
  { value: 'embeddings',       label: 'Embeddings',          icon: Binary,        description: 'Turn text into vectors for search & RAG' },
  { value: 'moderateContent',  label: 'Moderate content',    icon: ShieldCheck,   description: 'Flag unsafe text or images against policy' },
  { value: 'analyzeDocument',  label: 'Analyze document',    icon: FileText,      description: 'Ask questions about a long document or text' },
  { value: 'generatePrompt',   label: 'Generate a prompt',   icon: PenLine,       description: 'Let GPT write an effective prompt for a task' },
  { value: 'improvePrompt',    label: 'Improve a prompt',    icon: Sparkles,      description: 'Rewrite an existing prompt to be more effective' },
];

// ── Latest models (June 2026) ───────────────────────────────────────────────

const MODELS_CHAT      = ['gpt-5.4', 'gpt-5.5', 'gpt-5.5-pro', 'gpt-5.4-pro', 'gpt-5.4-mini', 'gpt-5.4-nano', 'gpt-4o', 'gpt-4o-mini'];
const MODELS_REASONING = ['gpt-5.4', 'gpt-5.5-pro', 'gpt-5.4-pro', 'o4', 'o4-mini'];
const MODELS_VISION    = ['gpt-5.4', 'gpt-5.5', 'gpt-4o', 'gpt-4o-mini'];
const MODELS_IMAGE     = ['gpt-image-2', 'gpt-image-1.5', 'dall-e-3'];
const MODELS_TTS       = ['tts-1', 'tts-1-hd', 'gpt-4o-mini-tts'];
const MODELS_STT       = ['whisper-1', 'gpt-4o-transcribe', 'gpt-4o-transcribe-diarize', 'gpt-4o-mini-transcribe'];
const MODELS_EMBED     = ['text-embedding-3-large', 'text-embedding-3-small', 'text-embedding-ada-002'];

const IMAGE_SIZES     = ['1024x1024', '1536x1024', '1024x1536', '1792x1024', '1024x1792'];
const IMAGE_QUALITY   = [{ value: 'high', label: 'High' }, { value: 'medium', label: 'Medium' }, { value: 'low', label: 'Low' }];
const TTS_VOICES      = ['alloy', 'ash', 'ballad', 'coral', 'echo', 'fable', 'nova', 'onyx', 'sage', 'shimmer'];
const TTS_FORMATS     = ['mp3', 'opus', 'aac', 'flac', 'wav', 'pcm'];
const EMBED_DIMS      = ['', '256', '512', '1024', '1536', '3072'];

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
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
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
      <span className={`w-10 h-5 rounded-full p-0.5 transition-all duration-150 ${value ? 'bg-emerald-500/80' : 'bg-zinc-700'}`}>
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
      const res = await api.get(`/api/automation/models/openai?credentialId=${encodeURIComponent(credentialId)}`);
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
          className="bg-[#0d0d0d] border border-[#222] rounded-lg px-3 py-2 text-[12px] text-zinc-200 focus:outline-none focus:border-emerald-500/40"
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
          className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-emerald-400/80 hover:text-emerald-300 disabled:opacity-50"
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
    <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border border-emerald-500/20 bg-emerald-500/5 text-emerald-400/80">
      <Icon className="w-2.5 h-2.5" strokeWidth={2.25} />{label}
    </span>
  );
}

// ── Per-operation config fields ─────────────────────────────────────────────

function MessageFields({ config, updateConfig, nodeId }) {
  return (
    <>
      <ModelPicker value={config.model || 'gpt-5.4'} onChange={(v) => updateConfig('model', v)} fallback={MODELS_CHAT} credentialId={config.credentialId} />
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
      <ModelPicker value={config.model || 'gpt-5.4'} onChange={(v) => updateConfig('model', v)} fallback={MODELS_CHAT} credentialId={config.credentialId} />
      <Field label="System prompt" hint="optional">
        <SmartVariableInput value={config.systemPrompt || ''} onChange={(v) => updateConfig('systemPrompt', v)} placeholder="You are a structured-data extraction engine…" multiline nodeId={nodeId} />
      </Field>
      <Field label="Prompt">
        <SmartVariableInput value={config.prompt || ''} onChange={(v) => updateConfig('prompt', v)} placeholder="Extract the order details from the input." multiline nodeId={nodeId} />
      </Field>
      <Field label="Schema name" hint="identifier for the schema">
        <SmartVariableInput value={config.schemaName || ''} onChange={(v) => updateConfig('schemaName', v)} placeholder="order_details" nodeId={nodeId} />
      </Field>
      <Field label="JSON schema">
        <SmartVariableInput value={config.jsonSchema || ''} onChange={(v) => updateConfig('jsonSchema', v)} placeholder='{ "type":"object", "properties": { … }, "required": [ … ] }' multiline nodeId={nodeId} />
      </Field>
      <Toggle value={config.strict !== false} onChange={(v) => updateConfig('strict', v)} label="Strict schema enforcement" />
    </>
  );
}

function FunctionCallingFields({ config, updateConfig, nodeId }) {
  return (
    <>
      <ModelPicker value={config.model || 'gpt-5.4'} onChange={(v) => updateConfig('model', v)} fallback={MODELS_CHAT} credentialId={config.credentialId} />
      <Field label="System prompt" hint="optional">
        <SmartVariableInput value={config.systemPrompt || ''} onChange={(v) => updateConfig('systemPrompt', v)} placeholder="You can call the provided tools…" multiline nodeId={nodeId} />
      </Field>
      <Field label="Prompt">
        <SmartVariableInput value={config.prompt || ''} onChange={(v) => updateConfig('prompt', v)} placeholder="What's the weather in Tokyo right now?" multiline nodeId={nodeId} />
      </Field>
      <Field label="Tools (JSON array)" hint="function definitions">
        <SmartVariableInput value={config.tools || ''} onChange={(v) => updateConfig('tools', v)} placeholder='[ { "name":"get_weather", "description":"…", "parameters": { … } } ]' multiline nodeId={nodeId} />
      </Field>
      <Field label="Tool choice" hint="auto · none · required">
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
      <ModelPicker value={config.model || 'gpt-5.4'} onChange={(v) => updateConfig('model', v)} fallback={MODELS_REASONING} credentialId={config.credentialId} />
      <Field label="Reasoning effort">
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
        <SmartVariableInput value={config.maxTokens || ''} onChange={(v) => updateConfig('maxTokens', v)} placeholder="25000" nodeId={nodeId} />
      </Field>
    </>
  );
}

function AnalyzeImageFields({ config, updateConfig, nodeId }) {
  return (
    <>
      <div className="flex items-center gap-1.5"><IOBadge dir="in" label="image in" /></div>
      <ModelPicker value={config.model || 'gpt-5.4'} onChange={(v) => updateConfig('model', v)} fallback={MODELS_VISION} credentialId={config.credentialId} />
      <Field label="Image" hint="URL, data-URI, or base64 from a previous node">
        <SmartVariableInput value={config.imageUrl || ''} onChange={(v) => updateConfig('imageUrl', v)} placeholder="https://… or {{$node.dataUri}}" nodeId={nodeId} />
      </Field>
      <Field label="Detail">
        <Select
          value={config.detail || 'auto'}
          onChange={(v) => updateConfig('detail', v)}
          options={[{ value: 'auto', label: 'Auto' }, { value: 'low', label: 'Low' }, { value: 'high', label: 'High' }]}
        />
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
      <div className="flex items-center gap-1.5"><IOBadge dir="out" label="image out" /></div>
      <ModelPicker value={config.model || 'gpt-image-2'} onChange={(v) => updateConfig('model', v)} fallback={MODELS_IMAGE} credentialId={config.credentialId} />
      <Field label="Image description">
        <SmartVariableInput value={config.imagePrompt || ''} onChange={(v) => updateConfig('imagePrompt', v)} placeholder="A photorealistic cat in a spacesuit…" multiline nodeId={nodeId} />
      </Field>
      <Field label="Size">
        <Select value={config.imageSize || '1024x1024'} onChange={(v) => updateConfig('imageSize', v)} options={IMAGE_SIZES} />
      </Field>
      <Field label="Quality">
        <Select value={config.imageQuality || 'high'} onChange={(v) => updateConfig('imageQuality', v)} options={IMAGE_QUALITY} />
      </Field>
      <Field label="How many" hint="1–10">
        <SmartVariableInput value={config.n || ''} onChange={(v) => updateConfig('n', v)} placeholder="1" nodeId={nodeId} />
      </Field>
    </>
  );
}

function EditImageFields({ config, updateConfig, nodeId }) {
  return (
    <>
      <div className="flex items-center gap-1.5"><IOBadge dir="in" label="image in" /><IOBadge dir="out" label="image out" /></div>
      <ModelPicker value={config.model || 'gpt-image-2'} onChange={(v) => updateConfig('model', v)} fallback={MODELS_IMAGE} credentialId={config.credentialId} />
      <Field label="Source image" hint="URL, data-URI, or base64">
        <SmartVariableInput value={config.fileInput || ''} onChange={(v) => updateConfig('fileInput', v)} placeholder="https://… or {{$node.dataUri}}" nodeId={nodeId} />
      </Field>
      <Field label="Mask" hint="optional — transparent areas get edited">
        <SmartVariableInput value={config.maskInput || ''} onChange={(v) => updateConfig('maskInput', v)} placeholder="https://… or {{$node.mask}}" nodeId={nodeId} />
      </Field>
      <Field label="Edit instruction">
        <SmartVariableInput value={config.imagePrompt || ''} onChange={(v) => updateConfig('imagePrompt', v)} placeholder="Add a wizard hat to the cat." multiline nodeId={nodeId} />
      </Field>
      <Field label="Size">
        <Select value={config.imageSize || '1024x1024'} onChange={(v) => updateConfig('imageSize', v)} options={IMAGE_SIZES} />
      </Field>
    </>
  );
}

function TextToSpeechFields({ config, updateConfig, nodeId }) {
  return (
    <>
      <div className="flex items-center gap-1.5"><IOBadge dir="out" label="audio out" /></div>
      <ModelPicker value={config.model || 'tts-1'} onChange={(v) => updateConfig('model', v)} fallback={MODELS_TTS} credentialId={config.credentialId} />
      <Field label="Text to speak">
        <SmartVariableInput value={config.text || ''} onChange={(v) => updateConfig('text', v)} placeholder="Hello! Welcome to Blinkbox." multiline nodeId={nodeId} />
      </Field>
      <Field label="Voice">
        <Select value={config.voice || 'alloy'} onChange={(v) => updateConfig('voice', v)} options={TTS_VOICES} />
      </Field>
      <Field label="Format">
        <Select value={config.format || 'mp3'} onChange={(v) => updateConfig('format', v)} options={TTS_FORMATS} />
      </Field>
      <Field label="Speed" hint="0.25 – 4.0">
        <SmartVariableInput value={config.speed || ''} onChange={(v) => updateConfig('speed', v)} placeholder="1.0" nodeId={nodeId} />
      </Field>
    </>
  );
}

function TranscribeAudioFields({ config, updateConfig, nodeId }) {
  return (
    <>
      <div className="flex items-center gap-1.5"><IOBadge dir="in" label="audio in" /></div>
      <ModelPicker value={config.model || 'whisper-1'} onChange={(v) => updateConfig('model', v)} fallback={MODELS_STT} credentialId={config.credentialId} />
      <Field label="Audio" hint="URL, data-URI, or base64 — mp3/m4a/wav/webm">
        <SmartVariableInput value={config.fileInput || config.audioUrl || ''} onChange={(v) => updateConfig('fileInput', v)} placeholder="https://… or {{$node.dataUri}}" nodeId={nodeId} />
      </Field>
      <Field label="Language" hint="optional ISO code — blank = auto-detect">
        <SmartVariableInput value={config.language || ''} onChange={(v) => updateConfig('language', v)} placeholder="en" nodeId={nodeId} />
      </Field>
      <Field label="Context prompt" hint="optional — names, jargon, spelling hints">
        <SmartVariableInput value={config.prompt || ''} onChange={(v) => updateConfig('prompt', v)} placeholder="Blinkbox, Zapier, n8n…" nodeId={nodeId} />
      </Field>
      <Toggle value={config.timestamps === true || config.timestamps === 'true'} onChange={(v) => updateConfig('timestamps', v)} label="Include word/segment timestamps" />
    </>
  );
}

function TranslateAudioFields({ config, updateConfig, nodeId }) {
  return (
    <>
      <div className="flex items-center gap-1.5"><IOBadge dir="in" label="audio in" /></div>
      <Field label="Audio" hint="any language → English text">
        <SmartVariableInput value={config.fileInput || config.audioUrl || ''} onChange={(v) => updateConfig('fileInput', v)} placeholder="https://… or {{$node.dataUri}}" nodeId={nodeId} />
      </Field>
      <Field label="Context prompt" hint="optional">
        <SmartVariableInput value={config.prompt || ''} onChange={(v) => updateConfig('prompt', v)} placeholder="Names or terms to preserve…" nodeId={nodeId} />
      </Field>
    </>
  );
}

function EmbeddingsFields({ config, updateConfig, nodeId }) {
  return (
    <>
      <ModelPicker value={config.model || 'text-embedding-3-large'} onChange={(v) => updateConfig('model', v)} fallback={MODELS_EMBED} credentialId={config.credentialId} />
      <Field label="Text to embed" hint="string or array of strings">
        <SmartVariableInput value={config.text || ''} onChange={(v) => updateConfig('text', v)} placeholder="{{$node.content}} or paste text…" multiline nodeId={nodeId} />
      </Field>
      <Field label="Dimensions" hint="optional — shorten the vector">
        <Select value={config.dimensions || ''} onChange={(v) => updateConfig('dimensions', v)} options={EMBED_DIMS} />
      </Field>
    </>
  );
}

function ModerateContentFields({ config, updateConfig, nodeId }) {
  return (
    <>
      <div className="flex items-center gap-1.5"><IOBadge dir="in" label="image in (opt)" /></div>
      <Field label="Text to moderate">
        <SmartVariableInput value={config.prompt || ''} onChange={(v) => updateConfig('prompt', v)} placeholder="{{$node.text}} or paste text directly…" multiline nodeId={nodeId} />
      </Field>
      <Field label="Image to moderate" hint="optional — URL or data-URI">
        <SmartVariableInput value={config.imageUrl || ''} onChange={(v) => updateConfig('imageUrl', v)} placeholder="https://… or {{$node.dataUri}}" nodeId={nodeId} />
      </Field>
    </>
  );
}

function AnalyzeDocumentFields({ config, updateConfig, nodeId }) {
  return (
    <>
      <ModelPicker value={config.model || 'gpt-4o-mini'} onChange={(v) => updateConfig('model', v)} fallback={MODELS_CHAT} credentialId={config.credentialId} />
      <Field label="Question / Prompt">
        <SmartVariableInput value={config.prompt || ''} onChange={(v) => updateConfig('prompt', v)} placeholder="Summarize this document." multiline nodeId={nodeId} />
      </Field>
      <Field label="Document text" hint="optional — falls back to previous node output">
        <SmartVariableInput value={config.documentText || ''} onChange={(v) => updateConfig('documentText', v)} placeholder="{{$node.content}}" multiline nodeId={nodeId} />
      </Field>
    </>
  );
}

function GeneratePromptFields({ config, updateConfig, nodeId }) {
  return (
    <>
      <ModelPicker value={config.model || 'gpt-4o-mini'} onChange={(v) => updateConfig('model', v)} fallback={MODELS_CHAT} credentialId={config.credentialId} />
      <Field label="Task description">
        <SmartVariableInput value={config.task || ''} onChange={(v) => updateConfig('task', v)} placeholder="e.g. Classify support tickets by priority…" multiline nodeId={nodeId} />
      </Field>
    </>
  );
}

function ImprovePromptFields({ config, updateConfig, nodeId }) {
  return (
    <>
      <ModelPicker value={config.model || 'gpt-4o-mini'} onChange={(v) => updateConfig('model', v)} fallback={MODELS_CHAT} credentialId={config.credentialId} />
      <Field label="Prompt to improve">
        <SmartVariableInput value={config.prompt || ''} onChange={(v) => updateConfig('prompt', v)} placeholder="Paste the existing prompt here…" multiline nodeId={nodeId} />
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
  editImage: EditImageFields,
  textToSpeech: TextToSpeechFields,
  transcribeAudio: TranscribeAudioFields,
  translateAudio: TranslateAudioFields,
  embeddings: EmbeddingsFields,
  moderateContent: ModerateContentFields,
  analyzeDocument: AnalyzeDocumentFields,
  generatePrompt: GeneratePromptFields,
  improvePrompt: ImprovePromptFields,
};

// Which ops accept the chat sampling/advanced block
const ADVANCED_OPS = new Set(['message', 'structuredOutput', 'functionCalling', 'analyzeImage']);

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
            <SmartVariableInput value={config.topP ?? ''} onChange={(v) => updateConfig('topP', v)} placeholder="1.0" nodeId={nodeId} />
          </Field>
          <Field label="Frequency penalty" hint="-2 to 2">
            <SmartVariableInput value={config.frequencyPenalty ?? ''} onChange={(v) => updateConfig('frequencyPenalty', v)} placeholder="0" nodeId={nodeId} />
          </Field>
          <Field label="Presence penalty" hint="-2 to 2">
            <SmartVariableInput value={config.presencePenalty ?? ''} onChange={(v) => updateConfig('presencePenalty', v)} placeholder="0" nodeId={nodeId} />
          </Field>
          <Field label="Stop sequences" hint="one per line, max 4">
            <SmartVariableInput value={config.stop ?? ''} onChange={(v) => updateConfig('stop', v)} placeholder={'###\nEND'} multiline nodeId={nodeId} />
          </Field>
          <Field label="Seed" hint="optional — reproducible outputs">
            <SmartVariableInput value={config.seed ?? ''} onChange={(v) => updateConfig('seed', v)} placeholder="42" nodeId={nodeId} />
          </Field>
          <Field label="User identifier" hint="optional — for abuse tracking">
            <SmartVariableInput value={config.user ?? ''} onChange={(v) => updateConfig('user', v)} placeholder="{{$json.userId}}" nodeId={nodeId} />
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
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-[#0d0d0d] border-[#222] text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200 hover:border-zinc-700/50'
                }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-emerald-400' : 'text-zinc-500'}`} strokeWidth={1.75} />
              <div className="flex-1 min-w-0">
                <div className={`text-xs font-semibold leading-tight ${active ? 'text-emerald-300' : 'text-zinc-300'}`}>{op.label}</div>
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

export default function OpenAINode({ config = {}, updateConfig, nodeId }) {
  const operation = config.operation || 'message';
  const OpFields = OP_FIELDS[operation] || MessageFields;

  return (
    <div className="flex flex-col gap-5 w-full">
      <CredentialPicker
        value={config.credentialId || ''}
        onChange={(id) => updateConfig('credentialId', id)}
        accentColor={ACCENT}
        label="OpenAI API Key"
        placeholder="Select OpenAI credential…"
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
