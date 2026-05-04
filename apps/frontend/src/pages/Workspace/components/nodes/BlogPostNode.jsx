import { Newspaper } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';

export default function BlogPostNode({ config = {}, updateConfig, nodeId }) {
  const platform    = config.platform    ?? 'ghost'; // ghost | wordpress
  const mode        = config.mode        ?? 'publish'; // publish | draft | update
  const title       = config.title       ?? '';
  const content     = config.content     ?? '';
  const excerpt     = config.excerpt     ?? '';
  const tags        = config.tags        ?? '';
  const featureImage= config.featureImage?? '';
  const slug        = config.slug        ?? '';
  const postId      = config.postId      ?? '';
  const apiUrl      = config.apiUrl      ?? '';
  const apiKey      = config.apiKey      ?? '';
  const featured    = config.featured    ?? false;
  const publishedAt = config.publishedAt ?? '';

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-zinc-500/10 border border-zinc-500/20 flex items-center justify-center">
          <Newspaper className="w-4 h-4 text-zinc-300" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Blog Post</div>
          <div className="text-[11px] text-zinc-500">Publish or draft posts to Ghost or WordPress</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Platform</label>
        <div className="flex gap-1.5">
          {[{ value: 'ghost', label: 'Ghost' }, { value: 'wordpress', label: 'WordPress' }].map((p) => (
            <button key={p.value} onClick={() => updateConfig('platform', p.value)}
              className={`flex-1 py-2 rounded-lg text-[12px] font-bold border transition-all ${platform === p.value ? 'bg-zinc-300/10 border-zinc-400/40 text-zinc-200' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Action</label>
        <div className="flex gap-1.5">
          {[
            { value: 'publish', label: 'Publish' },
            { value: 'draft',   label: 'Save as Draft' },
            { value: 'update',  label: 'Update Post' },
          ].map((m) => (
            <button key={m.value} onClick={() => updateConfig('mode', m.value)}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${mode === m.value ? 'bg-zinc-300/10 border-zinc-400/40 text-zinc-200' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {mode === 'update' && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Post ID</label>
          <SmartVariableInput value={postId} onChange={(v) => updateConfig('postId', v)} placeholder="{{ $json.postId }}" />
        </div>
      )}

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Title</label>
        <SmartVariableInput value={title} onChange={(v) => updateConfig('title', v)} placeholder="{{ $json.title }}" />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Content (HTML or Markdown)</label>
        <SmartVariableInput value={content} onChange={(v) => updateConfig('content', v)} placeholder="{{ $json.body }}" multiline />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Excerpt / Meta Description</label>
        <SmartVariableInput value={excerpt} onChange={(v) => updateConfig('excerpt', v)} placeholder="{{ $json.summary }}" multiline />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Tags (comma-separated)</label>
        <SmartVariableInput value={tags} onChange={(v) => updateConfig('tags', v)} placeholder="tech, ai, tutorial" />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Feature Image URL</label>
        <SmartVariableInput value={featureImage} onChange={(v) => updateConfig('featureImage', v)} placeholder="{{ $json.imageUrl }}" />
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Slug (optional)</label>
          <SmartVariableInput value={slug} onChange={(v) => updateConfig('slug', v)} placeholder="my-post-url" />
        </div>
        <div className="flex-1">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Publish At (optional)</label>
          <input type="datetime-local" value={publishedAt} onChange={(e) => updateConfig('publishedAt', e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[12px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
        </div>
      </div>

      <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
        <div>
          <p className="text-[12px] font-semibold text-zinc-300">Featured Post</p>
          <p className="text-[10px] text-zinc-600">Pin to featured section</p>
        </div>
        <button onClick={() => updateConfig('featured', !featured)}
          className={`w-10 h-5 rounded-full border transition-all relative ${featured ? 'bg-zinc-400 border-zinc-300' : 'bg-zinc-700 border-zinc-600'}`}>
          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${featured ? 'left-5' : 'left-0.5'}`} />
        </button>
      </div>

      <div className="border-t border-zinc-800 pt-3">
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2 block">
          {platform === 'ghost' ? 'Ghost API Settings' : 'WordPress REST API Settings'}
        </label>
        <div className="flex flex-col gap-2">
          <input value={apiUrl} onChange={(e) => updateConfig('apiUrl', e.target.value)}
            placeholder={platform === 'ghost' ? 'https://myblog.ghost.io' : 'https://myblog.com/wp-json'}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 font-mono focus:outline-none focus:border-zinc-500" />
          <input type="password" value={apiKey} onChange={(e) => updateConfig('apiKey', e.target.value)}
            placeholder={platform === 'ghost' ? 'Admin API key (ID:Secret)' : 'Application Password or JWT token'}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
        </div>
      </div>

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        Returns: <span className="text-zinc-300">postId, url, slug, status, publishedAt</span>
      </div>
    </div>
  );
}
