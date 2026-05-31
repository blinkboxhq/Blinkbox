import { Component, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Bot, Search, GitBranch, Globe, Shield, Cpu,
  Check, ChevronRight, Sparkles, Lock, Database, Workflow,
  Play, Layers, MousePointerClick, Menu, X, Mail,
  Minus, Plus, Zap, Webhook,
} from 'lucide-react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { AnimatedGroup } from '@/components/ui/animated-group';
import { BGPattern } from '@/components/ui/bg-pattern';
import { DottedSurface } from '@/components/ui/dotted-surface';
import { FeatureCard } from '@/components/ui/grid-feature-cards';
import { BackgroundPaths } from '@/components/ui/background-paths';
import { ParticleTextEffect } from '@/components/ui/particle-text-effect';
import { cn } from '@/lib/utils';
import logo from '../../assets/logo.svg';
import heroScreenshot from '../../assets/logos/landingpage-hero-screenshot.png';
import imgSlack from '../../assets/slack.png';
import imgGmail from '../../assets/gmail.png';
import imgStripe from '../../assets/stripe.svg';
import imgGithub from '../../assets/github.svg';
import imgNotion from '../../assets/notion.svg';
import imgHubspot from '../../assets/hubspot.svg';
import imgShopify from '../../assets/shopify.svg';
import imgLinear from '../../assets/linear.svg';
import imgAirtable from '../../assets/Airtable--Streamline-Svg-Logos.svg';
import imgGoogleSheets from '../../assets/google-sheets.svg';
import imgTelegram from '../../assets/telegram.png';
import imgDiscord from '../../assets/discord-n8n.svg';
import imgOpenAI from '../../assets/openai.svg';
import imgAnthropicLogo from '../../assets/anthropic.svg';
import imgZoom from '../../assets/zoom.svg';
import imgJira from '../../assets/jira.svg';
import imgSalesforce from '../../assets/salesforce.svg';
import imgTypeform from '../../assets/typeform.svg';
import imgTrello from '../../assets/trello.svg';

class SilentBoundary extends Component {
  constructor(props) { super(props); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? (this.props.fallback ?? null) : this.props.children; }
}

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

const transitionVariants = {
  item: {
    hidden: { opacity: 0, filter: 'blur(12px)', y: 12 },
    visible: {
      opacity: 1, filter: 'blur(0px)', y: 0,
      transition: { type: 'spring', bounce: 0.3, duration: 1.5 },
    },
  },
};

const staggerHero = (delay = 0.2) => ({
  container: { visible: { transition: { staggerChildren: 0.08, delayChildren: delay } } },
  ...transitionVariants,
});

// ── FAQ ────────────────────────────────────────────────────────────────────
function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/[0.06]">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between py-6 text-left group">
        <span className="text-[15px] font-semibold text-neutral-200 group-hover:text-white transition-colors pr-8">{q}</span>
        <span className="shrink-0 w-6 h-6 rounded-full border border-white/15 flex items-center justify-center text-neutral-400 group-hover:border-white/25 transition-colors">
          {open ? <Minus className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
        </span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <p className="text-sm text-neutral-400 leading-relaxed pb-6">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Mini canvas preview ───────────────────────────────────────────────────
function CanvasPreview() {
  const nodes = [
    { x: 0,   y: 0,   label: 'Webhook',    icon: Webhook, color: '#a78bfa' },
    { x: 200, y: -20, label: 'AI Parse',   icon: Bot,     color: '#60a5fa' },
    { x: 400, y: 10,  label: 'Filter',     icon: GitBranch, color: '#f472b6' },
    { x: 600, y: -30, label: 'Send Email', icon: Mail,    color: '#34d399' },
  ];
  return (
    <div className="relative w-full max-w-2xl mx-auto h-[140px] reveal-on-scroll">
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 700 140" fill="none" preserveAspectRatio="xMidYMid meet">
        {[
          "M 70 70 C 140 70, 160 50, 230 50",
          "M 280 50 C 350 50, 370 80, 440 80",
          "M 490 80 C 560 80, 580 40, 640 40",
        ].map((d, i) => (
          <motion.path key={i} d={d} stroke="white" strokeOpacity="0.12" strokeWidth="1.5"
            initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }}
            viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.5 + i * 0.3 }} />
        ))}
      </svg>
      {nodes.map((node, i) => (
        <motion.div key={node.label}
          className="absolute flex items-center gap-2 px-3 py-2 rounded-lg border border-white/[0.1] bg-neutral-900/80 backdrop-blur-sm"
          style={{ left: `${(node.x / 700) * 100}%`, top: `calc(50% + ${node.y}px)`, transform: 'translateY(-50%)' }}
          initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }} transition={{ duration: 0.4, delay: 0.3 + i * 0.15 }}>
          <div className="w-6 h-6 rounded flex items-center justify-center" style={{ backgroundColor: `${node.color}15` }}>
            <node.icon className="w-3.5 h-3.5" style={{ color: node.color }} />
          </div>
          <span className="text-xs text-neutral-300 font-medium whitespace-nowrap">{node.label}</span>
        </motion.div>
      ))}
    </div>
  );
}

