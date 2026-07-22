export default {
  backendType: "pagerduty",
  label: "PagerDuty",
  description: "Create and manage incidents, add notes, list services, and view on-call schedules via PagerDuty.",
  fields: [
    { name: "credentialId", label: "Credential", type: "credential", accentColor: "#25C151" },
    {
      name: "operation", label: "Operation", type: "options", cols: 2, default: "createIncident",
      options: [
        { value: "createIncident",      label: "Create Incident", desc: "Open a new incident on a service" },
        { value: "getIncident",         label: "Get Incident", desc: "Fetch one incident by ID" },
        { value: "listIncidents",       label: "List Incidents", desc: "List incidents, filtered by status" },
        { value: "resolveIncident",     label: "Resolve Incident", desc: "Mark an incident as resolved" },
        { value: "acknowledgeIncident", label: "Acknowledge Incident", desc: "Acknowledge an incident so paging stops" },
        { value: "updateIncident",      label: "Update Incident", desc: "Change an incident's priority or assignee" },
        { value: "addNote",             label: "Add Note", desc: "Add a timeline note to an incident" },
        { value: "listServices",        label: "List Services", desc: "List services you can page" },
        { value: "listOnCalls",         label: "List On-Calls", desc: "See who is on call right now" },
      ],
    },

    { name: "title", label: "Title", type: "string", smart: true, show: { operation: ["createIncident"] } },
    { name: "serviceId", label: "Service ID", type: "string", smart: true, placeholder: "PagerDuty service ID", show: { operation: ["createIncident"] } },
    {
      name: "urgency", label: "Urgency", type: "options", cols: 2, default: "high",
      options: [
        { value: "high", label: "High" },
        { value: "low",  label: "Low" },
      ],
      show: { operation: ["createIncident", "updateIncident"] },
    },
    { name: "body", label: "Body", type: "string", smart: true, multiline: true, optional: true, show: { operation: ["createIncident"] } },
    { name: "escalationPolicyId", label: "Escalation Policy ID", type: "string", smart: true, optional: true, show: { operation: ["createIncident"] } },

    { name: "incidentId", label: "Incident ID", type: "string", smart: true, show: { operation: ["getIncident", "resolveIncident", "acknowledgeIncident", "updateIncident", "addNote"] } },

    {
      name: "statuses", label: "Status", type: "options", cols: 3, optional: true,
      options: [
        { value: "triggered",     label: "Triggered" },
        { value: "acknowledged",  label: "Acknowledged" },
        { value: "resolved",      label: "Resolved" },
      ],
      show: { operation: ["listIncidents"] },
    },
    {
      name: "urgency", label: "Urgency", type: "options", cols: 2, optional: true,
      options: [
        { value: "high", label: "High" },
        { value: "low",  label: "Low" },
      ],
      show: { operation: ["listIncidents"] },
    },
    { name: "limit", label: "Limit", type: "number", default: 25, show: { operation: ["listIncidents"] } },

    { name: "fromEmail", label: "From (Email)", type: "string", smart: true, placeholder: "requester@email.com", show: { operation: ["resolveIncident", "acknowledgeIncident", "updateIncident", "addNote"] } },

    {
      name: "status", label: "Status", type: "options", cols: 2,
      options: [
        { value: "acknowledged", label: "Acknowledged" },
        { value: "resolved",     label: "Resolved" },
      ],
      show: { operation: ["updateIncident"] },
    },
    { name: "title", label: "Title", type: "string", smart: true, optional: true, show: { operation: ["updateIncident"] } },
    { name: "assigneeId", label: "Assignee User ID", type: "string", smart: true, optional: true, hint: "PagerDuty user ID to assign", show: { operation: ["createIncident"] } },

    { name: "content", label: "Note", type: "string", smart: true, multiline: true, show: { operation: ["addNote"] } },

    { name: "limit", label: "Limit", type: "number", default: 25, show: { operation: ["listServices"] } },

    { name: "scheduleId", label: "Schedule IDs", type: "string", smart: true, optional: true, hint: "Comma-separated", show: { operation: ["listOnCalls"] } },
    { name: "since", label: "Since", type: "string", smart: true, optional: true, show: { operation: ["listOnCalls"] } },
    { name: "until", label: "Until", type: "string", smart: true, optional: true, show: { operation: ["listOnCalls"] } },
  ],
  outputs: ["incident", "incidents", "note", "services", "onCalls"],
};
