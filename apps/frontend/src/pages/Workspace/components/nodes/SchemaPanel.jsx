import { useState } from "react";
import { ChevronDown } from "lucide-react";
import SmartVariableInput from "../../../../components/ui/SmartVariableInput";
import CredentialPicker from "../../../../components/ui/CredentialPicker";

const ACCENT_STYLES = {
  violet: { box: "bg-violet-500/10 border-violet-500/20",   icon: "text-violet-400",  pill: "bg-violet-500/15 border-violet-500/40 text-violet-300" },
  blue:   { box: "bg-blue-500/10 border-blue-500/20",       icon: "text-blue-400",    pill: "bg-blue-500/15 border-blue-500/40 text-blue-300" },
  green:  { box: "bg-emerald-500/10 border-emerald-500/20", icon: "text-emerald-400", pill: "bg-emerald-500/15 border-emerald-500/40 text-emerald-300" },
  emerald:{ box: "bg-emerald-500/10 border-emerald-500/20", icon: "text-emerald-400", pill: "bg-emerald-500/15 border-emerald-500/40 text-emerald-300" },
  red:    { box: "bg-red-500/10 border-red-500/20",         icon: "text-red-400",     pill: "bg-red-500/15 border-red-500/40 text-red-300" },
  rose:   { box: "bg-rose-500/10 border-rose-500/20",       icon: "text-rose-400",    pill: "bg-rose-500/15 border-rose-500/40 text-rose-300" },
  orange: { box: "bg-orange-500/10 border-orange-500/20",   icon: "text-orange-400",  pill: "bg-orange-500/15 border-orange-500/40 text-orange-300" },
  amber:  { box: "bg-amber-500/10 border-amber-500/20",     icon: "text-amber-400",   pill: "bg-amber-500/15 border-amber-500/40 text-amber-300" },
  sky:    { box: "bg-sky-500/10 border-sky-500/20",         icon: "text-sky-400",     pill: "bg-sky-500/15 border-sky-500/40 text-sky-300" },
  indigo: { box: "bg-indigo-500/10 border-indigo-500/20",   icon: "text-indigo-400",  pill: "bg-indigo-500/15 border-indigo-500/40 text-indigo-300" },
  pink:   { box: "bg-pink-500/10 border-pink-500/20",       icon: "text-pink-400",    pill: "bg-pink-500/15 border-pink-500/40 text-pink-300" },
  purple: { box: "bg-purple-500/10 border-purple-500/20",   icon: "text-purple-400",  pill: "bg-purple-500/15 border-purple-500/40 text-purple-300" },
};

const INPUT_CLS = "bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500 w-full";
const LABEL_CLS = "text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block";
const PILL_IDLE = "bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500";

function isVisible(field, config, schema) {
  if (!field.showWhen) return true;
  const opKey = schema.operationKey || "operation";
  return Object.entries(field.showWhen).every(([key, allowed]) => {
    const current = config[key] ?? (key === opKey ? schema.defaultOperation : undefined);
    const values = Array.isArray(allowed) ? allowed : [allowed];
    return values.includes(current);
  });
}

function FieldLabel({ field }) {
  return (
    <span className={LABEL_CLS}>
      {field.label}
      {field.required && <span className="text-rose-400 ml-0.5">*</span>}
    </span>
  );
}

