import { useState } from 'react';
import { X, Loader2, Zap, FileText, ArrowRight } from 'lucide-react';

const STARTER_TEMPLATES = [
  {
    id: 'price-monitor',
    name: 'Webhook to Web Scraper',
    desc: 'Scrape a competitor page, have AI analyze it, and notify Slack.',
    color: 'purple',
    nodes: ['manual', 'web_scraper', 'ai_agent', 'slack'],
  },
  {
    id: 'daily-digest',
    name: 'Scheduled AI Summary',
    desc: 'Fetch data from an API, have AI summarize it, post to Discord.',
    color: 'blue',
    nodes: ['manual', 'http_request', 'ai_agent', 'discord'],
  },
  {
    id: 'form-to-api',
    name: 'Form to API Pipeline',
    desc: 'Capture form submissions, transform the data, and push to your backend.',
    color: 'emerald',
    nodes: ['webhook', 'data_mapper', 'http_request'],
  },
];

const COLOR_MAP = {
  purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400', hover: 'hover:border-purple-500/50' },
  blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', hover: 'hover:border-blue-500/50' },
  emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', hover: 'hover:border-emerald-500/50' },
};

export default function CreateModal({ isOpen, onClose, onCreate, onCreateTemplate, isLoading }) {
  const [step, setStep] = useState('pick'); // 'pick' | 'blank'
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  const handleBlankSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || isLoading) return;
    await onCreate({ name, description });
  };

  const handleTemplateClick = (templateId) => {
    if (isLoading) return;
    onCreateTemplate(templateId);
  };

  const resetAndClose = () => {
    setStep('pick');
    setName('');
    setDescription('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" style={{ animation: 'fadeIn 0.15s ease-out' }}>
      <div
        className="bg-neutral-950 border border-neutral-800 rounded-xl w-full max-w-lg overflow-hidden"
        style={{ animation: 'scaleIn 0.15s ease-out' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-900">
          <h3 className="text-sm font-semibold text-white">
            {step === 'pick' ? 'New Workflow' : 'Blank Workflow'}
          </h3>
          <button onClick={resetAndClose} disabled={isLoading} className="text-neutral-600 hover:text-white transition-colors disabled:opacity-50">
            <X className="w-4 h-4" />
          </button>
        </div>

        {step === 'pick' ? (
          <div className="p-5 space-y-4">
            {/* Starter Templates */}
            <div>
              <label className="block text-[11px] font-medium text-neutral-500 mb-3 uppercase tracking-wider">
                Start from a template
              </label>
              <div className="space-y-2.5">
                {STARTER_TEMPLATES.map((t) => {
                  const c = COLOR_MAP[t.color];
                  return (
                    <button
                      key={t.id}
                      onClick={() => handleTemplateClick(t.id)}
                      disabled={isLoading}
                      className={`w-full text-left p-4 rounded-xl border ${c.border} ${c.hover} bg-neutral-950 transition-all group disabled:opacity-50`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-semibold ${c.text} mb-1`}>{t.name}</div>
                          <p className="text-[11px] text-neutral-500 leading-relaxed">{t.desc}</p>
                          <div className="flex items-center gap-1.5 mt-2.5">
                            {t.nodes.map((n, i) => (
                              <span key={i} className="flex items-center gap-1">
                                <span className="text-[9px] font-mono text-neutral-600 bg-neutral-900 px-1.5 py-0.5 rounded">
                                  {n.replace('_', ' ')}
                                </span>
                                {i < t.nodes.length - 1 && <ArrowRight className="w-2.5 h-2.5 text-neutral-700" />}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className={`p-2 rounded-lg ${c.bg} ${c.text} shrink-0 opacity-0 group-hover:opacity-100 transition-opacity`}>
                          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 py-1">
              <div className="flex-1 h-px bg-neutral-900" />
              <span className="text-[10px] text-neutral-600 uppercase tracking-widest">or</span>
              <div className="flex-1 h-px bg-neutral-900" />
            </div>

            {/* Blank option */}
            <button
              onClick={() => setStep('blank')}
              className="w-full flex items-center gap-3 p-4 rounded-xl border border-neutral-900 hover:border-neutral-700 transition-colors text-left group"
            >
              <div className="p-2 bg-neutral-900 rounded-lg text-neutral-500 group-hover:text-white transition-colors">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <span className="text-sm font-medium text-neutral-400 group-hover:text-white transition-colors">Start from scratch</span>
                <p className="text-[10px] text-neutral-600 mt-0.5">Empty canvas with a manual trigger</p>
              </div>
            </button>
          </div>
        ) : (
          <form onSubmit={handleBlankSubmit} className="p-5 space-y-4">
            <div>
              <label className="block text-[11px] font-medium text-neutral-500 mb-1.5 uppercase tracking-wider">Name</label>
              <input
                type="text"
                autoFocus
                required
                disabled={isLoading}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Lead Enrichment Pipeline"
                className="w-full bg-black border border-neutral-900 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-neutral-700 focus:outline-none focus:border-neutral-700 transition-colors disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-neutral-500 mb-1.5 uppercase tracking-wider">Description <span className="text-neutral-700">(optional)</span></label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isLoading}
                placeholder="What does this workflow do?"
                rows={2}
                className="w-full bg-black border border-neutral-900 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-neutral-700 focus:outline-none focus:border-neutral-700 transition-colors resize-none disabled:opacity-50"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep('pick')}
                disabled={isLoading}
                className="px-4 py-2 text-xs font-medium text-neutral-500 hover:text-white transition-colors disabled:opacity-50"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex items-center gap-2 px-5 py-2 bg-white text-black text-xs font-semibold rounded-lg hover:bg-neutral-200 transition-all disabled:opacity-70"
              >
                {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {isLoading ? 'Creating...' : 'Create'}
              </button>
            </div>
          </form>
        )}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
}
