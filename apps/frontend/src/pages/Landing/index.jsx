import { Suspense, useEffect, useState, Component } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, ArrowRight } from 'lucide-react';
import { Canvas } from '@react-three/fiber';
import { ScrollControls, Scroll } from '@react-three/drei';
import { motion, AnimatePresence } from 'framer-motion';
import { Scene } from './Scene3D';
import LandingClassic from './LandingClassic';
import logo from '../../assets/logo.svg';

function webglSupported() {
  if (typeof document === 'undefined') return true;
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

class SilentBoundary extends Component {
  constructor(props) { super(props); this.state = { err: false }; }
  static getDerivedStateFromError() { return { err: true }; }
  render() { return this.state.err ? this.props.fallback ?? null : this.props.children; }
}

const LOGIN = 'https://blinkbox.net/login';

const EASE = [0.16, 1, 0.3, 1];

const SECTIONS = [
  {
    kicker: 'Connect anything',
    title: '250+ apps,\nzero config.',
    body: 'Slack, Gmail, Stripe, GitHub, Notion — every tool your team uses, wired together in seconds. Blinkbox speaks every API so you don’t have to.',
  },
  {
    kicker: 'Build visually',
    title: 'Drag. Drop.\nDeployed.',
    body: 'A visual canvas maps logic, branches, loops and AI steps without code. If you can draw a flowchart, you can ship an automation.',
  },
  {
    kicker: 'AI agents built-in',
    title: 'An AI co-worker,\nnot a chatbot.',
    body: 'Embed Claude, GPT, or any model inside any workflow. Summarize, classify, generate — AI steps chain into the rest of your automation naturally.',
  },
  {
    kicker: 'Run at any scale',
    title: 'Millions of runs.\nOne flat price.',
    body: 'Cursor-based execution with Redis crash recovery restarts exactly where it left off. No lost data, no duplicate runs, no surprise bills.',
  },
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
        className="flex items-center justify-between gap-6 px-5 py-2.5 rounded-xl border border-white/[0.08]"
        animate={{ backgroundColor: scrolled ? 'rgba(8,8,10,0.92)' : 'rgba(8,8,10,0.55)' }}
        style={{ width: '100%', maxWidth: 860, backdropFilter: 'blur(20px)' }}
        transition={{ duration: 0.2 }}
      >
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <img src={logo} alt="Blinkbox" className="w-5 h-5" />
          <span className="text-[14px] font-semibold text-white tracking-tight">Blinkbox</span>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          {[['Product', '/product'], ['Integrations', '/integrations'], ['Docs', '/docs'], ['Pricing', '/upgrade']].map(([item, href]) => (
            <a key={item} href={href} className="text-[13px] text-neutral-400 hover:text-white transition-colors duration-150">{item}</a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-2 shrink-0">
          <div className="w-px h-4 bg-white/[0.1] mx-1" />
          <a href={LOGIN} target="_blank" rel="noopener noreferrer" className="text-[13px] text-neutral-400 hover:text-white transition-colors duration-150 px-2">Log in</a>
          <a href={LOGIN} target="_blank" rel="noopener noreferrer">
            <button className="text-[13px] font-medium text-black bg-white hover:bg-neutral-200 transition-colors duration-150 px-3.5 py-1.5 rounded-lg">Sign up</button>
          </a>
        </div>

        <button className="md:hidden text-neutral-400" onClick={() => setOpen(v => !v)}>
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </motion.nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="absolute top-full left-4 right-4 mt-2 bg-[#08080a]/95 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6 flex flex-col gap-4"
          >
            {[['Product', '/product'], ['Integrations', '/integrations'], ['Docs', '/docs'], ['Pricing', '/upgrade']].map(([item, href]) => (
              <a key={item} href={href} className="text-[15px] text-neutral-400" onClick={() => setOpen(false)}>{item}</a>
            ))}
            <div className="flex flex-col gap-3 pt-4 border-t border-white/[0.06]">
              <a href={LOGIN} target="_blank" rel="noopener noreferrer" className="text-[15px] text-neutral-500">Log in</a>
              <a href={LOGIN} target="_blank" rel="noopener noreferrer">
                <button className="w-full h-10 rounded-lg bg-white text-black text-[14px] font-semibold">Sign up</button>
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Hero() {
  return (
    <section className="relative h-screen w-full flex flex-col justify-center px-[8vw] max-w-[1400px] mx-auto">
      <div
        className="absolute inset-y-0 left-0 w-full md:w-[60%] pointer-events-none"
        style={{ background: 'radial-gradient(95% 70% at 0% 50%, rgba(5,5,7,0.9) 0%, rgba(5,5,7,0.6) 55%, rgba(5,5,7,0) 100%)' }}
      />
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="relative inline-flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full mb-8 w-fit"
        style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full rounded-full bg-blue-400/60 animate-ping" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-400" />
        </span>
        <span className="text-[11px] font-medium tracking-tight text-neutral-300">Automation that runs while you sleep</span>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 0.08, ease: EASE }}
        className="relative font-bold leading-[1.02] tracking-[-0.035em] mb-5 max-w-[14ch]"
        style={{ fontSize: 'clamp(44px, 6.5vw, 92px)' }}
      >
        <span className="text-white">Automate</span><br />
        <span style={{ background: 'linear-gradient(110deg, #ffffff 20%, #6f8fd9 60%, #3a4d80 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
          everything.
        </span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.18, ease: EASE }}
        className="relative text-[17px] leading-relaxed mb-9 text-neutral-400"
        style={{ maxWidth: 480 }}
      >
        Visually connect your apps, APIs, databases and AI agents into workflows that run silently, 24/7. The automation engine built for teams that move fast.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.26, ease: EASE }}
        className="relative flex items-center gap-3"
      >
        <a href={LOGIN} target="_blank" rel="noopener noreferrer" className="group">
          <button className="h-12 px-7 text-[15px] font-semibold rounded-xl transition-all duration-200 hover:bg-neutral-200 active:scale-[0.98] inline-flex items-center gap-1.5"
            style={{ background: '#fff', color: '#000', boxShadow: '0 10px 30px rgba(120,160,255,0.18), 0 0 0 1px rgba(255,255,255,0.06)' }}>
            Start for free
            <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </button>
        </a>
        <a href={LOGIN} target="_blank" rel="noopener noreferrer">
          <button className="h-12 px-6 text-[15px] font-medium rounded-xl border transition-all duration-200 text-neutral-400 hover:text-white hover:border-white/20 hover:bg-white/[0.04]"
            style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)' }}>
            See how it works
          </button>
        </a>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.4 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
      >
        <span className="text-[10px] uppercase tracking-widest text-neutral-600">Scroll to explore</span>
        <div className="w-5 h-8 rounded-full border border-white/15 flex justify-center pt-1.5">
          <motion.div className="w-1 h-1.5 rounded-full bg-white/40"
            animate={{ y: [0, 8, 0], opacity: [1, 0.2, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }} />
        </div>
      </motion.div>
    </section>
  );
}

function FeatureSection({ data, align }) {
  return (
    <section className="h-screen w-full flex items-center px-[8vw] max-w-[1400px] mx-auto">
      <div
        className={`relative max-w-[460px] ${align === 'right' ? 'ml-auto text-right' : ''}`}
        style={{
          padding: '2rem',
          margin: '-2rem',
          background: `radial-gradient(120% 90% at ${align === 'right' ? '100%' : '0%'} 50%, rgba(5,5,7,0.85) 0%, rgba(5,5,7,0.6) 45%, rgba(5,5,7,0) 100%)`,
        }}
      >
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] mb-4"
          style={{ background: 'linear-gradient(90deg,#7aa2ff,#9ab4ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          {data.kicker}
        </p>
        <h2 className="text-[clamp(34px,4.5vw,58px)] font-bold text-white tracking-[-0.03em] leading-[1.05] mb-5"
          style={{ whiteSpace: 'pre-line' }}>
          {data.title}
        </h2>
        <p className={`text-[16px] leading-relaxed text-neutral-400 ${align === 'right' ? 'ml-auto' : ''}`} style={{ maxWidth: 400 }}>
          {data.body}
        </p>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="h-screen w-full flex flex-col items-center justify-center text-center px-6">
      <img src={logo} alt="Blinkbox" className="w-12 h-12 mb-7" />
      <h2 className="text-[clamp(36px,5vw,64px)] font-bold text-white tracking-[-0.03em] leading-[1.05] mb-5">
        Stop doing work<br />that shouldn&rsquo;t exist.
      </h2>
      <p className="text-[17px] text-neutral-400 mb-9 max-w-[440px]">
        Join thousands of teams automating their busywork. Free forever to start — no credit card required.
      </p>
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <a href={LOGIN} target="_blank" rel="noopener noreferrer" className="group">
          <button className="h-12 px-8 text-[15px] font-semibold rounded-xl text-black bg-white hover:bg-neutral-200 transition-all duration-200 inline-flex items-center gap-1.5"
            style={{ boxShadow: '0 10px 30px rgba(120,160,255,0.2)' }}>
            Automate for free
            <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </button>
        </a>
        <a href={LOGIN} target="_blank" rel="noopener noreferrer">
          <button className="h-12 px-7 text-[15px] font-medium rounded-xl text-neutral-400 hover:text-white transition-colors duration-200"
            style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)' }}>
            Log in
          </button>
        </a>
      </div>
      <div className="mt-16 flex items-center gap-6 text-[12px] text-neutral-600">
        <a href="/privacy" className="hover:text-neutral-300 transition-colors">Privacy</a>
        <a href="/terms" className="hover:text-neutral-300 transition-colors">Terms</a>
        <a href="mailto:blinkbox.co.in@gmail.com" className="hover:text-neutral-300 transition-colors">Contact</a>
        <span>&copy; {new Date().getFullYear()} Blinkbox</span>
      </div>
    </section>
  );
}

const PAGES = 6;

function StaticHero() {
  return (
    <div className="min-h-dvh bg-[#050507] text-white">
      <Header />
      <main className="mx-auto max-w-3xl px-6 pt-40 pb-24 text-center">
        <img src={logo} alt="Blinkbox" className="mx-auto mb-8 h-10 w-10" />
        <h1 className="text-balance text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          Automate anything.<br />Built for builders.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-[15px] leading-relaxed text-neutral-300">
          Connect 250+ apps, design workflows on a visual canvas, and drop AI agents
          into any step — running reliably at any scale.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <a href={LOGIN} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-[14px] font-medium text-black transition-colors duration-150 hover:bg-neutral-200">
            Start free <ArrowRight className="h-4 w-4" />
          </a>
          <Link to="/product"
            className="inline-flex items-center rounded-lg border border-white/15 px-5 py-2.5 text-[14px] font-medium text-neutral-200 transition-colors duration-150 hover:border-white/30 hover:text-white">
            See how it works
          </Link>
        </div>
        <div className="mt-20 grid gap-4 text-left sm:grid-cols-2">
          {SECTIONS.map((s) => (
            <div key={s.kicker} className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#7aa2ff]">{s.kicker}</div>
              <div className="mt-1.5 text-[15px] font-medium text-white">{s.title.replace('\n', ' ')}</div>
              <p className="mt-2 text-[13px] leading-relaxed text-neutral-400">{s.body}</p>
            </div>
          ))}
        </div>
      </main>
      <footer className="border-t border-white/[0.06] py-8 text-center text-[12px] text-neutral-500">
        &copy; {new Date().getFullYear()} Blinkbox
      </footer>
    </div>
  );
}

export default function Landing() {
  const [webgl] = useState(webglSupported);
  if (!webgl) return <SilentBoundary fallback={<StaticHero />}><LandingClassic /></SilentBoundary>;

  return (
    <SilentBoundary fallback={<SilentBoundary fallback={<StaticHero />}><LandingClassic /></SilentBoundary>}>
      <div className="h-screen w-screen bg-[#050507] text-white" style={{ overflow: 'hidden' }}>
        <Header />
        <Canvas
          camera={{ position: [0, 0, 10], fov: 55 }}
          dpr={[1, 2]}
          gl={{ antialias: true, powerPreference: 'high-performance' }}
        >
          <Suspense fallback={null}>
            <ScrollControls pages={PAGES} damping={0.28}>
              <Scene />
              <Scroll html style={{ width: '100%' }}>
                <Hero />
                <FeatureSection data={SECTIONS[0]} align="left" />
                <FeatureSection data={SECTIONS[1]} align="left" />
                <FeatureSection data={SECTIONS[2]} align="left" />
                <FeatureSection data={SECTIONS[3]} align="left" />
                <FinalCta />
              </Scroll>
            </ScrollControls>
          </Suspense>
        </Canvas>
      </div>
    </SilentBoundary>
  );
}
