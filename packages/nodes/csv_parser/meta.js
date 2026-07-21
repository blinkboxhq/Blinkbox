export default {
  backendType: "csv_parser",
  label: "CSV Parser",
  description: "Convert between CSV and JSON arrays",
  fields: [
    { name: "csv", label: "CSV Input", type: "string", smart: true, multiline: true, placeholder: "{{n1.csvText}}", show: { operation: "toJson" } },
    { name: "hasHeader", label: "First row is header", type: "boolean", default: true, show: { operation: "toJson" } },
    { name: "outputKey", label: "Output Key", type: "string", default: "rows", mono: true, smart: false, show: { operation: "toJson" } },
    { name: "data", label: "Data (Array)", type: "string", smart: true, placeholder: "{{n1.items}}", hint: "Array of objects or array of arrays. Output key: csv", show: { operation: "toCsv" } },
    { name: "delimiter", label: "Delimiter", type: "string", smart: false, mono: true, default: ",", placeholder: "," },
  ],
  outputs: ["rows / csv"],
};
