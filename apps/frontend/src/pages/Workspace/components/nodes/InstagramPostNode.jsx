import SmartVariableInput from '../../../../components/ui/SmartVariableInput';
import imgInstagram from '../../../../assets/instagram.svg';
import CredentialPicker from '../../../../components/ui/CredentialPicker';
import OAuthConnectButton from '../../../../components/ui/OAuthConnectButton';

export default function InstagramPostNode({ config = {}, updateConfig, nodeId }) {
  const type        = config.type        ?? 'image'; // image | reel | carousel | story
  const mediaUrl    = config.mediaUrl    ?? '';
  const caption     = config.caption     ?? '';
  const hashtags    = config.hashtags    ?? '';
  const location    = config.location    ?? '';
  const coverUrl    = config.coverUrl    ?? '';
  const shareToFeed = config.shareToFeed ?? true;
  const accessToken = config.accessToken ?? '';
  const accountId   = config.accountId   ?? '';

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center">
          <img src={imgInstagram} alt="Instagram" className="w-8 h-8 object-contain" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Instagram Post</div>
          <div className="text-[11px] text-zinc-500">Post image, reel, story or carousel via Graph API</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Post Type</label>
        <div className="flex gap-1.5">
          {[
            { value: 'image',    label: 'Image' },
            { value: 'reel',     label: 'Reel' },
            { value: 'carousel', label: 'Carousel' },
            { value: 'story',    label: 'Story' },
          ].map((t) => (
            <button key={t.value} onClick={() => updateConfig('type', t.value)}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${type === t.value ? 'bg-pink-500/20 border-pink-500/40 text-pink-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">
          {type === 'carousel' ? 'Media URLs (one per line)' : type === 'reel' ? 'Video URL' : 'Media URL'}
        </label>
        <SmartVariableInput value={mediaUrl} onChange={(v) => updateConfig('mediaUrl', v)}
          placeholder={type === 'carousel' ? 'https://cdn.example.com/img1.jpg\nhttps://cdn.example.com/img2.jpg' : '{{ $json.mediaUrl }}'}
          multiline={type === 'carousel'} />
      </div>

      {type === 'reel' && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Cover Image URL</label>
          <SmartVariableInput value={coverUrl} onChange={(v) => updateConfig('coverUrl', v)} placeholder="{{ $json.thumbnailUrl }}" />
        </div>
      )}

      {type !== 'story' && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Caption</label>
            <SmartVariableInput value={caption} onChange={(v) => updateConfig('caption', v)}
              placeholder="{{ $json.caption }}" multiline />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Hashtags</label>
            <SmartVariableInput value={hashtags} onChange={(v) => updateConfig('hashtags', v)}
              placeholder="#travel #photography #viral  or  {{ $json.hashtags }}" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Location Tag (optional)</label>
            <SmartVariableInput value={location} onChange={(v) => updateConfig('location', v)} placeholder="Mumbai, India" />
          </div>
        </>
      )}

      {type === 'reel' && (
        <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
          <div>
            <p className="text-[12px] font-semibold text-zinc-300">Share to Feed</p>
            <p className="text-[10px] text-zinc-600">Also show reel in main grid</p>
          </div>
          <button onClick={() => updateConfig('shareToFeed', !shareToFeed)}
            className={`w-10 h-5 rounded-full border transition-all relative ${shareToFeed ? 'bg-pink-500 border-pink-400' : 'bg-zinc-700 border-zinc-600'}`}>
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${shareToFeed ? 'left-5' : 'left-0.5'}`} />
          </button>
        </div>
      )}

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Account ID</label>
          <input value={accountId} onChange={(e) => updateConfig('accountId', e.target.value)} placeholder="Instagram Business Account ID"
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 font-mono focus:outline-none focus:border-zinc-500" />
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Access Token</label>
        <CredentialPicker
        value={config.credentialId || ''}
        onChange={(id) => updateConfig('credentialId', id)}
        accentColor="blue"
        label="Instagram Token"
        placeholder="Select Instagram Token..."
      />
      </div>

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        Returns: <span className="text-zinc-300">postId, permalink, type, publishedAt</span>
      </div>
    </div>
  );
}
