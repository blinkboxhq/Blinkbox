import { MessageSquare, Code2, Image, Cpu, Mic, Zap } from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';
import CredentialPicker from '@/components/ui/CredentialPicker';

const OPERATIONS = [
  { value: 'chat',    label: 'Chat',            icon: MessageSquare, description: 'Prompt any Gemma model via NVIDIA NIM' },
  { value: 'vision',  label: 'Vision',          icon: Image,         description: 'Analyze images (Gemma 4, Gemma 3 27B, Gemma 3n)' },
  { value: 'code',    label: 'Code',            icon: Code2,         description: 'Code generation & completion (CodeGemma)' },
];

const MODELS_CHAT = [
  { value: 'google/gemma-4-31b-it',    label: 'Gemma 4 31B ✦',           note: '256K ctx · multimodal' },
  { value: 'google/gemma-3-27b-it',    label: 'Gemma 3 27B',             note: '128K ctx · vision' },
  { value: 'google/gemma-3n-e4b-it',   label: 'Gemma 3n E4B (edge)',     note: 'img+audio+video' },
  { value: 'google/gemma-3n-e2b-it',   label: 'Gemma 3n E2B (edge)',     note: 'img+audio+video · fast' },
  { value: 'google/gemma-3-1b-it',     label: 'Gemma 3 1B',              note: 'ultra-lightweight' },
  { value: 'google/gemma-2-27b-it',    label: 'Gemma 2 27B',             note: 'text-only' },
  { value: 'google/gemma-2-9b-it',     label: 'Gemma 2 9B',              note: 'text-only' },
  { value: 'google/gemma-2-2b-it',     label: 'Gemma 2 2B',              note: 'text-only · fast' },
  { value: 'google/gemma-7b',          label: 'Gemma 1 7B',              note: 'pretrained' },
];

const MODELS_VISION = [
  { value: 'google/gemma-4-31b-it',    label: 'Gemma 4 31B ✦',           note: '256K ctx · text+image+video' },
  { value: 'google/gemma-3-27b-it',    label: 'Gemma 3 27B',             note: '128K ctx · image' },
  { value: 'google/gemma-3n-e4b-it',   label: 'Gemma 3n E4B',            note: 'img+video+audio' },
  { value: 'google/gemma-3n-e2b-it',   label: 'Gemma 3n E2B',            note: 'img+video+audio · edge' },
];

const MODELS_CODE = [
  { value: 'google/codegemma-1.1-7b',  label: 'CodeGemma 1.1 7B ✦',     note: 'code chat + instruct' },
  { value: 'google/codegemma-7b',      label: 'CodeGemma 7B',            note: 'code completion' },
  { value: 'google/gemma-4-31b-it',    label: 'Gemma 4 31B',             note: 'general + code · 256K' },
  { value: 'google/gemma-3-27b-it',    label: 'Gemma 3 27B',             note: 'general + code' },
];

function modelsForOp(op) {
  if (op === 'vision') return MODELS_VISION;
  if (op === 'code')   return MODELS_CODE;
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

function OperationPicker({ value, onChange }) {
  return (
    <div className="flex gap-1.5">
      {OPERATIONS.map((op) => {
        const Icon = op.icon;
        const active = value === op.value;
        return (
          <button key={op.value} type="button" onClick={() => onChange(op.value)}
            className={`flex-1 flex flex-col items-center gap-1.5 px-2 py-2.5 rounded-xl border text-center transition-all duration-150 ${
              active
                ? 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                : 'bg-[#0d0d0d] border-[#222] text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
            }`}
          >
            <Icon size={15} strokeWidth={1.75} className={active ? 'text-blue-400' : 'text-zinc-600'} />
            <span className="text-[11px] font-semibold leading-tight">{op.label}</span>
          </button>
        );
      })}
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
            className={`flex items-center justify-between px-3 py-2 rounded-lg border text-left transition-all duration-150 ${
              active
                ? 'bg-blue-500/10 border-blue-500/30'
                : 'bg-[#0d0d0d] border-[#222] hover:border-zinc-700'
            }`}
          >
            <span className={`text-[12px] font-medium ${active ? 'text-blue-300' : 'text-zinc-300'}`}>{m.label}</span>
            <span className="text-[10px] text-zinc-600 shrink-0 ml-2">{m.note}</span>
          </button>
        );
      })}
    </div>
  );
}

const VISION_MODELS = new Set(['google/gemma-4-31b-it', 'google/gemma-3-27b-it', 'google/gemma-3n-e4b-it', 'google/gemma-3n-e2b-it']);

export default function GemmaNimNode({ config = {}, updateConfig, nodeId }) {
  const operation   = config.operation || 'chat';
  const models      = modelsForOp(operation);
  const model       = config.model || models[0].value;
  const isVisionOp  = operation === 'vision';
  const canVision   = VISION_MODELS.has(model);

  return (
    <div className="flex flex-col gap-5 w-full">
      <div className="flex items-center gap-3 pb-1">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-blue-500/10 border border-blue-500/20">
          <Zap size={15} className="text-blue-400" />
        </div>
        <div>
          <div className="text-[14px] font-bold text-white leading-tight">Google Gemma</div>
          <div className="text-[11px] text-zinc-500">via NVIDIA NIM</div>
        </div>
      </div>

      <CredentialPicker
        value={config.credentialId || ''}
        onChange={(id) => updateConfig('credentialId', id)}
        accentColor="blue"
        credentialType="NvidiaNim"
        label="NVIDIA NIM API Key"
        placeholder="Select NVIDIA NIM credential…"
      />

      <div className="border-t border-[#1a1a1a]" />

      <Field label="Operation">
        <OperationPicker value={operation} onChange={(v) => {
          updateConfig('operation', v);
          updateConfig('model', modelsForOp(v)[0].value);
        }} />
      </Field>

      <Field label="Model">
        <ModelPicker value={model} onChange={(v) => updateConfig('model', v)} models={models} />
      </Field>

      <div className="border-t border-[#1a1a1a]" />

      {isVisionOp && (
        <Field label="Image URL">
          <SmartVariableInput
            value={config.imageUrl || ''}
            onChange={(v) => updateConfig('imageUrl', v)}
            placeholder="https://… or {{$node.imageUrl}}"
            nodeId={nodeId}
          />
        </Field>
      )}

      {!canVision && isVisionOp && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] px-3 py-2 rounded-lg">
          Selected model does not support vision. Choose Gemma 4, Gemma 3 27B, or Gemma 3n.
        </div>
      )}

      <Field label={isVisionOp ? 'Question / Prompt' : 'Prompt'}>
        <SmartVariableInput
          value={config.prompt || ''}
          onChange={(v) => updateConfig('prompt', v)}
          placeholder={isVisionOp ? 'Describe this image in detail.' : 'Enter your prompt…'}
          multiline
          nodeId={nodeId}
        />
      </Field>

      {operation !== 'vision' && (
        <Field label="Max tokens">
          <input
            type="number"
            value={config.maxTokens || 1024}
            onChange={(e) => updateConfig('maxTokens', parseInt(e.target.value) || 1024)}
            min={64} max={8192}
            className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500 w-full"
          />
        </Field>
      )}

    </div>
  );
}
