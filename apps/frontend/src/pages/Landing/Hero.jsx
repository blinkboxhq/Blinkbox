import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Menu, X } from 'lucide-react';
import SideRays from '../../components/SideRays';
import logo from '../../assets/logo.svg';

const LOGIN = 'https://blinkbox.net/login';
const EASE = [0.16, 1, 0.3, 1];
const NAV = [['Product', '/product'], ['Integrations', '/integrations'], ['Docs', '/docs'], ['Pricing', '/upgrade']];

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
        animate={{ backgroundColor: scrolled ? 'rgba(8,8,10,0.92)' : 'rgba(8,8,10,0.5)' }}
        style={{ width: '100%', maxWidth: 880, backdropFilter: 'blur(20px)' }}
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
            <button className="text-[13px] font-medium text-black bg-white hover:bg-neutral-200 transition-colors duration-150 px-3.5 py-1.5 rounded-lg">Sign up</button>
          </a>
        </div>

        <button className="md:hidden text-neutral-400" onClick={() => setOpen(v => !v)}>
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </motion.nav>
    </div>
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
    <section className="relative min-h-dvh w-full overflow-hidden bg-[#050507] text-white">
      {/* Ambient light rays — top-right origin, on-brand cool tones */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <SideRays
          origin="top-right"
          rayColor1="#7aa2ff"
          rayColor2="#b7ccff"
          speed={1.6}
          intensity={1.35}
          spread={1.7}
          tilt={-4}
          saturation={0.85}
          blend={0.62}
          falloff={1.9}
          opacity={0.5}
        />
      </div>

      {/* Depth: radial vignette to seat the copy + a faint floor glow */}
      <div
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{ background: 'radial-gradient(120% 90% at 50% 0%, rgba(5,5,7,0) 40%, rgba(5,5,7,0.55) 100%)' }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-40"
        style={{ background: 'linear-gradient(to top, #050507, rgba(5,5,7,0))' }}
      />

      <Header />

      <div className="relative z-10 flex min-h-dvh flex-col items-center justify-center px-6 text-center">
        <motion.a
          href={LOGIN}
          target="_blank"
          rel="noopener noreferrer"
          {...rise(10, 0)}
          className="group mb-7 inline-flex items-center gap-2 rounded-full py-1.5 pl-2 pr-3.5"
          style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.02))', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#7aa2ff]/60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#7aa2ff]" />
          </span>
          <span className="text-[11px] font-medium tracking-tight text-neutral-300">Automation that runs while you sleep</span>
          <ArrowRight className="h-3 w-3 text-neutral-500 transition-transform duration-200 group-hover:translate-x-0.5" />
        </motion.a>

        <motion.h1
          {...rise(28, 0.08)}
          className="font-bold leading-[0.98] tracking-[-0.04em]"
          style={{ fontSize: 'clamp(46px, 8vw, 108px)' }}
        >
          <span className="block text-white">Automate</span>
          <span
            className="block"
            style={{ background: 'linear-gradient(110deg, #ffffff 12%, #9ab6ff 52%, #4a63a8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
          >
            everything.
          </span>
        </motion.h1>

        <motion.p
          {...rise(16, 0.18)}
          className="mt-6 max-w-[540px] text-[17px] leading-relaxed text-neutral-400"
        >
          Visually connect your apps, APIs, databases and AI agents into workflows that run
          silently, 24/7. The automation engine built for teams that move fast.
        </motion.p>

        <motion.div {...rise(12, 0.26)} className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
          <a href={LOGIN} target="_blank" rel="noopener noreferrer" className="group">
            <button
              className="inline-flex h-12 items-center gap-1.5 rounded-xl px-7 text-[15px] font-semibold transition-all duration-200 hover:bg-neutral-200 active:scale-[0.98]"
              style={{ background: '#fff', color: '#000', boxShadow: '0 10px 34px rgba(122,162,255,0.22), 0 0 0 1px rgba(255,255,255,0.06)' }}
            >
              Start for free
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </button>
          </a>
          <a href={LOGIN} target="_blank" rel="noopener noreferrer">
            <button
              className="h-12 rounded-xl px-6 text-[15px] font-medium text-neutral-300 transition-all duration-200 hover:text-white hover:border-white/20 hover:bg-white/[0.05]"
              style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)' }}
            >
              See how it works
            </button>
          </a>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="mt-8 text-[12px] text-neutral-600"
        >
          Free forever to start · No credit card required · 250+ integrations
        </motion.p>
      </div>
    </section>
  );
}
