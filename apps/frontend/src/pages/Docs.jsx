import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, ChevronRight, BookOpen, Zap, GitBranch, Code2, Webhook, Clock, Brain, Filter, Globe, Shield, BarChart3 } from 'lucide-react';
import logo from '../assets/logo.svg';

const DOCS = [
  {
    category: 'Getting Started',
    icon: BookOpen,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20',
    articles: [
      { title: 'What is Blinkbox?', time: '2 min', body: 'Blinkbox is a visual automation platform. You connect apps, define logic with nodes, and Blinkbox runs it for you — on a schedule, on a webhook, or on demand. No code required.' },
      { title: 'Quick start: your first workflow', time: '5 min', body: 'Walk through creating a simple two-step automation: receiving a webhook and posting to Slack. By the end you\'ll have a live running workflow.' },
      { title: 'Core concepts', time: '4 min', body: 'Understand the building blocks: triggers, action nodes, edges, execution runs, and the credential vault. These five concepts cover 90% of what Blinkbox does.' },
      { title: 'Workspace overview', time: '3 min', body: 'Tour the canvas, sidebar, history tab, and settings panel. Learn how workflows are organized and how to navigate between them.' },
    ],
  },
  {
    category: 'Triggers',
    icon: Zap,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20',
    articles: [
      { title: 'Webhook trigger', time: '3 min', body: 'Blinkbox generates a unique URL for each webhook trigger. Send any HTTP request to it and the workflow runs immediately with the full request body available as variables.' },
      { title: 'Cron / schedule trigger', time: '2 min', body: 'Run workflows on a recurring schedule using standard cron syntax. Supports timezone-aware scheduling and one-time runs.' },
      { title: 'Email trigger (IMAP)', time: '4 min', body: 'Monitor any inbox via IMAP. The trigger fires when a new email arrives, giving you access to subject, sender, body, and attachments as variables.' },
      { title: 'Form / Typeform trigger', time: '3 min', body: 'Connect your Typeform account and react to new submissions in real time. Every response field maps to a named variable.' },
    ],
  },
  {
    category: 'Building Flows',
    icon: GitBranch,
    color: 'text-violet-400',
    bg: 'bg-violet-500/10 border-violet-500/20',
    articles: [
      { title: 'Adding and connecting nodes', time: '3 min', body: 'Drag a node from the sidebar onto the canvas, then draw an edge from its output handle to the next node\'s input. That\'s the whole model.' },
      { title: 'Using variables', time: '4 min', body: 'Any field with a {{ }} icon supports dynamic values. Type {{ and pick from the autocomplete list of outputs from previous nodes. Supports dot-notation for nested objects.' },
      { title: 'Condition branching', time: '5 min', body: 'The Condition node splits your flow into true and false paths based on a comparison you define. Both paths can continue independently.' },
      { title: 'Loops', time: '4 min', body: 'The Loop node fans out over any array — process each item through a sub-flow, then merge results downstream. Supports serial and parallel execution.' },
      { title: 'Merge node', time: '3 min', body: 'Collect outputs from multiple parallel branches back into a single stream before continuing. Waits for all branches to complete.' },
      { title: 'Error handling', time: '4 min', body: 'Every node has a failure output handle. Connect it to a notification or retry node to handle errors gracefully without stopping the entire run.' },
    ],
  },
  {
    category: 'AI Nodes',
    icon: Brain,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    articles: [
      { title: 'AI Agent node', time: '6 min', body: 'The AI Agent node connects to any LLM (OpenAI, Anthropic, Gemini, local models) and can use tools — other nodes — to take action based on natural language instructions.' },
      { title: 'Text generation', time: '3 min', body: 'Generate text with a prompt. Pass variables from previous nodes into the prompt template and get structured or unstructured output back.' },
      { title: 'Classify & route', time: '4 min', body: 'Use an AI node to classify incoming data and route it to different branches. Pass the classification result to a Condition node downstream.' },
      { title: 'Summarize & extract', time: '3 min', body: 'Summarize long texts, extract named entities, or convert unstructured content to JSON — all by writing a clear prompt.' },
    ],
  },
  {
    category: 'HTTP & APIs',
    icon: Globe,
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10 border-cyan-500/20',
    articles: [
      { title: 'HTTP Request node', time: '4 min', body: 'Make any GET, POST, PUT, PATCH, or DELETE request. Set headers, query params, body, and authentication. The full response is available in subsequent nodes.' },
      { title: 'Authentication methods', time: '3 min', body: 'Supports None, Basic Auth, Bearer Token, API Key (header or query), and OAuth2. Credentials are pulled from the Credential vault — never hardcoded.' },
      { title: 'Pagination', time: '3 min', body: 'Configure cursor-based or offset-based pagination and Blinkbox will automatically follow the next-page link until all data is fetched.' },
      { title: 'Webhook response node', time: '2 min', body: 'For synchronous webhook flows, use the Respond to Webhook node to send a custom HTTP response back to the caller before the workflow finishes.' },
    ],
  },
  {
    category: 'Code & Data',
    icon: Code2,
    color: 'text-orange-400',
    bg: 'bg-orange-500/10 border-orange-500/20',
    articles: [
      { title: 'Code node', time: '4 min', body: 'Write JavaScript that runs in a sandboxed Node.js context. You have access to the previous node\'s output via `$input` and can return any value.' },
      { title: 'Set Fields node', time: '2 min', body: 'Add, rename, or overwrite fields on the current item. Use dot notation to set nested values. Useful for normalizing data before passing it downstream.' },
      { title: 'Filter node', time: '3 min', body: 'Keep only items matching a condition. Works on arrays — pair it with a Loop node for per-item filtering or use it standalone on a single object.' },
      { title: 'JSON parse & stringify', time: '2 min', body: 'The Code node includes JSON.parse and JSON.stringify. Use them when an API returns a stringified JSON payload that needs to be parsed before you can access fields.' },
    ],
  },
  {
    category: 'Credentials',
    icon: Shield,
    color: 'text-teal-400',
    bg: 'bg-teal-500/10 border-teal-500/20',
    articles: [
      { title: 'Adding a credential', time: '2 min', body: 'Go to Credentials in the sidebar, click New, pick the service type, and follow the prompts. OAuth services open a popup — authorize once and the token is saved.' },
      { title: 'OAuth2 flow', time: '3 min', body: 'Blinkbox handles the full OAuth2 authorization code flow, token refresh, and secure storage. You authorize once; Blinkbox renews the access token automatically.' },
      { title: 'Using credentials in nodes', time: '2 min', body: 'Most integration nodes have a Credential dropdown. Select the credential you saved and the node uses it for every request.' },
      { title: 'Revoking access', time: '1 min', body: 'Delete a credential from the Credentials tab to immediately revoke its use across all workflows. Any workflow using it will fail at the node that referenced it.' },
    ],
  },
  {
    category: 'Monitoring',
    icon: BarChart3,
    color: 'text-rose-400',
    bg: 'bg-rose-500/10 border-rose-500/20',
    articles: [
      { title: 'Execution history', time: '3 min', body: 'Every workflow run is logged. Click any run in the History tab to see each node\'s input, output, timing, and status. Failed nodes show the error message.' },
      { title: 'Reading execution logs', time: '3 min', body: 'Logs are structured — each node produces a log entry with its resolved inputs and outputs. Use this to debug unexpected behavior without re-running the workflow.' },
      { title: 'Retry failed runs', time: '2 min', body: 'Re-run any failed execution from the History tab. Blinkbox re-executes from the top with the original trigger payload — no need to replay the trigger.' },
      { title: 'Alerts & notifications', time: '3 min', body: 'Use the Error output handle on any node to send a Slack message, email, or webhook when something fails. Chain it to your on-call tool of choice.' },
    ],
  },
];

