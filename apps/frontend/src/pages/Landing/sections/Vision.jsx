import { useRef } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import ScrollReveal from '../../../components/ScrollReveal';
import GridScan from '../../../components/GridScan';

const MANIFESTO =
  'Automation should feel effortless. Drag a few boxes, decide what happens when, and let it run — every branch, every retry, every schedule handled for you, so your work happens whether you are watching or not.';

const ACCENT_WORDS = ['effortless', 'run', 'handled'];

export default function Vision() {
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 0.9', 'end 0.4'],
  });

  const glowOpacity = useTransform(scrollYProgress, [0, 0.5, 1], [0.2, 0.6, 0.28]);
  const glowShift = useTransform(scrollYProgress, [0, 1], ['-6%', '6%']);

  return (
    <section ref={ref} className="relative overflow-hidden bg-[#060608] pt-36 pb-24 sm:pt-48">
      {/* accent field — layered blue blooms + fine grid, breathing with scroll */}
      <motion.div
        aria-hidden
        style={{ opacity: reduce ? 0.4 : glowOpacity, x: reduce ? '0%' : glowShift }}
        className="pointer-events-none absolute left-1/2 top-[38%] h-[620px] w-[1040px] -translate-x-1/2 rounded-full blur-[150px]"
      >
        <div
          className="h-full w-full"
          style={{ background: 'radial-gradient(ellipse at center, rgba(111,151,232,0.55), transparent 66%)' }}
        />
      </motion.div>
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 top-10 h-[420px] w-[420px] rounded-full opacity-40 blur-[130px]"
        style={{ background: 'radial-gradient(circle at center, rgba(111,151,232,0.4), transparent 70%)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 bottom-0 h-[460px] w-[460px] rounded-full opacity-30 blur-[140px]"
        style={{ background: 'radial-gradient(circle at center, rgba(29,95,224,0.42), transparent 70%)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-44"
        style={{ background: 'linear-gradient(180deg, #060608, transparent)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-44"
        style={{ background: 'linear-gradient(0deg, #060608, transparent)' }}
      />

      <div className="relative mx-auto max-w-[1000px] px-6 sm:px-8">
        <ScrollReveal
          baseOpacity={0.08}
          enableBlur
          baseRotation={3}
          blurStrength={9}
          rotationEnd="bottom center"
          wordAnimationEnd="bottom center"
          containerClassName="max-w-[920px]"
          textClassName="font-medium tracking-[-0.01em] text-white"
          accentWords={ACCENT_WORDS}
          accentClassName="bg-gradient-to-br from-white via-[#8fb4ff] to-[#1d5fe0] bg-clip-text text-transparent"
        >
          {MANIFESTO}
        </ScrollReveal>
      </div>

      <div className="relative mt-24 h-[600px] w-full">
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
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-32"
          style={{ background: 'linear-gradient(180deg, #060608, transparent)' }}
        />
      </div>
    </section>
  );
}
