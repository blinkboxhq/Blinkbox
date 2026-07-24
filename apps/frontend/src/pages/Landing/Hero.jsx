import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import PixelBlast from '../../components/PixelBlast';
import productShot from './assets/image.png';

const ease = [0.22, 1, 0.36, 1];

export default function Hero() {
  const reduce = useReducedMotion();

  return (
    <section className="relative w-full overflow-hidden bg-[#060608] pb-24">
      {/* pixel-blast field behind the hero — interactive, catches pointer events */}
      <div className="absolute inset-0">
        <PixelBlast
          variant="diamond"
          pixelSize={2}
          color="#3b82f6"
          patternScale={5}
          patternDensity={1.2}
          enableRipples
          rippleSpeed={0.3}
          rippleThickness={0.07}
          rippleIntensityScale={0.4}
          speed={2}
          edgeFade={0.2}
        />
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div
            className="absolute left-1/2 top-[32%] h-[560px] w-[1000px] -translate-x-1/2 rounded-full opacity-40 blur-[130px]"
            style={{ background: 'radial-gradient(ellipse at center, rgba(59,130,246,0.20), transparent 68%)' }}
          />
          <div
            className="absolute inset-x-0 top-0 h-[220px]"
            style={{ background: 'linear-gradient(180deg, #060608, transparent)' }}
          />
          <div
            className="absolute inset-x-0 bottom-0 h-[320px]"
            style={{ background: 'linear-gradient(0deg, #060608, transparent)' }}
          />
        </div>
      </div>

      {/* headline + announcement */}
      <div className="pointer-events-none relative z-10 mx-auto max-w-[1200px] px-6 pt-16 sm:px-8 sm:pt-24">
        <motion.h1
          initial={{ opacity: 0, y: reduce ? 0 : 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease, delay: reduce ? 0 : 0.08 }}
          className="max-w-[900px] bg-gradient-to-br from-white via-[#cddafb] to-[#3b82f6] bg-clip-text font-medium leading-[1.02] tracking-[-0.03em] text-transparent"
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
          <Link to="/login" className="group pointer-events-auto flex shrink-0 items-center gap-2 text-[14px]">
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
            className="relative overflow-hidden rounded-xl border-[3px] border-[#3b82f6]/30"
            style={{ boxShadow: '0 60px 150px -30px rgba(0,0,0,0.9), 0 0 80px -14px rgba(59,130,246,0.4), 0 1px 0 0 rgba(255,255,255,0.06) inset' }}
          >
            <img src={productShot} alt="Blinkbox workflow canvas" className="block w-full opacity-90" />
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
