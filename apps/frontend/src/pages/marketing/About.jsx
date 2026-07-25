import { Zap, ToggleRight, Server } from 'lucide-react';
import MarketingLayout from './MarketingLayout';

const VALUES = [
  { icon: ToggleRight, title: 'Simple is the feature', body: 'If a workflow needs a manual to build, we failed. Toggles over textboxes, canvas over config files, and never a line of JSON in your face.' },
  { icon: Zap, title: 'Runs are sacred', body: 'An automation you cannot trust is worse than no automation. The engine retries, recovers from crashes, and never double-fires.' },
  { icon: Server, title: 'Your data, your call', body: 'Use our cloud for speed or run the same engine on your own hardware. Lock-in is not a business model we like.' },
];

export default function About() {
  return (
    <MarketingLayout
      kicker="About"
      plain="Automation was supposed"
      gradient="to be easy."
      sub="Blinkbox exists because the tools that promised to save your time started demanding it instead."
    >
      <div className="max-w-[640px]">
        <p className="text-[15px] leading-relaxed text-[#b6b6b6]">
          Zapier made automation metered. Make made it a diagram class. n8n made it a DevOps project. Somewhere along
          the way, "connect two apps" turned into pricing calculators, JSON editors, and YAML.
        </p>
        <p className="mt-5 text-[15px] leading-relaxed text-[#b6b6b6]">
          Blinkbox is our answer: describe what you want, watch it appear on a canvas, flip it live. An AI copilot that
          builds with you, 251 integrations that just connect, and an execution engine built like infrastructure — not
          like a demo.
        </p>
        <p className="mt-5 text-[15px] leading-relaxed text-[#b6b6b6]">
          We're a small, independent team shipping fast. Every release makes the platform simpler on the surface and
          more serious underneath.
        </p>
      </div>

      <div className="mt-16 grid grid-cols-1 gap-4 md:grid-cols-3">
        {VALUES.map((v) => {
          const Icon = v.icon;
          return (
            <div key={v.title} className="rounded-2xl border border-white/[0.07] bg-[#101013] p-6">
              <Icon className="mb-3 h-[18px] w-[18px] text-[#6f97e8]" strokeWidth={1.75} />
              <h2 className="text-[14px] font-semibold text-[#fafafa]">{v.title}</h2>
              <p className="mt-2 text-[12px] leading-relaxed text-[#8c8c8c]">{v.body}</p>
            </div>
          );
        })}
      </div>
    </MarketingLayout>
  );
}
