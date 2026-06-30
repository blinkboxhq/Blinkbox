import { useEffect } from 'react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';
import CredentialPicker from '@/components/ui/CredentialPicker';
import { ConfigSection, ConfigLabel, ConfigInput, ConfigSelect, ConfigDivider } from '@/components/ui/ConfigKit';

// Black & white only. The brand logo is the sole colored element.
const MONO = '#e5e5e5';

const MODELS_FLASH = ['gemini-3.5-flash', 'gemini-3.1-pro-preview', 'gemini-3.1-flash', 'gemini-2.5-flash'];
const MODELS_PRO   = ['gemini-3.1-pro-preview', 'gemini-3.5-flash'];
const MODELS_IMAGE = ['gemini-3.1-flash-image'];
const MODELS_EMBED = ['gemini-embedding-001'];

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

// ── 18 per-action panels ────────────────────────────────────────────────────

function ChatPanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <Dropdown label="Model" value={config.model} fallback="gemini-3.5-flash" onChange={(v) => updateConfig('model', v)} options={opt(MODELS_FLASH)} />
      <Text label="System Prompt" value={config.systemPrompt} onChange={(v) => updateConfig('systemPrompt', v)} placeholder="You are a helpful assistant…" multiline nodeId={nodeId} />
      <Text label="Prompt" value={config.prompt} onChange={(v) => updateConfig('prompt', v)} placeholder="Summarize the following data…" multiline nodeId={nodeId} />
      <Dropdown label="Output Format" value={config.outputFormat} fallback="text" onChange={(v) => updateConfig('outputFormat', v)} options={[{ value: 'text', label: 'Raw Text' }, { value: 'json', label: 'Structured JSON' }]} />
      <ConfigInput label="Max Tokens" type="number" value={config.maxTokens ?? '2000'} onChange={(v) => updateConfig('maxTokens', v)} placeholder="2000" />
    </>
  );
}

function StructuredPanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <Dropdown label="Model" value={config.model} fallback="gemini-3.5-flash" onChange={(v) => updateConfig('model', v)} options={opt(MODELS_FLASH)} />
      <Text label="Prompt" value={config.prompt} onChange={(v) => updateConfig('prompt', v)} placeholder="Extract the invoice fields…" multiline nodeId={nodeId} />
      <Text label="JSON Schema (optional)" value={config.jsonSchema} onChange={(v) => updateConfig('jsonSchema', v)} placeholder='{"type":"object","properties":{…}}' multiline nodeId={nodeId} />
    </>
  );
}

function FunctionPanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <Dropdown label="Model" value={config.model} fallback="gemini-3.5-flash" onChange={(v) => updateConfig('model', v)} options={opt(MODELS_FLASH)} />
      <Text label="Prompt" value={config.prompt} onChange={(v) => updateConfig('prompt', v)} placeholder="What's the weather in Paris?" multiline nodeId={nodeId} />
      <Text label="Function Declarations (JSON array)" value={config.tools} onChange={(v) => updateConfig('tools', v)} placeholder='[{"name":"get_weather","description":"…","parameters":{…}}]' multiline nodeId={nodeId} />
      <Dropdown label="Tool Choice" value={config.toolChoice} fallback="auto" onChange={(v) => updateConfig('toolChoice', v)} options={[{ value: 'auto', label: 'Auto' }, { value: 'required', label: 'Required (any)' }, { value: 'none', label: 'None' }]} />
    </>
  );
}

function ReasoningPanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <Dropdown label="Model" value={config.model} fallback="gemini-3.1-pro-preview" onChange={(v) => updateConfig('model', v)} options={opt(MODELS_PRO)} />
      <Text label="Prompt" value={config.prompt} onChange={(v) => updateConfig('prompt', v)} placeholder="Solve this step by step…" multiline nodeId={nodeId} />
      <Dropdown label="Reasoning Effort" value={config.reasoningEffort} fallback="medium" onChange={(v) => updateConfig('reasoningEffort', v)} options={[{ value: 'low', label: 'Low — fast' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High — deepest' }]} />
    </>
  );
}

function VisionPanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <Dropdown label="Model" value={config.model} fallback="gemini-3.5-flash" onChange={(v) => updateConfig('model', v)} options={opt(MODELS_FLASH)} />
      <Text label="Image URL" value={config.imageUrl} onChange={(v) => updateConfig('imageUrl', v)} placeholder="https://… or {{$node.imageUrl}}" nodeId={nodeId} />
      <Text label="Question" value={config.prompt} onChange={(v) => updateConfig('prompt', v)} placeholder="Describe this image in detail." multiline nodeId={nodeId} />
    </>
  );
}

function GenerateImagePanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <Dropdown label="Model" value={config.model} fallback="gemini-3.1-flash-image" onChange={(v) => updateConfig('model', v)} options={opt(MODELS_IMAGE)} />
      <Text label="Image Prompt" value={config.imagePrompt} onChange={(v) => updateConfig('imagePrompt', v)} placeholder="A neon city skyline at dusk, cinematic…" multiline nodeId={nodeId} />
      <Text label="Source Image (optional — for edits)" value={config.fileInput} onChange={(v) => updateConfig('fileInput', v)} placeholder="https://… or {{$node.imageUrl}}" nodeId={nodeId} />
    </>
  );
}

function DocumentPanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <Dropdown label="Model" value={config.model} fallback="gemini-3.5-flash" onChange={(v) => updateConfig('model', v)} options={opt(MODELS_FLASH)} />
      <Text label="Question / Prompt" value={config.prompt} onChange={(v) => updateConfig('prompt', v)} placeholder="What are the key obligations in this contract?" multiline nodeId={nodeId} />
      <Text label="Document Text (optional — falls back to input)" value={config.documentText} onChange={(v) => updateConfig('documentText', v)} placeholder="{{$node.content}} or leave blank to use previous node" multiline nodeId={nodeId} />
      <Dropdown label="Output Format" value={config.outputFormat} fallback="text" onChange={(v) => updateConfig('outputFormat', v)} options={[{ value: 'text', label: 'Raw Text' }, { value: 'json', label: 'Structured JSON' }]} />
    </>
  );
}

function PdfPanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <Dropdown label="Model" value={config.model} fallback="gemini-3.5-flash" onChange={(v) => updateConfig('model', v)} options={opt(MODELS_FLASH)} />
      <Text label="PDF URL" value={config.fileInput} onChange={(v) => updateConfig('fileInput', v)} placeholder="https://… .pdf or {{$node.fileUrl}}" nodeId={nodeId} />
      <Text label="Question" value={config.prompt} onChange={(v) => updateConfig('prompt', v)} placeholder="Summarize this PDF and list action items." multiline nodeId={nodeId} />
    </>
  );
}

function AudioPanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <Dropdown label="Model" value={config.model} fallback="gemini-3.5-flash" onChange={(v) => updateConfig('model', v)} options={opt(MODELS_FLASH)} />
      <Text label="Audio URL" value={config.fileInput} onChange={(v) => updateConfig('fileInput', v)} placeholder="https://… .mp3 or {{$node.audioUrl}}" nodeId={nodeId} />
      <Text label="Instruction" value={config.prompt} onChange={(v) => updateConfig('prompt', v)} placeholder="Transcribe this audio and note the speakers." multiline nodeId={nodeId} />
    </>
  );
}

function VideoPanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <Dropdown label="Model" value={config.model} fallback="gemini-3.5-flash" onChange={(v) => updateConfig('model', v)} options={opt(MODELS_FLASH)} />
      <Text label="Video URL" value={config.fileInput} onChange={(v) => updateConfig('fileInput', v)} placeholder="https://… .mp4 or {{$node.videoUrl}}" nodeId={nodeId} />
      <Text label="Question" value={config.prompt} onChange={(v) => updateConfig('prompt', v)} placeholder="Describe what happens in this video." multiline nodeId={nodeId} />
    </>
  );
}

function EmbeddingPanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <Dropdown label="Model" value={config.model} fallback="gemini-embedding-001" onChange={(v) => updateConfig('model', v)} options={opt(MODELS_EMBED)} />
      <Text label="Text" value={config.text} onChange={(v) => updateConfig('text', v)} placeholder="{{$node.text}} or paste text to embed…" multiline nodeId={nodeId} />
      <ConfigInput label="Dimensions (optional)" type="number" value={config.dimensions ?? ''} onChange={(v) => updateConfig('dimensions', v)} placeholder="e.g. 768" />
    </>
  );
}

function ExtractPanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <Dropdown label="Model" value={config.model} fallback="gemini-3.5-flash" onChange={(v) => updateConfig('model', v)} options={opt(MODELS_FLASH)} />
      <Text label="Source Text" value={config.prompt} onChange={(v) => updateConfig('prompt', v)} placeholder="{{$node.text}} or paste text to extract from…" multiline nodeId={nodeId} />
      <Text label="Fields to Extract" value={config.fields} onChange={(v) => updateConfig('fields', v)} placeholder="name, email, total amount" nodeId={nodeId} />
    </>
  );
}

function ClassifyPanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <Dropdown label="Model" value={config.model} fallback="gemini-3.5-flash" onChange={(v) => updateConfig('model', v)} options={opt(MODELS_FLASH)} />
      <Text label="Text to Classify" value={config.prompt} onChange={(v) => updateConfig('prompt', v)} placeholder="{{$node.message}}" multiline nodeId={nodeId} />
      <Text label="Categories (comma-separated)" value={config.categories} onChange={(v) => updateConfig('categories', v)} placeholder="spam, support, sales, billing" nodeId={nodeId} />
    </>
  );
}

function SummarizePanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <Dropdown label="Model" value={config.model} fallback="gemini-3.5-flash" onChange={(v) => updateConfig('model', v)} options={opt(MODELS_FLASH)} />
      <Text label="Text to Summarize" value={config.prompt} onChange={(v) => updateConfig('prompt', v)} placeholder="{{$node.article}} or paste text…" multiline nodeId={nodeId} />
      <Dropdown label="Style" value={config.summaryStyle} fallback="paragraph" onChange={(v) => updateConfig('summaryStyle', v)} options={[{ value: 'paragraph', label: 'Short paragraph' }, { value: 'bullets', label: 'Bullet points' }, { value: 'tweet', label: 'One sentence' }, { value: 'eli5', label: "Explain like I'm 5" }]} />
    </>
  );
}

function TranslatePanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <Dropdown label="Model" value={config.model} fallback="gemini-3.5-flash" onChange={(v) => updateConfig('model', v)} options={opt(MODELS_FLASH)} />
      <Text label="Text to Translate" value={config.prompt} onChange={(v) => updateConfig('prompt', v)} placeholder="{{$node.text}}" multiline nodeId={nodeId} />
      <Text label="Target Language" value={config.targetLanguage} onChange={(v) => updateConfig('targetLanguage', v)} placeholder="Spanish, French, Japanese…" nodeId={nodeId} />
    </>
  );
}

function GeneratePromptPanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <Dropdown label="Model" value={config.model} fallback="gemini-3.5-flash" onChange={(v) => updateConfig('model', v)} options={opt(MODELS_FLASH)} />
      <Text label="Task Description" value={config.task} onChange={(v) => updateConfig('task', v)} placeholder="Classify support tickets by priority…" multiline nodeId={nodeId} />
    </>
  );
}

function CountTokensPanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <Dropdown label="Model" value={config.model} fallback="gemini-3.5-flash" onChange={(v) => updateConfig('model', v)} options={opt(MODELS_FLASH)} />
      <Text label="Text" value={config.prompt} onChange={(v) => updateConfig('prompt', v)} placeholder="{{$node.text}} or paste text to count…" multiline nodeId={nodeId} />
    </>
  );
}

function ListModelsPanel() {
  return (
    <div className="text-[11px] text-neutral-500 font-mono leading-relaxed px-1 py-2">
      Fetches the live list of Gemini models available to the selected API key. No parameters needed.
    </div>
  );
}

// ── Action → panel + canonical operation key ────────────────────────────────

const ACTIONS = {
  'Chat Completion':         { op: 'message',          Panel: ChatPanel },
  'Structured Output':       { op: 'structuredOutput', Panel: StructuredPanel },
  'Function Calling':        { op: 'functionCalling',  Panel: FunctionPanel },
  'Deep Reasoning':          { op: 'reasoning',        Panel: ReasoningPanel },
  'Vision Analysis':         { op: 'analyzeImage',     Panel: VisionPanel },
  'Generate Image':          { op: 'generateImage',    Panel: GenerateImagePanel },
  'Analyze Document':        { op: 'analyzeDocument',  Panel: DocumentPanel },
  'Analyze PDF':             { op: 'analyzePdf',       Panel: PdfPanel },
  'Analyze Audio':           { op: 'analyzeAudio',     Panel: AudioPanel },
  'Analyze Video':           { op: 'analyzeVideo',     Panel: VideoPanel },
  'Create Embedding':        { op: 'embeddings',       Panel: EmbeddingPanel },
  'Extract Structured Data': { op: 'extractData',      Panel: ExtractPanel },
  'Classify':                { op: 'classify',         Panel: ClassifyPanel },
  'Summarize':               { op: 'summarize',        Panel: SummarizePanel },
  'Translate':               { op: 'translate',        Panel: TranslatePanel },
  'Generate Prompt':         { op: 'generatePrompt',   Panel: GeneratePromptPanel },
  'Count Tokens':            { op: 'countTokens',      Panel: CountTokensPanel },
  'List Models':             { op: 'listModels',       Panel: ListModelsPanel },
};

const DEFAULT_ACTION = 'Chat Completion';

export default function GeminiNode({ config = {}, updateConfig, nodeId }) {
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
        label="Gemini API Key"
        placeholder="Select Gemini credential…"
      />
    </ConfigSection>
  );
}
