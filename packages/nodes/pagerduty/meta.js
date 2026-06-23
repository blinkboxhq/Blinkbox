export default {
  backendType: "pagerduty",
  label: "PagerDuty",
  description: "Create and manage incidents, add notes, list services, and view on-call schedules via PagerDuty.",
  fields: [
    { name: "credentialId", label: "Credential", type: "credential", accentColor: "#25C151" },
    {
      name: "operation", label: "Operation", type: "options", cols: 2, default: "createIncident",
      options: [
        { value: "createIncident",      label: "Create Incident" },
        { value: "getIncident",         label: "Get Incident" },
        { value: "listIncidents",       label: "List Incidents" },
        { value: "resolveIncident",     label: "Resolve Incident" },
        { value: "acknowledgeIncident", label: "Acknowledge Incident" },
        { value: "updateIncident",      label: "Update Incident" },
        { value: "addNote",             label: "Add Note" },
        { value: "listServices",        label: "List Services" },
        { value: "listOnCalls",         label: "List On-Calls" },
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
      name: "listStatus", label: "Status", type: "options", cols: 3, optional: true,
      options: [
        { value: "triggered",     label: "Triggered" },
        { value: "acknowledged",  label: "Acknowledged" },
        { value: "resolved",      label: "Resolved" },
      ],
      show: { operation: ["listIncidents"] },
    },
    {
      name: "listUrgency", label: "Urgency", type: "options", cols: 2, optional: true,
      options: [
        { value: "high", label: "High" },
        { value: "low",  label: "Low" },
      ],
      show: { operation: ["listIncidents"] },
    },
    { name: "listLimit", label: "Limit", type: "number", default: 25, show: { operation: ["listIncidents"] } },

    { name: "from", label: "From (Email)", type: "string", smart: true, placeholder: "requester@email.com", show: { operation: ["resolveIncident", "acknowledgeIncident", "updateIncident", "addNote"] } },

    {
      name: "updateStatus", label: "Status", type: "options", cols: 2,
      options: [
        { value: "acknowledged", label: "Acknowledged" },
        { value: "resolved",     label: "Resolved" },
      ],
      show: { operation: ["updateIncident"] },
    },
    { name: "updateTitle", label: "Title", type: "string", smart: true, optional: true, show: { operation: ["updateIncident"] } },
    { name: "assignmentIds", label: "Assignee User IDs", type: "string", smart: true, optional: true, hint: "Comma-separated user IDs", show: { operation: ["updateIncident"] } },

    { name: "noteContent", label: "Note", type: "string", smart: true, multiline: true, show: { operation: ["addNote"] } },

    { name: "servicesLimit", label: "Limit", type: "number", default: 25, show: { operation: ["listServices"] } },
    { name: "teamIds", label: "Team IDs", type: "string", smart: true, optional: true, hint: "Comma-separated", show: { operation: ["listServices"] } },

    { name: "scheduleIds", label: "Schedule IDs", type: "string", smart: true, optional: true, hint: "Comma-separated", show: { operation: ["listOnCalls"] } },
    { name: "since", label: "Since", type: "string", smart: true, optional: true, show: { operation: ["listOnCalls"] } },
    { name: "until", label: "Until", type: "string", smart: true, optional: true, show: { operation: ["listOnCalls"] } },
  ],
  outputs: ["incident", "incidents", "note", "services", "onCalls"],
};
