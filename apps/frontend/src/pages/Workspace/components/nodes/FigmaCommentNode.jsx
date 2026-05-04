import SmartVariableInput from '../../../../components/ui/SmartVariableInput';
import imgFigma from '../../../../assets/figma.svg';
import CredentialPicker from '../../../../components/ui/CredentialPicker';

export default function FigmaCommentNode({ config = {}, updateConfig }) {
  const fileKey    = config.fileKey    ?? '';
  const message    = config.message    ?? '';
  const nodeId     = config.nodeId     ?? '';
  const x          = config.x          ?? '';
  const y          = config.y          ?? '';
  const mode       = config.mode       ?? 'post'; // post | reply | list | resolve
  const commentId  = config.commentId  ?? '';
  const apiToken   = config.apiToken   ?? '';

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-[#F24E1E]/10 border border-[#F24E1E]/20 flex items-center justify-center">
          <img src={imgFigma} alt="Figma" className="w-5 h-5 object-contain" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Figma Comment</div>
          <div className="text-[11px] text-zinc-500">Post, reply, list or resolve Figma file comments</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Action</label>
        <div className="flex gap-1.5">
          {[
            { value: 'post',    label: 'Post' },
            { value: 'reply',   label: 'Reply' },
            { value: 'list',    label: 'List' },
            { value: 'resolve', label: 'Resolve' },
          ].map((m) => (
            <button key={m.value} onClick={() => updateConfig('mode', m.value)}
              className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${mode === m.value ? 'bg-[#F24E1E]/20 border-[#F24E1E]/40 text-orange-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">File Key</label>
        <SmartVariableInput value={fileKey} onChange={(v) => updateConfig('fileKey', v)}
          placeholder='hch8YlkgaUIZ9raDzjjDka  (from figma.com/file/{KEY}/...)' />
      </div>

      {(mode === 'reply' || mode === 'resolve') && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Comment ID</label>
          <SmartVariableInput value={commentId} onChange={(v) => updateConfig('commentId', v)} placeholder="{{ $json.commentId }}" />
        </div>
      )}

      {(mode === 'post' || mode === 'reply') && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Message</label>
          <SmartVariableInput value={message} onChange={(v) => updateConfig('message', v)}
            placeholder="Looks great! Please adjust the padding here. {{ $json.note }}" multiline />
        </div>
      )}

      {mode === 'post' && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Node ID (optional — pin to element)</label>
            <SmartVariableInput value={nodeId} onChange={(v) => updateConfig('nodeId', v)} placeholder="0:1  or  {{ $json.nodeId }}" />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">X (canvas position)</label>
              <SmartVariableInput value={x} onChange={(v) => updateConfig('x', v)} placeholder="120" />
            </div>
            <div className="flex-1">
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Y (canvas position)</label>
              <SmartVariableInput value={y} onChange={(v) => updateConfig('y', v)} placeholder="340" />
            </div>
          </div>
        </>
      )}

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Personal Access Token</label>
        <input type="password" value={apiToken} onChange={(e) => updateConfig('apiToken', e.target.value)}
          placeholder="Figma Settings → Personal access tokens"
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
      </div>

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        {mode === 'post'    && <>Returns: <span className="text-zinc-300">commentId, createdAt, fileKey, message</span></>}
        {mode === 'reply'   && <>Returns: <span className="text-zinc-300">commentId, parentId, message, createdAt</span></>}
        {mode === 'list'    && <>Returns: <span className="text-zinc-300">comments array with id, message, author, resolved</span></>}
        {mode === 'resolve' && <>Returns: <span className="text-zinc-300">commentId, resolved: true</span></>}
      </div>
    </div>
  );
}
