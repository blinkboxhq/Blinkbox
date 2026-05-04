import { Headphones } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';
import CredentialPicker from '../../../../components/ui/CredentialPicker';

const VOICES = {
  openai: [
    { value: 'alloy',   label: 'Alloy (neutral)' },
    { value: 'echo',    label: 'Echo (male)' },
    { value: 'fable',   label: 'Fable (british)' },
    { value: 'onyx',    label: 'Onyx (deep)' },
    { value: 'nova',    label: 'Nova (female)' },
    { value: 'shimmer', label: 'Shimmer (female)' },
  ],
  elevenlabs: [
    { value: 'Rachel', label: 'Rachel' },
    { value: 'Adam',   label: 'Adam' },
    { value: 'Antoni', label: 'Antoni' },
    { value: 'Arnold', label: 'Arnold' },
    { value: 'Bella',  label: 'Bella' },
    { value: 'Domi',   label: 'Domi' },
  ],
  google: [
    { value: 'en-US-Neural2-A', label: 'Neural US Female A' },
    { value: 'en-US-Neural2-D', label: 'Neural US Male D' },
    { value: 'en-IN-Neural2-A', label: 'Neural India Female' },
    { value: 'en-IN-Neural2-B', label: 'Neural India Male' },
  ],
};

export default function TextToSpeechNode({ config = {}, updateConfig, nodeId }) {
  const text = config.text ?? '';
  const provider = config.provider ?? 'openai';
  const voice = config.voice ?? 'alloy';
  const speed = config.speed ?? 1.0;
  const format = config.format ?? 'mp3';
  const apiKey = config.apiKey ?? '';
  const model = config.model ?? 'tts-1';

  const availableVoices = VOICES[provider] ?? VOICES.openai;

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
          <Headphones className="w-4 h-4 text-purple-400" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Text to Speech</div>
          <div className="text-[11px] text-zinc-500">Convert text to natural-sounding audio</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Text</label>
        <SmartVariableInput value={text} onChange={(v) => updateConfig('text', v)} placeholder="{{ $json.text }}" multiline />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Provider</label>
        <div className="flex gap-1.5">
          {[
            { value: 'openai',     label: 'OpenAI' },
            { value: 'elevenlabs', label: 'ElevenLabs' },
            { value: 'google',     label: 'Google TTS' },
          ].map((p) => (
            <button key={p.value} onClick={() => { updateConfig('provider', p.value); updateConfig('voice', VOICES[p.value]?.[0]?.value ?? ''); }}
              className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${provider === p.value ? 'bg-purple-500/20 border-purple-500/40 text-purple-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {provider === 'openai' && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Model</label>
          <div className="flex gap-1.5">
            {[{ value: 'tts-1', label: 'TTS-1 (fast)' }, { value: 'tts-1-hd', label: 'TTS-1-HD (quality)' }].map((m) => (
              <button key={m.value} onClick={() => updateConfig('model', m.value)}
                className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${model === m.value ? 'bg-purple-500/20 border-purple-500/40 text-purple-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
                {m.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Voice</label>
        <select value={voice} onChange={(e) => updateConfig('voice', e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-200 focus:outline-none cursor-pointer">
          {availableVoices.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
        </select>
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Speed ({speed}×)</label>
          <input type="range" min={0.25} max={4} step={0.25} value={speed} onChange={(e) => updateConfig('speed', Number(e.target.value))}
            className="w-full accent-purple-500" />
        </div>
        <div className="flex-1">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Format</label>
          <select value={format} onChange={(e) => updateConfig('format', e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-200 focus:outline-none cursor-pointer">
            <option value="mp3">MP3</option>
            <option value="wav">WAV</option>
            <option value="opus">Opus</option>
            <option value="aac">AAC</option>
          </select>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">API Key</label>
        <CredentialPicker
        value={config.credentialId || ''}
        onChange={(id) => updateConfig('credentialId', id)}
        accentColor="purple"
        label="OpenAI / ElevenLabs Key"
        placeholder="Select OpenAI / ElevenLabs Key..."
      />
      </div>

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        Returns: <span className="text-zinc-300">audioUrl (base64 or file URL), format, duration</span>
      </div>
    </div>
  );
}
