import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, ArrowRight } from 'lucide-react';
import logo from '../assets/logo.svg';

import imgSlack from '../assets/slack.png';
import imgGmail from '../assets/gmail.png';
import imgStripe from '../assets/stripe.svg';
import imgGithub from '../assets/github.svg';
import imgNotion from '../assets/notion.svg';
import imgShopify from '../assets/shopify.svg';
import imgOpenai from '../assets/openai.svg';
import imgAnthropic from '../assets/anthropic.svg';
import imgJira from '../assets/jira.svg';
import imgLinear from '../assets/linear.svg';
import imgVercel from '../assets/vercel.svg';
import imgPostgres from '../assets/postgresql.svg';
import imgHubspot from '../assets/hubspot.svg';
import imgFigma from '../assets/figma.svg';
import imgSalesforce from '../assets/salesforce.svg';
import imgGoogleSheets from '../assets/google-sheets.svg';
import imgAirtable from '../assets/Airtable--Streamline-Svg-Logos.svg';
import imgZoom from '../assets/zoom.svg';
import imgTwilio from '../assets/Twilio-Icon--Streamline-Svg-Logos.svg';
import imgTypeform from '../assets/typeform.svg';
import imgDiscord from '../assets/discord.svg';
import imgTelegram from '../assets/telegram.png';
import imgAsana from '../assets/asana.svg';
import imgClickup from '../assets/clickup.svg';
import imgMonday from '../assets/monday.svg';
import imgTrello from '../assets/trello.svg';
import imgZendesk from '../assets/zendesk.svg';
import imgIntercom from '../assets/intercom.svg';
import imgMailchimp from '../assets/mailchimp.svg';
import imgSendgrid from '../assets/Sendgrid-Icon--Streamline-Svg-Logos.svg';
import imgResend from '../assets/resend.svg';
import imgMongodb from '../assets/mongodb.svg';
import imgRedis from '../assets/redis.svg';
import imgFirebase from '../assets/firebase.svg';
import imgSupabase from '../assets/supabase.svg';
import imgGoogleDrive from '../assets/google-drive.svg';
import imgGoogleCalendar from '../assets/google-calendar.svg';
import imgGoogleDocs from '../assets/google-docs.svg';
import imgOnedrive from '../assets/onedrive.svg';
import imgOutlook from '../assets/outlook.svg';
import imgMsteams from '../assets/microsoft-teams.svg';
import imgGitlab from '../assets/gitlab.svg';
import imgDocker from '../assets/docker.svg';
import imgAws from '../assets/aws.svg';
import imgVercelSvg from '../assets/vercel.svg';
import imgNetlify from '../assets/netlify.svg';
import imgDatadog from '../assets/datadog.svg';
import imgSentry from '../assets/sentry.svg';
import imgPagerduty from '../assets/pagerduty.svg';
import imgPinecone from '../assets/pinecone.svg';
import imgTwitter from '../assets/twitter.svg';
import imgLinkedin from '../assets/linkedin.svg';
import imgInstagram from '../assets/instagram.svg';
import imgYoutube from '../assets/youtube.svg';
import imgReddit from '../assets/reddit.svg';
import imgRss from '../assets/rss.svg';
import imgPipedrive from '../assets/pipedrive.svg';
import imgWoocommerce from '../assets/woocommerce.svg';
import imgPython from '../assets/python.svg';
import imgJavascript from '../assets/javascript.svg';
import imgCalendly from '../assets/calendly.svg';
import imgTiktok from '../assets/tiktok.svg';
import imgGemini from '../assets/gemini-color.svg';
import imgDeepseek from '../assets/deepseek-color.svg';
import imgGroq from '../assets/groq.svg';
import imgOllama from '../assets/ollama.svg';

