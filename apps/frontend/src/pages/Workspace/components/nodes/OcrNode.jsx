import { ScanLine } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';
import CredentialPicker from '../../../../components/ui/CredentialPicker';

const LANGUAGES_OCR = [
  { value: 'eng', label: 'English' },
  { value: 'hin', label: 'Hindi' },
  { value: 'fra', label: 'French' },
  { value: 'deu', label: 'German' },
  { value: 'spa', label: 'Spanish' },
  { value: 'chi_sim', label: 'Chinese (Simplified)' },
  { value: 'chi_tra', label: 'Chinese (Traditional)' },
  { value: 'jpn', label: 'Japanese' },
  { value: 'ara', label: 'Arabic' },
  { value: 'por', label: 'Portuguese' },
  { value: 'rus', label: 'Russian' },
  { value: 'kor', label: 'Korean' },
];

export default function OcrNode({ config = {}, updateConfig, nodeId }) {
  const imageUrl = config.imageUrl ?? '';
  const provider = config.provider ?? 'openai'; // 'openai' | 'google' | 'tesseract'
  const language = config.language ?? 'eng';
  const apiKey = config.apiKey ?? '';
  const mode = config.mode ?? 'text'; // 'text' | 'structured' | 'table'
  const enhanceImage = config.enhanceImage ?? false;

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
          <ScanLine className="w-4 h-4 text-teal-400" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">OCR</div>
          <div className="text-[11px] text-zinc-500">Extract text from images and scanned documents</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Image URL or Base64</label>
        <SmartVariableInput value={imageUrl} onChange={(v) => updateConfig('imageUrl', v)} placeholder="{{ $json.imageUrl }}" nodeId={nodeId} />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Provider</label>
        <div className="flex gap-1.5">
          {[
            { value: 'openai',    label: 'GPT-4o Vision' },
            { value: 'google',    label: 'Google Vision' },
            { value: 'tesseract', label: 'Tesseract (free)' },
          ].map((p) => (
            <button key={p.value} onClick={() => updateConfig('provider', p.value)}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${provider === p.value ? 'bg-teal-500/20 border-teal-500/40 text-teal-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Output Mode</label>
        <div className="flex gap-1.5">
          {[
            { value: 'text',       label: 'Plain Text' },
            { value: 'structured', label: 'Structured JSON' },
            { value: 'table',      label: 'Table Extraction' },
          ].map((m) => (
            <button key={m.value} onClick={() => updateConfig('mode', m.value)}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${mode === m.value ? 'bg-teal-500/20 border-teal-500/40 text-teal-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
              {m.label}
            </button>
          ))}
        </div>
        {mode === 'structured' && <p className="text-[10px] text-zinc-600 mt-1">AI extracts key fields like name, date, amount from forms/invoices</p>}
        {mode === 'table'      && <p className="text-[10px] text-zinc-600 mt-1">Detects tables and returns rows as JSON arrays</p>}
      </div>

      {provider === 'tesseract' && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Language</label>
          <div className="grid grid-cols-3 gap-1.5">
            {LANGUAGES_OCR.map((l) => (
              <button key={l.value} onClick={() => updateConfig('language', l.value)}
                className={`py-1.5 rounded-lg text-[10px] font-bold border transition-all ${language === l.value ? 'bg-teal-500/20 border-teal-500/40 text-teal-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
                {l.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
        <div>
          <p className="text-[12px] font-semibold text-zinc-300">Enhance Image</p>
          <p className="text-[10px] text-zinc-600">Pre-process for better accuracy (grayscale, contrast)</p>
        </div>
        <button onClick={() => updateConfig('enhanceImage', !enhanceImage)}
          className={`w-10 h-5 rounded-full border transition-all relative ${enhanceImage ? 'bg-teal-500 border-teal-400' : 'bg-zinc-700 border-zinc-600'}`}>
          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${enhanceImage ? 'left-5' : 'left-0.5'}`} />
        </button>
      </div>

      {provider !== 'tesseract' && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">API Key</label>
          <CredentialPicker
        value={config.credentialId || ''}
        onChange={(id) => updateConfig('credentialId', id)}
        accentColor="blue"
        label="OpenAI / Google API Key"
        placeholder="Select OpenAI / Google API Key..."
      />
        </div>
      )}

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        {mode === 'text'       && <>Returns: <span className="text-zinc-300">extractedText, confidence, language</span></>}
        {mode === 'structured' && <>Returns: <span className="text-zinc-300">fields object with key-value pairs</span></>}
        {mode === 'table'      && <>Returns: <span className="text-zinc-300">tables array with rows and columns</span></>}
      </div>
    </div>
  );
}
