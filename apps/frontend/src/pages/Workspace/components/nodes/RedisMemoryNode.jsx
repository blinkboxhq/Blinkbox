/**
 * REDIS MEMORY NODE — Config Panel
 *
 * Stores conversation history in Redis as a JSON array keyed by Session ID.
 * Supports TTL for automatic expiry of stale sessions.
 *
 * Config fields:
 *   sessionId    — Redis key for the conversation
 *   credentialId — Redis connection URL credential
 *   ttl          — Time-to-live in seconds (0 = no expiry)
 */

import { Brain, Settings2, Hash, Clock } from "lucide-react";
import SmartVariableInput from "../../../../components/ui/SmartVariableInput";
import CredentialPicker from "../../../../components/ui/CredentialPicker";

export default function RedisMemoryNode({ config = {}, updateConfig }) {
  return (
    <div className="flex flex-col gap-5 w-full">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 p-4 bg-purple-500/5 border border-purple-500/20 rounded-xl">
        <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded-lg text-purple-400 shrink-0">
          <Brain className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-purple-400">Redis Memory</span>
          <span className="text-[10px] text-zinc-500 mt-0.5">
            Persistent chat history via Redis
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

        {/* TTL */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-zinc-500 w-28 flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-purple-400" /> TTL (sec)
          </span>
          <input
            type="number"
            min={0}
            value={config.ttl ?? 3600}
            onChange={(e) =>
              updateConfig("ttl", Math.max(0, parseInt(e.target.value, 10) || 0))
            }
            className="flex-1 bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-purple-500/50 transition-colors"
          />
        </div>
        <p className="text-[10px] text-zinc-600 -mt-1 pl-1">
          0 = no expiry. Messages persist until manually deleted.
        </p>
      </div>

      {/* ── Credential ──────────────────────────────────────────────────── */}
      <CredentialPicker
        value={config.credentialId || ""}
        onChange={(id) => updateConfig("credentialId", id)}
        accentColor="purple"
        label="Redis Connection URL"
        placeholder="Select Redis credential..."
      />
    </div>
  );
}