// ── Data ──────────────────────────────────────────────────────────────────
const FEATURES = [
  { icon: Sparkles, title: 'Brian AI Builder', description: 'Describe an automation in plain English. Brian builds the full workflow — real configs, real variable chaining — in seconds.' },
  { icon: Bot, title: 'AI Agents', description: 'Drop an LLM into any workflow. It reads incoming data, reasons, classifies, extracts, and outputs structured results.' },
  { icon: Search, title: 'Headless Scraping', description: 'Full Chromium browser pool. Defeats anti-bot, renders JavaScript, extracts exactly what you need.' },
  { icon: GitBranch, title: 'Logic Routing', description: 'If/else, switch, loops, merge — built visually. Drag an edge, set a condition, done.' },
  { icon: Cpu, title: 'Code Sandbox', description: 'Write JavaScript in an isolated V8 sandbox. Full power, strict memory limits, zero risk.' },
  { icon: Shield, title: 'Encrypted Vault', description: 'AES-256-GCM encryption for every secret. Keys never leave the server decrypted. 250+ integrations.' },
];

const PRICING = [
  { name: 'Starter', price: '$0', period: '/forever', desc: 'Get your feet wet.', features: ['5 workflows', '500 executions/mo', 'All core nodes', 'Community support'], cta: 'Start Free', highlight: false },
  { name: 'Pro', price: '$29', period: '/mo', desc: 'For teams that ship.', features: ['Unlimited workflows', '10K executions/mo', 'AI Agent node', 'Credential vault', 'Priority support'], cta: 'Start Trial', highlight: true },
  { name: 'Enterprise', price: 'Custom', period: '', desc: 'Your infra, your rules.', features: ['Unlimited everything', 'Dedicated infra', 'SSO & RBAC', 'SLA guarantee', 'Custom integrations'], cta: 'Talk to Us', highlight: false },
];

const FAQS = [
  { q: 'Is it actually free?', a: 'Yes. Starter gives you 500 executions/month and 5 workflows. No credit card. No time limit. No asterisk.' },
  { q: 'What happens when I hit the limit?', a: 'Workflows pause until the next cycle. Upgrade to Pro anytime — your workflows resume in seconds.' },
  { q: 'Can I self-host?', a: 'Enterprise plan includes Docker images and Helm charts. Run it on your own infrastructure with full control.' },
  { q: 'How do you handle credentials?', a: 'AES-256-GCM encryption. Secrets are encrypted before they touch the database. Decrypted only in-memory during execution, scoped to your workspace.' },
  { q: "What makes this different from Zapier?", a: "AI agents, headless scraping, sandboxed code execution, visual logic routing. And we don't charge per task — Pro is flat $29/mo." },
];

const NAV_ITEMS = [
  { name: 'Features', href: '#features' },
  { name: 'How it Works', href: '#how-it-works' },
  { name: 'Pricing', href: '#pricing' },
];

