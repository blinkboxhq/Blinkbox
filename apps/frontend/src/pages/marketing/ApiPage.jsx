import { Link } from 'react-router-dom';
import MarketingLayout from './MarketingLayout';

const ENDPOINTS = [
  { method: 'GET', path: '/v1/automations', desc: 'List every automation in your workspace.' },
  { method: 'POST', path: '/v1/automations', desc: 'Create an automation from a JSON graph — or a plain-English description.' },
  { method: 'POST', path: '/v1/automations/:id/run', desc: 'Trigger a run right now, with an optional payload.' },
  { method: 'PATCH', path: '/v1/automations/:id', desc: 'Activate, deactivate, or rename an automation.' },
  { method: 'GET', path: '/v1/executions/:id', desc: 'Inspect a run — status, timing, and the output of every node.' },
  { method: 'GET', path: '/v1/executions/:id/logs', desc: 'Step-by-step logs for debugging a run.' },
];

const METHOD_COLOR = {
  GET: 'text-[#4ade80] border-[#4ade80]/30 bg-[#4ade80]/10',
  POST: 'text-[#8fb4ff] border-[#8fb4ff]/30 bg-[#8fb4ff]/10',
  PATCH: 'text-[#fbbf24] border-[#fbbf24]/30 bg-[#fbbf24]/10',
};

const CURL = `curl -X POST https://api.blinkbox.app/v1/automations/aut_8f2k/run \\
  -H "Authorization: Bearer $BLINKBOX_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "payload": { "email": "new@customer.com" } }'`;

export default function ApiPage() {
  return (
    <MarketingLayout
      kicker="API"
      plain="Everything the app does,"
      gradient="over HTTPS."
      sub="Trigger runs, create automations, and read execution history from your own code. Auth is a single bearer key."
    >
      <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#101013]">
        {ENDPOINTS.map((ep, i) => (
          <div
            key={ep.method + ep.path}
            className={`flex flex-col gap-1.5 px-5 py-4 sm:flex-row sm:items-center sm:gap-4 ${i > 0 ? 'border-t border-white/[0.05]' : ''}`}
          >
            <span className={`w-fit shrink-0 rounded-md border px-2 py-0.5 font-mono text-[11px] font-semibold ${METHOD_COLOR[ep.method]}`}>
              {ep.method}
            </span>
            <code className="shrink-0 font-mono text-[13px] text-[#e6e6e6] sm:w-[260px]">{ep.path}</code>
            <p className="text-[12px] text-[#8c8c8c]">{ep.desc}</p>
          </div>
        ))}
      </div>

      <div className="mt-12">
        <h2 className="text-[18px] font-semibold tracking-tight text-[#fafafa]">Run an automation</h2>
        <p className="mt-2 max-w-[520px] text-[13px] leading-relaxed text-[#8c8c8c]">
          Generate an API key in your dashboard settings, then fire a run from anywhere:
        </p>
        <pre className="mt-5 overflow-x-auto rounded-2xl border border-white/[0.07] bg-[#0d0d11] p-5 font-mono text-[12px] leading-relaxed text-[#b6b6b6]">
          {CURL}
        </pre>
        <Link to="/login" className="bb-btn bb-btn-accent mt-8 inline-flex px-5 py-2.5 text-[13px] font-semibold">
          Get your API key
        </Link>
      </div>
    </MarketingLayout>
  );
}
