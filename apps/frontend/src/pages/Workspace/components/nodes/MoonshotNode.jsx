import { Settings2, MessageSquare, Image, FileText, Wand2, ChevronDown } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';
import CredentialPicker from '../../../../components/ui/CredentialPicker';

const MODELS = [
  { value: 'moonshot-v1-8k',               label: 'Moonshot V1 · 8K',              ctx: '8K context' },
  { value: 'moonshot-v1-32k',              label: 'Moonshot V1 · 32K',             ctx: '32K context' },
  { value: 'moonshot-v1-128k',             label: 'Moonshot V1 · 128K',            ctx: '128K context — documents' },
  { value: 'moonshot-v1-8k-vision-preview', label: 'Moonshot V1 · Vision (8K)',     ctx: 'Image understanding' },
];

const OPERATIONS = [
  { value: 'message',        label: 'Chat / Message',      icon: MessageSquare },
  { value: 'analyzeImage',   label: 'Analyze Image',       icon: Image },
  { value: 'analyzeDocument', label: 'Analyze Document',   icon: FileText },
  { value: 'generatePrompt', label: 'Generate Prompt',     icon: Wand2 },
  { value: 'improvePrompt',  label: 'Improve Prompt',      icon: Wand2 },
];

const ACCENT = '#1B64F4';
const ACCENT_LIGHT = 'rgba(27,100,244,0.15)';
const ACCENT_BORDER = 'rgba(27,100,244,0.25)';

function MoonshotIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.236 2.636 7.855 6.356 9.312-.088-.791-.167-2.005.035-2.868.181-.78 1.172-4.97 1.172-4.97s-.299-.598-.299-1.482c0-1.388.806-2.428 1.808-2.428.853 0 1.267.641 1.267 1.408 0 .858-.546 2.14-.828 3.33-.236.995.499 1.806 1.476 1.806 1.772 0 3.14-1.867 3.14-4.56 0-2.386-1.716-4.054-4.165-4.054-2.837 0-4.5 2.127-4.5 4.327 0 .856.33 1.774.741 2.275a.3.3 0 0 1 .069.285c-.076.313-.244.995-.277 1.134-.044.183-.146.222-.337.134-1.249-.581-2.03-2.407-2.03-3.874 0-3.154 2.292-6.052 6.608-6.052 3.469 0 6.165 2.473 6.165 5.776 0 3.447-2.173 6.22-5.19 6.22-1.013 0-1.966-.527-2.292-1.148l-.623 2.378c-.226.869-.835 1.958-1.244 2.621.937.29 1.931.446 2.962.446 5.523 0 10-4.477 10-10S17.523 2 12 2z"/>
    </svg>
  );
}

