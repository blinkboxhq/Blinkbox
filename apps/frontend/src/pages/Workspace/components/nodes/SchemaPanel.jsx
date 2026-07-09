import { useState } from "react";
import { ChevronDown } from "lucide-react";
import SmartVariableInput from "../../../../components/ui/SmartVariableInput";
import CredentialPicker from "../../../../components/ui/CredentialPicker";
import { ConfigSection, ConfigLabel, ConfigSelect, ConfigPills, ConfigHeader, ConfigToggle, ConfigBanner } from "../../../../components/ui/ConfigKit";

// Renders a declarative action schema (configSchemas.js) in the bordered-mono
// signature style — same house look as MonoSchemaPanel (triggers). One renderer,
// every schema-driven action node. Keeps action-only features: operation picker,
// root credential + lock gate, advanced disclosure, output banner. Dynamic text
// fields use SmartVariableInput so {{ $json.x }} variables keep working.

const ACCENT_HEX = {
  violet: '#8b7cf6', blue: '#6f97e8', green: '#34d399', emerald: '#34d399',
  red: '#f87171', rose: '#fb7185', orange: '#fb923c', amber: '#fbbf24',
  sky: '#38bdf8', indigo: '#818cf8', pink: '#f472b6', purple: '#c084fc',
};

function isVisible(field, config, schema) {
  if (!field.showWhen) return true;
  const opKey = schema.operationKey || "operation";
  return Object.entries(field.showWhen).every(([key, allowed]) => {
    const current = config[key] ?? (key === opKey ? schema.defaultOperation : undefined);
    const values = Array.isArray(allowed) ? allowed : [allowed];
    return values.includes(current);
  });
}

