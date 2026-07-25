import { Database, Server, Cpu } from 'lucide-react';
import MarketingLayout from './MarketingLayout';

const REQUIREMENTS = [
  { icon: Cpu, label: 'Node.js 20+', desc: 'Runs the API and the execution engine.' },
  { icon: Database, label: 'MongoDB + Redis', desc: 'Workflow storage, queues, and atomic locks.' },
  { icon: Server, label: '2 GB RAM minimum', desc: 'A single small VM handles thousands of runs a day.' },
];

const STEPS = [
  {
    n: '01',
    title: 'Clone and install',
    code: `git clone https://github.com/blinkboxhq/Blinkbox.git blinkbox
cd blinkbox && npm install`,
  },
  {
    n: '02',
    title: 'Point it at your databases',
    code: `# apps/backend/.env
MONGODB_URI=mongodb://localhost:27017/blinkbox
REDIS_URL=redis://localhost:6379
JWT_SECRET=<generate-a-long-random-string>`,
  },
  {
    n: '03',
    title: 'Run it',
    code: `npm run dev        # backend :3000 + frontend :5174
npm run start      # production mode`,
  },
];

export default function SelfHosting() {
  return (
    <MarketingLayout
      kicker="Self-hosting"
      plain="Your infra."
      gradient="Same engine."
      sub="The Team plan ships the exact engine the cloud runs — cursor-based execution, crash recovery, credential vault — on hardware you control."
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
        Self-hosting licenses include update access and migration support —{' '}
        <a href="mailto:hello@blinkbox.net" className="text-[#8fb4ff] hover:underline">talk to us</a> to get set up.
      </p>
    </MarketingLayout>
  );
}
