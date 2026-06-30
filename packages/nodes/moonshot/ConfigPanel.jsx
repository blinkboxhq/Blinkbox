import { useState } from 'react';
import {
  Settings2, MessageSquare, Code2, Braces, Wrench, Brain,
  Image as ImageIcon, FileText, ScanText, Tags, AlignLeft,
  Languages, Heart, Sparkles, Wand2, ChevronDown, RefreshCw, Loader2,
} from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';
import CredentialPicker from '@/components/ui/CredentialPicker';
import api from '@/lib/api';

const ACCENT = 'fuchsia';
const ACCENT_HEX = '#7C3AED';

const OPERATIONS = [
  { value: 'message', label: 'Chat Message', icon: MessageSquare, description: 'Talk to Kimi — general chat & generation' },
  { value: 'code', label: 'Code', icon: Code2, description: 'Generate or refactor code (Kimi K2 Code)' },
  { value: 'structuredOutput', label: 'Structured Output', icon: Braces, description: 'Force valid JSON, optionally to a schema' },
  { value: 'functionCalling', label: 'Function Calling', icon: Wrench, description: 'Let Kimi call your tools / functions' },
  { value: 'reasoning', label: 'Reasoning', icon: Brain, description: 'Step-by-step thinking (Kimi K2 Thinking)' },
  { value: 'analyzeImage', label: 'Analyze Image', icon: ImageIcon, description: 'Vision — describe / answer about an image' },
  { value: 'analyzeDocument', label: 'Analyze Document', icon: FileText, description: 'Long-context document understanding' },
  { value: 'extractData', label: 'Extract Data', icon: ScanText, description: 'Pull structured fields from text' },
  { value: 'classify', label: 'Classify', icon: Tags, description: 'Label text into one of your categories' },
  { value: 'summarize', label: 'Summarize', icon: AlignLeft, description: 'Condense long text' },
  { value: 'translate', label: 'Translate', icon: Languages, description: 'Translate to a target language' },
  { value: 'sentiment', label: 'Sentiment', icon: Heart, description: 'Sentiment & emotion analysis' },
  { value: 'generatePrompt', label: 'Generate Prompt', icon: Sparkles, description: 'Write an effective AI prompt for a task' },
  { value: 'improvePrompt', label: 'Improve Prompt', icon: Wand2, description: 'Rewrite a prompt to be sharper' },
];

const MODELS_CHAT = ['kimi-k2.6', 'kimi-k2.5', 'kimi-k2-instruct', 'moonshot-v1-128k', 'moonshot-v1-32k', 'moonshot-v1-8k'];
const MODELS_CODE = ['kimi-k2.7-code', 'kimi-k2.6'];
const MODELS_THINK = ['kimi-k2-thinking', 'kimi-k2.6'];
const MODELS_VISION = ['kimi-k2.6', 'kimi-k2.5'];

const ADVANCED_OPS = new Set(['message', 'code', 'structuredOutput', 'functionCalling', 'analyzeImage', 'analyzeDocument', 'summarize']);

function Header() {
  return (
    <div className="flex items-center gap-3 px-4 pt-4 pb-1">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: `${ACCENT_HEX}1a`, border: `1px solid ${ACCENT_HEX}33` }}
      >
        <Sparkles className="w-[18px] h-[18px]" style={{ color: ACCENT_HEX }} />
      </div>
      <div>
        <div className="text-[13px] font-semibold text-zinc-100">Kimi · Moonshot AI</div>
        <div className="text-[11px] text-zinc-500">Long-context · multimodal · thinking & agentic tool use</div>
      </div>
    </div>
  );
}

function Field({ label, children, hint }) {
  return (
    <div>
      <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">{label}</label>
      {children}
      {hint && <p className="text-[10px] text-zinc-600 mt-1">{hint}</p>}
    </div>
  );
}

