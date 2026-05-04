import { BookMarked } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';

export default function FlashcardGeneratorNode({ config = {}, updateConfig, nodeId }) {
  const content = config.content ?? '';
  const count = config.count ?? 10;
  const model = config.model ?? 'gpt-4o-mini';
  const format = config.format ?? 'qa'; // 'qa' | 'cloze' | 'definition'
  const subject = config.subject ?? '';
  const difficulty = config.difficulty ?? 'medium';
  const language = config.language ?? 'English';

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
          <BookMarked className="w-4 h-4 text-violet-400" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Flashcard Generator</div>
          <div className="text-[11px] text-zinc-500">AI-powered study cards from any text</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Source Text</label>
        <SmartVariableInput value={content} onChange={(v) => updateConfig('content', v)} placeholder="{{ $json.text }}" multiline />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Card Format</label>
        <div className="flex gap-1.5">
          {[
            { value: 'qa',         label: 'Q & A' },
            { value: 'cloze',      label: 'Fill in Blank' },
            { value: 'definition', label: 'Term → Definition' },
          ].map((f) => (
            <button key={f.value} onClick={() => updateConfig('format', f.value)}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${format === f.value ? 'bg-violet-500/20 border-violet-500/40 text-violet-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Number of Cards</label>
          <input type="number" min={1} max={50} value={count} onChange={(e) => updateConfig('count', Number(e.target.value))}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
        </div>
        <div className="flex-1">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Difficulty</label>
          <select value={difficulty} onChange={(e) => updateConfig('difficulty', e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-200 focus:outline-none cursor-pointer">
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Subject / Topic (optional)</label>
        <SmartVariableInput value={subject} onChange={(v) => updateConfig('subject', v)} placeholder="Organic Chemistry, World War II..." />
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
            <option value="gemini-2.0-flash">Gemini Flash</option>
          </select>
        </div>
      </div>

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        Returns: <span className="text-zinc-300">array of {`{ front, back, hint? }`} flashcard objects</span>
      </div>
    </div>
  );
}
