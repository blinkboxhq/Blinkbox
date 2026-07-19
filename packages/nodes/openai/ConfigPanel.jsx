import { useEffect } from 'react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';
import CredentialPicker from '@/components/ui/CredentialPicker';
import { ConfigSection, ConfigLabel, ConfigInput, ConfigSelect } from '@/components/ui/ConfigKit';

// Black & white only. The brand logo is the sole colored element — every accent
// here is neutral white/zinc so nothing competes with the logo.
const MONO = '#e5e5e5';

const MODELS_CHAT   = ['gpt-5.6', 'gpt-5.6-mini', 'gpt-5.5', 'gpt-5.5-mini', 'gpt-5.1', 'gpt-4.1', 'gpt-4o', 'gpt-4o-mini', 'o3', 'o3-mini'];
const MODELS_VISION = ['gpt-5.6', 'gpt-5.5', 'gpt-4.1', 'gpt-4o'];
const MODELS_IMAGE  = ['gpt-image-1', 'dall-e-3', 'dall-e-2'];
const MODELS_EMBED  = ['text-embedding-3-small', 'text-embedding-3-large', 'text-embedding-ada-002'];
const MODELS_TTS    = ['tts-1', 'tts-1-hd', 'gpt-4o-mini-tts'];
const MODELS_STT    = ['whisper-1', 'gpt-4o-transcribe', 'gpt-4o-mini-transcribe'];
const MODELS_FT     = ['gpt-4o-mini-2024-07-18', 'gpt-4.1-mini-2025-04-14', 'gpt-3.5-turbo'];

const IMAGE_SIZES   = ['1024x1024', '1792x1024', '1024x1792', '512x512', '256x256'];
const TTS_VOICES    = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
const TTS_FORMATS   = ['mp3', 'opus', 'aac', 'flac', 'wav', 'pcm'];

const opt = (v) => v.map((s) => ({ value: s, label: s }));

// ── Shared field primitives (all neutral) ───────────────────────────────────

function Text({ label, value, onChange, placeholder, multiline, nodeId }) {
  return (
    <div className="flex flex-col gap-1.5">
      <ConfigLabel>{label}</ConfigLabel>
      <SmartVariableInput value={value || ''} onChange={onChange} placeholder={placeholder} multiline={multiline} nodeId={nodeId} />
    </div>
  );
}

function Dropdown({ label, value, fallback, onChange, options }) {
  return (
    <ConfigSelect
      label={label}
      value={value || fallback}
      onChange={onChange}
      options={options}
      accentColor={MONO}
    />
  );
}

// ── 15 per-action panels ────────────────────────────────────────────────────

function ChatPanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <Dropdown label="Model" value={config.model} fallback="gpt-5.6" onChange={(v) => updateConfig('model', v)} options={opt(MODELS_CHAT)} />
      <Text label="System Instructions" value={config.system} onChange={(v) => updateConfig('system', v)} placeholder="You are a helpful assistant…" multiline nodeId={nodeId} />
      <Text label="Prompt" value={config.prompt} onChange={(v) => updateConfig('prompt', v)} placeholder="Summarize the following data…" multiline nodeId={nodeId} />
      <ConfigInput label="Temperature" type="number" value={config.temperature ?? '0.7'} onChange={(v) => updateConfig('temperature', v)} placeholder="0.7" />
    </>
  );
}

function StreamPanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <Dropdown label="Model" value={config.model} fallback="gpt-5.6" onChange={(v) => updateConfig('model', v)} options={opt(MODELS_CHAT)} />
      <Text label="Prompt" value={config.prompt} onChange={(v) => updateConfig('prompt', v)} placeholder="Write a story about…" multiline nodeId={nodeId} />
      <Dropdown label="Emit Mode" value={config.streamMode} fallback="token" onChange={(v) => updateConfig('streamMode', v)} options={[{ value: 'token', label: 'Per token' }, { value: 'sentence', label: 'Per sentence' }, { value: 'final', label: 'Final only' }]} />
    </>
  );
}

function StructuredPanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <Dropdown label="Model" value={config.model} fallback="gpt-5.6" onChange={(v) => updateConfig('model', v)} options={opt(MODELS_CHAT)} />
      <Text label="Prompt" value={config.prompt} onChange={(v) => updateConfig('prompt', v)} placeholder="Extract the invoice fields…" multiline nodeId={nodeId} />
      <Text label="JSON Schema" value={config.jsonSchema} onChange={(v) => updateConfig('jsonSchema', v)} placeholder='{"name":"invoice","schema":{…}}' multiline nodeId={nodeId} />
    </>
  );
}

function FunctionPanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <Dropdown label="Model" value={config.model} fallback="gpt-5.6" onChange={(v) => updateConfig('model', v)} options={opt(MODELS_CHAT)} />
      <Text label="Prompt" value={config.prompt} onChange={(v) => updateConfig('prompt', v)} placeholder="What's the weather in Paris?" multiline nodeId={nodeId} />
      <Text label="Tools (function definitions)" value={config.tools} onChange={(v) => updateConfig('tools', v)} placeholder='[{"type":"function","function":{…}}]' multiline nodeId={nodeId} />
      <Dropdown label="Tool Choice" value={config.toolChoice} fallback="auto" onChange={(v) => updateConfig('toolChoice', v)} options={[{ value: 'auto', label: 'Auto' }, { value: 'required', label: 'Required' }, { value: 'none', label: 'None' }]} />
    </>
  );
}

function VisionPanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <Dropdown label="Model" value={config.model} fallback="gpt-5.6" onChange={(v) => updateConfig('model', v)} options={opt(MODELS_VISION)} />
      <Text label="Image URL" value={config.imageUrl} onChange={(v) => updateConfig('imageUrl', v)} placeholder="https://… or {{$node.imageUrl}}" nodeId={nodeId} />
      <Text label="Question" value={config.prompt} onChange={(v) => updateConfig('prompt', v)} placeholder="Describe this image in detail." multiline nodeId={nodeId} />
      <Dropdown label="Detail" value={config.detail} fallback="auto" onChange={(v) => updateConfig('detail', v)} options={[{ value: 'auto', label: 'Auto' }, { value: 'low', label: 'Low' }, { value: 'high', label: 'High' }]} />
    </>
  );
}

function GenerateImagePanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <Dropdown label="Model" value={config.model} fallback="gpt-image-1" onChange={(v) => updateConfig('model', v)} options={opt(MODELS_IMAGE)} />
      <Text label="Image Description" value={config.imagePrompt} onChange={(v) => updateConfig('imagePrompt', v)} placeholder="A photorealistic cat in a spacesuit…" multiline nodeId={nodeId} />
      <Dropdown label="Size" value={config.imageSize} fallback="1024x1024" onChange={(v) => updateConfig('imageSize', v)} options={opt(IMAGE_SIZES)} />
      <Dropdown label="Quality" value={config.imageQuality} fallback="standard" onChange={(v) => updateConfig('imageQuality', v)} options={[{ value: 'standard', label: 'Standard' }, { value: 'hd', label: 'HD' }]} />
    </>
  );
}

function EditImagePanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <Text label="Source Image URL" value={config.imageUrl} onChange={(v) => updateConfig('imageUrl', v)} placeholder="https://… PNG source image" nodeId={nodeId} />
      <Text label="Mask URL (optional)" value={config.maskUrl} onChange={(v) => updateConfig('maskUrl', v)} placeholder="Transparent area = region to edit" nodeId={nodeId} />
      <Text label="Edit Prompt" value={config.imagePrompt} onChange={(v) => updateConfig('imagePrompt', v)} placeholder="Add a red hat to the cat…" multiline nodeId={nodeId} />
      <Dropdown label="Size" value={config.imageSize} fallback="1024x1024" onChange={(v) => updateConfig('imageSize', v)} options={opt(IMAGE_SIZES)} />
    </>
  );
}

function ImageVariationPanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <Text label="Source Image URL" value={config.imageUrl} onChange={(v) => updateConfig('imageUrl', v)} placeholder="https://… PNG source image" nodeId={nodeId} />
      <ConfigInput label="Number of Variations" type="number" value={config.n ?? '1'} onChange={(v) => updateConfig('n', v)} placeholder="1" />
      <Dropdown label="Size" value={config.imageSize} fallback="1024x1024" onChange={(v) => updateConfig('imageSize', v)} options={opt(IMAGE_SIZES)} />
    </>
  );
}

function TranscribePanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <Dropdown label="Model" value={config.model} fallback="whisper-1" onChange={(v) => updateConfig('model', v)} options={opt(MODELS_STT)} />
      <Text label="Audio URL" value={config.audioUrl} onChange={(v) => updateConfig('audioUrl', v)} placeholder="https://… mp3/mp4/m4a/wav/webm" nodeId={nodeId} />
      <Text label="Language (optional)" value={config.language} onChange={(v) => updateConfig('language', v)} placeholder="en  (blank = auto-detect)" nodeId={nodeId} />
    </>
  );
}

function TranslatePanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <Text label="Audio URL" value={config.audioUrl} onChange={(v) => updateConfig('audioUrl', v)} placeholder="https://… non-English audio" nodeId={nodeId} />
      <Text label="Context Prompt (optional)" value={config.prompt} onChange={(v) => updateConfig('prompt', v)} placeholder="Hint at names or jargon to keep accurate…" multiline nodeId={nodeId} />
    </>
  );
}

function SpeechPanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <Dropdown label="Model" value={config.model} fallback="tts-1" onChange={(v) => updateConfig('model', v)} options={opt(MODELS_TTS)} />
      <Text label="Text" value={config.text} onChange={(v) => updateConfig('text', v)} placeholder="The text to speak aloud…" multiline nodeId={nodeId} />
      <Dropdown label="Voice" value={config.voice} fallback="alloy" onChange={(v) => updateConfig('voice', v)} options={opt(TTS_VOICES)} />
      <Dropdown label="Format" value={config.format} fallback="mp3" onChange={(v) => updateConfig('format', v)} options={opt(TTS_FORMATS)} />
    </>
  );
}

function EmbeddingPanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <Dropdown label="Model" value={config.model} fallback="text-embedding-3-small" onChange={(v) => updateConfig('model', v)} options={opt(MODELS_EMBED)} />
      <Text label="Text to Embed" value={config.text} onChange={(v) => updateConfig('text', v)} placeholder="{{$node.content}} or paste text…" multiline nodeId={nodeId} />
      <ConfigInput label="Dimensions (optional)" type="number" value={config.dimensions ?? ''} onChange={(v) => updateConfig('dimensions', v)} placeholder="1536" />
    </>
  );
}

function ModeratePanel({ config, updateConfig, nodeId }) {
  return (
    <Text label="Text to Moderate" value={config.prompt} onChange={(v) => updateConfig('prompt', v)} placeholder="{{$node.text}} or paste text directly…" multiline nodeId={nodeId} />
  );
}

function ListModelsPanel({ config, updateConfig }) {
  return (
    <Dropdown label="Filter" value={config.filter} fallback="all" onChange={(v) => updateConfig('filter', v)} options={[{ value: 'all', label: 'All models' }, { value: 'gpt', label: 'Chat (GPT) only' }, { value: 'embedding', label: 'Embedding only' }, { value: 'image', label: 'Image only' }]} />
  );
}

function FineTunePanel({ config, updateConfig, nodeId }) {
  return (
    <>
      <Dropdown label="Base Model" value={config.model} fallback="gpt-4o-mini-2024-07-18" onChange={(v) => updateConfig('model', v)} options={opt(MODELS_FT)} />
      <Text label="Training File ID" value={config.trainingFile} onChange={(v) => updateConfig('trainingFile', v)} placeholder="file-abc123  (uploaded JSONL)" nodeId={nodeId} />
      <Text label="Validation File ID (optional)" value={config.validationFile} onChange={(v) => updateConfig('validationFile', v)} placeholder="file-def456" nodeId={nodeId} />
      <Text label="Suffix (optional)" value={config.suffix} onChange={(v) => updateConfig('suffix', v)} placeholder="my-custom-model" nodeId={nodeId} />
    </>
  );
}

// ── Action → panel + canonical operation key ────────────────────────────────

const ACTIONS = {
  'Chat Completion':   { op: 'message',          Panel: ChatPanel },
  'Stream Chat':       { op: 'message',          Panel: StreamPanel },
  'Structured Output': { op: 'structuredOutput', Panel: StructuredPanel },
  'Function Calling':  { op: 'functionCalling',  Panel: FunctionPanel },
  'Vision Analysis':   { op: 'analyzeImage',     Panel: VisionPanel },
  'Generate Image':    { op: 'generateImage',    Panel: GenerateImagePanel },
  'Edit Image':        { op: 'editImage',        Panel: EditImagePanel },
  'Image Variation':   { op: 'imageVariation',   Panel: ImageVariationPanel },
  'Transcribe Audio':  { op: 'transcribeAudio',  Panel: TranscribePanel },
  'Translate Audio':   { op: 'translateAudio',   Panel: TranslatePanel },
  'Text to Speech':    { op: 'textToSpeech',     Panel: SpeechPanel },
  'Create Embedding':  { op: 'embeddings',       Panel: EmbeddingPanel },
  'Moderate Content':  { op: 'moderateContent',  Panel: ModeratePanel },
  'List Models':       { op: 'listModels',       Panel: ListModelsPanel },
  'Fine-tune Model':   { op: 'fineTune',         Panel: FineTunePanel },
};

const DEFAULT_ACTION = 'Chat Completion';

// ── Main component ──────────────────────────────────────────────────────────

export default function OpenAINode({ config = {}, updateConfig, nodeId }) {
  const action = config.selectedAction && ACTIONS[config.selectedAction] ? config.selectedAction : DEFAULT_ACTION;
  const { op, Panel } = ACTIONS[action];

  useEffect(() => {
    if (config.operation !== op) updateConfig('operation', op);
  }, [op, config.operation]);

  return (
    <ConfigSection>
      <div className="flex flex-col gap-4 w-full">
        <Panel config={config} updateConfig={updateConfig} nodeId={nodeId} />

        <div className="border-t border-[#222] my-1" />

        <CredentialPicker
          value={config.credentialId || ''}
          onChange={(id) => updateConfig('credentialId', id)}
          accentColor="blue"
          label="OpenAI API Key"
          placeholder="Select OpenAI credential…"
        />
      </div>
    </ConfigSection>
  );
}
