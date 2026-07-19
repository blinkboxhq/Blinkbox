import SmartVariableInput from '../../../../components/ui/SmartVariableInput';
import CredentialPicker from '../../../../components/ui/CredentialPicker';
import imgTikTok from '../../../../assets/tiktok.svg';

export default function TikTokPostNode({ config = {}, updateConfig, nodeId }) {
  const videoUrl    = config.videoUrl    ?? '';
  const caption     = config.caption     ?? '';
  const privacy     = config.privacy     ?? 'PUBLIC_TO_EVERYONE';
  const duet        = config.duet        ?? false;
  const stitch      = config.stitch      ?? false;
  const comment     = config.comment     ?? true;
  const coverTime   = config.coverTime   ?? 0;

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center">
          <img src={imgTikTok} alt="TikTok" className="w-8 h-8 object-contain" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">TikTok Post</div>
          <div className="text-[11px] text-zinc-500">Publish a video to TikTok via Content Posting API</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Video URL</label>
        <SmartVariableInput value={videoUrl} onChange={(v) => updateConfig('videoUrl', v)} placeholder="{{ $json.videoUrl }}" />
        <p className="text-[10px] text-zinc-600 mt-1">Publicly accessible URL or direct upload URL</p>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Caption (max 2200 chars)</label>
        <SmartVariableInput value={caption} onChange={(v) => updateConfig('caption', v)}
          placeholder="{{ $json.caption }} #fyp #viral" multiline />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Privacy</label>
        <div className="flex flex-col gap-1.5">
          {[
            { value: 'PUBLIC_TO_EVERYONE',   label: 'Public' },
            { value: 'MUTUAL_FOLLOW_FRIENDS', label: 'Friends Only' },
            { value: 'SELF_ONLY',             label: 'Private' },
          ].map((p) => (
            <button key={p.value} onClick={() => updateConfig('privacy', p.value)}
              className={`py-1.5 rounded-lg text-[11px] font-bold border transition-all ${privacy === p.value ? 'bg-zinc-100/10 border-zinc-400/40 text-zinc-200' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Cover Frame Time (seconds)</label>
        <input type="number" min={0} step={0.1} value={coverTime} onChange={(e) => updateConfig('coverTime', Number(e.target.value))}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
      </div>

      <div className="flex flex-col gap-2">
        {[
          { key: 'duet',    label: 'Allow Duet',    desc: 'Let others duet this video' },
          { key: 'stitch',  label: 'Allow Stitch',  desc: 'Let others stitch this video' },
          { key: 'comment', label: 'Allow Comments', desc: 'Enable comment section' },
        ].map(({ key, label, desc }) => (
          <div key={key} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
            <div>
              <p className="text-[12px] font-semibold text-zinc-300">{label}</p>
              <p className="text-[10px] text-zinc-600">{desc}</p>
            </div>
            <button onClick={() => updateConfig(key, !config[key])}
              className={`w-10 h-5 rounded-full border transition-all relative ${config[key] ? 'bg-zinc-200 border-zinc-100' : 'bg-zinc-700 border-zinc-600'}`}>
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${config[key] ? 'left-5' : 'left-0.5'}`} style={{ backgroundColor: config[key] ? '#010101' : 'white' }} />
            </button>
          </div>
        ))}
      </div>

      <div>
        <CredentialPicker
          value={config.credentialId || ''}
          onChange={(id) => updateConfig('credentialId', id)}
          accentColor="blue"
          label="TikTok Access Token"
          placeholder="Select access token..."
        />
      </div>

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        Returns: <span className="text-zinc-300">shareId, videoId, shareUrl, publishedAt</span>
      </div>
    </div>
  );
}
