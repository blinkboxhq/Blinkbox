import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Zap, Globe, Bot, Search, GitBranch, Shield,
  Clock, Users, BarChart3, Check, Star, ChevronRight,
  Sparkles, Lock, Cpu, Database, Workflow, Play, Terminal,
  Layers, MousePointerClick,
} from 'lucide-react';
import { Boxes } from '@/components/ui/background-boxes';
import { AnimatedGroup } from '@/components/ui/animated-group';
import logo from '../../assets/logo.svg';

// ── Scroll reveal hook ─────────────────────────────────────────────────────
function useScrollReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );
    const els = root.querySelectorAll('.reveal-on-scroll');
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
  return ref;
}

// ── Floating particles component ───────────────────────────────────────────
function FloatingParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className={`absolute w-1 h-1 rounded-full bg-blue-400/20 ${
            i % 3 === 0 ? 'animate-float' : i % 3 === 1 ? 'animate-float-slow' : 'animate-float-slower'
          }`}
          style={{
            left: `${15 + i * 14}%`,
            top: `${20 + (i * 17) % 60}%`,
            animationDelay: `${i * 0.7}s`,
          }}
        />
      ))}
    </div>
  );
}

// ── Live mesh gradient background ──────────────────────────────────────────
function MeshBackground({ className = '' }) {
  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      <div className="orb w-[500px] h-[500px] bg-blue-600/[0.07] top-1/4 -left-40 animate-float-slow" />
      <div className="orb w-[400px] h-[400px] bg-cyan-500/[0.05] bottom-1/4 -right-32 animate-float-slower" style={{ animationDelay: '2s' }} />
      <div className="orb w-[300px] h-[300px] bg-purple-600/[0.04] top-1/2 left-1/3 animate-float" style={{ animationDelay: '4s' }} />
    </div>
  );
}

// ── Data ────────────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: Bot,
    title: 'AI-Native Agents',
    desc: 'Plug large language models directly into your workflows. Parse unstructured data, generate content, and make decisions — all autonomously.',
    color: 'blue',
  },
  {
    icon: Search,
    title: 'Headless Web Scraping',
    desc: 'Defeat anti-bot protections, extract pricing tables, monitor competitors. Our browser pool handles JavaScript-heavy sites at scale.',
    color: 'purple',
  },
  {
    icon: GitBranch,
    title: 'Visual Logic Routing',
    desc: 'Build complex if/else trees visually. Route data down different paths based on any condition — no code required.',
    color: 'pink',
  },
  {
    icon: Globe,
    title: 'Universal API Connector',
    desc: 'Connect to any REST API in seconds. Auto-inject encrypted credentials from your vault. Supports GET, POST, PUT, DELETE.',
    color: 'cyan',
  },
  {
    icon: Shield,
    title: 'Bank-Grade Encryption',
    desc: 'Every API key and token is encrypted with AES-256-GCM before it touches the database. Zero plaintext secrets. Ever.',
    color: 'emerald',
  },
  {
    icon: Cpu,
    title: 'Sandboxed Code Execution',
    desc: 'Run custom JavaScript in an isolated V8 sandbox with strict memory limits. Full power, zero risk to your infrastructure.',
    color: 'orange',
  },
];

const COMPARISONS = [
  { feature: 'AI Agent Node (Built-in)', us: true, a: false, b: false, c: false },
  { feature: 'Headless Browser Scraping', us: true, a: false, b: false, c: true },
  { feature: 'Visual Logic Router', us: true, a: false, b: true, c: true },
  { feature: 'AES-256 Credential Vault', us: true, a: true, b: true, c: false },
  { feature: 'Sandboxed Code Execution', us: true, a: false, b: false, c: true },
  { feature: 'Self-Hostable', us: true, a: false, b: false, c: true },
  { feature: 'Real-time Execution Feed', us: true, a: false, b: true, c: true },
  { feature: 'No Per-Task Pricing', us: true, a: false, b: false, c: true },
];