function Select({ value, onChange, options }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className="px-2.5 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-150 border"
            style={active
              ? { background: `${ACCENT_HEX}1f`, borderColor: `${ACCENT_HEX}66`, color: '#fafafa' }
              : { background: '#18181b', borderColor: '#27272a', color: '#a1a1aa' }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function IOBadge({ kind, children }) {
  const tone = kind === 'in'
    ? { color: '#38bdf8', bg: '#38bdf81a', border: '#38bdf833' }
    : { color: '#a3e635', bg: '#a3e6351a', border: '#a3e63533' };
  return (
    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
      style={{ color: tone.color, background: tone.bg, border: `1px solid ${tone.border}` }}>
      {children}
    </span>
  );
}

function ModelPicker({ value, onChange, baseModels, credentialId }) {
  const [models, setModels] = useState(baseModels);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function fetchLatest() {
    if (!credentialId) { setError('Select an API key first'); return; }
    setLoading(true); setError('');
    try {
      const { data } = await api.get('/automation/models/moonshot', { params: { credentialId } });
      const live = (data.models || []).filter(Boolean);
      if (live.length) {
        const merged = Array.from(new Set([...baseModels, ...live]));
        setModels(merged);
      }
    } catch (e) {
      setError(e.response?.data?.error || 'Could not fetch models');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Model</label>
        <button
          type="button"
          onClick={fetchLatest}
          disabled={loading}
          className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          Fetch latest
        </button>
      </div>
      {models.length > 8 ? (
        <div className="relative">
          <select
            value={value || models[0]}
            onChange={(e) => onChange(e.target.value)}
            className="w-full appearance-none bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500"
          >
            {models.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <ChevronDown className="w-4 h-4 text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      ) : (
        <Select value={value || models[0]} onChange={onChange} options={models.map((m) => ({ value: m, label: m }))} />
      )}
      {error && <p className="text-[10px] text-amber-400 mt-1">{error}</p>}
    </div>
  );
}

function MessageFields({ config, update, credentialId }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2"><IOBadge kind="in">text in</IOBadge><IOBadge kind="out">text / json out</IOBadge></div>
      <ModelPicker value={config.model} onChange={(v) => update('model', v)} baseModels={MODELS_CHAT} credentialId={credentialId} />
      <Field label="Prompt" hint="Your instruction. Combined with the previous node's output.">
        <SmartVariableInput value={config.prompt || ''} onChange={(v) => update('prompt', v)} placeholder="Summarize the input and list 3 action items..." multiline nodeId={config.__nodeId} />
      </Field>
      <Field label="System Prompt" hint="Optional — sets Kimi's persona / rules.">
        <SmartVariableInput value={config.systemPrompt || ''} onChange={(v) => update('systemPrompt', v)} placeholder="You are a helpful assistant..." multiline nodeId={config.__nodeId} />
      </Field>
      <Field label="Output Format">
        <Select value={config.outputFormat || 'text'} onChange={(v) => update('outputFormat', v)} options={[{ value: 'text', label: 'Text' }, { value: 'json', label: 'JSON' }]} />
      </Field>
    </div>
  );
}

function CodeFields({ config, update, credentialId }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2"><IOBadge kind="in">text in</IOBadge><IOBadge kind="out">code out</IOBadge></div>
      <ModelPicker value={config.model} onChange={(v) => update('model', v)} baseModels={MODELS_CODE} credentialId={credentialId} />
      <Field label="Instruction">
        <SmartVariableInput value={config.prompt || ''} onChange={(v) => update('prompt', v)} placeholder="Write a Python function that..." multiline nodeId={config.__nodeId} />
      </Field>
      <Field label="System Prompt" hint="Optional override.">
        <SmartVariableInput value={config.systemPrompt || ''} onChange={(v) => update('systemPrompt', v)} placeholder="You are an expert in Rust..." multiline nodeId={config.__nodeId} />
      </Field>
    </div>
  );
}

function StructuredFields({ config, update, credentialId }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2"><IOBadge kind="in">text in</IOBadge><IOBadge kind="out">json out</IOBadge></div>
      <ModelPicker value={config.model} onChange={(v) => update('model', v)} baseModels={MODELS_CHAT} credentialId={credentialId} />
      <Field label="Prompt">
        <SmartVariableInput value={config.prompt || ''} onChange={(v) => update('prompt', v)} placeholder="Extract name, email and company from the input." multiline nodeId={config.__nodeId} />
      </Field>
      <Field label="JSON Schema" hint="Optional — paste a JSON Schema to constrain the shape.">
        <SmartVariableInput value={config.jsonSchema || ''} onChange={(v) => update('jsonSchema', v)} placeholder='{"type":"object","properties":{...}}' multiline nodeId={config.__nodeId} />
      </Field>
    </div>
  );
}

function FunctionFields({ config, update, credentialId }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2"><IOBadge kind="in">text in</IOBadge><IOBadge kind="out">tool calls out</IOBadge></div>
      <ModelPicker value={config.model} onChange={(v) => update('model', v)} baseModels={MODELS_CHAT} credentialId={credentialId} />
      <Field label="Prompt">
        <SmartVariableInput value={config.prompt || ''} onChange={(v) => update('prompt', v)} placeholder="What's the weather in Tokyo and should I bring an umbrella?" multiline nodeId={config.__nodeId} />
      </Field>
      <Field label="Tools (JSON array)" hint="OpenAI-style function definitions.">
        <SmartVariableInput value={config.tools || ''} onChange={(v) => update('tools', v)} placeholder='[{"name":"get_weather","description":"...","parameters":{...}}]' multiline nodeId={config.__nodeId} />
      </Field>
      <Field label="Tool Choice" hint='Optional: "auto", "none", or {"type":"function","function":{"name":"..."}}'>
        <SmartVariableInput value={config.toolChoice || ''} onChange={(v) => update('toolChoice', v)} placeholder="auto" nodeId={config.__nodeId} />
      </Field>
    </div>
  );
}

