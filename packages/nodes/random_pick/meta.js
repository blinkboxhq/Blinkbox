export default {
  backendType: "random_pick",
  label: "Random Pick",
  description: "Pick random items, shuffle or sample from any array",
  fields: [
    {
      name: "mode", label: "Mode", type: "options", cols: 4, default: "one",
      options: [
        { value: "one", label: "Pick One" },
        { value: "multiple", label: "Pick N" },
        { value: "shuffle", label: "Shuffle All" },
        { value: "weighted", label: "Weighted" },
      ],
    },
    {
      name: "array", label: "Array", type: "string", smart: true, multiline: true,
      placeholder: '{{ $json.items }}  or  ["a","b","c"]',
      hint: "For weighted mode: array of { item, weight } objects",
    },
    {
      name: "count", label: "How Many to Pick", type: "number", min: 1, default: 1,
      show: { mode: "multiple" },
    },
    {
      name: "unique", label: "No Duplicates", type: "boolean", default: true,
      hint: "Each item picked at most once",
      show: { mode: "multiple" },
    },
    {
      name: "seed", label: "Seed (optional — for reproducibility)", type: "string",
      smart: false, mono: true, placeholder: "42",
    },
  ],
  outputs: ["item", "items", "index", "indices"],
};
