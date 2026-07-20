import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Check, Copy, Infinity as InfinityIcon, Webhook } from 'lucide-react';
import { API_URL } from '@/lib/api';
import { ConfigSection, ConfigLabel, ConfigHeader, ConfigBanner } from '@/components/ui/ConfigKit';

const ACCENT = '#22d3ee';
const OUTPUT_VARS = ['$json.body', '$json.headers', '$json.query', '$json.receivedAt'];

export default function WaitForEventPanel({ nodeId }) {
  const { id: automationId } = useParams();
  const [copied, setCopied] = useState(false);

  const url = `${API_URL}/webhook/wait/${automationId}/${nodeId}`;

  const copy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <ConfigSection className="gap-5">
      <ConfigHeader
        icon={Webhook}
        title="Wait for Webhook"
        subtitle="Parks this branch until the URL below is called"
        iconColor={ACCENT}
      />

      <div className="flex flex-col">
        <ConfigLabel>Resume URL</ConfigLabel>
        <div className="bb-glow-border flex items-center gap-2 bg-[#0f0f0f] border border-[#3b3b3b] rounded-md px-3 py-2.5">
          <span className="flex-1 text-[11px] text-neutral-300 font-mono truncate select-all">{url}</span>
          <button
            type="button"
            onClick={copy}
            className="text-neutral-600 hover:text-neutral-200 transition-colors shrink-0"
            title="Copy URL"
          >
            {copied ? <Check className="w-3.5 h-3.5" style={{ color: ACCENT }} /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
        <span className="text-[9px] text-neutral-600 font-mono mt-1.5 block leading-relaxed">
          Accepts GET or POST. The request body, headers and query land on this node's output.
        </span>
      </div>

      <div className="bb-glow-border flex items-start gap-3 p-3 rounded-md bg-[#0f0f0f] border border-[#2b2b2b]">
        <InfinityIcon className="w-4 h-4 shrink-0 mt-0.5" style={{ color: ACCENT }} />
        <div className="flex-1 min-w-0">
          <span className="text-[11px] font-semibold text-neutral-200 font-mono block">No timeout</span>
          <span className="text-[9px] text-neutral-600 mt-1 block leading-relaxed font-mono">
            The run waits indefinitely — days or months — and picks up exactly where it left off.
          </span>
        </div>
      </div>

      <div className="flex flex-col">
        <ConfigLabel>Available After Resume</ConfigLabel>
        <div className="flex flex-wrap gap-1.5">
          {OUTPUT_VARS.map((v) => (
            <span
              key={v}
              className="text-[9px] font-mono px-2 py-1 rounded border border-[#2b2b2b] bg-[#0f0f0f] text-neutral-400"
            >
              {`{{ ${v} }}`}
            </span>
          ))}
        </div>
      </div>

      <ConfigBanner tone="warn">
        Save and activate the automation before calling this URL — it only releases runs that are already parked here.
      </ConfigBanner>
    </ConfigSection>
  );
}
