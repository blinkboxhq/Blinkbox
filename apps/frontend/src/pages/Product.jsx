import { useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, GitBranch, Brain, BarChart3, Clock, Shield, Globe, Code2, Repeat2, Filter, ArrowRight } from 'lucide-react';
import logo from '../assets/logo.svg';

const FEATURES = [
  {
    icon: GitBranch,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20',
    title: 'Visual workflow builder',
    body: 'Drag nodes onto the canvas, connect them with edges, and your automation is live. No YAML. No code. No ops team required.',
  },
  {
    icon: Brain,
    color: 'text-violet-400',
    bg: 'bg-violet-500/10 border-violet-500/20',
    title: 'AI agents built-in',
    body: 'Drop an AI Agent node into any workflow. It reads context, makes decisions, calls tools, and hands off to the next step — all automatically.',
  },
  {
    icon: Globe,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    title: '250+ integrations',
    body: 'Native connectors for every major SaaS tool. If it has an API, Blinkbox can talk to it. OAuth-secured, zero token management.',
  },
  {
    icon: BarChart3,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20',
    title: 'Real-time execution logs',
    body: 'Every run is recorded — inputs, outputs, timing, errors. Click any node in the history view to see exactly what happened and why.',
  },
  {
    icon: Repeat2,
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10 border-cyan-500/20',
    title: 'Loop & branch logic',
    body: 'Fan out over arrays, branch on conditions, merge parallel paths. Complex logic stays visual — no nested if-else spaghetti.',
  },
  {
    icon: Clock,
    color: 'text-rose-400',
    bg: 'bg-rose-500/10 border-rose-500/20',
    title: 'Any trigger you need',
    body: 'Webhooks, cron schedules, email inboxes, form submissions, database changes. Blinkbox is always listening so you don\'t have to.',
  },
  {
    icon: Shield,
    color: 'text-teal-400',
    bg: 'bg-teal-500/10 border-teal-500/20',
    title: 'Credential vault',
    body: 'All API keys and OAuth tokens are encrypted at rest. One credential powers every workflow that needs it — revoke once to disable everywhere.',
  },
  {
    icon: Code2,
    color: 'text-orange-400',
    bg: 'bg-orange-500/10 border-orange-500/20',
    title: 'Run custom code',
    body: 'Need something that doesn\'t exist yet? Drop a Code node, write JavaScript, get the result back in the next step. Blinkbox handles the runtime.',
  },
  {
    icon: Filter,
    color: 'text-pink-400',
    bg: 'bg-pink-500/10 border-pink-500/20',
    title: 'Filter & transform',
    body: 'Extract fields, reshape JSON, filter arrays by condition — all with visual selectors and smart variable inputs. No jq wizardry needed.',
  },
];

const HOW = [
  { step: '01', title: 'Pick a trigger', body: 'Start with what kicks off your automation — a schedule, a webhook, an email, a form response. Blinkbox listens for it.' },
  { step: '02', title: 'Connect your apps', body: 'Authorize your tools once in the Credentials tab. They\'re available in every workflow you build, forever.' },
  { step: '03', title: 'Build your flow', body: 'Drag action nodes onto the canvas. Pass data between steps with point-and-click variable selectors.' },
  { step: '04', title: 'Activate and monitor', body: 'Flip the switch and watch the execution log fill up. Blinkbox runs it every time, exactly as you built it.' },
];

const fade = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0 } };

