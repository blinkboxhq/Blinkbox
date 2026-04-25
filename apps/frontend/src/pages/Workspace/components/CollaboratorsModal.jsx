import { useState, useEffect, useCallback } from 'react';
import { X, UserPlus, Trash2, Loader2, Users, Crown } from 'lucide-react';
import api from '../../../lib/api';

function CollabAvatar({ c, size = 'sm' }) {
  const sz = size === 'sm' ? 'w-7 h-7 text-[11px]' : 'w-9 h-9 text-sm';
  const src = c.avatar || c.picture;
  if (src) return <img src={src} alt="" className={`${sz} rounded-full object-cover shrink-0`} referrerPolicy="no-referrer" />;
  return (
    <div className={`${sz} rounded-full bg-neutral-800 flex items-center justify-center font-semibold text-neutral-400 uppercase shrink-0`}>
      {c.name?.charAt(0) || '?'}
    </div>
  );
}

export default function CollaboratorsModal({ automationId, ownerId, isOpen, onClose }) {
  const [collaborators, setCollaborators] = useState([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('editor');
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [removingId, setRemovingId] = useState(null);

  const fetchCollabs = useCallback(async () => {
    if (!automationId) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/api/automation/${automationId}/collaborators`);
      setCollaborators(data.collaborators || []);
    } catch {}
    setLoading(false);
  }, [automationId]);

  useEffect(() => {
    if (isOpen) fetchCollabs();
  }, [isOpen, fetchCollabs]);

  const handleAdd = useCallback(async () => {
    if (!email.trim() || adding) return;
    setAdding(true);
    setError('');
    try {
      const { data } = await api.post(`/api/automation/${automationId}/collaborators`, {
        email: email.trim().toLowerCase(),
        role,
      });
      setCollaborators(data.collaborators || []);
      setEmail('');
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to add collaborator.');
    }
    setAdding(false);
  }, [email, role, adding, automationId]);

  const handleRemove = useCallback(async (userId) => {
    setRemovingId(userId);
    try {
      const { data } = await api.delete(`/api/automation/${automationId}/collaborators/${userId}`);
      setCollaborators(data.collaborators || []);
    } catch {}
    setRemovingId(null);
  }, [automationId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-md bg-neutral-950 border border-[#333] rounded-2xl shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 p-1.5 text-neutral-600 hover:text-neutral-300 rounded-lg hover:bg-white/[0.05] transition-colors">
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2.5 mb-5">
          <Users className="w-4 h-4 text-neutral-500" />
          <h2 className="text-[15px] font-semibold text-white">Collaborators</h2>
        </div>

        {/* Invite form */}
        <div className="mb-5">
          <label className="block text-[10px] font-medium text-neutral-500 uppercase tracking-wider mb-2">
            Invite by email
          </label>
          <div className="flex gap-2">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="colleague@example.com"
              className="flex-1 bg-neutral-900 border border-[#333] rounded-lg px-3 py-2 text-[13px] text-white focus:outline-none focus:border-neutral-600 placeholder-neutral-700"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="bg-neutral-900 border border-[#333] rounded-lg px-2 py-2 text-[12px] text-neutral-300 focus:outline-none focus:border-neutral-600"
            >
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
            <button
              onClick={handleAdd}
              disabled={adding || !email.trim()}
              className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-neutral-100 text-neutral-950 rounded-lg text-[12px] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
            </button>
          </div>
          {error && <p className="text-[11px] text-red-400 mt-1.5">{error}</p>}
        </div>

        {/* List */}
        <div>
          <p className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider mb-2">
            People with access
          </p>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-4 h-4 text-neutral-700 animate-spin" />
            </div>
          ) : collaborators.length === 0 ? (
            <div className="py-6 text-center text-[12px] text-neutral-700">
              No collaborators yet. Invite someone above.
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {collaborators.map((c) => (
                <div key={c.userId} className="flex items-center gap-3 p-2.5 rounded-lg bg-neutral-900/50 border border-[#2a2a2a]">
                  <CollabAvatar c={c} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-neutral-200 truncate">{c.name || c.email}</p>
                    <p className="text-[10px] text-neutral-600 truncate">{c.email}</p>
                  </div>
                  <span className="text-[10px] text-neutral-600 capitalize bg-neutral-800 px-2 py-0.5 rounded">
                    {c.role}
                  </span>
                  <button
                    onClick={() => handleRemove(c.userId)}
                    disabled={removingId === c.userId}
                    className="p-1 text-neutral-700 hover:text-red-400 rounded transition-colors disabled:opacity-40"
                    title="Remove collaborator"
                  >
                    {removingId === c.userId
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Trash2 className="w-3.5 h-3.5" />
                    }
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="mt-4 flex items-center gap-1.5 text-[10px] text-neutral-700">
          <Crown className="w-3 h-3" />
          <span>You are the owner. Editors can move nodes and edit config.</span>
        </div>
      </div>
    </div>
  );
}
