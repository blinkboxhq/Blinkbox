import { useState, useRef, useEffect, useCallback } from 'react';
import { Variable, ChevronRight } from 'lucide-react';
import useWorkspaceStore from '../../store/workspaceStore';

function extractKeysFromPayload(mockPayload) {
  if (!mockPayload) return [];
  try {
    const parsed = typeof mockPayload === 'string' ? JSON.parse(mockPayload) : mockPayload;
    if (!parsed || typeof parsed !== 'object') return [];
    return flattenKeys(parsed);
  } catch {
    return [];
  }
}

function flattenKeys(obj, prefix = '') {
  const keys = [];
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    keys.push({ path, type: typeof value });
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...flattenKeys(value, path));
    }
  }
  return keys;
}

export default function SmartVariableInput({
  value = '',
  onChange,
  placeholder = '',
  label,
  className = '',
  multiline = false,
}) {
  const [showPopover, setShowPopover] = useState(false);
  const [filter, setFilter] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(0);
  const inputRef = useRef(null);
  const popoverRef = useRef(null);

  const nodes = useWorkspaceStore((s) => s.nodes);

  // Find trigger node and extract available keys
  const triggerNode = nodes.find((n) => n.data.type === 'trigger');
  const mockPayload = triggerNode?.data?.config?.mockPayload;
  const allKeys = extractKeysFromPayload(mockPayload);

  const filteredKeys = filter
    ? allKeys.filter((k) => k.path.toLowerCase().includes(filter.toLowerCase()))
    : allKeys;

  // Reset highlight when filter changes
  useEffect(() => {
    setHighlightIndex(0);
  }, [filter]);

  // Close popover on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target) &&
        inputRef.current && !inputRef.current.contains(e.target)
      ) {
        setShowPopover(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const insertVariable = useCallback((keyPath) => {
    const token = `{{ $json.${keyPath} }}`;
    const el = inputRef.current;

    if (el) {
      const start = el.selectionStart ?? value.length;
      const end = el.selectionEnd ?? value.length;
      const newValue = value.slice(0, start) + token + value.slice(end);
      onChange(newValue);

      // Restore cursor position after React re-render
      requestAnimationFrame(() => {
        const newPos = start + token.length;
        el.setSelectionRange(newPos, newPos);
        el.focus();
      });
    } else {
      onChange(value + token);
    }

    setShowPopover(false);
    setFilter('');
  }, [value, onChange]);

  const handleKeyDown = (e) => {
    if (!showPopover) {
      if (e.key === '{') {
        // Open on double {{
        if (value.endsWith('{')) {
          e.preventDefault();
          setShowPopover(true);
          return;
        }
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, filteredKeys.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && filteredKeys.length > 0) {
      e.preventDefault();
      // Remove the trailing `{` that triggered the popover
      const cleaned = value.endsWith('{') ? value.slice(0, -1) : value;
      onChange(cleaned);
      setTimeout(() => insertVariable(filteredKeys[highlightIndex].path), 0);
    } else if (e.key === 'Escape') {
      setShowPopover(false);
    }
  };

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    onChange(newValue);

    // Track filter: text after last `{{`
    const lastBrace = newValue.lastIndexOf('{{');
    if (lastBrace >= 0 && showPopover) {
      setFilter(newValue.slice(lastBrace + 2).trim());
    }
  };

  const typeColor = {
    string: 'text-emerald-500',
    number: 'text-blue-400',
    boolean: 'text-orange-400',
    object: 'text-purple-400',
  };

  const InputTag = multiline ? 'textarea' : 'input';

  return (
    <div className={`flex flex-col gap-1.5 relative ${className}`}>
      {label && (
        <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-2">
          {label}
        </label>
      )}

      <div className="relative">
        <InputTag
          ref={inputRef}
          type={multiline ? undefined : 'text'}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={multiline ? 4 : undefined}
          className={`w-full bg-surface-1 border border-neutral-800 rounded-lg px-3 py-2.5 pr-9 text-xs text-white font-mono focus:outline-none focus:border-neutral-600 transition-colors placeholder-neutral-700 ${multiline ? 'resize-none leading-relaxed' : ''}`}
        />

        {/* Variable trigger button */}
        <button
          type="button"
          onClick={() => setShowPopover(!showPopover)}
          className={`absolute ${multiline ? 'top-2.5' : 'top-1/2 -translate-y-1/2'} right-2 p-1 rounded transition-colors ${
            showPopover ? 'text-blue-400 bg-blue-500/10' : 'text-neutral-600 hover:text-neutral-400'
          }`}
          title="Insert variable"
        >
          <Variable className="w-3.5 h-3.5" />
        </button>

        {/* Popover */}
        {showPopover && (
          <div
            ref={popoverRef}
            className="absolute z-50 top-full mt-1 left-0 w-full max-h-48 overflow-y-auto bg-neutral-950 border border-neutral-800 rounded-lg shadow-2xl animate-slide-up"
          >
            {allKeys.length === 0 ? (
              <div className="p-3 text-xs text-neutral-600 text-center">
                No variables available. Add a test payload in the Trigger node.
              </div>
            ) : filteredKeys.length === 0 ? (
              <div className="p-3 text-xs text-neutral-600 text-center">
                No matching variables.
              </div>
            ) : (
              filteredKeys.map((key, i) => (
                <button
                  key={key.path}
                  onClick={() => {
                    const cleaned = value.endsWith('{') ? value.slice(0, -1) : value;
                    onChange(cleaned);
                    setTimeout(() => insertVariable(key.path), 0);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs transition-colors ${
                    i === highlightIndex
                      ? 'bg-neutral-800/80 text-white'
                      : 'text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200'
                  }`}
                >
                  <span className="flex items-center gap-2 font-mono">
                    <ChevronRight className="w-3 h-3 text-neutral-600" />
                    $json.{key.path}
                  </span>
                  <span className={`text-[10px] font-bold uppercase ${typeColor[key.type] || 'text-neutral-600'}`}>
                    {key.type}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
