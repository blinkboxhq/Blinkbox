import { useRef } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { Sparkles, ShieldCheck, ToggleRight } from 'lucide-react';

const ease = [0.22, 1, 0.36, 1];

const MANIFESTO =
  'Automation should not need an engineer. Describe the outcome, and intelligence wires the rest — every trigger, every branch, every retry — running quietly while you build what actually matters.';

const WORDS = MANIFESTO.split(' ');
const ACCENT_WORDS = new Set(['intelligence', 'wires', 'the', 'rest']);

const HORIZONS = [
  {
    icon: Sparkles,
    title: 'AI-native, not bolted on',
    body: 'Brian reads your canvas, plans a workflow end to end, and fills every node — an agent that builds alongside you.',
  },
  {
    icon: ShieldCheck,
    title: 'Runs you can trust',
    body: 'Atomic locks, idempotency and crash recovery. A restart never double-sends. Every run replayable, down to the node.',
  },
  {
    icon: ToggleRight,
    title: 'Simple as true or false',
    body: 'No JSON, no raw configs. Toggles, pills and smart inputs — powerful underneath, effortless on top.',
  },
];

function Word({ word, accent, progress, start, end }) {
  const opacity = useTransform(progress, [start, end], [0.14, 1]);
  return (
    <motion.span style={{ opacity }} className="inline-block">
      <span
        className={
          accent
            ? 'bg-gradient-to-br from-white via-[#8fb4ff] to-[#1d5fe0] bg-clip-text text-transparent'
            : undefined
        }
      >
        {word}
      </span>
      {' '}
    </motion.span>
  );
}

export default function Vision() {
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 0.85', 'end 0.55'],
  });

  const beamScale = useTransform(scrollYProgress, [0, 1], [0, 1]);
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
        <div className="mb-14 flex items-center gap-4">
          {/* scroll-fill beam */}
          <div className="relative hidden h-14 w-px shrink-0 bg-white/[0.08] sm:block">
            <motion.div
              style={{ scaleY: reduce ? 1 : beamScale }}
              className="absolute inset-x-0 top-0 h-full origin-top bg-gradient-to-b from-[#8fb4ff] to-[#1d5fe0]"
            />
          </div>
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#6f97e8]">Our vision</p>
        </div>

        <h2 className="max-w-[900px] font-medium leading-[1.32] tracking-[-0.01em] text-white sm:leading-[1.28]" style={{ fontSize: 'clamp(1.55rem, 3.6vw, 2.85rem)' }}>
          {WORDS.map((word, i) => {
            const step = 1 / WORDS.length;
            const start = i * step;
            const end = Math.min(1, start + step * 3);
            return reduce ? (
              <span key={i} className="inline-block">
                <span
                  className={
                    ACCENT_WORDS.has(word.toLowerCase())
                      ? 'bg-gradient-to-br from-white via-[#8fb4ff] to-[#1d5fe0] bg-clip-text text-transparent'
                      : undefined
                  }
                >
                  {word}
                </span>
                {' '}
              </span>
            ) : (
              <Word
                key={i}
                word={word}
                accent={ACCENT_WORDS.has(word.toLowerCase())}
                progress={scrollYProgress}
                start={start}
                end={end}
              />
            );
          })}
        </h2>

        <div className="mt-20 grid grid-cols-1 gap-x-10 gap-y-12 md:grid-cols-3">
          {HORIZONS.map((h, i) => {
            const Icon = h.icon;
            return (
              <motion.div
                key={h.title}
                initial={{ opacity: 0, y: reduce ? 0 : 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.6, ease, delay: reduce ? 0 : i * 0.1 }}
                className="relative flex flex-col items-start"
              >
                <div className="mb-5 h-px w-10 bg-gradient-to-r from-[#6f97e8] to-transparent" />
                <Icon className="mb-4 h-5 w-5 text-[#6f97e8]" strokeWidth={1.75} />
                <h3 className="text-[16px] font-semibold tracking-tight text-[#fafafa]">{h.title}</h3>
                <p className="mt-2.5 text-[13.5px] leading-relaxed text-[#8c8c8c]">{h.body}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
