import { useState } from 'react';
import {
  MessageSquare, Braces, Wrench, Brain, Globe, Image, Sparkles, FileSearch,
  Binary, Tags, FileText, Languages, Smile, PenLine, Wand2, ChevronDown,
  RefreshCw, ArrowDownToLine, ArrowUpFromLine,
} from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';
import CredentialPicker from '@/components/ui/CredentialPicker';
import api from '@/lib/api';

const ACCENT = 'violet';

// ── Operations (mirrors backend OPERATIONS map exactly) ─────────────────────

const OPERATIONS = [
  { value: 'message',          label: 'Message',              icon: MessageSquare, description: 'Chat completion with Grok' },
  { value: 'structuredOutput', label: 'Structured output',    icon: Braces,        description: 'Force a strict JSON schema on the response' },
  { value: 'functionCalling',  label: 'Function calling',     icon: Wrench,        description: 'Let Grok call your defined tools' },
  { value: 'reasoning',        label: 'Reasoning',            icon: Brain,         description: 'Extended step-by-step reasoning (Grok reasoning models)' },
  { value: 'liveSearch',       label: 'Live web search',      icon: Globe,         description: 'Answer grounded in real-time web search, with citations' },
  { value: 'analyzeImage',     label: 'Analyze image',        icon: Image,         description: 'Vision: describe or answer questions about an image' },
  { value: 'generateImage',    label: 'Generate image',       icon: Sparkles,      description: 'Text-to-image with grok-2-image' },
  { value: 'analyzeDocument',  label: 'Analyze document',     icon: FileSearch,    description: 'Ask questions about a long document or text' },
  { value: 'extractData',      label: 'Extract data',         icon: Binary,        description: 'Pull structured fields out of text as JSON' },
  { value: 'classify',         label: 'Classify',             icon: Tags,          description: 'Label text into one of N categories' },
  { value: 'summarize',        label: 'Summarize',            icon: FileText,      description: 'Condense long text into a short summary' },
  { value: 'translate',        label: 'Translate',            icon: Languages,     description: 'Translate text between languages' },
  { value: 'sentiment',        label: 'Sentiment',            icon: Smile,         description: 'Sentiment + key-phrase + emotion analysis' },
  { value: 'generatePrompt',   label: 'Generate a prompt',    icon: PenLine,       description: 'Write an effective prompt for a task' },
  { value: 'improvePrompt',    label: 'Improve a prompt',     icon: Wand2,         description: 'Rewrite an existing prompt to be stronger' },
];

// ── Latest models (Grok family, June 2026) ──────────────────────────────────

const MODELS_CHAT   = ['grok-4.3', 'grok-4-fast', 'grok-4.1', 'grok-4', 'grok-3'];
const MODELS_REASON = ['grok-4.20', 'grok-4.3', 'grok-4'];
const MODELS_VISION = ['grok-4.3', 'grok-2-vision'];
const MODELS_IMAGE  = ['grok-2-image'];
const MODELS_ALL    = ['grok-4.3', 'grok-4.20', 'grok-4-fast', 'grok-4.1', 'grok-4', 'grok-3', 'grok-3-mini', 'grok-code-fast', 'grok-2-vision', 'grok-2-image'];

