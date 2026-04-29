import { Lock } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';

export default function Base64Node({ config = {}, updateConfig }) {
  const mode        = config.mode        ?? 'encode'; // encode | decode
  const input       = config.input       ?? '';
  const inputType   = config.inputType   ?? 'text'; // text | url | binary
  const outputField = config.outputField ?? 'result';
  const urlSafe     = config.urlSafe     ?? false;
  const padding     = config.padding     ?? true;

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
          <Lock className="w-4 h-4 text-indigo-400" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Base64 Encode / Decode</div>
          <div className="text-[11px] text-zinc-500">Encode text, URLs or binary to/from Base64</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Action</label>
        <div className="flex gap-1.5">
          {[{ value: 'encode', label: 'Encode → Base64' }, { value: 'decode', label: 'Decode ← Base64' }].map((m) => (
            <button key={m.value} onClick={() => updateConfig('mode', m.value)}
              className={`flex-1 py-2 rounded-lg text-[12px] font-bold border transition-all ${mode === m.value ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Input</label>
        <SmartVariableInput value={input} onChange={(v) => updateConfig('input', v)}
          placeholder={mode === 'encode' ? 'Hello World  or  {{ $json.text }}' : 'SGVsbG8gV29ybGQ=  or  {{ $json.encoded }}'} multiline />
      </div>

      {mode === 'encode' && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Input Type</label>
          <div className="flex gap-1.5">
            {[
              { value: 'text',   label: 'Text / String' },
              { value: 'url',    label: 'URL (fetch then encode)' },
              { value: 'binary', label: 'Binary Buffer' },
            ].map((t) => (
              <button key={t.value} onClick={() => updateConfig('inputType', t.value)}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${inputType === t.value ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
          <div>
            <p className="text-[12px] font-semibold text-zinc-300">URL-Safe Base64</p>
            <p className="text-[10px] text-zinc-600">Replace + with - and / with _ (RFC 4648)</p>
          </div>
          <button onClick={() => updateConfig('urlSafe', !urlSafe)}
            className={`w-10 h-5 rounded-full border transition-all relative ${urlSafe ? 'bg-indigo-500 border-indigo-400' : 'bg-zinc-700 border-zinc-600'}`}>
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${urlSafe ? 'left-5' : 'left-0.5'}`} />
          </button>
        </div>
        <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
          <div>
            <p className="text-[12px] font-semibold text-zinc-300">Include Padding</p>
            <p className="text-[10px] text-zinc-600">Append = padding characters</p>
          </div>
          <button onClick={() => updateConfig('padding', !padding)}
            className={`w-10 h-5 rounded-full border transition-all relative ${padding ? 'bg-indigo-500 border-indigo-400' : 'bg-zinc-700 border-zinc-600'}`}>
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${padding ? 'left-5' : 'left-0.5'}`} />
          </button>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Output Field</label>
        <input value={outputField} onChange={(e) => updateConfig('outputField', e.target.value)} placeholder="result"
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 font-mono focus:outline-none focus:border-zinc-500" />
      </div>

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        Returns: <span className="text-zinc-300">{outputField} (string), length, mode</span>
      </div>
    </div>
  );
}
