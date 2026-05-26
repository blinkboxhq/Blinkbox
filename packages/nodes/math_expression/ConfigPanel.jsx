import { Sigma } from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';

const EXAMPLES = [
  'round(price * 1.18, 2)',
  '(a + b) / c',
  'max(score1, score2)',
  'abs(balance)',
  'floor(random() * 100)',
];

export default function MathExpressionNode({ config = {}, updateConfig, nodeId }) {
  const expression = config.expression ?? '';
  const outputField = config.outputField ?? 'result';
  const precision = config.precision ?? -1; // -1 = no rounding

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
          <Sigma className="w-4 h-4 text-yellow-400" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Math Expression</div>
          <div className="text-[11px] text-zinc-500">Evaluate a mathematical formula safely</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Expression</label>
        <SmartVariableInput
          value={expression}
          onChange={(v) => updateConfig('expression', v)}
          placeholder="round({{ $json.price }} * 1.18, 2)"
          multiline
        />
        <p className="text-[10px] text-zinc-600 mt-1">Supports +, -, *, /, %, ^, abs(), round(), floor(), ceil(), min(), max(), sqrt(), random()</p>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Examples</label>
        <div className="flex flex-col gap-1">
          {EXAMPLES.map((ex) => (
            <button key={ex} onClick={() => updateConfig('expression', ex)}
              className="text-left px-2 py-1.5 rounded-md bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-[11px] text-zinc-500 hover:text-zinc-300 font-mono transition-all">
              {ex}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Round to Decimals (-1 = off)</label>
        <input type="number" min={-1} max={10} value={precision} onChange={(e) => updateConfig('precision', Number(e.target.value))}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Output Field</label>
        <input value={outputField} onChange={(e) => updateConfig('outputField', e.target.value)} placeholder="result"
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 font-mono focus:outline-none focus:border-zinc-500" />
      </div>
    </div>
  );
}