function ReasoningFields({ config, update, credentialId }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2"><IOBadge kind="in">text in</IOBadge><IOBadge kind="out">answer + reasoning out</IOBadge></div>
      <ModelPicker value={config.model} onChange={(v) => update('model', v)} baseModels={MODELS_THINK} credentialId={credentialId} />
      <Field label="Problem" hint="Kimi thinks step by step; reasoning is returned separately.">
        <SmartVariableInput value={config.prompt || ''} onChange={(v) => update('prompt', v)} placeholder="A train leaves at... solve and explain." multiline nodeId={config.__nodeId} />
      </Field>
    </div>
  );
}

function ImageFields({ config, update, credentialId }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2"><IOBadge kind="in">image url in</IOBadge><IOBadge kind="out">text out</IOBadge></div>
      <ModelPicker value={config.model} onChange={(v) => update('model', v)} baseModels={MODELS_VISION} credentialId={credentialId} />
      <Field label="Image URL" hint="Public URL or data: URI. Falls back to input.imageUrl.">
        <SmartVariableInput value={config.imageUrl || ''} onChange={(v) => update('imageUrl', v)} placeholder="https://... or {{ $json.imageUrl }}" nodeId={config.__nodeId} />
      </Field>
      <Field label="Question">
        <SmartVariableInput value={config.question || ''} onChange={(v) => update('question', v)} placeholder="What's in this image?" multiline nodeId={config.__nodeId} />
      </Field>
    </div>
  );
}

function DocumentFields({ config, update, credentialId }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2"><IOBadge kind="in">document text in</IOBadge><IOBadge kind="out">text out</IOBadge></div>
      <ModelPicker value={config.model} onChange={(v) => update('model', v)} baseModels={MODELS_CHAT} credentialId={credentialId} />
      <Field label="Document Text" hint="Falls back to input.text / input.content. Kimi has very long context.">
        <SmartVariableInput value={config.documentText || ''} onChange={(v) => update('documentText', v)} placeholder="{{ $json.text }}" multiline nodeId={config.__nodeId} />
      </Field>
      <Field label="Instruction">
        <SmartVariableInput value={config.prompt || ''} onChange={(v) => update('prompt', v)} placeholder="Summarize and list key obligations." multiline nodeId={config.__nodeId} />
      </Field>
    </div>
  );
}

function ExtractFields({ config, update, credentialId }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2"><IOBadge kind="in">text in</IOBadge><IOBadge kind="out">json out</IOBadge></div>
      <ModelPicker value={config.model} onChange={(v) => update('model', v)} baseModels={MODELS_CHAT} credentialId={credentialId} />
      <Field label="Text" hint="Falls back to input.text.">
        <SmartVariableInput value={config.text || ''} onChange={(v) => update('text', v)} placeholder="{{ $json.text }}" multiline nodeId={config.__nodeId} />
      </Field>
      <Field label="Fields to Extract" hint="Comma-separated, e.g. name, email, total. Leave blank to auto-extract.">
        <SmartVariableInput value={config.fields || ''} onChange={(v) => update('fields', v)} placeholder="name, email, amount, date" nodeId={config.__nodeId} />
      </Field>
    </div>
  );
}

