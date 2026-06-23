import SmartVariableInput from '../../../../components/ui/SmartVariableInput';
import CredentialPicker from '../../../../components/ui/CredentialPicker';
import OAuthConnectButton from '../../../../components/ui/OAuthConnectButton';

export default function LinkedInPostNode({ config = {}, updateConfig, nodeId }) {
  const type        = config.type        ?? 'text'; // text | image | video | article | document
  const text        = config.text        ?? '';
  const mediaUrl    = config.mediaUrl    ?? '';
  const title       = config.title       ?? '';
  const description = config.description ?? '';
  const linkUrl     = config.linkUrl     ?? '';
  const visibility  = config.visibility  ?? 'PUBLIC'; // PUBLIC | CONNECTIONS
  const postAs      = config.postAs      ?? 'person'; // person | organization
  const orgId       = config.orgId       ?? '';

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-[#0A66C2]/20 border border-[#0A66C2]/40 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#0A66C2]">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
          </svg>
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">LinkedIn Post</div>
          <div className="text-[11px] text-zinc-500">Publish text, image, video or article to LinkedIn</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Post As</label>
        <div className="flex gap-1.5">
          {[{ value: 'person', label: 'Personal Profile' }, { value: 'organization', label: 'Company Page' }].map((p) => (
            <button key={p.value} onClick={() => updateConfig('postAs', p.value)}
              className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${postAs === p.value ? 'bg-[#0A66C2]/20 border-[#0A66C2]/40 text-blue-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
              {p.label}
            </button>
          ))}
        </div>
        {postAs === 'organization' && (
          <input value={orgId} onChange={(e) => updateConfig('orgId', e.target.value)} placeholder="Organization URN or ID"
            className="w-full mt-2 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 font-mono focus:outline-none focus:border-zinc-500" />
        )}
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Content Type</label>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { value: 'text',     label: 'Text' },
            { value: 'image',    label: 'Image' },
            { value: 'video',    label: 'Video' },
            { value: 'article',  label: 'Article Link' },
            { value: 'document', label: 'Document (PDF)' },
            { value: 'poll',     label: 'Poll' },
          ].map((t) => (
            <button key={t.value} onClick={() => updateConfig('type', t.value)}
              className={`py-1.5 rounded-lg text-[10px] font-bold border transition-all ${type === t.value ? 'bg-[#0A66C2]/20 border-[#0A66C2]/40 text-blue-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Post Text</label>
        <SmartVariableInput value={text} onChange={(v) => updateConfig('text', v)}
          placeholder="Excited to share... {{ $json.content }}" multiline />
      </div>

      {(type === 'image' || type === 'video' || type === 'document') && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">{type === 'image' ? 'Image' : type === 'video' ? 'Video' : 'PDF'} URL</label>
          <SmartVariableInput value={mediaUrl} onChange={(v) => updateConfig('mediaUrl', v)} placeholder="{{ $json.mediaUrl }}" />
        </div>
      )}

      {(type === 'article' || type === 'image' || type === 'video') && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Title (optional)</label>
          <SmartVariableInput value={title} onChange={(v) => updateConfig('title', v)} placeholder="{{ $json.title }}" />
        </div>
      )}

      {type === 'article' && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Article URL</label>
          <SmartVariableInput value={linkUrl} onChange={(v) => updateConfig('linkUrl', v)} placeholder="{{ $json.url }}" />
        </div>
      )}

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Visibility</label>
        <div className="flex gap-1.5">
          {[{ value: 'PUBLIC', label: 'Public' }, { value: 'CONNECTIONS', label: 'Connections Only' }].map((v) => (
            <button key={v.value} onClick={() => updateConfig('visibility', v.value)}
              className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${visibility === v.value ? 'bg-[#0A66C2]/20 border-[#0A66C2]/40 text-blue-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <OAuthConnectButton provider="linkedin" />
        <CredentialPicker
          value={config.credentialId || ''}
          onChange={(id) => updateConfig('credentialId', id)}
          accentColor="blue"
          label="LinkedIn OAuth Token"
          placeholder="Select OAuth token..."
        />
      </div>

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        Returns: <span className="text-zinc-300">postId, postUrl, visibility, publishedAt</span>
      </div>
    </div>
  );
}