const INTEGRATIONS = [
  { src: imgSlack, name: 'Slack' }, { src: imgGmail, name: 'Gmail' },
  { src: imgStripe, name: 'Stripe' }, { src: imgGithub, name: 'GitHub' },
  { src: imgNotion, name: 'Notion' }, { src: imgHubspot, name: 'HubSpot' },
  { src: imgShopify, name: 'Shopify' }, { src: imgLinear, name: 'Linear' },
  { src: imgAirtable, name: 'Airtable' }, { src: imgGoogleSheets, name: 'Sheets' },
  { src: imgTelegram, name: 'Telegram' }, { src: imgDiscord, name: 'Discord' },
  { src: imgOpenAI, name: 'OpenAI' }, { src: imgAnthropicLogo, name: 'Anthropic' },
  { src: imgZoom, name: 'Zoom' }, { src: imgJira, name: 'Jira' },
  { src: imgSalesforce, name: 'Salesforce' }, { src: imgTypeform, name: 'Typeform' },
  { src: imgTrello, name: 'Trello' },
];

// ── Header ────────────────────────────────────────────────────────────────
function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { scrollYProgress } = useScroll();

  useEffect(() => {
    const unsub = scrollYProgress.on('change', (v) => setScrolled(v > 0.02));
    return unsub;
  }, [scrollYProgress]);

  return (
    <header>
      <nav
        data-state={menuOpen ? 'active' : undefined}
        className="group fixed top-0 z-50 w-full px-2">
        <div className={cn(
          'mx-auto mt-2 max-w-6xl px-6 transition-all duration-300 lg:px-12',
          scrolled && 'bg-black/60 max-w-4xl rounded-2xl border border-white/[0.06] backdrop-blur-xl lg:px-5'
        )}>
          <div className="relative flex flex-wrap items-center justify-between gap-6 py-3 lg:gap-0 lg:py-4">
            <div className="flex w-full items-center justify-between lg:w-auto">
              <Link to="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
                <img src={logo} alt="Blinkbox" className="w-6 h-6 object-contain" />
                <span className="text-[13px] font-bold tracking-[0.05em] text-white/90">Blinkbox</span>
              </Link>

              <button
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label={menuOpen ? 'Close' : 'Open'}
                className="relative z-20 -m-2.5 -mr-4 block cursor-pointer p-2.5 lg:hidden">
                <Menu className={cn('size-5 text-neutral-400 transition-all duration-200', menuOpen && 'rotate-180 scale-0 opacity-0')} />
                <X className={cn('absolute inset-0 m-auto size-5 text-neutral-400 transition-all duration-200 -rotate-180 scale-0 opacity-0', menuOpen && 'rotate-0 scale-100 opacity-100')} />
              </button>
            </div>

            <div className="absolute inset-0 m-auto hidden size-fit lg:block">
              <ul className="flex gap-8 text-sm">
                {NAV_ITEMS.map((item) => (
                  <li key={item.name}>
                    <a href={item.href} className="text-neutral-500 hover:text-white transition-colors duration-150 text-[13px]">{item.name}</a>
                  </li>
                ))}
              </ul>
            </div>

            <div className={cn(
              'bg-neutral-950 lg:bg-transparent mb-6 hidden w-full flex-wrap items-center justify-end space-y-8 rounded-2xl border border-neutral-800 lg:border-transparent p-6 lg:p-0 shadow-2xl shadow-black/50 lg:shadow-none md:flex-nowrap lg:m-0 lg:flex lg:w-fit lg:gap-4 lg:space-y-0',
              menuOpen && 'block'
            )}>
              <div className="lg:hidden space-y-5 mb-5">
                {NAV_ITEMS.map((item) => (
                  <a key={item.name} href={item.href} onClick={() => setMenuOpen(false)} className="block text-neutral-400 hover:text-white transition-colors">{item.name}</a>
                ))}
              </div>
              <div className="flex w-full flex-col space-y-3 sm:flex-row sm:gap-3 sm:space-y-0 md:w-fit">
                <Link to="/login"
                  className={cn('px-4 py-2 text-[13px] font-medium text-neutral-500 hover:text-white transition-colors text-center rounded-lg', scrolled && 'lg:hidden')}>
                  Log in
                </Link>
                <Link to="/login"
                  className={cn('px-4 py-2 text-[13px] font-semibold text-black bg-white rounded-lg hover:bg-neutral-200 transition-all text-center', scrolled && 'lg:hidden')}>
                  Sign Up
                </Link>
                <Link to="/login"
                  className={cn('px-4 py-2 text-[13px] font-semibold text-black bg-white rounded-lg hover:bg-neutral-200 transition-all text-center', scrolled ? 'lg:inline-flex hidden' : 'hidden')}>
                  Get Started
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}

