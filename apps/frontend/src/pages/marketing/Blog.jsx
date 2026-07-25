import MarketingLayout from './MarketingLayout';

const POSTS = [
  {
    tag: 'Engineering',
    date: 'Jul 2026',
    title: 'How Blinkbox never double-sends: atomic cursors explained',
    excerpt: 'A workflow engine that crashes mid-run has two bad options: skip a step or run it twice. Here is how cursor locks give us a third.',
  },
  {
    tag: 'Product',
    date: 'Jun 2026',
    title: 'Meet Brian, the copilot that builds your automations',
    excerpt: 'Why we built an AI that lays down nodes on a canvas instead of generating code you have to babysit.',
  },
  {
    tag: 'Engineering',
    date: 'Jun 2026',
    title: 'Polling is a tax. Push triggers are the refund.',
    excerpt: 'Moving 16 trigger apps from polling to push delivery — webhooks, Pub/Sub, and the edge cases nobody warns you about.',
  },
  {
    tag: 'Company',
    date: 'May 2026',
    title: 'Why Blinkbox prices per plan, not per task',
    excerpt: 'Metered pricing punishes you for automating more. That is backwards, and we are not doing it.',
  },
];

const TAG_COLOR = {
  Engineering: 'text-[#8fb4ff] border-[#8fb4ff]/30 bg-[#8fb4ff]/10',
  Product: 'text-[#4ade80] border-[#4ade80]/30 bg-[#4ade80]/10',
  Company: 'text-[#fbbf24] border-[#fbbf24]/30 bg-[#fbbf24]/10',
};

export default function Blog() {
  return (
    <MarketingLayout
      kicker="Blog"
      plain="Notes from"
      gradient="the workshop."
      sub="Engineering deep-dives, product thinking, and the occasional strong opinion about automation."
    >
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {POSTS.map((post) => (
          <article
            key={post.title}
            className="group flex flex-col rounded-2xl border border-white/[0.07] bg-[#101013] p-6 transition-all duration-150 hover:border-white/[0.14]"
          >
            <div className="flex items-center gap-3">
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${TAG_COLOR[post.tag]}`}>
                {post.tag}
              </span>
              <span className="text-[12px] text-[#6d6d6d]">{post.date}</span>
            </div>
            <h2 className="mt-4 text-[16px] font-semibold leading-snug tracking-tight text-[#fafafa]">{post.title}</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-[#8c8c8c]">{post.excerpt}</p>
            <span className="mt-4 text-[12px] font-medium text-[#6f97e8]">Coming soon</span>
          </article>
        ))}
      </div>
    </MarketingLayout>
  );
}
