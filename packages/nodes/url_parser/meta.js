export default {
  backendType: "url_parser",
  label: "URL Parser",
  description: "Extract domain, path, params from a URL",
  fields: [
    { name: "field", label: "URL Field", type: "string", smart: true, placeholder: "{{ $json.url }}" },
    {
      name: "extract", label: "Extract", type: "options", cols: 3, default: "all",
      options: ["all", "href", "protocol", "hostname", "port", "pathname", "search", "hash", "origin"],
      hint: "Select 'all' to return an object with every URL part",
    },
    { name: "outputField", label: "Output Field", type: "string", smart: false, mono: true, default: "parsed", placeholder: "parsed" },
  ],
  outputs: ["parsed"],
};
