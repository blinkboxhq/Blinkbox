export default {
  backendType: "pinecone",
  label: "Pinecone",
  description: "Query, upsert, and manage vector embeddings in Pinecone vector database.",
  fields: [
    { name: "credentialId", type: "credential", label: "Pinecone Credential", accentColor: "#000000" },
    {
      name: "operation", type: "options", label: "Operation", cols: 2, default: "query",
      options: [
        { value: "query",         label: "Query" },
        { value: "upsert",        label: "Upsert" },
        { value: "delete",        label: "Delete" },
        { value: "fetch",         label: "Fetch" },
        { value: "listIndexes",   label: "List Indexes" },
        { value: "describeIndex", label: "Describe Index" },
        { value: "createIndex",   label: "Create Index" },
      ],
    },

    { name: "indexName", type: "string", label: "Index Name", smart: true, placeholder: "my-index" },
    { name: "namespace", type: "string", label: "Namespace", smart: true, optional: true, default: "" },

    { name: "vector", type: "string", label: "Query Vector", smart: true, multiline: true, hint: "JSON array of floats", show: { operation: "query" } },
    { name: "topK", type: "number", label: "Top K", default: 10, show: { operation: "query" } },
    { name: "includeMetadata", type: "boolean", label: "Include Metadata", default: true, show: { operation: "query" } },
    { name: "includeValues", type: "boolean", label: "Include Values", default: false, show: { operation: "query" } },
    { name: "filter", type: "string", label: "Filter", smart: true, optional: true, hint: "JSON metadata filter", show: { operation: "query" } },

    { name: "vectors", type: "string", label: "Vectors", smart: true, multiline: true, hint: "JSON array: [{id, values, metadata}]", show: { operation: "upsert" } },

    { name: "ids", type: "string", label: "Vector IDs", smart: true, hint: "Comma-separated vector IDs", show: { operation: ["delete", "fetch"] } },
    { name: "deleteAll", type: "boolean", label: "Delete All", default: false, show: { operation: "delete" } },

    { name: "dimensions", type: "number", label: "Dimensions", default: 1536, show: { operation: "createIndex" } },
    {
      name: "metric", type: "options", label: "Metric", cols: 3, default: "cosine",
      options: [
        { value: "cosine",      label: "Cosine" },
        { value: "euclidean",   label: "Euclidean" },
        { value: "dotproduct",  label: "Dot Product" },
      ],
      show: { operation: "createIndex" },
    },
    { name: "environment", type: "string", label: "Environment", smart: true, optional: true, placeholder: "us-east-1-aws", show: { operation: "createIndex" } },
  ],
  outputs: ["matches", "upsertedCount", "fetchedVectors", "indexes", "index"],
};
