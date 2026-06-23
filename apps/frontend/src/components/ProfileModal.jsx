import { useState, useRef, useCallback } from 'react';
import { X, Camera, Loader2, Check, User } from 'lucide-react';
import api from '../lib/api';

function Avatar({ src, name, size = 'lg' }) {
  const sz = size === 'lg' ? 'w-20 h-20 text-2xl' : 'w-10 h-10 text-sm';
  if (src) {
    return <img src={src} alt="" className={`${sz} rounded-full object-cover`} referrerPolicy="no-referrer" />;
  }
  return (
    <div className={`${sz} rounded-full bg-neutral-800 flex items-center justify-center font-semibold text-neutral-300 uppercase`}>
      {name?.charAt(0) || <User className="w-5 h-5" />}
    </div>
  );
}

// Resize an image file to maxSide×maxSide, return base64 JPEG data URL
function resizeImage(file, maxSide = 200) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(maxSide / img.width, maxSide / img.height, 1);
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ProfileModal({ user, isOpen, onClose, onUpdated }) {
  const [name, setName] = useState(user?.name || '');
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || user?.picture || '');
  const [pendingAvatar, setPendingAvatar] = useState(null); // base64 to save
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  const handleFileChange = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please select an image file.'); return; }
    try {
      const resized = await resizeImage(file, 200);
      setAvatarPreview(resized);
      setPendingAvatar(resized);
      setError('');
    } catch {
      setError('Failed to process image.');
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      const payload = {};
      if (name.trim() !== user?.name) payload.name = name.trim();
      if (pendingAvatar !== null) payload.avatar = pendingAvatar;

      if (Object.keys(payload).length === 0) { onClose(); return; }

      const { data } = await api.put('/api/profile', payload);

      // Update localStorage so Dashboard + header stay in sync
      const stored = JSON.parse(localStorage.getItem('blinkbox_user') || '{}');
      const next = { ...stored, name: data.name, avatar: data.avatar, picture: data.picture };
      localStorage.setItem('blinkbox_user', JSON.stringify(next));

      setSaved(true);
      setTimeout(() => { setSaved(false); onUpdated?.(data); onClose(); }, 800);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  }, [saving, name, pendingAvatar, user, onClose, onUpdated]);

  if (!isOpen) return null;

  const displayAvatar = avatarPreview || user?.picture || user?.avatar || '';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-sm bg-neutral-950 border border-[#333] rounded-2xl shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button onClick={onClose} className="absolute top-4 right-4 p-1.5 text-neutral-600 hover:text-neutral-300 rounded-lg hover:bg-white/[0.05] transition-colors">
          <X className="w-4 h-4" />
        </button>

        <h2 className="text-[15px] font-semibold text-white mb-5">Edit Profile</h2>

        {/* Avatar */}
        <div className="flex flex-col items-center gap-3 mb-6">
          <div className="relative group">
            <Avatar src={displayAvatar} name={name} size="lg" />
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
            >
              <Camera className="w-5 h-5 text-white" />
            </button>
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            className="text-[11px] text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            Change photo
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        </div>

        {/* Name */}
        <div className="mb-4">
          <label className="block text-[10px] font-medium text-neutral-500 uppercase tracking-wider mb-1.5">
            Display Name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-neutral-900 border border-[#333] rounded-lg px-3 py-2 text-[13px] text-white focus:outline-none focus:border-neutral-600 placeholder-neutral-700 transition-colors"
            placeholder="Your name"
            maxLength={100}
          />
        </div>

        {/* Email (read-only) */}
        <div className="mb-5">
          <label className="block text-[10px] font-medium text-neutral-500 uppercase tracking-wider mb-1.5">
            Email
          </label>
          <div className="w-full bg-neutral-900/50 border border-[#2a2a2a] rounded-lg px-3 py-2 text-[13px] text-neutral-600">
            {user?.email}
          </div>
        </div>

        {error && <p className="text-[11px] text-red-400 mb-3">{error}</p>}

        <button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="w-full flex items-center justify-center gap-2 py-2 bg-white hover:bg-neutral-100 text-neutral-950 rounded-lg text-[13px] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved ? <Check className="w-3.5 h-3.5" /> : null}
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
