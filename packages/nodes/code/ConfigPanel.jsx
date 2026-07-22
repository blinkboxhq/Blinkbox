import { Terminal } from "lucide-react";
import {
  ConfigSection, ConfigHeader, ConfigBadge, ConfigLabel, ConfigInput, ConfigBanner,
} from "@/components/ui/ConfigKit";

const VIOLET = "#a78bfa";

const JS_PLACEHOLDER = `// Access previous node data via the \`input\` object
const active = input.items.filter(i => i.active);

// Return the result for the next node
return { result: active };`;

export default function CodeNode({ config = {}, updateConfig }) {
  const code    = config.code || "";
  const timeout = config.timeout !== undefined ? config.timeout : 1;

  return (
    <ConfigSection>
      <ConfigHeader
        icon={Terminal}
        iconColor={VIOLET}
        title="Run Code"
        subtitle="Execute sandboxed JavaScript — no filesystem or network access"
        badge={<ConfigBadge label="JS" tone="code" />}
      />

      <div className="flex flex-col">
        <ConfigLabel>JavaScript</ConfigLabel>
        <textarea
          value={code}
          onChange={(e) => updateConfig("code", e.target.value)}
          placeholder={JS_PLACEHOLDER}
          spellCheck={false}
          className="bb-glow-border w-full min-h-[220px] bg-[#0f0f0f] border border-[#3b3b3b] rounded-md px-3 py-2.5 text-[12.5px] font-mono text-neutral-100 outline-none resize-y leading-relaxed placeholder-neutral-600 transition-colors focus:border-violet-500/50"
        />
      </div>

      <ConfigBanner>
        Read upstream data from the <span className="text-violet-300 mx-1">input</span> object — e.g. <span className="text-neutral-300 ml-1">input.email</span>
      </ConfigBanner>

      <ConfigBanner>
        Pass data on with <span className="text-violet-300 ml-1">return {"{ result: value }"}</span>
      </ConfigBanner>

      <ConfigInput
        label="Timeout"
        type="number"
        value={timeout}
        onChange={(v) => updateConfig("timeout", Math.min(5, Math.max(1, parseInt(v, 10) || 1)))}
        hint="Seconds — max 5"
      />
    </ConfigSection>
  );
}
