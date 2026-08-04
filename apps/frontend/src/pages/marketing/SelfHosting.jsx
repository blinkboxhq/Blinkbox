import { Database, Server, Cpu } from 'lucide-react';
import MarketingLayout from './MarketingLayout';

const REQUIREMENTS = [
  { icon: Server, label: 'A Linux box', desc: 'Any VM with a public IP. Docker is installed for you.' },
  { icon: Cpu, label: '4 GB RAM', desc: 'Chromium for the scraper nodes is the heavy part.' },
  { icon: Database, label: 'Nothing else', desc: 'Mongo and Redis come up in the stack, on your disk.' },
];

const STEPS = [
  {
    n: '01',
    title: 'Create a license key',
    code: `blinkbox.net → Self-host → New license
bb_selfhost_••••••••••••••••••••`,
  },
  {
    n: '02',
    title: 'Run one command',
    code: `curl -fsSL https://get.blinkbox.net/install.sh | sudo sh

? Paste your license key
? Choose a name for this instance`,
  },
  {
    n: '03',
    title: 'Open your instance',
    code: `✓ Reserved acme.blinkbox.net → 203.0.113.9
✓ Blinkbox is running

https://acme.blinkbox.net`,
  },
];

export default function SelfHosting() {
  return (
    <MarketingLayout
      kicker="Self-hosting"
      plain="Your infra."
      gradient="Same engine."
      sub="One command, one license key, one name — and the exact engine the cloud runs sits on hardware you control, at name.blinkbox.net. Your plan and credits come with you."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {REQUIREMENTS.map((req) => {
          const Icon = req.icon;
          return (
            <div key={req.label} className="rounded-2xl border border-white/[0.07] bg-[#101013] p-5">
              <Icon className="mb-3 h-[18px] w-[18px] text-[#6f97e8]" strokeWidth={1.75} />
              <h2 className="text-[13px] font-semibold text-[#fafafa]">{req.label}</h2>
              <p className="mt-1 text-[12px] leading-relaxed text-[#8c8c8c]">{req.desc}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-14 flex flex-col gap-8">
        {STEPS.map((step) => (
          <div key={step.n}>
            <div className="flex items-center gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#6f97e8] text-[10px] font-bold text-[#09090b]">
                {step.n}
              </span>
              <h2 className="text-[15px] font-semibold tracking-tight text-[#fafafa]">{step.title}</h2>
            </div>
            <pre className="mt-3 overflow-x-auto rounded-2xl border border-white/[0.07] bg-[#0d0d11] p-5 font-mono text-[12px] leading-relaxed text-[#b6b6b6]">
              {step.code}
            </pre>
          </div>
        ))}
      </div>

      <p className="mt-12 max-w-[560px] text-[13px] leading-relaxed text-[#8c8c8c]">
        The installer reserves the subdomain, adds the DNS record and issues the certificate.
        Workflows, logs and credentials never leave your machine; only credit metering talks
        to the cloud. Questions —{' '}
        <a href="mailto:hello@blinkbox.net" className="text-[#8fb4ff] hover:underline">talk to us</a>.
      </p>
    </MarketingLayout>
  );
}
