import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Zap, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import SmartJsonEditor from '../../../../components/ui/SmartJsonEditor';

export default function TriggerNode({ config, updateConfig }) {
  const { id } = useParams(); // 👈 Grabs the real automation ID from the URL
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [copied, setCopied] = useState(false);

  const isActive = config.isActive ?? true;
  const toggleActive = () => updateConfig('isActive', !isActive);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
  const webhookUrl = `${API_URL}/webhook/${id}`;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      
      {/* 1. THE PREMIUM TOGGLE SWITCH */}
      <div 
        onClick={toggleActive}
        className={`group relative flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all duration-300 overflow-hidden ${
          isActive 
            ? 'bg-[#1A2E1C]/40 border-[#2E5C2A] shadow-[0_0_20px_rgba(46,92,42,0.15)]' 
            : 'bg-[#0a0a0a] border-[#222] hover:border-[#333]'
        }`}
      >
        {isActive && <div className="absolute inset-0 bg-gradient-to-r from-[#2E5C2A]/10 to-transparent pointer-events-none" />}

        <div className="flex items-center gap-4 relative z-10">
          <div className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-500 ${
            isActive ? 'bg-[#2E5C2A] shadow-[0_0_15px_rgba(46,92,42,0.5)]' : 'bg-[#111] border border-[#333]'
          }`}>
            <Zap className={`w-5 h-5 transition-colors duration-500 ${isActive ? 'text-white' : 'text-zinc-600 group-hover:text-zinc-400'}`} />
          </div>
          <div className="flex flex-col">
            <span className={`text-sm font-bold transition-colors duration-300 ${isActive ? 'text-[#6B9F5D]' : 'text-zinc-400'}`}>
              {isActive ? 'Engine Active' : 'Engine Paused'}
            </span>
            <span className="text-[10px] text-zinc-500 font-mono tracking-wide mt-0.5">
              {isActive ? 'LISTENING FOR EVENTS' : 'CLICK TO WAKE UP'}
            </span>
          </div>
        </div>

        <div className={`w-12 h-6 rounded-full flex items-center p-1 transition-colors duration-300 relative z-10 ${
          isActive ? 'bg-[#2E5C2A]' : 'bg-[#222]'
        }`}>
          <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300 ${
            isActive ? 'translate-x-6' : 'translate-x-0'
          }`} />
        </div>
      </div>

      {/* 2. ADVANCED SETTINGS (Clean & Functional) */}
      <div className="border border-[#222] rounded-xl overflow-hidden bg-[#0a0a0a] shadow-lg">
        <button 
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between p-3.5 text-xs font-bold text-zinc-400 hover:text-zinc-200 transition-colors bg-gradient-to-b from-[#111] to-[#0a0a0a]"
        >
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500/50" />
            Webhook & Test Data
          </div>
          {showAdvanced ? <ChevronUp className="w-4 h-4 text-zinc-500"/> : <ChevronDown className="w-4 h-4 text-zinc-500"/>}
        </button>
        
        <div className={`transition-all duration-300 ease-in-out origin-top ${
          showAdvanced ? 'max-h-[350px] opacity-100' : 'max-h-0 opacity-0'
        }`}>
          <div className="p-4 border-t border-[#222] flex flex-col gap-5 bg-[#050505]">
            
            {/* 🌐 LIVE WEBHOOK INGRESS URL */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Live Ingress URL</label>
              <div className="relative flex items-center group/url">
                <input 
                  readOnly
                  value={webhookUrl}
                  className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg pl-3 pr-10 py-2.5 text-[11px] text-blue-400 font-mono focus:outline-none transition-colors selection:bg-blue-500/30"
                />
                <button 
                  onClick={handleCopyUrl}
                  className="absolute right-2 p-1.5 text-zinc-500 hover:text-white hover:bg-white/10 rounded transition-all"
                  title="Copy Webhook URL"
                >
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* SMART MOCK PAYLOAD EDITOR */}
            <SmartJsonEditor
              label="Test JSON Payload"
              value={config.mockPayload !== undefined ? config.mockPayload : '{\n  \n}'}
              onChange={(val) => updateConfig('mockPayload', val)}
              rows={4}
              placeholder="{}"
            />

          </div>
        </div>
      </div>
    </div>
  );
}