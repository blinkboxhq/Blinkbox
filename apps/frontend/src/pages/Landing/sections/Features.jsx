import { motion, useReducedMotion } from 'framer-motion';
import { Sparkles, MousePointerClick, Repeat, ShieldCheck, Server, ToggleRight } from 'lucide-react';
import productShot from '../assets/image.png';

const ease = [0.22, 1, 0.36, 1];

const CARDS = [
  {
    icon: Sparkles,
    title: 'Brian builds it for you',
    body: 'Describe the outcome in plain English. Blinkbox’s AI copilot lays down the trigger, the nodes, and the logic — a working automation before you touch the canvas.',
    span: 'lg:col-span-2 lg:row-span-2',
    accent: true,
  },
  {
    icon: MousePointerClick,
    title: 'A canvas, not a config file',
    body: 'Drag, drop, connect. Toggles instead of textboxes. You never see a line of JSON.',
    span: 'lg:col-span-2',
  },
  {
    icon: Repeat,
    title: '251 integrations',
    body: 'Apps, databases, AI models, HTTP — all first-class.',
    span: '',
  },
  {
    icon: ShieldCheck,
    title: 'Runs that don’t drop',
    body: 'A cursor-based engine with retries, crash recovery, and idempotent steps.',
    span: '',
  },
  {
    icon: ToggleRight,
    title: 'Simple by default',
    body: 'Easy as ticking true or false. Power when you want it, never in your face.',
    span: 'lg:col-span-2',
  },
  {
    icon: Server,
    title: 'Own your stack',
    body: 'Cloud when you want speed. Self-host when you want control. Your data, your rules.',
    span: 'lg:col-span-2',
  },
];

function Card({ card, i }) {
  const reduce = useReducedMotion();
  const Icon = card.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: reduce ? 0 : 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, ease, delay: reduce ? 0 : (i % 3) * 0.06 }}
      className={`group relative flex flex-col overflow-hidden rounded-[18px] border p-6 transition-all duration-300 hover:-translate-y-1 ${card.span} ${
        card.accent
          ? 'justify-end border-[#6f97e8]/25 bg-gradient-to-br from-[#6f97e8]/[0.12] via-[#12131a] to-[#0d0d10] hover:border-[#6f97e8]/45'
          : 'border-white/[0.07] bg-[#101013] hover:border-white/[0.14] hover:bg-[#141418]'
      }`}
    >
      {card.accent && (
        <>
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full opacity-60 blur-3xl transition-opacity duration-500 group-hover:opacity-90"
            style={{ background: 'radial-gradient(circle, rgba(111,151,232,0.5), transparent 70%)' }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-12 -top-8 w-[74%] rotate-2 rounded-lg transition-transform duration-500 group-hover:rotate-0 group-hover:scale-[1.02]"
            style={{ boxShadow: '0 30px 80px -20px rgba(0,0,0,0.9)' }}
          >
            <div
              className="absolute inset-0 rounded-lg"
              style={{
                padding: 2,
                background: 'linear-gradient(180deg, #34343a, #17171a 55%, #121214)',
                WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
                WebkitMaskComposite: 'xor',
                maskComposite: 'exclude',
              }}
            />
            <img src={productShot} alt="" className="block w-full rounded-lg opacity-80" />
            <div
              className="absolute inset-0 rounded-lg"
              style={{ background: 'linear-gradient(180deg, transparent 20%, rgba(13,13,16,0.96) 88%)' }}
            />
          </div>
        </>
      )}
      <Icon
        className={`relative mb-4 h-5 w-5 ${card.accent ? 'text-[#a9c0ef]' : 'text-[#6f97e8]'}`}
        strokeWidth={1.75}
      />
      <h3 className={`relative font-semibold tracking-tight text-[#fafafa] ${card.accent ? 'text-[22px]' : 'text-[15px]'}`}>
        {card.title}
      </h3>
      <p className={`relative mt-2 text-[#8c8c8c] ${card.accent ? 'max-w-[420px] text-[14px] leading-relaxed' : 'text-[13px] leading-relaxed'}`}>
        {card.body}
      </p>
    </motion.div>
  );
}

export default function Features() {
  return (
    <section id="features" className="relative overflow-hidden bg-[#060608] py-28">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[420px] w-[900px] -translate-x-1/2 rounded-full opacity-30 blur-[130px]"
        style={{ background: 'radial-gradient(ellipse at center, rgba(59,130,246,0.25), transparent 70%)' }}
      />
      <div className="relative mx-auto max-w-[1200px] px-6 sm:px-8">
        <div className="mb-14 max-w-[640px]">
          <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.2em] text-[#6f97e8]">
            Why Blinkbox
          </p>
          <h2 className="font-semibold tracking-[-0.02em] text-[#fafafa]" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}>
            The automation platform that{' '}
            <span className="bg-gradient-to-br from-white via-[#8fb4ff] to-[#1d5fe0] bg-clip-text text-transparent">
              gets out of your way.
            </span>
          </h2>
        </div>

        <div className="grid auto-rows-[minmax(150px,auto)] grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CARDS.map((card, i) => (
            <Card key={card.title} card={card} i={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
