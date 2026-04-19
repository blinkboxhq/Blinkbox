import SmartVariableInput from "../../../../components/ui/SmartVariableInput";

export default function PDFGeneratorNode({ config = {}, updateConfig, nodeId }) {
  return (
    <div className="flex flex-col gap-5 w-full">
      <div className="flex items-center gap-3 p-4 bg-rose-500/5 border border-rose-500/20 rounded-xl">
        <div className="flex flex-col">
          <span className="text-sm font-bold text-rose-400">PDF Generator</span>
          <span className="text-[10px] text-zinc-500">Generate a PDF from HTML or Markdown content</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Content Type</label>
        <div className="grid grid-cols-2 gap-2">
          {[{ id: "html", label: "HTML" }, { id: "markdown", label: "Markdown" }].map((t) => (
            <button
              key={t.id}
              onClick={() => updateConfig("contentType", t.id)}
              className={`py-2.5 rounded-lg border text-xs font-bold transition-all ${
                (config.contentType || "html") === t.id
                  ? "bg-rose-500/10 border-rose-500/40 text-rose-400"
                  : "bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Content</label>
        <SmartVariableInput
          value={config.content || ""}
          onChange={(v) => updateConfig("content", v)}
          placeholder="{{upstream.html}} or paste HTML/Markdown here"
          nodeId={nodeId}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Page Format</label>
          <select
            value={config.format || "A4"}
            onChange={(e) => updateConfig("format", e.target.value)}
            className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500/40"
          >
            {["A4", "Letter", "A3", "Legal"].map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Margin (px)</label>
          <input
            type="number" min="0" max="200"
            value={config.margin ?? 20}
            onChange={(e) => updateConfig("margin", parseInt(e.target.value))}
            className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-rose-500/40"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Filename</label>
        <input
          value={config.filename || "document.pdf"}
          onChange={(e) => updateConfig("filename", e.target.value)}
          className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-rose-500/40"
        />
      </div>
    </div>
  );
}
