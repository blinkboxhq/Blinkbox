import { useState, useEffect, useCallback } from 'react';
import { KeyRound, Plus, Shield, Loader2, ChevronDown, X } from 'lucide-react';
import api from '../../lib/api';

const TYPE_OPTIONS = [
  { value: 'bearer', label: 'Bearer Token' },
  { value: 'api_key', label: 'API Key' },
  { value: 'basic', label: 'Basic Auth' },
];

/**
 * CredentialPicker — replaces raw credential ID text inputs.
 *
 * Props:
 *   value        — current credentialId
 *   onChange      — (credentialId: string) => void
 *   accentColor   — tailwind color class stem (e.g. "emerald", "blue", "violet")
 *   label         — optional label override (default: "Credential")
 *   placeholder   — hint text when nothing selected
 */
export default function CredentialPicker({
  value,
  onChange,
  accentColor = 'blue',
  label = 'Credential',
  placeholder = 'Select a credential...',
}) {
  const [credentials, setCredentials] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  // Create form state
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('api_key');
  const [newSecret, setNewSecret] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState(null);

  const fetchCredentials = useCallback(async () => {
    try {
      const res = await api.get('/api/credentials');
      setCredentials(res.data.credentials || []);
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCredentials();
  }, [fetchCredentials]);

  const selectedCred = credentials.find((c) => c._id === value);

  const handleSelect = (e) => {
    const val = e.target.value;
    if (val === '__new__') {
      setShowCreate(true);
    } else {
      onChange(val || '');
    }
  };

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
        type: newType,
        secret: newSecret,
      });
      const created = res.data.credential;
      setCredentials((prev) => [created, ...prev]);
      onChange(created._id);
      setNewName('');
      setNewType('api_key');
      setNewSecret('');
      setShowCreate(false);
    } catch (err) {
      setCreateError(err.response?.data?.message || 'Failed to create credential.');
    } finally {
      setIsCreating(false);
    }
  };

  const accentBorder = `focus:border-${accentColor}-500/50`;
  const accentText = `text-${accentColor}-400`;

  return (
    <div className="flex flex-col gap-2">
      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
        <KeyRound className={`w-3.5 h-3.5 ${accentText}`} /> {label}
      </label>

      {/* Dropdown */}
      <div className="relative">
        <select
          value={value || ''}
          onChange={handleSelect}
          disabled={isLoading}
          className={`w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-zinc-300 font-medium ${accentBorder} transition-colors shadow-inner cursor-pointer appearance-none pr-8 outline-none`}
        >
          <option value="">{isLoading ? 'Loading...' : placeholder}</option>
          {credentials.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name} ({c.type})
            </option>
          ))}
          <option value="__new__">+ Add New Credential</option>
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600 pointer-events-none" />
      </div>

      {/* Selected indicator */}
      {selectedCred && (
        <div className="flex items-center gap-2 px-2.5 py-1.5 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
          <Shield className="w-3 h-3 text-emerald-500 shrink-0" />
          <span className="text-[10px] text-emerald-400 font-medium truncate">
            {selectedCred.name}
          </span>
          <span className="text-[10px] text-zinc-600 font-mono">{selectedCred.type}</span>
        </div>
      )}

      {/* Inline Create Form */}
      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="flex flex-col gap-3 p-3 bg-zinc-900/80 border border-zinc-700/50 rounded-lg animate-in fade-in slide-in-from-top-1 duration-150"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
              New Credential
            </span>
            <button
              type="button"
              onClick={() => { setShowCreate(false); setCreateError(null); }}
              className="p-0.5 text-zinc-600 hover:text-zinc-300 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. OpenAI Production"
            className="bg-black border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-zinc-600 transition-colors"
          />

          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value)}
            className="bg-black border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-600 transition-colors cursor-pointer appearance-none"
          >
            {TYPE_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>

          <input
            type="password"
            value={newSecret}
            onChange={(e) => setNewSecret(e.target.value)}
            placeholder="sk-••••••••••••••••"
            className="bg-black border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white font-mono placeholder-zinc-700 focus:outline-none focus:border-zinc-600 transition-colors"
          />

          {createError && (
            <p className="text-[10px] text-red-400 font-medium">{createError}</p>
          )}

          <button
            type="submit"
            disabled={isCreating}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-white text-black text-xs font-bold rounded-lg hover:bg-zinc-200 transition-all disabled:opacity-50"
          >
            {isCreating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Shield className="w-3.5 h-3.5" />
            )}
            Encrypt & Save
          </button>
        </form>
      )}
    </div>
  );
}
