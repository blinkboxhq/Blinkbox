import { Component, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Bot, Search, GitBranch, Shield, Cpu,
  Check, ChevronRight, Sparkles, Lock, Database, Workflow,
  Play, Layers, MousePointerClick, Menu, X, Mail,
  Minus, Plus, Zap, Webhook, Braces, Globe,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimatedGroup } from '@/components/ui/animated-group';
import { Button } from '@/components/ui/button';
import { BGPattern } from '@/components/ui/bg-pattern';
import { DottedSurface } from '@/components/ui/dotted-surface';
import { FeatureCard } from '@/components/ui/grid-feature-cards';
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

// ── Sunlight effect ────────────────────────────────────────────────────────
function LightRays() {
  const rays = [
    { angle: -48, w: 180, o: 0.018 },
    { angle: -36, w: 100, o: 0.032 },
    { angle: -26, w: 70,  o: 0.048 },
    { angle: -16, w: 50,  o: 0.065 },
    { angle: -7,  w: 38,  o: 0.085 },
    { angle: 0,   w: 32,  o: 0.1  },
    { angle: 7,   w: 38,  o: 0.085 },
    { angle: 16,  w: 50,  o: 0.065 },
    { angle: 26,  w: 70,  o: 0.048 },
    { angle: 36,  w: 100, o: 0.032 },
    { angle: 48,  w: 180, o: 0.018 },
  ];
  return (
    <div className="absolute top-0 left-1/2 pointer-events-none z-0" style={{ height: '85vh', width: 0 }}>
      {rays.map((ray, i) => (
        <div
          key={i}
          className="absolute top-0 left-0 origin-top"
          style={{
            width: `${ray.w}px`,
            height: '85vh',
            marginLeft: `-${ray.w / 2}px`,
            background: `linear-gradient(to bottom, rgba(255,255,255,${ray.o}) 0%, rgba(220,210,255,${ray.o * 0.6}) 30%, transparent 65%)`,
            transform: `rotate(${ray.angle}deg)`,
          }}
        />
      ))}
    </div>
  );
}

function SunlightEffect() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {/* Wide ambient glow */}
      <div
        className="absolute -top-32 left-1/2 -translate-x-1/2 w-[1100px] h-[700px]"
        style={{
          background: 'radial-gradient(ellipse 65% 55% at 50% 0%, rgba(255,255,255,0.11) 0%, rgba(180,160,255,0.07) 40%, rgba(100,80,200,0.03) 65%, transparent 80%)',
        }}
      />
      {/* Tight bright core */}
      <div
        className="absolute -top-16 left-1/2 -translate-x-1/2 w-[440px] h-[340px]"
        style={{
          background: 'radial-gradient(ellipse 55% 65% at 50% 0%, rgba(255,255,255,0.22) 0%, rgba(230,220,255,0.12) 35%, transparent 65%)',
        }}
      />
      {/* Hot-spot center */}
      <div
        className="absolute -top-4 left-1/2 -translate-x-1/2 w-[180px] h-[120px]"
        style={{
          background: 'radial-gradient(ellipse 50% 70% at 50% 0%, rgba(255,255,255,0.35) 0%, transparent 70%)',
        }}
      />
      <LightRays />
      {/* Ground bounce — subtle upwelling glow at bottom of hero */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[900px] h-[200px]"
        style={{
          background: 'radial-gradient(ellipse 80% 100% at 50% 100%, rgba(120,100,255,0.06) 0%, transparent 70%)',
        }}
      />
    </div>
  );
}

