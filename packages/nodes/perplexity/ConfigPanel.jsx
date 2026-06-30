import { useState } from 'react';
import {
  MessageSquare, Search, Quote, Braces, Brain, Telescope, ShieldCheck, GitCompare,
  Newspaper, Binary, Tags, FileText, Languages, FileSearch, PenLine, ChevronDown,
  RefreshCw,
} from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';
import CredentialPicker from '@/components/ui/CredentialPicker';
import api from '@/lib/api';

const ACCENT = 'sky';

// ── Operations (mirrors backend OPERATIONS map exactly) ─────────────────────

const OPERATIONS = [
  { value: 'message',          label: 'Message (grounded)',   icon: MessageSquare, description: 'Chat with live web-search grounding baked in' },
  { value: 'search',           label: 'Search the web',       icon: Search,        description: 'Answer a question from current sources, with citations' },
  { value: 'askWithCitations', label: 'Ask with citations',   icon: Quote,         description: 'Same as search, citations-forward output' },
  { value: 'structuredOutput', label: 'Structured output',    icon: Braces,        description: 'Force a strict JSON schema on the response' },
  { value: 'reasoning',        label: 'Reasoning',            icon: Brain,         description: 'Step-by-step reasoning over current information' },
  { value: 'deepResearch',     label: 'Deep research',        icon: Telescope,     description: 'Long-form, source-dense research report' },
  { value: 'factCheck',        label: 'Fact-check',           icon: ShieldCheck,   description: 'Verify a claim against current sources' },
  { value: 'compare',          label: 'Compare',              icon: GitCompare,    description: 'Compare items across dimensions, with sources' },
  { value: 'newsDigest',       label: 'News digest',          icon: Newspaper,     description: 'Summarize the latest news on a topic' },
  { value: 'extractData',      label: 'Extract data',         icon: Binary,        description: 'Pull structured fields out of text as JSON' },
  { value: 'classify',         label: 'Classify',             icon: Tags,          description: 'Label text into one of N categories' },
  { value: 'summarize',        label: 'Summarize',            icon: FileText,      description: 'Condense long text into a short summary' },
  { value: 'translate',        label: 'Translate',            icon: Languages,     description: 'Translate text between languages' },
  { value: 'analyzeDocument',  label: 'Analyze document',     icon: FileSearch,    description: 'Ask questions about a long document or text' },
  { value: 'generatePrompt',   label: 'Generate a prompt',    icon: PenLine,       description: 'Write an effective prompt for a task' },
];

// ── Latest models (Sonar family, June 2026) ─────────────────────────────────

const MODELS_CORE     = ['sonar', 'sonar-pro'];
const MODELS_REASON   = ['sonar-reasoning', 'sonar-reasoning-pro'];
const MODELS_RESEARCH = ['sonar-deep-research'];
const MODELS_ALL      = ['sonar', 'sonar-pro', 'sonar-reasoning', 'sonar-reasoning-pro', 'sonar-deep-research'];

const RECENCY = [{ value: '', label: 'Any time' }, { value: 'hour', label: 'Hour' }, { value: 'day', label: 'Day' }, { value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }];
const SUMMARY_STYLES = [{ value: 'bullets', label: 'Bullets' }, { value: 'paragraph', label: 'Paragraph' }, { value: 'tweet', label: 'Tweet' }, { value: 'eli5', label: 'ELI5' }];

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
                ? 'bg-sky-500/10 border-sky-500/30 text-sky-300'
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
      <span className={`w-10 h-5 rounded-full p-0.5 transition-all duration-150 ${value ? 'bg-sky-500/80' : 'bg-zinc-700'}`}>
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
      const res = await api.get(`/api/automation/models/perplexity?credentialId=${encodeURIComponent(credentialId)}`);
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
          className="bg-[#0d0d0d] border border-[#222] rounded-lg px-3 py-2 text-[12px] text-zinc-200 focus:outline-none focus:border-sky-500/40"
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
          className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-sky-400/80 hover:text-sky-300 disabled:opacity-50"
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

// ── Web-search filters (grounded ops) ───────────────────────────────────────

