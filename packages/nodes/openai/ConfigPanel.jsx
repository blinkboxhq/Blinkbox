import {
  Sparkles, MessageSquare, Image, Mic, FileText,
  ShieldCheck, Wand2, PenLine, ChevronDown,
} from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';
import CredentialPicker from '@/components/ui/CredentialPicker';

const ACCENT = 'emerald';

const OPERATIONS = [
  {
    value: 'message',
    label: 'Message a model',
    icon: MessageSquare,
    description: 'Send a prompt, get a text or JSON response',
  },
  {
    value: 'analyzeImage',
    label: 'Analyze image',
    icon: Image,
    description: 'Describe or ask questions about an image (GPT-4o Vision)',
  },
  {
    value: 'generateImage',
    label: 'Generate image',
    icon: Wand2,
    description: 'Create an image from a text description (DALL-E 3)',
  },
  {
    value: 'transcribeAudio',
    label: 'Transcribe audio',
    icon: Mic,
    description: 'Convert speech to text from an audio URL (Whisper)',
  },
  {
    value: 'analyzeDocument',
    label: 'Analyze document',
    icon: FileText,
    description: 'Ask questions about a long document or text',
  },
  {
    value: 'moderateContent',
    label: 'Moderate content',
    icon: ShieldCheck,
    description: 'Check if text violates usage policies',
  },
  {
    value: 'generatePrompt',
    label: 'Generate a prompt',
    icon: PenLine,
    description: 'Let GPT write an effective AI prompt for a task',
  },
  {
    value: 'improvePrompt',
    label: 'Improve a prompt',
    icon: Sparkles,
    description: 'Rewrite an existing prompt to be clearer and more effective',
  },
];

const MODELS_MESSAGE = ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'];
const MODELS_VISION  = ['gpt-4o', 'gpt-4o-mini'];
const MODELS_IMAGE   = ['dall-e-3', 'dall-e-2'];
const IMAGE_SIZES    = ['1024x1024', '1792x1024', '1024x1792'];

// ── Shared primitives ──────────────────────────────────────────────────────

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{label}</span>
      {children}
    </div>
  );
}

