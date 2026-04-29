import SmartVariableInput from '../../../../components/ui/SmartVariableInput';
import imgDiscord from '../../../../assets/discord.png';

export default function DiscordRoleAssignNode({ config = {}, updateConfig }) {
  const mode      = config.mode      ?? 'add'; // add | remove | list | create
  const guildId   = config.guildId   ?? '';
  const userId    = config.userId    ?? '';
  const roleId    = config.roleId    ?? '';
  const roleName  = config.roleName  ?? '';
  const roleColor = config.roleColor ?? '#5865F2';
  const reason    = config.reason    ?? '';
  const botToken  = config.botToken  ?? '';

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-[#5865F2]/20 border border-[#5865F2]/40 flex items-center justify-center overflow-hidden">
          <img src={imgDiscord} alt="Discord" className="w-6 h-6 object-contain" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Discord Role Assign</div>
          <div className="text-[11px] text-zinc-500">Add, remove, list or create roles via Discord Bot API</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Action</label>
        <div className="flex gap-1.5">
          {[
            { value: 'add',    label: 'Add Role' },
            { value: 'remove', label: 'Remove Role' },
            { value: 'list',   label: 'List Roles' },
            { value: 'create', label: 'Create Role' },
          ].map((m) => (
            <button key={m.value} onClick={() => updateConfig('mode', m.value)}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${mode === m.value ? 'bg-[#5865F2]/20 border-[#5865F2]/40 text-[#7289DA]' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Server (Guild) ID</label>
        <SmartVariableInput value={guildId} onChange={(v) => updateConfig('guildId', v)} placeholder="{{ $json.guildId }}" />
      </div>

      {(mode === 'add' || mode === 'remove') && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">User ID</label>
            <SmartVariableInput value={userId} onChange={(v) => updateConfig('userId', v)} placeholder="{{ $json.userId }}" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Role ID</label>
            <SmartVariableInput value={roleId} onChange={(v) => updateConfig('roleId', v)} placeholder="{{ $json.roleId }}" />
          </div>
        </>
      )}

      {mode === 'create' && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Role Name</label>
            <SmartVariableInput value={roleName} onChange={(v) => updateConfig('roleName', v)} placeholder="VIP Member" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Role Color</label>
            <div className="flex gap-2 items-center">
              <input type="color" value={roleColor} onChange={(e) => updateConfig('roleColor', e.target.value)}
                className="w-10 h-9 rounded cursor-pointer border-0" />
              <input value={roleColor} onChange={(e) => updateConfig('roleColor', e.target.value)}
                className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 font-mono focus:outline-none" />
            </div>
          </div>
        </>
      )}

      {(mode === 'add' || mode === 'remove' || mode === 'create') && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Reason (shown in audit log)</label>
          <SmartVariableInput value={reason} onChange={(v) => updateConfig('reason', v)} placeholder="Completed verification" />
        </div>
      )}

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Bot Token</label>
        <input type="password" value={botToken} onChange={(e) => updateConfig('botToken', e.target.value)}
          placeholder="Bot token from Discord Developer Portal"
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
      </div>

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        {mode === 'add'    && <>Returns: <span className="text-zinc-300">success, userId, roleId, guildId</span></>}
        {mode === 'remove' && <>Returns: <span className="text-zinc-300">success, userId, roleId, guildId</span></>}
        {mode === 'list'   && <>Returns: <span className="text-zinc-300">roles[] with id, name, color, memberCount</span></>}
        {mode === 'create' && <>Returns: <span className="text-zinc-300">roleId, name, color, createdAt</span></>}
      </div>
    </div>
  );
}
