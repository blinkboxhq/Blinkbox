import { useEffect } from 'react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';
import CredentialPicker from '@/components/ui/CredentialPicker';
import { ConfigSection, ConfigLabel, ConfigInput, ConfigSelect, ConfigDivider } from '@/components/ui/ConfigKit';

// Black & white only. The brand logo is the sole colored element.
const MONO = '#e5e5e5';

const MODELS_CHAT     = ['claude-fable-5', 'claude-opus-4-8', 'claude-sonnet-4-6', 'claude-haiku-4-5', 'claude-3-5-sonnet-latest'];
const MODELS_THINKING = ['claude-fable-5', 'claude-opus-4-8', 'claude-sonnet-4-6'];
const MODELS_VISION   = ['claude-fable-5', 'claude-opus-4-8', 'claude-sonnet-4-6', 'claude-haiku-4-5'];

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

// ── 21 per-action panels ────────────────────────────────────────────────────

function ChatPanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <Dropdown label="Model" value={config.model} fallback="claude-sonnet-4-6" onChange={(v) => updateConfig('model', v)} options={opt(MODELS_CHAT)} />
      <Text label="System Prompt" value={config.systemPrompt} onChange={(v) => updateConfig('systemPrompt', v)} placeholder="You are a helpful assistant…" multiline nodeId={nodeId} />
      <Text label="Prompt" value={config.prompt} onChange={(v) => updateConfig('prompt', v)} placeholder="Summarize the following data…" multiline nodeId={nodeId} />
      <Dropdown label="Output Format" value={config.outputFormat} fallback="text" onChange={(v) => updateConfig('outputFormat', v)} options={[{ value: 'text', label: 'Raw Text' }, { value: 'json', label: 'Structured JSON' }]} />
      <ConfigInput label="Max Tokens" type="number" value={config.maxTokens ?? '2000'} onChange={(v) => updateConfig('maxTokens', v)} placeholder="2000" />
    </>
  );
}

function MultiTurnPanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <Dropdown label="Model" value={config.model} fallback="claude-sonnet-4-6" onChange={(v) => updateConfig('model', v)} options={opt(MODELS_CHAT)} />
      <Text label="System Prompt" value={config.systemPrompt} onChange={(v) => updateConfig('systemPrompt', v)} placeholder="Persona / rules for the whole conversation…" multiline nodeId={nodeId} />
      <Text label="Messages (JSON array)" value={config.messages} onChange={(v) => updateConfig('messages', v)} placeholder='[{"role":"user","content":"Hi"},{"role":"assistant","content":"Hello"}]' multiline nodeId={nodeId} />
    </>
  );
}

function StructuredPanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <Dropdown label="Model" value={config.model} fallback="claude-sonnet-4-6" onChange={(v) => updateConfig('model', v)} options={opt(MODELS_CHAT)} />
      <Text label="Prompt" value={config.prompt} onChange={(v) => updateConfig('prompt', v)} placeholder="Extract the invoice fields…" multiline nodeId={nodeId} />
      <Text label="JSON Schema" value={config.jsonSchema} onChange={(v) => updateConfig('jsonSchema', v)} placeholder='{"type":"object","properties":{…}}' multiline nodeId={nodeId} />
    </>
  );
}

function ToolUsePanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <Dropdown label="Model" value={config.model} fallback="claude-sonnet-4-6" onChange={(v) => updateConfig('model', v)} options={opt(MODELS_CHAT)} />
      <Text label="Prompt" value={config.prompt} onChange={(v) => updateConfig('prompt', v)} placeholder="What's the weather in Paris?" multiline nodeId={nodeId} />
      <Text label="Tools (JSON array)" value={config.tools} onChange={(v) => updateConfig('tools', v)} placeholder='[{"name":"get_weather","description":"…","input_schema":{…}}]' multiline nodeId={nodeId} />
      <Dropdown label="Tool Choice" value={config.toolChoice} fallback="auto" onChange={(v) => updateConfig('toolChoice', v)} options={[{ value: 'auto', label: 'Auto' }, { value: 'any', label: 'Any tool' }, { value: 'none', label: 'None' }]} />
    </>
  );
}

function ThinkingPanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <Dropdown label="Model" value={config.model} fallback="claude-opus-4-8" onChange={(v) => updateConfig('model', v)} options={opt(MODELS_THINKING)} />
      <Text label="Prompt" value={config.prompt} onChange={(v) => updateConfig('prompt', v)} placeholder="Solve this step by step…" multiline nodeId={nodeId} />
      <ConfigInput label="Thinking Budget (tokens)" type="number" value={config.thinkingBudget ?? '10000'} onChange={(v) => updateConfig('thinkingBudget', v)} placeholder="10000" />
      <ConfigInput label="Max Tokens" type="number" value={config.maxTokens ?? '16000'} onChange={(v) => updateConfig('maxTokens', v)} placeholder="16000" />
    </>
  );
}

function VisionPanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <Dropdown label="Model" value={config.model} fallback="claude-sonnet-4-6" onChange={(v) => updateConfig('model', v)} options={opt(MODELS_VISION)} />
      <Text label="Image URL" value={config.imageUrl} onChange={(v) => updateConfig('imageUrl', v)} placeholder="https://… or {{$node.imageUrl}}" nodeId={nodeId} />
      <Text label="Question" value={config.prompt} onChange={(v) => updateConfig('prompt', v)} placeholder="Describe this image in detail." multiline nodeId={nodeId} />
    </>
  );
}

function DocumentPanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <Dropdown label="Model" value={config.model} fallback="claude-sonnet-4-6" onChange={(v) => updateConfig('model', v)} options={opt(MODELS_CHAT)} />
      <Text label="Question / Prompt" value={config.prompt} onChange={(v) => updateConfig('prompt', v)} placeholder="What are the key obligations in this contract?" multiline nodeId={nodeId} />
      <Text label="Document Text (optional — falls back to input)" value={config.documentText} onChange={(v) => updateConfig('documentText', v)} placeholder="{{$node.content}} or leave blank to use previous node" multiline nodeId={nodeId} />
    </>
  );
}

function PdfPanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <Dropdown label="Model" value={config.model} fallback="claude-sonnet-4-6" onChange={(v) => updateConfig('model', v)} options={opt(MODELS_VISION)} />
      <Text label="PDF URL" value={config.fileInput} onChange={(v) => updateConfig('fileInput', v)} placeholder="https://… .pdf or {{$node.fileUrl}}" nodeId={nodeId} />
      <Text label="Question" value={config.prompt} onChange={(v) => updateConfig('prompt', v)} placeholder="Summarize this PDF and list action items." multiline nodeId={nodeId} />
    </>
  );
}

function CitationsPanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <Dropdown label="Model" value={config.model} fallback="claude-sonnet-4-6" onChange={(v) => updateConfig('model', v)} options={opt(MODELS_CHAT)} />
      <Text label="Source Document" value={config.document} onChange={(v) => updateConfig('document', v)} placeholder="Paste the document text to cite from…" multiline nodeId={nodeId} />
      <Text label="Question" value={config.prompt} onChange={(v) => updateConfig('prompt', v)} placeholder="What does the document say about refunds?" multiline nodeId={nodeId} />
    </>
  );
}

function ExtractPanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <Dropdown label="Model" value={config.model} fallback="claude-sonnet-4-6" onChange={(v) => updateConfig('model', v)} options={opt(MODELS_CHAT)} />
      <Text label="What to Extract" value={config.prompt} onChange={(v) => updateConfig('prompt', v)} placeholder="Extract name, email, and total amount…" multiline nodeId={nodeId} />
      <Text label="Source Text (optional)" value={config.documentText} onChange={(v) => updateConfig('documentText', v)} placeholder="{{$node.text}} or leave blank to use input" multiline nodeId={nodeId} />
    </>
  );
}

function ClassifyPanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <Dropdown label="Model" value={config.model} fallback="claude-haiku-4-5" onChange={(v) => updateConfig('model', v)} options={opt(MODELS_CHAT)} />
      <Text label="Text to Classify" value={config.prompt} onChange={(v) => updateConfig('prompt', v)} placeholder="{{$node.message}}" multiline nodeId={nodeId} />
      <Text label="Labels (comma-separated)" value={config.labels} onChange={(v) => updateConfig('labels', v)} placeholder="spam, support, sales, billing" nodeId={nodeId} />
    </>
  );
}

function SummarizePanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <Dropdown label="Model" value={config.model} fallback="claude-sonnet-4-6" onChange={(v) => updateConfig('model', v)} options={opt(MODELS_CHAT)} />
      <Text label="Text to Summarize" value={config.prompt} onChange={(v) => updateConfig('prompt', v)} placeholder="{{$node.article}} or paste text…" multiline nodeId={nodeId} />
      <Dropdown label="Length" value={config.length} fallback="medium" onChange={(v) => updateConfig('length', v)} options={[{ value: 'short', label: 'Short — a sentence or two' }, { value: 'medium', label: 'Medium — a paragraph' }, { value: 'long', label: 'Long — detailed' }, { value: 'bullets', label: 'Bullet points' }]} />
    </>
  );
}

function TranslatePanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <Dropdown label="Model" value={config.model} fallback="claude-sonnet-4-6" onChange={(v) => updateConfig('model', v)} options={opt(MODELS_CHAT)} />
      <Text label="Text to Translate" value={config.prompt} onChange={(v) => updateConfig('prompt', v)} placeholder="{{$node.text}}" multiline nodeId={nodeId} />
      <Text label="Target Language" value={config.targetLanguage} onChange={(v) => updateConfig('targetLanguage', v)} placeholder="Spanish, French, Japanese…" nodeId={nodeId} />
    </>
  );
}

function SentimentPanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <Dropdown label="Model" value={config.model} fallback="claude-haiku-4-5" onChange={(v) => updateConfig('model', v)} options={opt(MODELS_CHAT)} />
      <Text label="Text to Analyze" value={config.prompt} onChange={(v) => updateConfig('prompt', v)} placeholder="{{$node.review}}" multiline nodeId={nodeId} />
    </>
  );
}

function ModeratePanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <Dropdown label="Model" value={config.model} fallback="claude-haiku-4-5" onChange={(v) => updateConfig('model', v)} options={opt(MODELS_CHAT)} />
      <Text label="Text to Moderate" value={config.prompt} onChange={(v) => updateConfig('prompt', v)} placeholder="{{$node.text}} or paste text directly…" multiline nodeId={nodeId} />
    </>
  );
}

function CodeReviewPanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <Dropdown label="Model" value={config.model} fallback="claude-sonnet-4-6" onChange={(v) => updateConfig('model', v)} options={opt(MODELS_CHAT)} />
      <Text label="Code" value={config.code} onChange={(v) => updateConfig('code', v)} placeholder="{{$node.diff}} or paste code…" multiline nodeId={nodeId} />
      <Text label="Focus (optional)" value={config.focus} onChange={(v) => updateConfig('focus', v)} placeholder="security and performance" nodeId={nodeId} />
    </>
  );
}

function GeneratePromptPanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <Dropdown label="Model" value={config.model} fallback="claude-sonnet-4-6" onChange={(v) => updateConfig('model', v)} options={opt(MODELS_CHAT)} />
      <Text label="Task Description" value={config.task} onChange={(v) => updateConfig('task', v)} placeholder="Classify support tickets by priority…" multiline nodeId={nodeId} />
    </>
  );
}

function ImprovePromptPanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <Dropdown label="Model" value={config.model} fallback="claude-sonnet-4-6" onChange={(v) => updateConfig('model', v)} options={opt(MODELS_CHAT)} />
      <Text label="Prompt to Improve" value={config.prompt} onChange={(v) => updateConfig('prompt', v)} placeholder="Paste the existing prompt here…" multiline nodeId={nodeId} />
    </>
  );
}

function CachingPanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <Dropdown label="Model" value={config.model} fallback="claude-sonnet-4-6" onChange={(v) => updateConfig('model', v)} options={opt(MODELS_CHAT)} />
      <Text label="Cached Context (large, reused)" value={config.context} onChange={(v) => updateConfig('context', v)} placeholder="A big document or knowledge base to cache…" multiline nodeId={nodeId} />
      <Text label="Prompt (changes per call)" value={config.prompt} onChange={(v) => updateConfig('prompt', v)} placeholder="Ask a question about the cached context…" multiline nodeId={nodeId} />
    </>
  );
}

function CountTokensPanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <Dropdown label="Model" value={config.model} fallback="claude-sonnet-4-6" onChange={(v) => updateConfig('model', v)} options={opt(MODELS_CHAT)} />
      <Text label="Text" value={config.prompt} onChange={(v) => updateConfig('prompt', v)} placeholder="{{$node.text}} or paste text to count…" multiline nodeId={nodeId} />
    </>
  );
}

function ListModelsPanel() {
  return (
    <div className="text-[11px] text-neutral-500 font-mono leading-relaxed px-1 py-2">
      Fetches the live list of Claude models available to the selected API key. No parameters needed.
    </div>
  );
}

// ── Action → panel + canonical operation key ────────────────────────────────

const ACTIONS = {
  'Chat Completion':         { op: 'message',          Panel: ChatPanel },
  'Multi-turn Conversation': { op: 'multiTurn',        Panel: MultiTurnPanel },
  'Structured Output':       { op: 'structuredOutput', Panel: StructuredPanel },
  'Tool Use':                { op: 'functionCalling',  Panel: ToolUsePanel },
  'Extended Thinking':       { op: 'extendedThinking', Panel: ThinkingPanel },
  'Vision Analysis':         { op: 'analyzeImage',     Panel: VisionPanel },
  'Analyze Document':        { op: 'analyzeDocument',  Panel: DocumentPanel },
  'Analyze PDF':             { op: 'analyzePdf',       Panel: PdfPanel },
  'Cited Answer':            { op: 'citations',        Panel: CitationsPanel },
  'Extract Structured Data': { op: 'extractData',      Panel: ExtractPanel },
  'Classify':                { op: 'classify',         Panel: ClassifyPanel },
  'Summarize':               { op: 'summarize',        Panel: SummarizePanel },
  'Translate':               { op: 'translate',        Panel: TranslatePanel },
  'Sentiment Analysis':      { op: 'sentiment',        Panel: SentimentPanel },
  'Moderate Content':        { op: 'moderateContent',  Panel: ModeratePanel },
  'Code Review':             { op: 'codeReview',       Panel: CodeReviewPanel },
  'Generate Prompt':         { op: 'generatePrompt',   Panel: GeneratePromptPanel },
  'Improve Prompt':          { op: 'improvePrompt',    Panel: ImprovePromptPanel },
  'Prompt Caching':          { op: 'promptCaching',    Panel: CachingPanel },
  'Count Tokens':            { op: 'countTokens',      Panel: CountTokensPanel },
  'List Models':             { op: 'listModels',       Panel: ListModelsPanel },
};

const DEFAULT_ACTION = 'Chat Completion';

export default function AnthropicNode({ config = {}, updateConfig, nodeId }) {
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
        label="Anthropic API Key"
        placeholder="Select Anthropic credential…"
      />
    </ConfigSection>
  );
}
