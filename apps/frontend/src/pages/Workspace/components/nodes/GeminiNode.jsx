import {
  MessageSquare, Image, FileText, PenLine, ChevronDown,
} from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';
import CredentialPicker from '../../../../components/ui/CredentialPicker';

const OPERATIONS = [
  {
    value: 'message',
    label: 'Message a model',
    icon: MessageSquare,
    description: 'Chat with Gemini — text or JSON output',
  },
  {
    value: 'analyzeImage',
    label: 'Analyze image',
    icon: Image,
    description: 'Describe or ask questions about an image (Gemini Vision)',
  },
  {
    value: 'analyzeDocument',
    label: 'Analyze document',
    icon: FileText,
    description: 'Deep-read a long document or passage of text',
  },
  {
    value: 'generatePrompt',
    label: 'Generate a prompt',
    icon: PenLine,
    description: 'Write an effective AI prompt for a described task',
  },
];

const MODELS_CHAT = [
  { value: 'gemini-2.0-flash',   label: 'Gemini 2.0 Flash' },
  { value: 'gemini-1.5-pro',     label: 'Gemini 1.5 Pro' },
  { value: 'gemini-1.5-flash',   label: 'Gemini 1.5 Flash' },
];

// ── Shared primitives ──────────────────────────────────────────────────────

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{label}</span>
      {children}
    </div>
  );
}

function Select({ value, onChange, options }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2 pr-8 text-xs text-white font-semibold focus:outline-none focus:border-blue-500/50 transition-colors cursor-pointer appearance-none"
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
                  ? 'bg-blue-500/10 border-blue-500/30'
                  : 'bg-[#0d0d0d] border-[#222] hover:bg-zinc-800/60 hover:border-zinc-700/50'
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

// ── Per-operation config fields ────────────────────────────────────────────

function MessageFields({ config, updateConfig }) {
  return (
    <>
      <Field label="Model">
        <Select value={config.model || 'gemini-2.0-flash'} onChange={(v) => updateConfig('model', v)} options={MODELS_CHAT} />
      </Field>
      <Field label="Output format">
        <Select
          value={config.outputFormat || 'text'}
          onChange={(v) => updateConfig('outputFormat', v)}
          options={[{ value: 'text', label: 'Raw Text' }, { value: 'json', label: 'Structured JSON' }]}
        />
      </Field>
      <Field label="Prompt">
        <SmartVariableInput value={config.prompt || ''} onChange={(v) => updateConfig('prompt', v)} placeholder="e.g. Classify the following items by category..." multiline />
      </Field>
    </>
  );
}

function AnalyzeImageFields({ config, updateConfig }) {
  return (
    <>
      <Field label="Model">
        <Select value={config.model || 'gemini-2.0-flash'} onChange={(v) => updateConfig('model', v)} options={MODELS_CHAT} />
      </Field>
      <Field label="Image URL">
        <SmartVariableInput value={config.imageUrl || ''} onChange={(v) => updateConfig('imageUrl', v)} placeholder="https://... or {{$node.imageUrl}}" />
      </Field>
      <Field label="Question / Prompt">
        <SmartVariableInput value={config.prompt || ''} onChange={(v) => updateConfig('prompt', v)} placeholder="Describe this image in detail." multiline />
      </Field>
    </>
  );
}

function AnalyzeDocumentFields({ config, updateConfig }) {
  return (
    <>
      <Field label="Model">
        <Select value={config.model || 'gemini-2.0-flash'} onChange={(v) => updateConfig('model', v)} options={MODELS_CHAT} />
      </Field>
      <Field label="Output format">
        <Select
          value={config.outputFormat || 'text'}
          onChange={(v) => updateConfig('outputFormat', v)}
          options={[{ value: 'text', label: 'Raw Text' }, { value: 'json', label: 'Structured JSON' }]}
        />
      </Field>
      <Field label="Question / Prompt">
        <SmartVariableInput value={config.prompt || ''} onChange={(v) => updateConfig('prompt', v)} placeholder="Summarize this document." multiline />
      </Field>
      <Field label="Document text (optional — falls back to input)">
        <SmartVariableInput value={config.documentText || ''} onChange={(v) => updateConfig('documentText', v)} placeholder="{{$node.content}} or leave blank" multiline />
      </Field>
    </>
  );
}

function GeneratePromptFields({ config, updateConfig }) {
  return (
    <Field label="Task description">
      <SmartVariableInput value={config.task || ''} onChange={(v) => updateConfig('task', v)} placeholder="e.g. Extract invoice line items as JSON..." multiline />
    </Field>
  );
}

const OP_FIELDS = {
  message: MessageFields,
  analyzeImage: AnalyzeImageFields,
  analyzeDocument: AnalyzeDocumentFields,
  generatePrompt: GeneratePromptFields,
};

// ── Main component ─────────────────────────────────────────────────────────

export default function GeminiNode({ config = {}, updateConfig, nodeId }) {
  const operation = config.operation || 'message';
  const OpFields = OP_FIELDS[operation] || MessageFields;

  return (
    <div className="flex flex-col gap-5 w-full">
      <OperationPicker value={operation} onChange={(v) => updateConfig('operation', v)} />
      <div className="border-t border-[#222]" />
      <OpFields config={config} updateConfig={updateConfig} />
      <CredentialPicker
        value={config.credentialId || ''}
        onChange={(id) => updateConfig('credentialId', id)}
        accentColor="blue"
        label="Google AI API Key"
        placeholder="Select Gemini credential..."
      />
    </div>
  );
}
