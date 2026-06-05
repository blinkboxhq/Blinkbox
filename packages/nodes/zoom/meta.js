export default {
  backendType: "zoom",
  label: "Zoom",
  description: "Create, retrieve, list, and update Zoom meetings via the Zoom API.",
  fields: [
    { type: "notice", variant: "info", text: "Requires a Zoom OAuth credential (Server-to-Server or OAuth app)." },
    { name: "credentialId", label: "Zoom OAuth", type: "credential", accentColor: "#2D8CFF" },
    { name: "operation", label: "Operation", type: "options", cols: 2, default: "createMeeting", options: [
      { value: "createMeeting", label: "Create Meeting" },
      { value: "getMeeting",    label: "Get Meeting" },
      { value: "listMeetings",  label: "List Meetings" },
      { value: "updateMeeting", label: "Update Meeting" },
    ]},
    { name: "topic", label: "Topic", type: "string", smart: true, show: { operation: ["createMeeting","updateMeeting"] } },
    { name: "startTime", label: "Start Time", type: "string", smart: true, placeholder: "2024-12-25T10:00:00Z", show: { operation: ["createMeeting","updateMeeting"] } },
    { name: "duration", label: "Duration (minutes)", type: "number", default: 60, show: { operation: ["createMeeting","updateMeeting"] } },
    { name: "timezone", label: "Timezone", type: "string", default: "UTC", show: { operation: "createMeeting" } },
    { name: "agenda", label: "Agenda (optional)", type: "string", smart: true, multiline: true, show: { operation: "createMeeting" } },
    { name: "password", label: "Password (optional)", type: "string", smart: true, show: { operation: ["createMeeting","updateMeeting"] } },
    { name: "meetingId", label: "Meeting ID", type: "string", smart: true, show: { operation: ["getMeeting","updateMeeting"] } },
    { name: "type", label: "Type", type: "options", cols: 3, default: "scheduled", options: [
      { value: "scheduled", label: "Scheduled" },
      { value: "live",      label: "Live" },
      { value: "upcoming",  label: "Upcoming" },
    ], show: { operation: "listMeetings" } },
    { name: "pageSize", label: "Page Size", type: "number", default: 30, show: { operation: "listMeetings" } },
  ],
  outputs: ["meeting", "meetings"],
};
