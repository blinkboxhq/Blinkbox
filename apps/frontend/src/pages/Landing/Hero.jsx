import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Play, Sparkles } from 'lucide-react';
import SideRays from '../../components/SideRays';
import logo from '../../assets/logo.svg';

const ease = [0.22, 1, 0.36, 1];

export default function Hero() {
  const reduce = useReducedMotion();

  const container = {
    hidden: {},
    show: {
      transition: { staggerChildren: reduce ? 0 : 0.09, delayChildren: reduce ? 0 : 0.15 },
    },
  };
  const rise = {
    hidden: { opacity: 0, y: reduce ? 0 : 22 },
    show: { opacity: 1, y: 0, transition: { duration: 0.8, ease } },
  };

  return (
    <section className="relative min-h-dvh w-full overflow-hidden bg-[#0a0a0c]">
      <div className="absolute inset-0">
        <SideRays
          origin="top-right"
          rayColor1="#6f97e8"
          rayColor2="#a9c0ef"
          speed={2.5}
          intensity={2}
          spread={2}
          tilt={0}
          saturation={1.5}
          blend={0.75}
          falloff={1.6}
          opacity={1.0}
        />
      </div>

      {/* legibility scrim — darkens the bottom-left where copy lives */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 90% at 12% 78%, rgba(5,5,7,0.92) 0%, rgba(5,5,7,0.55) 34%, rgba(5,5,7,0) 62%), linear-gradient(180deg, rgba(5,5,7,0.35) 0%, rgba(5,5,7,0) 22%, rgba(5,5,7,0) 70%, rgba(5,5,7,0.7) 100%)',
        }}
      />

      {/* top nav */}
      <motion.header
        initial={{ opacity: 0, y: reduce ? 0 : -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease }}
        className="absolute inset-x-0 top-0 z-20"
      >
        <nav className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-5 sm:px-8">
          <Link to="/" className="group flex items-center gap-2.5">
            <img
              src={logo}
              alt="Blinkbox"
              className="h-7 w-7 transition-transform duration-300 group-hover:rotate-[8deg]"
              style={{ filter: 'drop-shadow(0 0 12px rgba(111,151,232,0.35))' }}
            />
            <span className="text-[15px] font-semibold tracking-tight text-[#fafafa]">
              blinkbox
            </span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/login"
              className="hidden rounded-[10px] px-3.5 py-2 text-[13px] font-medium text-[#b6b6b6] transition-colors duration-150 hover:text-[#fafafa] sm:block"
            >
              Log in
            </Link>
            <Link
              to="/login"
              className="bb-btn bb-btn-accent group flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold"
            >
              Get started
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={2.25} />
            </Link>
          </div>
        </nav>
      </motion.header>

      {/* hero copy */}
      <div className="relative z-10 mx-auto flex min-h-dvh max-w-[1200px] flex-col justify-center px-6 sm:px-8">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="max-w-[760px]"
        >
          <motion.div variants={rise}>
            <span className="bb-pill inline-flex items-center gap-2 text-[11px] font-medium tracking-wide text-[#b6b6b6]">
              <Sparkles className="h-3.5 w-3.5 text-[#a9c0ef]" strokeWidth={2} />
              251 integrations · one canvas
            </span>
          </motion.div>

          <motion.h1
            variants={rise}
            className="mt-6 font-semibold leading-[0.98] tracking-[-0.03em] text-[#fafafa]"
            style={{ fontSize: 'clamp(2.9rem, 7vw, 5.4rem)' }}
          >
            Automation that
            <br />
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(105deg, #a9c0ef 0%, #6f97e8 48%, #fafafa 100%)' }}
            >
              builds itself.
            </span>
          </motion.h1>

          <motion.p
            variants={rise}
            className="mt-6 max-w-[520px] text-[15px] leading-relaxed text-[#b6b6b6] sm:text-[17px]"
          >
            Wire apps, data, and AI into workflows that just run. All the power of
            Zapier, Make, and n8n — without the wiring, the JSON, or the per-task bill.
          </motion.p>

          <motion.div variants={rise} className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              to="/login"
              className="bb-btn bb-btn-primary group flex items-center gap-2 px-5 py-3 text-[14px] font-semibold"
            >
              Start building free
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={2.25} />
            </Link>
            <button
              type="button"
              className="bb-btn bb-btn-ghost group flex items-center gap-2 px-5 py-3 text-[14px] font-medium"
            >
              <Play className="h-3.5 w-3.5 fill-current" strokeWidth={0} />
              See it run
            </button>
          </motion.div>

          <motion.p
            variants={rise}
            className="mt-8 text-[12px] tracking-wide text-[#6d6d6d]"
          >
            No credit card · Free forever tier · Self-host anytime
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}