function Field({ field, config, updateConfig, nodeId, accent }) {
  const value = config[field.key] ?? field.default ?? "";

  if (field.type === "toggle") {
    const on = Boolean(config[field.key] ?? field.default ?? false);
    return (
      <div className="flex items-center justify-between">
        <span className={LABEL_CLS + " mb-0"}>{field.label}</span>
        <button
          onClick={() => updateConfig(field.key, !on)}
          className={`w-10 h-5 rounded-full transition-all duration-150 relative shrink-0 ${on ? "bg-emerald-500" : "bg-zinc-700"}`}
        >
          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all duration-150 ${on ? "left-[22px]" : "left-0.5"}`} />
        </button>
      </div>
    );
  }

  if (field.type === "select") {
    const options = field.options || [];
    if (options.length <= 5) {
      return (
        <div className="flex flex-col">
          <FieldLabel field={field} />
          <div className="flex flex-wrap gap-1.5">
            {options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => updateConfig(field.key, opt.value)}
                className={`px-3 py-1.5 rounded-lg border text-[12px] font-medium transition-all duration-150 ${value === opt.value ? accent.pill : PILL_IDLE}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {field.hint && <p className="text-[10px] text-zinc-600 mt-1">{field.hint}</p>}
        </div>
      );
    }
    return (
      <div className="flex flex-col">
        <FieldLabel field={field} />
        <select value={value} onChange={(e) => updateConfig(field.key, e.target.value)} className={INPUT_CLS}>
          <option value="">Select…</option>
          {options.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
        {field.hint && <p className="text-[10px] text-zinc-600 mt-1">{field.hint}</p>}
      </div>
    );
  }

  if (field.type === "number") {
    return (
      <div className="flex flex-col">
        <FieldLabel field={field} />
        <input
          type="number"
          value={value}
          onChange={(e) => updateConfig(field.key, e.target.value)}
          placeholder={field.placeholder || ""}
          className={INPUT_CLS}
        />
        {field.hint && <p className="text-[10px] text-zinc-600 mt-1">{field.hint}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <FieldLabel field={field} />
      <SmartVariableInput
        value={config[field.key] ?? field.default ?? ""}
        onChange={(val) => updateConfig(field.key, val)}
        placeholder={field.placeholder || ""}
        nodeId={nodeId}
        multiline={field.type === "textarea"}
      />
      {field.hint && <p className="text-[10px] text-zinc-600 mt-1">{field.hint}</p>}
    </div>
  );
}

export default function SchemaPanel({ schema, def, config, updateConfig, nodeId }) {
  const accent = ACCENT_STYLES[schema.accent] || ACCENT_STYLES.violet;
  const opKey = schema.operationKey || "operation";
  const operation = config[opKey] || schema.defaultOperation;
  const locked = Boolean(schema.credential) && !config.credentialId;
  const [showAdvanced, setShowAdvanced] = useState(false);

  const visibleFields = (schema.fields || []).filter((f) => isVisible(f, config, schema));
  const mainFields = visibleFields.filter((f) => !f.advanced);
  const advFields = visibleFields.filter((f) => f.advanced);
  const Icon = def?.icon;

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${accent.box}`}>
          {def?.logoUrl ? (
            <img src={def.logoUrl} alt="" className="w-[18px] h-[18px]" style={def.imgFilter ? { filter: def.imgFilter } : undefined} />
          ) : Icon ? (
            <Icon className={`w-4 h-4 ${accent.icon}`} />
          ) : null}
        </div>
        <div className="min-w-0">
          <div className="text-[15px] font-semibold text-zinc-100 truncate">{def?.label || "Configure"}</div>
          {schema.subtitle && <div className="text-[11px] text-zinc-500">{schema.subtitle}</div>}
        </div>
      </div>

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
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] px-3 py-2 rounded-lg">
          Connect your account above to unlock the rest of this node.
        </div>
      )}

      <div className={`flex flex-col gap-4 ${locked ? "opacity-40 pointer-events-none select-none" : ""}`}>
        {schema.operations?.length > 0 && (
          <div className="flex flex-col">
            <span className={LABEL_CLS}>Operation</span>
            <div className="grid grid-cols-2 gap-1.5">
              {schema.operations.map((op) => (
                <button
                  key={op.value}
                  onClick={() => updateConfig(opKey, op.value)}
                  className={`px-3 py-2 rounded-lg border text-[12px] font-medium transition-all duration-150 text-left ${operation === op.value ? accent.pill : PILL_IDLE}`}
                >
                  {op.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {mainFields.map((f, i) => (
          <Field key={`${f.key}-${i}`} field={f} config={config} updateConfig={updateConfig} nodeId={nodeId} accent={accent} />
        ))}

        {advFields.length > 0 && (
          <div className="flex flex-col">
            <button
              onClick={() => setShowAdvanced((v) => !v)}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider hover:text-zinc-300 transition-all duration-150 w-fit"
            >
              <ChevronDown className={`w-3.5 h-3.5 transition-all duration-150 ${showAdvanced ? "rotate-180" : ""}`} />
              Advanced
            </button>
            {showAdvanced && (
              <div className="flex flex-col gap-4 mt-3">
                {advFields.map((f, i) => (
                  <Field key={`${f.key}-${i}`} field={f} config={config} updateConfig={updateConfig} nodeId={nodeId} accent={accent} />
                ))}
              </div>
            )}
          </div>
        )}

        {schema.output && (
          <div className="bg-zinc-900 border border-zinc-800 text-zinc-500 text-[11px] px-3 py-2 rounded-lg">
            Returns: <span className="text-zinc-300">{schema.output}</span>
          </div>
        )}
      </div>
    </div>
  );
}
