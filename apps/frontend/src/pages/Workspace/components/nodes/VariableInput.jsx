export default function VariableInput({ label, value, onChange, placeholder, type = "text", className = "" }) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">{label}</label>}
      <input
        type={type}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-500 transition-colors font-mono shadow-inner ${className}`}
      />
    </div>
  );
}
