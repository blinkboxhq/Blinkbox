export default {
  backendType: "variable_set_get",
  label: "Variable Set / Get",
  description: "Store and retrieve values across workflow nodes",
  fields: [
    { name: "scope", label: "Scope", type: "options", cols: 3, default: "execution", options: [
      { value: "execution", label: "This Run" },
      { value: "workflow",  label: "This Workflow" },
      { value: "global",    label: "Whole Workspace" },
    ], hint: "Execution values expire after 24h; workflow and workspace values persist until deleted" },
    { name: "key", label: "Variable Key", type: "string", smart: true, placeholder: 'userCount  or  {{ $json.varName }}',
      show: { operation: ["set", "get", "delete"] } },
    { name: "value", label: "Value", type: "string", smart: true, multiline: true, placeholder: '{{ $json.result }}  or  "hello"  or  42', show: { operation: "set" } },
    { name: "ttl", label: "TTL (seconds, 0 = no expiry)", type: "number", default: 0, min: 0, show: { operation: "set" } },
    { name: "defaultVal", label: "Default Value (if not found)", type: "string", smart: true, placeholder: 'null  or  0  or  ""', show: { operation: "get" } },
  ],
  outputs: ["key", "value", "found", "scope"],
};