function ClassifyFields({ config, update, credentialId }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2"><IOBadge kind="in">text in</IOBadge><IOBadge kind="out">label out</IOBadge></div>
      <ModelPicker value={config.model} onChange={(v) => update('model', v)} baseModels={MODELS_CHAT} credentialId={credentialId} />
      <Field label="Text" hint="Falls back to input.text.">
        <SmartVariableInput value={config.text || ''} onChange={(v) => update('text', v)} placeholder="{{ $json.text }}" multiline nodeId={config.__nodeId} />
      </Field>
      <Field label="Labels" hint="Comma-separated categories.">
        <SmartVariableInput value={config.labels || ''} onChange={(v) => update('labels', v)} placeholder="urgent, normal, spam" nodeId={config.__nodeId} />
      </Field>
    </div>
  );
}

function SummarizeFields({ config, update, credentialId }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2"><IOBadge kind="in">text in</IOBadge><IOBadge kind="out">summary out</IOBadge></div>
      <ModelPicker value={config.model} onChange={(v) => update('model', v)} baseModels={MODELS_CHAT} credentialId={credentialId} />
      <Field label="Text" hint="Falls back to input.text / input.content.">
        <SmartVariableInput value={config.text || ''} onChange={(v) => update('text', v)} placeholder="{{ $json.content }}" multiline nodeId={config.__nodeId} />
      </Field>
      <Field label="Style">
        <Select value={config.style || 'concise'} onChange={(v) => update('style', v)} options={[
          { value: 'concise', label: 'Concise' }, { value: 'detailed', label: 'Detailed' }, { value: 'bullet points', label: 'Bullets' },
        ]} />
      </Field>
      <Field label="Max Words" hint="Optional length target.">
        <SmartVariableInput value={config.maxWords || ''} onChange={(v) => update('maxWords', v)} placeholder="100" nodeId={config.__nodeId} />
      </Field>
    </div>
  );
}

function TranslateFields({ config, update, credentialId }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2"><IOBadge kind="in">text in</IOBadge><IOBadge kind="out">translation out</IOBadge></div>
      <ModelPicker value={config.model} onChange={(v) => update('model', v)} baseModels={MODELS_CHAT} credentialId={credentialId} />
      <Field label="Text">
        <SmartVariableInput value={config.text || ''} onChange={(v) => update('text', v)} placeholder="{{ $json.text }}" multiline nodeId={config.__nodeId} />
      </Field>
      <Field label="Target Language">
        <SmartVariableInput value={config.targetLanguage || ''} onChange={(v) => update('targetLanguage', v)} placeholder="English" nodeId={config.__nodeId} />
      </Field>
    </div>
  );
}

function SentimentFields({ config, update, credentialId }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2"><IOBadge kind="in">text in</IOBadge><IOBadge kind="out">json out</IOBadge></div>
      <ModelPicker value={config.model} onChange={(v) => update('model', v)} baseModels={MODELS_CHAT} credentialId={credentialId} />
      <Field label="Text" hint="Falls back to input.text.">
        <SmartVariableInput value={config.text || ''} onChange={(v) => update('text', v)} placeholder="{{ $json.text }}" multiline nodeId={config.__nodeId} />
      </Field>
    </div>
  );
}

function GeneratePromptFields({ config, update, credentialId }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2"><IOBadge kind="in">task in</IOBadge><IOBadge kind="out">prompt out</IOBadge></div>
      <ModelPicker value={config.model} onChange={(v) => update('model', v)} baseModels={MODELS_CHAT} credentialId={credentialId} />
      <Field label="Task Description">
        <SmartVariableInput value={config.task || ''} onChange={(v) => update('task', v)} placeholder="Classify support tickets by urgency" multiline nodeId={config.__nodeId} />
      </Field>
    </div>
  );
}

function ImprovePromptFields({ config, update, credentialId }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2"><IOBadge kind="in">prompt in</IOBadge><IOBadge kind="out">prompt out</IOBadge></div>
      <ModelPicker value={config.model} onChange={(v) => update('model', v)} baseModels={MODELS_CHAT} credentialId={credentialId} />
      <Field label="Prompt to Improve">
        <SmartVariableInput value={config.prompt || ''} onChange={(v) => update('prompt', v)} placeholder="Paste a prompt to sharpen..." multiline nodeId={config.__nodeId} />
      </Field>
    </div>
  );
}

