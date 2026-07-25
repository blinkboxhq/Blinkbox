import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Sparkles, MousePointerClick, Repeat, ShieldCheck, Server, ToggleRight,
  MessageSquare, Workflow, Rocket, Check, Zap, GitBranch, CheckCheck, X, History,
} from 'lucide-react';
import ScrollStack, { ScrollStackItem } from '../../../components/ScrollStack';

const ease = [0.22, 1, 0.36, 1];

const CARD_CHROME =
  'overflow-hidden rounded-[28px] border border-white/[0.09] bg-gradient-to-b from-[#131318] to-[#0b0b0f] p-7 shadow-[0_-24px_80px_-24px_rgba(0,0,0,0.85)] sm:p-11';

function CardHead({ kicker, plain, gradient, sub }) {
  return (
    <div className="mb-8">
      <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.2em] text-[#6f97e8]">{kicker}</p>
      <h3 className="max-w-[620px] font-semibold leading-[1.1] tracking-[-0.02em] text-[#fafafa]" style={{ fontSize: 'clamp(1.6rem, 3vw, 2.4rem)' }}>
        {plain}{' '}
        <span className="bg-gradient-to-br from-white via-[#8fb4ff] to-[#1d5fe0] bg-clip-text text-transparent">{gradient}</span>
      </h3>
      {sub && <p className="mt-3 max-w-[480px] text-[14px] leading-relaxed text-[#8c8c8c]">{sub}</p>}
    </div>
  );
}

const FEATURES = [
  { icon: Sparkles, title: 'Brian builds it for you', body: 'Describe the outcome in plain English — a working automation before you touch the canvas.' },
  { icon: MousePointerClick, title: 'A canvas, not a config file', body: 'Drag, drop, connect. Toggles instead of textboxes. You never see a line of JSON.' },
  { icon: Repeat, title: '251 integrations', body: 'Apps, databases, AI models, HTTP — all first-class.' },
  { icon: ShieldCheck, title: "Runs that don't drop", body: 'A cursor-based engine with retries, crash recovery, and idempotent steps.' },
  { icon: ToggleRight, title: 'Simple by default', body: 'Easy as ticking true or false. Power when you want it, never in your face.' },
  { icon: Server, title: 'Own your stack', body: 'Cloud when you want speed. Self-host when you want control.' },
];

const NODES = [
  { id: 'trigger', label: 'Trigger', icon: Zap, color: '#6f97e8', left: '15%', top: '50%' },
  { id: 'condition', label: 'Condition', icon: GitBranch, color: '#c9d6f5', left: '50%', top: '50%' },
  { id: 'true', label: 'Send Slack', icon: CheckCheck, color: '#4ade80', left: '82%', top: '24%' },
  { id: 'false', label: 'Log & stop', icon: X, color: '#f87171', left: '82%', top: '76%' },
];

const PILLARS = [
  { icon: ShieldCheck, title: "Runs that don't drop", body: 'Retries, delays, fan-out and crash recovery. A restart never double-sends.' },
  { icon: History, title: 'Replay any run', body: 'Step into a run and inspect the exact data at every node.' },
  { icon: ToggleRight, title: 'Simple by default', body: 'Conditions, loops and retries appear the moment you reach for them.' },
];

const STEPS = [
  { n: '01', icon: MessageSquare, title: 'Describe it', body: 'Tell Brian what should happen — "when a Stripe payment fails, DM the customer and log it in Sheets."' },
  { n: '02', icon: Workflow, title: 'Shape it', body: 'The workflow appears on the canvas. Tweak a toggle, swap a node, branch on a condition. No JSON, ever.' },
  { n: '03', icon: Rocket, title: 'Ship it', body: 'Flip it live. The engine handles retries, delays, and fan-out — and shows every run in History.' },
];

