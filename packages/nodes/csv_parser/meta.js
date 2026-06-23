export default {
  backendType: "csv_parser",
  label: "CSV Parser",
  description: "Convert between CSV and JSON arrays",
  fields: [
    { name: "mode", label: "Mode", type: "options", cols: 2, default: "toJson", options: [
      { value: "toJson", label: "CSV → JSON" },
      { value: "toCsv", label: "JSON → CSV" },
    ]},
    { name: "csv", label: "CSV Input", type: "string", smart: true, multiline: true, placeholder: "{{n1.csvText}}", show: { mode: "toJson" } },
    { name: "hasHeader", label: "First row is header", type: "boolean", default: true, show: { mode: "toJson" } },
    { name: "outputKey", label: "Output Key", type: "string", default: "rows", mono: true, smart: false, show: { mode: "toJson" } },
    { name: "data", label: "Data (Array)", type: "string", smart: true, placeholder: "{{n1.items}}", hint: "Array of objects or array of arrays. Output key: csv", show: { mode: "toCsv" } },
    { name: "delimiter", label: "Delimiter", type: "string", smart: false, mono: true, default: ",", placeholder: "," },
  ],
  outputs: ["rows / csv"],
};
