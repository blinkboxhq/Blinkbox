import { useState } from "react";
import {
  CheckCircle2, Circle, CircleAlert,
  CircleDotDashed, CircleX,
} from "lucide-react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";

// ── Status icon ───────────────────────────────────────────────────────────────
function StatusIcon({ status, size = "sm" }) {
  const sz = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";
  const map = {
    completed:   <CheckCircle2   className={`${sz} text-emerald-400`} />,
    "in-progress":<CircleDotDashed className={`${sz} text-blue-400`} />,
    "need-help": <CircleAlert    className={`${sz} text-amber-400`} />,
    failed:      <CircleX        className={`${sz} text-red-400`} />,
    pending:     <Circle         className={`${sz} text-neutral-600`} />,
  };
  return map[status] ?? map.pending;
}

// ── Status badge color ────────────────────────────────────────────────────────
function statusCls(status) {
  return {
    completed:    "bg-emerald-500/10 text-emerald-400",
    "in-progress":"bg-blue-500/10 text-blue-400",
    "need-help":  "bg-amber-500/10 text-amber-400",
    failed:       "bg-red-500/10 text-red-400",
    pending:      "bg-neutral-800 text-neutral-500",
  }[status] ?? "bg-neutral-800 text-neutral-500";
}

// ── Variants ──────────────────────────────────────────────────────────────────
const listVariants = {
  hidden: { opacity: 0, height: 0, overflow: "hidden" },
  visible: {
    height: "auto", opacity: 1, overflow: "visible",
    transition: { duration: 0.22, staggerChildren: 0.05, when: "beforeChildren", ease: [0.2, 0.65, 0.3, 0.9] },
  },
  exit: { height: 0, opacity: 0, overflow: "hidden", transition: { duration: 0.18, ease: [0.2, 0.65, 0.3, 0.9] } },
};

const itemVariants = {
  hidden:  { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 500, damping: 25 } },
  exit:    { opacity: 0, x: -8, transition: { duration: 0.12 } },
};

const iconVariants = {
  initial: { opacity: 0, scale: 0.7, rotate: -10 },
  animate: { opacity: 1, scale: 1, rotate: 0, transition: { duration: 0.18, ease: [0.2, 0.65, 0.3, 0.9] } },
  exit:    { opacity: 0, scale: 0.7, rotate: 10, transition: { duration: 0.12 } },
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function AgentPlan({ tasks = [], title = "Agent Plan" }) {
  const [expandedTasks,    setExpandedTasks]    = useState(() => tasks.map(t => t.id));
  const [expandedSubtasks, setExpandedSubtasks] = useState({});

  const toggleTask    = (id) => setExpandedTasks(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const toggleSubtask = (tid, sid) => setExpandedSubtasks(p => ({ ...p, [`${tid}-${sid}`]: !p[`${tid}-${sid}`] }));

  return (
    <div className="w-full text-neutral-300">
      <LayoutGroup>
        <div className="space-y-0.5">
          {tasks.map((task, idx) => {
            const isExpanded = expandedTasks.includes(task.id);
            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.06, type: "spring", stiffness: 500, damping: 30 }}
              >
                {/* ── Task row ── */}
                <motion.div
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-white/[0.03] transition-colors"
                  onClick={() => toggleTask(task.id)}
                >
                  {/* Icon */}
                  <div className="shrink-0">
                    <AnimatePresence mode="wait">
                      <motion.div key={task.status} variants={iconVariants} initial="initial" animate="animate" exit="exit">
                        <StatusIcon status={task.status} size="md" />
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  {/* Title */}
                  <span className={`flex-1 text-[12px] font-medium truncate ${task.status === "completed" ? "line-through text-neutral-600" : ""}`}>
                    {task.title}
                  </span>

                  {/* Deps */}
                  {task.dependencies?.length > 0 && (
                    <div className="flex gap-1 shrink-0">
                      {task.dependencies.map((d, i) => (
                        <span key={i} className="bg-neutral-800 text-neutral-500 text-[9px] px-1 py-0.5 rounded font-mono">
                          #{d}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Status badge */}
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={task.status}
                      className={`text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded shrink-0 ${statusCls(task.status)}`}
                      initial={{ scale: 0.85, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.85, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      {task.status.replace("-", " ")}
                    </motion.span>
                  </AnimatePresence>
                </motion.div>

                {/* ── Subtasks ── */}
                <AnimatePresence mode="wait">
                  {isExpanded && task.subtasks?.length > 0 && (
                    <motion.div
                      className="relative ml-4 overflow-hidden"
                      variants={listVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                    >
                      {/* Vertical connector line */}
                      <div className="absolute top-0 bottom-0 left-2 border-l border-dashed border-neutral-800" />

                      <ul className="ml-2 space-y-0.5 py-0.5">
                        {task.subtasks.map((sub) => {
                          const key = `${task.id}-${sub.id}`;
                          const subExpanded = expandedSubtasks[key];
                          return (
                            <motion.li
                              key={sub.id}
                              variants={itemVariants}
                              className="pl-4 cursor-pointer"
                              onClick={() => toggleSubtask(task.id, sub.id)}
                            >
                              <motion.div
                                className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-white/[0.03] transition-colors"
                                layout
                              >
                                <AnimatePresence mode="wait">
                                  <motion.div key={sub.status} variants={iconVariants} initial="initial" animate="animate" exit="exit" className="shrink-0">
                                    <StatusIcon status={sub.status} size="sm" />
                                  </motion.div>
                                </AnimatePresence>
                                <span className={`flex-1 text-[11px] truncate ${sub.status === "completed" ? "line-through text-neutral-600" : "text-neutral-400"}`}>
                                  {sub.title}
                                </span>
                                <AnimatePresence mode="wait">
                                  <motion.span
                                    key={sub.status}
                                    className={`text-[9px] font-semibold uppercase tracking-wide px-1 py-0.5 rounded shrink-0 ${statusCls(sub.status)}`}
                                    initial={{ scale: 0.85, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.85, opacity: 0 }}
                                    transition={{ duration: 0.15 }}
                                  >
                                    {sub.status.replace("-", " ")}
                                  </motion.span>
                                </AnimatePresence>
                              </motion.div>

                              {/* Subtask details */}
                              <AnimatePresence mode="wait">
                                {subExpanded && (
                                  <motion.div
                                    className="overflow-hidden"
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1, transition: { duration: 0.2 } }}
                                    exit={{ height: 0, opacity: 0, transition: { duration: 0.15 } }}
                                  >
                                    <div className="ml-6 pl-2 border-l border-dashed border-neutral-800 py-1 text-[10px] text-neutral-600">
                                      <p className="mb-1">{sub.description}</p>
                                      {sub.tools?.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                          {sub.tools.map((tool, i) => (
                                            <span key={i} className="bg-neutral-800 text-neutral-500 px-1.5 py-0.5 rounded text-[9px]">
                                              {tool}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </motion.li>
                          );
                        })}
                      </ul>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </LayoutGroup>
    </div>
  );
}