function SearchFilters({ config, updateConfig, nodeId }) {
  return (
    <>
      <Field label="Recency" hint="restrict sources by freshness">
        <Select value={config.searchRecency || ''} onChange={(v) => updateConfig('searchRecency', v)} options={RECENCY} />
      </Field>
      <Field label="Domain filter" hint="optional — one domain per line, max 10">
        <SmartVariableInput value={config.searchDomains || ''} onChange={(v) => updateConfig('searchDomains', v)} placeholder={'arxiv.org\nnature.com'} multiline nodeId={nodeId} />
      </Field>
    </>
  );
}

// ── Per-operation config fields ─────────────────────────────────────────────

function MessageFields({ config, updateConfig, nodeId }) {
  return (
    <>
      <ModelPicker value={config.model || 'sonar'} onChange={(v) => updateConfig('model', v)} fallback={MODELS_CORE} credentialId={config.credentialId} />
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
        <SmartVariableInput value={config.prompt || ''} onChange={(v) => updateConfig('prompt', v)} placeholder="e.g. What's the latest on…" multiline nodeId={nodeId} />
      </Field>
      <SearchFilters config={config} updateConfig={updateConfig} nodeId={nodeId} />
    </>
  );
}

function SearchFields({ config, updateConfig, nodeId }) {
  return (
    <>
      <ModelPicker value={config.model || 'sonar-pro'} onChange={(v) => updateConfig('model', v)} fallback={MODELS_CORE} credentialId={config.credentialId} />
      <Field label="Question / Query">
        <SmartVariableInput value={config.prompt || ''} onChange={(v) => updateConfig('prompt', v)} placeholder="What are the current best practices for…" multiline nodeId={nodeId} />
      </Field>
      <Field label="System prompt" hint="optional">
        <SmartVariableInput value={config.systemPrompt || ''} onChange={(v) => updateConfig('systemPrompt', v)} placeholder="Answer accurately and cite sources…" multiline nodeId={nodeId} />
      </Field>
      <SearchFilters config={config} updateConfig={updateConfig} nodeId={nodeId} />
    </>
  );
}

function StructuredOutputFields({ config, updateConfig, nodeId }) {
  return (
    <>
      <ModelPicker value={config.model || 'sonar-pro'} onChange={(v) => updateConfig('model', v)} fallback={MODELS_CORE} credentialId={config.credentialId} />
      <Field label="System prompt" hint="optional">
        <SmartVariableInput value={config.systemPrompt || ''} onChange={(v) => updateConfig('systemPrompt', v)} placeholder="You are a structured-data extraction engine…" multiline nodeId={nodeId} />
      </Field>
      <Field label="Prompt">
        <SmartVariableInput value={config.prompt || ''} onChange={(v) => updateConfig('prompt', v)} placeholder="Find the company's funding rounds." multiline nodeId={nodeId} />
      </Field>
      <Field label="JSON schema" hint="optional — blank = free-form JSON object">
        <SmartVariableInput value={config.jsonSchema || ''} onChange={(v) => updateConfig('jsonSchema', v)} placeholder='{ "type":"object", "properties": { … }, "required": [ … ] }' multiline nodeId={nodeId} />
      </Field>
      <SearchFilters config={config} updateConfig={updateConfig} nodeId={nodeId} />
    </>
  );
}

function ReasoningFields({ config, updateConfig, nodeId }) {
  return (
    <>
      <ModelPicker value={config.model || 'sonar-reasoning-pro'} onChange={(v) => updateConfig('model', v)} fallback={MODELS_REASON} credentialId={config.credentialId} />
      <Field label="System prompt" hint="optional">
        <SmartVariableInput value={config.systemPrompt || ''} onChange={(v) => updateConfig('systemPrompt', v)} placeholder="Think step by step…" multiline nodeId={nodeId} />
      </Field>
      <Field label="Prompt">
        <SmartVariableInput value={config.prompt || ''} onChange={(v) => updateConfig('prompt', v)} placeholder="Reason through this problem…" multiline nodeId={nodeId} />
      </Field>
      <SearchFilters config={config} updateConfig={updateConfig} nodeId={nodeId} />
    </>
  );
}