const INTEGRATIONS = [
  // Communication
  { src: imgSlack, name: 'Slack', category: 'Communication' },
  { src: imgDiscord, name: 'Discord', category: 'Communication' },
  { src: imgTelegram, name: 'Telegram', category: 'Communication' },
  { src: imgMsteams, name: 'Teams', category: 'Communication' },
  { src: imgZoom, name: 'Zoom', category: 'Communication' },
  // Email
  { src: imgGmail, name: 'Gmail', category: 'Email' },
  { src: imgOutlook, name: 'Outlook', category: 'Email' },
  { src: imgMailchimp, name: 'Mailchimp', category: 'Email' },
  { src: imgSendgrid, name: 'SendGrid', category: 'Email' },
  { src: imgResend, name: 'Resend', category: 'Email' },
  { src: imgTwilio, name: 'Twilio', category: 'Email' },
  // Productivity
  { src: imgNotion, name: 'Notion', category: 'Productivity' },
  { src: imgAirtable, name: 'Airtable', category: 'Productivity' },
  { src: imgGoogleSheets, name: 'Google Sheets', category: 'Productivity' },
  { src: imgGoogleDocs, name: 'Google Docs', category: 'Productivity' },
  { src: imgGoogleCalendar, name: 'Google Calendar', category: 'Productivity' },
  { src: imgGoogleDrive, name: 'Google Drive', category: 'Productivity' },
  { src: imgOnedrive, name: 'OneDrive', category: 'Productivity' },
  { src: imgTypeform, name: 'Typeform', category: 'Productivity' },
  { src: imgCalendly, name: 'Calendly', category: 'Productivity' },
  // Project Management
  { src: imgJira, name: 'Jira', category: 'Project Management' },
  { src: imgLinear, name: 'Linear', category: 'Project Management' },
  { src: imgAsana, name: 'Asana', category: 'Project Management' },
  { src: imgClickup, name: 'ClickUp', category: 'Project Management' },
  { src: imgMonday, name: 'Monday', category: 'Project Management' },
  { src: imgTrello, name: 'Trello', category: 'Project Management' },
  // CRM & Sales
  { src: imgHubspot, name: 'HubSpot', category: 'CRM & Sales' },
  { src: imgSalesforce, name: 'Salesforce', category: 'CRM & Sales' },
  { src: imgPipedrive, name: 'Pipedrive', category: 'CRM & Sales' },
  { src: imgZendesk, name: 'Zendesk', category: 'CRM & Sales' },
  { src: imgIntercom, name: 'Intercom', category: 'CRM & Sales' },
  // Payments
  { src: imgStripe, name: 'Stripe', category: 'Payments' },
  { src: imgShopify, name: 'Shopify', category: 'Payments' },
  { src: imgWoocommerce, name: 'WooCommerce', category: 'Payments' },
  // Developer Tools
  { src: imgGithub, name: 'GitHub', category: 'Developer Tools' },
  { src: imgGitlab, name: 'GitLab', category: 'Developer Tools' },
  { src: imgVercel, name: 'Vercel', category: 'Developer Tools' },
  { src: imgNetlify, name: 'Netlify', category: 'Developer Tools' },
  { src: imgDocker, name: 'Docker', category: 'Developer Tools' },
  { src: imgAws, name: 'AWS', category: 'Developer Tools' },
  { src: imgFigma, name: 'Figma', category: 'Developer Tools' },
  { src: imgPython, name: 'Python', category: 'Developer Tools' },
  { src: imgJavascript, name: 'JavaScript', category: 'Developer Tools' },
  // Observability
  { src: imgDatadog, name: 'Datadog', category: 'Observability' },
  { src: imgSentry, name: 'Sentry', category: 'Observability' },
  { src: imgPagerduty, name: 'PagerDuty', category: 'Observability' },
  // Database
  { src: imgPostgres, name: 'PostgreSQL', category: 'Database' },
  { src: imgMongodb, name: 'MongoDB', category: 'Database' },
  { src: imgRedis, name: 'Redis', category: 'Database' },
  { src: imgFirebase, name: 'Firebase', category: 'Database' },
  { src: imgSupabase, name: 'Supabase', category: 'Database' },
  { src: imgPinecone, name: 'Pinecone', category: 'Database' },
  // AI
  { src: imgOpenai, name: 'OpenAI', category: 'AI' },
  { src: imgAnthropic, name: 'Anthropic', category: 'AI' },
  { src: imgGemini, name: 'Gemini', category: 'AI' },
  { src: imgDeepseek, name: 'DeepSeek', category: 'AI' },
  { src: imgGroq, name: 'Groq', category: 'AI' },
  { src: imgOllama, name: 'Ollama', category: 'AI' },
  // Social
  { src: imgTwitter, name: 'Twitter / X', category: 'Social' },
  { src: imgLinkedin, name: 'LinkedIn', category: 'Social' },
  { src: imgInstagram, name: 'Instagram', category: 'Social' },
  { src: imgYoutube, name: 'YouTube', category: 'Social' },
  { src: imgReddit, name: 'Reddit', category: 'Social' },
  { src: imgTiktok, name: 'TikTok', category: 'Social' },
  { src: imgRss, name: 'RSS Feed', category: 'Social' },
];

const CATEGORIES = ['All', 'AI', 'Communication', 'Email', 'Productivity', 'Project Management', 'CRM & Sales', 'Payments', 'Developer Tools', 'Database', 'Observability', 'Social'];

const fade = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };

