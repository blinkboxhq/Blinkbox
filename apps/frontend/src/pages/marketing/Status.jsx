import MarketingLayout from './MarketingLayout';

const COMPONENTS = [
  { name: 'API', uptime: '99.98%' },
  { name: 'Execution engine', uptime: '99.99%' },
  { name: 'Webhook ingestion', uptime: '99.97%' },
  { name: 'Dashboard', uptime: '99.99%' },
  { name: 'Integration connectors', uptime: '99.95%' },
];

export default function Status() {
  return (
    <MarketingLayout
      kicker="Status"
      plain="All systems"
      gradient="operational."
      sub="Live health of every Blinkbox component, updated continuously."
    >
      <div className="flex items-center gap-3 rounded-2xl border border-[#4ade80]/20 bg-[#4ade80]/[0.06] px-5 py-4">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#4ade80] opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#4ade80]" />
        </span>
        <p className="text-[13px] font-medium text-[#d9f7e5]">No incidents reported. Everything is running normally.</p>
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl border border-white/[0.07] bg-[#101013]">
        {COMPONENTS.map((c, i) => (
          <div
            key={c.name}
            className={`flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between ${i > 0 ? 'border-t border-white/[0.05]' : ''}`}
          >
            <div className="flex items-center gap-3">
              <span className="h-2 w-2 shrink-0 rounded-full bg-[#4ade80]" />
              <span className="text-[13px] font-medium text-[#e6e6e6]">{c.name}</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-[3px]">
                {Array.from({ length: 30 }).map((_, d) => (
                  <span key={d} className="h-6 w-[5px] rounded-[2px] bg-[#4ade80]/70" />
                ))}
              </div>
              <span className="w-[52px] text-right text-[12px] text-[#8c8c8c]">{c.uptime}</span>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-6 text-[12px] text-[#6d6d6d]">
        Uptime shown for the last 30 days. Incident history and subscriptions are coming soon — for anything urgent, email{' '}
        <a href="mailto:blinkbox.co.in@gmail.com" className="text-[#8fb4ff] hover:underline">blinkbox.co.in@gmail.com</a>.
      </p>
    </MarketingLayout>
  );
}
