import { useEffect, useRef, useState, Component } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Bot, GitBranch, Shield, Check, Zap,
  Menu, X, Layers, Globe, MessageSquare, Lock,
  Database, Code2, RefreshCw, BarChart3, Timer,
  Webhook, Minus, Plus,
} from 'lucide-react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { Button } from '@/components/ui/button';

import imgSlack from '../../assets/slack.png';
import imgGmail from '../../assets/gmail.png';
import imgStripe from '../../assets/stripe.svg';
import imgGithub from '../../assets/github.svg';
import imgNotion from '../../assets/notion.svg';
import imgHubspot from '../../assets/hubspot.svg';
import imgTypeform from '../../assets/typeform.svg';
import imgShopify from '../../assets/shopify.svg';
import imgDiscord from '../../assets/discord.png';
import imgTelegram from '../../assets/telegram.png';
import imgOpenai from '../../assets/openai.svg';
import imgJira from '../../assets/jira.svg';
import imgSalesforce from '../../assets/salesforce.svg';
import imgLinear from '../../assets/linear.svg';
import imgVercel from '../../assets/vercel.svg';
import imgPostgres from '../../assets/postgresql.svg';
import imgAnthropic from '../../assets/anthropic.svg';
import imgGemini from '../../assets/gemini-color.svg';
import imgBrian from '../../assets/brian.webp';
import logo from '../../assets/logo.svg';

// ─── Error boundary ───────────────────────────────────────────────────────────
class SilentBoundary extends Component {
  constructor(props) { super(props); this.state = { err: false }; }
  static getDerivedStateFromError() { return { err: true }; }
  render() { return this.state.err ? null : this.props.children; }
}

// ─── Scroll-reveal hook ───────────────────────────────────────────────────────
function useReveal(threshold = 0.15) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: threshold });
  return { ref, inView };
}

// ─── Animated counter ────────────────────────────────────────────────────────
function Counter({ to, suffix = '', duration = 2000 }) {
  const [val, setVal] = useState(0);
  const { ref, inView } = useReveal(0.5);
  useEffect(() => {
    if (!inView) return;
    const start = Date.now();
    const tick = () => {
      const p = Math.min(1, (Date.now() - start) / duration);
      const ease = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(ease * to));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, to, duration]);
  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
}

// ─── Live workflow hero visual ────────────────────────────────────────────────
const INITIAL_LOG = [
  { id: 1, name: 'Sarah K.', result: '→ #enterprise-deals', ms: 340, ok: true },
  { id: 2, name: 'James Liu', result: '→ nurture sequence', ms: 520, ok: true },
  { id: 3, name: 'Priya M.', result: '→ #enterprise-deals', ms: 290, ok: true },
  { id: 4, name: 'Omar Hassan', result: '→ HubSpot CRM', ms: 410, ok: true },
  { id: 5, name: 'Chen Wei', result: 'Classifying…', ms: null, ok: null },
];

const EXTRA_LOG = [
  { id: 6, name: 'Léa Bernard', result: '→ #enterprise-deals', ms: 380 },
  { id: 7, name: 'Amir Shah', result: '→ nurture sequence', ms: 510 },
  { id: 8, name: 'Maria G.', result: '→ HubSpot CRM', ms: 300 },
  { id: 9, name: 'Tom Burton', result: '→ #enterprise-deals', ms: 460 },
  { id: 10, name: 'Riko Tanaka', result: '→ nurture sequence', ms: 390 },
];