// ── Integrations marquee ──────────────────────────────────────────────────
function IntegrationsStrip() {
  const doubled = [...INTEGRATIONS, ...INTEGRATIONS];
  return (
    <section className="py-20 overflow-hidden border-y border-white/[0.04]">
      <p className="text-[11px] font-semibold text-neutral-600 uppercase tracking-[0.2em] text-center mb-10">Works with your stack</p>
      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-black to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-black to-transparent z-10 pointer-events-none" />
        <div className="flex gap-8 w-max" style={{ animation: 'marquee 40s linear infinite' }}>
          {doubled.map((app, i) => (
            <div key={i} className="flex flex-col items-center gap-2 shrink-0 group">
              <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center group-hover:border-white/[0.12] group-hover:bg-white/[0.07] transition-all duration-300">
                <img src={app.src} alt={app.name} className="w-5 h-5 object-contain" />
              </div>
              <span className="text-[10px] text-neutral-700 group-hover:text-neutral-500 transition-colors">{app.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────
export default function Landing() {
  const pageRef = useScrollReveal();
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.18], [1, 0]);

  return (
    <div ref={pageRef} className="bg-black min-h-screen text-white overflow-x-hidden">
      <style>{`
        @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .reveal-on-scroll { opacity: 0; transform: translateY(18px); transition: opacity 0.6s ease, transform 0.6s ease; }
        .reveal-on-scroll.revealed { opacity: 1; transform: translateY(0); }
        [data-delay="1"] { transition-delay: 0.05s; }
        [data-delay="2"] { transition-delay: 0.12s; }
        [data-delay="3"] { transition-delay: 0.19s; }
        [data-delay="4"] { transition-delay: 0.26s; }
      `}</style>

      <Header />

      {/* ══════════════════════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════════════════════ */}
      <main className="overflow-hidden">

        {/* Subtle background light rays */}
        <div aria-hidden className="z-[2] absolute inset-0 pointer-events-none isolate opacity-50 contain-strict hidden lg:block">
          <div className="w-[35rem] h-[80rem] -translate-y-[350px] absolute left-0 top-0 -rotate-45 rounded-full bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,hsla(0,0%,85%,.08)_0,hsla(0,0%,55%,.02)_50%,hsla(0,0%,45%,0)_80%)]" />
          <div className="h-[80rem] absolute left-0 top-0 w-56 -rotate-45 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,hsla(0,0%,85%,.06)_0,hsla(0,0%,45%,.02)_80%,transparent_100%)] [translate:5%_-50%]" />
          <div className="h-[80rem] -translate-y-[350px] absolute left-0 top-0 w-56 -rotate-45 bg-[radial-gradient(50%_50%_at_50%_50%,hsla(0,0%,85%,.04)_0,hsla(0,0%,45%,.02)_80%,transparent_100%)]" />
        </div>

        <section>
          <div className="relative pt-24 md:pt-36">

            {/* Radial fade so screenshot blends into black */}
            <div aria-hidden className="absolute inset-0 -z-10 size-full [background:radial-gradient(125%_125%_at_50%_100%,transparent_0%,black_75%)]" />

            <div className="mx-auto max-w-7xl px-6">
              <div className="text-center sm:mx-auto lg:mr-auto lg:mt-0">

                <AnimatedGroup variants={{
                  container: { visible: { transition: { staggerChildren: 0.08, delayChildren: 0.2 } } },
                  ...transitionVariants,
                }}>
                  {/* Badge pill */}
                  <Link to="/login"
                    className="hover:bg-white/[0.06] group mx-auto flex w-fit items-center gap-4 rounded-full border border-white/[0.08] bg-white/[0.03] p-1 pl-4 shadow-md shadow-black/20 transition-all duration-300">
                    <span className="text-neutral-400 text-sm flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                      Introducing Brian — AI workflow builder
                    </span>
                    <div className="bg-white/[0.06] group-hover:bg-white/[0.1] size-7 overflow-hidden rounded-full duration-300 flex items-center justify-center mr-1">
                      <div className="flex w-14 -translate-x-1/2 duration-500 ease-in-out group-hover:translate-x-0">
                        <span className="flex size-7 items-center justify-center">
                          <ArrowRight className="w-3 h-3 text-neutral-400" />
                        </span>
                        <span className="flex size-7 items-center justify-center">
                          <ArrowRight className="w-3 h-3 text-neutral-400" />
                        </span>
                      </div>
                    </div>
                  </Link>

                  {/* Headline */}
                  <h1 className="mt-8 max-w-4xl mx-auto text-balance font-extrabold leading-[1.05] tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-neutral-500 text-[clamp(2.8rem,6vw,5.25rem)] lg:mt-16">
                    Your workflows,<br className="hidden sm:block" /> on autopilot.
                  </h1>

                  {/* Sub */}
                  <p className="mx-auto mt-8 max-w-2xl text-balance text-[17px] leading-relaxed text-neutral-400">
                    Visual automation engine. Drag nodes, wire logic, deploy AI agents —
                    or just tell <span className="text-white/80 font-medium">Brian</span> what you need
                    and watch it build the workflow for you.
                  </p>
                </AnimatedGroup>

                {/* CTAs */}
                <AnimatedGroup
                  variants={{
                    container: { visible: { transition: { staggerChildren: 0.06, delayChildren: 0.75 } } },
                    ...transitionVariants,
                  }}
                  className="mt-10 flex flex-col items-center justify-center gap-3 md:flex-row">
                  <div className="bg-white/[0.08] rounded-[14px] border border-white/[0.1] p-0.5">
                    <Link to="/login"
                      className="group inline-flex items-center gap-2.5 bg-white text-black px-6 py-3 rounded-xl font-semibold text-[14px] hover:bg-neutral-100 transition-all duration-200 shadow-[0_0_20px_rgba(255,255,255,0.08)]">
                      <span className="text-nowrap">Start Building</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>
                  <a href="#how-it-works"
                    className="inline-flex items-center gap-1.5 px-5 py-3 text-[14px] font-medium text-neutral-500 hover:text-white transition-colors duration-200 rounded-xl hover:bg-white/[0.04]">
                    <span className="text-nowrap">See how it works</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </a>
                </AnimatedGroup>

                {/* Trust strip */}
                <AnimatedGroup
                  variants={{
                    container: { visible: { transition: { staggerChildren: 0.06, delayChildren: 1.0 } } },
                    ...transitionVariants,
                  }}
                  className="mt-10 flex items-center justify-center gap-6 text-neutral-600">
                  <div className="flex items-center gap-2">
                    <Lock className="w-3 h-3" />
                    <span className="text-[11px] uppercase tracking-widest">AES-256 Encrypted</span>
                  </div>
                  <div className="w-px h-4 bg-white/[0.06]" />
                  <div className="flex items-center gap-2">
                    <Shield className="w-3 h-3" />
                    <span className="text-[11px] uppercase tracking-widest">Self-Hostable</span>
                  </div>
                  <div className="hidden sm:flex items-center gap-2">
                    <div className="w-px h-4 bg-white/[0.06] mr-0" />
                    <Zap className="w-3 h-3 ml-6" />
                    <span className="text-[11px] uppercase tracking-widest">Free Forever Plan</span>
                  </div>
                </AnimatedGroup>
              </div>
            </div>

            {/* ── Screenshot preview ───────────────────────────────────── */}
            <AnimatedGroup
              variants={{
                container: { visible: { transition: { staggerChildren: 0.05, delayChildren: 0.9 } } },
                ...transitionVariants,
              }}>
              <div className="relative -mr-56 mt-12 overflow-hidden px-2 sm:mr-0 sm:mt-16 md:mt-24">
                {/* Gradient fade-out at bottom */}
                <div aria-hidden className="bg-gradient-to-b to-black absolute inset-0 z-10 from-transparent from-55% pointer-events-none" />
                {/* Screenshot container */}
                <div className="relative mx-auto max-w-6xl overflow-hidden rounded-2xl border border-white/[0.08] bg-[#080808] p-3 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_32px_80px_rgba(0,0,0,0.8)] ring-1 ring-white/[0.04]">
                  <img
                    src={heroScreenshot}
                    alt="Blinkbox canvas"
                    className="relative w-full rounded-xl object-cover"
                    style={{ aspectRatio: '15/8' }}
                  />
                </div>
              </div>
            </AnimatedGroup>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════
            CUSTOMER LOGOS — social proof
        ══════════════════════════════════════════════════════════════ */}
        <section className="pb-16 pt-16 md:pb-28">
          <div className="group relative m-auto max-w-5xl px-6">
            <div className="pointer-events-none absolute inset-0 z-10 flex scale-95 items-center justify-center opacity-0 duration-500 group-hover:pointer-events-auto group-hover:scale-100 group-hover:opacity-100">
              <a href="#" className="block text-sm text-white/70 duration-150 hover:text-white hover:opacity-75">
                <span>Meet Our Customers</span>
                <ChevronRight className="ml-1 inline-block size-3" />
              </a>
            </div>
            <p className="text-[11px] font-semibold text-neutral-600 uppercase tracking-[0.2em] text-center mb-10">Trusted by teams at</p>
            <div className="mx-auto mt-4 grid max-w-2xl grid-cols-4 gap-x-12 gap-y-8 transition-all duration-500 group-hover:opacity-40 group-hover:blur-sm sm:gap-x-16 sm:gap-y-14">
              {[
                { src: 'https://html.tailus.io/blocks/customers/nvidia.svg',       alt: 'Nvidia',       h: 'h-5' },
                { src: imgGithub,                                                   alt: 'GitHub',       h: 'h-4', invert: true },
                { src: 'https://html.tailus.io/blocks/customers/nike.svg',         alt: 'Nike',         h: 'h-5' },
                { src: imgOpenAI,                                                   alt: 'OpenAI',       h: 'h-6', invert: true },
                { src: 'https://html.tailus.io/blocks/customers/lemonsqueezy.svg', alt: 'Lemon Squeezy',h: 'h-5' },
                { src: 'https://html.tailus.io/blocks/customers/laravel.svg',      alt: 'Laravel',      h: 'h-4' },
                { src: imgSlack,                                                    alt: 'Slack',        h: 'h-5' },
                { src: imgStripe,                                                   alt: 'Stripe',       h: 'h-5', invert: true },
              ].map((logo) => (
                <div key={logo.alt} className="flex items-center justify-center">
                  <img
                    src={logo.src}
                    alt={logo.alt}
                    className={`mx-auto w-fit ${logo.h} opacity-50 grayscale transition-all duration-300 group-hover:opacity-30 ${logo.invert ? 'invert' : ''}`}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════
            PARTICLE / "What will you automate?"
        ══════════════════════════════════════════════════════════════ */}
        <section className="relative overflow-hidden pt-12">
          <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-[0.2em] mb-0 text-center reveal-on-scroll">What will you automate?</p>
          <SilentBoundary>
            <ParticleTextEffect words={['SCRAPE COMPETITORS','DEPLOY AI AGENTS','MONITOR PRICES','PARSE INVOICES','SYNC DATABASES','SEND ALERTS','GENERATE REPORTS','ENRICH LEADS']} />
          </SilentBoundary>
        </section>

        {/* ══════════════════════════════════════════════════════════════
            HOW IT WORKS
        ══════════════════════════════════════════════════════════════ */}
        <section id="how-it-works" className="py-28 md:py-40 relative">
          <BGPattern variant="dots" mask="fade-edges" size={20} fill="rgba(255,255,255,0.06)" />
          <div className="max-w-6xl mx-auto px-6 relative z-10">
            <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-[0.2em] mb-3 reveal-on-scroll">How it works</p>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4 reveal-on-scroll">Three moves. You&apos;re live.</h2>
            <p className="text-neutral-500 max-w-md mb-16 reveal-on-scroll">No docs to read. No config files. Idea to production workflow in minutes.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/[0.06] rounded-2xl overflow-hidden mb-16">
              {[
                { n: '01', title: 'Drag', desc: 'Pull nodes onto the canvas — triggers, API calls, AI, scrapers. Everything is a block.', icon: MousePointerClick },
                { n: '02', title: 'Wire', desc: 'Connect nodes with edges. Set conditions. Toggle configs. No YAML, no JSON editors.', icon: Layers },
                { n: '03', title: 'Ship', desc: 'Hit run. Watch data flow through each node in real-time. Debug visually.', icon: Play },
              ].map((step, i) => (
                <div key={step.n} className="reveal-on-scroll bg-black p-8 md:p-10 group hover:bg-white/[0.03] transition-colors duration-500" data-delay={i + 1}>
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
            <CanvasPreview />
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════
            FEATURES
        ══════════════════════════════════════════════════════════════ */}
        <section id="features" className="py-16 md:py-32">
          <div className="mx-auto w-full max-w-5xl space-y-8 px-4">
            <motion.div
              initial={{ filter: 'blur(4px)', translateY: -8, opacity: 0 }}
              whileInView={{ filter: 'blur(0px)', translateY: 0, opacity: 1 }}
              viewport={{ once: true }} transition={{ delay: 0.1, duration: 0.8 }}
              className="mx-auto max-w-3xl text-center">
              <h2 className="text-3xl font-bold tracking-wide text-balance md:text-4xl lg:text-5xl xl:font-extrabold">Every node solves a real problem.</h2>
              <p className="text-neutral-500 mt-4 text-sm tracking-wide text-balance md:text-base">No filler features. No marketing fluff. Just what you need to automate.</p>
            </motion.div>
            <motion.div
              initial={{ filter: 'blur(4px)', translateY: -8, opacity: 0 }}
              whileInView={{ filter: 'blur(0px)', translateY: 0, opacity: 1 }}
              viewport={{ once: true }} transition={{ delay: 0.4, duration: 0.8 }}
              className="grid grid-cols-1 divide-x divide-y divide-dashed divide-white/[0.1] border border-dashed border-white/[0.1] sm:grid-cols-2 md:grid-cols-3">
              {FEATURES.map((feature, i) => <FeatureCard key={i} feature={feature} />)}
            </motion.div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════
            INTEGRATIONS
        ══════════════════════════════════════════════════════════════ */}
        <IntegrationsStrip />

        {/* ══════════════════════════════════════════════════════════════
            INTERSTITIAL — pricing pitch
        ══════════════════════════════════════════════════════════════ */}
        <section className="py-28 md:py-40 relative overflow-hidden">
          <div className="max-w-3xl mx-auto px-6 text-center relative z-10">
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight reveal-on-scroll">Other tools charge per task.</h2>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight mt-2 reveal-on-scroll text-transparent bg-clip-text bg-gradient-to-b from-neutral-400 to-neutral-700">At scale, that kills your margin.</h2>
            <p className="text-neutral-500 mt-6 text-base max-w-lg mx-auto leading-relaxed reveal-on-scroll">
              BlinkBox Pro is a flat $29/mo. Run 10,000 executions. Run 10 million lines of data through those executions. Same price.
            </p>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════
            SECURITY STRIP
        ══════════════════════════════════════════════════════════════ */}
        <section className="py-16 border-y border-white/[0.06]">
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

        {/* ══════════════════════════════════════════════════════════════
            PRICING
        ══════════════════════════════════════════════════════════════ */}
        <section id="pricing" className="py-28 md:py-40 relative">
          <BGPattern variant="dots" mask="fade-edges" size={24} fill="rgba(255,255,255,0.03)" />
          <div className="max-w-5xl mx-auto px-6 relative z-10">
            <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-[0.2em] mb-3 text-center reveal-on-scroll">Pricing</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-center tracking-tight mb-3 reveal-on-scroll">Predictable. Simple.</h2>
            <p className="text-neutral-500 text-center max-w-md mx-auto mb-14 reveal-on-scroll">No per-task fees. No surprise invoices.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {PRICING.map((plan, i) => (
                <div key={plan.name} data-delay={i + 1}
                  className={cn(
                    'reveal-on-scroll relative p-7 rounded-2xl border flex flex-col transition-all duration-500 hover:-translate-y-1',
                    plan.highlight
                      ? 'border-white/[0.15] bg-white/[0.04] shadow-[0_0_80px_rgba(255,255,255,0.03)]'
                      : 'border-white/[0.08] bg-white/[0.02] hover:border-white/[0.12]'
                  )}>
                  {plan.highlight && (
                    <div className="absolute -top-3 left-6 px-3 py-0.5 bg-white text-black text-[10px] font-bold uppercase tracking-widest rounded-full">Popular</div>
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
                        <Check className={cn('w-3.5 h-3.5 shrink-0', plan.highlight ? 'text-white' : 'text-neutral-500')} />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link to="/login"
                    className={cn(
                      'w-full py-2.5 rounded-lg text-sm font-semibold text-center transition-all duration-300',
                      plan.highlight
                        ? 'bg-white text-black hover:bg-neutral-200'
                        : 'bg-white/[0.06] text-neutral-300 hover:bg-white/[0.1] border border-white/[0.08]'
                    )}>
                    {plan.cta}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════
            FAQ
        ══════════════════════════════════════════════════════════════ */}
        <section className="py-28 md:py-40 relative">
          <BGPattern variant="dots" mask="fade-edges" size={20} fill="rgba(255,255,255,0.03)" />
          <div className="max-w-2xl mx-auto px-6 relative z-10">
            <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-[0.2em] mb-3 reveal-on-scroll">FAQ</p>
            <h2 className="text-3xl font-extrabold tracking-tight mb-12 reveal-on-scroll">Questions? Answers.</h2>
            <div className="reveal-on-scroll">
              {FAQS.map((faq) => <FaqItem key={faq.q} q={faq.q} a={faq.a} />)}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════
            FINAL CTA
        ══════════════════════════════════════════════════════════════ */}
        <section className="py-28 md:py-40 relative overflow-hidden">
          <SilentBoundary><DottedSurface /></SilentBoundary>
          <div className="absolute inset-0 z-[1] pointer-events-none bg-gradient-to-b from-black via-transparent to-black" />
          <div className="relative z-10 max-w-2xl mx-auto px-6 text-center">
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-5 reveal-on-scroll">Ready?</h2>
            <p className="text-neutral-500 text-base max-w-sm mx-auto mb-10 leading-relaxed reveal-on-scroll">Free forever on Starter. No credit card. Set up your first workflow in 3 minutes.</p>
            <div className="reveal-on-scroll">
              <Link to="/login"
                className="group inline-flex items-center gap-3 bg-white text-black px-8 py-4 rounded-xl font-bold text-base hover:bg-neutral-100 transition-all duration-300 hover:-translate-y-0.5 shadow-[0_0_60px_rgba(255,255,255,0.04)]">
                Get Started Free
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════
            FOOTER
        ══════════════════════════════════════════════════════════════ */}
        <footer className="py-10 border-t border-white/[0.04]">
          <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <img src={logo} alt="Blinkbox" className="w-5 h-5 object-contain opacity-50" />
              <span className="text-xs font-semibold text-neutral-600 tracking-[0.04em]">Blinkbox</span>
            </div>
            <div className="flex items-center gap-8 text-[11px] text-neutral-600">
              <a href="#features" className="hover:text-neutral-400 transition-colors">Features</a>
              <a href="#pricing" className="hover:text-neutral-400 transition-colors">Pricing</a>
              <a href="#how-it-works" className="hover:text-neutral-400 transition-colors">How it Works</a>
              <a href="/privacy" className="hover:text-neutral-400 transition-colors">Privacy</a>
              <a href="/terms" className="hover:text-neutral-400 transition-colors">Terms</a>
              <span>&copy; {new Date().getFullYear()} BlinkBox</span>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
