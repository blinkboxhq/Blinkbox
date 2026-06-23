export default function Terms() {
  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-300 font-sans">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <a href="/" className="text-zinc-500 text-[13px] hover:text-white transition-colors">← blinkbox</a>
        <h1 className="text-3xl font-bold text-white mt-8 mb-2">Terms of Service</h1>
        <p className="text-zinc-500 text-[13px] mb-10">Last updated: May 2026</p>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">1. Acceptance</h2>
          <p className="text-[14px] leading-relaxed text-zinc-400">
            By using BlinkBox, you agree to these Terms of Service. If you do not agree, do not use the service.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">2. Use of service</h2>
          <p className="text-[14px] leading-relaxed text-zinc-400">
            BlinkBox is an automation platform. You may use it to create, schedule, and run automated workflows connecting third-party services. You are responsible for all workflows you create and the actions they perform on your behalf.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">3. Prohibited use</h2>
          <p className="text-[14px] leading-relaxed text-zinc-400">
            You may not use BlinkBox to send spam, violate third-party terms of service, perform illegal activities, or intentionally cause harm to other systems or users. We reserve the right to terminate accounts that violate this policy.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">4. Third-party integrations</h2>
          <p className="text-[14px] leading-relaxed text-zinc-400">
            BlinkBox connects to third-party services on your behalf. You are responsible for complying with the terms of those services. BlinkBox is not affiliated with Google, Microsoft, Notion, Airtable, or other integrated services.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">5. Availability</h2>
          <p className="text-[14px] leading-relaxed text-zinc-400">
            We aim for high availability but do not guarantee uninterrupted service. We are not liable for losses caused by downtime, failed automations, or third-party API outages.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">6. Termination</h2>
          <p className="text-[14px] leading-relaxed text-zinc-400">
            You may delete your account at any time. We may suspend or terminate accounts that violate these terms. Upon termination, your data will be deleted within 30 days.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">7. Contact</h2>
          <p className="text-[14px] leading-relaxed text-zinc-400">
            Questions? Email us at <a href="mailto:blinkbox.co.in@gmail.com" className="text-violet-400 hover:underline">blinkbox.co.in@gmail.com</a>
          </p>
        </section>
      </div>
    </div>
  );
}
