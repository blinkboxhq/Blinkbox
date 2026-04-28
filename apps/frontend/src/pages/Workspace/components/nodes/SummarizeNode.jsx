import { AlignLeft } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';

export default function SummarizeNode({ config = {}, updateConfig }) {
  const text = config.text ?? '';
  const model = config.model ?? 'gpt-4o-mini';
  const format = config.format ?? 'paragraph'; // 'paragraph' | 'bullets' | 'tldr' | 'structured'
  const length = config.length ?? 'medium'; // 'short' | 'medium' | 'long'
  const language = config.language ?? '';
  const focus = config.focus ?? '';

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
          <AlignLeft className="w-4 h-4 text-cyan-400" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Summarize</div>
          <div className="text-[11px] text-zinc-500">AI summarization of long text or documents</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Input Text</label>
        <SmartVariableInput value={text} onChange={(v) => updateConfig('text', v)} placeholder="{{ $json.content }}" multiline />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Output Format</label>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { value: 'paragraph',  label: 'Paragraph' },
            { value: 'bullets',    label: 'Bullet Points' },
            { value: 'tldr',       label: 'TL;DR (1 line)' },
            { value: 'structured', label: 'Key Points + Summary' },
          ].map((f) => (
            <button key={f.value} onClick={() => updateConfig('format', f.value)}
              className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-all ${format === f.value ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Summary Length</label>
        <div className="flex gap-1.5">
          {[
            { value: 'short',  label: '1–2 sentences' },
            { value: 'medium', label: '1 paragraph' },
            { value: 'long',   label: 'Detailed' },
          ].map((l) => (
            <button key={l.value} onClick={() => updateConfig('length', l.value)}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${length === l.value ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
              {l.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Focus On (optional)</label>
        <SmartVariableInput value={focus} onChange={(v) => updateConfig('focus', v)} placeholder="risks, action items, technical details..." />
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Output Language</label>
          <input value={language} onChange={(e) => updateConfig('language', e.target.value)} placeholder="Same as input"
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
            <option value="gemini-2.0-flash">Gemini Flash</option>
          </select>
        </div>
      </div>

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        Returns: <span className="text-zinc-300">summary string{format === 'structured' ? ', keyPoints array' : ''}</span>
      </div>
    </div>
  );
}
