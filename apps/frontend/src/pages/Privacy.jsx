export default function Privacy() {
  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-300 font-sans">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <a href="/" className="text-zinc-500 text-[13px] hover:text-white transition-colors">← blinkbox</a>
        <h1 className="text-3xl font-bold text-white mt-8 mb-2">Privacy Policy</h1>
        <p className="text-zinc-500 text-[13px] mb-10">Last updated: May 2026</p>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">1. What we collect</h2>
          <p className="text-[14px] leading-relaxed text-zinc-400">
            We collect your email address and name when you register. When you connect third-party services (Google, Notion, Airtable, Microsoft, etc.) via OAuth, we store encrypted access tokens to execute automations on your behalf. We never store your passwords.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">2. How we use your data</h2>
          <p className="text-[14px] leading-relaxed text-zinc-400">
            Your data is used solely to run the automations you create. We do not sell, share, or use your data for advertising. OAuth tokens are encrypted at rest and used only to perform actions you explicitly configure in your workflows.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">3. Third-party services</h2>
          <p className="text-[14px] leading-relaxed text-zinc-400">
            BlinkBox integrates with Google (Gmail, Sheets, Drive, Calendar), Notion, Airtable, Microsoft (Outlook, Teams, OneDrive), Slack, and others. When you connect these services, you grant BlinkBox permission to act on your behalf. You can revoke access at any time from within BlinkBox or from the respective service's settings.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">4. Data retention</h2>
          <p className="text-[14px] leading-relaxed text-zinc-400">
            Execution logs are retained for 30 days. You may delete your account and all associated data at any time by contacting us. OAuth credentials are deleted immediately upon disconnection.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">5. Security</h2>
          <p className="text-[14px] leading-relaxed text-zinc-400">
            All credentials are encrypted using AES-256-GCM. Data is transmitted over HTTPS. We use industry-standard security practices to protect your information.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">6. Contact</h2>
          <p className="text-[14px] leading-relaxed text-zinc-400">
            Questions? Email us at <a href="mailto:hello@blinkbox.net" className="text-violet-400 hover:underline">hello@blinkbox.net</a>
          </p>
        </section>
      </div>
    </div>
  );
}