const OP_FIELDS = {
  message: MessageFields,
  code: CodeFields,
  structuredOutput: StructuredFields,
  functionCalling: FunctionFields,
  reasoning: ReasoningFields,
  analyzeImage: ImageFields,
  analyzeDocument: DocumentFields,
  extractData: ExtractFields,
  classify: ClassifyFields,
  summarize: SummarizeFields,
  translate: TranslateFields,
  sentiment: SentimentFields,
  generatePrompt: GeneratePromptFields,
  improvePrompt: ImprovePromptFields,
};

function AdvancedSection({ config, update }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-zinc-800 pt-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider hover:text-zinc-200 transition-colors"
      >
        <Settings2 className="w-3.5 h-3.5" />
        Advanced
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="grid grid-cols-2 gap-3 mt-3">
          <Field label="Temperature">
            <SmartVariableInput value={config.temperature ?? ''} onChange={(v) => update('temperature', v)} placeholder="0.6" nodeId={config.__nodeId} />
          </Field>
          <Field label="Max Tokens">
            <SmartVariableInput value={config.maxTokens ?? ''} onChange={(v) => update('maxTokens', v)} placeholder="2000" nodeId={config.__nodeId} />
          </Field>
          <Field label="Top P">
            <SmartVariableInput value={config.topP ?? ''} onChange={(v) => update('topP', v)} placeholder="1" nodeId={config.__nodeId} />
          </Field>
          <Field label="Frequency Penalty">
            <SmartVariableInput value={config.frequencyPenalty ?? ''} onChange={(v) => update('frequencyPenalty', v)} placeholder="0" nodeId={config.__nodeId} />
          </Field>
          <Field label="Presence Penalty">
            <SmartVariableInput value={config.presencePenalty ?? ''} onChange={(v) => update('presencePenalty', v)} placeholder="0" nodeId={config.__nodeId} />
          </Field>
          <Field label="Stop Sequences" hint="One per line, max 4.">
            <SmartVariableInput value={config.stop ?? ''} onChange={(v) => update('stop', v)} placeholder="###" multiline nodeId={config.__nodeId} />
          </Field>
        </div>
      )}
    </div>
  );
}

function OperationPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const current = OPERATIONS.find((o) => o.value === value) || OPERATIONS[0];
  const Icon = current.icon;
  return (
    <div className="relative">
      <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Operation</label>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2.5 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-left hover:border-zinc-600 transition-colors"
      >
        <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
          style={{ background: `${ACCENT_HEX}1a`, border: `1px solid ${ACCENT_HEX}33` }}>
          <Icon className="w-4 h-4" style={{ color: ACCENT_HEX }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-medium text-zinc-100">{current.label}</div>
          <div className="text-[10px] text-zinc-500 truncate">{current.description}</div>
        </div>
        <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full max-h-[320px] overflow-y-auto bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl backdrop-blur-md">
          {OPERATIONS.map((op) => {
            const OpIcon = op.icon;
            const active = op.value === value;
            return (
              <button
                key={op.value}
                type="button"
                onClick={() => { onChange(op.value); setOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${active ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'}`}
              >
                <OpIcon className="w-4 h-4 shrink-0" style={{ color: active ? ACCENT_HEX : '#71717a' }} />
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-medium text-zinc-200">{op.label}</div>
                  <div className="text-[10px] text-zinc-500 truncate">{op.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function MoonshotNode({ config = {}, onChange, nodeId }) {
  const operation = config.operation || 'message';
  const update = (key, val) => onChange({ ...config, [key]: val, __nodeId: nodeId });
  const Fields = OP_FIELDS[operation] || MessageFields;

  return (
    <div className="flex flex-col">
      <Header />
      <div className="flex flex-col gap-4 p-4">
        <CredentialPicker
          value={config.credentialId}
          onChange={(v) => update('credentialId', v)}
          accentColor={ACCENT}
          credentialType="Moonshot"
          label="Moonshot (Kimi) API Key"
          placeholder="Select a Moonshot credential"
        />

        <div className="border-t border-zinc-800" />

        <OperationPicker value={operation} onChange={(v) => update('operation', v)} />

        <div className="border-t border-zinc-800" />

        <Fields config={{ ...config, __nodeId: nodeId }} update={update} credentialId={config.credentialId} />

        {ADVANCED_OPS.has(operation) && <AdvancedSection config={{ ...config, __nodeId: nodeId }} update={update} />}
      </div>
    </div>
  );
}
