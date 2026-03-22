import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Bot, Search, GitBranch, Globe, Shield, Cpu,
  Check, ChevronRight, Sparkles, Lock, Database, Workflow,
  Play, Layers, MousePointerClick, Menu, X, Terminal,
  Minus, Plus, Zap, Eye, Code2, Webhook, Mail,
} from 'lucide-react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { BackgroundPaths } from '@/components/ui/background-paths';
import { AnimatedGroup } from '@/components/ui/animated-group';
import { FeatureCard } from '@/components/ui/grid-feature-cards';
import { BGPattern } from '@/components/ui/bg-pattern';
import { DottedSurface } from '@/components/ui/dotted-surface';
import { ParticleTextEffect } from '@/components/ui/particle-text-effect';
import logo from '../../assets/logo.svg';

// ── Hooks ──────────────────────────────────────────────────────────────────
function useScrollReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('revealed'); observer.unobserve(e.target); }
      }),
      { threshold: 0.08, rootMargin: '0px 0px -60px 0px' }
    );
    root.querySelectorAll('.reveal-on-scroll').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
  return ref;
}

// ── Animation variants ─────────────────────────────────────────────────────
const blurUp = {
  item: {
    hidden: { opacity: 0, filter: 'blur(12px)', y: 16 },
    visible: {
      opacity: 1, filter: 'blur(0px)', y: 0,
      transition: { type: 'spring', bounce: 0.3, duration: 1.5 },
    },
  },
};

const stagger = (delay = 0.3) => ({
  container: { visible: { transition: { staggerChildren: 0.06, delayChildren: delay } } },
  ...blurUp,
});

// ── FAQ Accordion ──────────────────────────────────────────────────────────
function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/[0.08]">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-6 text-left group"
      >
        <span className="text-[15px] font-semibold text-neutral-200 group-hover:text-white transition-colors pr-8">{q}</span>
        <span className="shrink-0 w-6 h-6 rounded-full border border-white/15 flex items-center justify-center text-neutral-400 group-hover:border-white/25 transition-colors">
          {open ? <Minus className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
        </span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <p className="text-sm text-neutral-400 leading-relaxed pb-6">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Visual node preview (mini canvas mockup) ───────────────────────────────
function CanvasPreview() {
  const nodes = [
    { x: 0, y: 0, label: 'Webhook', icon: Webhook, color: '#a78bfa' },
    { x: 200, y: -20, label: 'AI Parse', icon: Bot, color: '#60a5fa' },
    { x: 400, y: 10, label: 'Filter', icon: GitBranch, color: '#f472b6' },
    { x: 600, y: -30, label: 'Send Email', icon: Mail, color: '#34d399' },
  ];

  return (
    <div className="relative w-full max-w-2xl mx-auto h-[140px] reveal-on-scroll">
      {/* Connection lines */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 700 140" fill="none" preserveAspectRatio="xMidYMid meet">
        <motion.path
          d="M 70 70 C 140 70, 160 50, 230 50"
          stroke="white" strokeOpacity="0.12" strokeWidth="1.5"
          initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }}
          viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.5 }}
        />
        <motion.path
          d="M 280 50 C 350 50, 370 80, 440 80"
          stroke="white" strokeOpacity="0.12" strokeWidth="1.5"
          initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }}
          viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.8 }}
        />
        <motion.path
          d="M 490 80 C 560 80, 580 40, 640 40"
          stroke="white" strokeOpacity="0.12" strokeWidth="1.5"
          initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }}
          viewport={{ once: true }} transition={{ duration: 0.8, delay: 1.1 }}
        />
      </svg>

      {/* Nodes */}
      {nodes.map((node, i) => (
        <motion.div
          key={node.label}
          className="absolute flex items-center gap-2 px-3 py-2 rounded-lg border border-white/[0.1] bg-neutral-900/80 backdrop-blur-sm"
          style={{ left: `${(node.x / 700) * 100}%`, top: `calc(50% + ${node.y}px)`, transform: 'translateY(-50%)' }}
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.3 + i * 0.15 }}
        >
          <div className="w-6 h-6 rounded flex items-center justify-center" style={{ backgroundColor: `${node.color}15` }}>
            <node.icon className="w-3.5 h-3.5" style={{ color: node.color }} />
          </div>
          <span className="text-xs text-neutral-300 font-medium whitespace-nowrap">{node.label}</span>
        </motion.div>
      ))}
    </div>
  );
}

