export default {
  backendType: "counter",
  label: "Counter",
  description: "Increment, decrement or reset a named counter",
  fields: [
    {
      name: "mode", label: "Action", type: "options", cols: 5, default: "increment",
      options: ["increment", "decrement", "reset", "get", "set"],
    },
    {
      name: "counterId", label: "Counter Name", type: "string", smart: true,
      placeholder: "pageViews  or  {{ $json.counterName }}",
    },
    {
      name: "amount", label: "Amount", type: "number", min: 1, default: 1,
      show: { mode: ["increment", "decrement"] },
    },
    {
      name: "startAt", label: "Reset To", type: "number", default: 0,
      show: { mode: "reset" },
    },
    {
      name: "setValue", label: "Set Value To", type: "string", smart: true,
      placeholder: "{{ $json.count }}",
      show: { mode: "set" },
    },
    {
      name: "scope", label: "Scope", type: "options", cols: 3, default: "execution",
      options: ["execution", "workflow", "global"],
    },
  ],
  outputs: ["counterId", "value", "previousValue", "scope"],
};
