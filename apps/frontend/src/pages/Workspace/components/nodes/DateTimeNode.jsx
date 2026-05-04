import SmartVariableInput from "../../../../components/ui/SmartVariableInput";

const OPERATIONS = [
  { value: "now",      label: "Current Time" },
  { value: "format",   label: "Format Date" },
  { value: "parse",    label: "Parse Date" },
  { value: "add",      label: "Add Duration" },
  { value: "subtract", label: "Subtract Duration" },
  { value: "diff",     label: "Date Difference" },
  { value: "convert",  label: "Convert Timezone" },
];

const UNITS = [
  { value: "ms", label: "Milliseconds" },
  { value: "s",  label: "Seconds" },
  { value: "m",  label: "Minutes" },
  { value: "h",  label: "Hours" },
  { value: "d",  label: "Days" },
  { value: "w",  label: "Weeks" },
  { value: "M",  label: "Months" },
  { value: "y",  label: "Years" },
];

export default function DateTimeNode({ config = {}, updateConfig, nodeId }) {
  const op = config.operation || "now";
  const needsDate = op !== "now";
  const needsDate2 = op === "diff";
  const needsAmount = op === "add" || op === "subtract";
  const needsFormat = op === "format" || op === "now";
  const needsTZ = op === "convert";

  return (
    <div className="flex flex-col gap-5 w-full">
      <div className="flex items-center gap-3 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
        <div className="flex flex-col">
          <span className="text-sm font-bold text-amber-400">Date / Time</span>
          <span className="text-[10px] text-zinc-500">Format, parse, add, diff, and convert dates</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Operation</label>
        <div className="grid grid-cols-2 gap-1.5">
          {OPERATIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => updateConfig("operation", o.value)}
              className={`py-2 rounded-lg border text-xs font-bold transition-all ${
                op === o.value
                  ? "bg-amber-500/10 border-amber-500/40 text-amber-400"
                  : "bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {needsDate && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Date</label>
          <SmartVariableInput
            value={config.date || ""}
            onChange={(v) => updateConfig("date", v)}
            placeholder="{{n1.createdAt}}  or  2024-01-15T10:00:00Z"
          />
        </div>
      )}

      {needsDate2 && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Second Date</label>
          <SmartVariableInput
            value={config.date2 || ""}
            onChange={(v) => updateConfig("date2", v)}
            placeholder="{{n1.endDate}}"
          />
        </div>
      )}

      {needsAmount && (
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Amount</label>
            <input
              type="number"
              value={config.amount || 1}
              onChange={(e) => updateConfig("amount", Number(e.target.value))}
              className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500/40"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Unit</label>
            <select
              value={config.unit || "d"}
              onChange={(e) => updateConfig("unit", e.target.value)}
              className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/40"
            >
              {UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select>
          </div>
        </div>
      )}

      {needsFormat && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Output Format</label>
          <input
            value={config.format || ""}
            onChange={(e) => updateConfig("format", e.target.value)}
            placeholder="YYYY-MM-DD  (blank = ISO 8601)"
            className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500/40"
          />
          <p className="text-[10px] text-zinc-600">Tokens: YYYY MM DD HH mm ss SSS</p>
        </div>
      )}

      {needsTZ && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Target Timezone</label>
          <input
            value={config.timezone || ""}
            onChange={(e) => updateConfig("timezone", e.target.value)}
            placeholder="America/New_York"
            className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500/40"
          />
          <p className="text-[10px] text-zinc-600">IANA timezone string, e.g. Europe/London</p>
        </div>
      )}
    </div>
  );
}