// ── Data ────────────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: Bot, title: 'AI Agents',
    description: 'Drop an LLM into any workflow. It reads incoming data, reasons about it, and outputs structured results.',
  },
  {
    icon: Search, title: 'Headless Scraping',
    description: 'Full Chromium browser pool. Defeats anti-bot, renders JavaScript, extracts what you need.',
  },
  {
    icon: GitBranch, title: 'Logic Routing',
    description: 'If/else, switch, loops — built visually. Drag an edge, set a condition, done.',
  },
  {
    icon: Globe, title: 'API Connector',
    description: 'Hit any REST endpoint. Credentials auto-injected from your encrypted vault.',
  },
  {
    icon: Cpu, title: 'Code Sandbox',
    description: 'Write JavaScript in an isolated V8 sandbox. Full power, strict memory limits, zero risk.',
  },
  {
    icon: Shield, title: 'Encrypted Vault',
    description: 'AES-256-GCM encryption for every secret. Keys never leave the server decrypted.',
  },
];

const PRICING = [
  {
    name: 'Starter', price: '$0', period: '/forever',
    desc: 'Get your feet wet.',
    features: ['5 workflows', '500 executions/mo', 'All core nodes', 'Community support'],
    cta: 'Start Free', highlight: false,
  },
  {
    name: 'Pro', price: '$29', period: '/mo',
    desc: 'For teams that ship.',
    features: ['Unlimited workflows', '10K executions/mo', 'AI Agent node', 'Credential vault', 'Priority support'],
    cta: 'Start Trial', highlight: true,
  },
  {
    name: 'Enterprise', price: 'Custom', period: '',
    desc: 'Your infra, your rules.',
    features: ['Unlimited everything', 'Dedicated infra', 'SSO & RBAC', 'SLA guarantee', 'Custom integrations'],
    cta: 'Talk to Us', highlight: false,
  },
];

const FAQS = [
  { q: 'Is it actually free?', a: 'Yes. Starter gives you 500 executions/month and 5 workflows. No credit card. No time limit. No asterisk.' },
  { q: 'What happens when I hit the limit?', a: 'Workflows pause until the next cycle. Upgrade to Pro anytime — your workflows resume in seconds.' },
  { q: 'Can I self-host?', a: 'Enterprise plan includes Docker images and Helm charts. Run it on your own infrastructure with full control.' },
  { q: 'How do you handle credentials?', a: 'AES-256-GCM encryption. Secrets are encrypted before they touch the database. Decrypted only in-memory during execution, scoped to your workspace.' },
  { q: 'What makes this different from Zapier?', a: "AI agents, headless scraping, sandboxed code execution, visual logic routing. And we don't charge per task — Pro is flat $29/mo." },
];

const NAV_ITEMS = [
  { name: 'Features', href: '#features' },
  { name: 'How it Works', href: '#how-it-works' },
  { name: 'Pricing', href: '#pricing' },
];

