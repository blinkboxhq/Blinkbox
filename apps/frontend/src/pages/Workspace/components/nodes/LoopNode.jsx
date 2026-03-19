import { Repeat } from "lucide-react";
import SmartVariableInput from "../../../../components/ui/SmartVariableInput";

export default function LoopNode({ config, updateConfig }) {
  const arrayPath = config.arrayPath || "";

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
        <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400 shrink-0">
          <Repeat className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-amber-400">Loop</span>
          <span className="text-[10px] text-zinc-400 leading-relaxed">
            Iterate over each item in an array. Downstream nodes run once per item.
          </span>
        </div>
      </div>

      {/* Array Path */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
          Array Path
        </label>
        <SmartVariableInput
          value={arrayPath}
          onChange={(val) => updateConfig("arrayPath", val)}
          placeholder="e.g. data.items or users"
        />
        <p className="text-[10px] text-zinc-600 leading-relaxed">
          Dot-path to the array in the upstream output. Leave blank to loop over the entire input.
        </p>
      </div>

      {/* Output Preview */}
      <div className="flex flex-col gap-2 p-3 bg-zinc-800/40 border border-zinc-700/30 rounded-lg">
        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
          Each iteration outputs
        </span>
        <div className="flex flex-wrap gap-2">
          {["item (object)", "__loopIndex (number)", "__loopTotal (number)"].map(
            (field) => (
              <span
                key={field}
                className="px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded text-[10px] font-mono text-amber-300"
              >
                {field}
              </span>
            ),
          )}
        </div>
      </div>
    </div>
  );
}
