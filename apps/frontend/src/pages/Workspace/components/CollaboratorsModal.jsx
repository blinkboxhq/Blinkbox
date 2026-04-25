import { useState, useEffect, useCallback } from 'react';
import { X, UserPlus, Trash2, Loader2, Users, Clock, Check } from 'lucide-react';
import api from '../../../lib/api';

function Avatar({ c, size = 'sm' }) {
  const sz = size === 'sm' ? 'w-7 h-7 text-[10px]' : 'w-8 h-8 text-[11px]';
  const src = c?.avatar || c?.picture || c?.fromUserAvatar;
  if (src) return <img src={src} alt="" className={`${sz} rounded-full object-cover shrink-0`} referrerPolicy="no-referrer" />;
  return (
    <div className={`${sz} rounded-full bg-neutral-800 flex items-center justify-center font-semibold text-neutral-400 uppercase shrink-0`}>
      {(c?.name || c?.fromUserName || '?').charAt(0)}
    </div>
  );
}

function timeAgo(d) {
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function CollaboratorsModal({ automationId, isOpen, onClose }) {
  const [collaborators, setCollaborators] = useState([]);
  const [sentInvites,   setSentInvites]   = useState([]);
  const [email,  setEmail]  = useState('');
  const [role,   setRole]   = useState('editor');
  const [sending,  setSending]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [removingId,  setRemovingId]  = useState(null);
  const [cancellingId, setCancellingId] = useState(null);

  const fetchData = useCallback(async () => {
    if (!automationId) return;
    setLoading(true);
    try {
      const [collabRes, inviteRes] = await Promise.all([
        api.get(`/api/automation/${automationId}/collaborators`),
        api.get(`/api/invites/sent/${automationId}`),
      ]);
      setCollaborators(collabRes.data.collaborators || []);
      setSentInvites(inviteRes.data.invites?.filter(i => i.status === 'pending') || []);
    } catch {}
    setLoading(false);
  }, [automationId]);

  useEffect(() => {
    if (isOpen) fetchData();
  }, [isOpen, fetchData]);

  const handleSend = useCallback(async () => {
    if (!email.trim() || sending) return;
    setSending(true);
    setError('');
    try {
      await api.post('/api/invites', { automationId, email: email.trim().toLowerCase(), role });
      setEmail('');
      fetchData(); // refresh the pending invites list
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to send invite.');
    }
    setSending(false);
  }, [email, role, sending, automationId, fetchData]);

  const handleRemove = useCallback(async (userId) => {
    setRemovingId(userId);
    try {
      const { data } = await api.delete(`/api/automation/${automationId}/collaborators/${userId}`);
      setCollaborators(data.collaborators || []);
    } catch {}
    setRemovingId(null);
  }, [automationId]);

  const handleCancel = useCallback(async (inviteId) => {
    setCancellingId(inviteId);
    try {
      await api.delete(`/api/invites/${inviteId}`);
      setSentInvites(prev => prev.filter(i => i._id !== inviteId));
    } catch {}
    setCancellingId(null);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-md bg-neutral-950 border border-[#333] rounded-2xl shadow-2xl flex flex-col max-h-[80vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#333] shrink-0">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-neutral-500" />
            <h2 className="text-[14px] font-semibold text-white">Collaborators</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-neutral-600 hover:text-neutral-300 rounded-lg hover:bg-white/[0.05] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">

          {/* ── Invite form ───────────────────────────────────────────── */}
          <div className="px-5 py-4 border-b border-[#2a2a2a]">
            <p className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider mb-2">
              Invite by email
            </p>
            <div className="flex gap-2">
              <input
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="colleague@example.com"
                className="flex-1 bg-neutral-900 border border-[#333] rounded-lg px-3 py-2 text-[12px] text-white focus:outline-none focus:border-neutral-600 placeholder-neutral-700"
              />
              <select
                value={role}
                onChange={e => setRole(e.target.value)}
                className="bg-neutral-900 border border-[#333] rounded-lg px-2 py-2 text-[11px] text-neutral-300 focus:outline-none shrink-0"
              >
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
              <button
                onClick={handleSend}
                disabled={sending || !email.trim()}
                className="h-9 px-3 bg-white hover:bg-neutral-100 text-neutral-950 rounded-lg text-[11px] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              >
                {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
              </button>
            </div>
            {error && <p className="text-[11px] text-red-400 mt-1.5">{error}</p>}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-4 h-4 text-neutral-700 animate-spin" />
            </div>
          ) : (
            <>
              {/* ── Pending invites ─────────────────────────────────── */}
              {sentInvites.length > 0 && (
                <div className="px-5 py-3 border-b border-[#2a2a2a]">
                  <p className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider mb-2">
                    Pending invites
                  </p>
                  <div className="space-y-2">
                    {sentInvites.map(inv => (
                      <div key={inv._id} className="flex items-center gap-3 p-2.5 rounded-lg bg-neutral-900/40 border border-[#2a2a2a]">
                        <div className="w-7 h-7 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
                          <Clock className="w-3.5 h-3.5 text-violet-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] text-neutral-400 truncate">{inv.toEmail}</p>
                          <p className="text-[10px] text-neutral-700">
                            {inv.role} · sent {timeAgo(inv.createdAt)}
                          </p>
                        </div>
                        <span className="text-[9px] font-medium text-amber-400/80 bg-amber-400/10 px-2 py-0.5 rounded uppercase tracking-wide shrink-0">
                          Pending
                        </span>
                        <button
                          onClick={() => handleCancel(inv._id)}
                          disabled={cancellingId === inv._id}
                          className="p-1 text-neutral-700 hover:text-red-400 rounded transition-colors disabled:opacity-40 shrink-0"
                          title="Cancel invite"
                        >
                          {cancellingId === inv._id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <X className="w-3.5 h-3.5" />
                          }
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Accepted collaborators ──────────────────────────── */}
              <div className="px-5 py-3">
                <p className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider mb-2">
                  Has access
                </p>
                {collaborators.length === 0 ? (
                  <p className="text-[11px] text-neutral-700 py-3 text-center">No collaborators yet.</p>
                ) : (
                  <div className="space-y-2">
                    {collaborators.map(c => (
                      <div key={c.userId} className="flex items-center gap-3 p-2.5 rounded-lg bg-neutral-900/40 border border-[#2a2a2a]">
                        <Avatar c={c} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-medium text-neutral-200 truncate">{c.name || c.email}</p>
                          <p className="text-[10px] text-neutral-600 truncate">{c.email}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-[10px] text-emerald-400/80 capitalize">{c.role}</span>
                        </div>
                        <button
                          onClick={() => handleRemove(c.userId)}
                          disabled={removingId === c.userId}
                          className="p-1 text-neutral-700 hover:text-red-400 rounded transition-colors disabled:opacity-40"
                          title="Remove"
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
