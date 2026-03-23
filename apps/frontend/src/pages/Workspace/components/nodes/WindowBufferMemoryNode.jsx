/**
 * WINDOW BUFFER MEMORY NODE — Config Panel
 *
 * Simplest memory strategy: keeps the last N messages in a sliding window.
 * No external dependencies — purely in-memory truncation.
 *
 * Config fields:
 *   sessionId  — Groups messages by conversation session
 *   windowSize — How many recent messages to keep (default: 20)
 */

import { Brain, Settings2, Hash } from "lucide-react";
import SmartVariableInput from "../../../../components/ui/SmartVariableInput";

export default function WindowBufferMemoryNode({ config = {}, updateConfig }) {
  return (
    <div className="flex flex-col gap-5 w-full">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 p-4 bg-purple-500/5 border border-purple-500/20 rounded-xl">
        <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded-lg text-purple-400 shrink-0">
          <Brain className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-purple-400">Window Buffer</span>
          <span className="text-[10px] text-zinc-500 mt-0.5">
            Keep last N messages in memory
          </span>
        </div>
      </div>

      {/* ── Config ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 bg-[#0a0a0a] p-4 border border-[#222] rounded-xl shadow-inner">
        <div className="flex items-center gap-2 pb-3 border-b border-[#222]">
          <Settings2 className="w-4 h-4 text-purple-500" />
          <span className="text-xs font-bold text-zinc-300 uppercase tracking-widest">
            Config
          </span>
        </div>

        {/* Session ID */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
            <Hash className="w-3 h-3 text-purple-400" /> Session ID
          </label>
          <SmartVariableInput
            value={config.sessionId || ""}
            onChange={(val) => updateConfig("sessionId", val)}
            placeholder="e.g. {{webhook.body.sessionId}}"
          />
        </div>

        {/* Window Size */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-zinc-500 w-28">Keep Last N</span>
          <input
            type="number"
            min={1}
            max={500}
            value={config.windowSize ?? 20}
            onChange={(e) =>
              updateConfig("windowSize", Math.max(1, parseInt(e.target.value, 10) || 20))
            }
            className="flex-1 bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-purple-500/50 transition-colors"
          />
        </div>
      </div>
    </div>
  );
}
