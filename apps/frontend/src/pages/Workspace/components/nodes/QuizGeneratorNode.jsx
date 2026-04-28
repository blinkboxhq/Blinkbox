import { ListChecks } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';

export default function QuizGeneratorNode({ config = {}, updateConfig }) {
  const content = config.content ?? '';
  const count = config.count ?? 5;
  const model = config.model ?? 'gpt-4o-mini';
  const type = config.type ?? 'mcq'; // 'mcq' | 'truefalse' | 'short'
  const options = config.options ?? 4;
  const difficulty = config.difficulty ?? 'medium';
  const subject = config.subject ?? '';
  const includeExplanation = config.includeExplanation ?? true;

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
          <ListChecks className="w-4 h-4 text-amber-400" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Quiz Generator</div>
          <div className="text-[11px] text-zinc-500">Generate MCQs and questions from any text</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Source Text</label>
        <SmartVariableInput value={content} onChange={(v) => updateConfig('content', v)} placeholder="{{ $json.chapter }}" multiline />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Question Type</label>
        <div className="flex gap-1.5">
          {[
            { value: 'mcq',       label: 'Multiple Choice' },
            { value: 'truefalse', label: 'True / False' },
            { value: 'short',     label: 'Short Answer' },
          ].map((t) => (
            <button key={t.value} onClick={() => updateConfig('type', t.value)}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${type === t.value ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Number of Questions</label>
          <input type="number" min={1} max={30} value={count} onChange={(e) => updateConfig('count', Number(e.target.value))}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
        </div>
        {type === 'mcq' && (
          <div className="flex-1">
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Options per Q</label>
            <input type="number" min={2} max={6} value={options} onChange={(e) => updateConfig('options', Number(e.target.value))}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Difficulty</label>
          <select value={difficulty} onChange={(e) => updateConfig('difficulty', e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-200 focus:outline-none cursor-pointer">
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
            <option value="mixed">Mixed</option>
          </select>
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

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Subject (optional)</label>
        <SmartVariableInput value={subject} onChange={(v) => updateConfig('subject', v)} placeholder="Biology, History, Math..." />
      </div>

      <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
        <div>
          <p className="text-[12px] font-semibold text-zinc-300">Include Explanation</p>
          <p className="text-[10px] text-zinc-600">Add answer explanation to each question</p>
        </div>
        <button onClick={() => updateConfig('includeExplanation', !includeExplanation)}
          className={`w-10 h-5 rounded-full border transition-all relative ${includeExplanation ? 'bg-amber-500 border-amber-400' : 'bg-zinc-700 border-zinc-600'}`}>
          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${includeExplanation ? 'left-5' : 'left-0.5'}`} />
        </button>
      </div>

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        Returns: <span className="text-zinc-300">array of {`{ question, options[], answer, explanation? }`}</span>
      </div>
    </div>
  );
}
