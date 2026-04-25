import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Thinking steps shown while the API is in flight — mirrors Claude Code's style
const STEPS = [
  'Parsing intent and extracting requirements',
  'Identifying trigger type from available nodes',
  'Selecting action nodes for each step',
  'Planning node positions and connections',
  'Validating flow structure and reachability',
  'Serialising workflow JSON',
];

const STEP_DELAYS = [0, 600, 1300, 2100, 2900, 3500];

export default function BrianThinkingBlock({ thinking, durationMs }) {
  const [expanded,  setExpanded]  = useState(true);
  const [stepsDone, setStepsDone] = useState(0);

  // Animate steps while thinking
  useEffect(() => {
    if (!thinking) return;
    setStepsDone(0);
    const timers = STEP_DELAYS.map((d, i) =>
      setTimeout(() => setStepsDone(i + 1), d)
    );
    return () => timers.forEach(clearTimeout);
  }, [thinking]);

  // Auto-collapse once done
  useEffect(() => {
    if (!thinking && durationMs != null) {
      const t = setTimeout(() => setExpanded(false), 600);
      return () => clearTimeout(t);
    }
  }, [thinking, durationMs]);

  const label = thinking
    ? 'Thinking…'
    : durationMs != null
      ? `Thought for ${(durationMs / 1000).toFixed(1)}s`
      : 'Thinking';

  return (
    <div className="font-mono text-[11px]">
      {/* Toggle header */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="flex items-center gap-1.5 text-neutral-500 hover:text-neutral-300 transition-colors mb-1"
      >
        {expanded
          ? <ChevronDown className="w-3 h-3" />
          : <ChevronRight className="w-3 h-3" />}
        <span className="italic">{label}</span>
        {thinking && (
          <span className="flex gap-0.5 ml-1">
            {[0,1,2].map(i => (
              <motion.span key={i} className="w-1 h-1 rounded-full bg-neutral-500"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18 }} />
            ))}
          </span>
        )}
      </button>

      {/* Steps list */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-l-2 border-neutral-800 pl-3 ml-1.5 space-y-0.5"
          >
            {STEPS.slice(0, thinking ? stepsDone : STEPS.length).map((step, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-1.5 text-neutral-600 py-0.5"
              >
                <span className="text-neutral-700 select-none">·</span>
                <span className={!thinking ? 'text-neutral-500' : ''}>{step}</span>
              </motion.div>
            ))}

            {/* Blinking cursor at the end while thinking */}
            {thinking && (
              <motion.div
                className="flex items-center gap-1.5 py-0.5"
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.6, repeat: Infinity }}
              >
                <span className="text-violet-500 select-none">▋</span>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