function DeepResearchFields({ config, updateConfig, nodeId }) {
  return (
    <>
      <ModelPicker value={config.model || 'sonar-deep-research'} onChange={(v) => updateConfig('model', v)} fallback={MODELS_RESEARCH} credentialId={config.credentialId} />
      <Field label="Research topic">
        <SmartVariableInput value={config.prompt || ''} onChange={(v) => updateConfig('prompt', v)} placeholder="The state of solid-state batteries in 2026…" multiline nodeId={nodeId} />
      </Field>
      <Field label="Reasoning effort" hint="more effort = deeper, slower">
        <Select
          value={config.reasoningEffort || 'medium'}
          onChange={(v) => updateConfig('reasoningEffort', v)}
          options={[{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }]}
        />
      </Field>
      <SearchFilters config={config} updateConfig={updateConfig} nodeId={nodeId} />
    </>
  );
}

function FactCheckFields({ config, updateConfig, nodeId }) {
  return (
    <>
      <ModelPicker value={config.model || 'sonar-pro'} onChange={(v) => updateConfig('model', v)} fallback={MODELS_CORE} credentialId={config.credentialId} />
      <Field label="Claim to verify">
        <SmartVariableInput value={config.prompt || ''} onChange={(v) => updateConfig('prompt', v)} placeholder="The Eiffel Tower is taller than the Empire State Building." multiline nodeId={nodeId} />
      </Field>
      <SearchFilters config={config} updateConfig={updateConfig} nodeId={nodeId} />
    </>
  );
}

function CompareFields({ config, updateConfig, nodeId }) {
  return (
    <>
      <ModelPicker value={config.model || 'sonar-pro'} onChange={(v) => updateConfig('model', v)} fallback={MODELS_CORE} credentialId={config.credentialId} />
      <Field label="Items to compare">
        <SmartVariableInput value={config.prompt || ''} onChange={(v) => updateConfig('prompt', v)} placeholder="Compare Postgres vs MongoDB for a SaaS app." multiline nodeId={nodeId} />
      </Field>
      <SearchFilters config={config} updateConfig={updateConfig} nodeId={nodeId} />
    </>
  );
}

function NewsDigestFields({ config, updateConfig, nodeId }) {
  return (
    <>
      <ModelPicker value={config.model || 'sonar'} onChange={(v) => updateConfig('model', v)} fallback={MODELS_CORE} credentialId={config.credentialId} />
      <Field label="Topic">
        <SmartVariableInput value={config.prompt || ''} onChange={(v) => updateConfig('prompt', v)} placeholder="AI policy regulation" multiline nodeId={nodeId} />
      </Field>
      <Field label="Recency" hint="defaults to the past week">
        <Select value={config.searchRecency || ''} onChange={(v) => updateConfig('searchRecency', v)} options={RECENCY} />
      </Field>
    </>
  );
}

function ExtractDataFields({ config, updateConfig, nodeId }) {
  return (
    <>
      <ModelPicker value={config.model || 'sonar-pro'} onChange={(v) => updateConfig('model', v)} fallback={MODELS_CORE} credentialId={config.credentialId} />
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
      <ModelPicker value={config.model || 'sonar'} onChange={(v) => updateConfig('model', v)} fallback={MODELS_CORE} credentialId={config.credentialId} />
      <Field label="Categories" hint="comma or newline separated">
        <SmartVariableInput value={config.categories || ''} onChange={(v) => updateConfig('categories', v)} placeholder={'positive, neutral, negative'} multiline nodeId={nodeId} />
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
      <ModelPicker value={config.model || 'sonar'} onChange={(v) => updateConfig('model', v)} fallback={MODELS_CORE} credentialId={config.credentialId} />
      <Field label="Style">
        <Select value={config.summaryStyle || 'bullets'} onChange={(v) => updateConfig('summaryStyle', v)} options={SUMMARY_STYLES} />
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
      <ModelPicker value={config.model || 'sonar'} onChange={(v) => updateConfig('model', v)} fallback={MODELS_CORE} credentialId={config.credentialId} />
      <Field label="Target language">
        <SmartVariableInput value={config.targetLanguage || ''} onChange={(v) => updateConfig('targetLanguage', v)} placeholder="French" nodeId={nodeId} />
      </Field>
      <Field label="Text to translate" hint="optional — falls back to previous node output">
        <SmartVariableInput value={config.text || ''} onChange={(v) => updateConfig('text', v)} placeholder="{{$node.content}}" multiline nodeId={nodeId} />
      </Field>
    </>
  );
}

