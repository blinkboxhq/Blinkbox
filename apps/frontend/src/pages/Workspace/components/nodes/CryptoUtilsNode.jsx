import { Lock } from 'lucide-react';
import SmartVariableInput from "../../../../components/ui/SmartVariableInput";

const OPERATIONS = [
  { value: "hash",         label: "Hash" },
  { value: "hmac",         label: "HMAC Sign" },
  { value: "base64encode", label: "Base64 Encode" },
  { value: "base64decode", label: "Base64 Decode" },
  { value: "uuid",         label: "Generate UUID" },
  { value: "random",       label: "Random Bytes" },
];

const ALGORITHMS = ["sha256", "sha512", "sha1", "md5"];
const ENCODINGS  = ["hex", "base64", "base64url"];

export default function CryptoUtilsNode({ config = {}, updateConfig, nodeId }) {
  const op = config.operation || "hash";
  const needsInput  = !["uuid", "random"].includes(op);
  const needsAlgo   = ["hash", "hmac"].includes(op);
  const needsSecret = op === "hmac";
  const needsEnc    = ["hash", "hmac"].includes(op);
  const needsLength = op === "random";

  return (
    <div className="flex flex-col gap-5 w-full">
      <div className="flex items-center gap-3 p-4 bg-red-500/5 border border-red-500/20 rounded-xl">
          <div className="w-8 h-8 rounded-lg bg-[#059669]/10 border border-[#059669]/20 flex items-center justify-center shrink-0">
            <Lock className="w-4 h-4 text-[#059669]" />
          </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-red-400">Crypto Utils</span>
          <span className="text-[10px] text-zinc-500">Hash, HMAC, base64, UUID, random tokens</span>
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
                  ? "bg-red-500/10 border-red-500/40 text-red-400"
                  : "bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {needsInput && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Input</label>
          <SmartVariableInput
            value={config.input || ""}
            onChange={(v) => updateConfig("input", v)}
            placeholder="{{n1.payload}}"
          />
        </div>
      )}

      {needsAlgo && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Algorithm</label>
          <div className="grid grid-cols-4 gap-1.5">
            {ALGORITHMS.map((a) => (
              <button
                key={a}
                onClick={() => updateConfig("algorithm", a)}
                className={`py-2 rounded-lg border text-xs font-bold transition-all ${
                  (config.algorithm || "sha256") === a
                    ? "bg-red-500/10 border-red-500/40 text-red-400"
                    : "bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]"
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>
      )}

      {needsSecret && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Secret Key</label>
          <SmartVariableInput
            value={config.secret || ""}
            onChange={(v) => updateConfig("secret", v)}
            placeholder="{{env.WEBHOOK_SECRET}}"
          />
        </div>
      )}

      {needsEnc && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Output Encoding</label>
          <div className="grid grid-cols-3 gap-1.5">
            {ENCODINGS.map((e) => (
              <button
                key={e}
                onClick={() => updateConfig("encoding", e)}
                className={`py-2 rounded-lg border text-xs font-bold transition-all ${
                  (config.encoding || "hex") === e
                    ? "bg-red-500/10 border-red-500/40 text-red-400"
                    : "bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]"
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      )}

      {needsLength && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Byte Length</label>
          <input
            type="number"
            min="1"
            max="256"
            value={config.length || 16}
            onChange={(e) => updateConfig("length", Number(e.target.value))}
            className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-red-500/40"
          />
          <p className="text-[10px] text-zinc-600">Output: hex string (2x length) and base64</p>
        </div>
      )}
    </div>
  );
}
