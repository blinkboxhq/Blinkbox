import { useState, useRef } from "react";
import { Sparkles, UploadCloud, FileText, X, CheckCircle2 } from "lucide-react";

const ACCENT = "#f472b6";
const ACCEPT = ".md,.markdown,.txt,.mdx,.json,.zip";
const MAX_BYTES = 512 * 1024;

function parseSkillMeta(text) {
  const fm = text.match(/^---\s*[\r\n]([\s\S]*?)[\r\n]---/);
  const out = {};
  if (fm) {
    for (const line of fm[1].split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_-]+)\s*:\s*(.+?)\s*$/);
      if (m) out[m[1].toLowerCase()] = m[2].replace(/^["']|["']$/g, "");
    }
  }
  if (!out.name) {
    const h1 = text.match(/^#\s+(.+)$/m);
    if (h1) out.name = h1[1].trim();
  }
  return out;
}

export default function AgentSkillNode({ config = {}, updateConfig }) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  const hasFile = !!config.fileName;

  const ingest = (file) => {
    setError("");
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setError("File too large (max 512 KB). Zip large skills or trim the instructions.");
      return;
    }
    const isZip = /\.zip$/i.test(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result || "";
      if (isZip) {
        updateConfig?.("fileName", file.name);
        updateConfig?.("fileType", "zip");
        updateConfig?.("content", String(result));
        if (!config.name) updateConfig?.("name", file.name.replace(/\.zip$/i, ""));
      } else {
        const text = String(result);
        const meta = parseSkillMeta(text);
        updateConfig?.("fileName", file.name);
        updateConfig?.("fileType", "text");
        updateConfig?.("content", text);
        if (meta.name) updateConfig?.("name", meta.name);
        else if (!config.name) updateConfig?.("name", file.name.replace(/\.[^.]+$/, ""));
        if (meta.description) updateConfig?.("description", meta.description);
      }
    };
    reader.onerror = () => setError("Couldn't read that file. Try again.");
    if (isZip) reader.readAsDataURL(file);
    else reader.readAsText(file);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    ingest(e.dataTransfer.files?.[0]);
  };

  const clearFile = () => {
    updateConfig?.("fileName", "");
    updateConfig?.("fileType", "");
    updateConfig?.("content", "");
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="relative overflow-hidden rounded-xl" style={{ background: ACCENT + "12", border: `1px solid ${ACCENT}30` }}>
        <div className="flex items-center gap-3 px-4 py-3.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: ACCENT + "20", border: `1px solid ${ACCENT}40` }}>
            <Sparkles className="w-5 h-5" style={{ color: ACCENT }} strokeWidth={1.8} />
          </div>
          <div>
            <p className="text-[13px] font-bold text-zinc-100">Skill</p>
            <p className="text-[10px] text-zinc-500">Drop a skill file the agent loads on every run</p>
          </div>
        </div>
      </div>

      {!hasFile ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`flex flex-col items-center justify-center gap-2 px-4 py-8 rounded-xl border-2 border-dashed cursor-pointer transition-all ${dragging ? "bg-pink-500/10 border-pink-400/60" : "bg-[#0d0d0d] border-[#2a2a2a] hover:border-[#3a3a3a]"}`}
        >
          <UploadCloud className="w-7 h-7 text-zinc-500" strokeWidth={1.5} />
          <p className="text-[12px] font-semibold text-zinc-300">Drop a skill file here</p>
          <p className="text-[10px] text-zinc-600 text-center">or click to browse · SKILL.md, .md, .txt, .json, .zip</p>
          <input ref={inputRef} type="file" accept={ACCEPT} className="hidden"
            onChange={(e) => ingest(e.target.files?.[0])} />
        </div>
      ) : (
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#0d0d0d] border border-[#1f1f1f]">
          <FileText className="w-4 h-4 shrink-0" style={{ color: ACCENT }} />
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium text-zinc-200 truncate">{config.fileName}</p>
            <p className="text-[10px] text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Loaded
            </p>
          </div>
          <button onClick={clearFile} className="p-1 text-zinc-600 hover:text-zinc-300 transition-colors shrink-0" title="Remove">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {error && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] px-3 py-2 rounded-lg">{error}</div>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Skill Name</label>
        <input
          value={config.name || ""}
          onChange={(e) => updateConfig?.("name", e.target.value)}
          placeholder="e.g. PDF Form Filler"
          className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">When to use it</label>
        <textarea
          value={config.description || ""}
          onChange={(e) => updateConfig?.("description", e.target.value)}
          placeholder="Describe what this skill does so the agent knows when to reach for it."
          rows={3}
          className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 resize-none focus:outline-none focus:border-zinc-500"
        />
      </div>

      <div className="bg-zinc-900 border border-zinc-800 text-zinc-500 text-[11px] px-3 py-2 rounded-lg leading-relaxed">
        The agent reads the skill's instructions and only activates it when the task matches — just like Claude skills.
      </div>
    </div>
  );
}