const TIERS = [
  { name: 'Free', price: '$0', unit: 'forever', features: ['3 active workflows', '1,000 runs / month', 'All 251 integrations'], cta: 'Start free', featured: false },
  { name: 'Pro', price: '$19', unit: '/ month', features: ['Unlimited workflows', '50,000 runs / month', 'Brian AI copilot'], cta: 'Start Pro trial', featured: true },
  { name: 'Team', price: 'Custom', unit: '', features: ['Self-hosted or private cloud', 'SSO & audit logs', 'Dedicated support'], cta: 'Talk to us', featured: false },
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

function MiniCanvas({ reduce }) {
  return (
    <div
      className="relative h-[220px] w-full overflow-hidden rounded-2xl border border-white/[0.05] sm:h-[260px]"
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
      {NODES.map((node) => {
        const Icon = node.icon;
        return (
          <div
            key={node.id}
            className="absolute z-10 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-xl border border-white/[0.1] bg-[#16161b] px-2.5 py-2 shadow-[0_10px_28px_-10px_rgba(0,0,0,0.8)] sm:px-3"
            style={{ left: node.left, top: node.top }}
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md" style={{ background: `${node.color}1f` }}>
              <Icon className="h-3.5 w-3.5" strokeWidth={2} style={{ color: node.color }} />
            </span>
            <span className="whitespace-nowrap text-[11px] font-medium text-[#e6e6e6]">{node.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function StackDeck() {
  const reduce = useReducedMotion();

  return (
    <section className="relative bg-[#060608]">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[900px] -translate-x-1/2 rounded-full opacity-25 blur-[130px]"
        style={{ background: 'radial-gradient(ellipse at center, rgba(59,130,246,0.25), transparent 70%)' }}
      />
      <div className="relative mx-auto max-w-[1100px] px-4 sm:px-6">
        <ScrollStack
          useWindowScroll
          itemDistance={72}
          itemScale={0.02}
          itemStackDistance={14}
          stackPosition="11%"
          scaleEndPosition="5%"
          baseScale={0.92}
          blurAmount={1}
        >
          <ScrollStackItem itemClassName={CARD_CHROME}>
            <div id="features">
              <CardHead kicker="Why Blinkbox" plain="The automation platform that" gradient="gets out of your way." />
              <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
                {FEATURES.map((f) => {
                  const Icon = f.icon;
                  return (
                    <div key={f.title} className="flex flex-col items-start">
                      <Icon className="mb-2.5 h-[18px] w-[18px] text-[#6f97e8]" strokeWidth={1.75} />
                      <h4 className="text-[14px] font-semibold tracking-tight text-[#fafafa]">{f.title}</h4>
                      <p className="mt-1 text-[12px] leading-relaxed text-[#8c8c8c]">{f.body}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </ScrollStackItem>

          <ScrollStackItem itemClassName={CARD_CHROME}>
            <div id="platform">
              <CardHead
                kicker="The platform"
                plain="Simple on top."
                gradient="Serious underneath."
                sub="Build it by dragging boxes and flipping toggles. Under the hood, an engine that treats every run like it matters."
              />
              <MiniCanvas reduce={reduce} />
              <div className="mt-8 hidden grid-cols-3 gap-8 md:grid">
                {PILLARS.map((p) => {
                  const Icon = p.icon;
                  return (
                    <div key={p.title} className="flex flex-col items-start">
                      <Icon className="mb-2.5 h-[18px] w-[18px] text-[#6f97e8]" strokeWidth={1.75} />
                      <h4 className="text-[14px] font-semibold tracking-tight text-[#fafafa]">{p.title}</h4>
                      <p className="mt-1 text-[12px] leading-relaxed text-[#8c8c8c]">{p.body}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </ScrollStackItem>

          <ScrollStackItem itemClassName={CARD_CHROME}>
            <div id="how">
              <CardHead kicker="From idea to live in minutes" plain="Three steps." gradient="Zero wiring." />
              <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                {STEPS.map((step) => {
                  const Icon = step.icon;
                  return (
                    <div key={step.n} className="flex flex-col items-start">
                      <div className="relative mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-white/[0.08] bg-[#101013]">
                        <Icon className="h-5 w-5 text-[#6f97e8]" strokeWidth={1.75} />
                        <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#6f97e8] text-[9px] font-bold text-[#09090b]">
                          {step.n}
                        </span>
                      </div>
                      <h4 className="text-[15px] font-semibold tracking-tight text-[#fafafa]">{step.title}</h4>
                      <p className="mt-1.5 text-[13px] leading-relaxed text-[#8c8c8c]">{step.body}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </ScrollStackItem>

          <ScrollStackItem itemClassName={CARD_CHROME}>
            <div id="pricing">
              <CardHead kicker="Pricing" plain="Priced per plan," gradient="not per task." />
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {TIERS.map((tier) => (
                  <div
                    key={tier.name}
                    className={`flex flex-col rounded-2xl border p-5 ${
                      tier.featured
                        ? 'border-[#6f97e8]/40 bg-gradient-to-b from-[#6f97e8]/[0.10] to-[#0d0d10]'
                        : 'border-white/[0.07] bg-[#101013]'
                    }`}
                  >
                    <div className="flex items-baseline justify-between">
                      <h4 className="text-[14px] font-semibold text-[#fafafa]">{tier.name}</h4>
                      <div className="flex items-baseline gap-1">
                        <span className="text-[24px] font-semibold tracking-tight text-[#fafafa]">{tier.price}</span>
                        {tier.unit && <span className="text-[11px] text-[#6d6d6d]">{tier.unit}</span>}
                      </div>
                    </div>
                    <ul className="mt-4 hidden flex-1 flex-col gap-2 sm:flex">
                      {tier.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-[12px] text-[#b6b6b6]">
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#6f97e8]" strokeWidth={2.25} />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <Link
                      to="/login"
                      className={`bb-btn mt-5 justify-center py-2.5 text-[13px] font-semibold ${tier.featured ? 'bb-btn-accent' : 'bb-btn-ghost'}`}
                    >
                      {tier.cta}
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </ScrollStackItem>
        </ScrollStack>
      </div>
    </section>
  );
}
