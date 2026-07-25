import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import MarketingLayout from './MarketingLayout';

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

const FAQ = [
  { q: 'What counts as a run?', a: 'One full execution of a workflow, start to finish — no matter how many nodes it touches. A retry of a failed step does not count as a new run.' },
  { q: 'Can I change plans anytime?', a: 'Yes. Upgrades apply instantly; downgrades apply at the end of the billing cycle. No lock-in, cancel whenever.' },
  { q: 'Is self-hosting really included?', a: 'On the Team plan, yes — run Blinkbox on your own infrastructure with the same engine the cloud runs.' },
];

export default function Pricing() {
  return (
    <MarketingLayout
      kicker="Pricing"
      plain="Priced per plan,"
      gradient="not per task."
      sub="No metered surprises. Pick a plan, automate as hard as you want."
    >
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {TIERS.map((tier) => (
          <div
            key={tier.name}
            className={`flex flex-col rounded-2xl border p-6 ${
              tier.featured
                ? 'border-[#6f97e8]/40 bg-gradient-to-b from-[#6f97e8]/[0.10] to-[#0d0d10]'
                : 'border-white/[0.07] bg-[#101013]'
            }`}
          >
            {tier.featured && (
              <span className="mb-4 self-start rounded-full border border-[#6f97e8]/40 bg-[#6f97e8]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#8fb4ff]">
                Most popular
              </span>
            )}
            <h2 className="text-[15px] font-semibold text-[#fafafa]">{tier.name}</h2>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-[34px] font-semibold tracking-tight text-[#fafafa]">{tier.price}</span>
              {tier.unit && <span className="text-[12px] text-[#6d6d6d]">{tier.unit}</span>}
            </div>
            <p className="mt-1 text-[13px] text-[#8c8c8c]">{tier.tagline}</p>
            <ul className="mt-6 flex flex-1 flex-col gap-2.5">
              {tier.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-[13px] text-[#b6b6b6]">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#6f97e8]" strokeWidth={2.25} />
                  {f}
                </li>
              ))}
            </ul>
            <Link
              to="/login"
              className={`bb-btn mt-7 justify-center py-2.5 text-[13px] font-semibold ${tier.featured ? 'bb-btn-accent' : 'bb-btn-ghost'}`}
            >
              {tier.cta}
            </Link>
          </div>
        ))}
      </div>

      <div className="mt-20">
        <h2 className="text-[18px] font-semibold tracking-tight text-[#fafafa]">Common questions</h2>
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          {FAQ.map((item) => (
            <div key={item.q} className="rounded-2xl border border-white/[0.07] bg-[#101013] p-5">
              <h3 className="text-[13px] font-semibold text-[#fafafa]">{item.q}</h3>
              <p className="mt-2 text-[12px] leading-relaxed text-[#8c8c8c]">{item.a}</p>
            </div>
          ))}
        </div>
      </div>
    </MarketingLayout>
  );
}
