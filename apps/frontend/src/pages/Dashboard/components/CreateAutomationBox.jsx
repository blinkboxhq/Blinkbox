import { useState, useEffect, useRef } from 'react';
import { X, Box, Loader2 } from 'lucide-react';

export default function CreateAutomationBox({ isOpen, onClose, onCreate, isLoading }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const nameRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setDescription('');
      setTimeout(() => nameRef.current?.focus(), 80);
    }
  }, [isOpen]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const canSubmit = name.trim().length > 0;

  const handleSubmit = async () => {
    if (!canSubmit || isLoading) return;
    await onCreate({ name: name.trim(), description: description.trim() });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', animation: 'cabFadeIn 0.18s ease-out' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-[420px] bg-[#0A0A0A] border border-neutral-800/70 rounded-2xl overflow-hidden flex flex-col"
        style={{ animation: 'cabSlideUp 0.2s cubic-bezier(0.16,1,0.3,1)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800/60">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-white/[0.06] flex items-center justify-center">
              <Box className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-[14px] font-semibold text-white tracking-tight">New Box</span>
          </div>
          <button onClick={onClose} disabled={isLoading} className="text-neutral-600 hover:text-white transition-colors p-1 rounded-md hover:bg-white/[0.06]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-[10px] font-semibold text-neutral-500 uppercase tracking-widest mb-2">Name *</label>
            <input
              ref={nameRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && canSubmit && handleSubmit()}
              placeholder="e.g. Lead Enrichment Pipeline"
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-[13px] text-white placeholder:text-neutral-700 focus:outline-none focus:border-neutral-600 transition-colors"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-neutral-500 uppercase tracking-widest mb-2">Description <span className="text-neutral-700 normal-case">(optional)</span></label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && canSubmit && handleSubmit()}
              placeholder="What does this box do?"
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-[13px] text-white placeholder:text-neutral-700 focus:outline-none focus:border-neutral-600 transition-colors"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5">
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || isLoading}
            className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl bg-white text-black text-[13px] font-bold hover:bg-neutral-200 active:scale-[0.98] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {isLoading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</>
              : <><Box className="w-4 h-4" /> Create Box</>
            }
          </button>
        </div>
      </div>

      <style>{`
        @keyframes cabFadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes cabSlideUp { from { opacity: 0; transform: translateY(16px) scale(0.98) } to { opacity: 1; transform: translateY(0) scale(1) } }
      `}</style>
    </div>
  );
}
