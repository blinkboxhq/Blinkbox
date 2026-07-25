import { Mail, Briefcase, LifeBuoy } from 'lucide-react';
import MarketingLayout from './MarketingLayout';

const CHANNELS = [
  {
    icon: LifeBuoy,
    title: 'Support',
    desc: 'Stuck on a workflow, a connector, or a run that misbehaved? We answer fast.',
    action: 'blinkbox.co.in@gmail.com',
    href: 'mailto:blinkbox.co.in@gmail.com?subject=Support',
  },
  {
    icon: Briefcase,
    title: 'Sales & partnerships',
    desc: 'Team plans, self-hosting licenses, volume pricing, or building on top of Blinkbox.',
    action: 'blinkbox.co.in@gmail.com',
    href: 'mailto:blinkbox.co.in@gmail.com?subject=Sales',
  },
  {
    icon: Mail,
    title: 'Everything else',
    desc: 'Press, feedback, a strong opinion about automation — all welcome.',
    action: 'blinkbox.co.in@gmail.com',
    href: 'mailto:blinkbox.co.in@gmail.com',
  },
];

export default function Contact() {
  return (
    <MarketingLayout
      kicker="Contact"
      plain="Talk to"
      gradient="a human."
      sub="No ticket portals, no chatbots guarding the inbox. Email us and a person replies — usually within a day."
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {CHANNELS.map((ch) => {
          const Icon = ch.icon;
          return (
            <a
              key={ch.title}
              href={ch.href}
              className="group flex flex-col rounded-2xl border border-white/[0.07] bg-[#101013] p-6 transition-all duration-150 hover:border-white/[0.14]"
            >
              <Icon className="mb-3 h-[18px] w-[18px] text-[#6f97e8]" strokeWidth={1.75} />
              <h2 className="text-[14px] font-semibold text-[#fafafa]">{ch.title}</h2>
              <p className="mt-2 flex-1 text-[12px] leading-relaxed text-[#8c8c8c]">{ch.desc}</p>
              <span className="mt-4 text-[12px] font-medium text-[#8fb4ff] group-hover:underline">{ch.action}</span>
            </a>
          );
        })}
      </div>
    </MarketingLayout>
  );
}
