export default {
  backendType: "datadog",
  label: "Datadog",
  description: "Create events, send logs, submit metrics, and manage monitors via the Datadog API.",
  fields: [
    { name: "credentialId", label: "Credential", type: "credential", accentColor: "#632CA6" },
    {
      name: "operation", label: "Operation", type: "options", cols: 2, default: "createEvent",
      options: [
        { value: "createEvent",   label: "Create Event" },
        { value: "sendEvent",     label: "Send Event" },
        { value: "listEvents",    label: "List Events" },
        { value: "listLogs",      label: "List Logs" },
        { value: "sendLog",       label: "Send Log" },
        { value: "submitMetric",  label: "Submit Metric" },
        { value: "queryMetrics",  label: "Query Metrics" },
        { value: "getMetrics",    label: "Get Metrics" },
        { value: "createMonitor", label: "Create Monitor" },
        { value: "listMonitors",  label: "List Monitors" },
        { value: "getMonitor",    label: "Get Monitor" },
        { value: "muteMonitor",   label: "Mute Monitor" },
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

    { name: "start", label: "Start", type: "string", smart: true, placeholder: "Unix timestamp or ISO", show: { operation: ["listEvents"] } },
    { name: "end", label: "End", type: "string", smart: true, placeholder: "Unix timestamp or ISO", show: { operation: ["listEvents"] } },
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
    { name: "ddsource", label: "Source", type: "string", smart: true, optional: true, show: { operation: ["sendLog"] } },
    { name: "ddtags", label: "Tags", type: "string", smart: true, optional: true, show: { operation: ["sendLog"] } },
    { name: "hostname", label: "Hostname", type: "string", smart: true, optional: true, show: { operation: ["sendLog"] } },

    { name: "series", label: "Series (JSON)", type: "string", smart: true, multiline: true, hint: "JSON array: [{metric,points,type,tags}]", show: { operation: ["submitMetric"] } },

    { name: "metricsQuery", label: "Query", type: "string", smart: true, placeholder: "avg:system.cpu.user{*}", show: { operation: ["queryMetrics"] } },

    { name: "monitorName", label: "Name", type: "string", smart: true, show: { operation: ["createMonitor"] } },
    {
      name: "monitorType", label: "Type", type: "options", cols: 2, default: "metric alert",
      options: [
        { value: "metric alert",  label: "Metric Alert" },
        { value: "service check", label: "Service Check" },
        { value: "event alert",   label: "Event Alert" },
        { value: "log alert",     label: "Log Alert" },
      ],
      show: { operation: ["createMonitor"] },
    },
    { name: "monitorQuery", label: "Query", type: "string", smart: true, multiline: true, show: { operation: ["createMonitor"] } },
    { name: "monitorMessage", label: "Message", type: "string", smart: true, multiline: true, show: { operation: ["createMonitor"] } },
    { name: "monitorTags", label: "Tags", type: "string", smart: true, optional: true, show: { operation: ["createMonitor"] } },
    { name: "monitorPriority", label: "Priority (1–5)", type: "number", optional: true, min: 1, max: 5, show: { operation: ["createMonitor"] } },

    { name: "groupStates", label: "Group States", type: "string", smart: true, optional: true, show: { operation: ["listMonitors"] } },

    { name: "monitorId", label: "Monitor ID", type: "string", smart: true, show: { operation: ["getMonitor", "muteMonitor"] } },
    { name: "muteEnd", label: "Mute Until", type: "string", smart: true, optional: true, placeholder: "Unix timestamp", show: { operation: ["muteMonitor"] } },
  ],
  outputs: ["event", "events", "logs", "monitor", "monitors", "metrics"],
};