// ── Header ─────────────────────────────────────────────────────────────────
function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { scrollYProgress } = useScroll();

  useEffect(() => {
    const unsub = scrollYProgress.on('change', (v) => setScrolled(v > 0.02));
    return () => unsub();
  }, [scrollYProgress]);

  return (
    <header>
      <nav
        data-state={menuOpen ? 'active' : undefined}
        className={`group fixed top-0 z-50 w-full border-b transition-all duration-500 ${
          scrolled ? 'bg-black/60 backdrop-blur-2xl border-white/[0.04]' : 'bg-transparent border-transparent'
        }`}
      >
        <div className="max-w-6xl mx-auto px-6">
          <div className="relative flex flex-wrap items-center justify-between gap-6 py-3 lg:gap-0 lg:py-4">
            <div className="flex w-full items-center justify-between lg:w-auto">
              <Link to="/" className="flex items-center gap-2.5">
                <img src={logo} alt="BlinkBox" className="w-7 h-7 object-contain" />
                <span className="text-sm font-bold tracking-[0.15em] text-white/90">BLINKBOX</span>
              </Link>

              <button
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label={menuOpen ? 'Close' : 'Open'}
                className="relative z-20 -m-2.5 -mr-4 block cursor-pointer p-2.5 lg:hidden"
              >
                <Menu className={`size-5 text-neutral-400 transition-all duration-200 ${menuOpen ? 'rotate-180 scale-0 opacity-0' : ''}`} />
                <X className={`absolute inset-0 m-auto size-5 text-neutral-400 transition-all duration-200 ${menuOpen ? 'rotate-0 scale-100 opacity-100' : '-rotate-180 scale-0 opacity-0'}`} />
              </button>

              <div className="hidden lg:flex items-center gap-8 ml-12">
                {NAV_ITEMS.map((item) => (
                  <a key={item.name} href={item.href} className="text-[13px] text-neutral-500 hover:text-white transition-colors duration-200">{item.name}</a>
                ))}
              </div>
            </div>

            {/* Right side */}
            <div className={`bg-neutral-950 lg:bg-transparent ${menuOpen ? 'block' : 'hidden'} lg:flex mb-6 w-full flex-wrap items-center justify-end space-y-8 rounded-2xl border border-neutral-800 lg:border-transparent p-6 lg:p-0 shadow-2xl shadow-black/50 lg:shadow-none lg:m-0 lg:w-fit lg:gap-4 lg:space-y-0`}>
              <div className="lg:hidden space-y-5 mb-6">
                {NAV_ITEMS.map((item) => (
                  <a key={item.name} href={item.href} onClick={() => setMenuOpen(false)} className="block text-neutral-400 hover:text-white transition-colors">{item.name}</a>
                ))}
              </div>
              <div className="flex w-full flex-col space-y-3 sm:flex-row sm:gap-3 sm:space-y-0 md:w-fit">
                <Link to="/login" className="px-4 py-2 text-[13px] font-medium text-neutral-500 hover:text-white transition-colors text-center">Log in</Link>
                <Link to="/login" className="px-4 py-2 text-[13px] font-semibold text-black bg-white rounded-lg hover:bg-neutral-200 transition-all text-center">Get Started</Link>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}

