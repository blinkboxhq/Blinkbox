import SmartVariableInput from "@/components/ui/SmartVariableInput";

export default function ImageResizeNode({ config = {}, updateConfig, nodeId }) {
  return (
    <div className="flex flex-col gap-5 w-full">
      <div className="flex items-center gap-3 p-4 bg-fuchsia-500/5 border border-fuchsia-500/20 rounded-xl">
          <div className="w-8 h-8 rounded-lg bg-[#8B5CF6]/10 border border-[#8B5CF6]/20 flex items-center justify-center shrink-0">
            <Image className="w-4 h-4 text-[#8B5CF6]" />
          </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-fuchsia-400">Image Resize</span>
          <span className="text-[10px] text-zinc-500">Resize, compress, or convert images</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Image Source</label>
        <SmartVariableInput
          value={config.source || ""}
          onChange={(v) => updateConfig("source", v)}
          placeholder="{{upstream.dataUrl}} or https://..."
          nodeId={nodeId}
        />
        <p className="text-[9px] text-zinc-600">Base64 data URL or HTTP/HTTPS URL</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Width (px)</label>
          <input
            type="number" min="1" placeholder="auto"
            value={config.width || ""}
            onChange={(e) => updateConfig("width", e.target.value || "")}
            className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-fuchsia-500/40"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Height (px)</label>
          <input
            type="number" min="1" placeholder="auto"
            value={config.height || ""}
            onChange={(e) => updateConfig("height", e.target.value || "")}
            className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-fuchsia-500/40"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Fit Mode</label>
        <select
          value={config.fit || "cover"}
          onChange={(e) => updateConfig("fit", e.target.value)}
          className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-fuchsia-500/40"
        >
          <option value="cover">Cover (fill, crop if needed)</option>
          <option value="contain">Contain (fit inside, no crop)</option>
          <option value="fill">Fill (stretch)</option>
          <option value="inside">Inside (never enlarge)</option>
          <option value="outside">Outside (never shrink)</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Format</label>
          <select
            value={config.format || "jpeg"}
            onChange={(e) => updateConfig("format", e.target.value)}
            className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-fuchsia-500/40"
          >
            {["jpeg", "png", "webp", "avif"].map((f) => (
              <option key={f} value={f}>{f.toUpperCase()}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Quality (1–100)</label>
          <input
            type="number" min="1" max="100"
            value={config.quality ?? 80}
            onChange={(e) => updateConfig("quality", parseInt(e.target.value))}
            className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-fuchsia-500/40"
          />
        </div>
      </div>
    </div>
  );
}
