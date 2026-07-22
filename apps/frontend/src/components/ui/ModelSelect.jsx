import useProviderModels from "@/hooks/useProviderModels";
import { ConfigSelect } from "@/components/ui/ConfigKit";

export default function ModelSelect({ provider, credentialId, label = "Model", value, fallback, onChange, models = [], accentColor }) {
  const list = useProviderModels(provider, credentialId, models);
  const opts = list.map((m) => (typeof m === "string" ? { value: m, label: m } : m));
  return (
    <ConfigSelect
      label={label}
      value={value || fallback}
      onChange={onChange}
      options={opts}
      accentColor={accentColor}
      searchable
      searchPlaceholder="Search models…"
      emptyLabel="Connect a credential to load models"
      action={<span className="text-[9px] font-mono text-neutral-600 tabular-nums">{opts.length}</span>}
    />
  );
}
