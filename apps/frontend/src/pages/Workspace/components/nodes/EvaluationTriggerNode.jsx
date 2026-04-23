import { Handle, Position } from '@xyflow/react';
import { Plus, FlaskConical, AlertCircle, LayoutList, Zap } from 'lucide-react';
import SmartJsonEditor from '../../../../components/ui/SmartJsonEditor';

export default function EvaluationTriggerNode({ config = {}, updateConfig, selected }) {
  const testDataset = config.testDataset || '[\n  { "message": "Hello, world!" },\n  { "message": "How are you?" }\n]';
  const iterationMode = config.iterationMode || 'sequential';

  let itemCount = 0;
  try {
    const parsed = JSON.parse(testDataset);
    if (Array.isArray(parsed)) itemCount = parsed.length;
  } catch (_) {
    itemCount = -1;
  }

  return (
    <div className={`relative flex flex-col w-[280px] bg-[#0A0A0A] rounded-xl border transition-colors shadow-2xl font-sans group ${selected ? 'border-orange-500/50' : 'border-[#2A2A2A]'}`}>

      <Handle
        id="output"
        type="source"
        position={Position.Right}
        className="!w-5 !h-5 !flex items-center justify-center !bg-[#111111] !border !border-[#2A2A2A] !rounded-full !opacity-0 group-hover:!opacity-100 transition-all hover:!bg-orange-500 hover:!border-orange-500 text-zinc-500 hover:text-white shadow-xl z-50 cursor-crosshair"
        style={{ top: '20px', right: '-10px', transform: 'translateY(-50%)' }}
      >
        <Plus className="w-3 h-3 pointer-events-none" />
      </Handle>

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#2A2A2A] bg-[#111111] rounded-t-xl">
        <div className="flex items-center gap-2">
          <div className="p-1 bg-[#222] rounded-md border border-[#333]">
            <FlaskConical className="w-3 h-3 text-orange-400" />
          </div>
          <span className="text-[11px] font-semibold text-zinc-200 tracking-wide">Evaluation Trigger</span>
        </div>
        {itemCount >= 0 && (
          <span className="text-[9px] font-mono text-zinc-600 bg-[#161616] border border-[#222] rounded px-1.5 py-0.5">
            {itemCount} item{itemCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="p-3 flex flex-col gap-3">

        {/* Info banner */}
        <div className="flex items-start gap-2.5 p-2.5 bg-orange-500/5 border border-orange-500/15 rounded-lg">
          <AlertCircle className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" />
          <p className="text-[10px] text-zinc-500 leading-relaxed">
            Only the <span className="text-orange-400 font-semibold">first item</span> runs now. Full batch evaluation is coming soon.
          </p>
        </div>

        {/* Test dataset */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Test Dataset</label>
          <SmartJsonEditor
            label="Dataset"
            value={testDataset}
            onChange={(val) => updateConfig?.('testDataset', val)}
            rows={7}
          />
          {itemCount === -1 && (
            <p className="text-[9px] text-red-400">Invalid JSON — must be an array of objects.</p>
          )}
        </div>

        {/* Iteration mode */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Iteration Mode</label>
          <div className="flex gap-1.5">
            <button
              onClick={() => updateConfig?.('iterationMode', 'sequential')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-[10px] font-semibold transition-all ${iterationMode === 'sequential' ? 'bg-orange-500/15 border-orange-500/40 text-orange-400' : 'bg-[#111] border-[#222] text-zinc-600 hover:text-zinc-400'}`}
            >
              <LayoutList className="w-3 h-3" /> Sequential
            </button>
            <button
              onClick={() => updateConfig?.('iterationMode', 'parallel')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-[10px] font-semibold transition-all ${iterationMode === 'parallel' ? 'bg-orange-500/15 border-orange-500/40 text-orange-400' : 'bg-[#111] border-[#222] text-zinc-600 hover:text-zinc-400'}`}
            >
              <Zap className="w-3 h-3" /> Parallel
            </button>
          </div>
        </div>

        {/* Variables */}
        <div className="flex flex-col gap-1 p-2.5 bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg">
          <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-0.5">Available in workflow as</span>
          {[
            ['$trigger.*', 'Every field from the current dataset item'],
            ['$trigger.message', 'Example field (from default dataset)'],
          ].map(([key, desc]) => (
            <div key={key} className="flex items-baseline gap-2">
              <span className="text-[10px] font-mono text-orange-400 shrink-0">{key}</span>
              <span className="text-[9px] text-zinc-600">{desc}</span>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
