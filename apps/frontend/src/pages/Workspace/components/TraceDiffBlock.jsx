import { AlertCircle } from "lucide-react";

/**
 * TraceDiffBlock — renders expected vs received input diff for failed nodes.
 *
 * @param {{ expected: object, received: object, message: string }} props
 */
export default function TraceDiffBlock({ expected, received, message }) {
  return (
    <div className="mt-3 rounded-lg border border-red-500/20 overflow-hidden">
      {/* Expected */}
      <div className="bg-emerald-500/5 border-b border-zinc-800 px-3 py-2">
        <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-500 mb-1">
          Expected Input
        </p>
        <pre className="text-[10px] text-emerald-300/80 font-mono leading-relaxed whitespace-pre-wrap break-all">
          {typeof expected === "string" ? expected : JSON.stringify(expected, null, 2)}
        </pre>
      </div>

      {/* Received */}
      <div className="bg-red-500/5 border-b border-zinc-800 px-3 py-2">
        <p className="text-[9px] font-bold uppercase tracking-widest text-red-500 mb-1">
          Received Input
        </p>
        <pre className="text-[10px] text-red-300/80 font-mono leading-relaxed whitespace-pre-wrap break-all">
          {typeof received === "string" ? received : JSON.stringify(received, null, 2)}
        </pre>
      </div>

      {/* Diagnostic message */}
      {message && (
        <div className="flex items-start gap-2 px-3 py-2 bg-zinc-900/50">
          <AlertCircle className="w-3 h-3 text-red-400 mt-0.5 shrink-0" />
          <p className="text-[10px] text-red-300 leading-relaxed">{message}</p>
        </div>
      )}
    </div>
  );
}
