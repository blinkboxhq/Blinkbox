import { BookOpen } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';

export default function MarkdownRendererNode({ config = {}, updateConfig, nodeId }) {
  const field = config.field ?? '';
  const sanitize = config.sanitize ?? true;
  const breaks = config.breaks ?? true;
  const outputField = config.outputField ?? 'html';

  const Toggle = ({ label, desc, k, value }) => (
    <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
      <div>
        <p className="text-[12px] font-semibold text-zinc-300">{label}</p>
        <p className="text-[10px] text-zinc-600">{desc}</p>
      </div>
      <button onClick={() => updateConfig(k, !value)}
        className={`w-10 h-5 rounded-full border transition-all relative ${value ? 'bg-indigo-500 border-indigo-400' : 'bg-zinc-700 border-zinc-600'}`}>
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${value ? 'left-5' : 'left-0.5'}`} />
      </button>
    </div>
  );

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
          <BookOpen className="w-4 h-4 text-indigo-400" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Markdown Renderer</div>
          <div className="text-[11px] text-zinc-500">Convert markdown to HTML</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Markdown Field</label>
        <SmartVariableInput value={field} onChange={(v) => updateConfig('field', v)} placeholder="{{ $json.markdown }}" />
      </div>

      <Toggle label="Sanitize HTML" desc="Remove dangerous tags like <script>" k="sanitize" value={sanitize} />
      <Toggle label="GFM Line Breaks" desc="Convert single newlines to <br>" k="breaks" value={breaks} />

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Output Field</label>
        <input value={outputField} onChange={(e) => updateConfig('outputField', e.target.value)} placeholder="html"
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 font-mono focus:outline-none focus:border-zinc-500" />
      </div>
    </div>
  );
}
