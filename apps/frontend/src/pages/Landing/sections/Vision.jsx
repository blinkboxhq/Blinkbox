import { Link } from 'react-router-dom';
import { motion, useReducedMotion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import ScrollReveal from '../../../components/ScrollReveal';
import GridScan from '../../../components/GridScan';
import logo from '../../../assets/logo.svg';

const ease = [0.22, 1, 0.36, 1];

const MANIFESTO =
  'Automation should feel effortless. Drag a few boxes, decide what happens when, and let it run — every branch, every retry, every schedule handled for you, so your work happens whether you are watching or not.';

const ACCENT_WORDS = ['effortless', 'run', 'handled'];

function FloatingLogo({ reduce }) {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateX = useSpring(useTransform(my, [-90, 90], [18, -18]), { stiffness: 150, damping: 12 });
  const rotateY = useSpring(useTransform(mx, [-90, 90], [-18, 18]), { stiffness: 150, damping: 12 });

  return (
    <div
      className="relative hidden lg:block"
      style={{ perspective: 900 }}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        mx.set(e.clientX - r.left - r.width / 2);
        my.set(e.clientY - r.top - r.height / 2);
      }}
      onMouseLeave={() => {
        mx.set(0);
        my.set(0);
      }}
    >
      <motion.div
        className="bb-glass relative flex h-full w-full cursor-pointer items-center justify-center overflow-hidden rounded-3xl border border-white/[0.08]"
        style={{ rotateX, rotateY }}
        animate={reduce ? undefined : { y: [0, -10, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        whileTap={{ scale: 0.97 }}
      >
        <div
          aria-hidden
          className="absolute h-96 w-96 rounded-full opacity-60 blur-[90px]"
          style={{ background: 'radial-gradient(circle, rgba(111,151,232,0.5), transparent 70%)' }}
        />
        <img src={logo} alt="Blinkbox" draggable={false} className="relative h-64 w-64 select-none" />
      </motion.div>
    </div>
  );
}

export default function Vision() {
  const reduce = useReducedMotion();

  return (
    <section className="relative overflow-hidden bg-[#060608] pt-36 sm:pt-48">
      <div className="relative mx-auto max-w-[1360px] px-6 sm:px-8 lg:grid lg:grid-cols-[minmax(0,1fr)_400px] lg:items-stretch lg:gap-20">
        <ScrollReveal
          baseOpacity={0.08}
          enableBlur
          baseRotation={3}
          blurStrength={9}
          rotationEnd="bottom center"
          wordAnimationEnd="bottom center"
          containerClassName="max-w-[960px]"
          textClassName="font-medium tracking-[-0.01em] text-white"
          accentWords={ACCENT_WORDS}
          accentClassName="bg-gradient-to-br from-white via-[#8fb4ff] to-[#1d5fe0] bg-clip-text text-transparent"
          wordClassName="transition-colors duration-300 hover:text-[#8fb4ff]"
        >
          {MANIFESTO}
        </ScrollReveal>
        <FloatingLogo reduce={reduce} />
      </div>

      <div className="relative mt-24 h-[85vh] min-h-[680px] w-full">
        <GridScan
          sensitivity={0.55}
          lineThickness={4}
          linesColor="#94a3b8"
          gridScale={0.17}
          scanColor="#5495ff"
          scanOpacity={0.4}
          lineJitter={0.04}
          enablePost
          bloomIntensity={0.6}
          chromaticAberration={0}
          noiseIntensity={0}
          scanGlow={0.6}
          scanSoftness={3.2}
        />

        {/* edge blur — top & bottom only */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-40"
          style={{
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            maskImage: 'linear-gradient(180deg, black, transparent)',
            WebkitMaskImage: 'linear-gradient(180deg, black, transparent)',
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-40"
          style={{
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            maskImage: 'linear-gradient(0deg, black, transparent)',
            WebkitMaskImage: 'linear-gradient(0deg, black, transparent)',
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-32"
          style={{ background: 'linear-gradient(180deg, #060608, transparent)' }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-32"
          style={{ background: 'linear-gradient(0deg, #060608, transparent)' }}
        />

        {/* CTA on the grid */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: reduce ? 0 : 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7, ease }}
            className="mx-auto max-w-[720px] px-6 text-center"
          >
            <h2
              className="font-semibold tracking-[-0.02em] text-[#fafafa]"
              style={{ fontSize: 'clamp(2.2rem, 5vw, 3.6rem)' }}
            >
              Automate the boring part.
            </h2>
            <p className="mx-auto mt-4 max-w-[440px] text-[15px] text-[#8c8c8c]">
              Your first workflow is running before your coffee’s cold. Free to start.
            </p>
            <div className="pointer-events-auto mt-9 flex flex-wrap justify-center gap-3">
              <Link
                to="/login"
                className="bb-btn bb-btn-primary group flex items-center gap-2 px-6 py-3 text-[14px] font-semibold"
              >
                Start building free
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={2.25} />
              </Link>
              <Link to="/login" className="bb-btn bb-btn-ghost px-6 py-3 text-[14px] font-medium">
                Book a demo
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