const fade = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } };

export default function Docs() {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(null);

  const filtered = DOCS.map(section => ({
    ...section,
    articles: section.articles.filter(a => a.title.toLowerCase().includes(search.toLowerCase()) || a.body.toLowerCase().includes(search.toLowerCase())),
  })).filter(s => s.articles.length > 0);

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
          <a href="/integrations" className="text-[13px] text-neutral-400 hover:text-white transition-colors">Integrations</a>
          <a href="/#pricing" className="text-[13px] text-neutral-400 hover:text-white transition-colors">Pricing</a>
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
      <section className="pt-20 pb-12 px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl mx-auto"
        >
          <h1 className="text-[40px] md:text-[52px] font-bold tracking-[-0.03em] leading-[1.1] mb-4">
            Documentation
          </h1>
          <p className="text-[16px] text-neutral-500 mb-8 max-w-md mx-auto">
            Everything you need to build with Blinkbox — from first workflow to advanced automation patterns.
          </p>

          {/* Search */}
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search docs..."
              className="w-full pl-11 pr-4 py-3 rounded-xl text-[14px] text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500 transition-colors"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            />
          </div>
        </motion.div>
      </section>

      {/* Docs content */}
      <section className="px-6 pb-24">
        <div className="max-w-5xl mx-auto">
          {filtered.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-[15px] text-neutral-600">No results for "{search}"</p>
              <button onClick={() => setSearch('')} className="mt-4 text-[13px] text-neutral-500 hover:text-white transition-colors">
                Clear search
              </button>
            </div>
          ) : (
            <div className="space-y-10">
              {filtered.map(({ category, icon: Icon, color, bg, articles }, si) => (
                <motion.div
                  key={category}
                  initial={fade.hidden}
                  whileInView={fade.visible}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.5, delay: si * 0.05 }}
                >
                  {/* Section header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${bg}`}>
                      <Icon className={`w-4 h-4 ${color}`} strokeWidth={1.7} />
                    </div>
                    <h2 className="text-[17px] font-semibold text-white">{category}</h2>
                  </div>

                  {/* Article list */}
                  <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                    {articles.map(({ title, time, body }, ai) => {
                      const key = `${category}__${ai}`;
                      const open = expanded === key;
                      return (
                        <div key={key} className={ai < articles.length - 1 ? 'border-b border-white/[0.06]' : ''}>
                          <button
                            onClick={() => setExpanded(open ? null : key)}
                            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/[0.02] transition-colors group"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-[14px] font-medium text-neutral-200 group-hover:text-white transition-colors">{title}</span>
                              <span className="text-[11px] text-neutral-600">{time} read</span>
                            </div>
                            <ChevronRight
                              className={`w-4 h-4 text-neutral-600 shrink-0 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
                            />
                          </button>
                          {open && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="px-5 pb-5"
                            >
                              <p className="text-[13px] text-neutral-500 leading-relaxed border-l-2 border-white/[0.08] pl-4">
                                {body}
                              </p>
                            </motion.div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              ))}
            </div>
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
          className="max-w-lg mx-auto"
        >
          <h2 className="text-[28px] font-bold tracking-[-0.02em] mb-3">Ready to build?</h2>
          <p className="text-[15px] text-neutral-500 mb-8">
            The fastest way to learn Blinkbox is to build something. Start for free — no card, no setup.
          </p>
          <a href="https://blinkbox.net/login" target="_blank" rel="noopener noreferrer">
            <button className="text-[14px] font-semibold text-black bg-white hover:bg-neutral-200 transition-colors px-6 py-3 rounded-xl">
              Open Blinkbox
            </button>
          </a>
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