const TESTIMONIALS = [
  {
    name: 'Arjun Mehta',
    role: 'CTO, ScaleStack',
    quote: 'We replaced 3 paid automation tools and 2 custom scripts with a single BlinkBox workflow. The AI agent node alone saved us 40 hours a month.',
  },
  {
    name: 'Sarah Chen',
    role: 'Head of Ops, Vantage AI',
    quote: 'The scraping + AI pipeline is insane. We monitor competitor pricing across 200 URLs and get structured JSON reports automatically.',
  },
  {
    name: 'Marcus Wright',
    role: 'Founder, DataForge',
    quote: "Finally, an automation tool that doesn't treat developers like children. The code node with V8 sandboxing is exactly what we needed.",
  },
];

const PRICING = [
  {
    name: 'Starter',
    price: '$0',
    period: 'forever',
    desc: 'For individuals exploring automation.',
    credits: '500 credits/mo',
    features: ['5 workflows', '500 executions/mo', 'Community support', 'All core nodes'],
    cta: 'Start Free',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '$29',
    period: '/month',
    desc: 'For teams shipping fast.',
    credits: '10,000 credits/mo',
    features: ['Unlimited workflows', '10,000 executions/mo', 'AI Agent node', 'Priority support', 'Credential vault'],
    cta: 'Start 14-Day Trial',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    desc: 'For organizations at scale.',
    credits: 'Unlimited',
    features: ['Unlimited everything', 'Dedicated infrastructure', 'SSO & RBAC', 'SLA guarantee', 'Custom integrations'],
    cta: 'Contact Sales',
    highlight: false,
  },
];

const colorMap = {
  blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400', glow: 'group-hover:shadow-blue-500/10' },
  purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-400', glow: 'group-hover:shadow-purple-500/10' },
  pink: { bg: 'bg-pink-500/10', border: 'border-pink-500/20', text: 'text-pink-400', glow: 'group-hover:shadow-pink-500/10' },
  cyan: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', text: 'text-cyan-400', glow: 'group-hover:shadow-cyan-500/10' },
  emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', glow: 'group-hover:shadow-emerald-500/10' },
  orange: { bg: 'bg-orange-500/10', border: 'border-orange-500/20', text: 'text-orange-400', glow: 'group-hover:shadow-orange-500/10' },
};