export default function Product() {
  return (
    <div className="min-h-screen bg-[#080808] text-white" style={{ overflowX: 'clip' }}>
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 md:px-12 py-5 border-b border-white/[0.06]">
        <a href="/" className="flex items-center gap-2.5">
          <img src={logo} alt="Blinkbox" className="w-7 h-7" />
          <span className="text-[15px] font-bold tracking-tight text-white">blinkbox</span>
        </a>
        <div className="flex items-center gap-6">
          <a href="/integrations" className="text-[13px] text-neutral-400 hover:text-white transition-colors">Integrations</a>
          <a href="/docs" className="text-[13px] text-neutral-400 hover:text-white transition-colors">Docs</a>
          <a href="/#pricing" className="text-[13px] text-neutral-400 hover:text-white transition-colors">Pricing</a>
          <div className="w-px h-4 bg-white/[0.1]" />
          <a href="https://blinkbox.net/login" target="_blank" rel="noopener noreferrer" className="text-[13px] text-neutral-400 hover:text-white transition-colors">Log in</a>
          <a href="https://blinkbox.net/login" target="_blank" rel="noopener noreferrer">
            <button className="text-[13px] font-medium text-black bg-white hover:bg-neutral-200 transition-colors px-3.5 py-1.5 rounded-lg">
              Get started
            </button>
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-28 pb-20 px-6 text-center">
        <div className="absolute inset-0 pointer-events-none opacity-[0.08]"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.4) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        <div className="relative z-10 max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-8"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <Zap className="w-3 h-3 text-white/60" />
            <span className="text-[11px] font-medium text-neutral-400">The automation platform for modern teams</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.06 }}
            className="font-bold leading-[1.08] tracking-[-0.03em] mb-5"
            style={{ fontSize: 'clamp(36px, 5vw, 62px)' }}
          >
            Everything you need<br />
            <span className="text-neutral-400">to automate anything.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.14 }}
            className="text-[16px] text-neutral-500 leading-relaxed mb-10 max-w-xl mx-auto"
          >
            One canvas. Every integration. AI built-in. Blinkbox replaces five tools and the engineering time it took to wire them together.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.22 }}
            className="flex items-center justify-center gap-3"
          >
            <a href="https://blinkbox.net/login" target="_blank" rel="noopener noreferrer">
              <button className="flex items-center gap-2 text-[14px] font-semibold text-black bg-white hover:bg-neutral-200 transition-colors px-5 py-2.5 rounded-xl">
                Start for free <ArrowRight className="w-4 h-4" />
              </button>
            </a>
            <a href="/docs" className="text-[14px] text-neutral-400 hover:text-white transition-colors px-4 py-2.5">
              Read the docs →
            </a>
          </motion.div>
        </div>
      </section>

      {/* Feature grid */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <motion.div
          variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {FEATURES.map(({ icon: Icon, color, bg, title, body }) => (
            <motion.div
              key={title}
              variants={fade}
              transition={{ duration: 0.5 }}
              className="rounded-2xl p-6"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className={`w-9 h-9 rounded-xl border flex items-center justify-center mb-4 ${bg}`}>
                <Icon className={`w-4.5 h-4.5 ${color}`} strokeWidth={1.7} />
              </div>
              <h3 className="text-[15px] font-semibold text-white mb-2">{title}</h3>
              <p className="text-[13px] text-neutral-500 leading-relaxed">{body}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* How it works */}
      <section className="border-t border-white/[0.06] py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={fade.hidden} whileInView={fade.visible} viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-[32px] md:text-[42px] font-bold tracking-[-0.02em] mb-4">How it works</h2>
            <p className="text-[15px] text-neutral-500 max-w-lg mx-auto">
              From zero to live automation in under 10 minutes. No engineering degree required.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {HOW.map(({ step, title, body }, i) => (
              <motion.div
                key={step}
                initial={fade.hidden}
                whileInView={fade.visible}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="relative"
              >
                <div className="text-[11px] font-bold text-neutral-600 tracking-widest uppercase mb-3">{step}</div>
                <h3 className="text-[15px] font-semibold text-white mb-2">{title}</h3>
                <p className="text-[13px] text-neutral-500 leading-relaxed">{body}</p>
                {i < HOW.length - 1 && (
                  <div className="hidden lg:block absolute top-2 right-0 w-6 h-px bg-white/[0.1] translate-x-3" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 text-center border-t border-white/[0.06]">
        <motion.div
          initial={fade.hidden} whileInView={fade.visible} viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-xl mx-auto"
        >
          <h2 className="text-[32px] font-bold tracking-[-0.02em] mb-4">Ready to automate?</h2>
          <p className="text-[15px] text-neutral-500 mb-8">Free forever on Starter. No credit card needed.</p>
          <a href="https://blinkbox.net/login" target="_blank" rel="noopener noreferrer">
            <button className="text-[14px] font-semibold text-black bg-white hover:bg-neutral-200 transition-colors px-6 py-3 rounded-xl">
              Start building for free
            </button>
          </a>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] px-6 py-8 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2">
          <img src={logo} alt="Blinkbox" className="w-5 h-5 opacity-60" />
          <span className="text-[12px] text-neutral-600">blinkbox</span>
        </a>
        <div className="flex items-center gap-6">
          <a href="/privacy" className="text-[12px] text-neutral-600 hover:text-neutral-400 transition-colors">Privacy</a>
          <a href="/terms" className="text-[12px] text-neutral-600 hover:text-neutral-400 transition-colors">Terms</a>
          <a href="https://blinkbox.net/login" target="_blank" rel="noopener noreferrer" className="text-[12px] text-neutral-600 hover:text-neutral-400 transition-colors">Log in</a>
        </div>
      </footer>
    </div>
  );
}
