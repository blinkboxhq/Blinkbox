import { motion, useReducedMotion } from 'framer-motion';
import { MessageSquare, Workflow, Rocket } from 'lucide-react';

const ease = [0.22, 1, 0.36, 1];

const STEPS = [
  {
    n: '01',
    icon: MessageSquare,
    title: 'Describe it',
    body: 'Tell Brian what should happen — “when a Stripe payment fails, DM the customer and log it in Sheets.”',
  },
  {
    n: '02',
    icon: Workflow,
    title: 'Shape it',
    body: 'The workflow appears on the canvas. Tweak a toggle, swap a node, branch on a condition. No JSON, ever.',
  },
  {
    n: '03',
    icon: Rocket,
    title: 'Ship it',
    body: 'Flip it live. The engine handles retries, delays, and fan-out — and shows you every run in History.',
  },
];

export default function HowItWorks() {
  const reduce = useReducedMotion();
  return (
    <section className="relative bg-[#08080a] py-28">
      <div className="mx-auto max-w-[1200px] px-6 sm:px-8">
        <div className="mb-16 text-center">
          <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.2em] text-[#6f97e8]">
            From idea to live in minutes
          </p>
          <h2 className="mx-auto max-w-[620px] font-semibold tracking-[-0.02em] text-[#fafafa]" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}>
            Three steps. Zero wiring.
          </h2>
        </div>

        <div className="relative grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="pointer-events-none absolute left-0 right-0 top-8 hidden h-px bg-gradient-to-r from-transparent via-white/10 to-transparent md:block" />
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.n}
                initial={{ opacity: 0, y: reduce ? 0 : 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.6, ease, delay: reduce ? 0 : i * 0.12 }}
                className="relative flex flex-col items-start"
              >
                <div className="relative mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.08] bg-[#101013]">
                  <Icon className="h-6 w-6 text-[#6f97e8]" strokeWidth={1.75} />
                  <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#6f97e8] text-[10px] font-bold text-[#09090b]">
                    {step.n}
                  </span>
                </div>
                <h3 className="text-[18px] font-semibold tracking-tight text-[#fafafa]">{step.title}</h3>
                <p className="mt-2 max-w-[300px] text-[14px] leading-relaxed text-[#8c8c8c]">{step.body}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
