import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import AgentPlan from "../../../components/ui/AgentPlan";

// Steps Brian works through for any workflow request.
// They animate from pending → in-progress → completed over ~5s.
const BASE_STEPS = [
  {
    id: "1", title: "Reading your request",
    description: "Parsing intent and extracting key requirements",
    subtasks: [
      { id: "1.1", title: "Extract trigger type",    description: "Identify what event starts this workflow", status: "pending" },
      { id: "1.2", title: "Identify integrations",   description: "Detect apps and services mentioned",       status: "pending" },
      { id: "1.3", title: "Infer data flow",          description: "Understand what data moves where",         status: "pending" },
    ],
  },
  {
    id: "2", title: "Selecting node types", dependencies: ["1"],
    description: "Mapping intent to BlinkBox node registry",
    subtasks: [
      { id: "2.1", title: "Choose trigger node",      description: "Pick the right trigger from the registry", status: "pending" },
      { id: "2.2", title: "Choose action nodes",      description: "Match each step to an action node",        status: "pending" },
      { id: "2.3", title: "Add logic nodes if needed",description: "Conditionals, loops, merges",              status: "pending" },
    ],
  },
  {
    id: "3", title: "Designing workflow structure", dependencies: ["2"],
    description: "Planning node layout and edge connections",
    subtasks: [
      { id: "3.1", title: "Set node positions",       description: "Calculate x/y coordinates for the canvas", status: "pending" },
      { id: "3.2", title: "Wire edges",               description: "Connect nodes with configurable edges",     status: "pending" },
    ],
  },
  {
    id: "4", title: "Validating & generating output", dependencies: ["3"],
    description: "Ensuring the graph is complete and returning JSON",
    subtasks: [
      { id: "4.1", title: "Check reachability",       description: "Every node must be reachable from trigger", status: "pending" },
      { id: "4.2", title: "Format JSON output",       description: "Serialize nodes + edges for the canvas",    status: "pending" },
    ],
  },
];

function buildTasks(progressMap) {
  return BASE_STEPS.map((step) => {
    const stepProgress = progressMap[step.id] || "pending";
    return {
      ...step,
      status: stepProgress,
      subtasks: step.subtasks.map((sub, i) => {
        const subProgress =
          stepProgress === "completed" ? "completed"
          : stepProgress === "in-progress" && i === 0 ? "in-progress"
          : stepProgress === "in-progress" && i > 0 ? "pending"
          : "pending";
        return { ...sub, status: subProgress };
      }),
    };
  });
}

// Timeline: which step becomes in-progress at what ms offset
const TIMELINE = [
  { stepId: "1", delay: 0,    status: "in-progress" },
  { stepId: "1", delay: 900,  status: "completed"   },
  { stepId: "2", delay: 950,  status: "in-progress" },
  { stepId: "2", delay: 2000, status: "completed"   },
  { stepId: "3", delay: 2050, status: "in-progress" },
  { stepId: "3", delay: 3200, status: "completed"   },
  { stepId: "4", delay: 3250, status: "in-progress" },
  // Step 4 completes when the API actually responds (controlled externally)
];

export default function BrianThinking({ onDone }) {
  const [progressMap, setProgressMap] = useState({
    "1": "pending", "2": "pending", "3": "pending", "4": "pending",
  });

  useEffect(() => {
    const timers = TIMELINE.map(({ stepId, delay, status }) =>
      setTimeout(() => {
        setProgressMap(prev => ({ ...prev, [stepId]: status }));
      }, delay),
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  const tasks = buildTasks(progressMap);

  return (
    <motion.div
      className="mx-1 my-2 p-3 rounded-xl bg-neutral-900/60 border border-[#2a2a2a]"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.2 }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex gap-0.5">
          {[0, 1, 2].map(i => (
            <motion.span
              key={i}
              className="w-1 h-1 rounded-full bg-violet-400"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
        <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-widest">Brian is thinking</span>
      </div>

      <AgentPlan tasks={tasks} />
    </motion.div>
  );
}
