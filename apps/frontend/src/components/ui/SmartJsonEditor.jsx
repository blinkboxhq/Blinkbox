import { useState, useCallback, useRef } from "react";
import { AlertTriangle, Check, Braces } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// SmartJsonEditor — Drop-in replacement for raw <textarea> JSON inputs.
//
// Features:
//   1. Auto-formats (pretty-prints) valid JSON on blur
//   2. Extracts line number + reason from SyntaxError on invalid JSON
//   3. Shows a specific, actionable error message (not "Invalid JSON")
//   4. Green border + checkmark when valid, red + warning when invalid
// ─────────────────────────────────────────────────────────────────────────────

function parseJsonError(raw) {
  if (!raw || raw.trim() === "") return null;

  try {
    JSON.parse(raw);
    return null;
  } catch (err) {
    const msg = err.message || "Unknown JSON error";

    // V8: "Expected ',' ... at position 42"
    // Extract position if available
    const posMatch = msg.match(/position\s+(\d+)/i);
    let line = null;
    let col = null;

    if (posMatch) {
      const pos = parseInt(posMatch[1], 10);
      const before = raw.slice(0, pos);
      line = (before.match(/\n/g) || []).length + 1;
      col = pos - before.lastIndexOf("\n");
    }

    // Clean up the message for humans
    let reason = msg
      .replace(/^JSON\.parse:\s*/i, "")
      .replace(/\s+in JSON at position \d+/i, "")
      .replace(/^Unexpected/i, "Unexpected");

    // Capitalize first letter
    reason = reason.charAt(0).toUpperCase() + reason.slice(1);

    return { line, col, reason };
  }
}

export default function SmartJsonEditor({
  value = "",
  onChange,
  placeholder = '{\n  "key": "value"\n}',
  rows = 8,
  label,
  className = "",
}) {
  const [error, setError] = useState(null);
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef(null);

  const handleChange = useCallback(
    (e) => {
      const raw = e.target.value;
      onChange(raw);

      // Live validation
      const err = parseJsonError(raw);
      setError(err);
    },
    [onChange],
  );

  const handleBlur = useCallback(() => {
    setIsFocused(false);

    // Auto-format on blur if valid
    if (!value || value.trim() === "") return;
    try {
      const parsed = JSON.parse(value);
      const formatted = JSON.stringify(parsed, null, 2);
      if (formatted !== value) {
        onChange(formatted);
      }
      setError(null);
    } catch {
      // Keep the error state — user will see the message
      setError(parseJsonError(value));
    }
  }, [value, onChange]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const isValid = !error && value && value.trim() !== "";
  const isEmpty = !value || value.trim() === "";

  // Border color logic
  let borderClass = "border-[#222]";
  if (isFocused) {
    borderClass = error ? "border-red-500" : "border-blue-500";
  } else if (error) {
    borderClass = "border-red-500/50";
  } else if (isValid) {
    borderClass = "border-emerald-500/30";
  }

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {/* Header row */}
      {label && (
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <Braces className="w-3.5 h-3.5 text-blue-400" />
            {label}
          </label>

          {/* Status indicator */}
          {!isEmpty && (
            <span className="flex items-center gap-1 text-[10px] font-bold">
              {isValid && (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">Valid JSON</span>
                </>
              )}
              {error && (
                <>
                  <AlertTriangle className="w-3 h-3 text-red-400" />
                  <span className="text-red-400">Syntax Error</span>
                </>
              )}
            </span>
          )}
        </div>
      )}

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        placeholder={placeholder}
        rows={rows}
        spellCheck={false}
        className={`w-full bg-[#0a0a0a] border ${borderClass} rounded-lg p-4 text-xs text-blue-100 font-mono focus:outline-none transition-all resize-none shadow-inner leading-relaxed`}
      />

      {/* Error detail — specific line + reason */}
      {error && (
        <div className="flex items-start gap-2 px-3 py-2 bg-red-500/5 border border-red-500/20 rounded-lg">
          <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] text-red-300 font-medium">
              {error.reason}
            </span>
            {error.line && (
              <span className="text-[10px] text-red-400/70 font-mono">
                Line {error.line}
                {error.col ? `, Column ${error.col}` : ""}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
