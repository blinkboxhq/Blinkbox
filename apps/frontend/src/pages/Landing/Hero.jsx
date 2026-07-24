import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import logo from '../../assets/logo.svg';
import productShot from './assets/image.png';

const ease = [0.22, 1, 0.36, 1];

export default function Hero() {
  const reduce = useReducedMotion();

  return (
    <section className="relative w-full overflow-hidden bg-[#060608] pb-24">
      {/* ambient stage light behind the screenshot */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className="absolute left-1/2 top-[36%] h-[620px] w-[1150px] -translate-x-1/2 rounded-full opacity-60 blur-[130px]"
          style={{ background: 'radial-gradient(ellipse at center, rgba(120,132,168,0.28), rgba(111,151,232,0.10) 45%, transparent 68%)' }}
        />
        <div
          className="absolute inset-x-0 top-0 h-[340px]"
          style={{ background: 'linear-gradient(180deg, rgba(6,6,8,0.9), transparent)' }}
        />
      </div>

      {/* slim nav */}
      <motion.header
        initial={{ opacity: 0, y: reduce ? 0 : -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease }}
        className="relative z-20"
      >
        <nav className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-6 sm:px-8">
          <Link to="/" className="group flex items-center gap-2.5">
            <img
              src={logo}
              alt="Blinkbox"
              className="h-6 w-6 transition-transform duration-300 group-hover:rotate-[8deg]"
              style={{ filter: 'drop-shadow(0 0 10px rgba(111,151,232,0.3))' }}
            />
            <span className="text-[14px] font-semibold tracking-tight text-[#fafafa]">blinkbox</span>
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

      {/* headline + announcement */}
      <div className="relative z-10 mx-auto max-w-[1200px] px-6 pt-14 sm:px-8 sm:pt-20">
        <motion.h1
          initial={{ opacity: 0, y: reduce ? 0 : 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease, delay: reduce ? 0 : 0.08 }}
          className="max-w-[900px] font-medium leading-[1.02] tracking-[-0.03em] text-[#f4f4f5]"
          style={{ fontSize: 'clamp(2.5rem, 6.4vw, 4.7rem)' }}
        >
          The automation platform
          <br className="hidden sm:block" /> for teams and agents
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: reduce ? 0 : 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease, delay: reduce ? 0 : 0.2 }}
          className="mt-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
        >
          <p className="max-w-[520px] text-[15px] leading-relaxed text-[#8c8c8c] sm:text-[16px]">
            Purpose-built for building and running workflows. Designed for the AI era.
          </p>
          <Link to="/login" className="group flex shrink-0 items-center gap-2 text-[14px]">
            <span className="font-medium text-[#f4f4f5]">New</span>
            <span className="flex items-center gap-1 text-[#8c8c8c] transition-colors duration-150 group-hover:text-[#b6b6b6]">
              Brian AI copilot
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={2} />
            </span>
          </Link>
        </motion.div>

        {/* product screenshot on a lit stage */}
        <motion.div
          initial={{ opacity: 0, y: reduce ? 0 : 40, scale: reduce ? 1 : 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1, ease, delay: reduce ? 0 : 0.34 }}
          className="relative mt-16 sm:mt-24"
        >
          {/* floor shadow */}
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-10 left-1/2 h-24 w-[85%] -translate-x-1/2 rounded-full opacity-70 blur-3xl"
            style={{ background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.85), transparent 70%)' }}
          />
          <div
            className="relative overflow-hidden rounded-2xl border border-white/[0.08]"
            style={{ boxShadow: '0 50px 140px -30px rgba(0,0,0,0.85), 0 1px 0 0 rgba(255,255,255,0.06) inset' }}
          >
            <img src={productShot} alt="Blinkbox workflow canvas" className="block w-full" />
            {/* top edge highlight */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-px"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.14) 50%, transparent)' }}
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
