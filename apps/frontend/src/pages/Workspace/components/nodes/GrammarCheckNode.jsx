import { CheckSquare } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';

export default function GrammarCheckNode({ config = {}, updateConfig }) {
  const text = config.text ?? '';
  const model = config.model ?? 'gpt-4o-mini';
  const language = config.language ?? 'English';
  const mode = config.mode ?? 'correct'; // 'correct' | 'annotate' | 'report'
  const style = config.style ?? 'standard'; // 'standard' | 'formal' | 'casual' | 'academic'

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center">
          <CheckSquare className="w-4 h-4 text-green-400" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Grammar Check</div>
          <div className="text-[11px] text-zinc-500">Correct grammar, spelling and style</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Input Text</label>
        <SmartVariableInput value={text} onChange={(v) => updateConfig('text', v)} placeholder="{{ $json.text }}" multiline />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Output Mode</label>
        <div className="flex gap-1.5">
          {[
            { value: 'correct',  label: 'Corrected Text' },
            { value: 'annotate', label: 'Track Changes' },
            { value: 'report',   label: 'Error Report' },
          ].map((m) => (
            <button key={m.value} onClick={() => updateConfig('mode', m.value)}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${mode === m.value ? 'bg-green-500/20 border-green-500/40 text-green-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Writing Style</label>
        <div className="flex gap-1.5">
          {['standard', 'formal', 'casual', 'academic'].map((s) => (
            <button key={s} onClick={() => updateConfig('style', s)}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border capitalize transition-all ${style === s ? 'bg-green-500/20 border-green-500/40 text-green-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Language</label>
          <input value={language} onChange={(e) => updateConfig('language', e.target.value)} placeholder="English"
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
        </div>
        <div className="flex-1">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">AI Model</label>
          <select value={model} onChange={(e) => updateConfig('model', e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-200 focus:outline-none cursor-pointer">
            <option value="gpt-4o-mini">GPT-4o Mini</option>
            <option value="gpt-4o">GPT-4o</option>
            <option value="claude-haiku-4-5-20251001">Claude Haiku</option>
            <option value="claude-sonnet-4-6">Claude Sonnet</option>
          </select>
        </div>
      </div>

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        {mode === 'correct' && <>Returns: <span className="text-zinc-300">corrected text string</span></>}
        {mode === 'annotate' && <>Returns: <span className="text-zinc-300">original, corrected, changes array</span></>}
        {mode === 'report' && <>Returns: <span className="text-zinc-300">errors array with position, type, suggestion</span></>}
      </div>
    </div>
  );
}
