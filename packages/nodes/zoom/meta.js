export default {
  backendType: "zoom",
  label: "Zoom",
  description: "Create, read, update, or delete Zoom meetings",
  fields: [
    { name: "credentialId", label: "Zoom OAuth", type: "credential", placeholder: "Zoom OAuth credential", accentColor: "#2d8cff" },
    { name: "operation", label: "Operation", type: "options", cols: 2, default: "createMeeting", options: [
      { value: "createMeeting",  label: "Create Meeting" },
      { value: "getMeeting",     label: "Get Meeting" },
      { value: "listMeetings",   label: "List Meetings" },
      { value: "updateMeeting",  label: "Update Meeting" },
      { value: "deleteMeeting",  label: "Delete Meeting" },
    ]},
    { name: "meetingId", label: "Meeting ID", type: "string", smart: true, placeholder: "85746065890", show: { operation: ["getMeeting","deleteMeeting","updateMeeting"] } },
    { name: "topic", label: "Topic", type: "string", smart: true, placeholder: "Weekly Sync", show: { operation: ["createMeeting","updateMeeting"] } },
    { name: "startTime", label: "Start Time (ISO 8601)", type: "string", smart: true, placeholder: "2024-12-01T10:00:00Z", show: { operation: ["createMeeting","updateMeeting"] } },
    { name: "duration", label: "Duration (minutes)", type: "number", default: 60, show: { operation: ["createMeeting","updateMeeting"] } },
    { name: "agenda", label: "Agenda (optional)", type: "string", smart: true, multiline: true, show: { operation: ["createMeeting","updateMeeting"] } },
  ],
  outputs: ["meeting", "meetings", "deleted"],
};
