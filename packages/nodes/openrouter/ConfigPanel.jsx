import { useEffect } from 'react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';
import CredentialPicker from '@/components/ui/CredentialPicker';
import { ConfigSection, ConfigLabel, ConfigSelect, ConfigDivider } from '@/components/ui/ConfigKit';

// Black & white only. The brand logo is the sole colored element.
const MONO = '#e5e5e5';

// OpenRouter routes to 300+ models behind one key — ids are "vendor/model".
const MODELS_CHAT = [
  'deepseek/deepseek-v4-pro',
  'deepseek/deepseek-v4-flash',
  'z-ai/glm-5.2',
  'z-ai/glm-4.6',
  'minimax/minimax-m2.1',
  'qwen/qwen3-max',
  'anthropic/claude-opus-4-8',
  'anthropic/claude-sonnet-4-6',
  'openai/gpt-5.6',
  'openai/gpt-5.6-mini',
  'google/gemini-3.5-pro',
];
const MODELS_CODE = ['qwen/qwen3-coder', 'z-ai/glm-4.6', 'deepseek/deepseek-v4-pro'];
const MODELS_REASON = ['deepseek/deepseek-r1', 'deepseek/deepseek-v4-pro', 'openai/gpt-5.6'];
const MODELS_VISION = ['openai/gpt-5.6', 'google/gemini-3.5-pro', 'z-ai/glm-4.6v', 'qwen/qwen3-vl-plus'];

const opt = (v) => v.map((s) => ({ value: s, label: s }));

function Text({ label, value, onChange, placeholder, multiline, nodeId }) {
  return (
    <div className="flex flex-col">
      <ConfigLabel>{label}</ConfigLabel>
      <SmartVariableInput value={value || ''} onChange={onChange} placeholder={placeholder} multiline={multiline} nodeId={nodeId} />
    </div>
  );
}

function Dropdown({ label, value, fallback, onChange, options }) {
  return <ConfigSelect label={label} value={value || fallback} onChange={onChange} options={options} accentColor={MONO} />;
}

// ── 14 per-action panels ────────────────────────────────────────────────────

function ChatPanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <Dropdown label="Model" value={config.model} fallback="deepseek/deepseek-v4-pro" onChange={(v) => updateConfig('model', v)} options={opt(MODELS_CHAT)} />
      <Text label="System Prompt" value={config.systemPrompt} onChange={(v) => updateConfig('systemPrompt', v)} placeholder="You are a helpful assistant…" multiline nodeId={nodeId} />
      <Text label="Prompt" value={config.prompt} onChange={(v) => updateConfig('prompt', v)} placeholder="Ask any model anything…" multiline nodeId={nodeId} />
      <Dropdown label="Output Format" value={config.outputFormat} fallback="text" onChange={(v) => updateConfig('outputFormat', v)} options={[{ value: 'text', label: 'Raw Text' }, { value: 'json', label: 'Structured JSON' }]} />
    </>
  );
}

function CodePanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <Dropdown label="Model" value={config.model} fallback="qwen/qwen3-coder" onChange={(v) => updateConfig('model', v)} options={opt(MODELS_CODE)} />
      <Text label="System Prompt" value={config.systemPrompt} onChange={(v) => updateConfig('systemPrompt', v)} placeholder="Optional coding guidance…" multiline nodeId={nodeId} />
      <Text label="Prompt" value={config.prompt} onChange={(v) => updateConfig('prompt', v)} placeholder="Write a debounce hook in TypeScript…" multiline nodeId={nodeId} />
    </>
  );
}

function StructuredPanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <Dropdown label="Model" value={config.model} fallback="deepseek/deepseek-v4-pro" onChange={(v) => updateConfig('model', v)} options={opt(MODELS_CHAT)} />
      <Text label="Prompt" value={config.prompt} onChange={(v) => updateConfig('prompt', v)} placeholder="Extract the invoice fields…" multiline nodeId={nodeId} />
      <Text label="JSON Schema (embedded as a hint)" value={config.jsonSchema} onChange={(v) => updateConfig('jsonSchema', v)} placeholder='{"type":"object","properties":{…}}' multiline nodeId={nodeId} />
    </>
  );
}

function FunctionPanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <Dropdown label="Model" value={config.model} fallback="deepseek/deepseek-v4-pro" onChange={(v) => updateConfig('model', v)} options={opt(MODELS_CHAT)} />
      <Text label="Prompt" value={config.prompt} onChange={(v) => updateConfig('prompt', v)} placeholder="What's the weather in Paris?" multiline nodeId={nodeId} />
      <Text label="Tools (JSON array)" value={config.tools} onChange={(v) => updateConfig('tools', v)} placeholder='[{"name":"get_weather","parameters":{…}}]' multiline nodeId={nodeId} />
    </>
  );
}

function ReasoningPanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <Dropdown label="Model" value={config.model} fallback="deepseek/deepseek-r1" onChange={(v) => updateConfig('model', v)} options={opt(MODELS_REASON)} />
      <Text label="System Prompt" value={config.systemPrompt} onChange={(v) => updateConfig('systemPrompt', v)} placeholder="Optional guidance…" multiline nodeId={nodeId} />
      <Text label="Prompt" value={config.prompt} onChange={(v) => updateConfig('prompt', v)} placeholder="Reason step-by-step through this problem…" multiline nodeId={nodeId} />
    </>
  );
}

function VisionPanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <Dropdown label="Model" value={config.model} fallback="openai/gpt-5.6" onChange={(v) => updateConfig('model', v)} options={opt(MODELS_VISION)} />
      <Text label="Image URL or Data URI" value={config.imageUrl} onChange={(v) => updateConfig('imageUrl', v)} placeholder="https://… or {{$node.image}}" nodeId={nodeId} />
      <Text label="Question" value={config.question} onChange={(v) => updateConfig('question', v)} placeholder="Describe this image in detail." multiline nodeId={nodeId} />
      <Dropdown label="Detail" value={config.detail} fallback="" onChange={(v) => updateConfig('detail', v)} options={[{ value: '', label: 'Default' }, { value: 'low', label: 'Low' }, { value: 'high', label: 'High' }]} />
    </>
  );
}

function DocumentPanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <Dropdown label="Model" value={config.model} fallback="deepseek/deepseek-v4-pro" onChange={(v) => updateConfig('model', v)} options={opt(MODELS_CHAT)} />
      <Text label="Question / Prompt" value={config.prompt} onChange={(v) => updateConfig('prompt', v)} placeholder="What are the key risks in this document?" multiline nodeId={nodeId} />
      <Text label="Document Text (optional — long-context models)" value={config.documentText} onChange={(v) => updateConfig('documentText', v)} placeholder="{{$node.content}} or leave blank" multiline nodeId={nodeId} />
    </>
  );
}

function ExtractPanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <Dropdown label="Model" value={config.model} fallback="deepseek/deepseek-v4-pro" onChange={(v) => updateConfig('model', v)} options={opt(MODELS_CHAT)} />
      <Text label="Source Text" value={config.text} onChange={(v) => updateConfig('text', v)} placeholder="{{$node.text}} or paste text…" multiline nodeId={nodeId} />
      <Text label="Fields to Extract" value={config.fields} onChange={(v) => updateConfig('fields', v)} placeholder="name, email, total amount" nodeId={nodeId} />
    </>
  );
}

function ClassifyPanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <Dropdown label="Model" value={config.model} fallback="deepseek/deepseek-v4-pro" onChange={(v) => updateConfig('model', v)} options={opt(MODELS_CHAT)} />
      <Text label="Text to Classify" value={config.text} onChange={(v) => updateConfig('text', v)} placeholder="{{$node.message}}" multiline nodeId={nodeId} />
      <Text label="Labels (comma-separated)" value={config.labels} onChange={(v) => updateConfig('labels', v)} placeholder="spam, support, sales, billing" nodeId={nodeId} />
    </>
  );
}

function SummarizePanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <Dropdown label="Model" value={config.model} fallback="deepseek/deepseek-v4-pro" onChange={(v) => updateConfig('model', v)} options={opt(MODELS_CHAT)} />
      <Text label="Text to Summarize" value={config.text} onChange={(v) => updateConfig('text', v)} placeholder="{{$node.article}} or paste text…" multiline nodeId={nodeId} />
      <Dropdown label="Style" value={config.style} fallback="concise" onChange={(v) => updateConfig('style', v)} options={[{ value: 'concise', label: 'Concise' }, { value: 'detailed', label: 'Detailed' }, { value: 'bullet points', label: 'Bullet points' }, { value: 'executive', label: 'Executive summary' }]} />
      <Text label="Max Words (optional)" value={config.maxWords} onChange={(v) => updateConfig('maxWords', v)} placeholder="150" nodeId={nodeId} />
    </>
  );
}

function TranslatePanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <Dropdown label="Model" value={config.model} fallback="deepseek/deepseek-v4-pro" onChange={(v) => updateConfig('model', v)} options={opt(MODELS_CHAT)} />
      <Text label="Text to Translate" value={config.text} onChange={(v) => updateConfig('text', v)} placeholder="{{$node.text}}" multiline nodeId={nodeId} />
      <Text label="Target Language" value={config.targetLanguage} onChange={(v) => updateConfig('targetLanguage', v)} placeholder="Spanish, French, Japanese…" nodeId={nodeId} />
    </>
  );
}

function SentimentPanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <Dropdown label="Model" value={config.model} fallback="deepseek/deepseek-v4-pro" onChange={(v) => updateConfig('model', v)} options={opt(MODELS_CHAT)} />
      <Text label="Text to Analyze" value={config.text} onChange={(v) => updateConfig('text', v)} placeholder="{{$node.review}} or paste text…" multiline nodeId={nodeId} />
    </>
  );
}

function GeneratePromptPanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <Dropdown label="Model" value={config.model} fallback="deepseek/deepseek-v4-pro" onChange={(v) => updateConfig('model', v)} options={opt(MODELS_CHAT)} />
      <Text label="Task Description" value={config.task} onChange={(v) => updateConfig('task', v)} placeholder="Classify support tickets by priority…" multiline nodeId={nodeId} />
    </>
  );
}

function ImprovePromptPanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <Dropdown label="Model" value={config.model} fallback="deepseek/deepseek-v4-pro" onChange={(v) => updateConfig('model', v)} options={opt(MODELS_CHAT)} />
      <Text label="Prompt to Improve" value={config.prompt} onChange={(v) => updateConfig('prompt', v)} placeholder="Paste an existing prompt to refine…" multiline nodeId={nodeId} />
    </>
  );
}

// ── Action → panel + canonical operation key ────────────────────────────────

const ACTIONS = {
  'Chat Completion':         { op: 'message',          Panel: ChatPanel },
  'Code Generation':         { op: 'code',             Panel: CodePanel },
  'Structured Output':       { op: 'structuredOutput', Panel: StructuredPanel },
  'Function Calling':        { op: 'functionCalling',  Panel: FunctionPanel },
  'Reasoning':               { op: 'reasoning',        Panel: ReasoningPanel },
  'Vision Analysis':         { op: 'analyzeImage',     Panel: VisionPanel },
  'Analyze Document':        { op: 'analyzeDocument',  Panel: DocumentPanel },
  'Extract Structured Data': { op: 'extractData',      Panel: ExtractPanel },
  'Classify':                { op: 'classify',         Panel: ClassifyPanel },
  'Summarize':               { op: 'summarize',        Panel: SummarizePanel },
  'Translate':               { op: 'translate',        Panel: TranslatePanel },
  'Sentiment Analysis':      { op: 'sentiment',        Panel: SentimentPanel },
  'Generate Prompt':         { op: 'generatePrompt',   Panel: GeneratePromptPanel },
  'Improve Prompt':          { op: 'improvePrompt',    Panel: ImprovePromptPanel },
};

const DEFAULT_ACTION = 'Chat Completion';

export default function OpenRouterNode({ config = {}, updateConfig, nodeId }) {
  const action = config.selectedAction && ACTIONS[config.selectedAction] ? config.selectedAction : DEFAULT_ACTION;
  const { op, Panel } = ACTIONS[action];

  useEffect(() => {
    if (config.operation !== op) updateConfig('operation', op);
  }, [op, config.operation]);

  return (
    <ConfigSection>
      <Panel config={config} updateConfig={updateConfig} nodeId={nodeId} />

      <ConfigDivider />

      <CredentialPicker
        value={config.credentialId || ''}
        onChange={(id) => updateConfig('credentialId', id)}
        accentColor="zinc"
        label="OpenRouter API Key"
        placeholder="Select OpenRouter credential…"
      />
    </ConfigSection>
  );
}
