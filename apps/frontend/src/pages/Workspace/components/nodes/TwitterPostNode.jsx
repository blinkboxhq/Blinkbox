import SmartVariableInput from '../../../../components/ui/SmartVariableInput';

export default function TwitterPostNode({ config = {}, updateConfig }) {
  const mode        = config.mode        ?? 'tweet'; // tweet | thread | reply | quote
  const text        = config.text        ?? '';
  const thread      = config.thread      ?? '';
  const mediaUrls   = config.mediaUrls   ?? '';
  const replyToId   = config.replyToId   ?? '';
  const quoteId     = config.quoteId     ?? '';
  const sensitive   = config.sensitive   ?? false;
  const replySettings = config.replySettings ?? 'everyone'; // everyone | following | mentionedUsers
  const apiKey      = config.apiKey      ?? '';
  const apiSecret   = config.apiSecret   ?? '';
  const accessToken = config.accessToken ?? '';
  const accessSecret= config.accessSecret?? '';

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.763l7.738-8.835L1.254 2.25H8.08l4.259 5.63 5.905-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Twitter / X Post</div>
          <div className="text-[11px] text-zinc-500">Post tweets, threads, replies and quotes via API v2</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Mode</label>
        <div className="flex gap-1.5">
          {[
            { value: 'tweet',  label: 'Tweet' },
            { value: 'thread', label: 'Thread' },
            { value: 'reply',  label: 'Reply' },
            { value: 'quote',  label: 'Quote' },
          ].map((m) => (
            <button key={m.value} onClick={() => updateConfig('mode', m.value)}
              className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${mode === m.value ? 'bg-zinc-200/15 border-zinc-400/40 text-zinc-200' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {mode === 'thread' ? (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Thread (one tweet per line, — separates tweets)</label>
          <textarea value={thread} onChange={(e) => updateConfig('thread', e.target.value)} rows={8}
            placeholder={"First tweet text here...\n—\nSecond tweet continues the thread...\n—\nFinal thought. ✅"}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[12px] text-zinc-100 focus:outline-none focus:border-zinc-500 resize-none" />
          <p className="text-[10px] text-zinc-600 mt-1">Use — on its own line to separate tweets</p>
        </div>
      ) : (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Tweet Text (max 280 chars)</label>
          <SmartVariableInput value={text} onChange={(v) => updateConfig('text', v)}
            placeholder="{{ $json.tweet }}" multiline />
        </div>
      )}

      {(mode === 'reply' || mode === 'quote') && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">
            {mode === 'reply' ? 'Reply to Tweet ID' : 'Quote Tweet ID'}
          </label>
          <SmartVariableInput
            value={mode === 'reply' ? replyToId : quoteId}
            onChange={(v) => updateConfig(mode === 'reply' ? 'replyToId' : 'quoteId', v)}
            placeholder="{{ $json.tweetId }}" />
        </div>
      )}

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Media URLs (optional, one per line)</label>
        <textarea value={mediaUrls} onChange={(e) => updateConfig('mediaUrls', e.target.value)} rows={2}
          placeholder="https://cdn.example.com/image.jpg"
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[12px] text-zinc-100 font-mono focus:outline-none focus:border-zinc-500 resize-none" />
        <p className="text-[10px] text-zinc-600 mt-1">Up to 4 images, or 1 GIF / video</p>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Who Can Reply</label>
        <div className="flex gap-1.5">
          {[
            { value: 'everyone',       label: 'Everyone' },
            { value: 'following',      label: 'Following' },
            { value: 'mentionedUsers', label: 'Mentioned' },
          ].map((r) => (
            <button key={r.value} onClick={() => updateConfig('replySettings', r.value)}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${replySettings === r.value ? 'bg-zinc-200/15 border-zinc-400/40 text-zinc-200' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
        <div>
          <p className="text-[12px] font-semibold text-zinc-300">Mark Sensitive</p>
          <p className="text-[10px] text-zinc-600">Flag media as sensitive content</p>
        </div>
        <button onClick={() => updateConfig('sensitive', !sensitive)}
          className={`w-10 h-5 rounded-full border transition-all relative ${sensitive ? 'bg-zinc-400 border-zinc-300' : 'bg-zinc-700 border-zinc-600'}`}>
          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${sensitive ? 'left-5' : 'left-0.5'}`} />
        </button>
      </div>

      <div className="border-t border-zinc-800 pt-3">
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2 block">API v2 Credentials</label>
        <div className="flex flex-col gap-2">
          {[
            { key: 'apiKey',       label: 'API Key',           ph: 'Consumer Key' },
            { key: 'apiSecret',    label: 'API Secret',        ph: 'Consumer Secret' },
            { key: 'accessToken',  label: 'Access Token',      ph: 'OAuth Access Token' },
            { key: 'accessSecret', label: 'Access Token Secret', ph: 'OAuth Access Secret' },
          ].map(({ key, label, ph }) => (
            <div key={key}>
              <label className="text-[10px] text-zinc-600 mb-1 block">{label}</label>
              <input type="password" value={config[key] ?? ''} onChange={(e) => updateConfig(key, e.target.value)}
                placeholder={ph}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
            </div>
          ))}
        </div>
      </div>

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        Returns: <span className="text-zinc-300">tweetId, tweetUrl, text, createdAt{mode === 'thread' ? ', tweets[]' : ''}</span>
      </div>
    </div>
  );
}
