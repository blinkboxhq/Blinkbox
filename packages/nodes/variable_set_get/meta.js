export default {
  backendType: "variable_set_get",
  label: "Variable Set / Get",
  description: "Store and retrieve values across workflow nodes",
  fields: [
    { name: "mode", label: "Action", type: "options", cols: 4, default: "set", options: [
      { value: "set",    label: "Set" },
      { value: "get",    label: "Get" },
      { value: "delete", label: "Delete" },
      { value: "list",   label: "List" },
    ]},
    { name: "scope", label: "Scope", type: "options", cols: 3, default: "execution", options: [
      { value: "execution", label: "Execution (this run)" },
      { value: "workflow",  label: "Workflow (persists)" },
      { value: "global",    label: "Global (all flows)" },
    ]},
    { name: "key", label: "Variable Key", type: "string", smart: true, placeholder: 'userCount  or  {{ $json.varName }}',
      show: { mode: ["set","get","delete"] } },
    { name: "value", label: "Value", type: "string", smart: true, multiline: true, placeholder: '{{ $json.result }}  or  "hello"  or  42', show: { mode: "set" } },
    { name: "ttl", label: "TTL (seconds, 0 = no expiry)", type: "number", default: 0, min: 0, show: { mode: "set" } },
    { name: "defaultVal", label: "Default Value (if not found)", type: "string", smart: true, placeholder: 'null  or  0  or  ""', show: { mode: "get" } },
  ],
  outputs: ["key", "value", "found", "scope"],
};
