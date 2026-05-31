import { FileText } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';

export default function HtmlToTextNode({ config = {}, updateConfig, nodeId }) {
  const field = config.field ?? '';
  const preserveLinks = config.preserveLinks ?? false;
  const preserveLineBreaks = config.preserveLineBreaks ?? true;
  const wordwrap = config.wordwrap ?? 0;
  const outputField = config.outputField ?? 'text';

  const Toggle = ({ label, desc, key: k, value }) => (
    <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
      <div>
        <p className="text-[12px] font-semibold text-zinc-300">{label}</p>
        <p className="text-[10px] text-zinc-600">{desc}</p>
      </div>
      <button onClick={() => updateConfig(k, !value)}
        className={`w-10 h-5 rounded-full border transition-all relative ${value ? 'bg-cyan-500 border-cyan-400' : 'bg-zinc-700 border-zinc-600'}`}>
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${value ? 'left-5' : 'left-0.5'}`} />
      </button>
    </div>
  );

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
          <FileText className="w-4 h-4 text-cyan-400" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">HTML to Text</div>
          <div className="text-[11px] text-zinc-500">Strip HTML tags and extract plain text</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">HTML Field</label>
        <SmartVariableInput value={field} onChange={(v) => updateConfig('field', v)} placeholder="{{ $json.html }}" />
      </div>

      <Toggle label="Preserve Links" desc="Keep href text in parentheses" k="preserveLinks" value={preserveLinks} />
      <Toggle label="Preserve Line Breaks" desc="Keep <br> and block elements as newlines" k="preserveLineBreaks" value={preserveLineBreaks} />

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Word Wrap (chars, 0 = off)</label>
        <input type="number" min={0} value={wordwrap} onChange={(e) => updateConfig('wordwrap', Number(e.target.value))}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Output Field</label>
        <input value={outputField} onChange={(e) => updateConfig('outputField', e.target.value)} placeholder="text"
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 font-mono focus:outline-none focus:border-zinc-500" />
      </div>
    </div>
  );
}
