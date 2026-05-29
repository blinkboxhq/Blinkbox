export default {
  backendType: "batch_split",
  label: "Batch Split",
  description: "Chunk an array into smaller batches",
  fields: [
    { name: "arrayPath", label: "Array Path", type: "string", smart: true, placeholder: "items  (blank = use entire input)" },
    { name: "batchSize", label: "Batch Size", type: "number", default: 10, min: 1, max: 10000, hint: "Number of items per batch" },
    { name: "outputKey", label: "Batch Key", type: "string", default: "batch", mono: true, smart: false, hint: "Each output item will have this key containing the batch array" },
  ],
  outputs: ["batches", "batchCount"],
};
