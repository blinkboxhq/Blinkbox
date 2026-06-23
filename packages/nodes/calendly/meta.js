export default {
  backendType: "calendly",
  label: "Calendly",
  description: "Manage event types, scheduled events, and invitees via the Calendly API.",
  fields: [
    { name: "credentialId", label: "Credential", type: "credential", accentColor: "#006BFF" },
    { name: "operation", label: "Operation", type: "options", cols: 2, default: "listEvents", options: [
      { value: "getUser",         label: "Get Current User" },
      { value: "listEventTypes",  label: "List Event Types" },
      { value: "listEvents",      label: "List Events" },
      { value: "getEvent",        label: "Get Event" },
      { value: "getInvitee",      label: "Get Invitee" },
      { value: "listInvitees",    label: "List Invitees" },
      { value: "createWebhook",   label: "Create Webhook" },
      { value: "cancelEvent",     label: "Cancel Event" },
    ]},

    { name: "listEventTypesUserUri", label: "User URI", type: "string", smart: true, optional: true, hint: "Leave blank for current user", show: { operation: ["listEventTypes"] } },
    { name: "active", label: "Active Only", type: "boolean", default: true, show: { operation: ["listEventTypes"] } },

    { name: "listEventsUserUri", label: "User URI", type: "string", smart: true, optional: true, show: { operation: ["listEvents"] } },
    { name: "listEventsStatus", label: "Status", type: "options", cols: 2, default: "active", options: [
      { value: "active",   label: "Active" },
      { value: "canceled", label: "Canceled" },
    ], show: { operation: ["listEvents"] } },
    { name: "count", label: "Count", type: "number", default: 20, show: { operation: ["listEvents"] } },
    { name: "minStartTime", label: "Min Start Time", type: "string", smart: true, optional: true, placeholder: "2024-01-01T00:00:00Z", show: { operation: ["listEvents"] } },
    { name: "maxStartTime", label: "Max Start Time", type: "string", smart: true, optional: true, show: { operation: ["listEvents"] } },

    { name: "eventUri", label: "Event URI", type: "string", smart: true, placeholder: "Full Calendly event URI", show: { operation: ["getEvent", "getInvitee", "listInvitees", "cancelEvent"] } },

    { name: "inviteeUri", label: "Invitee URI", type: "string", smart: true, show: { operation: ["getInvitee"] } },

    { name: "listInviteesStatus", label: "Status", type: "options", cols: 2, default: "active", options: [
      { value: "active",   label: "Active" },
      { value: "canceled", label: "Canceled" },
    ], show: { operation: ["listInvitees"] } },
    { name: "listInviteesCount", label: "Count", type: "number", default: 20, show: { operation: ["listInvitees"] } },

    { name: "webhookUrl", label: "Webhook URL", type: "string", smart: true, placeholder: "https://your-webhook-url", show: { operation: ["createWebhook"] } },
    { name: "webhookEvents", label: "Events", type: "multiOptions", default: ["invitee.created"], options: [
      { value: "invitee.created",                    label: "Invitee Created" },
      { value: "invitee.canceled",                   label: "Invitee Canceled" },
      { value: "routing_form_submission.created",    label: "Routing Form Submission" },
    ], show: { operation: ["createWebhook"] } },
    { name: "webhookOrgUri", label: "Organization URI", type: "string", smart: true, optional: true, show: { operation: ["createWebhook"] } },
    { name: "webhookUserUri", label: "User URI", type: "string", smart: true, optional: true, show: { operation: ["createWebhook"] } },

    { name: "cancelReason", label: "Cancellation Reason", type: "string", smart: true, optional: true, show: { operation: ["cancelEvent"] } },
  ],
  outputs: ["user", "eventTypes", "events", "event", "invitees", "webhook"],
};
