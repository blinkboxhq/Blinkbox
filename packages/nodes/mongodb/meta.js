const COLLECTION_OPS = [
  "find", "findOne", "countDocuments", "estimatedDocumentCount", "aggregate", "distinct",
  "insertOne", "insertMany", "updateOne", "updateMany", "replaceOne", "deleteOne", "deleteMany",
  "findOneAndUpdate", "findOneAndDelete", "bulkWrite", "createIndex", "listIndexes", "dropIndex",
];

const FILTER_OPS = [
  "find", "findOne", "countDocuments", "distinct",
  "updateOne", "updateMany", "replaceOne", "deleteOne", "deleteMany",
  "findOneAndUpdate", "findOneAndDelete",
];

export default {
  backendType: "mongodb",
  label: "MongoDB",
  description: "Query, insert, update, delete, aggregate, and index documents in a MongoDB collection.",
  fields: [
    { name: "credentialId", type: "credential", label: "MongoDB Credential", accentColor: "#4DB33D" },

    { name: "database", type: "string", label: "Database", smart: true, placeholder: "myDatabase",
      hint: "Leave blank to use the database from the credential's connection string" },
    { name: "collection", type: "string", label: "Collection", smart: true, required: true, placeholder: "users",
      show: { operation: COLLECTION_OPS } },

    { name: "filter", type: "string", label: "Filter", smart: true, multiline: true, default: "{}",
      hint: "JSON query object: {\"status\": \"active\"}",
      show: { operation: FILTER_OPS } },
    { name: "projection", type: "string", label: "Projection", smart: true,
      hint: "JSON of fields to return: {\"name\": 1, \"_id\": 0}",
      show: { operation: ["find", "findOne", "findOneAndUpdate", "findOneAndDelete"] } },
    { name: "sort", type: "string", label: "Sort", smart: true, placeholder: "{\"createdAt\": -1}",
      hint: "1 ascending, -1 descending",
      show: { operation: ["find", "findOneAndUpdate", "findOneAndDelete"] } },
    { name: "limit", type: "number", label: "Limit", default: 100,
      show: { operation: ["find"] } },
    { name: "skip", type: "number", label: "Skip", default: 0,
      show: { operation: ["find"] } },

    { name: "pipeline", type: "string", label: "Pipeline", smart: true, multiline: true, required: true,
      hint: "JSON array of aggregation stages: [{\"$match\": {...}}, {\"$group\": {...}}]",
      show: { operation: ["aggregate"] } },
    { name: "field", type: "string", label: "Field", smart: true, required: true, placeholder: "country",
      hint: "The field to pull unique values from",
      show: { operation: ["distinct"] } },

    { name: "document", type: "string", label: "Document", smart: true, multiline: true, required: true,
      hint: "JSON object to write",
      show: { operation: ["insertOne", "replaceOne"] } },
    { name: "documents", type: "string", label: "Documents", smart: true, multiline: true, required: true,
      hint: "JSON array of objects to write in one round trip",
      show: { operation: ["insertMany"] } },
    { name: "update", type: "string", label: "Update", smart: true, multiline: true, required: true,
      hint: "JSON with an update operator: {\"$set\": {\"plan\": \"pro\"}}",
      show: { operation: ["updateOne", "updateMany", "findOneAndUpdate"] } },
    { name: "upsert", type: "boolean", label: "Insert If Missing", default: false,
      show: { operation: ["updateOne", "updateMany", "replaceOne", "findOneAndUpdate"] } },
    { name: "arrayFilters", type: "string", label: "Array Filters", smart: true,
      hint: "JSON array targeting nested elements: [{\"elem.done\": false}]",
      show: { operation: ["updateOne"] } },
    { name: "returnDocument", type: "options", label: "Return", default: "after", options: [
      { value: "after", label: "Updated" },
      { value: "before", label: "Original" },
    ], show: { operation: ["findOneAndUpdate"] } },
    { name: "operations", type: "string", label: "Operations", smart: true, multiline: true, required: true,
      hint: "JSON array of bulk ops: [{\"insertOne\": {...}}, {\"deleteOne\": {...}}]",
      show: { operation: ["bulkWrite"] } },

    { name: "keys", type: "string", label: "Index Keys", smart: true, required: true, placeholder: "{\"email\": 1}",
      hint: "JSON of field → direction",
      show: { operation: ["createIndex"] } },
    { name: "indexOptions", type: "string", label: "Index Options", smart: true,
      hint: "JSON: {\"unique\": true, \"name\": \"email_idx\"}",
      show: { operation: ["createIndex"] } },
    { name: "indexName", type: "string", label: "Index Name", smart: true, required: true, placeholder: "email_idx",
      show: { operation: ["dropIndex"] } },
  ],
  outputs: ["documents", "document", "count", "values", "insertedId", "insertedIds", "matchedCount", "modifiedCount", "deletedCount", "upsertedId", "collections", "indexes", "result"],
};
