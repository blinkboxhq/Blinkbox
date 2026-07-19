import useProviderModels from "@/hooks/useProviderModels";
import { ConfigSelect } from "@/components/ui/ConfigKit";

export default function ModelSelect({ provider, credentialId, label = "Model", value, fallback, onChange, models = [], accentColor }) {
  const list = useProviderModels(provider, credentialId, models);
  return (
    <ConfigSelect
      label={label}
      value={value || fallback}
      onChange={onChange}
      options={list.map((s) => ({ value: s, label: s }))}
      accentColor={accentColor}
    />
  );
}
