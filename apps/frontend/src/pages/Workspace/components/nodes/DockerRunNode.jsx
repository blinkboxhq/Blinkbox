import { Box } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';

export default function DockerRunNode({ config = {}, updateConfig, nodeId }) {
  const image = config.image ?? '';
  const command = config.command ?? '';
  const envVars = config.envVars ?? '';
  const volumes = config.volumes ?? '';
  const workdir = config.workdir ?? '';
  const timeout = config.timeout ?? 60;
  const removeOnExit = config.removeOnExit ?? true;
  const captureStdout = config.captureStdout ?? true;
  const captureStderr = config.captureStderr ?? false;
  const dockerHost = config.dockerHost ?? '';

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
          <Box className="w-4 h-4 text-blue-400" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Docker Run</div>
          <div className="text-[11px] text-zinc-500">Spin up a container, run a command and capture output</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Image</label>
        <SmartVariableInput value={image} onChange={(v) => updateConfig('image', v)} placeholder="python:3.12-slim  or  node:20-alpine" nodeId={nodeId} />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Command</label>
        <SmartVariableInput value={command} onChange={(v) => updateConfig('command', v)}
          placeholder='python -c "print({{ $json.value }} * 2)"' multiline nodeId={nodeId} />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Environment Variables</label>
        <textarea value={envVars} onChange={(e) => updateConfig('envVars', e.target.value)} rows={2}
          placeholder={"API_KEY={{ $json.key }}\nDEBUG=false"}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[12px] text-zinc-100 font-mono focus:outline-none focus:border-zinc-500 resize-none" />
        <p className="text-[10px] text-zinc-600 mt-1">One KEY=VALUE per line</p>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Volume Mounts (optional)</label>
        <textarea value={volumes} onChange={(e) => updateConfig('volumes', e.target.value)} rows={2}
          placeholder={"/host/path:/container/path\n/data:/app/data:ro"}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[12px] text-zinc-100 font-mono focus:outline-none focus:border-zinc-500 resize-none" />
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Working Dir</label>
          <input value={workdir} onChange={(e) => updateConfig('workdir', e.target.value)} placeholder="/app"
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 font-mono focus:outline-none focus:border-zinc-500" />
        </div>
        <div className="flex-1">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Timeout (s)</label>
          <input type="number" min={1} max={600} value={timeout} onChange={(e) => updateConfig('timeout', Number(e.target.value))}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {[
          { key: 'captureStdout', label: 'Capture stdout', desc: 'Include stdout in output' },
          { key: 'captureStderr', label: 'Capture stderr', desc: 'Include stderr in output' },
          { key: 'removeOnExit',  label: 'Remove on exit', desc: 'Auto-remove container (--rm)' },
        ].map(({ key, label, desc }) => (
          <div key={key} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
            <div>
              <p className="text-[12px] font-semibold text-zinc-300">{label}</p>
              <p className="text-[10px] text-zinc-600">{desc}</p>
            </div>
            <button onClick={() => updateConfig(key, !config[key])}
              className={`w-10 h-5 rounded-full border transition-all relative ${config[key] ? 'bg-blue-500 border-blue-400' : 'bg-zinc-700 border-zinc-600'}`}>
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${config[key] ? 'left-5' : 'left-0.5'}`} />
            </button>
          </div>
        ))}
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Docker Host (optional)</label>
        <input value={dockerHost} onChange={(e) => updateConfig('dockerHost', e.target.value)} placeholder="unix:///var/run/docker.sock"
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 font-mono focus:outline-none focus:border-zinc-500" />
      </div>

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        Returns: <span className="text-zinc-300">stdout, stderr, exitCode, containerId, duration</span>
      </div>
    </div>
  );
}