const RECENCY = [{ value: '', label: 'Any time' }, { value: 'day', label: 'Day' }, { value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }];
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
            className={`px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition-all duration-150 ${
              active
                ? 'bg-violet-500/10 border-violet-500/30 text-violet-300'
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

function IOBadge({ kind, label }) {
  const Icon = kind === 'in' ? ArrowDownToLine : ArrowUpFromLine;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-500/10 border border-violet-500/20 text-[9px] font-bold uppercase tracking-wider text-violet-300">
      <Icon className="w-3 h-3" strokeWidth={2.25} />
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
      const res = await api.get(`/api/automation/models/xai?credentialId=${encodeURIComponent(credentialId)}`);
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
          className="bg-[#0d0d0d] border border-[#222] rounded-lg px-3 py-2 text-[12px] text-zinc-200 focus:outline-none focus:border-violet-500/40"
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
          className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-violet-400/80 hover:text-violet-300 disabled:opacity-50"
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
      <ModelPicker value={config.model || 'grok-4.3'} onChange={(v) => updateConfig('model', v)} fallback={MODELS_CHAT} credentialId={config.credentialId} />
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

function StructuredOutputFields({ config, updateConfig, nodeId }) {
  return (
    <>
      <ModelPicker value={config.model || 'grok-4.3'} onChange={(v) => updateConfig('model', v)} fallback={MODELS_CHAT} credentialId={config.credentialId} />
      <Field label="System prompt" hint="optional">
        <SmartVariableInput value={config.systemPrompt || ''} onChange={(v) => updateConfig('systemPrompt', v)} placeholder="You are a structured-data extraction engine…" multiline nodeId={nodeId} />
      </Field>
      <Field label="Prompt">
        <SmartVariableInput value={config.prompt || ''} onChange={(v) => updateConfig('prompt', v)} placeholder="Extract the invoice line items." multiline nodeId={nodeId} />
      </Field>
      <Field label="JSON schema" hint="strict schema the output must satisfy">
        <SmartVariableInput value={config.jsonSchema || ''} onChange={(v) => updateConfig('jsonSchema', v)} placeholder='{ "type":"object", "properties": { … }, "required": [ … ] }' multiline nodeId={nodeId} />
      </Field>
    </>
  );
}

function FunctionCallingFields({ config, updateConfig, nodeId }) {
  return (
    <>
      <ModelPicker value={config.model || 'grok-4.3'} onChange={(v) => updateConfig('model', v)} fallback={MODELS_CHAT} credentialId={config.credentialId} />
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
      <ModelPicker value={config.model || 'grok-4.20'} onChange={(v) => updateConfig('model', v)} fallback={MODELS_REASON} credentialId={config.credentialId} />
      <Field label="Reasoning effort" hint="more effort = deeper, slower">
        <Select
          value={config.reasoningEffort || ''}
          onChange={(v) => updateConfig('reasoningEffort', v)}
          options={[{ value: '', label: 'Default' }, { value: 'low', label: 'Low' }, { value: 'high', label: 'High' }]}
        />
      </Field>
      <Field label="System prompt" hint="optional">
        <SmartVariableInput value={config.systemPrompt || ''} onChange={(v) => updateConfig('systemPrompt', v)} placeholder="Think step by step…" multiline nodeId={nodeId} />
      </Field>
      <Field label="Prompt">
        <SmartVariableInput value={config.prompt || ''} onChange={(v) => updateConfig('prompt', v)} placeholder="Reason through this problem…" multiline nodeId={nodeId} />
      </Field>
    </>
  );
}

function LiveSearchFields({ config, updateConfig, nodeId }) {
  return (
    <>
      <ModelPicker value={config.model || 'grok-4.3'} onChange={(v) => updateConfig('model', v)} fallback={MODELS_CHAT} credentialId={config.credentialId} />
      <Field label="Question / Query">
        <SmartVariableInput value={config.prompt || ''} onChange={(v) => updateConfig('prompt', v)} placeholder="What's the latest on…" multiline nodeId={nodeId} />
      </Field>
      <Field label="Search mode">
        <Select
          value={config.searchMode || 'auto'}
          onChange={(v) => updateConfig('searchMode', v)}
          options={[{ value: 'auto', label: 'Auto' }, { value: 'on', label: 'Always on' }, { value: 'off', label: 'Off' }]}
        />
      </Field>
      <Field label="Sources" hint="optional — comma-separated: web, x, news, rss">
        <SmartVariableInput value={config.searchSources || ''} onChange={(v) => updateConfig('searchSources', v)} placeholder="web, x, news" nodeId={nodeId} />
      </Field>
      <Field label="Allowed domains" hint="optional — comma-separated, max 5">
        <SmartVariableInput value={config.searchDomains || ''} onChange={(v) => updateConfig('searchDomains', v)} placeholder="arxiv.org, nature.com" nodeId={nodeId} />
      </Field>
      <Field label="Max sources" hint="optional">
        <SmartVariableInput value={config.maxSearchResults ?? ''} onChange={(v) => updateConfig('maxSearchResults', v)} placeholder="10" nodeId={nodeId} />
      </Field>
    </>
  );
}

function AnalyzeImageFields({ config, updateConfig, nodeId }) {
  return (
    <>
      <div className="flex items-center gap-2"><IOBadge kind="in" label="Image in" /></div>
      <ModelPicker value={config.model || 'grok-4.3'} onChange={(v) => updateConfig('model', v)} fallback={MODELS_VISION} credentialId={config.credentialId} />
      <Field label="Image URL or data URI" hint="public http(s) URL or base64 data URI">
        <SmartVariableInput value={config.imageUrl || ''} onChange={(v) => updateConfig('imageUrl', v)} placeholder="https://… or {{$node.fileUrl}}" nodeId={nodeId} />
      </Field>
      <Field label="Detail">
        <Select
          value={config.detail || 'auto'}
          onChange={(v) => updateConfig('detail', v)}
          options={[{ value: 'auto', label: 'Auto' }, { value: 'low', label: 'Low' }, { value: 'high', label: 'High' }]}
        />
      </Field>
      <Field label="Prompt">
        <SmartVariableInput value={config.prompt || ''} onChange={(v) => updateConfig('prompt', v)} placeholder="Describe this image in detail." multiline nodeId={nodeId} />
      </Field>
    </>
  );
}

function GenerateImageFields({ config, updateConfig, nodeId }) {
  return (
    <>
      <div className="flex items-center gap-2"><IOBadge kind="out" label="Image out" /></div>
      <ModelPicker value={config.model || 'grok-2-image'} onChange={(v) => updateConfig('model', v)} fallback={MODELS_IMAGE} credentialId={config.credentialId} />
      <Field label="Image prompt">
        <SmartVariableInput value={config.imagePrompt || ''} onChange={(v) => updateConfig('imagePrompt', v)} placeholder="A neon-lit cyberpunk fox, cinematic lighting" multiline nodeId={nodeId} />
      </Field>
      <Field label="Number of images" hint="1–10">
        <SmartVariableInput value={config.n ?? ''} onChange={(v) => updateConfig('n', v)} placeholder="1" nodeId={nodeId} />
      </Field>
    </>
  );
}

function AnalyzeDocumentFields({ config, updateConfig, nodeId }) {
  return (
    <>
      <ModelPicker value={config.model || 'grok-4.3'} onChange={(v) => updateConfig('model', v)} fallback={MODELS_CHAT} credentialId={config.credentialId} />
      <Field label="Question / Prompt">
        <SmartVariableInput value={config.prompt || ''} onChange={(v) => updateConfig('prompt', v)} placeholder="Summarize this document." multiline nodeId={nodeId} />
      </Field>
      <Field label="Document text" hint="optional — falls back to previous node output">
        <SmartVariableInput value={config.documentText || ''} onChange={(v) => updateConfig('documentText', v)} placeholder="{{$node.content}}" multiline nodeId={nodeId} />
      </Field>
    </>
  );
}

function ExtractDataFields({ config, updateConfig, nodeId }) {
  return (
    <>
      <ModelPicker value={config.model || 'grok-4.3'} onChange={(v) => updateConfig('model', v)} fallback={MODELS_CHAT} credentialId={config.credentialId} />
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
      <ModelPicker value={config.model || 'grok-4.3'} onChange={(v) => updateConfig('model', v)} fallback={MODELS_CHAT} credentialId={config.credentialId} />
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
      <ModelPicker value={config.model || 'grok-4-fast'} onChange={(v) => updateConfig('model', v)} fallback={MODELS_CHAT} credentialId={config.credentialId} />
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
      <ModelPicker value={config.model || 'grok-4-fast'} onChange={(v) => updateConfig('model', v)} fallback={MODELS_CHAT} credentialId={config.credentialId} />
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
      <ModelPicker value={config.model || 'grok-4-fast'} onChange={(v) => updateConfig('model', v)} fallback={MODELS_CHAT} credentialId={config.credentialId} />
      <Field label="Text to analyze" hint="optional — falls back to previous node output">
        <SmartVariableInput value={config.text || ''} onChange={(v) => updateConfig('text', v)} placeholder="{{$node.content}}" multiline nodeId={nodeId} />
      </Field>
    </>
  );
}

function GeneratePromptFields({ config, updateConfig, nodeId }) {
  return (
    <>
      <ModelPicker value={config.model || 'grok-4.3'} onChange={(v) => updateConfig('model', v)} fallback={MODELS_CHAT} credentialId={config.credentialId} />
      <Field label="Task description">
        <SmartVariableInput value={config.task || ''} onChange={(v) => updateConfig('task', v)} placeholder="e.g. Classify support tickets by priority…" multiline nodeId={nodeId} />
      </Field>
    </>
  );
}

function ImprovePromptFields({ config, updateConfig, nodeId }) {
  return (
    <>
      <ModelPicker value={config.model || 'grok-4.3'} onChange={(v) => updateConfig('model', v)} fallback={MODELS_CHAT} credentialId={config.credentialId} />
      <Field label="Prompt to improve">
        <SmartVariableInput value={config.prompt || ''} onChange={(v) => updateConfig('prompt', v)} placeholder="Paste the prompt you want to sharpen…" multiline nodeId={nodeId} />
      </Field>
    </>
  );
}

const OP_FIELDS = {
  message: MessageFields,
  structuredOutput: StructuredOutputFields,
  functionCalling: FunctionCallingFields,
  reasoning: ReasoningFields,
  liveSearch: LiveSearchFields,
  analyzeImage: AnalyzeImageFields,
  generateImage: GenerateImageFields,
  analyzeDocument: AnalyzeDocumentFields,
  extractData: ExtractDataFields,
  classify: ClassifyFields,
  summarize: SummarizeFields,
  translate: TranslateFields,
  sentiment: SentimentFields,
  generatePrompt: GeneratePromptFields,
  improvePrompt: ImprovePromptFields,
};

// Which ops accept the sampling/advanced block
const ADVANCED_OPS = new Set(['message', 'structuredOutput', 'functionCalling', 'liveSearch', 'analyzeImage', 'analyzeDocument']);

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
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all duration-150
                ${active
                  ? 'bg-violet-500/10 border-violet-500/30 text-violet-300'
                  : 'bg-[#0d0d0d] border-[#222] text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200 hover:border-zinc-700/50'
                }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-violet-400' : 'text-zinc-500'}`} strokeWidth={1.75} />
              <div className="flex-1 min-w-0">
                <div className={`text-xs font-semibold leading-tight ${active ? 'text-violet-300' : 'text-zinc-300'}`}>{op.label}</div>
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

export default function XAINode({ config = {}, updateConfig, nodeId }) {
  const operation = config.operation || 'message';
  const OpFields = OP_FIELDS[operation] || MessageFields;

  return (
    <div className="flex flex-col gap-5 w-full">
      <CredentialPicker
        value={config.credentialId || ''}
        onChange={(id) => updateConfig('credentialId', id)}
        accentColor={ACCENT}
        label="xAI API Key"
        placeholder="Select xAI credential…"
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
