import { useState, useEffect, useCallback, useRef } from 'react';
import { KeyRound, Plus, Shield, Loader2, ChevronDown, X, Eye, EyeOff, Check, Search } from 'lucide-react';
import api from '../../lib/api';

// Map accentColor prop → Tailwind classes
const ACCENT = {
  violet:  { btn: 'text-violet-400', dot: 'bg-violet-500', badge: 'bg-violet-500/10 border-violet-500/20 text-violet-400', save: 'bg-violet-500/15 border-violet-500/30 text-violet-300 hover:bg-violet-500/25' },
  blue:    { btn: 'text-blue-400',   dot: 'bg-blue-500',   badge: 'bg-blue-500/10 border-blue-500/20 text-blue-400',       save: 'bg-blue-500/15 border-blue-500/30 text-blue-300 hover:bg-blue-500/25' },
  green:   { btn: 'text-emerald-400',dot: 'bg-emerald-500',badge: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',save:'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25'},
  emerald: { btn: 'text-emerald-400',dot: 'bg-emerald-500',badge: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',save:'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25'},
  red:     { btn: 'text-red-400',    dot: 'bg-red-500',    badge: 'bg-red-500/10 border-red-500/20 text-red-400',          save: 'bg-red-500/15 border-red-500/30 text-red-300 hover:bg-red-500/25' },
  rose:    { btn: 'text-rose-400',   dot: 'bg-rose-500',   badge: 'bg-rose-500/10 border-rose-500/20 text-rose-400',       save: 'bg-rose-500/15 border-rose-500/30 text-rose-300 hover:bg-rose-500/25' },
  orange:  { btn: 'text-orange-400', dot: 'bg-orange-500', badge: 'bg-orange-500/10 border-orange-500/20 text-orange-400', save: 'bg-orange-500/15 border-orange-500/30 text-orange-300 hover:bg-orange-500/25' },
  amber:   { btn: 'text-amber-400',  dot: 'bg-amber-500',  badge: 'bg-amber-500/10 border-amber-500/20 text-amber-400',    save: 'bg-amber-500/15 border-amber-500/30 text-amber-300 hover:bg-amber-500/25' },
  sky:     { btn: 'text-sky-400',    dot: 'bg-sky-500',    badge: 'bg-sky-500/10 border-sky-500/20 text-sky-400',          save: 'bg-sky-500/15 border-sky-500/30 text-sky-300 hover:bg-sky-500/25' },
  indigo:  { btn: 'text-indigo-400', dot: 'bg-indigo-500', badge: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400', save: 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/25' },
  pink:    { btn: 'text-pink-400',   dot: 'bg-pink-500',   badge: 'bg-pink-500/10 border-pink-500/20 text-pink-400',       save: 'bg-pink-500/15 border-pink-500/30 text-pink-300 hover:bg-pink-500/25' },
  purple:  { btn: 'text-purple-400', dot: 'bg-purple-500', badge: 'bg-purple-500/10 border-purple-500/20 text-purple-400', save: 'bg-purple-500/15 border-purple-500/30 text-purple-300 hover:bg-purple-500/25' },
  zinc:    { btn: 'text-zinc-400',   dot: 'bg-zinc-400',   badge: 'bg-zinc-800 border-zinc-700 text-zinc-400',             save: 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700' },
};

const DEFAULT_ACCENT = ACCENT.violet;

function CredRow({ c, value, onChange, setOpen, setSearch, ac }) {
  const selected = c._id === value;
  return (
    <button
      type="button"
      onClick={() => { onChange(c._id); setOpen(false); setSearch(''); }}
      className={`w-full px-3 py-2.5 text-left text-[13px] text-neutral-300 hover:bg-white/[0.06] transition-colors flex items-center gap-2.5 ${selected ? 'bg-white/[0.04]' : ''}`}
    >
      <Shield className={`w-3.5 h-3.5 shrink-0 ${selected ? 'text-emerald-500' : 'text-neutral-600'}`} />
      <span className="flex-1 truncate">{c.name}</span>
      {c.type && (
        <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${selected ? ac.badge : 'bg-zinc-900 border-zinc-800 text-neutral-600'}`}>
          {c.type}
        </span>
      )}
      {selected && <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
    </button>
  );
}

export default function CredentialPicker({
  value,
  onChange,
  label = 'Credential',
  placeholder = 'Select a credential…',
  accentColor = 'violet',
  credentialType,   // optional — used as the default name prefix when creating
  hint,             // optional helper text shown below the picker
}) {
  const [credentials, setCredentials] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const [newName, setNewName] = useState('');
  const [newSecret, setNewSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState(null);

  const dropdownRef = useRef(null);
  const ac = ACCENT[accentColor] || DEFAULT_ACCENT;

  const fetchCredentials = useCallback(async () => {
    try {
      const res = await api.get('/api/credentials');
      setCredentials(res.data.credentials || []);
    } catch { /* silent */ } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchCredentials(); }, [fetchCredentials]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const selectedCred = credentials.find((c) => c._id === value);

  const searchLower = search.toLowerCase();
  const typeLower = credentialType?.toLowerCase();

  const allFiltered = search
    ? credentials.filter((c) => c.name.toLowerCase().includes(searchLower) || c.type?.toLowerCase().includes(searchLower))
    : credentials;

  const matched = typeLower
    ? allFiltered.filter((c) => c.type?.toLowerCase() === typeLower)
    : allFiltered;
  const others = typeLower
    ? allFiltered.filter((c) => c.type?.toLowerCase() !== typeLower)
    : [];

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim() || !newSecret.trim()) {
      setCreateError('Name and secret are required.');
      return;
    }
    setIsCreating(true);
    setCreateError(null);
    try {
      const res = await api.post('/api/credentials', {
        name: newName.trim(),
        secret: newSecret,
        type: credentialType || 'api_key',
      });
      const created = res.data.credential;
      setCredentials((prev) => [created, ...prev]);
      onChange(created._id);
      setNewName(''); setNewSecret(''); setShowCreate(false);
    } catch (err) {
      setCreateError(err.response?.data?.message || 'Failed to save credential.');
    } finally {
      setIsCreating(false);
    }
  };

  const openCreate = () => {
    setNewName(credentialType ? `${credentialType} Key` : '');
    setShowCreate(true);
    setOpen(false);
  };

  const clearSelection = (e) => {
    e.stopPropagation();
    onChange('');
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
        <KeyRound className="w-3 h-3" /> {label}
      </label>

      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => { setOpen((p) => !p); setSearch(''); }}
          className={`w-full flex items-center justify-between gap-2 px-3 py-2 bg-[#0d0d0f] border rounded-lg text-[13px] transition-colors ${
            selectedCred ? 'border-[#444] text-neutral-200' : 'border-[#333] text-neutral-600 hover:border-neutral-600'
          }`}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {selectedCred && <Shield className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
            <span className="truncate">{isLoading ? 'Loading…' : (selectedCred?.name || placeholder)}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {selectedCred && (
              <span onClick={clearSelection} className="text-neutral-600 hover:text-red-400 transition-colors p-0.5 rounded">
                <X className="w-3 h-3" />
              </span>
            )}
            <ChevronDown className={`w-3.5 h-3.5 text-neutral-600 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
          </div>
        </button>

        {open && (
          <div className="absolute top-full mt-1 left-0 right-0 z-50 bg-[#111] border border-[#333] rounded-lg shadow-2xl overflow-hidden max-h-64 flex flex-col">
            {/* Search */}
            {credentials.length > 3 && (
              <div className="px-2 py-1.5 border-b border-[#1e1e20]">
                <div className="flex items-center gap-2 px-2 py-1 bg-[#0d0d0f] rounded-md">
                  <Search className="w-3 h-3 text-neutral-600 shrink-0" />
                  <input
                    autoFocus type="text" value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search credentials…"
                    className="flex-1 bg-transparent text-[12px] text-neutral-300 placeholder-neutral-600 outline-none"
                  />
                </div>
              </div>
            )}

            {/* List */}
            <div className="overflow-y-auto flex-1">
              {allFiltered.length === 0 && (
                <p className="px-3 py-3 text-[12px] text-neutral-600 text-center">
                  {credentials.length === 0 ? 'No credentials yet — create one below' : 'No matches'}
                </p>
              )}

              {matched.length > 0 && credentialType && !search && (
                <p className="px-3 pt-2 pb-1 text-[9px] font-bold text-neutral-600 uppercase tracking-widest">{credentialType}</p>
              )}
              {matched.map((c) => (
                <CredRow key={c._id} c={c} value={value} onChange={onChange} setOpen={setOpen} setSearch={setSearch} ac={ac} />
              ))}

              {others.length > 0 && matched.length > 0 && (
                <div className="mx-3 my-1 border-t border-[#1e1e20]" />
              )}
              {others.length > 0 && !search && (
                <p className="px-3 pt-1 pb-1 text-[9px] font-bold text-neutral-700 uppercase tracking-widest">Other</p>
              )}
              {others.map((c) => (
                <CredRow key={c._id} c={c} value={value} onChange={onChange} setOpen={setOpen} setSearch={setSearch} ac={ac} />
              ))}
            </div>

            {/* Footer */}
            <div className="border-t border-[#1e1e20] shrink-0">
              <button
                type="button"
                onClick={openCreate}
                className={`w-full px-3 py-2.5 text-left text-[12px] ${ac.btn} hover:bg-white/[0.04] flex items-center gap-2 transition-colors font-medium`}
              >
                <Plus className="w-3.5 h-3.5" /> Add new credential
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Connected badge */}
      {selectedCred && (
        <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border ${ac.badge}`}>
          <Shield className="w-3 h-3 shrink-0" />
          <span className="text-[11px] font-medium truncate">{selectedCred.name}</span>
          <span className="ml-auto text-[9px] font-bold opacity-60 uppercase">{selectedCred.type || 'key'}</span>
        </div>
      )}

      {/* Hint */}
      {hint && !selectedCred && (
        <p className="text-[10px] text-neutral-600 leading-relaxed">{hint}</p>
      )}

      {/* Create inline form */}
      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="flex flex-col gap-2.5 p-3 bg-[#0d0d0f] border border-[#2a2a2d] rounded-lg mt-0.5"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">New Credential</span>
            <button type="button" onClick={() => { setShowCreate(false); setCreateError(null); setNewName(''); setNewSecret(''); }}
              className="text-neutral-600 hover:text-neutral-400 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <input
            autoFocus
            type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
            placeholder={`Name (e.g. ${credentialType || 'My'} Production)`}
            className="bg-[#111] border border-[#333] rounded-md px-3 py-2 text-[13px] text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500 transition-colors"
          />

          <div className="relative">
            <input
              type={showSecret ? 'text' : 'password'} value={newSecret}
              onChange={(e) => setNewSecret(e.target.value)}
              placeholder={credentialType ? `${credentialType} API key or token` : 'Secret / API key / token'}
              className="w-full bg-[#111] border border-[#333] rounded-md px-3 py-2 pr-9 text-[13px] text-white placeholder-neutral-600 font-mono focus:outline-none focus:border-neutral-500 transition-colors"
            />
            <button type="button" onClick={() => setShowSecret((p) => !p)}
              className="absolute right-2.5 top-2.5 text-neutral-600 hover:text-neutral-400 transition-colors">
              {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>

          {createError && <p className="text-[11px] text-red-400">{createError}</p>}

          <div className="flex gap-2 justify-end pt-0.5">
            <button type="button"
              onClick={() => { setShowCreate(false); setCreateError(null); setNewName(''); setNewSecret(''); }}
              className="px-3 py-1.5 text-[12px] text-neutral-500 hover:text-white transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isCreating || !newName.trim() || !newSecret.trim()}
              className={`px-3 py-1.5 text-[12px] font-semibold border rounded-md disabled:opacity-40 transition-colors flex items-center gap-1.5 ${ac.save}`}>
              {isCreating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Save & Connect
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
