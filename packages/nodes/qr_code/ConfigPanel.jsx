import { QrCode } from 'lucide-react';
import SmartVariableInput from "@/components/ui/SmartVariableInput";

export default function QRCodeNode({ config = {}, updateConfig, nodeId }) {
  return (
    <div className="flex flex-col gap-5 w-full">
      <div className="flex items-center gap-3 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
          <div className="w-8 h-8 rounded-lg bg-[#111827]/10 border border-[#111827]/20 flex items-center justify-center shrink-0">
            <QrCode className="w-4 h-4 text-[#111827]" />
          </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-emerald-400">QR Code Generator</span>
          <span className="text-[10px] text-zinc-500">Generate a QR code as a base64 PNG image</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Content to Encode</label>
        <SmartVariableInput
          value={config.content || ""}
          onChange={(v) => updateConfig("content", v)}
          placeholder="https://example.com or any text"
          nodeId={nodeId}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Size (px)</label>
        <input
          type="number" min="100" max="1000" step="50"
          value={config.size ?? 300}
          onChange={(e) => updateConfig("size", parseInt(e.target.value))}
          className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500/40"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Error Correction</label>
        <div className="grid grid-cols-4 gap-2">
          {["L", "M", "Q", "H"].map((lvl) => (
            <button
              key={lvl}
              onClick={() => updateConfig("errorCorrection", lvl)}
              className={`py-2.5 rounded-lg border text-xs font-bold transition-all ${
                (config.errorCorrection || "M") === lvl
                  ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400"
                  : "bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]"
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>
        <p className="text-[9px] text-zinc-600">L = 7%, M = 15%, Q = 25%, H = 30% recovery</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Dark Color</label>
          <input
            type="color"
            value={config.darkColor || "#000000"}
            onChange={(e) => updateConfig("darkColor", e.target.value)}
            className="w-full h-9 rounded-lg border border-[#222] bg-[#0a0a0a] cursor-pointer"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Light Color</label>
          <input
            type="color"
            value={config.lightColor || "#ffffff"}
            onChange={(e) => updateConfig("lightColor", e.target.value)}
            className="w-full h-9 rounded-lg border border-[#222] bg-[#0a0a0a] cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}
