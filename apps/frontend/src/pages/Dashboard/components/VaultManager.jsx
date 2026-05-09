import { useState, useEffect, useCallback } from 'react';
import { Key, Plus, Trash2, Shield, Loader2, Copy, CheckCheck, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../../lib/api';

const TYPE_LABELS = {
  bearer: 'Bearer Token',
  api_key: 'API Key',
  basic: 'Basic Auth',
};

export default function VaultManager() {
  const [credentials, setCredentials] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editSecret, setEditSecret] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [editError, setEditError] = useState(null);

  // Create form state
  const [name, setName] = useState('');
  const [type, setType] = useState('bearer');
  const [secret, setSecret] = useState('');
  const [error, setError] = useState(null);

  const handleCopyId = (id) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const fetchCredentials = useCallback(async () => {
    try {
      const res = await api.get('/api/credentials');
      setCredentials(res.data.credentials || []);
    } catch {
      // Silently fail
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCredentials();
  }, [fetchCredentials]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim() || !secret.trim()) {
      setError('Name and secret are required.');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const res = await api.post('/api/credentials', { name: name.trim(), type, secret });
      setCredentials([res.data.credential, ...credentials]);
      setName('');
      setType('bearer');
      setSecret('');
      setShowForm(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create credential.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdate = async (id) => {
    if (!editSecret.trim()) {
      setEditError('Secret is required.');
      return;
    }
    setIsUpdating(true);
    setEditError(null);
    try {
      await api.patch(`/api/credentials/${id}`, { secret: editSecret });
      setEditingId(null);
      setEditSecret('');
    } catch (err) {
      setEditError(err.response?.data?.message || 'Failed to update credential.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/api/credentials/${id}`);
      setCredentials(credentials.filter((c) => c._id !== id));
      toast.success('Credential deleted');
    } catch {
      toast.error('Failed to delete credential');
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-neutral-100 tracking-tight">Credentials Vault</h2>
          <p className="text-sm text-neutral-500 mt-1">AES-256-GCM encrypted. Secrets never leave the server.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg text-xs font-semibold text-neutral-300 hover:text-white transition-all"
        >
          <Plus className="w-3.5 h-3.5" /> Add Credential
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <form onSubmit={handleCreate} className="mb-8 p-5 bg-neutral-950 border border-neutral-800 rounded-xl animate-slide-up">
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. OpenAI Production"
                  className="bg-black border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-600 transition-colors placeholder-neutral-700"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="bg-black border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-600 transition-colors cursor-pointer appearance-none"
                >
                  <option value="bearer">Bearer Token</option>
                  <option value="api_key">API Key</option>
                  <option value="basic">Basic Auth</option>
                </select>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Secret</label>
              <input
                type="password"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder="sk-••••••••••••••••"
                className="bg-black border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-neutral-600 transition-colors placeholder-neutral-700"
              />
            </div>

            {error && (
              <p className="text-xs text-red-400 font-medium">{error}</p>
            )}

            <div className="flex items-center gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => { setShowForm(false); setError(null); }}
                className="px-4 py-2 text-xs font-semibold text-neutral-500 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreating}
                className="flex items-center gap-2 px-5 py-2 bg-white text-black text-xs font-bold rounded-lg hover:bg-neutral-200 transition-all disabled:opacity-50"
              >
                {isCreating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Shield className="w-3.5 h-3.5" />}
                Encrypt & Save
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Credentials List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-neutral-600">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : credentials.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 border border-dashed border-neutral-800 rounded-xl text-center">
          <Key className="w-8 h-8 text-neutral-700 mb-3" />
          <p className="text-sm text-neutral-500 font-medium">No credentials stored yet.</p>
          <p className="text-xs text-neutral-600 mt-1">Add API keys, tokens, and auth credentials to use in your workflows.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {credentials.map((cred) => (
            <div key={cred._id} className="flex flex-col bg-neutral-950 border border-neutral-800 rounded-xl group hover:border-neutral-700 transition-colors">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-500">
                    <Key className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-neutral-200">{cred.name}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">
                        {TYPE_LABELS[cred.type] || cred.type}
                      </span>
                      <span className="text-[10px] text-neutral-600 font-mono select-all">
                        {cred._id}
                      </span>
                      <button
                        onClick={() => handleCopyId(cred._id)}
                        className="p-0.5 text-neutral-600 hover:text-neutral-300 transition-colors"
                        title="Copy credential ID"
                      >
                        {copiedId === cred._id
                          ? <CheckCheck className="w-3 h-3 text-emerald-400" />
                          : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setEditingId(editingId === cred._id ? null : cred._id); setEditSecret(''); setEditError(null); }}
                    className="p-2 text-neutral-600 hover:text-neutral-300 transition-colors"
                    title="Update secret"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(cred._id)}
                    className="p-2 text-neutral-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Inline update form */}
              {editingId === cred._id && (
                <div className="px-4 pb-4 flex flex-col gap-2 border-t border-neutral-800 pt-3">
                  <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">New Secret</label>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={editSecret}
                      onChange={(e) => setEditSecret(e.target.value)}
                      placeholder="Paste new token / API key"
                      className="flex-1 bg-black border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-neutral-600 transition-colors placeholder-neutral-700"
                    />
                    <button
                      onClick={() => handleUpdate(cred._id)}
                      disabled={isUpdating}
                      className="flex items-center gap-1.5 px-4 py-2 bg-white text-black text-xs font-bold rounded-lg hover:bg-neutral-200 transition-all disabled:opacity-50"
                    >
                      {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Shield className="w-3.5 h-3.5" />}
                      Save
                    </button>
                  </div>
                  {editError && <p className="text-xs text-red-400 font-medium">{editError}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {credentials.length > 0 && (
        <p className="text-[10px] text-neutral-600 mt-4 text-center">
          Click the copy icon next to a credential ID to use it in your workflow nodes.
        </p>
      )}
    </div>
  );
}
