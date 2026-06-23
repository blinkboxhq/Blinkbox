import { Repeat, ChevronDown } from "lucide-react";
import { useState } from "react";
import SmartVariableInput from "@/components/ui/SmartVariableInput";

const OPERATORS = [
  { value: "equals", label: "==" },
  { value: "notEquals", label: "!=" },
  { value: "gt", label: ">" },
  { value: "gte", label: ">=" },
  { value: "lt", label: "<" },
  { value: "lte", label: "<=" },
  { value: "contains", label: "contains" },
  { value: "startsWith", label: "starts with" },
  { value: "endsWith", label: "ends with" },
  { value: "matches", label: "matches regex" },
  { value: "isEmpty", label: "is empty" },
  { value: "isNotEmpty", label: "is not empty" },
  { value: "exists", label: "exists" },
];

const NO_RIGHT = new Set(["isEmpty", "isNotEmpty", "exists", "notExists"]);

export default function LoopNode({ config = {}, updateConfig, nodeId }) {
  const arrayPath = config.arrayPath || "";
  const maxIterations = config.maxIterations || 1000;
  const breakCondition = config.breakCondition || null;
  const [showBreak, setShowBreak] = useState(!!breakCondition);

  const updateBreak = (field, value) => {
    updateConfig("breakCondition", {
      type: "compare",
      ...(breakCondition || { left: "", operator: "equals", right: "" }),
      [field]: value,
    });
  };

  const toggleBreak = () => {
    if (showBreak) {
      updateConfig("breakCondition", null);
      setShowBreak(false);
    } else {
      updateConfig("breakCondition", { type: "compare", left: "", operator: "equals", right: "" });
      setShowBreak(true);
    }
  };

  const bc = breakCondition || { left: "", operator: "equals", right: "" };

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
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Array Path</label>
        <SmartVariableInput
          value={arrayPath}
          onChange={(val) => updateConfig("arrayPath", val)}
          placeholder="e.g. data.items or users"
          nodeId={nodeId}
        />
        <p className="text-[10px] text-zinc-600 leading-relaxed">
          Dot-path to the array. Leave blank to loop over the entire input.
        </p>
      </div>

      {/* Max Iterations */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Max Iterations</label>
        <input
          type="number"
          min={1}
          max={100000}
          value={maxIterations}
          onChange={(e) => updateConfig("maxIterations", Number(e.target.value))}
          className="w-full bg-[#111] border border-[#333] rounded-md px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500/50 transition-colors"
        />
        <p className="text-[10px] text-zinc-600">Safety cap. Throws if array exceeds this size. Default: 1000.</p>
      </div>

      {/* Break Condition */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Break Condition</label>
          <button
            onClick={toggleBreak}
            className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase transition-colors ${showBreak ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-[#111] text-zinc-500 border border-[#333] hover:text-zinc-300'}`}
          >
            {showBreak ? "Enabled" : "Add"}
          </button>
        </div>

        {showBreak && (
          <div className="p-3 bg-[#0a0a0a] border border-[#222] rounded-xl flex flex-col gap-2">
            <p className="text-[9px] text-zinc-500">Stop iterating when this condition is met:</p>
            <div className="grid grid-cols-[1fr_auto_1fr] gap-1.5 items-center">
              <SmartVariableInput
                value={bc.left}
                onChange={(v) => updateBreak("left", v)}
                placeholder="{{ field }}"
                nodeId={nodeId}
              />
              <select
                value={bc.operator}
                onChange={(e) => updateBreak("operator", e.target.value)}
                className="bg-[#111] border border-[#333] rounded-md px-1.5 py-1.5 text-[10px] text-white font-bold focus:outline-none cursor-pointer"
              >
                {OPERATORS.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
              </select>
              {!NO_RIGHT.has(bc.operator) ? (
                <SmartVariableInput
                  value={bc.right}
                  onChange={(v) => updateBreak("right", v)}
                  placeholder="value"
                  nodeId={nodeId}
                />
              ) : (
                <div className="text-[10px] text-zinc-600 italic px-1">—</div>
              )}
            </div>
            <p className="text-[9px] text-zinc-600">
              Evaluated against each item before it's emitted. When true, iteration stops.
            </p>
          </div>
        )}
      </div>

      {/* Output Preview */}
      <div className="flex flex-col gap-2 p-3 bg-zinc-800/40 border border-zinc-700/30 rounded-lg">
        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Each iteration outputs</span>
        <div className="flex flex-wrap gap-2">
          {["item fields", "__loopIndex", "__loopTotal"].map((field) => (
            <span key={field} className="px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded text-[10px] font-mono text-amber-300">
              {field}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