function Field({ field, config, updateConfig, nodeId, accent }) {
  const value = config[field.key] ?? field.default ?? "";

  if (field.type === "toggle") {
    const on = Boolean(config[field.key] ?? field.default ?? false);
    return (
      <div className="bb-glow-border flex items-start gap-3 p-3 rounded-md bg-[#0f0f0f] border border-[#2b2b2b]">
        <div className="flex-1 min-w-0">
          <span className="text-[11px] font-semibold text-neutral-200 font-mono block">{field.label}</span>
          {field.hint && <span className="text-[9px] text-neutral-600 mt-1 block leading-relaxed font-mono">{field.hint}</span>}
        </div>
        <ConfigToggle on={on} onClick={() => updateConfig(field.key, !on)} accentColor={accent} />
      </div>
    );
  }

  if (field.type === "select") {
    const options = field.options || [];
    if (options.length <= 5) {
      return (
        <div className="flex flex-col">
          <ConfigLabel>{field.label}{field.required && <span style={{ color: accent }} className="ml-0.5">*</span>}</ConfigLabel>
          <ConfigPills value={value} onChange={(val) => updateConfig(field.key, val)} options={options} accentColor={accent} />
          {field.hint && <p className="text-[9px] text-neutral-600 mt-1.5 font-mono tracking-wide leading-relaxed">{field.hint}</p>}
        </div>
      );
    }
    return (
      <div className="flex flex-col">
        <ConfigLabel>{field.label}{field.required && <span style={{ color: accent }} className="ml-0.5">*</span>}</ConfigLabel>
        <ConfigSelect value={value} onChange={(val) => updateConfig(field.key, val)} options={options} accentColor={accent} />
        {field.hint && <p className="text-[9px] text-neutral-600 mt-1.5 font-mono tracking-wide leading-relaxed">{field.hint}</p>}
      </div>
    );
  }

  if (field.type === "number") {
    return (
      <div className="flex flex-col">
        <ConfigLabel>{field.label}{field.required && <span style={{ color: accent }} className="ml-0.5">*</span>}</ConfigLabel>
        <input
          type="number"
          value={value}
          onChange={(e) => updateConfig(field.key, e.target.value)}
          placeholder={field.placeholder || ""}
          className="bb-glow-border w-full bg-[#0f0f0f] border border-[#3b3b3b] rounded-md px-3 py-2.5 text-[12.5px] text-neutral-100 font-mono outline-none transition-colors focus:border-[#545454] placeholder-neutral-600"
        />
        {field.hint && <p className="text-[9px] text-neutral-600 mt-1.5 font-mono tracking-wide leading-relaxed">{field.hint}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <ConfigLabel>{field.label}{field.required && <span style={{ color: accent }} className="ml-0.5">*</span>}</ConfigLabel>
      <SmartVariableInput
        value={config[field.key] ?? field.default ?? ""}
        onChange={(val) => updateConfig(field.key, val)}
        placeholder={field.placeholder || ""}
        nodeId={nodeId}
        multiline={field.type === "textarea"}
      />
      {field.hint && <p className="text-[9px] text-neutral-600 mt-1.5 font-mono tracking-wide leading-relaxed">{field.hint}</p>}
    </div>
  );
}

export default function SchemaPanel({ schema, def, config, updateConfig, nodeId }) {
  const accent = ACCENT_HEX[schema.accent] || ACCENT_HEX.violet;
  const opKey = schema.operationKey || "operation";
  const operation = config[opKey] || schema.defaultOperation;
  const locked = Boolean(schema.credential) && !config.credentialId;
  const [showAdvanced, setShowAdvanced] = useState(false);

  const visibleFields = (schema.fields || []).filter((f) => isVisible(f, config, schema));
  const mainFields = visibleFields.filter((f) => !f.advanced);
  const advFields = visibleFields.filter((f) => f.advanced);
  const Icon = def?.icon;

  return (
    <ConfigSection className="gap-5">
      <ConfigHeader
        icon={Icon} logoUrl={def?.logoUrl} imgFilter={def?.imgFilter}
        title={def?.label || "Configure"} subtitle={schema.subtitle}
      />

      {schema.credential && (
        <CredentialPicker
          value={config.credentialId || ""}
          onChange={(id) => updateConfig("credentialId", id)}
          accentColor={schema.accent}
          label={schema.credential.label}
          placeholder={schema.credential.placeholder}
          credentialType={schema.credential.credentialType}
          oauthProvider={schema.credential.oauthProvider}
          hint={schema.credential.hint}
        />
      )}

      {locked && (
        <ConfigBanner tone="warn">
          Connect your account above to unlock the rest of this node.
        </ConfigBanner>
      )}

      <div className={`flex flex-col gap-5 ${locked ? "opacity-40 pointer-events-none select-none" : ""}`}>
        {schema.operations?.length > 0 && (
          <div className="flex flex-col">
            <ConfigLabel>Operation</ConfigLabel>
            <div className="grid grid-cols-2 gap-1.5">
              {schema.operations.map((op) => {
                const on = operation === op.value;
                return (
                  <button
                    key={op.value}
                    type="button"
                    onClick={() => updateConfig(opKey, op.value)}
                    className="bb-glow-border px-3 py-2 rounded-md text-[11.5px] font-mono font-medium border transition-colors text-left"
                    style={on
                      ? { color: accent, backgroundColor: `${accent}1f`, borderColor: `${accent}66` }
                      : { color: '#6d6d6d', backgroundColor: '#0f0f0f', borderColor: '#2b2b2b' }}
                  >
                    {op.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {mainFields.map((f, i) => (
          <Field key={`${f.key}-${i}`} field={f} config={config} updateConfig={updateConfig} nodeId={nodeId} accent={accent} />
        ))}

        {advFields.length > 0 && (
          <div className="flex flex-col">
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="flex items-center gap-1.5 text-[9px] font-bold text-neutral-500 uppercase tracking-[0.18em] font-mono hover:text-neutral-300 transition-colors w-fit"
            >
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${showAdvanced ? "rotate-180" : ""}`} />
              Advanced
            </button>
            {showAdvanced && (
              <div className="flex flex-col gap-5 mt-4">
                {advFields.map((f, i) => (
                  <Field key={`${f.key}-${i}`} field={f} config={config} updateConfig={updateConfig} nodeId={nodeId} accent={accent} />
                ))}
              </div>
            )}
          </div>
        )}

        {schema.output && (
          <ConfigBanner>Returns: <span className="text-neutral-300">{schema.output}</span></ConfigBanner>
        )}
      </div>
    </ConfigSection>
  );
}