export default function MoonshotNode({ config = {}, updateConfig, nodeId }) {
  const operation = config.operation || 'message';
  const model = config.model || 'moonshot-v1-8k';
  const selectedOp = OPERATIONS.find(o => o.value === operation);
  const selectedModel = MODELS.find(m => m.value === model);

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: ACCENT_LIGHT, border: `1px solid ${ACCENT_BORDER}` }}>
        <div className="p-2 rounded-lg shrink-0" style={{ background: ACCENT_LIGHT, border: `1px solid ${ACCENT_BORDER}`, color: ACCENT }}>
          <MoonshotIcon className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold" style={{ color: ACCENT }}>Moonshot AI · Kimi</span>
          <span className="text-[10px] text-zinc-500 mt-0.5">Long-context models up to 128K tokens</span>
        </div>
      </div>

      {/* Operation picker */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Operation</label>
        <div className="grid grid-cols-1 gap-1">
          {OPERATIONS.map(op => {
            const OpIcon = op.icon;
            const active = operation === op.value;
            return (
              <button
                key={op.value}
                onClick={() => updateConfig('operation', op.value)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all duration-150"
                style={active
                  ? { background: ACCENT_LIGHT, border: `1px solid ${ACCENT_BORDER}`, color: ACCENT }
                  : { background: 'transparent', border: '1px solid transparent', color: '#71717a' }
                }
              >
                <OpIcon className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
                <span className="text-[12px] font-semibold">{op.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Model + config */}
      <div className="flex flex-col gap-3 bg-[#0a0a0a] p-4 border border-[#222] rounded-xl">
        <div className="flex items-center gap-2 pb-3 border-b border-[#222]">
          <Settings2 className="w-4 h-4" style={{ color: ACCENT }} />
          <span className="text-xs font-bold text-zinc-300 uppercase tracking-widest">Config</span>
        </div>

        {/* Model selector */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Model</span>
          <div className="relative">
            <select
              value={model}
              onChange={e => updateConfig('model', e.target.value)}
              className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-xs text-white font-semibold focus:outline-none transition-colors cursor-pointer appearance-none pr-8"
              style={{ focusBorderColor: ACCENT }}
            >
              {MODELS.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          {selectedModel && (
            <span className="text-[10px] text-zinc-600 pl-1">{selectedModel.ctx}</span>
          )}
        </div>

        {/* Output format — only for message op */}
        {operation === 'message' && (
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider w-14 shrink-0">Output</span>
            <div className="flex gap-1.5">
              {['text', 'json'].map(fmt => (
                <button
                  key={fmt}
                  onClick={() => updateConfig('outputFormat', fmt)}
                  className="px-3 py-1.5 rounded-md text-[11px] font-bold transition-all duration-150"
                  style={(config.outputFormat || 'text') === fmt
                    ? { background: ACCENT_LIGHT, border: `1px solid ${ACCENT_BORDER}`, color: ACCENT }
                    : { background: '#111', border: '1px solid #333', color: '#71717a' }
                  }
                >
                  {fmt === 'text' ? 'Raw Text' : 'JSON'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Temperature */}
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider w-14 shrink-0">Temp</span>
          <input
            type="range" min="0" max="1" step="0.1"
            value={config.temperature ?? 0.7}
            onChange={e => updateConfig('temperature', parseFloat(e.target.value))}
            className="flex-1 h-1 accent-blue-500 cursor-pointer"
          />
          <span className="text-[11px] font-mono text-zinc-400 w-6 text-right">{(config.temperature ?? 0.7).toFixed(1)}</span>
        </div>

        {/* Max tokens */}
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider w-14 shrink-0">Tokens</span>
          <input
            type="number" min="100" max="32000" step="100"
            value={config.maxTokens || 2000}
            onChange={e => updateConfig('maxTokens', parseInt(e.target.value, 10))}
            className="flex-1 bg-[#111] border border-[#333] rounded-lg px-3 py-1.5 text-xs text-white font-semibold focus:outline-none focus:border-zinc-600 transition-colors"
          />
        </div>
      </div>

      {/* Prompt / Image URL / Document text depending on operation */}
      {operation === 'analyzeImage' ? (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
            <Image className="w-3.5 h-3.5" style={{ color: ACCENT }} /> Image URL
          </label>
          <SmartVariableInput
            value={config.imageUrl || ''}
            onChange={val => updateConfig('imageUrl', val)}
            placeholder="https://example.com/image.jpg"
          />
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2 mt-1">
            <MessageSquare className="w-3.5 h-3.5" style={{ color: ACCENT }} /> Question / Instruction
          </label>
          <SmartVariableInput
            value={config.prompt || ''}
            onChange={val => updateConfig('prompt', val)}
            placeholder="Describe this image..."
            multiline
          />
        </div>
      ) : operation === 'analyzeDocument' ? (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
            <FileText className="w-3.5 h-3.5" style={{ color: ACCENT }} /> Document Text
          </label>
          <SmartVariableInput
            value={config.documentText || ''}
            onChange={val => updateConfig('documentText', val)}
            placeholder="Paste document text or use {{ $json.text }}"
            multiline
          />
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2 mt-1">
            <MessageSquare className="w-3.5 h-3.5" style={{ color: ACCENT }} /> Question / Task
          </label>
          <SmartVariableInput
            value={config.prompt || ''}
            onChange={val => updateConfig('prompt', val)}
            placeholder="Summarize this document..."
            multiline
          />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
            <MessageSquare className="w-3.5 h-3.5" style={{ color: ACCENT }} />
            {operation === 'generatePrompt' ? 'Task Description' : operation === 'improvePrompt' ? 'Prompt to Improve' : 'Prompt'}
          </label>
          <SmartVariableInput
            value={config.prompt || ''}
            onChange={val => updateConfig('prompt', val)}
            placeholder={
              operation === 'generatePrompt' ? 'Describe the task you need a prompt for...'
              : operation === 'improvePrompt' ? 'Paste the prompt to improve...'
              : 'What should Kimi do with the input data?'
            }
            multiline
          />
        </div>
      )}

      {/* Credential */}
      <CredentialPicker
        value={config.credentialId || ''}
        onChange={id => updateConfig('credentialId', id)}
        accentColor="blue"
        label="Moonshot API Key"
        placeholder="Select Moonshot credential..."
      />
    </div>
  );
}
