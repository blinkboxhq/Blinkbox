import { motion, useReducedMotion } from 'framer-motion';
import { Zap, GitBranch, CheckCheck, X, ShieldCheck, History, ToggleRight } from 'lucide-react';

const ease = [0.22, 1, 0.36, 1];

const NODES = [
  { id: 'trigger', label: 'Trigger', icon: Zap, color: '#6f97e8', left: '15%', top: '50%', delay: 0 },
  { id: 'condition', label: 'Condition', icon: GitBranch, color: '#c9d6f5', left: '50%', top: '50%', delay: 0.12 },
  { id: 'true', label: 'Send Slack', icon: CheckCheck, color: '#4ade80', left: '82%', top: '24%', delay: 0.24 },
  { id: 'false', label: 'Log & stop', icon: X, color: '#f87171', left: '82%', top: '76%', delay: 0.3 },
];

const PILLARS = [
  {
    icon: ShieldCheck,
    title: "Runs that don't drop",
    body: 'A cursor-based engine with retries, delays, fan-out and crash recovery. Every step is idempotent — a restart never double-sends.',
  },
  {
    icon: History,
    title: 'Replay any run',
    body: 'Full execution history. Step into a run, inspect the exact data at every node, and see precisely where and why it went.',
  },
  {
    icon: ToggleRight,
    title: 'Simple by default',
    body: 'Easy as ticking true or false. Conditions, loops and retries are there the moment you reach for them — never in your face.',
  },
];

function Wire({ d, color, reduce, delay }) {
  return (
    <g>
      <path d={d} fill="none" stroke="#ffffff" strokeOpacity={0.1} strokeWidth={1.5} strokeLinecap="round" />
      <motion.path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeDasharray="5 13"
        initial={{ strokeDashoffset: 0, opacity: 0 }}
        whileInView={reduce ? { opacity: 0.9 } : { strokeDashoffset: [0, -36], opacity: 0.9 }}
        viewport={{ once: true }}
        transition={{
          opacity: { duration: 0.6, ease, delay },
          strokeDashoffset: { repeat: Infinity, duration: 1.5, ease: 'linear' },
        }}
      />
    </g>
  );
}

function CanvasNode({ node, reduce }) {
  const Icon = node.icon;
  return (
    <motion.div
      initial={{ opacity: 0, scale: reduce ? 1 : 0.85 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, ease, delay: reduce ? 0 : node.delay }}
      className="absolute z-10 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-xl border border-white/[0.1] bg-[#16161b] px-2.5 py-2 shadow-[0_10px_28px_-10px_rgba(0,0,0,0.8)] sm:px-3"
      style={{ left: node.left, top: node.top }}
    >
      <span
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
        style={{ background: `${node.color}1f` }}
      >
        <Icon className="h-3.5 w-3.5" strokeWidth={2} style={{ color: node.color }} />
      </span>
      <span className="whitespace-nowrap text-[11px] font-medium text-[#e6e6e6]">{node.label}</span>
    </motion.div>
  );
}

export default function Platform() {
  const reduce = useReducedMotion();
  return (
    <section className="relative bg-[#09090b] py-28">
      <div className="mx-auto max-w-[1200px] px-6 sm:px-8">
        <div className="mb-14 text-center">
          <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.2em] text-[#6f97e8]">The platform</p>
          <h2 className="mx-auto max-w-[640px] font-semibold tracking-[-0.02em] text-[#fafafa]" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}>
            Simple on top. Serious underneath.
          </h2>
          <p className="mx-auto mt-4 max-w-[480px] text-[15px] leading-relaxed text-[#8c8c8c]">
            Build it by dragging boxes and flipping toggles. Under the hood, an execution engine that treats every run like it matters.
          </p>
        </div>

        {/* live mini-canvas */}
        <motion.div
          initial={{ opacity: 0, y: reduce ? 0 : 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.8, ease }}
          className="relative overflow-hidden rounded-[24px] border border-white/[0.08] bg-[#0b0b0f] p-4 sm:p-8"
        >
          <div
            className="pointer-events-none absolute -top-24 left-1/2 h-64 w-[70%] -translate-x-1/2 rounded-full opacity-50 blur-[120px]"
            style={{ background: 'radial-gradient(ellipse at center, rgba(111,151,232,0.28), transparent 70%)' }}
          />
          <div
            className="relative mx-auto h-[260px] w-full max-w-[760px] overflow-hidden rounded-2xl border border-white/[0.05] sm:h-[320px]"
            style={{
              backgroundColor: '#0d0d11',
              backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)',
              backgroundSize: '22px 22px',
            }}
          >
            <svg viewBox="0 0 600 320" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
              <Wire d="M90 160 H300" color="#6f97e8" reduce={reduce} delay={0.15} />
              <Wire d="M300 160 C 380 160, 410 77, 492 77" color="#4ade80" reduce={reduce} delay={0.3} />
              <Wire d="M300 160 C 380 160, 410 243, 492 243" color="#f87171" reduce={reduce} delay={0.36} />
            </svg>
            <span className="absolute left-[64%] top-[30%] hidden text-[9px] font-semibold uppercase tracking-wider text-[#4ade80]/80 sm:block">
              true
            </span>
            <span className="absolute left-[64%] top-[64%] hidden text-[9px] font-semibold uppercase tracking-wider text-[#f87171]/80 sm:block">
              false
            </span>
            {NODES.map((node) => (
              <CanvasNode key={node.id} node={node} reduce={reduce} />
            ))}
          </div>
        </motion.div>

        {/* capability pillars */}
        <div className="mt-16 grid grid-cols-1 gap-x-10 gap-y-10 md:grid-cols-3">
          {PILLARS.map((p, i) => {
            const Icon = p.icon;
            return (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: reduce ? 0 : 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.6, ease, delay: reduce ? 0 : i * 0.08 }}
                className="flex flex-col items-start"
              >
                <Icon className="mb-4 h-5 w-5 text-[#6f97e8]" strokeWidth={1.75} />
                <h3 className="text-[15px] font-semibold tracking-tight text-[#fafafa]">{p.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-[#8c8c8c]">{p.body}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
