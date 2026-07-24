import { Fragment, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ArrowRight, Menu, X } from 'lucide-react';
import LightRays from '../../components/LightRays';
import logo from '../../assets/logo.svg';
import imgGmail from '../../assets/gmail.png';
import imgSlack from '../../assets/slack.png';
import imgSheets from '../../assets/google-sheets.svg';
import imgAirtable from '../../assets/Airtable--Streamline-Svg-Logos.svg';

const LOGIN = 'https://blinkbox.net/login';
const EASE = [0.16, 1, 0.3, 1];
const NAV = [['Product', '/product'], ['Integrations', '/integrations'], ['Docs', '/docs'], ['Pricing', '/upgrade']];
const WORDS = ['your inbox', 'your invoices', 'your reports', 'your pipeline', 'everything'];
const FLOW = [
  { name: 'Gmail', src: imgGmail },
  { name: 'Blinkbox', src: logo, hub: true },
  { name: 'Slack', src: imgSlack },
  { name: 'Sheets', src: imgSheets },
  { name: 'Airtable', src: imgAirtable },
];

function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-4 px-4">
      <motion.nav
        className="bb-glass flex items-center justify-between gap-6 px-5 py-2.5"
        animate={{ backgroundColor: scrolled ? 'rgba(13,13,13,0.82)' : 'rgba(255,255,255,0.045)' }}
        style={{ width: '100%', maxWidth: 880, borderRadius: 14 }}
        transition={{ duration: 0.2 }}
      >
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <img src={logo} alt="Blinkbox" className="w-5 h-5" />
          <span className="text-[14px] font-semibold text-white tracking-tight">Blinkbox</span>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          {NAV.map(([item, href]) => (
            <a key={item} href={href} className="text-[13px] text-neutral-400 hover:text-white transition-colors duration-150">{item}</a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-2 shrink-0">
          <div className="w-px h-4 bg-white/[0.1] mx-1" />
          <a href={LOGIN} target="_blank" rel="noopener noreferrer" className="text-[13px] text-neutral-400 hover:text-white transition-colors duration-150 px-2">Log in</a>
          <a href={LOGIN} target="_blank" rel="noopener noreferrer">
            <button className="bb-btn bb-btn-primary rounded-lg text-[13px] px-3.5 py-1.5">Sign up</button>
          </a>
        </div>

        <button className="md:hidden text-neutral-400" onClick={() => setOpen(v => !v)}>
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </motion.nav>
    </div>
  );
}

function RotatingWord({ reduce }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => setI(v => (v + 1) % WORDS.length), 2200);
    return () => clearInterval(id);
  }, [reduce]);

  return (
    <span className="relative block leading-[0.98]">
      <AnimatePresence mode="wait">
        <motion.span
          key={i}
          initial={reduce ? false : { y: '0.42em', opacity: 0, filter: 'blur(8px)' }}
          animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
          exit={reduce ? undefined : { y: '-0.42em', opacity: 0, filter: 'blur(8px)' }}
          transition={{ duration: 0.5, ease: EASE }}
          className="inline-block bg-clip-text text-transparent"
          style={{ backgroundImage: 'linear-gradient(102deg, #d7e2fb 4%, #a9c0ef 44%, #6f97e8 100%)' }}
        >
          {WORDS[i]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function FlowNode({ node, dim, onHover, onLeave }) {
  return (
    <div className="relative flex shrink-0 flex-col items-center" onMouseEnter={onHover} onMouseLeave={onLeave}>
      <motion.div
        whileHover={{ y: -5, scale: 1.07 }}
        animate={{ opacity: dim ? 0.38 : 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 22 }}
        className={`bb-glass grid place-items-center rounded-2xl ${node.hub ? 'h-16 w-16' : 'h-14 w-14'}`}
        style={node.hub ? { borderColor: 'var(--bb-accent-ring)', boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.08), 0 0 0 1px var(--bb-accent-ring), 0 10px 34px -10px var(--bb-accent-ring)' } : undefined}
      >
        <img src={node.src} alt={node.name} className={`object-contain ${node.hub ? 'h-8 w-8' : 'h-7 w-7'}`} />
      </motion.div>
      <span className="absolute -bottom-6 font-mono text-[9px] uppercase tracking-wider text-neutral-500">{node.name}</span>
    </div>
  );
}

function FlowWire({ i, reduce, lit }) {
  return (
    <div className="relative flex h-16 min-w-[16px] flex-1 items-center">
      <div
        className="h-px w-full transition-all duration-300"
        style={{
          background: lit
            ? 'linear-gradient(90deg, rgba(169,192,239,0.10), rgba(169,192,239,0.75), rgba(169,192,239,0.10))'
            : 'linear-gradient(90deg, rgba(111,151,232,0.06), rgba(111,151,232,0.32), rgba(111,151,232,0.06))',
        }}
      />
      {!reduce && (
        <motion.span
          className="absolute top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full"
          style={{ background: 'var(--bb-accent-hot)', boxShadow: '0 0 10px 2px var(--bb-accent-ring)' }}
          initial={{ left: '0%', opacity: 0 }}
          animate={{ left: ['0%', '100%'], opacity: [0, 1, 1, 0] }}
          transition={{ duration: 1.9, repeat: Infinity, ease: 'linear', delay: i * 0.45 }}
        />
      )}
    </div>
  );
}

function FlowStrip({ reduce }) {
  const [hover, setHover] = useState(null);
  return (
    <motion.div
      initial={{ opacity: 0, y: 26 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, delay: 0.5, ease: EASE }}
      className="bb-glass-strong mt-16 w-full max-w-[600px] px-7 pt-5 pb-11"
    >
      <div className="mb-5 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-neutral-500">live workflow</span>
        <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-neutral-500">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.85)]" />
          running
        </span>
      </div>
      <div className="flex items-center justify-between">
        {FLOW.map((node, i) => (
          <Fragment key={node.name}>
            <FlowNode
              node={node}
              dim={hover !== null && hover !== i}
              onHover={() => setHover(i)}
              onLeave={() => setHover(null)}
            />
            {i < FLOW.length - 1 && <FlowWire i={i} reduce={reduce} lit={hover === i || hover === i + 1} />}
          </Fragment>
        ))}
      </div>
    </motion.div>
  );
}

export default function Hero() {
  const reduce = useReducedMotion();
  const rise = (y, delay) => ({
    initial: { opacity: 0, y: reduce ? 0 : y },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8, delay, ease: EASE },
  });

  return (
    <section className="relative min-h-dvh w-full overflow-hidden bg-[#0a0a0c] text-white">
      {/* Ambient god-rays — top-center, brand-tinted */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <LightRays
          raysOrigin="top-center"
          raysColor="#a9c0ef"
          raysSpeed={0.9}
          lightSpread={0.85}
          rayLength={1.7}
          fadeDistance={1.15}
          saturation={1.05}
          followMouse
          mouseInfluence={0.08}
          noiseAmount={0.06}
          distortion={0.02}
        />
      </div>

      {/* Floor fade — keep the top ray zone undimmed */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-44"
        style={{ background: 'linear-gradient(to top, #0a0a0c, rgba(10,10,12,0))' }}
      />

      <Header />

      <div className="relative z-10 flex min-h-dvh flex-col items-center justify-center px-6 py-28 text-center">
        <motion.a
          href={LOGIN}
          target="_blank"
          rel="noopener noreferrer"
          {...rise(10, 0)}
          className="bb-glass bb-glass-hover group mb-8 inline-flex items-center gap-2 rounded-full py-1.5 pl-2 pr-3.5 transition-colors"
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full" style={{ background: 'var(--bb-accent)', opacity: 0.6 }} />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: 'var(--bb-accent-hot)' }} />
          </span>
          <span className="text-[11px] font-medium tracking-tight text-neutral-300">Automation that runs while you sleep</span>
          <ArrowRight className="h-3 w-3 text-neutral-500 transition-transform duration-200 group-hover:translate-x-0.5" />
        </motion.a>

        <motion.h1
          {...rise(28, 0.08)}
          className="font-bold tracking-[-0.045em]"
          style={{ fontSize: 'clamp(46px, 8.4vw, 112px)' }}
        >
          <span className="block leading-[0.98] text-white">Automate</span>
          <RotatingWord reduce={reduce} />
        </motion.h1>

        <motion.p
          {...rise(16, 0.18)}
          className="mt-7 max-w-[540px] text-[17px] leading-relaxed text-neutral-400"
        >
          Visually connect your apps, APIs, databases and AI agents into workflows that run
          silently, 24/7. The automation engine built for teams that move fast.
        </motion.p>

        <motion.div {...rise(12, 0.26)} className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
          <a href={LOGIN} target="_blank" rel="noopener noreferrer" className="group">
            <button
              className="bb-btn bb-btn-primary inline-flex h-12 items-center gap-1.5 rounded-xl px-7 text-[15px]"
              style={{ boxShadow: '0 10px 34px -8px var(--bb-accent-ring), inset 0 0 0 1px rgba(255,255,255,0.06)' }}
            >
              Start for free
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </button>
          </a>
          <a href={LOGIN} target="_blank" rel="noopener noreferrer">
            <button className="bb-glass bb-glass-hover h-12 rounded-xl px-6 text-[15px] font-medium text-neutral-200 transition-colors">
              See how it works
            </button>
          </a>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="mt-8 font-mono text-[11px] uppercase tracking-wider text-neutral-600"
        >
          Free forever to start · No credit card · 250+ integrations
        </motion.p>

        <FlowStrip reduce={reduce} />
      </div>
    </section>
  );
}
