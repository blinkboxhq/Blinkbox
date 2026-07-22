export default {
  backendType: "datadog",
  label: "Datadog",
  description: "Create events, send logs, submit metrics, and manage monitors via the Datadog API.",
  fields: [
    { name: "credentialId", label: "Credential", type: "credential", accentColor: "#632CA6" },
    {
      name: "operation", label: "Operation", type: "options", cols: 2, default: "createEvent",
      options: [
        { value: "createEvent",   label: "Create Event", desc: "Post an event to the event stream" },
        { value: "sendEvent",     label: "Send Event", desc: "Post an event with tags and alert type" },
        { value: "listEvents",    label: "List Events", desc: "List events in a time range" },
        { value: "listLogs",      label: "List Logs", desc: "Search logs with a query" },
        { value: "sendLog",       label: "Send Log", desc: "Ship a log line to Datadog" },
        { value: "submitMetric",  label: "Submit Metric", desc: "Send a metric point or series" },
        { value: "queryMetrics",  label: "Query Metrics", desc: "Query a metric over a time range" },
        { value: "getMetrics",    label: "Get Metrics", desc: "List metric names that are reporting" },
        { value: "createMonitor", label: "Create Monitor", desc: "Create a monitor with a query and thresholds" },
        { value: "listMonitors",  label: "List Monitors", desc: "List monitors and their states" },
        { value: "getMonitor",    label: "Get Monitor", desc: "Fetch one monitor's definition" },
        { value: "muteMonitor",   label: "Mute Monitor", desc: "Silence a monitor for a period" },
      ],
    },

    { name: "title", label: "Title", type: "string", smart: true, show: { operation: ["createEvent", "sendEvent"] } },
    { name: "text", label: "Text", type: "string", smart: true, multiline: true, show: { operation: ["createEvent", "sendEvent"] } },
    {
      name: "alertType", label: "Alert Type", type: "options", cols: 2, default: "info",
      options: [
        { value: "info",    label: "Info" },
        { value: "error",   label: "Error" },
        { value: "warning", label: "Warning" },
        { value: "success", label: "Success" },
      ],
      show: { operation: ["createEvent", "sendEvent"] },
    },
    { name: "tags", label: "Tags", type: "string", smart: true, optional: true, hint: "Comma-separated key:value", show: { operation: ["createEvent", "sendEvent", "listEvents", "listMonitors"] } },

    { name: "from", label: "Start", type: "string", smart: true, placeholder: "Unix timestamp or ISO", show: { operation: ["listEvents"] } },
    { name: "to", label: "End", type: "string", smart: true, placeholder: "Unix timestamp or ISO", show: { operation: ["listEvents"] } },
    {
      name: "priority", label: "Priority", type: "options", cols: 2, optional: true,
      options: [
        { value: "normal", label: "Normal" },
        { value: "low",    label: "Low" },
      ],
      show: { operation: ["listEvents"] },
    },

    { name: "query", label: "Query", type: "string", smart: true, placeholder: "service:api status:error", show: { operation: ["listLogs"] } },
    { name: "from", label: "From", type: "string", smart: true, placeholder: "now-1h", show: { operation: ["listLogs", "queryMetrics"] } },
    { name: "to", label: "To", type: "string", smart: true, default: "now", show: { operation: ["listLogs", "queryMetrics"] } },
    { name: "limit", label: "Limit", type: "number", default: 50, show: { operation: ["listLogs"] } },

    { name: "message", label: "Message", type: "string", smart: true, show: { operation: ["sendLog"] } },
    { name: "service", label: "Service", type: "string", smart: true, show: { operation: ["sendLog"] } },
    { name: "source", label: "Source", type: "string", smart: true, optional: true, show: { operation: ["sendLog"] } },
    { name: "ddtags", label: "Tags", type: "string", smart: true, optional: true, show: { operation: ["sendLog"] } },
    { name: "hostname", label: "Hostname", type: "string", smart: true, optional: true, show: { operation: ["sendLog"] } },

    { name: "metricName", label: "Metric Name", type: "string", smart: true, placeholder: "app.requests.count", show: { operation: ["submitMetric"] } },
    { name: "value", label: "Value", type: "number", default: 0, show: { operation: ["submitMetric"] } },
    { name: "metricType", label: "Type", type: "options", default: "gauge", options: [{ value: "gauge", label: "Gauge" }, { value: "count", label: "Count" }, { value: "rate", label: "Rate" }], show: { operation: ["submitMetric"] } },

    { name: "query", label: "Query", type: "string", smart: true, placeholder: "avg:system.cpu.user{*}", show: { operation: ["queryMetrics"] } },

    { name: "name", label: "Name", type: "string", smart: true, show: { operation: ["createMonitor"] } },
    {
      name: "type", label: "Type", type: "options", cols: 2, default: "metric alert",
      options: [
        { value: "metric alert",  label: "Metric Alert" },
        { value: "service check", label: "Service Check" },
        { value: "event alert",   label: "Event Alert" },
        { value: "log alert",     label: "Log Alert" },
      ],
      show: { operation: ["createMonitor"] },
    },
    { name: "query", label: "Query", type: "string", smart: true, multiline: true, show: { operation: ["createMonitor"] } },
    { name: "message", label: "Message", type: "string", smart: true, multiline: true, show: { operation: ["createMonitor"] } },
    { name: "monitorTags", label: "Tags", type: "string", smart: true, optional: true, show: { operation: ["createMonitor"] } },
    { name: "priority", label: "Priority (1–5)", type: "number", optional: true, min: 1, max: 5, show: { operation: ["createMonitor"] } },


    { name: "monitorId", label: "Monitor ID", type: "string", smart: true, show: { operation: ["getMonitor", "muteMonitor"] } },
    { name: "end", label: "Mute Until", type: "string", smart: true, optional: true, placeholder: "Unix timestamp", show: { operation: ["muteMonitor"] } },
  ],
  outputs: ["event", "events", "logs", "monitor", "monitors", "metrics"],
};
