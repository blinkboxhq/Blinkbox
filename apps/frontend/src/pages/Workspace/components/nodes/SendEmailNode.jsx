import { useState } from 'react';
import { Mail, Send, AtSign, KeyRound, ShieldCheck, ExternalLink } from 'lucide-react';

export default function SendEmailNode({ config = {}, updateConfig }) {
  const [activeTab, setActiveTab] = useState('message');

  const to = config.to || '';
  const subject = config.subject || '';
  const body = config.body || '';
  
  // We keep the internal variable as smtpConfig so the backend doesn't break, 
  // but we hardcode the Google host/port under the hood.
  const smtpConfig = config.smtpConfig || { host: 'smtp.gmail.com', port: 465, user: '', pass: '' };

  const updateGmail = (field, value) => {
    updateConfig('smtpConfig', { 
      ...smtpConfig, 
      host: 'smtp.gmail.com', 
      port: 465, 
      [field]: value 
    });
  };

  const isConfigured = to.length > 0 && subject.length > 0;
  const isConnected = smtpConfig.user.length > 0 && smtpConfig.pass.length > 0;

  return (
    <div className="flex flex-col gap-5 w-full">
      
      {/* 1. PREMIUM HEADER */}
      <div className="flex items-center gap-3 p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-xl relative overflow-hidden shadow-[0_0_20px_rgba(6,182,212,0.05)]">
        <div className="absolute right-0 top-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
        
        <div className="p-2 bg-cyan-500/20 border border-cyan-500/30 rounded-lg text-cyan-400 shrink-0 z-10">
          <Send className={`w-5 h-5 transition-transform duration-500 ${isConfigured ? 'translate-x-0.5 -translate-y-0.5' : ''}`} />
        </div>
        
        <div className="flex flex-col z-10 overflow-hidden">
          <span className="text-sm font-bold text-cyan-400 tracking-wide">Send via Gmail</span>
          <span className="text-[10px] text-zinc-400 truncate mt-0.5">
            {to ? `Target: ${to}` : 'Awaiting recipient...'}
          </span>
        </div>
      </div>

      {/* 2. TAB NAVIGATION */}
      <div className="flex bg-[#0a0a0a] p-1 rounded-lg border border-[#222]">
        <button 
          onClick={() => setActiveTab('message')}
          className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'message' ? 'bg-[#222] text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          <Mail className="w-3.5 h-3.5" /> Message
        </button>
        <button 
          onClick={() => setActiveTab('connection')}
          className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'connection' ? 'bg-[#222] text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          {/* Show a green checkmark if they've entered their credentials */}
          {isConnected ? <ShieldCheck className="w-3.5 h-3.5 text-green-500" /> : <KeyRound className="w-3.5 h-3.5" />} 
          Gmail Account
        </button>
      </div>

      {/* 3. TAB CONTENTS */}
      <div className="flex flex-col relative min-h-[280px]">
        
        {/* --- MESSAGE TAB --- */}
        <div className={`absolute inset-0 transition-opacity duration-200 flex flex-col gap-4 ${activeTab === 'message' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
              <AtSign className="w-3 h-3 text-cyan-400" /> Recipient (To)
            </label>
            <input 
              type="text"
              value={to}
              onChange={(e) => updateConfig('to', e.target.value)}
              placeholder="client@company.com"
              className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500/50 transition-colors shadow-inner"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
              Subject Line
            </label>
            <input 
              type="text"
              value={subject}
              onChange={(e) => updateConfig('subject', e.target.value)}
              placeholder="Your requested intelligence report..."
              className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500/50 transition-colors shadow-inner"
            />
          </div>

          <div className="flex flex-col gap-1.5 flex-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
              Email Body (Optional)
            </label>
            <textarea 
              value={body}
              onChange={(e) => updateConfig('body', e.target.value)}
              placeholder="Hello,\n\nHere is the data you requested..."
              className="w-full h-full bg-[#0a0a0a] border border-[#222] rounded-lg p-3 text-xs text-zinc-300 focus:outline-none focus:border-cyan-500/50 transition-colors resize-none shadow-inner leading-relaxed"
            />
          </div>
        </div>

        {/* --- GOOGLE/GMAIL ACCOUNT TAB --- */}
        <div className={`absolute inset-0 transition-opacity duration-200 flex flex-col gap-5 ${activeTab === 'connection' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
          
          {/* Google Branding Box */}
          <div className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-xl">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shrink-0 shadow-lg">
              {/* Official Google G Logo SVG */}
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-white">Google Integration</span>
              <span className="text-[10px] text-zinc-400">Securely send via your Gmail account</span>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Gmail Address</label>
              <input 
                type="email"
                value={smtpConfig.user}
                onChange={(e) => updateGmail('user', e.target.value)}
                placeholder="you@gmail.com"
                className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors shadow-inner"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">App Password</label>
                <a 
                  href="https://myaccount.google.com/apppasswords" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[9px] text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                >
                  How to get this <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
              <input 
                type="password"
                value={smtpConfig.pass}
                onChange={(e) => updateGmail('pass', e.target.value)}
                placeholder="••••••••••••••••"
                className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500 transition-colors shadow-inner"
              />
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}