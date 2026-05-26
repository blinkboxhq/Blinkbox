import SmartVariableInput from "@/components/ui/SmartVariableInput";

const OPERATORS = [
  { value: "equals",      label: "equals" },
  { value: "notEquals",   label: "not equals" },
  { value: "contains",    label: "contains" },
  { value: "notContains", label: "not contains" },
  { value: "startsWith",  label: "starts with" },
  { value: "endsWith",    label: "ends with" },
  { value: "gt",          label: ">" },
  { value: "gte",         label: ">=" },
  { value: "lt",          label: "<" },
  { value: "lte",         label: "<=" },
  { value: "isEmpty",     label: "is empty" },
  { value: "isNotEmpty",  label: "is not empty" },
  { value: "exists",      label: "exists" },
  { value: "notExists",   label: "does not exist" },
];

const noValueOps = ["isEmpty", "isNotEmpty", "exists", "notExists"];

export default function FilterArrayNode({ config = {}, updateConfig, nodeId }) {
  const op = config.operator || "equals";
  const needsValue = !noValueOps.includes(op);

  return (
    <div className="flex flex-col gap-5 w-full">
      <div className="flex items-center gap-3 p-4 bg-pink-500/5 border border-pink-500/20 rounded-xl">
          <div className="w-8 h-8 rounded-lg bg-[#F97316]/10 border border-[#F97316]/20 flex items-center justify-center shrink-0">
            <Filter className="w-4 h-4 text-[#F97316]" />
          </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-pink-400">Filter Array</span>
          <span className="text-[10px] text-zinc-500">Keep items matching a condition</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Array Path</label>
        <SmartVariableInput
          value={config.arrayPath || ""}
          onChange={(v) => updateConfig("arrayPath", v)}
          placeholder="items  (blank = use entire input)"
        />
        <p className="text-[10px] text-zinc-600">Dot-path to array in input, e.g. results.data</p>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Field to Test</label>
        <SmartVariableInput
          value={config.field || ""}
          onChange={(v) => updateConfig("field", v)}
          placeholder="status  (dot-path within each item)"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Operator</label>
        <select
          value={op}
          onChange={(e) => updateConfig("operator", e.target.value)}
          className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-pink-500/40"
        >
          {OPERATORS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {needsValue && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Value</label>
          <SmartVariableInput
            value={config.value || ""}
            onChange={(v) => updateConfig("value", v)}
            placeholder="active"
          />
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Output Key</label>
        <input
          value={config.outputKey || "items"}
          onChange={(e) => updateConfig("outputKey", e.target.value)}
          className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-pink-500/40"
        />
      </div>
    </div>
  );
}
