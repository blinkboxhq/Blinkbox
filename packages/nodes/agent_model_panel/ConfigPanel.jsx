import { Brain, Thermometer, Hash, Radio } from "lucide-react";
import CredentialPicker from "@/components/ui/CredentialPicker";
import ModelSelect from "@/components/ui/ModelSelect";
import {
  ConfigSection,
  ConfigHeader,
  ConfigLabel,
  ConfigInput,
  ConfigToggleRow,
  ConfigBanner,
} from "@/components/ui/ConfigKit";

export default function makeAgentModelPanel({
  label,
  provider,
  credentialType,
  models = [],
  color = "#737373",
  logoUrl,
  imgFilter,
}) {
  const fallback = models.map((m) => (typeof m === "string" ? m : m.value));

  return function AgentModelPanel({ config = {}, updateConfig }) {
    const temperature = config.temperature ?? 0.7;

    return (
      <ConfigSection>
        <ConfigHeader
          icon={Brain}
          logoUrl={logoUrl}
          imgFilter={imgFilter}
          iconColor={color}
          title={label}
          subtitle="Chat model powering the AI Agent"
        />

        {credentialType && (
          <CredentialPicker
            value={config.credentialId || ""}
            onChange={(id) => updateConfig("credentialId", id)}
            credentialType={credentialType}
            label={`${label} API Key`}
            placeholder={`Select ${label} credential…`}
          />
        )}

        <ModelSelect
          provider={provider}
          credentialId={config.credentialId}
          value={config.model}
          fallback={fallback[0]}
          models={models}
          accentColor={color}
          onChange={(m) => updateConfig("model", m)}
        />

        <div className="flex flex-col">
          <ConfigLabel
            icon={Thermometer}
            action={<span className="text-[9px] font-mono text-neutral-400 tabular-nums">{temperature.toFixed(1)}</span>}
          >
            Temperature
          </ConfigLabel>
          <input
            type="range"
            min={0}
            max={2}
            step={0.1}
            value={temperature}
            onChange={(e) => updateConfig("temperature", parseFloat(e.target.value))}
            className="w-full h-1 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, ${color} 0%, ${color} ${(temperature / 2) * 100}%, #3b3b3b ${(temperature / 2) * 100}%, #3b3b3b 100%)`,
            }}
          />
          <div className="flex justify-between mt-1.5">
            <span className="text-[9px] font-mono text-neutral-600 tracking-wide">PRECISE</span>
            <span className="text-[9px] font-mono text-neutral-600 tracking-wide">CREATIVE</span>
          </div>
        </div>

        <ConfigInput
          label="Max Tokens"
          icon={Hash}
          type="number"
          value={config.maxTokens ?? 2048}
          onChange={(v) => updateConfig("maxTokens", parseInt(v, 10) || 0)}
          placeholder="2048"
        />

        <ConfigToggleRow
          label="Streaming"
          desc="Stream tokens as they are generated"
          icon={Radio}
          on={config.streaming !== false}
          onChange={(v) => updateConfig("streaming", v)}
          accentColor={color}
        />

        <ConfigBanner>
          The agent's instructions live on the AI Agent node — this panel only picks the model.
        </ConfigBanner>
      </ConfigSection>
    );
  };
}
