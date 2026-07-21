import { useEffect } from 'react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';
import CredentialPicker from '@/components/ui/CredentialPicker';
import ModelSelect from '@/components/ui/ModelSelect';
import { ConfigSection, ConfigLabel, ConfigInput, ConfigSelect, ConfigDivider } from '@/components/ui/ConfigKit';

// Black & white only. The brand logo is the sole colored element.
const MONO = '#e5e5e5';

const MODELS_CHAT = [
  'nvidia/nemotron-3-ultra-550b-a55b',
  'nvidia/nemotron-3-super-120b-a12b',
  'nvidia/nemotron-3-nano-30b-a3b',
  'nvidia/llama-3.1-nemotron-ultra-253b-v1',
  'nvidia/llama-3.3-nemotron-super-49b-v1',
  'meta/llama-4-maverick-17b-128e-instruct',
  'meta/llama-4-scout-17b-16e-instruct',
  'meta/llama-3.3-70b-instruct',
  'meta/llama-3.1-405b-instruct',
  'meta/llama-3.1-8b-instruct',
  'deepseek-ai/deepseek-v4-pro',
  'deepseek-ai/deepseek-v4-flash',
  'deepseek-ai/deepseek-r1',
  'qwen/qwen3.5-397b-a17b',
  'qwen/qwen3-max',
  'moonshotai/kimi-k2.6',
  'minimaxai/minimax-m2.7',
  'mistralai/mistral-large',
  'mistralai/mixtral-8x22b-instruct-v0.1',
  'microsoft/phi-4',
  'google/gemma-3-27b-it',
];
const MODELS_CODE = ['qwen/qwen3-coder-480b-a35b-instruct', 'nvidia/nemotron-3-super-120b-a12b', 'deepseek-ai/deepseek-v4-pro', 'meta/llama-4-maverick-17b-128e-instruct'];
const MODELS_VISION = ['meta/llama-4-maverick-17b-128e-instruct', 'meta/llama-4-scout-17b-16e-instruct', 'meta/llama-3.2-90b-vision-instruct', 'microsoft/phi-4-multimodal-instruct'];
const MODELS_EMBED = ['nvidia/llama-nemotron-embed-1b-v2', 'nvidia/nv-embedqa-e5-v5', 'nvidia/nv-embedqa-mistral-7b-v2', 'baai/bge-m3'];

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
      <ModelSelect provider="nvidia_nim" credentialId={config.credentialId} value={config.model} fallback="nvidia/nemotron-3-super-120b-a12b" onChange={(v) => updateConfig('model', v)} models={MODELS_CHAT} accentColor={MONO} />
      <Text label="System Prompt" value={config.systemPrompt} onChange={(v) => updateConfig('systemPrompt', v)} placeholder="You are a helpful assistant…" multiline nodeId={nodeId} />
      <Text label="Prompt" value={config.prompt} onChange={(v) => updateConfig('prompt', v)} placeholder="Ask anything…" multiline nodeId={nodeId} />
      <Dropdown label="Output Format" value={config.outputFormat} fallback="text" onChange={(v) => updateConfig('outputFormat', v)} options={[{ value: 'text', label: 'Raw Text' }, { value: 'json', label: 'Structured JSON' }]} />
    </>
  );
}

function CodePanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <ModelSelect provider="nvidia_nim" credentialId={config.credentialId} value={config.model} fallback="qwen/qwen3-coder-480b-a35b-instruct" onChange={(v) => updateConfig('model', v)} models={MODELS_CODE} accentColor={MONO} />
      <Text label="System Prompt" value={config.systemPrompt} onChange={(v) => updateConfig('systemPrompt', v)} placeholder="Optional coding guidance…" multiline nodeId={nodeId} />
      <Text label="Prompt" value={config.prompt} onChange={(v) => updateConfig('prompt', v)} placeholder="Write a debounce hook in TypeScript…" multiline nodeId={nodeId} />
    </>
  );
}

function StructuredPanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <ModelSelect provider="nvidia_nim" credentialId={config.credentialId} value={config.model} fallback="nvidia/nemotron-3-super-120b-a12b" onChange={(v) => updateConfig('model', v)} models={MODELS_CHAT} accentColor={MONO} />
      <Text label="Prompt" value={config.prompt} onChange={(v) => updateConfig('prompt', v)} placeholder="Extract the invoice fields…" multiline nodeId={nodeId} />
      <Text label="JSON Schema (embedded as a hint)" value={config.jsonSchema} onChange={(v) => updateConfig('jsonSchema', v)} placeholder='{"type":"object","properties":{…}}' multiline nodeId={nodeId} />
    </>
  );
}

function FunctionPanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <ModelSelect provider="nvidia_nim" credentialId={config.credentialId} value={config.model} fallback="nvidia/nemotron-3-super-120b-a12b" onChange={(v) => updateConfig('model', v)} models={MODELS_CHAT} accentColor={MONO} />
      <Text label="Prompt" value={config.prompt} onChange={(v) => updateConfig('prompt', v)} placeholder="What's the weather in Paris?" multiline nodeId={nodeId} />
      <Text label="Tools (JSON array)" value={config.tools} onChange={(v) => updateConfig('tools', v)} placeholder='[{"name":"get_weather","parameters":{…}}]' multiline nodeId={nodeId} />
    </>
  );
}

function ReasoningPanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <ModelSelect provider="nvidia_nim" credentialId={config.credentialId} value={config.model} fallback="nvidia/nemotron-3-super-120b-a12b" onChange={(v) => updateConfig('model', v)} models={MODELS_CHAT} accentColor={MONO} />
      <Text label="System Prompt" value={config.systemPrompt} onChange={(v) => updateConfig('systemPrompt', v)} placeholder="Optional guidance…" multiline nodeId={nodeId} />
      <Text label="Prompt" value={config.prompt} onChange={(v) => updateConfig('prompt', v)} placeholder="Reason step-by-step through this problem…" multiline nodeId={nodeId} />
    </>
  );
}

function VisionPanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <ModelSelect provider="nvidia_nim" credentialId={config.credentialId} value={config.model} fallback="meta/llama-4-maverick-17b-128e-instruct" onChange={(v) => updateConfig('model', v)} models={MODELS_VISION} accentColor={MONO} />
      <Text label="Image URL or Data URI" value={config.imageUrl} onChange={(v) => updateConfig('imageUrl', v)} placeholder="https://… or {{$node.image}}" nodeId={nodeId} />
      <Text label="Question" value={config.question} onChange={(v) => updateConfig('question', v)} placeholder="Describe this image in detail." multiline nodeId={nodeId} />
      <Dropdown label="Detail" value={config.detail} fallback="" onChange={(v) => updateConfig('detail', v)} options={[{ value: '', label: 'Default' }, { value: 'low', label: 'Low' }, { value: 'high', label: 'High' }]} />
    </>
  );
}

function EmbeddingPanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <ModelSelect provider="nvidia_nim" credentialId={config.credentialId} value={config.model} fallback="nvidia/llama-nemotron-embed-1b-v2" onChange={(v) => updateConfig('model', v)} models={MODELS_EMBED} accentColor={MONO} />
      <Text label="Text to Embed" value={config.input} onChange={(v) => updateConfig('input', v)} placeholder="{{$node.text}} or paste text…" multiline nodeId={nodeId} />
      <Dropdown label="Input Type" value={config.inputType} fallback="passage" onChange={(v) => updateConfig('inputType', v)} options={[{ value: 'passage', label: 'Passage — for documents to index' }, { value: 'query', label: 'Query — for search queries' }]} />
    </>
  );
}

function ImprovePromptPanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <ModelSelect provider="nvidia_nim" credentialId={config.credentialId} value={config.model} fallback="nvidia/nemotron-3-super-120b-a12b" onChange={(v) => updateConfig('model', v)} models={MODELS_CHAT} accentColor={MONO} />
      <Text label="Prompt to Improve" value={config.prompt} onChange={(v) => updateConfig('prompt', v)} placeholder="Paste an existing prompt to refine…" multiline nodeId={nodeId} />
    </>
  );
}

function ExtractPanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <ModelSelect provider="nvidia_nim" credentialId={config.credentialId} value={config.model} fallback="nvidia/nemotron-3-super-120b-a12b" onChange={(v) => updateConfig('model', v)} models={MODELS_CHAT} accentColor={MONO} />
      <Text label="Source Text" value={config.text} onChange={(v) => updateConfig('text', v)} placeholder="{{$node.text}} or paste text…" multiline nodeId={nodeId} />
      <Text label="Fields to Extract" value={config.fields} onChange={(v) => updateConfig('fields', v)} placeholder="name, email, total amount" nodeId={nodeId} />
    </>
  );
}

function ClassifyPanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <ModelSelect provider="nvidia_nim" credentialId={config.credentialId} value={config.model} fallback="nvidia/nemotron-3-super-120b-a12b" onChange={(v) => updateConfig('model', v)} models={MODELS_CHAT} accentColor={MONO} />
      <Text label="Text to Classify" value={config.text} onChange={(v) => updateConfig('text', v)} placeholder="{{$node.message}}" multiline nodeId={nodeId} />
      <Text label="Labels (comma-separated)" value={config.labels} onChange={(v) => updateConfig('labels', v)} placeholder="spam, support, sales, billing" nodeId={nodeId} />
    </>
  );
}

function SummarizePanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <ModelSelect provider="nvidia_nim" credentialId={config.credentialId} value={config.model} fallback="nvidia/nemotron-3-super-120b-a12b" onChange={(v) => updateConfig('model', v)} models={MODELS_CHAT} accentColor={MONO} />
      <Text label="Text to Summarize" value={config.text} onChange={(v) => updateConfig('text', v)} placeholder="{{$node.article}} or paste text…" multiline nodeId={nodeId} />
      <Dropdown label="Style" value={config.style} fallback="concise" onChange={(v) => updateConfig('style', v)} options={[{ value: 'concise', label: 'Concise' }, { value: 'detailed', label: 'Detailed' }, { value: 'bullet points', label: 'Bullet points' }, { value: 'executive', label: 'Executive summary' }]} />
      <Text label="Max Words (optional)" value={config.maxWords} onChange={(v) => updateConfig('maxWords', v)} placeholder="150" nodeId={nodeId} />
    </>
  );
}

function TranslatePanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <ModelSelect provider="nvidia_nim" credentialId={config.credentialId} value={config.model} fallback="nvidia/nemotron-3-super-120b-a12b" onChange={(v) => updateConfig('model', v)} models={MODELS_CHAT} accentColor={MONO} />
      <Text label="Text to Translate" value={config.text} onChange={(v) => updateConfig('text', v)} placeholder="{{$node.text}}" multiline nodeId={nodeId} />
      <Text label="Target Language" value={config.targetLanguage} onChange={(v) => updateConfig('targetLanguage', v)} placeholder="Spanish, French, Japanese…" nodeId={nodeId} />
    </>
  );
}

function SentimentPanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <ModelSelect provider="nvidia_nim" credentialId={config.credentialId} value={config.model} fallback="nvidia/nemotron-3-super-120b-a12b" onChange={(v) => updateConfig('model', v)} models={MODELS_CHAT} accentColor={MONO} />
      <Text label="Text to Analyze" value={config.text} onChange={(v) => updateConfig('text', v)} placeholder="{{$node.review}} or paste text…" multiline nodeId={nodeId} />
    </>
  );
}

function GeneratePromptPanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <ModelSelect provider="nvidia_nim" credentialId={config.credentialId} value={config.model} fallback="nvidia/nemotron-3-super-120b-a12b" onChange={(v) => updateConfig('model', v)} models={MODELS_CHAT} accentColor={MONO} />
      <Text label="Task Description" value={config.task} onChange={(v) => updateConfig('task', v)} placeholder="Classify support tickets by priority…" multiline nodeId={nodeId} />
    </>
  );
}

// ── Action → panel + canonical operation key ────────────────────────────────

const ACTIONS = {
  'Chat Completion':         { op: 'message', desc: "Query an NVIDIA-hosted model for a response",          Panel: ChatPanel },
  'Code Generation':         { op: 'code', desc: "Generate or explain code with Qwen Coder",             Panel: CodePanel },
  'Structured Output':       { op: 'structuredOutput', desc: "Return JSON matching a schema", Panel: StructuredPanel },
  'Function Calling':        { op: 'functionCalling', desc: "Let the model call your tools/functions",  Panel: FunctionPanel },
  'Reasoning':               { op: 'reasoning', desc: "Step-through reasoning with Nemotron",        Panel: ReasoningPanel },
  'Vision Analysis':         { op: 'analyzeImage', desc: "Describe or answer questions about an image",     Panel: VisionPanel },
  'Create Embedding':        { op: 'embeddings', desc: "Embed text with NeMo Retriever models",       Panel: EmbeddingPanel },
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

export default function NvidiaNimNode({ config = {}, updateConfig, nodeId }) {
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
        label="NVIDIA NIM API Key"
        placeholder="Select NVIDIA NIM credential…"
      />
    </ConfigSection>
  );
}
