import { useEffect } from 'react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';
import CredentialPicker from '@/components/ui/CredentialPicker';
import ModelSelect from '@/components/ui/ModelSelect';
import { ConfigSection, ConfigLabel, ConfigInput, ConfigSelect, ConfigDivider } from '@/components/ui/ConfigKit';

// Black & white only. The brand logo is the sole colored element.
const MONO = '#e5e5e5';

const MODELS = ['sonar', 'sonar-pro', 'sonar-reasoning', 'sonar-reasoning-pro', 'sonar-deep-research'];
const RECENCY = [
  { value: '', label: 'Any time' },
  { value: 'hour', label: 'Past hour' },
  { value: 'day', label: 'Past day' },
  { value: 'week', label: 'Past week' },
  { value: 'month', label: 'Past month' },
  { value: 'year', label: 'Past year' },
];

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

// Shared web-search controls — only rendered on search-backed actions.
function SearchControls({ config, updateConfig, nodeId }) {
  return (
    <>
      <Dropdown label="Recency" value={config.searchRecency} fallback="" onChange={(v) => updateConfig('searchRecency', v)} options={RECENCY} />
      <Text label="Limit to Domains (optional)" value={config.searchDomains} onChange={(v) => updateConfig('searchDomains', v)} placeholder="nature.com, arxiv.org" nodeId={nodeId} />
    </>
  );
}

// ── 15 per-action panels ────────────────────────────────────────────────────

function ChatPanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <ModelSelect provider="perplexity" credentialId={config.credentialId} value={config.model} fallback="sonar" onChange={(v) => updateConfig('model', v)} models={MODELS} accentColor={MONO} />
      <Text label="System Prompt" value={config.systemPrompt} onChange={(v) => updateConfig('systemPrompt', v)} placeholder="You are a helpful assistant…" multiline nodeId={nodeId} />
      <Text label="Prompt" value={config.prompt} onChange={(v) => updateConfig('prompt', v)} placeholder="Ask anything — answers are web-grounded…" multiline nodeId={nodeId} />
      <Dropdown label="Output Format" value={config.outputFormat} fallback="text" onChange={(v) => updateConfig('outputFormat', v)} options={[{ value: 'text', label: 'Raw Text' }, { value: 'json', label: 'Structured JSON' }]} />
      <SearchControls config={config} updateConfig={updateConfig} nodeId={nodeId} />
    </>
  );
}

function SearchPanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <ModelSelect provider="perplexity" credentialId={config.credentialId} value={config.model} fallback="sonar-pro" onChange={(v) => updateConfig('model', v)} models={MODELS} accentColor={MONO} />
      <Text label="Query" value={config.prompt} onChange={(v) => updateConfig('prompt', v)} placeholder="What are the latest findings on…?" multiline nodeId={nodeId} />
      <SearchControls config={config} updateConfig={updateConfig} nodeId={nodeId} />
    </>
  );
}

function StructuredPanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <ModelSelect provider="perplexity" credentialId={config.credentialId} value={config.model} fallback="sonar-pro" onChange={(v) => updateConfig('model', v)} models={MODELS} accentColor={MONO} />
      <Text label="Prompt" value={config.prompt} onChange={(v) => updateConfig('prompt', v)} placeholder="Extract the company's funding rounds…" multiline nodeId={nodeId} />
      <Text label="JSON Schema (optional)" value={config.jsonSchema} onChange={(v) => updateConfig('jsonSchema', v)} placeholder='{"type":"object","properties":{…}}' multiline nodeId={nodeId} />
      <SearchControls config={config} updateConfig={updateConfig} nodeId={nodeId} />
    </>
  );
}

function ReasoningPanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <ModelSelect provider="perplexity" credentialId={config.credentialId} value={config.model} fallback="sonar-reasoning-pro" onChange={(v) => updateConfig('model', v)} models={MODELS} accentColor={MONO} />
      <Text label="Prompt" value={config.prompt} onChange={(v) => updateConfig('prompt', v)} placeholder="Reason through this with current data…" multiline nodeId={nodeId} />
      <SearchControls config={config} updateConfig={updateConfig} nodeId={nodeId} />
    </>
  );
}

function DeepResearchPanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <ModelSelect provider="perplexity" credentialId={config.credentialId} value={config.model} fallback="sonar-deep-research" onChange={(v) => updateConfig('model', v)} models={MODELS} accentColor={MONO} />
      <Text label="Topic" value={config.prompt} onChange={(v) => updateConfig('prompt', v)} placeholder="A thorough report on the EV battery supply chain…" multiline nodeId={nodeId} />
      <Dropdown label="Reasoning Effort" value={config.reasoningEffort} fallback="medium" onChange={(v) => updateConfig('reasoningEffort', v)} options={[{ value: 'low', label: 'Low — faster' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High — deepest' }]} />
      <SearchControls config={config} updateConfig={updateConfig} nodeId={nodeId} />
    </>
  );
}

function FactCheckPanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <ModelSelect provider="perplexity" credentialId={config.credentialId} value={config.model} fallback="sonar-pro" onChange={(v) => updateConfig('model', v)} models={MODELS} accentColor={MONO} />
      <Text label="Claim to Verify" value={config.prompt} onChange={(v) => updateConfig('prompt', v)} placeholder="The Great Wall is visible from space." multiline nodeId={nodeId} />
      <SearchControls config={config} updateConfig={updateConfig} nodeId={nodeId} />
    </>
  );
}

function ComparePanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <ModelSelect provider="perplexity" credentialId={config.credentialId} value={config.model} fallback="sonar-pro" onChange={(v) => updateConfig('model', v)} models={MODELS} accentColor={MONO} />
      <Text label="Items to Compare" value={config.prompt} onChange={(v) => updateConfig('prompt', v)} placeholder="Compare Postgres vs MongoDB for analytics workloads" multiline nodeId={nodeId} />
      <SearchControls config={config} updateConfig={updateConfig} nodeId={nodeId} />
    </>
  );
}

function NewsDigestPanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <ModelSelect provider="perplexity" credentialId={config.credentialId} value={config.model} fallback="sonar" onChange={(v) => updateConfig('model', v)} models={MODELS} accentColor={MONO} />
      <Text label="Topic" value={config.prompt} onChange={(v) => updateConfig('prompt', v)} placeholder="AI regulation in the EU" multiline nodeId={nodeId} />
      <Dropdown label="Recency" value={config.searchRecency} fallback="week" onChange={(v) => updateConfig('searchRecency', v)} options={RECENCY} />
      <Text label="Limit to Domains (optional)" value={config.searchDomains} onChange={(v) => updateConfig('searchDomains', v)} placeholder="reuters.com, apnews.com" nodeId={nodeId} />
    </>
  );
}

function ExtractPanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <ModelSelect provider="perplexity" credentialId={config.credentialId} value={config.model} fallback="sonar-pro" onChange={(v) => updateConfig('model', v)} models={MODELS} accentColor={MONO} />
      <Text label="Source Text" value={config.prompt} onChange={(v) => updateConfig('prompt', v)} placeholder="{{$node.text}} or paste text to extract from…" multiline nodeId={nodeId} />
      <Text label="Fields to Extract" value={config.fields} onChange={(v) => updateConfig('fields', v)} placeholder="name, email, total amount" nodeId={nodeId} />
    </>
  );
}

function ClassifyPanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <ModelSelect provider="perplexity" credentialId={config.credentialId} value={config.model} fallback="sonar" onChange={(v) => updateConfig('model', v)} models={MODELS} accentColor={MONO} />
      <Text label="Text to Classify" value={config.prompt} onChange={(v) => updateConfig('prompt', v)} placeholder="{{$node.message}}" multiline nodeId={nodeId} />
      <Text label="Categories (comma-separated)" value={config.categories} onChange={(v) => updateConfig('categories', v)} placeholder="spam, support, sales, billing" nodeId={nodeId} />
    </>
  );
}

function SummarizePanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <ModelSelect provider="perplexity" credentialId={config.credentialId} value={config.model} fallback="sonar" onChange={(v) => updateConfig('model', v)} models={MODELS} accentColor={MONO} />
      <Text label="Text to Summarize" value={config.prompt} onChange={(v) => updateConfig('prompt', v)} placeholder="{{$node.article}} or paste text…" multiline nodeId={nodeId} />
      <Dropdown label="Style" value={config.summaryStyle} fallback="paragraph" onChange={(v) => updateConfig('summaryStyle', v)} options={[{ value: 'paragraph', label: 'Short paragraph' }, { value: 'bullets', label: 'Bullet points' }, { value: 'tweet', label: 'One sentence' }, { value: 'eli5', label: "Explain like I'm 5" }]} />
    </>
  );
}

function TranslatePanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <ModelSelect provider="perplexity" credentialId={config.credentialId} value={config.model} fallback="sonar" onChange={(v) => updateConfig('model', v)} models={MODELS} accentColor={MONO} />
      <Text label="Text to Translate" value={config.prompt} onChange={(v) => updateConfig('prompt', v)} placeholder="{{$node.text}}" multiline nodeId={nodeId} />
      <Text label="Target Language" value={config.targetLanguage} onChange={(v) => updateConfig('targetLanguage', v)} placeholder="Spanish, French, Japanese…" nodeId={nodeId} />
    </>
  );
}

function DocumentPanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <ModelSelect provider="perplexity" credentialId={config.credentialId} value={config.model} fallback="sonar-pro" onChange={(v) => updateConfig('model', v)} models={MODELS} accentColor={MONO} />
      <Text label="Question / Prompt" value={config.prompt} onChange={(v) => updateConfig('prompt', v)} placeholder="What are the key risks in this filing?" multiline nodeId={nodeId} />
      <Text label="Document Text (optional — falls back to input)" value={config.documentText} onChange={(v) => updateConfig('documentText', v)} placeholder="{{$node.content}} or leave blank to use previous node" multiline nodeId={nodeId} />
      <Dropdown label="Output Format" value={config.outputFormat} fallback="text" onChange={(v) => updateConfig('outputFormat', v)} options={[{ value: 'text', label: 'Raw Text' }, { value: 'json', label: 'Structured JSON' }]} />
    </>
  );
}

function GeneratePromptPanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <ModelSelect provider="perplexity" credentialId={config.credentialId} value={config.model} fallback="sonar" onChange={(v) => updateConfig('model', v)} models={MODELS} accentColor={MONO} />
      <Text label="Task Description" value={config.task} onChange={(v) => updateConfig('task', v)} placeholder="Classify support tickets by priority…" multiline nodeId={nodeId} />
    </>
  );
}

// ── Action → panel + canonical operation key ────────────────────────────────

const ACTIONS = {
  'Search-augmented Chat':   { op: 'message',          Panel: ChatPanel },
  'Web Search':              { op: 'search',           Panel: SearchPanel },
  'Cited Answer':            { op: 'askWithCitations', Panel: SearchPanel },
  'Structured Output':       { op: 'structuredOutput', Panel: StructuredPanel },
  'Reasoning':               { op: 'reasoning',        Panel: ReasoningPanel },
  'Deep Research':           { op: 'deepResearch',     Panel: DeepResearchPanel },
  'Fact Check':              { op: 'factCheck',        Panel: FactCheckPanel },
  'Compare':                 { op: 'compare',          Panel: ComparePanel },
  'News Digest':             { op: 'newsDigest',       Panel: NewsDigestPanel },
  'Extract Structured Data': { op: 'extractData',      Panel: ExtractPanel },
  'Classify':                { op: 'classify',         Panel: ClassifyPanel },
  'Summarize':               { op: 'summarize',        Panel: SummarizePanel },
  'Translate':               { op: 'translate',        Panel: TranslatePanel },
  'Analyze Document':        { op: 'analyzeDocument',  Panel: DocumentPanel },
  'Generate Prompt':         { op: 'generatePrompt',   Panel: GeneratePromptPanel },
};

const DEFAULT_ACTION = 'Search-augmented Chat';

export default function PerplexityNode({ config = {}, updateConfig, nodeId }) {
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
        label="Perplexity API Key"
        placeholder="Select Perplexity credential…"
      />
    </ConfigSection>
  );
}
