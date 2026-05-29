export default {
  backendType: "text_splitter",
  label: "Text Splitter",
  description: "Split text into chunks for AI/RAG pipelines",
  fields: [
    { name: "text", label: "Text", type: "string", smart: true, placeholder: "{{upstream.content}}" },
    { name: "mode", label: "Split Mode", type: "options", cols: 2, default: "characters", options: [
      { value: "characters", label: "Characters" },
      { value: "words", label: "Words" },
      { value: "sentences", label: "Sentences" },
      { value: "paragraphs", label: "Paragraphs" },
    ]},
    { type: "row", show: { mode: ["characters","words","sentences"] }, fields: [
      { name: "chunkSize", label: "Chunk Size", type: "number", default: 500, min: 1, max: 10000 },
      { name: "overlap", label: "Overlap", type: "number", default: 50, min: 0, max: 500 },
    ]},
  ],
  outputs: ["chunks", "chunkCount"],
};
