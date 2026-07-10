import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useLayoutEffect,
} from "react";
import * as Popover from "@radix-ui/react-popover";
import { AnimatePresence, motion } from "framer-motion";
import { Variable, ChevronRight, ChevronDown } from "lucide-react";
import useWorkspaceStore from "../../store/workspaceStore";

// ── Helpers ───────────────────────────────────────────────────────────────────

const TYPE_COLOR = {
  string: "text-emerald-400",
  number: "text-blue-400",
  boolean: "text-orange-400",
  object: "text-purple-400",
  array: "text-yellow-400",
};

const PILL_CLASS =
  "inline-flex items-center gap-1 bg-white/10 border border-white/15 " +
  "text-zinc-200 rounded px-1.5 py-0.5 font-mono text-[11px] leading-none " +
  "select-none cursor-default whitespace-nowrap mx-0.5 align-baseline";

/** Convert a contenteditable div's DOM back to a plain string with {{tokens}}. */
function serializeContent(el) {
  if (!el) return "";
  let result = "";
  for (const child of el.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      result += child.textContent;
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const token = child.dataset?.token;
      if (token) {
        result += `{{${token}}}`;
      } else if (child.tagName === "BR") {
        result += "\n";
      } else {
        result += child.innerText ?? child.textContent;
      }
    }
  }
  return result;
}

function escapeAttr(s) {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeText(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Build innerHTML from a string that may contain {{token}} placeholders. */
function buildHTML(str) {
  if (!str) return "";
  const parts = str.split(/(\{\{[^}]+\}\})/g);
  return parts.map((part) => {
    const m = part.match(/^\{\{([^}]+)\}\}$/);
    if (m) {
      const token = m[1];
      const label = escapeAttr(token.split(".").slice(-1)[0]);
      return `<span class="${PILL_CLASS}" data-token="${escapeAttr(token)}" contenteditable="false">&#123;&#123;&nbsp;${label}&nbsp;&#125;&#125;</span>`;
    }
    return escapeText(part);
  }).join("");
}

/** Insert a pill token at the current caret position inside a contenteditable. */
function insertTokenAtCursor(el, fullPath, shortLabel) {
  el.focus();
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return;

  const range = sel.getRangeAt(0);
  range.deleteContents();

  // Build the pill span
  const pill = document.createElement("span");
  pill.className = PILL_CLASS;
  pill.dataset.token = fullPath;
  pill.contentEditable = "false";
  pill.textContent = `{{ ${shortLabel} }}`;

  // Zero-width spacer so caret can land after pill
  const spacer = document.createTextNode("\u200B");

  range.insertNode(spacer);
  range.insertNode(pill);

  // Move caret after the spacer
  const after = document.createRange();
  after.setStartAfter(spacer);
  after.collapse(true);
  sel.removeAllRanges();
  sel.addRange(after);
}

// ── Schema Tree Components ────────────────────────────────────────────────────

function SchemaLeaf({ nodeId, path, label, type, onSelect }) {
  const fullPath = `${nodeId}.${path}`;
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        onSelect(fullPath, label);
      }}
      className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-neutral-400 hover:bg-zinc-700/50 hover:text-white transition-colors rounded"
    >
      <span className="flex items-center gap-1.5 font-mono">
        <span className="text-neutral-600">·</span>
        {label}
      </span>
      <span className={`text-[10px] font-bold uppercase ${TYPE_COLOR[type] || "text-neutral-600"}`}>
        {type}
      </span>
    </button>
  );
}