function AnalyzeDocumentFields({ config, updateConfig, nodeId }) {
  return (
    <>
      <ModelPicker value={config.model || 'sonar-pro'} onChange={(v) => updateConfig('model', v)} fallback={MODELS_CORE} credentialId={config.credentialId} />
      <Field label="Output format">
        <Select
          value={config.outputFormat || 'text'}
          onChange={(v) => updateConfig('outputFormat', v)}
          options={[{ value: 'text', label: 'Raw Text' }, { value: 'json', label: 'JSON Object' }]}
        />
      </Field>
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
      <ModelPicker value={config.model || 'sonar'} onChange={(v) => updateConfig('model', v)} fallback={MODELS_CORE} credentialId={config.credentialId} />
      <Field label="Task description">
        <SmartVariableInput value={config.task || ''} onChange={(v) => updateConfig('task', v)} placeholder="e.g. Classify support tickets by priority…" multiline nodeId={nodeId} />
      </Field>
    </>
  );
}

const OP_FIELDS = {
  message: MessageFields,
  search: SearchFields,
  askWithCitations: SearchFields,
  structuredOutput: StructuredOutputFields,
  reasoning: ReasoningFields,
  deepResearch: DeepResearchFields,
  factCheck: FactCheckFields,
  compare: CompareFields,
  newsDigest: NewsDigestFields,
  extractData: ExtractDataFields,
  classify: ClassifyFields,
  summarize: SummarizeFields,
  translate: TranslateFields,
  analyzeDocument: AnalyzeDocumentFields,
  generatePrompt: GeneratePromptFields,
};

// Which ops accept the sampling/advanced block
const ADVANCED_OPS = new Set(['message', 'search', 'askWithCitations', 'structuredOutput', 'reasoning', 'compare', 'analyzeDocument']);

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
          <Field label="Top K" hint="0 = disabled">
            <SmartVariableInput value={config.topK ?? ''} onChange={(v) => updateConfig('topK', v)} placeholder="0" nodeId={nodeId} />
          </Field>
          <Field label="Frequency penalty" hint="-2 to 2">
            <SmartVariableInput value={config.frequencyPenalty ?? ''} onChange={(v) => updateConfig('frequencyPenalty', v)} placeholder="0" nodeId={nodeId} />
          </Field>
          <Field label="Presence penalty" hint="-2 to 2">
            <SmartVariableInput value={config.presencePenalty ?? ''} onChange={(v) => updateConfig('presencePenalty', v)} placeholder="0" nodeId={nodeId} />
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
                  ? 'bg-sky-500/10 border-sky-500/30 text-sky-300'
                  : 'bg-[#0d0d0d] border-[#222] text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200 hover:border-zinc-700/50'
                }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-sky-400' : 'text-zinc-500'}`} strokeWidth={1.75} />
              <div className="flex-1 min-w-0">
                <div className={`text-xs font-semibold leading-tight ${active ? 'text-sky-300' : 'text-zinc-300'}`}>{op.label}</div>
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

export default function PerplexityNode({ config = {}, updateConfig, nodeId }) {
  const operation = config.operation || 'message';
  const OpFields = OP_FIELDS[operation] || MessageFields;

  return (
    <div className="flex flex-col gap-5 w-full">
      <CredentialPicker
        value={config.credentialId || ''}
        onChange={(id) => updateConfig('credentialId', id)}
        accentColor={ACCENT}
        label="Perplexity API Key"
        placeholder="Select Perplexity credential…"
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
