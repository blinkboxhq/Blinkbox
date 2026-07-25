import MarketingLayout from './MarketingLayout';

const RELEASES = [
  {
    version: 'v0.9',
    date: 'July 2026',
    title: 'Push triggers everywhere',
    items: [
      'Gmail, Google Forms, Slack, Vercel and 12 more apps now fire workflows the instant something happens — no polling delay.',
      'New trigger picker with per-app event variants.',
      'Landing page rebuilt around the integrations dome.',
    ],
  },
  {
    version: 'v0.8',
    date: 'June 2026',
    title: 'Brian, your AI copilot',
    items: [
      'Describe an automation in plain English and Brian lays down the trigger, nodes and logic on the canvas.',
      'Chat page for building and editing workflows conversationally.',
      'Smart variable suggestions inside every config panel.',
    ],
  },
  {
    version: 'v0.7',
    date: 'May 2026',
    title: 'Self-hosting beta',
    items: [
      'Run the full engine on your own infrastructure with MongoDB and Redis.',
      'Credential vault with AES-256-GCM encryption at rest.',
      'Workspace isolation and role-based access.',
    ],
  },
  {
    version: 'v0.6',
    date: 'April 2026',
    title: 'Engine hardening',
    items: [
      'Atomic cursor locks — a crashed worker never double-runs a step.',
      'Automatic crash recovery resumes interrupted executions within seconds.',
      'Loop fan-out, delays and condition branching stabilized.',
    ],
  },
];

export default function Changelog() {
  return (
    <MarketingLayout
      kicker="Changelog"
      plain="What shipped,"
      gradient="and when."
      sub="Every release that made Blinkbox faster, safer, or simpler."
    >
      <div className="flex flex-col">
        {RELEASES.map((release, i) => (
          <div key={release.version} className="relative flex gap-6 sm:gap-10">
            <div className="flex flex-col items-center">
              <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-[#6f97e8] shadow-[0_0_12px_rgba(111,151,232,0.6)]" />
              {i < RELEASES.length - 1 && <span className="w-px flex-1 bg-white/[0.08]" />}
            </div>
            <div className={i < RELEASES.length - 1 ? 'pb-12' : ''}>
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-[#6f97e8]/30 bg-[#6f97e8]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#8fb4ff]">
                  {release.version}
                </span>
                <span className="text-[12px] text-[#6d6d6d]">{release.date}</span>
              </div>
              <h2 className="mt-3 text-[18px] font-semibold tracking-tight text-[#fafafa]">{release.title}</h2>
              <ul className="mt-3 flex max-w-[560px] flex-col gap-2">
                {release.items.map((item) => (
                  <li key={item} className="text-[13px] leading-relaxed text-[#8c8c8c]">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </MarketingLayout>
  );
}