function WFNode({ label, sub, icon: Icon, color, status, delay, posStyle }) {
  return (
    <motion.div
      className="absolute w-[140px] rounded-xl border border-white/[0.08] bg-[#111] p-3"
      style={posStyle}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="w-6 h-6 rounded-md flex items-center justify-center"
          style={{ background: `${color}18`, border: `1px solid ${color}28` }}>
          <Icon className="w-3 h-3" style={{ color }} />
        </div>
        {status === 'live' && (
          <div className="relative w-1.5 h-1.5">
            <div className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-60" />
            <div className="relative rounded-full w-full h-full bg-emerald-500" />
          </div>
        )}
        {status === 'running' && <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />}
        {status === 'done' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
      </div>
      <p className="text-[11px] font-semibold text-white leading-snug">{label}</p>
      <p className="text-[9px] text-neutral-600 mt-0.5 leading-snug">{sub}</p>
    </motion.div>
  );
}

function WorkflowHero() {
  const [log, setLog] = useState(INITIAL_LOG);
  const [count, setCount] = useState(2847);
  const extraRef = useRef(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCount(c => c + 1);
      extraRef.current += 1;
      const next = EXTRA_LOG[extraRef.current % EXTRA_LOG.length];
      setLog(prev => [
        ...prev.slice(1),
        { ...next, id: Date.now(), ok: true },
        { id: Date.now() + 1, name: EXTRA_LOG[(extraRef.current + 1) % EXTRA_LOG.length].name, result: 'Classifying…', ms: null, ok: null },
      ].slice(0, 5));
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  // SVG coordinate system: 580 × 280
  const pTriggerAI = 'M 164 142 L 220 142';
  const pAISlack   = 'M 384 142 C 414 142 424 88 444 88';
  const pAICRM     = 'M 384 142 C 414 142 424 196 444 196';

  return (
    <div className="relative mx-auto max-w-[900px] rounded-2xl border border-white/[0.07] bg-[#0a0a0a] overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_60px_120px_rgba(0,0,0,0.9)]">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-white/[0.06]">
        <div className="flex gap-1.5 shrink-0">
          {[0.08, 0.06, 0.04].map((o, i) => (
            <div key={i} className="w-2.5 h-2.5 rounded-full" style={{ background: `rgba(255,255,255,${o})` }} />
          ))}
        </div>
        <span className="text-[11px] text-neutral-600 font-medium flex-1 text-center">Lead Routing Pipeline</span>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] text-neutral-600">{count.toLocaleString()} today</span>
          <div className="relative w-1.5 h-1.5">
            <div className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-50" />
            <div className="relative rounded-full w-full h-full bg-emerald-500" />
          </div>
          <span className="text-[10px] text-emerald-500 font-medium">Live</span>
        </div>
      </div>

      {/* Body */}
      <div className="flex">
        {/* Canvas area */}
        <div className="flex-1 relative" style={{ height: 280 }}>
          <svg
            viewBox="0 0 580 280"
            className="absolute inset-0 w-full h-full"
            fill="none"
          >
            <defs>
              {['gv','gb','gg','gp'].map(id => (
                <filter key={id} id={id} x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="2.5" result="b" />
                  <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              ))}
            </defs>

            {/* Edge lines */}
            <path d={pTriggerAI} stroke="rgba(255,255,255,0.07)" strokeWidth="1.5" />
            <path d={pAISlack}   stroke="rgba(255,255,255,0.07)" strokeWidth="1.5" />
            <path d={pAICRM}     stroke="rgba(255,255,255,0.07)" strokeWidth="1.5" />

            {/* Branch labels */}
            <text x="400" y="120" fill="rgba(52,211,153,0.4)" fontSize="8" fontFamily="monospace">true</text>
            <text x="400" y="168" fill="rgba(248,113,113,0.4)" fontSize="8" fontFamily="monospace">false</text>

            {/* Traveling data dots */}
            <circle r="3.5" fill="#a78bfa" filter="url(#gv)">
              <animateMotion dur="1.1s" begin="0.3s" repeatCount="indefinite" path={pTriggerAI} />
            </circle>
            <circle r="3.5" fill="#60a5fa" filter="url(#gb)">
              <animateMotion dur="1.8s" begin="1.5s" repeatCount="indefinite" path={pAISlack} />
            </circle>
            <circle r="3.5" fill="#f472b6" filter="url(#gp)">
              <animateMotion dur="1.8s" begin="3.1s" repeatCount="indefinite" path={pAICRM} />
            </circle>
          </svg>

          {/* Nodes — positioned to match the SVG coordinate system (580×280) */}
          <WFNode delay={0}    posStyle={{ left: '3.5%',  top: '37%' }} label="Form Submitted" sub="Typeform trigger"   icon={Webhook}        color="#a78bfa" status="live"    />
          <WFNode delay={0.15} posStyle={{ left: '37.9%', top: '37%' }} label="AI Classify"    sub="Brian · GPT-4o"    icon={Bot}            color="#60a5fa" status="running" />
          <WFNode delay={0.3}  posStyle={{ left: '76.6%', top: '16%' }} label="Slack Alert"    sub="#enterprise-deals" icon={MessageSquare}  color="#34d399" status="done"    />
          <WFNode delay={0.45} posStyle={{ left: '76.6%', top: '59%' }} label="Update CRM"     sub="HubSpot · 1 field" icon={Database}       color="#f472b6" status="done"    />
        </div>

        {/* Execution log sidebar */}
        <div className="w-[210px] shrink-0 border-l border-white/[0.06] p-4 flex flex-col overflow-hidden">
          <p className="text-[10px] font-semibold text-neutral-600 uppercase tracking-wider mb-3">Executions</p>
          <div className="flex flex-col gap-0.5 flex-1">
            <AnimatePresence mode="popLayout">
              {log.map(entry => (
                <motion.div
                  key={entry.id}
                  layout
                  initial={{ opacity: 0, y: -12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 12 }}
                  transition={{ duration: 0.28 }}
                  className="flex items-center gap-2 py-1.5 border-b border-white/[0.04] last:border-0"
                >
                  <div className={`w-1 h-1 rounded-full shrink-0 ${entry.ok === null ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-white font-medium truncate">{entry.name}</p>
                    <p className="text-[9px] text-neutral-600 truncate">{entry.result}</p>
                  </div>
                  {entry.ms && <span className="text-[9px] text-neutral-700 shrink-0">{entry.ms}ms</span>}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Header ──────────────────────────────────────────────────────────────────
function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <motion.nav
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4"
      animate={{
        backgroundColor: scrolled ? 'rgba(8,8,8,0.92)' : 'transparent',
        borderBottomColor: scrolled ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0)',
        backdropFilter: scrolled ? 'blur(16px)' : 'blur(0px)',
      }}
      style={{ borderBottomWidth: 1, borderBottomStyle: 'solid' }}
      transition={{ duration: 0.2 }}
    >
      <Link to="/" className="flex items-center gap-2.5">
        <img src={logo} alt="Blinkbox" className="w-6 h-6" />
        <span className="text-[15px] font-semibold text-white tracking-tight">Blinkbox</span>
      </Link>

      <div className="hidden md:flex items-center gap-7">
        {['Product', 'Integrations', 'Docs', 'Pricing'].map(item => (
          <Link key={item} to="#" className="text-[13px] text-neutral-500 hover:text-white transition-colors duration-150">
            {item}
          </Link>
        ))}
      </div>

      <div className="hidden md:flex items-center gap-3">
        <Link to="/login" className="text-[13px] text-neutral-500 hover:text-white transition-colors duration-150">Sign in</Link>
        <Link to="/register">
          <Button size="sm" className="text-[13px] h-8 px-4 rounded-lg">Get started free</Button>
        </Link>
      </div>

      <button className="md:hidden text-neutral-400" onClick={() => setMobileOpen(v => !v)}>
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute top-full left-0 right-0 bg-[#080808]/95 backdrop-blur-xl border-b border-white/[0.06] p-6 flex flex-col gap-4"
          >
            {['Product', 'Integrations', 'Docs', 'Pricing'].map(item => (
              <Link key={item} to="#" className="text-[15px] text-neutral-400" onClick={() => setMobileOpen(false)}>{item}</Link>
            ))}
            <div className="flex flex-col gap-3 pt-4 border-t border-white/[0.06]">
              <Link to="/login" className="text-[15px] text-neutral-500">Sign in</Link>
              <Link to="/register"><Button className="w-full">Get started free</Button></Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}

// ─── Scrolling logo strip ─────────────────────────────────────────────────────
const ALL_LOGOS = [
  { src: imgSlack, name: 'Slack' }, { src: imgGmail, name: 'Gmail' },
  { src: imgStripe, name: 'Stripe' }, { src: imgGithub, name: 'GitHub' },
  { src: imgNotion, name: 'Notion' }, { src: imgHubspot, name: 'HubSpot' },
  { src: imgTypeform, name: 'Typeform' }, { src: imgShopify, name: 'Shopify' },
  { src: imgDiscord, name: 'Discord' }, { src: imgTelegram, name: 'Telegram' },
  { src: imgOpenai, name: 'OpenAI' }, { src: imgJira, name: 'Jira' },
  { src: imgSalesforce, name: 'Salesforce' }, { src: imgLinear, name: 'Linear' },
  { src: imgVercel, name: 'Vercel' }, { src: imgPostgres, name: 'Postgres' },
  { src: imgAnthropic, name: 'Anthropic' }, { src: imgGemini, name: 'Gemini' },
];

function LogoStrip() {
  const doubled = [...ALL_LOGOS, ...ALL_LOGOS];
  return (
    <div className="relative overflow-hidden py-2">
      <div className="absolute left-0 top-0 bottom-0 w-24 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to right, #080808, transparent)' }} />
      <div className="absolute right-0 top-0 bottom-0 w-24 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to left, #080808, transparent)' }} />
      <motion.div
        className="flex items-center gap-8"
        animate={{ x: [0, -(ALL_LOGOS.length * 88)] }}
        transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
        style={{ width: 'max-content' }}
      >
        {doubled.map((item, i) => (
          <div key={i} className="flex items-center gap-2 shrink-0">
            <img src={item.src} alt={item.name} className="w-4 h-4 object-contain opacity-30 grayscale" />
            <span className="text-[12px] text-neutral-600 font-medium">{item.name}</span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

// ─── Integration grid ─────────────────────────────────────────────────────────
const GRID_LOGOS = [
  { src: imgSlack, name: 'Slack' }, { src: imgGmail, name: 'Gmail' },
  { src: imgStripe, name: 'Stripe' }, { src: imgGithub, name: 'GitHub' },
  { src: imgNotion, name: 'Notion' }, { src: imgHubspot, name: 'HubSpot' },
  { src: imgTypeform, name: 'Typeform' }, { src: imgShopify, name: 'Shopify' },
  { src: imgOpenai, name: 'OpenAI' }, { src: imgJira, name: 'Jira' },
  { src: imgSalesforce, name: 'Salesforce' }, { src: imgPostgres, name: 'Postgres' },
];

function IntegrationGrid() {
  return (
    <div className="grid grid-cols-3 gap-2.5 max-w-[300px]">
      {GRID_LOGOS.map((item, i) => (
        <motion.div
          key={item.name}
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.04, duration: 0.35, ease: 'easeOut' }}
          viewport={{ once: true, amount: 0.3 }}
          className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-white/[0.07] bg-[#0f0f0f] hover:border-white/[0.14] transition-colors duration-200"
        >
          <img src={item.src} alt={item.name} className="w-5 h-5 object-contain" />
          <span className="text-[9px] text-neutral-600 font-medium">{item.name}</span>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Brian AI demo ────────────────────────────────────────────────────────────
const BRIAN_PROMPT = 'When a new lead fills our Typeform, score them with AI, then route high-value leads to Slack and add everyone to HubSpot.';

function BrianDemo() {
  const [chars, setChars] = useState(0);
  const [showFlow, setShowFlow] = useState(false);
  const { ref, inView } = useReveal(0.4);

  useEffect(() => {
    if (!inView) return;
    let i = 0;
    const tick = setInterval(() => {
      i += 2;
      setChars(i);
      if (i >= BRIAN_PROMPT.length) {
        clearInterval(tick);
        setTimeout(() => setShowFlow(true), 400);
      }
    }, 30);
    return () => clearInterval(tick);
  }, [inView]);

  const nodes = [
    { label: 'Typeform', icon: Webhook, color: '#a78bfa' },
    { label: 'AI Score', icon: Bot, color: '#60a5fa' },
    { label: 'Slack', icon: MessageSquare, color: '#34d399' },
    { label: 'HubSpot', icon: Database, color: '#f472b6' },
  ];

  return (
    <div ref={ref} className="rounded-2xl border border-white/[0.07] bg-[#0a0a0a] overflow-hidden w-full max-w-[480px]">
      <div className="p-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-2 mb-3">
          <img src={imgBrian} alt="Brian" className="w-5 h-5 rounded-full" />
          <span className="text-[11px] text-neutral-500 font-medium">Brian AI</span>
        </div>
        <p className="text-[12px] text-neutral-300 leading-relaxed font-mono min-h-[60px]">
          {BRIAN_PROMPT.slice(0, chars)}
          {chars < BRIAN_PROMPT.length && <span className="animate-pulse text-violet-400">|</span>}
        </p>
      </div>
      <div className="p-5">
        <p className="text-[10px] text-neutral-600 uppercase tracking-wider mb-3 font-semibold">Generated workflow</p>
        <div className="flex items-center gap-2 flex-wrap min-h-[36px]">
          <AnimatePresence>
            {showFlow && nodes.map((n, i) => (
              <motion.div key={n.label} className="flex items-center gap-2"
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.15 }}>
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/[0.08] bg-[#111]">
                  <n.icon className="w-3 h-3" style={{ color: n.color }} />
                  <span className="text-[11px] text-white font-medium">{n.label}</span>
                </div>
                {i < nodes.length - 1 && <ArrowRight className="w-3 h-3 text-neutral-700 shrink-0" />}
              </motion.div>
            ))}
          </AnimatePresence>
          {!showFlow && (
            <div className="w-4 h-4 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
          )}
        </div>
        {showFlow && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
            className="text-[10px] text-emerald-500 mt-3 font-medium">
            ✓ Workflow ready · 4 nodes · ~1.2s per run
          </motion.p>
        )}
      </div>
    </div>
  );
}

// ─── Pricing comparison chart ─────────────────────────────────────────────────
function PricingChart() {
  const { ref, inView } = useReveal(0.4);

  const pts = [0, 2000, 5000, 10000, 20000, 50000];
  const zapierCost = (t) => Math.min(560, 20 + t * 0.0088);
  const bbCost = 29;
  const maxCost = 580;
  const maxTasks = 50000;

  const toX = (t) => 44 + (t / maxTasks) * 256;
  const toY = (c) => 155 - (c / maxCost) * 135;

  const zapPath = pts.map((t, i) => `${i === 0 ? 'M' : 'L'} ${toX(t).toFixed(1)} ${toY(zapierCost(t)).toFixed(1)}`).join(' ');
  const bbLine  = `M ${toX(0)} ${toY(bbCost)} L ${toX(50000)} ${toY(bbCost)}`;

  return (
    <div ref={ref} className="rounded-2xl border border-white/[0.07] bg-[#0a0a0a] p-6 w-full max-w-[480px]">
      <svg viewBox="0 0 320 180" className="w-full overflow-visible">
        {[0, 150, 300, 450].map(c => (
          <line key={c} x1="44" y1={toY(c)} x2="300" y2={toY(c)} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
        ))}
        {[0, 200, 400].map(c => (
          <text key={c} x="38" y={toY(c) + 4} fill="rgba(255,255,255,0.18)" fontSize="9" textAnchor="end" fontFamily="monospace">${c}</text>
        ))}
        {[0, 25000, 50000].map(t => (
          <text key={t} x={toX(t)} y="172" fill="rgba(255,255,255,0.18)" fontSize="8" textAnchor="middle" fontFamily="monospace">
            {t >= 1000 ? `${t / 1000}k` : '0'}
          </text>
        ))}
        <text x="172" y="184" fill="rgba(255,255,255,0.12)" fontSize="8" textAnchor="middle">tasks / month</text>

        {inView && (
          <>
            <motion.path d={`${zapPath} L ${toX(50000)} ${toY(0)} L ${toX(0)} ${toY(0)} Z`}
              fill="rgba(255,255,255,0.025)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.3 }} />
            <motion.path d={zapPath} stroke="rgba(255,100,60,0.55)" strokeWidth="2" fill="none"
              strokeDasharray="400" strokeDashoffset="400"
              animate={{ strokeDashoffset: 0 }} transition={{ duration: 1.2, delay: 0.2, ease: 'easeOut' }} />
            <motion.path d={bbLine} stroke="#a78bfa" strokeWidth="2.5" fill="none"
              strokeDasharray="280" strokeDashoffset="280"
              animate={{ strokeDashoffset: 0 }} transition={{ duration: 1.0, delay: 0.7, ease: 'easeOut' }} />
            <motion.text initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3 }}
              x="298" y={toY(zapierCost(50000)) - 7} fill="rgba(255,100,60,0.65)" fontSize="9" textAnchor="end" fontFamily="sans-serif">
              Zapier ~$490/mo
            </motion.text>
            <motion.text initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}
              x="298" y={toY(bbCost) - 7} fill="#a78bfa" fontSize="9" textAnchor="end" fontFamily="sans-serif">
              Blinkbox $29/mo
            </motion.text>
          </>
        )}
      </svg>
      <p className="text-[10px] text-neutral-700 mt-1 text-center">At 50k tasks/month · illustrative</p>
    </div>
  );
}

// ─── Feature block (alternating) ─────────────────────────────────────────────
function Feature({ eyebrow, headline, body, visual, flip = false }) {
  const { ref, inView } = useReveal();
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className={`flex flex-col ${flip ? 'lg:flex-row-reverse' : 'lg:flex-row'} items-center gap-16`}
    >
      <div className="flex-1 max-w-[420px]">
        <p className="text-[11px] font-semibold text-violet-400 uppercase tracking-widest mb-4">{eyebrow}</p>
        <h3 className="text-3xl font-bold text-white tracking-tight leading-tight mb-5 whitespace-pre-line">{headline}</h3>
        <p className="text-[15px] text-neutral-500 leading-relaxed">{body}</p>
      </div>
      <div className="flex-1 flex justify-center">
        {visual}
      </div>
    </motion.div>
  );
}

// ─── FAQ item ─────────────────────────────────────────────────────────────────
function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/[0.06] py-5">
      <button className="flex items-center justify-between w-full text-left gap-4" onClick={() => setOpen(v => !v)}>
        <span className="text-[15px] font-medium text-white">{q}</span>
        <div className="shrink-0 w-5 h-5 flex items-center justify-center text-neutral-600">
          {open ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        </div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <p className="text-[14px] text-neutral-500 leading-relaxed pt-4">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Landing() {
  const heroRef = useRef(null);
  const heroInView = useInView(heroRef, { once: true, amount: 0.2 });

  return (
    <SilentBoundary>
      <div className="min-h-screen bg-[#080808] text-white overflow-x-hidden">
        <Header />

        {/* ── HERO ─────────────────────────────────────────────────────── */}
        <section className="relative pt-40 pb-20 px-6">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[480px] pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(139,92,246,0.10) 0%, transparent 65%)' }} />

          <div ref={heroRef} className="relative max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={heroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] mb-10"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
              <span className="text-[11px] text-neutral-400 font-medium">Now in public beta — free to start</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={heroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.65, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="text-5xl sm:text-6xl lg:text-[78px] font-bold leading-[1.0] tracking-[-0.04em] mb-6"
            >
              Build workflows<br />
              <span style={{
                background: 'linear-gradient(90deg, #fff 0%, rgba(255,255,255,0.45) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                that run themselves.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={heroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.18 }}
              className="text-[17px] text-neutral-500 leading-relaxed max-w-xl mx-auto mb-10"
            >
              AI agents, headless scraping, and logic routing — all on a flat monthly plan
              that doesn't charge you per task.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={heroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.26 }}
              className="flex items-center justify-center gap-3 mb-16"
            >
              <Link to="/register">
                <Button className="h-11 px-7 text-[14px] rounded-xl gap-2">
                  Start for free <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" className="h-11 px-7 text-[14px] rounded-xl border-white/[0.1] text-neutral-400 hover:text-white">
                  Sign in
                </Button>
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 32 }}
              animate={heroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.36, ease: [0.16, 1, 0.3, 1] }}
            >
              <WorkflowHero />
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={heroInView ? { opacity: 1 } : {}}
              transition={{ duration: 0.6, delay: 0.9 }}
              className="flex items-center justify-center gap-6 mt-8 flex-wrap"
            >
              {['No credit card required', 'AES-256 encrypted', 'Self-hostable'].map((item, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[12px] text-neutral-600">
                  <Check className="w-3 h-3 text-neutral-700" />
                  {item}
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ── STATS ────────────────────────────────────────────────────── */}
        <section className="py-16 px-6 border-y border-white/[0.05]">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-14">
              {[
                { n: 2300000, suf: '+', label: 'Executions / day' },
                { n: 250, suf: '+', label: 'Integrations' },
                { n: 99, suf: '.9%', label: 'Uptime SLA' },
                { n: 40, suf: 'ms', label: 'Median latency' },
              ].map(({ n, suf, label }) => (
                <div key={label} className="text-center">
                  <div className="text-3xl font-bold text-white tracking-tight mb-1">
                    <Counter to={n} suffix={suf} />
                  </div>
                  <div className="text-[12px] text-neutral-600">{label}</div>
                </div>
              ))}
            </div>
            <div className="border-t border-white/[0.05] pt-10">
              <p className="text-center text-[11px] text-neutral-700 uppercase tracking-widest mb-6 font-semibold">
                Connects with everything you already use
              </p>
              <LogoStrip />
            </div>
          </div>
        </section>

        {/* ── FEATURES ─────────────────────────────────────────────────── */}
        <section className="py-32 px-6">
          <div className="max-w-5xl mx-auto flex flex-col gap-32">
            <Feature
              eyebrow="250+ native integrations"
              headline={'Every tool in\none canvas.'}
              body="Connect Slack, Gmail, Stripe, GitHub, and 246 more without a single line of code. Blinkbox's node canvas makes multi-step workflows visual and maintainable — no spaghetti scripts, no YAML."
              visual={<IntegrationGrid />}
            />
            <Feature
              flip
              eyebrow="AI-powered builder"
              headline={'Tell Brian what\nyou need.'}
              body="Brian, our built-in AI agent, translates plain English into ready-to-run workflows. Describe the automation and watch the canvas build itself — then deploy in one click."
              visual={<BrianDemo />}
            />
            <Feature
              eyebrow="Flat pricing"
              headline={'Scale without\nthe tax bill.'}
              body="Zapier bills per task. Blinkbox bills per month. At 50,000 monthly tasks, you'd pay ~$490 on Zapier. On Blinkbox, it's $29. Every month. That math never changes."
              visual={<PricingChart />}
            />
          </div>
        </section>

        {/* ── CAPABILITY GRID ───────────────────────────────────────────── */}
        <section className="py-20 px-6 border-y border-white/[0.05]">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="text-3xl font-bold text-white tracking-tight mb-4">Everything your stack needs</h2>
              <p className="text-[15px] text-neutral-500 max-w-md mx-auto">
                Blinkbox isn't one tool — it's the infrastructure layer between all of yours.
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { icon: Bot,       color: '#a78bfa', label: 'AI Agents',       desc: 'Deploy Brian as a standalone agent that acts on triggers and makes decisions autonomously.' },
                { icon: Globe,     color: '#60a5fa', label: 'Headless Scraping', desc: 'Full-browser automation with Puppeteer, anti-bot evasion, and structured data output.' },
                { icon: GitBranch, color: '#34d399', label: 'Logic Routing',   desc: 'Conditional branches, merge gates, loops, and retry logic — no code needed.' },
                { icon: Code2,     color: '#fb923c', label: 'Code Sandbox',    desc: 'Drop into JavaScript or Python mid-workflow when no built-in node quite fits.' },
                { icon: Lock,      color: '#f472b6', label: 'Encrypted Vault', desc: 'AES-256 credential store for OAuth tokens, API keys, and secrets — never in plaintext.' },
                { icon: RefreshCw, color: '#facc15', label: 'Crash Recovery',  desc: 'Cursor-based execution resumes exactly where it left off after any server failure.' },
              ].map(({ icon: Icon, color, label, desc }, i) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06, duration: 0.5 }}
                  viewport={{ once: true, amount: 0.3 }}
                  className="p-5 rounded-2xl border border-white/[0.07] bg-[#0d0d0d] hover:border-white/[0.12] transition-colors duration-200"
                >
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-4"
                    style={{ background: `${color}14`, border: `1px solid ${color}22` }}>
                    <Icon className="w-4 h-4" style={{ color }} />
                  </div>
                  <p className="text-[13px] font-semibold text-white mb-1.5">{label}</p>
                  <p className="text-[12px] text-neutral-600 leading-relaxed">{desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── PRICING ───────────────────────────────────────────────────── */}
        <section className="py-32 px-6" id="pricing">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-white tracking-tight mb-4">One flat rate. No surprises.</h2>
              <p className="text-[15px] text-neutral-500">Run millions of tasks. Your bill doesn't move.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-5">
              {[
                {
                  name: 'Starter', price: 'Free', period: 'forever',
                  desc: 'For solo builders and side projects.',
                  features: ['5,000 executions / mo', '10 active workflows', '50+ integrations', 'Community support'],
                  cta: 'Start free', variant: 'outline', highlight: false,
                },
                {
                  name: 'Pro', price: '$29', period: '/ month',
                  desc: 'For teams serious about automation.',
                  features: ['Unlimited executions', 'Unlimited workflows', '250+ integrations', 'Brian AI builder', 'Headless scraping', 'Priority support'],
                  cta: 'Get started', variant: 'default', highlight: true,
                },
                {
                  name: 'Enterprise', price: 'Custom', period: '',
                  desc: 'For regulated and large-scale deployments.',
                  features: ['Everything in Pro', 'Self-hosting', 'SSO / SAML', 'SLA guarantees', 'Dedicated engineer'],
                  cta: 'Contact us', variant: 'outline', highlight: false,
                },
              ].map(plan => (
                <div key={plan.name}
                  className={`relative p-6 rounded-2xl border flex flex-col ${plan.highlight
                    ? 'border-violet-500/40 bg-violet-500/[0.05]'
                    : 'border-white/[0.07] bg-[#0d0d0d]'}`}>
                  {plan.highlight && (
                    <div className="absolute -top-px left-6 right-6 h-px"
                      style={{ background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.5), transparent)' }} />
                  )}
                  <p className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest mb-3">{plan.name}</p>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-3xl font-bold text-white">{plan.price}</span>
                    {plan.period && <span className="text-[13px] text-neutral-600">{plan.period}</span>}
                  </div>
                  <p className="text-[13px] text-neutral-600 mb-6">{plan.desc}</p>
                  <ul className="flex flex-col gap-2.5 mb-8 flex-1">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-center gap-2 text-[13px] text-neutral-400">
                        <Check className="w-3.5 h-3.5 text-neutral-600 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link to={plan.name === 'Enterprise' ? '#' : '/register'}>
                    <Button variant={plan.variant} className="w-full rounded-xl h-10 text-[13px]">
                      {plan.cta}
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ───────────────────────────────────────────────────────── */}
        <section className="py-20 px-6 border-t border-white/[0.05]">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-white tracking-tight mb-12">Questions</h2>
            {[
              {
                q: 'How is Blinkbox different from Zapier or Make?',
                a: "Zapier and Make charge per task, so your costs grow with usage. Blinkbox is flat — run 500 or 5,000,000 tasks for the same monthly price. We also ship first-class AI agents, headless browser automation, and a code sandbox that neither competitor has.",
              },
              {
                q: 'What is Brian AI?',
                a: "Brian is Blinkbox's built-in AI agent. It can build workflows from plain English descriptions, make decisions inside running workflows, and be deployed as a standalone agent that monitors triggers and acts without manual intervention.",
              },
              {
                q: 'Can I self-host Blinkbox?',
                a: 'Yes. The Enterprise plan includes full self-hosting support. Blinkbox runs on Node.js, MongoDB, and Redis — straightforward to deploy on your own infrastructure or private cloud.',
              },
              {
                q: 'Is my credential data safe?',
                a: 'All credentials (OAuth tokens, API keys, passwords) are stored in an AES-256 encrypted vault and are never logged or exposed in execution output. They are only decrypted at runtime, in memory, for the specific node that needs them.',
              },
              {
                q: 'What happens if a workflow fails mid-run?',
                a: 'Blinkbox uses a cursor-based execution engine with Redis locking. If a run is interrupted by a crash or restart, the resumer picks up exactly where it left off — no lost data, no duplicate processing.',
              },
            ].map(item => <FaqItem key={item.q} q={item.q} a={item.a} />)}
          </div>
        </section>

        {/* ── FINAL CTA ─────────────────────────────────────────────────── */}
        <section className="py-32 px-6">
          <div className="max-w-2xl mx-auto text-center">
            <div className="relative inline-block mb-10">
              <div className="absolute inset-0 rounded-full blur-3xl"
                style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.35) 0%, transparent 70%)' }} />
              <img src={logo} alt="Blinkbox" className="relative w-12 h-12" />
            </div>
            <h2 className="text-4xl font-bold text-white tracking-tight mb-5">
              Ready to stop duct-taping your stack?
            </h2>
            <p className="text-[16px] text-neutral-500 mb-10 max-w-md mx-auto">
              Replace the patchwork of scripts, Zapier zaps, and Make scenarios with one reliable engine.
            </p>
            <Link to="/register">
              <Button className="h-12 px-8 text-[15px] rounded-xl gap-2">
                Get started free <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <p className="text-[12px] text-neutral-700 mt-5">Free forever on Starter · No credit card</p>
          </div>
        </section>

        {/* ── FOOTER ────────────────────────────────────────────────────── */}
        <footer className="border-t border-white/[0.05] py-12 px-6">
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-start justify-between gap-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <img src={logo} alt="Blinkbox" className="w-5 h-5" />
                <span className="text-[14px] font-semibold text-white">Blinkbox</span>
              </div>
              <p className="text-[12px] text-neutral-700 max-w-[220px]">
                The automation engine for teams that move fast.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-10">
              {[
                { header: 'Product',   links: ['Features', 'Integrations', 'Pricing', 'Changelog'] },
                { header: 'Resources', links: ['Docs', 'Blog', 'Templates', 'Status'] },
                { header: 'Company',   links: ['About', 'Privacy', 'Terms', 'Contact'] },
              ].map(col => (
                <div key={col.header}>
                  <p className="text-[11px] font-semibold text-neutral-600 uppercase tracking-wider mb-3">{col.header}</p>
                  {col.links.map(link => (
                    <Link key={link} to="#"
                      className="block text-[13px] text-neutral-700 hover:text-neutral-400 transition-colors mb-2">
                      {link}
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="max-w-4xl mx-auto mt-12 pt-6 border-t border-white/[0.04] flex items-center justify-between">
            <p className="text-[12px] text-neutral-700">© 2025 Blinkbox. All rights reserved.</p>
            <p className="text-[12px] text-neutral-700">blinkbox.co.in</p>
          </div>
        </footer>
      </div>
    </SilentBoundary>
  );
}
