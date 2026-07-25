import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Check } from 'lucide-react';

const ease = [0.22, 1, 0.36, 1];

const TIERS = [
  {
    name: 'Free',
    price: '$0',
    unit: 'forever',
    tagline: 'For your first automations.',
    features: ['3 active workflows', '1,000 runs / month', 'All 251 integrations', 'Community support'],
    cta: 'Start free',
    featured: false,
  },
  {
    name: 'Pro',
    price: '$19',
    unit: '/ month',
    tagline: 'For builders who ship daily.',
    features: ['Unlimited workflows', '50,000 runs / month', 'Brian AI copilot', 'Retries, delays & branching', 'Priority support'],
    cta: 'Start Pro trial',
    featured: true,
  },
  {
    name: 'Team',
    price: 'Custom',
    unit: '',
    tagline: 'For orgs that self-host.',
    features: ['Everything in Pro', 'Self-hosted or private cloud', 'SSO & audit logs', 'Shared credentials & RBAC', 'Dedicated support'],
    cta: 'Talk to us',
    featured: false,
  },
];

export default function Pricing() {
  const reduce = useReducedMotion();
  return (
    <section id="pricing" className="relative overflow-hidden bg-[#060608] py-28">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[480px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-25 blur-[130px]"
        style={{ background: 'radial-gradient(ellipse at center, rgba(59,130,246,0.3), transparent 70%)' }}
      />
      <div className="relative mx-auto max-w-[1200px] px-6 sm:px-8">
        <div className="mb-16 text-center">
          <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.2em] text-[#6f97e8]">Pricing</p>
          <h2 className="mx-auto max-w-[620px] font-semibold tracking-[-0.02em] text-[#fafafa]" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}>
            Priced per plan,{' '}
            <span className="bg-gradient-to-br from-white via-[#8fb4ff] to-[#1d5fe0] bg-clip-text text-transparent">
              not per task.
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-[440px] text-[15px] text-[#8c8c8c]">
            No metered surprises. No paying for every step. Just run your automations.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {TIERS.map((tier, i) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: reduce ? 0 : 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.6, ease, delay: reduce ? 0 : i * 0.08 }}
              className={`relative flex flex-col rounded-[20px] border p-7 transition-all duration-300 hover:-translate-y-1 ${
                tier.featured
                  ? 'border-[#6f97e8]/40 bg-gradient-to-b from-[#6f97e8]/[0.10] to-[#0d0d10] hover:border-[#6f97e8]/60'
                  : 'border-white/[0.07] bg-[#101013] hover:border-white/[0.14]'
              }`}
            >
              {tier.featured && (
                <span className="absolute -top-3 left-7 rounded-full bg-[#6f97e8] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#09090b]">
                  Most popular
                </span>
              )}
              <h3 className="text-[15px] font-semibold text-[#fafafa]">{tier.name}</h3>
              <p className="mt-1 text-[13px] text-[#8c8c8c]">{tier.tagline}</p>
              <div className="mt-6 flex items-baseline gap-1.5">
                <span className="text-[40px] font-semibold tracking-tight text-[#fafafa]">{tier.price}</span>
                {tier.unit && <span className="text-[13px] text-[#6d6d6d]">{tier.unit}</span>}
              </div>

              <ul className="mt-7 flex flex-1 flex-col gap-3">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-[13px] text-[#b6b6b6]">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#6f97e8]" strokeWidth={2.25} />
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                to="/login"
                className={`bb-btn mt-8 justify-center py-3 text-[14px] font-semibold ${tier.featured ? 'bb-btn-accent' : 'bb-btn-ghost'}`}
              >
                {tier.cta}
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
