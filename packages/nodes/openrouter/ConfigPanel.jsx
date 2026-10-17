import { useEffect } from 'react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';
import CredentialPicker from '@/components/ui/CredentialPicker';
import ModelSelect from '@/components/ui/ModelSelect';
import { ConfigSection, ConfigLabel, ConfigSelect, ConfigDivider } from '@/components/ui/ConfigKit';

// Black & white only. The brand logo is the sole colored element.
const MONO = '#e5e5e5';

// OpenRouter routes to 300+ models behind one key — ids are "vendor/model".
const MODELS_CHAT = [
  'anthropic/claude-sonnet-5.5',
  'anthropic/claude-opus-5.5',
  'anthropic/claude-haiku-5.5',
  'anthropic/claude-fable-5.1',
  'openai/gpt-6.1-sol',
  'openai/gpt-6-astra',
  'openai/gpt-6-luna',
  'google/gemini-3.8-flash',
  'google/gemini-4-argon',
  'x-ai/grok-4.7',
  'deepseek/deepseek-v4-pro',
  'deepseek/deepseek-v4.1-flash',
  'deepseek/deepseek-r1',
  'qwen/qwen3.8-max-prime',
  'qwen/qwen3.5-397b-a17b',
  'z-ai/glm-5.3',
  'minimax/minimax-m3',
  'moonshotai/kimi-k3',
  'mistralai/mistral-large-4-0',
  'meta-llama/llama-4-maverick',
  'nvidia/nemotron-3-ultra-550b-a55b',
  'cohere/command-a',
];
const MODELS_CODE = ['qwen/qwen3-coder', 'anthropic/claude-sonnet-5.5', 'openai/gpt-6.1-sol', 'deepseek/deepseek-v4-pro', 'z-ai/glm-5.3', 'mistralai/devstral-2512'];
const MODELS_REASON = ['deepseek/deepseek-r1', 'deepseek/deepseek-v4-pro', 'openai/gpt-6-astra', 'anthropic/claude-opus-5.5', 'google/gemini-4-argon', 'x-ai/grok-4.7', 'qwen/qwen3.8-max-prime'];
const MODELS_VISION = ['openai/gpt-6.1-sol', 'google/gemini-4-argon', 'anthropic/claude-sonnet-5.5', 'z-ai/glm-4.6v', 'qwen/qwen3-vl-235b-a22b-instruct', 'meta-llama/llama-4-maverick'];

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
      <ModelSelect provider="openrouter" credentialId={config.credentialId} value={config.model} fallback="deepseek/deepseek-v4-pro" onChange={(v) => updateConfig('model', v)} models={MODELS_CHAT} accentColor={MONO} />
      <Text label="System Prompt" value={config.systemPrompt} onChange={(v) => updateConfig('systemPrompt', v)} placeholder="You are a helpful assistant…" multiline nodeId={nodeId} />
      <Text label="Prompt" value={config.prompt} onChange={(v) => updateConfig('prompt', v)} placeholder="Ask any model anything…" multiline nodeId={nodeId} />
      <Dropdown label="Output Format" value={config.outputFormat} fallback="text" onChange={(v) => updateConfig('outputFormat', v)} options={[{ value: 'text', label: 'Raw Text' }, { value: 'json', label: 'Structured JSON' }]} />
    </>
  );
}

function CodePanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <ModelSelect provider="openrouter" credentialId={config.credentialId} value={config.model} fallback="qwen/qwen3-coder" onChange={(v) => updateConfig('model', v)} models={MODELS_CODE} accentColor={MONO} />
      <Text label="System Prompt" value={config.systemPrompt} onChange={(v) => updateConfig('systemPrompt', v)} placeholder="Optional coding guidance…" multiline nodeId={nodeId} />
      <Text label="Prompt" value={config.prompt} onChange={(v) => updateConfig('prompt', v)} placeholder="Write a debounce hook in TypeScript…" multiline nodeId={nodeId} />
    </>
  );
}

function StructuredPanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <ModelSelect provider="openrouter" credentialId={config.credentialId} value={config.model} fallback="deepseek/deepseek-v4-pro" onChange={(v) => updateConfig('model', v)} models={MODELS_CHAT} accentColor={MONO} />
      <Text label="Prompt" value={config.prompt} onChange={(v) => updateConfig('prompt', v)} placeholder="Extract the invoice fields…" multiline nodeId={nodeId} />
      <Text label="JSON Schema (embedded as a hint)" value={config.jsonSchema} onChange={(v) => updateConfig('jsonSchema', v)} placeholder='{"type":"object","properties":{…}}' multiline nodeId={nodeId} />
    </>
  );
}

function FunctionPanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <ModelSelect provider="openrouter" credentialId={config.credentialId} value={config.model} fallback="deepseek/deepseek-v4-pro" onChange={(v) => updateConfig('model', v)} models={MODELS_CHAT} accentColor={MONO} />
      <Text label="Prompt" value={config.prompt} onChange={(v) => updateConfig('prompt', v)} placeholder="What's the weather in Paris?" multiline nodeId={nodeId} />
      <Text label="Tools (JSON array)" value={config.tools} onChange={(v) => updateConfig('tools', v)} placeholder='[{"name":"get_weather","parameters":{…}}]' multiline nodeId={nodeId} />
    </>
  );
}

function ReasoningPanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <ModelSelect provider="openrouter" credentialId={config.credentialId} value={config.model} fallback="deepseek/deepseek-r1" onChange={(v) => updateConfig('model', v)} models={MODELS_REASON} accentColor={MONO} />
      <Text label="System Prompt" value={config.systemPrompt} onChange={(v) => updateConfig('systemPrompt', v)} placeholder="Optional guidance…" multiline nodeId={nodeId} />
      <Text label="Prompt" value={config.prompt} onChange={(v) => updateConfig('prompt', v)} placeholder="Reason step-by-step through this problem…" multiline nodeId={nodeId} />
    </>
  );
}

function VisionPanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <ModelSelect provider="openrouter" credentialId={config.credentialId} value={config.model} fallback="openai/gpt-5.6" onChange={(v) => updateConfig('model', v)} models={MODELS_VISION} accentColor={MONO} />
      <Text label="Image URL or Data URI" value={config.imageUrl} onChange={(v) => updateConfig('imageUrl', v)} placeholder="https://… or {{$node.image}}" nodeId={nodeId} />
      <Text label="Question" value={config.question} onChange={(v) => updateConfig('question', v)} placeholder="Describe this image in detail." multiline nodeId={nodeId} />
      <Dropdown label="Detail" value={config.detail} fallback="" onChange={(v) => updateConfig('detail', v)} options={[{ value: '', label: 'Default' }, { value: 'low', label: 'Low' }, { value: 'high', label: 'High' }]} />
    </>
  );
}

function DocumentPanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <ModelSelect provider="openrouter" credentialId={config.credentialId} value={config.model} fallback="deepseek/deepseek-v4-pro" onChange={(v) => updateConfig('model', v)} models={MODELS_CHAT} accentColor={MONO} />
      <Text label="Question / Prompt" value={config.prompt} onChange={(v) => updateConfig('prompt', v)} placeholder="What are the key risks in this document?" multiline nodeId={nodeId} />
      <Text label="Document Text (optional — long-context models)" value={config.documentText} onChange={(v) => updateConfig('documentText', v)} placeholder="{{$node.content}} or leave blank" multiline nodeId={nodeId} />
    </>
  );
}

function ExtractPanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <ModelSelect provider="openrouter" credentialId={config.credentialId} value={config.model} fallback="deepseek/deepseek-v4-pro" onChange={(v) => updateConfig('model', v)} models={MODELS_CHAT} accentColor={MONO} />
      <Text label="Source Text" value={config.text} onChange={(v) => updateConfig('text', v)} placeholder="{{$node.text}} or paste text…" multiline nodeId={nodeId} />
      <Text label="Fields to Extract" value={config.fields} onChange={(v) => updateConfig('fields', v)} placeholder="name, email, total amount" nodeId={nodeId} />
    </>
  );
}

function ClassifyPanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <ModelSelect provider="openrouter" credentialId={config.credentialId} value={config.model} fallback="deepseek/deepseek-v4-pro" onChange={(v) => updateConfig('model', v)} models={MODELS_CHAT} accentColor={MONO} />
      <Text label="Text to Classify" value={config.text} onChange={(v) => updateConfig('text', v)} placeholder="{{$node.message}}" multiline nodeId={nodeId} />
      <Text label="Labels (comma-separated)" value={config.labels} onChange={(v) => updateConfig('labels', v)} placeholder="spam, support, sales, billing" nodeId={nodeId} />
    </>
  );
}

function SummarizePanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <ModelSelect provider="openrouter" credentialId={config.credentialId} value={config.model} fallback="deepseek/deepseek-v4-pro" onChange={(v) => updateConfig('model', v)} models={MODELS_CHAT} accentColor={MONO} />
      <Text label="Text to Summarize" value={config.text} onChange={(v) => updateConfig('text', v)} placeholder="{{$node.article}} or paste text…" multiline nodeId={nodeId} />
      <Dropdown label="Style" value={config.style} fallback="concise" onChange={(v) => updateConfig('style', v)} options={[{ value: 'concise', label: 'Concise' }, { value: 'detailed', label: 'Detailed' }, { value: 'bullet points', label: 'Bullet points' }, { value: 'executive', label: 'Executive summary' }]} />
      <Text label="Max Words (optional)" value={config.maxWords} onChange={(v) => updateConfig('maxWords', v)} placeholder="150" nodeId={nodeId} />
    </>
  );
}

function TranslatePanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <ModelSelect provider="openrouter" credentialId={config.credentialId} value={config.model} fallback="deepseek/deepseek-v4-pro" onChange={(v) => updateConfig('model', v)} models={MODELS_CHAT} accentColor={MONO} />
      <Text label="Text to Translate" value={config.text} onChange={(v) => updateConfig('text', v)} placeholder="{{$node.text}}" multiline nodeId={nodeId} />
      <Text label="Target Language" value={config.targetLanguage} onChange={(v) => updateConfig('targetLanguage', v)} placeholder="Spanish, French, Japanese…" nodeId={nodeId} />
    </>
  );
}

function SentimentPanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <ModelSelect provider="openrouter" credentialId={config.credentialId} value={config.model} fallback="deepseek/deepseek-v4-pro" onChange={(v) => updateConfig('model', v)} models={MODELS_CHAT} accentColor={MONO} />
      <Text label="Text to Analyze" value={config.text} onChange={(v) => updateConfig('text', v)} placeholder="{{$node.review}} or paste text…" multiline nodeId={nodeId} />
    </>
  );
}

function GeneratePromptPanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <ModelSelect provider="openrouter" credentialId={config.credentialId} value={config.model} fallback="deepseek/deepseek-v4-pro" onChange={(v) => updateConfig('model', v)} models={MODELS_CHAT} accentColor={MONO} />
      <Text label="Task Description" value={config.task} onChange={(v) => updateConfig('task', v)} placeholder="Classify support tickets by priority…" multiline nodeId={nodeId} />
    </>
  );
}

function ImprovePromptPanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <ModelSelect provider="openrouter" credentialId={config.credentialId} value={config.model} fallback="deepseek/deepseek-v4-pro" onChange={(v) => updateConfig('model', v)} models={MODELS_CHAT} accentColor={MONO} />
      <Text label="Prompt to Improve" value={config.prompt} onChange={(v) => updateConfig('prompt', v)} placeholder="Paste an existing prompt to refine…" multiline nodeId={nodeId} />
    </>
  );
}

// ── Action → panel + canonical operation key ────────────────────────────────

const ACTIONS = {
  'Chat Completion':         { op: 'message', desc: "Query any OpenRouter model for a response",          Panel: ChatPanel },
  'Code Generation':         { op: 'code', desc: "Generate or explain code with a coding model",             Panel: CodePanel },
  'Structured Output':       { op: 'structuredOutput', desc: "Return JSON matching a schema", Panel: StructuredPanel },
  'Function Calling':        { op: 'functionCalling', desc: "Let the model call your tools/functions",  Panel: FunctionPanel },
  'Reasoning':               { op: 'reasoning', desc: "Route to a reasoning model for hard problems",        Panel: ReasoningPanel },
  'Vision Analysis':         { op: 'analyzeImage', desc: "Describe or answer questions about an image",     Panel: VisionPanel },
  'Analyze Document':        { op: 'analyzeDocument', desc: "Answer questions about a long document",  Panel: DocumentPanel },
  'Extract Structured Data': { op: 'extractData', desc: "Pull named fields out of source text",      Panel: ExtractPanel },
  'Classify':                { op: 'classify', desc: "Label text into one of your categories",         Panel: ClassifyPanel },
  'Summarize':               { op: 'summarize', desc: "Condense text in a chosen style",        Panel: SummarizePanel },
  'Translate':               { op: 'translate', desc: "Translate text into a target language",        Panel: TranslatePanel },
  'Sentiment Analysis':      { op: 'sentiment', desc: "Score sentiment and extract key phrases",        Panel: SentimentPanel },
  'Generate Prompt':         { op: 'generatePrompt', desc: "Draft an optimized prompt from a task",   Panel: GeneratePromptPanel },
  'Improve Prompt':          { op: 'improvePrompt', desc: "Rewrite an existing prompt to be sharper",    Panel: ImprovePromptPanel },
};

// Single source of truth for the action picker — it can only offer what
// this panel knows how to render.
export const OPERATIONS = Object.entries(ACTIONS).map(([label, a]) => ({
  value: a.op, label, desc: a.desc, icon: a.icon,
}));


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
        accentColor="blue"
        label="OpenRouter API Key"
        placeholder="Select OpenRouter credential…"
      />
    </ConfigSection>
  );
}
