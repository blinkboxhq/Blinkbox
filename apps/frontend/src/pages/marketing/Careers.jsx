import { ArrowUpRight } from 'lucide-react';
import MarketingLayout from './MarketingLayout';

const ROLES = [
  { title: 'Founding Engineer — Full-stack', type: 'Remote · Full-time', desc: 'Own features end to end: React canvas UX, Node execution engine, and everything between.' },
  { title: 'Design Engineer', type: 'Remote · Full-time', desc: 'Make the simplest automation tool also the best-looking one. Tailwind, motion, and taste.' },
  { title: 'Developer Relations', type: 'Remote · Part-time', desc: 'Teach the world to automate — docs, templates, videos, and community.' },
];

export default function Careers() {
  return (
    <MarketingLayout
      kicker="Careers"
      plain="Help us delete"
      gradient="busywork."
      sub="We're a small team with a big grudge against repetitive tasks. If shipping fast and polishing hard sounds like you, say hi."
    >
      <div className="flex flex-col gap-4">
        {ROLES.map((role) => (
          <a
            key={role.title}
            href={`mailto:blinkbox.co.in@gmail.com?subject=${encodeURIComponent(`Application: ${role.title}`)}`}
            className="group flex items-start justify-between gap-6 rounded-2xl border border-white/[0.07] bg-[#101013] p-6 transition-all duration-150 hover:border-white/[0.14]"
          >
            <div>
              <h2 className="text-[15px] font-semibold tracking-tight text-[#fafafa]">{role.title}</h2>
              <p className="mt-0.5 text-[12px] text-[#6d6d6d]">{role.type}</p>
              <p className="mt-2.5 max-w-[520px] text-[13px] leading-relaxed text-[#8c8c8c]">{role.desc}</p>
            </div>
            <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-[#6d6d6d] transition-all duration-150 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#8fb4ff]" strokeWidth={2} />
          </a>
        ))}
      </div>

      <p className="mt-10 max-w-[560px] text-[13px] leading-relaxed text-[#8c8c8c]">
        Don't see your role? We hire for slope, not titles — send whatever proves you build things to{' '}
        <a href="mailto:blinkbox.co.in@gmail.com" className="text-[#8fb4ff] hover:underline">blinkbox.co.in@gmail.com</a>.
      </p>
    </MarketingLayout>
  );
}
