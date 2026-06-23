import { Fingerprint } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';

const ALGORITHMS = [
  { value: 'md5',       label: 'MD5',       bits: 128,  warning: 'Not cryptographically secure' },
  { value: 'sha1',      label: 'SHA-1',     bits: 160,  warning: 'Deprecated for security use' },
  { value: 'sha256',    label: 'SHA-256',   bits: 256,  warning: null },
  { value: 'sha384',    label: 'SHA-384',   bits: 384,  warning: null },
  { value: 'sha512',    label: 'SHA-512',   bits: 512,  warning: null },
  { value: 'sha3_256',  label: 'SHA3-256',  bits: 256,  warning: null },
  { value: 'sha3_512',  label: 'SHA3-512',  bits: 512,  warning: null },
  { value: 'blake2b',   label: 'BLAKE2b',   bits: 512,  warning: null },
  { value: 'xxhash',    label: 'xxHash64',  bits: 64,   warning: 'Non-cryptographic, very fast' },
  { value: 'crc32',     label: 'CRC32',     bits: 32,   warning: 'Checksum only, not secure' },
  { value: 'hmac_sha256',label: 'HMAC-SHA256', bits: 256, warning: null },
  { value: 'bcrypt',    label: 'bcrypt',    bits: null, warning: 'Password hashing — slow by design' },
  { value: 'argon2',    label: 'Argon2id',  bits: null, warning: 'Recommended for passwords' },
];

export default function HashNode({ config = {}, updateConfig, nodeId }) {
  const input       = config.input       ?? '';
  const algorithm   = config.algorithm   ?? 'sha256';
  const encoding    = config.encoding    ?? 'hex'; // hex | base64 | base64url
  const secret      = config.secret      ?? '';
  const outputField = config.outputField ?? 'hash';
  const saltRounds  = config.saltRounds  ?? 12;
  const verify      = config.verify      ?? false;
  const hashToVerify= config.hashToVerify?? '';

  const algo = ALGORITHMS.find((a) => a.value === algorithm);
  const needsSecret = algorithm === 'hmac_sha256';
  const isPassword  = algorithm === 'bcrypt' || algorithm === 'argon2';

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
          <Fingerprint className="w-4 h-4 text-rose-400" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Hash</div>
          <div className="text-[11px] text-zinc-500">MD5, SHA-256, HMAC, bcrypt, Argon2 and more</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Input</label>
        <SmartVariableInput value={input} onChange={(v) => updateConfig('input', v)}
          placeholder='{{ $json.password }}  or  "hello world"' multiline />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Algorithm</label>
        <div className="grid grid-cols-3 gap-1">
          {ALGORITHMS.map((a) => (
            <button key={a.value} onClick={() => updateConfig('algorithm', a.value)}
              className={`py-1.5 px-1 rounded-lg border transition-all ${algorithm === a.value ? 'bg-rose-500/20 border-rose-500/40 text-rose-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
              <span className="text-[10px] font-bold block">{a.label}</span>
              {a.bits && <span className="text-[8px] text-zinc-600">{a.bits}-bit</span>}
            </button>
          ))}
        </div>
        {algo?.warning && (
          <div className="mt-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-400">
            ⚠ {algo.warning}
          </div>
        )}
      </div>

      {needsSecret && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">HMAC Secret Key</label>
          <input type="password" value={secret} onChange={(e) => updateConfig('secret', e.target.value)} placeholder="Secret key"
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
        </div>
      )}

      {isPassword && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">
            {algorithm === 'bcrypt' ? 'Salt Rounds' : 'Memory Cost (KB)'}
          </label>
          <input type="number" min={4} max={20} value={saltRounds} onChange={(e) => updateConfig('saltRounds', Number(e.target.value))}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
        </div>
      )}

      {!isPassword && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Output Encoding</label>
          <div className="flex gap-1.5">
            {['hex','base64','base64url'].map((e) => (
              <button key={e} onClick={() => updateConfig('encoding', e)}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold font-mono border transition-all ${encoding === e ? 'bg-rose-500/20 border-rose-500/40 text-rose-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
                {e}
              </button>
            ))}
          </div>
        </div>
      )}

      {isPassword && (
        <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
          <div>
            <p className="text-[12px] font-semibold text-zinc-300">Verify Mode</p>
            <p className="text-[10px] text-zinc-600">Compare input against existing hash</p>
          </div>
          <button onClick={() => updateConfig('verify', !verify)}
            className={`w-10 h-5 rounded-full border transition-all relative ${verify ? 'bg-rose-500 border-rose-400' : 'bg-zinc-700 border-zinc-600'}`}>
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${verify ? 'left-5' : 'left-0.5'}`} />
          </button>
        </div>
      )}

      {verify && isPassword && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Hash to Verify Against</label>
          <SmartVariableInput value={hashToVerify} onChange={(v) => updateConfig('hashToVerify', v)} placeholder="{{ $json.storedHash }}" />
        </div>
      )}

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Output Field</label>
        <input value={outputField} onChange={(e) => updateConfig('outputField', e.target.value)} placeholder="hash"
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 font-mono focus:outline-none focus:border-zinc-500" />
      </div>

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        {verify ? <>Returns: <span className="text-zinc-300">match (bool), algorithm</span></> :
          isPassword ? <>Returns: <span className="text-zinc-300">{outputField} (hash string), algorithm, saltRounds</span></> :
          <>Returns: <span className="text-zinc-300">{outputField} ({encoding}), algorithm, length</span></>
        }
      </div>
    </div>
  );
}