// ── Floating 2D elements ───────────────────────────────────────────────────
function FloatOrb({ style, size, color, delay, duration = 5 }) {
  return (
    <motion.div
      className="absolute pointer-events-none rounded-full"
      style={{ ...style, width: size, height: size,
        background: `radial-gradient(circle at 35% 35%, ${color}50 0%, ${color}18 45%, transparent 70%)`,
        boxShadow: `0 0 ${size * 0.8}px ${color}25, inset 0 0 ${size * 0.4}px ${color}15`,
        border: `1px solid ${color}20`,
      }}
      animate={{ y: [0, -16, 0], x: [0, 8, 0], scale: [1, 1.06, 1] }}
      transition={{ duration, delay, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}

function FloatNode({ style, label, Icon, color, delay, duration = 5.5 }) {
  return (
    <motion.div
      className="absolute pointer-events-none hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/[0.08] bg-black/70 backdrop-blur-md shadow-[0_4px_24px_rgba(0,0,0,0.6)]"
      style={style}
      animate={{ y: [0, -12, 0] }}
      transition={{ duration, delay, repeat: Infinity, ease: 'easeInOut' }}>
      <div className="w-[18px] h-[18px] rounded flex items-center justify-center shrink-0"
        style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
        <Icon className="w-[10px] h-[10px]" style={{ color }} />
      </div>
      <span className="text-[11px] text-neutral-400 font-medium tracking-wide whitespace-nowrap">{label}</span>
      <div className="w-1.5 h-1.5 rounded-full ml-0.5" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
    </motion.div>
  );
}

function FloatDot({ style, color = '#a78bfa', delay, duration = 3.5 }) {
  return (
    <motion.div
      className="absolute pointer-events-none rounded-full hidden md:block"
      style={{ ...style, width: 5, height: 5, background: color, boxShadow: `0 0 10px ${color}80, 0 0 4px ${color}` }}
      animate={{ scale: [1, 1.9, 1], opacity: [0.45, 1, 0.45] }}
      transition={{ duration, delay, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}

function FloatSpark({ style, delay, duration = 6 }) {
  return (
    <motion.div
      className="absolute pointer-events-none hidden md:block"
      style={style}
      animate={{ rotate: [0, 90, 0], scale: [0.7, 1.15, 0.7], opacity: [0.2, 0.6, 0.2] }}
      transition={{ duration, delay, repeat: Infinity, ease: 'easeInOut' }}>
      <Sparkles className="w-4 h-4 text-violet-300/60" />
    </motion.div>
  );
}

function FloatLine({ style, w, angle, delay }) {
  return (
    <motion.div
      className="absolute pointer-events-none origin-left hidden lg:block"
      style={{
        ...style, width: w, height: 1,
        background: 'linear-gradient(to right, transparent, rgba(180,160,255,0.2), transparent)',
        transform: `rotate(${angle}deg)`,
      }}
      animate={{ opacity: [0.2, 0.8, 0.2], scaleX: [0.85, 1.05, 0.85] }}
      transition={{ duration: 4, delay, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}

function FloatBadge({ style, text, delay }) {
  return (
    <motion.div
      className="absolute pointer-events-none hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/[0.07] bg-black/60 backdrop-blur-sm"
      style={style}
      animate={{ y: [0, -10, 0], opacity: [0.6, 1, 0.6] }}
      transition={{ duration: 5, delay, repeat: Infinity, ease: 'easeInOut' }}>
      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
      <span className="text-[10px] text-neutral-500 font-medium tracking-wide">{text}</span>
    </motion.div>
  );
}

function HeroFloatingElements() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* ── Left cluster ── */}
      <FloatOrb style={{ left: '5%', top: '22%' }}  size={52} color="#7c3aed" delay={0}   duration={5.5} />
      <FloatOrb style={{ left: '1%', top: '52%' }}  size={28} color="#3b82f6" delay={1.8} duration={6.5} />
      <FloatOrb style={{ left: '11%', top: '68%' }} size={18} color="#a78bfa" delay={0.7} duration={4.8} />

      <FloatNode style={{ left: '1%', top: '36%' }} label="Webhook trigger" Icon={Webhook} color="#a78bfa" delay={0.4} />
      <FloatNode style={{ left: '0.5%', top: '57%' }} label="AI Parse" Icon={Bot} color="#60a5fa" delay={1.5} />
      <FloatNode style={{ left: '3%', top: '74%' }} label="HTTP Request" Icon={Globe} color="#34d399" delay={2.5} duration={6} />

      <FloatSpark style={{ left: '20%', top: '18%' }} delay={0} />
      <FloatSpark style={{ left: '14%', top: '63%' }} delay={2.2} />
      <FloatSpark style={{ left: '8%',  top: '82%' }} delay={1.1} />

      <FloatDot style={{ left: '23%', top: '38%' }} color="#a78bfa" delay={0.9} />
      <FloatDot style={{ left: '7%',  top: '47%' }} color="#60a5fa" delay={0.3} />
      <FloatDot style={{ left: '17%', top: '76%' }} color="#34d399" delay={1.6} />
      <FloatDot style={{ left: '26%', top: '58%' }} color="#f472b6" delay={0.6} />

      <FloatLine style={{ left: '6%',  top: '44%' }} w={70}  angle={-12} delay={1}   />
      <FloatLine style={{ left: '10%', top: '65%' }} w={55}  angle={8}   delay={2.5} />

      <FloatBadge style={{ left: '17%', top: '28%' }} text="Running · 2.3k/day" delay={0.5} />

      {/* ── Right cluster ── */}
      <FloatOrb style={{ right: '5%', top: '18%' }}  size={46} color="#2563eb" delay={1}   duration={5} />
      <FloatOrb style={{ right: '2%', top: '50%' }}  size={32} color="#7c3aed" delay={0.5} duration={6} />
      <FloatOrb style={{ right: '10%', top: '70%' }} size={20} color="#f472b6" delay={1.3} duration={5.2} />

      <FloatNode style={{ right: '1%', top: '33%' }} label="Send Email" Icon={Mail}      color="#34d399" delay={1.2} />
      <FloatNode style={{ right: '0.5%', top: '55%' }} label="Filter"  Icon={GitBranch} color="#f472b6" delay={0.3} />
      <FloatNode style={{ right: '3%', top: '72%' }} label="Code"      Icon={Braces}    color="#facc15" delay={2.2} duration={6.5} />

      <FloatSpark style={{ right: '20%', top: '22%' }} delay={1.5} />
      <FloatSpark style={{ right: '13%', top: '60%' }} delay={0.5} />
      <FloatSpark style={{ right: '7%',  top: '80%' }} delay={2.8} />

      <FloatDot style={{ right: '24%', top: '40%' }} color="#2563eb" delay={1.2} />
      <FloatDot style={{ right: '8%',  top: '44%' }} color="#f472b6" delay={0.4} />
      <FloatDot style={{ right: '18%', top: '73%' }} color="#facc15" delay={2}   />
      <FloatDot style={{ right: '28%', top: '57%' }} color="#a78bfa" delay={0.8} />

      <FloatLine style={{ right: '6%',  top: '41%' }} w={65}  angle={10}  delay={1.5} />
      <FloatLine style={{ right: '11%', top: '63%' }} w={52}  angle={-8}  delay={0.3} />

      <FloatBadge style={{ right: '16%', top: '26%' }} text="250+ integrations" delay={1} />

      {/* ── Top scattered ── */}
      <FloatDot style={{ left: '38%', top: '8%'  }} color="#fff"    delay={0.2} duration={4} />
      <FloatDot style={{ left: '50%', top: '5%'  }} color="#a78bfa" delay={1.4} duration={3} />
      <FloatDot style={{ left: '62%', top: '9%'  }} color="#60a5fa" delay={0.7} duration={4.5} />
      <FloatDot style={{ left: '44%', top: '14%' }} color="#ffffff" delay={1.9} duration={3.5} />
      <FloatDot style={{ left: '56%', top: '13%' }} color="#c4b5fd" delay={0.5} duration={5} />
    </div>
  );
}

// ── Mini canvas preview ──────────────────────────────────────────────────
function CanvasPreview() {
  const nodes = [
    { x: 0,   y: 0,   label: 'Webhook',    icon: Webhook,    color: '#a78bfa' },
    { x: 200, y: -20, label: 'AI Parse',   icon: Bot,        color: '#60a5fa' },
    { x: 400, y: 10,  label: 'Filter',     icon: GitBranch,  color: '#f472b6' },
    { x: 600, y: -30, label: 'Send Email', icon: Mail,       color: '#34d399' },
  ];
  return (
    <div className="relative w-full max-w-2xl mx-auto h-[140px] reveal-on-scroll">
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 700 140" fill="none" preserveAspectRatio="xMidYMid meet">
        {["M 70 70 C 140 70, 160 50, 230 50", "M 280 50 C 350 50, 370 80, 440 80", "M 490 80 C 560 80, 580 40, 640 40"].map((d, i) => (
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
          <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: `${node.color}15` }}>
            <node.icon className="w-3.5 h-3.5" style={{ color: node.color }} />
          </div>
          <span className="text-xs text-neutral-300 font-medium whitespace-nowrap">{node.label}</span>
        </motion.div>
      ))}
    </div>
  );
}

// ── FAQ ──────────────────────────────────────────────────────────────────
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
            className="overflow-hidden">
            <p className="text-sm text-neutral-400 leading-relaxed pb-6">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Data ─────────────────────────────────────────────────────────────────
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
  { q: 'What makes this different from Zapier?', a: "AI agents, headless scraping, sandboxed code execution, visual logic routing. And we don't charge per task — Pro is flat $29/mo." },
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
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 60);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className="fixed top-0 z-50 w-full">
      <div className="px-3 pt-3">
        <motion.nav
          animate={isScrolled
            ? { backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.7)' }
            : { backdropFilter: 'blur(0px)', backgroundColor: 'rgba(0,0,0,0)' }
          }
          transition={{ duration: 0.3 }}
          className={cn(
            'mx-auto max-w-6xl px-5 lg:px-8 transition-all duration-300',
            isScrolled && 'max-w-4xl rounded-2xl border border-white/[0.07] shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_8px_32px_rgba(0,0,0,0.6)]'
          )}>
          <div className="relative flex items-center justify-between h-14">

            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 group shrink-0">
              <div className="relative">
                <img src={logo} alt="Blinkbox" className="w-6 h-6 object-contain" />
                <div className="absolute inset-0 blur-sm opacity-0 group-hover:opacity-60 transition-opacity" style={{ background: 'radial-gradient(circle, rgba(167,139,250,0.8), transparent 70%)' }} />
              </div>
              <span className="text-[13px] font-bold tracking-[0.06em] text-white/85 group-hover:text-white transition-colors">Blinkbox</span>
            </Link>

            {/* Desktop nav — centered */}
            <div className="absolute left-1/2 -translate-x-1/2 hidden lg:flex items-center gap-1">
              {NAV_ITEMS.map((item) => (
                <a key={item.name} href={item.href}
                  className="px-4 py-1.5 text-[13px] text-neutral-500 hover:text-white rounded-lg hover:bg-white/[0.05] transition-all duration-150 font-medium">
                  {item.name}
                </a>
              ))}
            </div>

            {/* CTA buttons */}
            <div className="hidden lg:flex items-center gap-2">
              <Button asChild variant="ghost" size="sm" className={cn('text-[13px] text-neutral-500 hover:text-white', isScrolled && 'hidden')}>
                <Link to="/login">Log in</Link>
              </Button>
              <Button asChild size="sm" className="text-[13px] rounded-lg h-8 px-4 shadow-[0_0_20px_rgba(255,255,255,0.06)]">
                <Link to="/login">{isScrolled ? 'Get Started' : 'Sign Up'}</Link>
              </Button>
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="lg:hidden relative z-20 -mr-2 p-2 text-neutral-400 hover:text-white transition-colors">
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </motion.nav>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden absolute top-[72px] left-3 right-3 rounded-2xl border border-white/[0.08] bg-black/90 backdrop-blur-xl p-5 shadow-2xl">
            <div className="flex flex-col gap-1 mb-5">
              {NAV_ITEMS.map((item) => (
                <a key={item.name} href={item.href} onClick={() => setMenuOpen(false)}
                  className="px-3 py-2.5 text-[14px] text-neutral-400 hover:text-white rounded-lg hover:bg-white/[0.05] transition-all font-medium">
                  {item.name}
                </a>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              <Button asChild variant="outline" className="w-full"><Link to="/login">Log in</Link></Button>
              <Button asChild className="w-full"><Link to="/login">Sign Up Free</Link></Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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

// ── Landing page ──────────────────────────────────────────────────────────
export default function Landing() {
  const pageRef = useScrollReveal();

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

      <main className="overflow-hidden">

        {/* ══════════════════════════════════════════════════════════════════
            HERO
        ══════════════════════════════════════════════════════════════════ */}
        <section className="relative min-h-[100svh] flex flex-col">

          {/* Background effects */}
          <SunlightEffect />

          {/* Very subtle dot grid */}
          <div
            className="absolute inset-0 pointer-events-none z-0 opacity-[0.25]"
            style={{
              backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.35) 1px, transparent 1px)',
              backgroundSize: '32px 32px',
              maskImage: 'radial-gradient(ellipse 80% 70% at 50% 0%, black 0%, transparent 75%)',
            }}
          />

          {/* Floating 2D elements */}
          <HeroFloatingElements />

          {/* Radial vignette so edges are dark */}
          <div aria-hidden className="absolute inset-0 z-[1] pointer-events-none"
            style={{ background: 'radial-gradient(ellipse 120% 100% at 50% 50%, transparent 30%, rgba(0,0,0,0.7) 80%, black 100%)' }} />

          {/* Hero content */}
          <div className="relative z-10 flex flex-col items-center justify-center flex-1 pt-28 pb-0 px-6">
            <div className="text-center max-w-7xl mx-auto w-full">

              <AnimatedGroup variants={{
                container: { visible: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } } },
                ...transitionVariants,
              }}>
                {/* Badge pill */}
                <Link to="/login"
                  className="group mx-auto mb-8 flex w-fit items-center gap-3.5 rounded-full border border-white/[0.09] bg-white/[0.04] px-4 py-1.5 pr-2 shadow-[0_0_0_1px_rgba(255,255,255,0.04),inset_0_1px_0_rgba(255,255,255,0.06)] hover:bg-white/[0.07] transition-all duration-300">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    <span className="text-[13px] text-neutral-400 font-medium">Introducing Brian — AI workflow builder</span>
                  </div>
                  <div className="h-5 w-5 rounded-full bg-white/[0.08] group-hover:bg-white/[0.14] flex items-center justify-center transition-colors duration-300">
                    <ArrowRight className="w-2.5 h-2.5 text-neutral-400" />
                  </div>
                </Link>

                {/* Headline */}
                <h1 className="mt-2 text-balance font-extrabold tracking-[-0.03em] leading-[1.04] text-transparent bg-clip-text bg-gradient-to-b from-white from-40% via-white/90 to-neutral-500 text-[clamp(3rem,7vw,5.75rem)]">
                  Your workflows,<br className="hidden sm:block" /> on autopilot.
                </h1>

                {/* Sub */}
                <p className="mt-7 mx-auto max-w-xl text-balance text-[16px] leading-relaxed text-neutral-500">
                  Visual automation engine. Drag nodes, wire logic, deploy AI agents —
                  or just tell <span className="text-neutral-300 font-medium">Brian</span> what you need
                  and watch it build the workflow for you.
                </p>
              </AnimatedGroup>

              {/* CTAs */}
              <AnimatedGroup
                variants={{
                  container: { visible: { transition: { staggerChildren: 0.06, delayChildren: 0.7 } } },
                  ...transitionVariants,
                }}
                className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <div className="p-[1px] rounded-[13px] bg-gradient-to-b from-white/20 to-white/5">
                  <Button asChild size="lg" className="rounded-xl px-7 text-[14px] font-semibold bg-white text-black hover:bg-neutral-100 shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                    <Link to="/login">
                      Start Building
                      <ArrowRight className="w-4 h-4 ml-2.5" />
                    </Link>
                  </Button>
                </div>
                <Button asChild size="lg" variant="ghost" className="rounded-xl px-6 text-[14px] text-neutral-500 hover:text-white">
                  <a href="#how-it-works">
                    See how it works
                    <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </a>
                </Button>
              </AnimatedGroup>

              {/* Trust strip */}
              <AnimatedGroup
                variants={{
                  container: { visible: { transition: { staggerChildren: 0.05, delayChildren: 1.0 } } },
                  ...transitionVariants,
                }}
                className="mt-8 flex items-center justify-center gap-5 flex-wrap">
                {[
                  { icon: Lock, label: 'AES-256 Encrypted' },
                  { icon: Shield, label: 'Self-Hostable' },
                  { icon: Zap, label: 'Free Forever Plan' },
                ].map(({ icon: Icon, label }, i) => (
                  <div key={label} className="flex items-center gap-1.5 text-neutral-600">
                    {i > 0 && <div className="w-px h-3.5 bg-white/[0.06] mr-3" />}
                    <Icon className="w-3 h-3" />
                    <span className="text-[11px] uppercase tracking-widest font-medium">{label}</span>
                  </div>
                ))}
              </AnimatedGroup>
            </div>

            {/* Screenshot */}
            <AnimatedGroup
              variants={{
                container: { visible: { transition: { delayChildren: 0.85 } } },
                ...transitionVariants,
              }}
              className="w-full mt-14 sm:mt-16 md:mt-20">
              <div className="relative -mr-56 sm:mr-0 overflow-hidden px-2">
                <div aria-hidden className="absolute inset-0 z-10 pointer-events-none bg-gradient-to-b from-transparent from-50% to-black" />
                {/* Glow behind screenshot */}
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[300px] pointer-events-none"
                  style={{ background: 'radial-gradient(ellipse 70% 100% at 50% 50%, rgba(120,100,255,0.07), transparent 70%)' }} />
                {/* The frame */}
                <div className="relative mx-auto max-w-6xl overflow-hidden rounded-2xl shadow-[0_0_0_1px_rgba(255,255,255,0.07),0_32px_80px_rgba(0,0,0,0.9),0_0_0_1px_rgba(120,100,255,0.06)]"
                  style={{ background: 'linear-gradient(to bottom, rgba(30,28,40,1), rgba(10,10,14,1))' }}>
                  {/* Top bar decoration */}
                  <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/[0.06]">
                    <div className="w-2.5 h-2.5 rounded-full bg-white/[0.08]" />
                    <div className="w-2.5 h-2.5 rounded-full bg-white/[0.06]" />
                    <div className="w-2.5 h-2.5 rounded-full bg-white/[0.05]" />
                    <div className="ml-3 h-5 flex-1 max-w-[200px] rounded-md bg-white/[0.04] border border-white/[0.05]" />
                  </div>
                  <img
                    src={heroScreenshot}
                    alt="Blinkbox canvas"
                    className="w-full object-cover block"
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
                { src: 'https://html.tailus.io/blocks/customers/nvidia.svg',        alt: 'Nvidia',       h: 'h-5' },
                { src: imgGithub,                                                    alt: 'GitHub',       h: 'h-4', invert: true },
                { src: 'https://html.tailus.io/blocks/customers/nike.svg',          alt: 'Nike',         h: 'h-5' },
                { src: imgOpenAI,                                                    alt: 'OpenAI',       h: 'h-6', invert: true },
                { src: 'https://html.tailus.io/blocks/customers/lemonsqueezy.svg',  alt: 'Lemon Squeezy',h: 'h-5' },
                { src: 'https://html.tailus.io/blocks/customers/laravel.svg',       alt: 'Laravel',      h: 'h-4' },
                { src: imgSlack,                                                     alt: 'Slack',        h: 'h-5' },
                { src: imgStripe,                                                    alt: 'Stripe',       h: 'h-5', invert: true },
              ].map((item) => (
                <div key={item.alt} className="flex items-center justify-center">
                  <img src={item.src} alt={item.alt}
                    className={`mx-auto w-fit ${item.h} opacity-50 grayscale transition-all duration-300 group-hover:opacity-30 ${item.invert ? 'invert' : ''}`} />
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
                  <Button asChild variant={plan.highlight ? 'default' : 'outline'} className="w-full">
                    <Link to="/login">{plan.cta}</Link>
                  </Button>
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
              <div className="inline-block p-[1px] rounded-xl bg-gradient-to-b from-white/20 to-white/5">
                <Button asChild size="lg" className="rounded-[11px] px-8 font-bold text-base shadow-[0_0_60px_rgba(255,255,255,0.08)] hover:-translate-y-0.5 transition-transform">
                  <Link to="/login">
                    Get Started Free
                    <ArrowRight className="w-4 h-4 ml-3" />
                  </Link>
                </Button>
              </div>
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
