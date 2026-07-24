import { useRef } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import ScrollReveal from '../../../components/ScrollReveal';

const MANIFESTO =
  'Automation should feel effortless. Drag a few boxes, decide what happens when, and let it run — every branch, every retry, every schedule handled for you, so your work happens whether you are watching or not.';

export default function Vision() {
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 0.85', 'end 0.55'],
  });

  const glowOpacity = useTransform(scrollYProgress, [0, 0.5, 1], [0.15, 0.45, 0.2]);

  return (
    <section ref={ref} className="relative overflow-hidden bg-[#060608] py-32 sm:py-40">
      {/* ambient blue glow that breathes with scroll */}
      <motion.div
        aria-hidden
        style={{ opacity: reduce ? 0.3 : glowOpacity }}
        className="pointer-events-none absolute left-1/2 top-1/3 h-[520px] w-[900px] -translate-x-1/2 rounded-full blur-[140px]"
      >
        <div
          className="h-full w-full"
          style={{ background: 'radial-gradient(ellipse at center, rgba(59,130,246,0.28), transparent 68%)' }}
        />
      </motion.div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-40"
        style={{ background: 'linear-gradient(180deg, #060608, transparent)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-40"
        style={{ background: 'linear-gradient(0deg, #060608, transparent)' }}
      />

      <div className="relative mx-auto max-w-[1000px] px-6 sm:px-8">
        <ScrollReveal
          baseOpacity={0.08}
          enableBlur
          baseRotation={3}
          blurStrength={8}
          containerClassName="max-w-[920px]"
          textClassName="font-medium tracking-[-0.01em] text-white"
        >
          {MANIFESTO}
        </ScrollReveal>
      </div>
    </section>
  );
}