function Select({ value, onChange, options, accent = ACCENT }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2 pr-8 text-xs text-white font-semibold focus:outline-none focus:border-${accent}-500/50 transition-colors cursor-pointer appearance-none`}
      >
        {options.map((o) => (
          <option key={typeof o === 'string' ? o : o.value} value={typeof o === 'string' ? o : o.value}>
            {typeof o === 'string' ? o : o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="w-3.5 h-3.5 text-zinc-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
    </div>
  );
}

// ── Operation picker ───────────────────────────────────────────────────────

function OperationPicker({ value, onChange }) {
  const current = OPERATIONS.find((o) => o.value === value) || OPERATIONS[0];
  const CurrentIcon = current.icon;

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
                  ? `bg-emerald-500/10 border-emerald-500/30 text-emerald-300`
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

// ── Per-operation config fields ────────────────────────────────────────────

function MessageFields({ config, updateConfig, nodeId }) {
  return (
    <>
      <Field label="Model">
        <Select value={config.model || 'gpt-4o-mini'} onChange={(v) => updateConfig('model', v)} options={MODELS_MESSAGE} />
      </Field>
      <Field label="Output format">
        <Select
          value={config.outputFormat || 'text'}
          onChange={(v) => updateConfig('outputFormat', v)}
          options={[{ value: 'text', label: 'Raw Text' }, { value: 'json', label: 'Structured JSON' }]}
        />
      </Field>
      <Field label="Prompt">
        <SmartVariableInput value={config.prompt || ''} onChange={(v) => updateConfig('prompt', v)} placeholder="e.g. Summarize the following data..." multiline nodeId={nodeId} />
      </Field>
    </>
  );
}

function AnalyzeImageFields({ config, updateConfig, nodeId }) {
  return (
    <>
      <Field label="Model">
        <Select value={config.model || 'gpt-4o'} onChange={(v) => updateConfig('model', v)} options={MODELS_VISION} />
      </Field>
      <Field label="Image URL">
        <SmartVariableInput value={config.imageUrl || ''} onChange={(v) => updateConfig('imageUrl', v)} placeholder="https://... or {{$node.imageUrl}}" nodeId={nodeId} />
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
      <Field label="Model">
        <Select value={config.model || 'dall-e-3'} onChange={(v) => updateConfig('model', v)} options={MODELS_IMAGE} />
      </Field>
      <Field label="Image description">
        <SmartVariableInput value={config.imagePrompt || ''} onChange={(v) => updateConfig('imagePrompt', v)} placeholder="A photorealistic cat in a spacesuit..." multiline nodeId={nodeId} />
      </Field>
      <Field label="Size">
        <Select value={config.imageSize || '1024x1024'} onChange={(v) => updateConfig('imageSize', v)} options={IMAGE_SIZES} />
      </Field>
      <Field label="Quality">
        <Select
          value={config.imageQuality || 'standard'}
          onChange={(v) => updateConfig('imageQuality', v)}
          options={[{ value: 'standard', label: 'Standard' }, { value: 'hd', label: 'HD' }]}
        />
      </Field>
    </>
  );
}

function TranscribeAudioFields({ config, updateConfig, nodeId }) {
  return (
    <>
      <Field label="Audio URL">
        <SmartVariableInput value={config.audioUrl || ''} onChange={(v) => updateConfig('audioUrl', v)} placeholder="https://... mp3/mp4/m4a/wav/webm" nodeId={nodeId} />
      </Field>
      <Field label="Language (optional)">
        <SmartVariableInput value={config.language || ''} onChange={(v) => updateConfig('language', v)} placeholder="en  (leave blank for auto-detect)" nodeId={nodeId} />
      </Field>
    </>
  );
}

function AnalyzeDocumentFields({ config, updateConfig, nodeId }) {
  return (
    <>
      <Field label="Model">
        <Select value={config.model || 'gpt-4o-mini'} onChange={(v) => updateConfig('model', v)} options={MODELS_MESSAGE} />
      </Field>
      <Field label="Question / Prompt">
        <SmartVariableInput value={config.prompt || ''} onChange={(v) => updateConfig('prompt', v)} placeholder="Summarize this document." multiline nodeId={nodeId} />
      </Field>
      <Field label="Document text (optional — falls back to input)">
        <SmartVariableInput value={config.documentText || ''} onChange={(v) => updateConfig('documentText', v)} placeholder="{{$node.content}} or leave blank to use previous node output" multiline nodeId={nodeId} />
      </Field>
    </>
  );
}

function ModerateContentFields({ config, updateConfig, nodeId }) {
  return (
    <Field label="Text to moderate">
      <SmartVariableInput value={config.prompt || ''} onChange={(v) => updateConfig('prompt', v)} placeholder="{{$node.text}} or paste text directly..." multiline nodeId={nodeId} />
    </Field>
  );
}

function GeneratePromptFields({ config, updateConfig, nodeId }) {
  return (
    <>
      <Field label="Model">
        <Select value={config.model || 'gpt-4o-mini'} onChange={(v) => updateConfig('model', v)} options={MODELS_MESSAGE} />
      </Field>
      <Field label="Task description">
        <SmartVariableInput value={config.task || ''} onChange={(v) => updateConfig('task', v)} placeholder="e.g. Classify customer support tickets by priority..." multiline nodeId={nodeId} />
      </Field>
    </>
  );
}

function ImprovePromptFields({ config, updateConfig, nodeId }) {
  return (
    <>
      <Field label="Model">
        <Select value={config.model || 'gpt-4o-mini'} onChange={(v) => updateConfig('model', v)} options={MODELS_MESSAGE} />
      </Field>
      <Field label="Prompt to improve">
        <SmartVariableInput value={config.prompt || ''} onChange={(v) => updateConfig('prompt', v)} placeholder="Paste the existing prompt here..." multiline nodeId={nodeId} />
      </Field>
    </>
  );
}

const OP_FIELDS = {
  message: MessageFields,
  analyzeImage: AnalyzeImageFields,
  generateImage: GenerateImageFields,
  transcribeAudio: TranscribeAudioFields,
  analyzeDocument: AnalyzeDocumentFields,
  moderateContent: ModerateContentFields,
  generatePrompt: GeneratePromptFields,
  improvePrompt: ImprovePromptFields,
};

// ── Main component ─────────────────────────────────────────────────────────

export default function OpenAINode({ config = {}, updateConfig, nodeId }) {
  const operation = config.operation || 'message';
  const OpFields = OP_FIELDS[operation] || MessageFields;
  const needsCredential = operation !== 'generateImage' || true; // all ops need key

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Operation picker */}
      <OperationPicker value={operation} onChange={(v) => updateConfig('operation', v)} />

      {/* Divider */}
      <div className="border-t border-[#222]" />

      {/* Operation-specific fields */}
      <OpFields config={config} updateConfig={updateConfig} nodeId={nodeId} />

      {/* Credential — always shown */}
      <CredentialPicker
        value={config.credentialId || ''}
        onChange={(id) => updateConfig('credentialId', id)}
        accentColor="emerald"
        label="OpenAI API Key"
        placeholder="Select OpenAI credential..."
      />
    </div>
  );
}
