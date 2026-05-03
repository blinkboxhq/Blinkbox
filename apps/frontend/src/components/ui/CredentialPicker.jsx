import { useState, useEffect, useCallback } from 'react';
import { KeyRound, Plus, Shield, Loader2, ChevronDown, X, Eye, EyeOff } from 'lucide-react';
import api from '../../lib/api';

export default function CredentialPicker({
  value,
  onChange,
  label = 'Credential',
  placeholder = 'Select a credential…',
}) {
  const [credentials, setCredentials] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [open, setOpen] = useState(false);

  const [newName, setNewName] = useState('');
  const [newSecret, setNewSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState(null);

  const fetchCredentials = useCallback(async () => {
    try {
      const res = await api.get('/api/credentials');
      setCredentials(res.data.credentials || []);
    } catch { /* silent */ } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchCredentials(); }, [fetchCredentials]);

  const selectedCred = credentials.find((c) => c._id === value);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim() || !newSecret.trim()) {
      setCreateError('Name and secret are required.');
      return;
    }
    setIsCreating(true);
    setCreateError(null);
    try {
      const res = await api.post('/api/credentials', { name: newName.trim(), secret: newSecret });
      const created = res.data.credential;
      setCredentials((prev) => [created, ...prev]);
      onChange(created._id);
      setNewName(''); setNewSecret(''); setShowCreate(false);
    } catch (err) {
      setCreateError(err.response?.data?.message || 'Failed to save.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
        <KeyRound className="w-3 h-3" /> {label}
      </label>

      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((p) => !p)}
          className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-[#0d0d0f] border border-[#333] rounded-lg text-[13px] text-neutral-300 hover:border-neutral-600 transition-colors"
        >
          <span className={selectedCred ? 'text-neutral-200' : 'text-neutral-600'}>
            {isLoading ? 'Loading…' : (selectedCred?.name || placeholder)}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-neutral-600 shrink-0" />
        </button>

        {open && (
          <div className="absolute top-full mt-1 left-0 right-0 z-20 bg-[#111] border border-[#333] rounded-lg shadow-xl overflow-hidden">
            {credentials.map((c) => (
              <button
                key={c._id}
                type="button"
                onClick={() => { onChange(c._id); setOpen(false); }}
                className="w-full px-3 py-2.5 text-left text-[13px] text-neutral-300 hover:bg-white/[0.06] transition-colors flex items-center gap-2"
              >
                <Shield className="w-3.5 h-3.5 text-neutral-600 shrink-0" />
                <span className="flex-1 truncate">{c.name}</span>
                {c._id === value && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />}
              </button>
            ))}
            {credentials.length === 0 && !isLoading && (
              <p className="px-3 py-2.5 text-[12px] text-neutral-600">No credentials yet</p>
            )}
            <div className="border-t border-[#1e1e20]">
              <button
                type="button"
                onClick={() => { setShowCreate(true); setOpen(false); }}
                className="w-full px-3 py-2.5 text-left text-[12px] text-violet-400 hover:bg-white/[0.04] flex items-center gap-2 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> New credential
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedCred && (
        <div className="flex items-center gap-2 px-2.5 py-1.5 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
          <Shield className="w-3 h-3 text-emerald-500 shrink-0" />
          <span className="text-[11px] text-emerald-400 font-medium truncate">{selectedCred.name}</span>
        </div>
      )}

      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="flex flex-col gap-2.5 p-3 bg-[#0d0d0f] border border-[#2a2a2d] rounded-lg mt-1"
        >
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">New Credential</span>
            <button type="button" onClick={() => { setShowCreate(false); setCreateError(null); }}
              className="text-neutral-600 hover:text-neutral-400 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <input
            type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
            placeholder="Name (e.g. OpenAI Production)"
            className="bg-[#111] border border-[#333] rounded-md px-3 py-2 text-[13px] text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500 transition-colors"
          />
          <div className="relative">
            <input
              type={showSecret ? 'text' : 'password'} value={newSecret}
              onChange={(e) => setNewSecret(e.target.value)}
              placeholder="Secret / API key"
              className="w-full bg-[#111] border border-[#333] rounded-md px-3 py-2 pr-9 text-[13px] text-white placeholder-neutral-600 font-mono focus:outline-none focus:border-neutral-500 transition-colors"
            />
            <button type="button" onClick={() => setShowSecret((p) => !p)}
              className="absolute right-2.5 top-2.5 text-neutral-600 hover:text-neutral-400">
              {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
          {createError && <p className="text-[11px] text-red-400">{createError}</p>}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => { setShowCreate(false); setCreateError(null); setNewName(''); setNewSecret(''); }}
              className="px-3 py-1.5 text-[12px] text-neutral-500 hover:text-white transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isCreating || !newName.trim() || !newSecret.trim()}
              className="px-3 py-1.5 text-[12px] font-semibold bg-violet-500/15 border border-violet-500/30 text-violet-300 rounded-md hover:bg-violet-500/25 disabled:opacity-40 transition-colors">
              {isCreating ? <Loader2 className="w-3.5 h-3.5 animate-spin inline mr-1" /> : null}
              Save
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
