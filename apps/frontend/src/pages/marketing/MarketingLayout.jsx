import { useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import Header from '../Landing/sections/Header';
import Footer from '../Landing/sections/Footer';

const ease = [0.22, 1, 0.36, 1];

export default function MarketingLayout({ kicker, plain, gradient, sub, children }) {
  const reduce = useReducedMotion();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  return (
    <div className="min-h-screen bg-[#060608] antialiased">
      <Header />
      <main className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 h-[380px] w-[820px] -translate-x-1/2 rounded-full opacity-25 blur-[130px]"
          style={{ background: 'radial-gradient(ellipse at center, rgba(59,130,246,0.3), transparent 70%)' }}
        />
        <div className="relative mx-auto max-w-[1100px] px-6 pb-28 pt-20 sm:px-8 sm:pt-24">
          <motion.div
            initial={{ opacity: 0, y: reduce ? 0 : 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease }}
          >
            <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.2em] text-[#6f97e8]">{kicker}</p>
            <h1 className="max-w-[720px] font-semibold leading-[1.08] tracking-[-0.02em] text-[#fafafa]" style={{ fontSize: 'clamp(2.2rem, 5vw, 3.4rem)' }}>
              {plain}{' '}
              <span className="bg-gradient-to-br from-white via-[#8fb4ff] to-[#1d5fe0] bg-clip-text text-transparent">{gradient}</span>
            </h1>
            {sub && <p className="mt-5 max-w-[560px] text-[15px] leading-relaxed text-[#8c8c8c]">{sub}</p>}
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: reduce ? 0 : 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease, delay: 0.12 }}
            className="mt-14"
          >
            {children}
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
