import { Mic2 } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';

export default function SpeechToTextNode({ config = {}, updateConfig, nodeId }) {
  const audioUrl = config.audioUrl ?? '';
  const provider = config.provider ?? 'openai'; // 'openai' | 'google' | 'assemblyai'
  const language = config.language ?? 'en';
  const model = config.model ?? 'whisper-1';
  const apiKey = config.apiKey ?? '';
  const timestamps = config.timestamps ?? false;
  const speakerDiarization = config.speakerDiarization ?? false;
  const punctuation = config.punctuation ?? true;

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
          <Mic2 className="w-4 h-4 text-rose-400" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Speech to Text</div>
          <div className="text-[11px] text-zinc-500">Transcribe audio to text via Whisper / Google</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Audio URL or Base64</label>
        <SmartVariableInput value={audioUrl} onChange={(v) => updateConfig('audioUrl', v)} placeholder="{{ $json.audioUrl }}" />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Provider</label>
        <div className="flex gap-1.5">
          {[
            { value: 'openai',     label: 'OpenAI Whisper' },
            { value: 'google',     label: 'Google STT' },
            { value: 'assemblyai', label: 'AssemblyAI' },
          ].map((p) => (
            <button key={p.value} onClick={() => updateConfig('provider', p.value)}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${provider === p.value ? 'bg-rose-500/20 border-rose-500/40 text-rose-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {provider === 'openai' && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Model</label>
          <div className="flex gap-1.5">
            {[{ value: 'whisper-1', label: 'Whisper-1' }, { value: 'gpt-4o-transcribe', label: 'GPT-4o Transcribe' }].map((m) => (
              <button key={m.value} onClick={() => updateConfig('model', m.value)}
                className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${model === m.value ? 'bg-rose-500/20 border-rose-500/40 text-rose-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
                {m.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Language</label>
        <input value={language} onChange={(e) => updateConfig('language', e.target.value)} placeholder="en, hi, fr, de..."
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 font-mono focus:outline-none focus:border-zinc-500" />
        <p className="text-[10px] text-zinc-600 mt-1">ISO 639-1 code. Leave blank for auto-detect.</p>
      </div>

      <div className="flex flex-col gap-2">
        {[
          { key: 'timestamps',         label: 'Word Timestamps',      desc: 'Include start/end time per word' },
          { key: 'speakerDiarization', label: 'Speaker Diarization',  desc: 'Identify different speakers' },
          { key: 'punctuation',        label: 'Auto Punctuation',     desc: 'Add punctuation automatically' },
        ].map(({ key, label, desc }) => (
          <div key={key} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
            <div>
              <p className="text-[12px] font-semibold text-zinc-300">{label}</p>
              <p className="text-[10px] text-zinc-600">{desc}</p>
            </div>
            <button onClick={() => updateConfig(key, !config[key])}
              className={`w-10 h-5 rounded-full border transition-all relative ${config[key] ? 'bg-rose-500 border-rose-400' : 'bg-zinc-700 border-zinc-600'}`}>
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${config[key] ? 'left-5' : 'left-0.5'}`} />
            </button>
          </div>
        ))}
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">API Key</label>
        <input type="password" value={apiKey} onChange={(e) => updateConfig('apiKey', e.target.value)}
          placeholder={provider === 'openai' ? 'OpenAI API Key' : provider === 'google' ? 'Google Cloud API Key' : 'AssemblyAI API Key'}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
      </div>

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        Returns: <span className="text-zinc-300">text, language, duration{timestamps ? ', words[]' : ''}{speakerDiarization ? ', speakers[]' : ''}</span>
      </div>
    </div>
  );
}