function SchemaSubtree({ nodeId, basePath, schema, onSelect, depth = 0 }) {
  const [open, setOpen] = useState(depth === 0);

  if (typeof schema === "string") {
    const parts = basePath.split(".");
    const label = parts[parts.length - 1];
    return (
      <SchemaLeaf
        nodeId={nodeId}
        path={basePath}
        label={label}
        type={schema}
        onSelect={onSelect}
      />
    );
  }

  const entries = Object.entries(schema).filter(
    ([k]) => !k.startsWith("_")
  );
  const parts = basePath.split(".");
  const label = parts[parts.length - 1];

  return (
    <div>
      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          setOpen((o) => !o);
        }}
        className="w-full flex items-center gap-1.5 px-3 py-1.5 text-xs text-neutral-300 hover:bg-zinc-700/30 transition-colors rounded"
      >
        {open ? (
          <ChevronDown className="w-3 h-3 text-neutral-500 shrink-0" />
        ) : (
          <ChevronRight className="w-3 h-3 text-neutral-500 shrink-0" />
        )}
        <span className="font-mono">{label}</span>
        <span className="ml-auto text-[10px] text-neutral-600 uppercase">
          object
        </span>
      </button>
      {open && (
        <div className="pl-3 border-l border-zinc-700/50 ml-4">
          {entries.map(([key, val]) => (
            <SchemaSubtree
              key={key}
              nodeId={nodeId}
              basePath={basePath ? `${basePath}.${key}` : key}
              schema={val}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function NodeGroup({ nodeId, nodeSchema, onSelect, schemaGeneration }) {
  const [open, setOpen] = useState(true);
  const { _label, _type, ...fields } = nodeSchema;
  const entries = Object.entries(fields);

  return (
    <div className="mb-1">
      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          setOpen((o) => !o);
        }}
        className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-semibold text-neutral-200 hover:bg-zinc-700/40 transition-colors rounded"
      >
        {open ? (
          <ChevronDown className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
        )}
        <span className="truncate">{_label || nodeId}</span>
        <span className="ml-auto text-[10px] text-neutral-600 font-normal uppercase shrink-0">
          {_type}
        </span>
      </button>

      {open && (
        <div className="pl-1">
          {entries.length === 0 ? (
            <p className="px-4 py-1.5 text-[11px] text-neutral-600 italic">
              No fields
            </p>
          ) : (
            entries.map(([key, val]) => (
              <SchemaSubtree
                key={`${key}-${schemaGeneration}`}
                nodeId={nodeId}
                basePath={key}
                schema={val}
                onSelect={onSelect}
                depth={0}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Token Hover Preview ───────────────────────────────────────────────────────

function resolveTokenPath(lastRunOutputs, tokenPath) {
  // tokenPath format: "nodeId.field.subfield"
  const parts = tokenPath.split(".");
  const nodeId = parts[0];
  const fieldPath = parts.slice(1);
  let value = lastRunOutputs?.[nodeId];
  for (const key of fieldPath) {
    if (value == null || typeof value !== "object") return undefined;
    value = value[key];
  }
  return value;
}

function formatPreviewValue(val) {
  if (val === undefined) return null;
  if (val === null) return "null";
  if (typeof val === "string") return val.length > 120 ? val.slice(0, 120) + "…" : val;
  if (typeof val === "object") {
    try {
      const s = JSON.stringify(val, null, 2);
      return s.length > 300 ? s.slice(0, 300) + "\n…" : s;
    } catch { return String(val); }
  }
  return String(val);
}

function TokenPreviewPopover({ token, anchorRect, lastRunOutputs, onClose }) {
  const resolved = resolveTokenPath(lastRunOutputs, token);
  const preview = formatPreviewValue(resolved);
  const parts = token.split(".");
  const label = parts.slice(1).join(".");

  return (
    <div
      className="fixed z-[9999] pointer-events-none"
      style={{
        top: (anchorRect?.bottom ?? 0) + 6,
        left: anchorRect?.left ?? 0,
      }}
    >
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl p-3 min-w-[160px] max-w-[280px]">
        <div className="text-[9px] font-bold uppercase tracking-widest text-neutral-400 mb-1.5">{label}</div>
        {preview !== null ? (
          <pre className="text-[10px] text-zinc-300 font-mono leading-relaxed whitespace-pre-wrap break-all max-h-32 overflow-auto">
            {preview}
          </pre>
        ) : (
          <p className="text-[10px] text-zinc-600 italic">No data from last run</p>
        )}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function SmartVariableInput({
  value = "",
  onChange,
  placeholder = "",
  label,
  className = "",
  multiline = false,
  nodeId: propNodeId,
}) {
  const [open, setOpen] = useState(false);
  const [hoveredToken, setHoveredToken] = useState(null);
  const [tokenAnchorRect, setTokenAnchorRect] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const editableRef = useRef(null);
  const isComposing = useRef(false);

  const selectedNodeId = useWorkspaceStore((s) => s.selectedNodeId);
  const getAvailableVariables = useWorkspaceStore(
    (s) => s.getAvailableVariables
  );
  const schemaGeneration = useWorkspaceStore((s) => s._schemaGeneration);
  const lastRunOutputs = useWorkspaceStore((s) => s.lastRunOutputs ?? {});

  const targetNodeId = propNodeId || selectedNodeId;
  const availableVars = getAvailableVariables(targetNodeId);
  const nodeEntries = Object.entries(availableVars);

  // ── Sync value → DOM (avoid cursor jump on every keystroke) ──────────────
  useLayoutEffect(() => {
    const el = editableRef.current;
    if (!el) return;
    const current = serializeContent(el);
    if (current !== value) {
      el.innerHTML = buildHTML(value);
      // Move caret to end on external value change
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, [value]);

  const handleInput = useCallback(() => {
    if (isComposing.current) return;
    const el = editableRef.current;
    if (!el) return;
    onChange(serializeContent(el));
  }, [onChange]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Escape") setOpen(false);
    },
    []
  );

  const handleTokenSelect = useCallback(
    (fullPath, shortLabel) => {
      const el = editableRef.current;
      if (!el) return;
      insertTokenAtCursor(el, fullPath, shortLabel);
      onChange(serializeContent(el));
      setOpen(false);
      el.focus();
    },
    [onChange]
  );

  // Token hover preview — delegate to pill spans inside contenteditable
  const handleMouseOver = useCallback((e) => {
    const pill = e.target.closest("[data-token]");
    if (pill) {
      setHoveredToken(pill.dataset.token);
      setTokenAnchorRect(pill.getBoundingClientRect());
    }
  }, []);

  const handleMouseOut = useCallback((e) => {
    const pill = e.target.closest("[data-token]");
    if (pill) {
      setHoveredToken(null);
      setTokenAnchorRect(null);
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDragEnter = useCallback(() => setIsDragOver(true), []);

  const handleDragLeave = useCallback(() => setIsDragOver(false), []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
    const text = e.dataTransfer.getData("text/plain");
    if (!text) return;
    const el = editableRef.current;
    if (!el) return;
    el.focus();
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      range.insertNode(document.createTextNode(text));
      range.collapse(false);
    } else {
      el.textContent += text;
    }
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }, []);

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
          {label}
        </label>
      )}

      {hoveredToken && tokenAnchorRect && (
        <TokenPreviewPopover
          token={hoveredToken}
          anchorRect={tokenAnchorRect}
          lastRunOutputs={lastRunOutputs}
        />
      )}

      <Popover.Root open={open} onOpenChange={setOpen}>
        <div className="relative">
          {/* Contenteditable input */}
          <div
            ref={editableRef}
            contentEditable
            suppressContentEditableWarning
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            onCompositionStart={() => (isComposing.current = true)}
            onCompositionEnd={() => {
              isComposing.current = false;
              handleInput();
            }}
            onMouseOver={handleMouseOver}
            onMouseOut={handleMouseOut}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            data-placeholder={placeholder}
            className={[
              "bb-glow-border w-full bg-[#0f0f0f] border border-[#3b3b3b] rounded-md px-3 py-2.5 pr-9",
              "text-[12.5px] text-neutral-100 font-mono focus:outline-none focus:border-[#545454]",
              "transition-colors empty:before:content-[attr(data-placeholder)]",
              "empty:before:text-neutral-600 empty:before:pointer-events-none",
              "min-h-[38px]",
              multiline ? "leading-relaxed" : "whitespace-nowrap overflow-x-auto",
              isDragOver ? "ring-2 ring-violet-500/40 bg-violet-500/5" : "",
            ].join(" ")}
          />

          {/* Trigger button */}
          <Popover.Trigger asChild>
            <button
              type="button"
              className={[
                "absolute right-2 p-1 rounded transition-colors",
                multiline ? "top-2.5" : "top-1/2 -translate-y-1/2",
                open
                  ? "text-white bg-white/10"
                  : "text-neutral-600 hover:text-neutral-400",
              ].join(" ")}
              title="Insert variable"
            >
              <Variable className="w-3.5 h-3.5" />
            </button>
          </Popover.Trigger>
        </div>

        {/* Portal popover — not clipped by sidebar overflow:hidden */}
        <Popover.Portal>
          <Popover.Content
            side="bottom"
            align="start"
            sideOffset={6}
            avoidCollisions
            className="z-[9999] w-72 outline-none"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <AnimatePresence>
              {open && (
                <motion.div
                  key="svi-popover"
                  initial={{ opacity: 0, y: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.97 }}
                  transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                  className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden"
                >
                  {/* Header */}
                  <div className="px-3 py-2 border-b border-zinc-800 flex items-center gap-2">
                    <Variable className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                    <span className="text-[11px] font-semibold text-neutral-300 uppercase tracking-wider">
                      Available Variables
                    </span>
                  </div>

                  {/* Tree */}
                  <div className="max-h-64 overflow-y-auto p-1.5 space-y-0.5 scrollbar-thin scrollbar-thumb-zinc-700">
                    {nodeEntries.length === 0 ? (
                      <div className="py-6 text-center text-xs text-neutral-600">
                        <Variable className="w-4 h-4 mx-auto mb-2 opacity-40" />
                        No upstream nodes connected.
                        <br />
                        Connect a node to see its variables.
                      </div>
                    ) : (
                      nodeEntries.map(([nId, nSchema]) => (
                        <NodeGroup
                          key={nId}
                          nodeId={nId}
                          nodeSchema={nSchema}
                          onSelect={handleTokenSelect}
                          schemaGeneration={schemaGeneration}
                        />
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
