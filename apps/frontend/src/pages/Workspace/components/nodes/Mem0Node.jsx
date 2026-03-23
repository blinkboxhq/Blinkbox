/**
 * MEM0 NODE — Config Panel
 *
 * Integrates with the Mem0 REST API for long-term user memory.
 * Fetches a user's memory timeline — facts, preferences, and context
 * that persist across sessions.
 *
 * Config fields:
 *   userId       — Mem0 user identifier
 *   sessionId    — Optional session filter
 *   credentialId — Mem0 API key credential
 */

import { Brain, Settings2, Hash, User } from "lucide-react";
import SmartVariableInput from "../../../../components/ui/SmartVariableInput";
import CredentialPicker from "../../../../components/ui/CredentialPicker";

export default function Mem0Node({ config = {}, updateConfig }) {
  return (
    <div className="flex flex-col gap-5 w-full">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 p-4 bg-purple-500/5 border border-purple-500/20 rounded-xl">
        <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded-lg text-purple-400 shrink-0">
          <Brain className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-purple-400">Mem0</span>
          <span className="text-[10px] text-zinc-500 mt-0.5">
            Long-term user memory via Mem0 API
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

        {/* User ID */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
            <User className="w-3 h-3 text-purple-400" /> User ID
          </label>
          <SmartVariableInput
            value={config.userId || ""}
            onChange={(val) => updateConfig("userId", val)}
            placeholder="e.g. {{webhook.body.userId}}"
          />
        </div>

        {/* Session ID (optional) */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
            <Hash className="w-3 h-3 text-purple-400" /> Session ID
            <span className="text-zinc-600 normal-case tracking-normal">(optional)</span>
          </label>
          <SmartVariableInput
            value={config.sessionId || ""}
            onChange={(val) => updateConfig("sessionId", val)}
            placeholder="e.g. {{webhook.body.sessionId}}"
          />
        </div>
      </div>

      {/* ── Credential ──────────────────────────────────────────────────── */}
      <CredentialPicker
        value={config.credentialId || ""}
        onChange={(id) => updateConfig("credentialId", id)}
        accentColor="purple"
        label="Mem0 API Key"
        placeholder="Select Mem0 credential..."
      />
    </div>
  );
}