// ── Main Landing Component ─────────────────────────────────────────────────
export default function Landing() {
  const pageRef = useScrollReveal();

  return (
    <div ref={pageRef} className="bg-black min-h-screen text-white overflow-x-hidden">

      {/* ━━━ NAVBAR ━━━ */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/[0.04] bg-black/60 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="BlinkBox" className="w-8 h-8 object-contain" />
            <span className="text-lg font-bold tracking-widest text-white">BLINKBOX</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-neutral-400">
            <a href="#features" className="hover:text-white transition-colors duration-300">Features</a>
            <a href="#comparison" className="hover:text-white transition-colors duration-300">Compare</a>
            <a href="#pricing" className="hover:text-white transition-colors duration-300">Pricing</a>
            <Link
              to="/login"
              className="ml-4 relative bg-white text-black px-5 py-2 font-bold text-xs rounded-md hover:bg-neutral-200 transition-all tracking-wide uppercase hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(255,255,255,0.15)]"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ━━━ HERO ━━━ */}
      <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
        {/* Background Boxes */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <Boxes className="opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent z-10" />
        </div>

        {/* Hero content */}
        <div className="relative z-20 max-w-4xl mx-auto px-6 text-center">
          <AnimatedGroup preset="blur">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-neutral-800 text-neutral-400 text-xs font-semibold tracking-wide uppercase">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" /> Now with AI Agent Nodes
            </div>

            <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight leading-[0.95] mt-8 mb-8">
              <span className="text-white">Automate</span>
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-blue-500 to-cyan-400 gradient-text-animated">
                Everything.
              </span>
            </h1>

            <p className="text-lg md:text-xl text-neutral-400 max-w-2xl mx-auto leading-relaxed mb-12">
              The visual automation engine built for teams who refuse to do the same thing twice.
              Connect APIs, scrape the web, deploy AI agents — all from a single canvas.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/login"
                className="group relative flex items-center gap-3 bg-white text-black px-8 py-4 rounded-lg font-bold text-base hover:bg-neutral-100 transition-all hover:-translate-y-1 shadow-[0_0_40px_rgba(255,255,255,0.08)] hover:shadow-[0_0_60px_rgba(255,255,255,0.15)]"
              >
                Start Building Free
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a
                href="#features"
                className="flex items-center gap-2 px-8 py-4 text-neutral-400 hover:text-white font-semibold transition-colors"
              >
                See what&apos;s possible
                <ChevronRight className="w-4 h-4" />
              </a>
            </div>

            <div className="mt-20 flex items-center justify-center gap-8 text-neutral-600 text-xs font-medium tracking-wide uppercase">
              <span className="flex items-center gap-2"><Users className="w-4 h-4" /> 2,400+ builders</span>
              <span className="hidden sm:block w-px h-4 bg-neutral-800" />
              <span className="flex items-center gap-2"><Zap className="w-4 h-4" /> 1.2M executions/mo</span>
              <span className="hidden sm:block w-px h-4 bg-neutral-800" />
              <span className="flex items-center gap-2"><Clock className="w-4 h-4" /> 99.9% uptime</span>
            </div>
          </AnimatedGroup>
        </div>
      </section>

      {/* ━━━ HOW IT WORKS ━━━ */}
      <section className="py-32 relative">
        <FloatingParticles />
        <div className="max-w-5xl mx-auto px-6 relative z-10">
          <p className="text-xs font-bold text-blue-400 uppercase tracking-[0.2em] mb-4 text-center reveal-on-scroll">How it works</p>
          <h2 className="text-4xl md:text-5xl font-extrabold text-center tracking-tight mb-6 reveal-on-scroll">
            Three steps. Zero friction.
          </h2>
          <p className="text-neutral-500 text-center max-w-xl mx-auto mb-20 reveal-on-scroll">
            From idea to production automation in minutes, not weeks.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Drag & Drop', desc: 'Pull nodes onto the canvas. Triggers, API calls, AI agents, scrapers — everything is a visual block.', icon: MousePointerClick },
              { step: '02', title: 'Connect & Configure', desc: 'Wire nodes together. Set conditions on edges. Toggle settings instead of writing YAML.', icon: Layers },
              { step: '03', title: 'Deploy & Monitor', desc: 'Hit run. Watch execution flow through each node in real-time with live telemetry.', icon: Play },
            ].map((item, i) => (
              <div
                key={item.step}
                className="reveal-on-scroll relative p-8 rounded-2xl border border-neutral-900 bg-neutral-950/50 backdrop-blur-sm group hover:border-neutral-700 transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_8px_40px_rgba(59,130,246,0.06)]"
                data-delay={i + 1}
              >
                <span className="text-6xl font-black text-neutral-900/60 group-hover:text-blue-500/10 transition-colors duration-500 absolute top-6 right-8">{item.step}</span>
                <div className="relative z-10">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-blue-500/15 transition-all duration-300">
                    <item.icon className="w-5 h-5 text-blue-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
                  <p className="text-sm text-neutral-500 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Connecting line between steps (desktop only) */}
          <div className="hidden md:flex items-center justify-center mt-8 gap-0">
            <div className="h-px w-1/4 bg-gradient-to-r from-transparent to-blue-500/20" />
            <div className="h-px w-1/4 bg-blue-500/20" />
            <div className="h-px w-1/4 bg-gradient-to-l from-transparent to-blue-500/20" />
          </div>
        </div>
      </section>

      {/* ━━━ FEATURES ━━━ */}
      <section id="features" className="py-32 relative overflow-hidden">
        <MeshBackground />
        <div className="absolute inset-0 live-grid opacity-30" />

        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <p className="text-xs font-bold text-blue-400 uppercase tracking-[0.2em] mb-4 text-center reveal-on-scroll">Capabilities</p>
          <h2 className="text-4xl md:text-5xl font-extrabold text-center tracking-tight mb-6 reveal-on-scroll">
            Built for serious automation.
          </h2>
          <p className="text-neutral-500 text-center max-w-xl mx-auto mb-20 reveal-on-scroll">
            Every feature designed to eliminate repetitive work and give your team superhuman speed.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => {
              const c = colorMap[f.color];
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className={`reveal-on-scroll p-6 rounded-2xl border border-neutral-900 bg-black/60 backdrop-blur-sm hover:border-neutral-700 transition-all duration-500 group hover:-translate-y-1 hover:shadow-xl ${c.glow}`}
                  data-delay={i + 1}
                >
                  <div className={`w-11 h-11 rounded-xl ${c.bg} border ${c.border} flex items-center justify-center mb-5 group-hover:scale-110 transition-all duration-300`}>
                    <Icon className={`w-5 h-5 ${c.text}`} />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{f.title}</h3>
                  <p className="text-sm text-neutral-500 leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ━━━ BIG STATEMENT ━━━ */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="orb w-[600px] h-[600px] bg-blue-600/[0.06] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-float-slow" />
        </div>
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight reveal-on-scroll">
            Stop paying per task.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400 gradient-text-animated">
              Start owning your automation.
            </span>
          </h2>
          <p className="text-neutral-500 mt-8 text-lg max-w-2xl mx-auto leading-relaxed reveal-on-scroll">
            Others charge you per task — at scale, that bleeds thousands a month. With BlinkBox Pro, it&apos;s a flat $29. Do the math.
          </p>
        </div>
      </section>

      {/* ━━━ COMPARISON TABLE ━━━ */}
      <section id="comparison" className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 live-grid opacity-20" />
        <div className="max-w-4xl mx-auto px-6 relative z-10">
          <p className="text-xs font-bold text-blue-400 uppercase tracking-[0.2em] mb-4 text-center reveal-on-scroll">Compare</p>
          <h2 className="text-4xl md:text-5xl font-extrabold text-center tracking-tight mb-16 reveal-on-scroll">
            How we stack up.
          </h2>

          <div className="overflow-x-auto reveal-on-scroll">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-800">
                  <th className="text-left py-4 text-neutral-500 font-medium w-1/3">Feature</th>
                  <th className="py-4 text-blue-400 font-bold">BlinkBox</th>
                  <th className="py-4 text-neutral-600 font-medium">Others</th>
                  <th className="py-4 text-neutral-600 font-medium">Others</th>
                  <th className="py-4 text-neutral-600 font-medium">Others</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISONS.map((row, i) => (
                  <tr key={row.feature} className="border-b border-neutral-900 hover:bg-white/[0.01] transition-colors">
                    <td className="py-3.5 text-neutral-300 font-medium">{row.feature}</td>
                    <td className="text-center">{row.us ? <Check className="w-5 h-5 text-blue-400 mx-auto" /> : <span className="text-neutral-700">—</span>}</td>
                    <td className="text-center">{row.a ? <Check className="w-5 h-5 text-neutral-600 mx-auto" /> : <span className="text-neutral-700">—</span>}</td>
                    <td className="text-center">{row.b ? <Check className="w-5 h-5 text-neutral-600 mx-auto" /> : <span className="text-neutral-700">—</span>}</td>
                    <td className="text-center">{row.c ? <Check className="w-5 h-5 text-neutral-600 mx-auto" /> : <span className="text-neutral-700">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ━━━ TESTIMONIALS ━━━ */}
      <section className="py-32 relative">
        <FloatingParticles />
        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <p className="text-xs font-bold text-blue-400 uppercase tracking-[0.2em] mb-4 text-center reveal-on-scroll">What builders say</p>
          <h2 className="text-4xl md:text-5xl font-extrabold text-center tracking-tight mb-16 reveal-on-scroll">
            Loved by operators.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <div
                key={t.name}
                className="reveal-on-scroll p-6 rounded-2xl border border-neutral-900 bg-neutral-950/50 backdrop-blur-sm hover:border-neutral-700 transition-all duration-500 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/[0.03] group"
                data-delay={i + 1}
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="w-4 h-4 text-yellow-500 fill-yellow-500 group-hover:scale-110 transition-transform duration-300" style={{ transitionDelay: `${j * 50}ms` }} />
                  ))}
                </div>
                <p className="text-sm text-neutral-300 leading-relaxed mb-6">&ldquo;{t.quote}&rdquo;</p>
                <div>
                  <p className="text-sm font-bold text-white">{t.name}</p>
                  <p className="text-xs text-neutral-600">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━ SECURITY STRIP ━━━ */}
      <section className="py-20 border-y border-neutral-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/[0.02] via-transparent to-cyan-600/[0.02]" />
        <div className="max-w-5xl mx-auto px-6 relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-center gap-12 text-center md:text-left">
            {[
              { icon: Lock, label: 'AES-256-GCM', sub: 'Credential encryption' },
              { icon: Shield, label: 'SOC 2 Ready', sub: 'Enterprise compliance' },
              { icon: Database, label: 'Cloud Atlas', sub: 'Managed infrastructure' },
              { icon: Workflow, label: 'Redis Queues', sub: 'Guaranteed delivery' },
            ].map((item, i) => (
              <div key={item.label} className="reveal-on-scroll flex items-center gap-4 group" data-delay={i + 1}>
                <div className="w-10 h-10 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-500 group-hover:border-blue-500/30 group-hover:text-blue-400 transition-all duration-500">
                  <item.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{item.label}</p>
                  <p className="text-xs text-neutral-600">{item.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━ PRICING ━━━ */}
      <section id="pricing" className="py-32 relative overflow-hidden">
        <MeshBackground />
        <div className="max-w-5xl mx-auto px-6 relative z-10">
          <p className="text-xs font-bold text-blue-400 uppercase tracking-[0.2em] mb-4 text-center reveal-on-scroll">Pricing</p>
          <h2 className="text-4xl md:text-5xl font-extrabold text-center tracking-tight mb-4 reveal-on-scroll">
            Simple, predictable pricing.
          </h2>
          <p className="text-neutral-500 text-center max-w-xl mx-auto mb-16 reveal-on-scroll">
            No per-task fees. No hidden costs. Pay for the plan, use it without limits.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PRICING.map((plan, i) => (
              <div
                key={plan.name}
                className={`reveal-on-scroll relative p-8 rounded-2xl border flex flex-col transition-all duration-500 hover:-translate-y-2 ${
                  plan.highlight
                    ? 'border-blue-500/30 bg-blue-500/5 shadow-[0_0_60px_rgba(59,130,246,0.08)] hover:shadow-[0_0_80px_rgba(59,130,246,0.15)] animate-border-glow'
                    : 'border-neutral-900 bg-neutral-950/50 backdrop-blur-sm hover:border-neutral-700 hover:shadow-xl'
                }`}
                data-delay={i + 1}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-[10px] font-bold uppercase tracking-widest rounded-full shadow-[0_4px_20px_rgba(59,130,246,0.3)]">
                    Most Popular
                  </div>
                )}
                <h3 className="text-lg font-bold text-white mb-1">{plan.name}</h3>
                <p className="text-xs text-neutral-500 mb-6">{plan.desc}</p>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-4xl font-extrabold text-white">{plan.price}</span>
                  {plan.period && <span className="text-sm text-neutral-500">{plan.period}</span>}
                </div>
                <p className="text-xs text-neutral-600 mb-8">{plan.credits}</p>
                <ul className="flex flex-col gap-3 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-3 text-sm text-neutral-400">
                      <Check className={`w-4 h-4 shrink-0 ${plan.highlight ? 'text-blue-400' : 'text-neutral-600'}`} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/login"
                  className={`w-full py-3 rounded-lg text-sm font-bold text-center transition-all duration-300 ${
                    plan.highlight
                      ? 'bg-white text-black hover:bg-neutral-200 hover:shadow-[0_4px_20px_rgba(255,255,255,0.1)]'
                      : 'bg-neutral-900 text-neutral-300 hover:bg-neutral-800 hover:text-white border border-neutral-800'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━ FAQ ━━━ */}
      <section className="py-32 relative">
        <div className="absolute inset-0 live-grid opacity-15" />
        <div className="max-w-3xl mx-auto px-6 relative z-10">
          <h2 className="text-3xl font-extrabold text-center tracking-tight mb-16 reveal-on-scroll">Frequently asked questions</h2>
          <div className="flex flex-col divide-y divide-neutral-900">
            {[
              { q: 'Is BlinkBox really free to start?', a: 'Yes. The Starter plan includes 500 credits per month and 5 workflows. No credit card required.' },
              { q: 'What happens when I run out of credits?', a: 'Your workflows pause until the next billing cycle. You can upgrade to Pro at any time to resume immediately.' },
              { q: 'Can I self-host BlinkBox?', a: 'Yes. BlinkBox is designed to run on your own infrastructure. Docker images and Helm charts are available for Enterprise customers.' },
              { q: 'How is this different from other tools?', a: "BlinkBox gives you AI agents, headless scraping, sandboxed code execution, and visual logic routing — features most platforms don't offer. And we don't charge per task." },
              { q: 'Is my data secure?', a: 'All credentials are encrypted with AES-256-GCM. We use managed cloud databases with encryption at rest, and all traffic is TLS 1.3.' },
            ].map((faq, i) => (
              <div key={faq.q} className="reveal-on-scroll py-6 group" data-delay={i + 1}>
                <h3 className="text-base font-bold text-white mb-2 group-hover:text-blue-400 transition-colors duration-300">{faq.q}</h3>
                <p className="text-sm text-neutral-500 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━ FINAL CTA (THE CLOSER) ━━━ */}
      <section className="py-32 relative overflow-hidden">
        <MeshBackground />
        {/* Animated concentric rings */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full border border-blue-500/[0.06] animate-pulse-ring" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full border border-cyan-500/[0.04] animate-pulse-ring" style={{ animationDelay: '1.5s' }} />

        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 reveal-on-scroll">
            Ready to automate?
          </h2>
          <p className="text-lg text-neutral-400 max-w-xl mx-auto mb-10 leading-relaxed reveal-on-scroll">
            Join 2,400+ teams already building smarter workflows. Start free — no credit card, no time limit, no catch.
          </p>
          <div className="reveal-on-scroll">
            <Link
              to="/login"
              className="group inline-flex items-center gap-3 bg-white text-black px-10 py-5 rounded-xl font-bold text-lg hover:bg-neutral-100 transition-all duration-300 hover:-translate-y-1 shadow-[0_0_60px_rgba(255,255,255,0.1)] hover:shadow-[0_0_80px_rgba(255,255,255,0.2)]"
            >
              Get Started Free <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          <p className="mt-6 text-xs text-neutral-600 reveal-on-scroll">No credit card required. Free forever on Starter.</p>
        </div>
      </section>

      {/* ━━━ FOOTER ━━━ */}
      <footer className="py-12 border-t border-neutral-900">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img src={logo} alt="BlinkBox" className="w-6 h-6 object-contain" />
            <span className="text-sm font-bold text-neutral-500 tracking-widest">BLINKBOX</span>
          </div>
          <div className="flex items-center gap-8 text-xs text-neutral-600">
            <a href="#features" className="hover:text-neutral-300 transition-colors duration-300">Features</a>
            <a href="#pricing" className="hover:text-neutral-300 transition-colors duration-300">Pricing</a>
            <a href="#comparison" className="hover:text-neutral-300 transition-colors duration-300">Compare</a>
            <span>&copy; {new Date().getFullYear()} BlinkBox. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
