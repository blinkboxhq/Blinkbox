import SmartVariableInput from '@/components/ui/SmartVariableInput';
import imgYouTube from '@/assets/youtube.png';
import CredentialPicker from '@/components/ui/CredentialPicker';
import OAuthConnectButton from '@/components/ui/OAuthConnectButton';

export default function YouTubeUploadNode({ config = {}, updateConfig, nodeId }) {
  const videoUrl    = config.videoUrl    ?? '';
  const title       = config.title       ?? '';
  const description = config.description ?? '';
  const tags        = config.tags        ?? '';
  const category    = config.category    ?? '22'; // 22 = People & Blogs
  const privacy     = config.privacy     ?? 'public';
  const thumbnail   = config.thumbnail   ?? '';
  const playlist    = config.playlist    ?? '';
  const language    = config.language    ?? 'en';
  const accessToken = config.accessToken ?? '';
  const notifySubscribers = config.notifySubscribers ?? true;

  const CATEGORIES = [
    { value: '1',  label: 'Film & Animation' },
    { value: '2',  label: 'Autos & Vehicles' },
    { value: '10', label: 'Music' },
    { value: '15', label: 'Pets & Animals' },
    { value: '17', label: 'Sports' },
    { value: '19', label: 'Travel & Events' },
    { value: '20', label: 'Gaming' },
    { value: '22', label: 'People & Blogs' },
    { value: '23', label: 'Comedy' },
    { value: '24', label: 'Entertainment' },
    { value: '25', label: 'News & Politics' },
    { value: '26', label: 'How-to & Style' },
    { value: '27', label: 'Education' },
    { value: '28', label: 'Science & Technology' },
  ];

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center overflow-hidden">
          <img src={imgYouTube} alt="YouTube" className="w-6 h-6 object-contain" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">YouTube Upload</div>
          <div className="text-[11px] text-zinc-500">Upload a video to YouTube via Data API v3</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Video URL or Base64</label>
        <SmartVariableInput value={videoUrl} onChange={(v) => updateConfig('videoUrl', v)} placeholder="{{ $json.videoUrl }}" />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Title</label>
        <SmartVariableInput value={title} onChange={(v) => updateConfig('title', v)} placeholder="{{ $json.title }}" />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Description</label>
        <SmartVariableInput value={description} onChange={(v) => updateConfig('description', v)} placeholder="{{ $json.description }}" multiline />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Tags (comma-separated)</label>
        <SmartVariableInput value={tags} onChange={(v) => updateConfig('tags', v)} placeholder="vlog, tech, tutorial, {{ $json.tags }}" />
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Privacy</label>
          <div className="flex flex-col gap-1">
            {['public','unlisted','private'].map((p) => (
              <button key={p} onClick={() => updateConfig('privacy', p)}
                className={`py-1.5 capitalize rounded-lg text-[11px] font-bold border transition-all ${privacy === p ? 'bg-red-500/20 border-red-500/40 text-red-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
                {p}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Category</label>
          <select value={category} onChange={(e) => updateConfig('category', e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-2 text-[11px] text-zinc-200 focus:outline-none cursor-pointer">
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Custom Thumbnail URL (optional)</label>
        <SmartVariableInput value={thumbnail} onChange={(v) => updateConfig('thumbnail', v)} placeholder="{{ $json.thumbnailUrl }}" />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Playlist ID (optional)</label>
        <SmartVariableInput value={playlist} onChange={(v) => updateConfig('playlist', v)} placeholder="PLxxxxxxxxxxxxxxxx" />
      </div>

      <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
        <div>
          <p className="text-[12px] font-semibold text-zinc-300">Notify Subscribers</p>
          <p className="text-[10px] text-zinc-600">Send upload notification to subscribers</p>
        </div>
        <button onClick={() => updateConfig('notifySubscribers', !notifySubscribers)}
          className={`w-10 h-5 rounded-full border transition-all relative ${notifySubscribers ? 'bg-red-500 border-red-400' : 'bg-zinc-700 border-zinc-600'}`}>
          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${notifySubscribers ? 'left-5' : 'left-0.5'}`} />
        </button>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">OAuth Access Token</label>
        <CredentialPicker
        value={config.credentialId || ''}
        onChange={(id) => updateConfig('credentialId', id)}
        accentColor="red"
        label="Google OAuth"
        placeholder="Select Google OAuth..."
      />
      </div>

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        Returns: <span className="text-zinc-300">videoId, url, title, privacy, uploadedAt</span>
      </div>
    </div>
  );
}
