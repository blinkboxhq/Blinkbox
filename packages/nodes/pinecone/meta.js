const VECTOR_OPS = [
  "query", "upsert", "update", "fetchById", "listVectors", "delete", "describeIndexStats",
];

export default {
  backendType: "pinecone",
  label: "Pinecone",
  description: "Query, upsert, and manage vector embeddings and indexes in Pinecone.",
  fields: [
    { name: "credentialId", type: "credential", label: "Pinecone Credential", accentColor: "#000000" },

    { name: "indexHost", type: "string", label: "Index Host", smart: true, required: true,
      placeholder: "my-index-abc123.svc.us-east-1-aws.pinecone.io",
      hint: "Copy the host from your index in the Pinecone console",
      show: { operation: VECTOR_OPS } },
    { name: "namespace", type: "string", label: "Namespace", smart: true,
      hint: "Leave blank for the default namespace",
      show: { operation: ["query", "upsert", "update", "fetchById", "listVectors", "delete"] } },

    { name: "vector", type: "string", label: "Query Vector", smart: true, multiline: true, required: true,
      hint: "JSON array of floats — usually an embedding from an earlier node",
      show: { operation: ["query"] } },
    { name: "topK", type: "number", label: "Results", default: 5,
      show: { operation: ["query"] } },
    { name: "includeMetadata", type: "boolean", label: "Include Metadata", default: true,
      show: { operation: ["query"] } },
    { name: "filter", type: "string", label: "Metadata Filter", smart: true, multiline: true,
      hint: "JSON filter: {\"category\": {\"$eq\": \"docs\"}}",
      show: { operation: ["query", "describeIndexStats"] } },

    { name: "vectors", type: "string", label: "Vectors", smart: true, multiline: true, required: true,
      hint: "JSON array: [{\"id\": \"1\", \"values\": [...], \"metadata\": {...}}]",
      show: { operation: ["upsert"] } },

    { name: "id", type: "string", label: "Vector ID", smart: true, required: true,
      show: { operation: ["update"] } },
    { name: "values", type: "string", label: "Values", smart: true, multiline: true,
      hint: "JSON array of floats — leave blank to change metadata only",
      show: { operation: ["update"] } },
    { name: "setMetadata", type: "string", label: "Metadata", smart: true, multiline: true,
      hint: "JSON object merged onto the vector's metadata",
      show: { operation: ["update"] } },

    { name: "ids", type: "string", label: "Vector IDs", smart: true,
      hint: "Comma-separated, or a JSON array",
      show: { operation: ["fetchById", "delete"] } },
    { name: "deleteAll", type: "boolean", label: "Delete Entire Namespace", default: false,
      hint: "Wipes every vector in the namespace — IDs are ignored",
      show: { operation: ["delete"] } },

    { name: "prefix", type: "string", label: "ID Prefix", smart: true,
      hint: "Only list IDs starting with this",
      show: { operation: ["listVectors"] } },
    { name: "limit", type: "number", label: "Limit", default: 100,
      show: { operation: ["listVectors"] } },
    { name: "paginationToken", type: "string", label: "Page Token", smart: true,
      hint: "Returned by the previous run to fetch the next page",
      show: { operation: ["listVectors"] } },

    { name: "indexName", type: "string", label: "Index Name", smart: true, required: true, placeholder: "my-index",
      show: { operation: ["describeIndex", "createIndex", "deleteIndex"] } },
    { name: "dimension", type: "number", label: "Dimensions", default: 1536,
      hint: "Must match your embedding model — 1536 for OpenAI text-embedding-3-small",
      show: { operation: ["createIndex"] } },
    { name: "metric", type: "options", label: "Metric", default: "cosine", options: [
      { value: "cosine", label: "Cosine" },
      { value: "euclidean", label: "Euclidean" },
      { value: "dotproduct", label: "Dot Product" },
    ], show: { operation: ["createIndex"] } },
    { name: "cloud", type: "options", label: "Cloud", default: "aws", options: [
      { value: "aws", label: "AWS" },
      { value: "gcp", label: "GCP" },
      { value: "azure", label: "Azure" },
    ], show: { operation: ["createIndex"] } },
    { name: "region", type: "string", label: "Region", smart: false, default: "us-east-1",
      show: { operation: ["createIndex"] } },
  ],
  outputs: ["matches", "upsertedCount", "vectors", "ids", "namespaces", "dimension", "totalVectorCount", "indexes", "index", "deleted", "paginationToken"],
};
