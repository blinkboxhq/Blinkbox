import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';

export default function CreateModal({ isOpen, onClose, onCreate, isLoading }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || isLoading) return;
    await onCreate({ name, description });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" style={{ animation: 'fadeIn 0.15s ease-out' }}>
      <div
        className="bg-neutral-950 border border-neutral-800 rounded-xl w-full max-w-md overflow-hidden"
        style={{ animation: 'scaleIn 0.15s ease-out' }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-900">
          <h3 className="text-sm font-semibold text-white">New Workflow</h3>
          <button onClick={onClose} disabled={isLoading} className="text-neutral-600 hover:text-white transition-colors disabled:opacity-50">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
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
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-xs font-medium text-neutral-500 hover:text-white transition-colors disabled:opacity-50"
            >
              Cancel
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
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
}