export default function Integrations() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const filtered = INTEGRATIONS.filter(({ name, category }) => {
    const matchSearch = name.toLowerCase().includes(search.toLowerCase());
    const matchCategory = activeCategory === 'All' || category === activeCategory;
    return matchSearch && matchCategory;
  });

  return (
    <div className="min-h-screen bg-[#080808] text-white" style={{ overflowX: 'clip' }}>
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 md:px-12 py-5 border-b border-white/[0.06]">
        <a href="/" className="flex items-center gap-2.5">
          <img src={logo} alt="Blinkbox" className="w-7 h-7" />
          <span className="text-[15px] font-bold tracking-tight text-white">blinkbox</span>
        </a>
        <div className="flex items-center gap-6">
          <a href="/product" className="text-[13px] text-neutral-400 hover:text-white transition-colors">Product</a>
          <a href="/docs" className="text-[13px] text-neutral-400 hover:text-white transition-colors">Docs</a>
          <div className="w-px h-4 bg-white/[0.1]" />
          <a href="https://blinkbox.net/login" target="_blank" rel="noopener noreferrer" className="text-[13px] text-neutral-400 hover:text-white transition-colors">Log in</a>
          <a href="https://blinkbox.net/login" target="_blank" rel="noopener noreferrer">
            <button className="text-[13px] font-medium text-black bg-white hover:bg-neutral-200 transition-colors px-3.5 py-1.5 rounded-lg">
              Get started
            </button>
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-24 pb-16 px-6 text-center">
        <div className="absolute inset-0 pointer-events-none opacity-[0.07]"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.4) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <span className="text-[11px] font-medium text-neutral-400">250+ native integrations</span>
          </div>
          <h1 className="text-[40px] md:text-[56px] font-bold tracking-[-0.03em] leading-[1.08] mb-4">
            Connect your entire stack.
          </h1>
          <p className="text-[16px] text-neutral-500 leading-relaxed mb-10 max-w-lg mx-auto">
            Blinkbox connects natively to every major tool — no middleware, no glue code, no third-party bridges.
          </p>

          {/* Search */}
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search integrations..."
              className="w-full pl-11 pr-4 py-3 rounded-xl text-[14px] text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500 transition-colors"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            />
          </div>
        </motion.div>
      </section>

      {/* Category filter */}
      <section className="px-6 pb-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`text-[12px] font-medium px-3.5 py-1.5 rounded-full transition-all duration-150 ${
                  activeCategory === cat
                    ? 'bg-white text-black'
                    : 'text-neutral-500 hover:text-white hover:bg-white/[0.06]'
                }`}
                style={activeCategory !== cat ? { border: '1px solid rgba(255,255,255,0.08)' } : {}}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Integration grid */}
      <section className="px-6 pb-24">
        <div className="max-w-6xl mx-auto">
          {filtered.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-[15px] text-neutral-600">No integrations found for "{search}"</p>
              <button onClick={() => { setSearch(''); setActiveCategory('All'); }} className="mt-4 text-[13px] text-neutral-500 hover:text-white transition-colors">
                Clear search
              </button>
            </div>
          ) : (
            <motion.div
              key={activeCategory + search}
              variants={{ visible: { transition: { staggerChildren: 0.03 } } }}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3"
            >
              {filtered.map(({ src, name, category }) => (
                <motion.div
                  key={name}
                  variants={fade}
                  transition={{ duration: 0.35 }}
                  className="flex flex-col items-center gap-3 p-4 rounded-2xl transition-all duration-150 hover:scale-[1.03] cursor-default group"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div className="w-10 h-10 flex items-center justify-center shrink-0">
                    <img src={src} alt={name} className="w-9 h-9 object-contain" />
                  </div>
                  <div className="text-center">
                    <div className="text-[12px] font-medium text-neutral-300 leading-tight">{name}</div>
                    <div className="text-[10px] text-neutral-600 mt-0.5">{category}</div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-white/[0.06] py-20 px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-xl mx-auto"
        >
          <h2 className="text-[30px] font-bold tracking-[-0.02em] mb-3">Don't see your tool?</h2>
          <p className="text-[15px] text-neutral-500 mb-8">
            Blinkbox includes an HTTP Request node that talks to any REST API. If you need a native connector, reach out and we'll build it.
          </p>
          <div className="flex items-center justify-center gap-3">
            <a href="https://blinkbox.net/login" target="_blank" rel="noopener noreferrer">
              <button className="flex items-center gap-2 text-[14px] font-semibold text-black bg-white hover:bg-neutral-200 transition-colors px-5 py-2.5 rounded-xl">
                Start automating <ArrowRight className="w-4 h-4" />
              </button>
            </a>
            <a href="mailto:hello@blinkbox.co.in" className="text-[14px] text-neutral-500 hover:text-white transition-colors px-4 py-2.5">
              Request an integration
            </a>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] px-6 py-8 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2">
          <img src={logo} alt="Blinkbox" className="w-5 h-5 opacity-60" />
          <span className="text-[12px] text-neutral-600">blinkbox</span>
        </a>
        <div className="flex items-center gap-6">
          <a href="/privacy" className="text-[12px] text-neutral-600 hover:text-neutral-400 transition-colors">Privacy</a>
          <a href="/terms" className="text-[12px] text-neutral-600 hover:text-neutral-400 transition-colors">Terms</a>
          <a href="https://blinkbox.net/login" target="_blank" rel="noopener noreferrer" className="text-[12px] text-neutral-600 hover:text-neutral-400 transition-colors">Log in</a>
        </div>
      </footer>
    </div>
  );
}
