import { Lock, KeyRound, ShieldCheck, Globe, Users, Trash2 } from 'lucide-react';
import MarketingLayout from './MarketingLayout';

const PRACTICES = [
  { icon: Lock, title: 'Encrypted at rest', body: 'Every credential and OAuth token is encrypted with AES-256-GCM before it touches the database. Plaintext secrets never persist.' },
  { icon: Globe, title: 'Encrypted in transit', body: 'All traffic — dashboard, API, webhooks — runs over HTTPS/TLS. No exceptions.' },
  { icon: KeyRound, title: 'Scoped OAuth, instant revoke', body: 'Connections request only the scopes your workflows use. Disconnect once and the tokens are deleted immediately, everywhere.' },
  { icon: ShieldCheck, title: 'Hardened outbound requests', body: 'Every user-supplied URL passes an SSRF guard before the engine touches it — internal networks and metadata endpoints are unreachable.' },
  { icon: Users, title: 'Workspace isolation', body: 'Every query is scoped to your workspace. Credentials, runs, and workflows are invisible across tenant boundaries by construction.' },
  { icon: Trash2, title: 'Short retention, your control', body: 'Execution logs expire after 30 days. Delete your account and the associated data goes with it.' },
];

export default function Security() {
  return (
    <MarketingLayout
      kicker="Security"
      plain="Boring by design,"
      gradient="on purpose."
      sub="Your automations touch your most sensitive systems. Here is how we make sure Blinkbox is the least interesting part of your attack surface."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PRACTICES.map((p) => {
          const Icon = p.icon;
          return (
            <div key={p.title} className="rounded-2xl border border-white/[0.07] bg-[#101013] p-6">
              <Icon className="mb-3 h-[18px] w-[18px] text-[#6f97e8]" strokeWidth={1.75} />
              <h2 className="text-[14px] font-semibold text-[#fafafa]">{p.title}</h2>
              <p className="mt-2 text-[12px] leading-relaxed text-[#8c8c8c]">{p.body}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-12 rounded-2xl border border-white/[0.07] bg-[#101013] p-6">
        <h2 className="text-[15px] font-semibold tracking-tight text-[#fafafa]">Found a vulnerability?</h2>
        <p className="mt-2 max-w-[560px] text-[13px] leading-relaxed text-[#8c8c8c]">
          We take reports seriously and respond quickly. Email{' '}
          <a href="mailto:security@blinkbox.net?subject=Security%20report" className="text-[#8fb4ff] hover:underline">
            security@blinkbox.net
          </a>{' '}
          with steps to reproduce — please give us a reasonable window to fix before public disclosure.
        </p>
      </div>
    </MarketingLayout>
  );
}
