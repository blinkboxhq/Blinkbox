export default {
  backendType: "postgres",
  label: "PostgreSQL",
  description: "Query, execute, or batch-run SQL on a PostgreSQL database",
  fields: [
    { name: "credentialId", label: "Connection", type: "credential", placeholder: "PostgreSQL connection", accentColor: "#336791" },
    { name: "operation", label: "Operation", type: "options", cols: 3, default: "query", options: [
      { value: "query",   label: "Query (SELECT)" },
      { value: "execute", label: "Execute (DML)" },
      { value: "batch",   label: "Batch Statements" },
    ]},
    { name: "sql", label: "SQL", type: "string", smart: true, multiline: true, mono: true, placeholder: "SELECT * FROM users WHERE id = $1", show: { operation: ["query","execute"] } },
    { name: "params", label: "Parameters (JSON array)", type: "string", smart: true, placeholder: '["value1", "value2"]', mono: true, show: { operation: ["query","execute"] } },
    { name: "rowLimit", label: "Row Limit", type: "number", default: 100, show: { operation: "query" } },
    { name: "statements", label: "Statements (one per line)", type: "string", smart: true, multiline: true, mono: true, placeholder: "INSERT INTO logs (msg) VALUES ('a');\nUPDATE counters SET n = n+1;", show: { operation: "batch" } },
  ],
  outputs: ["rows", "rowCount", "fields"],
};