// ── Main ────────────────────────────────────────────────────────────────────
export default function Landing() {
  const pageRef = useScrollReveal();
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);

  return (
    <div ref={pageRef} className="bg-black min-h-screen text-white overflow-x-hidden">
      <Header />

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          HERO — full viewport, boxes background, single clear message
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="relative min-h-screen flex flex-col justify-center overflow-hidden">
        {/* Animated paths bg */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <BackgroundPaths />
          <div className="absolute inset-0 z-10 bg-gradient-to-t from-black via-black/40 to-transparent pointer-events-none" />
        </div>

        {/* Content */}
        <motion.div style={{ opacity: heroOpacity }} className="relative z-20 max-w-6xl mx-auto px-6 pt-32 pb-20 w-full">
          <AnimatedGroup variants={stagger(0.2)}>
            {/* Badge */}
            <div className="flex items-center gap-2 mb-10">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium tracking-wide uppercase bg-white/[0.03] border border-white/[0.06] text-neutral-500">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            </div>

            {/* Headline */}
            <h1 className="max-w-3xl text-[clamp(2.5rem,6vw,5rem)] font-extrabold leading-[1.05] tracking-tight">
              Your workflows,{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-neutral-400">
                on autopilot.
              </span>
            </h1>

            {/* Sub */}
            <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-neutral-400">
              BlinkBox is a visual automation engine. Drag nodes, wire logic,
              deploy AI agents — ship workflows that used to take a
              sprint in an afternoon.
            </p>

            {/* CTA */}
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link
                to="/login"
                className="group inline-flex items-center gap-2.5 bg-white text-black pl-5 pr-4 py-3 rounded-xl font-semibold text-sm hover:bg-neutral-100 transition-all duration-200 shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_2px_20px_rgba(255,255,255,0.05)]"
              >
                Start Building
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-1.5 px-5 py-3 text-sm font-medium text-neutral-500 hover:text-white transition-colors duration-200"
              >
                See how it works
                <ChevronRight className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Trust strip — real facts only */}
            <div className="mt-16 flex items-center gap-6 text-neutral-500">
              <div className="flex items-center gap-2">
                <Lock className="w-3.5 h-3.5" />
                <span className="text-[11px] uppercase tracking-widest">AES-256 Encrypted</span>
              </div>
              <div className="w-px h-4 bg-white/[0.08]" />
              <div className="flex items-center gap-2">
                <Shield className="w-3.5 h-3.5" />
                <span className="text-[11px] uppercase tracking-widest">Self-Hostable</span>
              </div>
              <div className="hidden sm:block w-px h-4 bg-white/[0.04]" />
              <div className="hidden sm:flex items-center gap-2">
                <Zap className="w-3.5 h-3.5" />
                <span className="text-[11px] uppercase tracking-widest">Free Forever Plan</span>
              </div>
            </div>
          </AnimatedGroup>
        </motion.div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          PARTICLE TEXT — automation ideas cycling below hero
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="relative overflow-hidden">
        <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-[0.2em] mb-0 text-center reveal-on-scroll pt-10">What will you automate?</p>
        <ParticleTextEffect
          words={[
            'SCRAPE COMPETITORS',
            'DEPLOY AI AGENTS',
            'MONITOR PRICES',
            'PARSE INVOICES',
            'SYNC DATABASES',
            'SEND ALERTS',
            'GENERATE REPORTS',
            'ENRICH LEADS',
          ]}
        />
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          HOW IT WORKS — 3 steps with a live-ish canvas preview
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="how-it-works" className="py-28 md:py-40 relative">
        <BGPattern variant="dots" mask="fade-edges" size={20} fill="rgba(255,255,255,0.06)" />
        <div className="max-w-6xl mx-auto px-6 relative z-10">
          {/* Section label */}
          <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-[0.2em] mb-3 reveal-on-scroll">How it works</p>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4 reveal-on-scroll">
            Three moves. You&apos;re live.
          </h2>
          <p className="text-neutral-500 max-w-md mb-16 reveal-on-scroll">
            No docs to read. No config files. Idea to production workflow in minutes.
          </p>

          {/* Steps — horizontal on desktop, vertical stack on mobile */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/[0.06] rounded-2xl overflow-hidden mb-16">
            {[
              { n: '01', title: 'Drag', desc: 'Pull nodes onto the canvas — triggers, API calls, AI, scrapers. Everything is a block.', icon: MousePointerClick },
              { n: '02', title: 'Wire', desc: 'Connect nodes with edges. Set conditions. Toggle configs. No YAML, no JSON editors.', icon: Layers },
              { n: '03', title: 'Ship', desc: 'Hit run. Watch data flow through each node in real-time. Debug visually.', icon: Play },
            ].map((step, i) => (
              <div
                key={step.n}
                className="reveal-on-scroll bg-black p-8 md:p-10 group hover:bg-white/[0.03] transition-colors duration-500"
                data-delay={i + 1}
              >
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-[11px] font-bold text-neutral-500 tracking-widest">{step.n}</span>
                  <div className="h-px flex-1 bg-white/[0.08]" />
                  <step.icon className="w-4 h-4 text-neutral-500 group-hover:text-neutral-300 transition-colors" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
                <p className="text-sm text-neutral-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>

          {/* Mini canvas */}
          <CanvasPreview />
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          FEATURES — grid cards with pattern overlay
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="features" className="py-16 md:py-32">
        <div className="mx-auto w-full max-w-5xl space-y-8 px-4">
          <motion.div
            initial={{ filter: 'blur(4px)', translateY: -8, opacity: 0 }}
            whileInView={{ filter: 'blur(0px)', translateY: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1, duration: 0.8 }}
            className="mx-auto max-w-3xl text-center"
          >
            <h2 className="text-3xl font-bold tracking-wide text-balance md:text-4xl lg:text-5xl xl:font-extrabold">
              Every node solves a real problem.
            </h2>
            <p className="text-neutral-500 mt-4 text-sm tracking-wide text-balance md:text-base">
              No filler features. No marketing fluff. Just what you need to automate.
            </p>
          </motion.div>

          <motion.div
            initial={{ filter: 'blur(4px)', translateY: -8, opacity: 0 }}
            whileInView={{ filter: 'blur(0px)', translateY: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="grid grid-cols-1 divide-x divide-y divide-dashed divide-white/[0.1] border border-dashed border-white/[0.1] sm:grid-cols-2 md:grid-cols-3"
          >
            {FEATURES.map((feature, i) => (
              <FeatureCard key={i} feature={feature} />
            ))}
          </motion.div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          INTERSTITIAL — the "why" statement
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="py-28 md:py-40 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="orb w-[500px] h-[500px] bg-white/[0.015] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-float-slow" />
        </div>
        <div className="max-w-3xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight reveal-on-scroll">
            Other tools charge per task.
          </h2>
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight mt-2 reveal-on-scroll text-transparent bg-clip-text bg-gradient-to-b from-neutral-400 to-neutral-700">
            At scale, that kills your margin.
          </h2>
          <p className="text-neutral-500 mt-6 text-base max-w-lg mx-auto leading-relaxed reveal-on-scroll">
            BlinkBox Pro is a flat $29/mo. Run 10,000 executions. Run 10 million lines of data through those executions. Same price.
          </p>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          SECURITY — horizontal strip, no fluff
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="py-16 border-y border-white/[0.08]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            {[
              { icon: Lock, label: 'AES-256-GCM', sub: 'Encryption at rest' },
              { icon: Shield, label: 'Workspace Isolation', sub: 'Per-user scoping' },
              { icon: Database, label: 'MongoDB Atlas', sub: 'Managed & replicated' },
              { icon: Workflow, label: 'Redis Queues', sub: 'Guaranteed delivery' },
            ].map((item, i) => (
              <div key={item.label} className="reveal-on-scroll flex items-center gap-3 group" data-delay={i + 1}>
                <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0 group-hover:border-white/[0.12] transition-colors">
                  <item.icon className="w-3.5 h-3.5 text-neutral-400 group-hover:text-neutral-300 transition-colors" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-neutral-300">{item.label}</p>
                  <p className="text-[11px] text-neutral-500">{item.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          PRICING — 3 cards, Pro highlighted
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="pricing" className="py-28 md:py-40 relative">
        <BGPattern variant="dots" mask="fade-edges" size={24} fill="rgba(255,255,255,0.03)" />
        <div className="max-w-5xl mx-auto px-6 relative z-10">
          <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-[0.2em] mb-3 text-center reveal-on-scroll">Pricing</p>
          <h2 className="text-3xl md:text-4xl font-extrabold text-center tracking-tight mb-3 reveal-on-scroll">
            Predictable. Simple.
          </h2>
          <p className="text-neutral-500 text-center max-w-md mx-auto mb-14 reveal-on-scroll">
            No per-task fees. No surprise invoices.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PRICING.map((plan, i) => (
              <div
                key={plan.name}
                className={`reveal-on-scroll relative p-7 rounded-2xl border flex flex-col transition-all duration-500 hover:-translate-y-1 ${
                  plan.highlight
                    ? 'border-white/[0.15] bg-white/[0.04] shadow-[0_0_80px_rgba(255,255,255,0.03)]'
                    : 'border-white/[0.08] bg-white/[0.02] hover:border-white/[0.12]'
                }`}
                data-delay={i + 1}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-6 px-3 py-0.5 bg-white text-black text-[10px] font-bold uppercase tracking-widest rounded-full">
                    Popular
                  </div>
                )}
                <h3 className="text-base font-bold text-white">{plan.name}</h3>
                <p className="text-xs text-neutral-500 mt-1 mb-5">{plan.desc}</p>
                <div className="flex items-baseline gap-0.5 mb-6">
                  <span className="text-3xl font-extrabold text-white">{plan.price}</span>
                  {plan.period && <span className="text-xs text-neutral-500">{plan.period}</span>}
                </div>
                <ul className="flex flex-col gap-2.5 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-[13px] text-neutral-400">
                      <Check className={`w-3.5 h-3.5 shrink-0 ${plan.highlight ? 'text-white' : 'text-neutral-500'}`} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/login"
                  className={`w-full py-2.5 rounded-lg text-sm font-semibold text-center transition-all duration-300 ${
                    plan.highlight
                      ? 'bg-white text-black hover:bg-neutral-200'
                      : 'bg-white/[0.06] text-neutral-300 hover:bg-white/[0.1] border border-white/[0.08]'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          FAQ — accordion style, not just text blocks
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="py-28 md:py-40 relative">
        <BGPattern variant="dots" mask="fade-edges" size={20} fill="rgba(255,255,255,0.03)" />
        <div className="max-w-2xl mx-auto px-6 relative z-10">
          <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-[0.2em] mb-3 reveal-on-scroll">FAQ</p>
          <h2 className="text-3xl font-extrabold tracking-tight mb-12 reveal-on-scroll">
            Questions? Answers.
          </h2>
          <div className="reveal-on-scroll">
            {FAQS.map((faq) => <FaqItem key={faq.q} q={faq.q} a={faq.a} />)}
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          FINAL CTA — cinematic, minimal
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="py-28 md:py-40 relative overflow-hidden">
        <DottedSurface />
        {/* Fade overlay so dots blend into black edges */}
        <div className="absolute inset-0 z-[1] pointer-events-none bg-gradient-to-b from-black via-transparent to-black" />

        <div className="relative z-10 max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-5 reveal-on-scroll">
            Ready?
          </h2>
          <p className="text-neutral-500 text-base max-w-sm mx-auto mb-10 leading-relaxed reveal-on-scroll">
            Free forever on Starter. No credit card. Set up your first workflow in 3 minutes.
          </p>
          <div className="reveal-on-scroll">
            <Link
              to="/login"
              className="group inline-flex items-center gap-3 bg-white text-black px-8 py-4 rounded-xl font-bold text-base hover:bg-neutral-100 transition-all duration-300 hover:-translate-y-0.5 shadow-[0_0_60px_rgba(255,255,255,0.04)]"
            >
              Get Started Free
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* ━━━ FOOTER ━━━ */}
      <footer className="py-10 border-t border-white/[0.03]">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <img src={logo} alt="BlinkBox" className="w-5 h-5 object-contain opacity-50" />
            <span className="text-xs font-semibold text-neutral-600 tracking-[0.12em]">BLINKBOX</span>
          </div>
          <div className="flex items-center gap-8 text-[11px] text-neutral-600">
            <a href="#features" className="hover:text-neutral-400 transition-colors">Features</a>
            <a href="#pricing" className="hover:text-neutral-400 transition-colors">Pricing</a>
            <a href="#how-it-works" className="hover:text-neutral-400 transition-colors">How it Works</a>
            <span>&copy; {new Date().getFullYear()} BlinkBox</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
