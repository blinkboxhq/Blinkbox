import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, Check, X, Loader2, Users } from 'lucide-react';
import api from '../lib/api';
import { getSocket } from '../lib/socket';
import { toast } from 'sonner';

function timeAgo(d) {
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function InviteCard({ invite, onAccept, onReject }) {
  const [busy, setBusy] = useState(null); // 'accept' | 'reject'

  const handle = async (action) => {
    setBusy(action);
    await (action === 'accept' ? onAccept(invite._id) : onReject(invite._id));
    setBusy(null);
  };

  const src = invite.fromUserAvatar;

  return (
    <div className="p-3 rounded-xl border border-[#2a2a2a] bg-neutral-900/60 hover:bg-neutral-900 transition-colors">
      <div className="flex items-start gap-2.5 mb-3">
        {/* Sender avatar */}
        {src ? (
          <img src={src} alt="" className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-7 h-7 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center shrink-0 mt-0.5">
            <Users className="w-3.5 h-3.5 text-violet-400" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="text-[12px] text-neutral-200 leading-snug">
            <span className="font-semibold">{invite.fromUserName}</span>
            {' '}invited you to collaborate on{' '}
            <span className="font-semibold text-white">{invite.automationName}</span>
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-neutral-600 capitalize bg-neutral-800 px-1.5 py-0.5 rounded">
              {invite.role}
            </span>
            <span className="text-[10px] text-neutral-700">{timeAgo(invite.createdAt)}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => handle('accept')}
          disabled={!!busy}
          className="flex-1 flex items-center justify-center gap-1.5 h-7 rounded-lg bg-white hover:bg-neutral-100 text-neutral-950 text-[11px] font-semibold transition-colors disabled:opacity-50"
        >
          {busy === 'accept' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
          Accept
        </button>
        <button
          onClick={() => handle('reject')}
          disabled={!!busy}
          className="flex-1 flex items-center justify-center gap-1.5 h-7 rounded-lg border border-[#333] text-neutral-500 hover:text-neutral-300 hover:border-neutral-600 text-[11px] font-semibold transition-colors disabled:opacity-50"
        >
          {busy === 'reject' ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
          Decline
        </button>
      </div>
    </div>
  );
}

export default function NotificationBell() {
  const [invites,  setInvites]  = useState([]);
  const [open,     setOpen]     = useState(false);
  const [loading,  setLoading]  = useState(false);
  const panelRef = useRef(null);

  const count = invites.length;

  // Fetch pending invites
  const fetchInvites = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/invites');
      setInvites(data.invites || []);
    } catch { toast.error('Failed to load invites'); }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchInvites();
  }, [fetchInvites]);

  // Real-time: new invite arrives
  useEffect(() => {
    const socket = getSocket();

    const onInvite = ({ invite }) => {
      setInvites(prev => {
        // Avoid duplicates
        if (prev.some(i => i._id === invite._id)) return prev;
        return [invite, ...prev];
      });
      toast(`📬 ${invite.fromUserName} invited you to "${invite.automationName}"`, {
        description: `Role: ${invite.role}`,
        action: { label: 'View', onClick: () => setOpen(true) },
      });
    };

    const onAccepted = ({ automationName, byUserName }) => {
      toast.success(`${byUserName} accepted your invite to "${automationName}"`);
    };

    socket.on('collab:invite', onInvite);
    socket.on('collab:invite_accepted', onAccepted);

    return () => {
      socket.off('collab:invite', onInvite);
      socket.off('collab:invite_accepted', onAccepted);
    };
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const handleAccept = useCallback(async (inviteId) => {
    try {
      await api.post(`/api/invites/${inviteId}/accept`);
      setInvites(prev => prev.filter(i => i._id !== inviteId));
      toast.success('You joined the workflow!');
      // Tell the dashboard to re-fetch workflows without a page reload
      window.dispatchEvent(new CustomEvent('blinkbox:workflows:refresh'));
    } catch { toast.error('Failed to accept invite'); }
  }, []);

  const handleReject = useCallback(async (inviteId) => {
    try {
      await api.post(`/api/invites/${inviteId}/reject`);
      setInvites(prev => prev.filter(i => i._id !== inviteId));
    } catch { toast.error('Failed to decline invite'); }
  }, []);

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => { setOpen(o => !o); if (!open) fetchInvites(); }}
        className="relative h-7 w-7 flex items-center justify-center rounded-lg text-neutral-600 hover:text-neutral-300 hover:bg-white/[0.05] transition-colors"
        title="Notifications"
      >
        <Bell className="w-3.5 h-3.5" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] px-[3px] bg-violet-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white leading-none">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-9 w-80 bg-neutral-950 border border-[#333] rounded-2xl shadow-2xl z-[999] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#333]">
            <p className="text-[12px] font-semibold text-white">Notifications</p>
            {count > 0 && (
              <span className="text-[10px] text-violet-400 font-medium">{count} pending</span>
            )}
          </div>

          {/* Body */}
          <div className="max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-4 h-4 text-neutral-700 animate-spin" />
              </div>
            ) : invites.length === 0 ? (
              <div className="flex flex-col items-center py-10 gap-2">
                <Bell className="w-6 h-6 text-neutral-800" />
                <p className="text-[12px] text-neutral-600">No pending invites</p>
              </div>
            ) : (
              <div className="p-3 space-y-2">
                {invites.map(invite => (
                  <InviteCard
                    key={invite._id}
                    invite={invite}
                    onAccept={handleAccept}
                    onReject={handleReject}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
