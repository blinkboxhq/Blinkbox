import { Rss } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';

export default function RssFeedGeneratorNode({ config = {}, updateConfig }) {
  const mode        = config.mode        ?? 'add_item'; // add_item | generate | read
  const feedTitle   = config.feedTitle   ?? '';
  const feedDesc    = config.feedDesc    ?? '';
  const feedUrl     = config.feedUrl     ?? '';
  const itemTitle   = config.itemTitle   ?? '';
  const itemDesc    = config.itemDesc    ?? '';
  const itemUrl     = config.itemUrl     ?? '';
  const itemDate    = config.itemDate    ?? '';
  const itemAuthor  = config.itemAuthor  ?? '';
  const itemImage   = config.itemImage   ?? '';
  const storageKey  = config.storageKey  ?? 'my_rss_feed';
  const maxItems    = config.maxItems    ?? 50;

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
          <Rss className="w-4 h-4 text-orange-400" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">RSS Feed Generator</div>
          <div className="text-[11px] text-zinc-500">Create and manage your own RSS / Atom feed</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Action</label>
        <div className="flex gap-1.5">
          {[
            { value: 'add_item',  label: 'Add Item' },
            { value: 'generate',  label: 'Generate XML' },
            { value: 'read',      label: 'Read Feed' },
          ].map((m) => (
            <button key={m.value} onClick={() => updateConfig('mode', m.value)}
              className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${mode === m.value ? 'bg-orange-500/20 border-orange-500/40 text-orange-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Feed ID (storage key)</label>
        <input value={storageKey} onChange={(e) => updateConfig('storageKey', e.target.value)} placeholder="my_blog_feed"
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 font-mono focus:outline-none focus:border-zinc-500" />
      </div>

      {(mode === 'add_item' || mode === 'generate') && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Feed Title</label>
            <SmartVariableInput value={feedTitle} onChange={(v) => updateConfig('feedTitle', v)} placeholder="My Awesome Blog" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Feed Description</label>
            <SmartVariableInput value={feedDesc} onChange={(v) => updateConfig('feedDesc', v)} placeholder="Latest articles from my blog" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Feed Website URL</label>
            <SmartVariableInput value={feedUrl} onChange={(v) => updateConfig('feedUrl', v)} placeholder="https://myblog.com" />
          </div>
        </>
      )}

      {mode === 'add_item' && (
        <>
          <div className="border-t border-zinc-800 pt-3">
            <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2 block">Item Fields</label>
          </div>
          {[
            { key: 'itemTitle',  label: 'Title',   ph: '{{ $json.title }}' },
            { key: 'itemUrl',    label: 'URL',     ph: '{{ $json.url }}' },
            { key: 'itemAuthor', label: 'Author',  ph: '{{ $json.author }}' },
            { key: 'itemDate',   label: 'Date',    ph: '{{ $json.publishedAt }}' },
          ].map(({ key, label, ph }) => (
            <div key={key}>
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">{label}</label>
              <SmartVariableInput value={config[key] ?? ''} onChange={(v) => updateConfig(key, v)} placeholder={ph} />
            </div>
          ))}
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Description / Summary</label>
            <SmartVariableInput value={itemDesc} onChange={(v) => updateConfig('itemDesc', v)} placeholder="{{ $json.excerpt }}" multiline />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Image URL (optional)</label>
            <SmartVariableInput value={itemImage} onChange={(v) => updateConfig('itemImage', v)} placeholder="{{ $json.thumbnailUrl }}" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Max Items to Keep</label>
            <input type="number" min={5} max={500} value={maxItems} onChange={(e) => updateConfig('maxItems', Number(e.target.value))}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
          </div>
        </>
      )}

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        {mode === 'add_item' && <>Returns: <span className="text-zinc-300">feedId, itemCount, latestItem</span></>}
        {mode === 'generate' && <>Returns: <span className="text-zinc-300">xml (RSS 2.0 string), feedUrl, itemCount</span></>}
        {mode === 'read'     && <>Returns: <span className="text-zinc-300">items array, feedTitle, lastUpdated</span></>}
      </div>
    </div>
  );
}
