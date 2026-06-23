// ─────────────────────────────────────────────────────────────────────────────
// Declarative config schemas — one entry here replaces an entire bespoke
// ConfigPanel component. Rendered by components/nodes/SchemaPanel.jsx.
//
// Schema shape:
//   {
//     subtitle:         string             — header subtitle under the node label
//     accent:           string             — ACCENT key (blue|violet|rose|sky|…) for pills + credential picker
//     credential:       { label, placeholder, hint?, credentialType?, oauthProvider? } | null
//     operationKey:     string             — config key the operation writes to (default "operation")
//     defaultOperation: string             — backend's fallback op
//     operations:       [{ value, label }]
//     fields: [{
//       key, label, type: text|textarea|number|select|toggle,
//       placeholder?, hint?, default?, required?, advanced?,
//       options?: [{ value, label }]       — for select
//       showWhen?: { configKey: [values] } — AND across keys, OR within array
//     }]
//     output:           string             — "Returns: …" preview banner text
//   }
//
// Field values flow straight into config[key] — keys MUST match what the
// backend node reads. Required flags mirror the backend's own guards.
// ─────────────────────────────────────────────────────────────────────────────

export const CONFIG_SCHEMAS = {
  calendly: {
    subtitle: "Scheduling automation",
    accent: "blue",
    credential: { label: "Calendly Account", placeholder: "Select Calendly credential…" },
    defaultOperation: "listEvents",
    operations: [
      { value: "listEvents",     label: "List Events" },
      { value: "getEvent",       label: "Get Event" },
      { value: "listInvitees",   label: "List Invitees" },
      { value: "cancelEvent",    label: "Cancel Event" },
      { value: "getInvitee",     label: "Get Invitee" },
      { value: "listEventTypes", label: "List Event Types" },
      { value: "getUser",        label: "Get Current User" },
      { value: "createWebhook",  label: "Create Webhook" },
    ],
    fields: [
      { key: "eventUri",    label: "Event URI",     type: "text", required: true, placeholder: "https://api.calendly.com/scheduled_events/…", showWhen: { operation: ["getEvent", "listInvitees", "cancelEvent"] } },
      { key: "reason",      label: "Cancel Reason", type: "textarea", placeholder: "Why is this event being canceled?", showWhen: { operation: ["cancelEvent"] } },
      { key: "inviteeUuid", label: "Invitee UUID",  type: "text", required: true, showWhen: { operation: ["getInvitee"] } },
      { key: "url",         label: "Webhook URL",   type: "text", required: true, placeholder: "https://…", showWhen: { operation: ["createWebhook"] } },
      { key: "status",      label: "Status",        type: "select", advanced: true, options: [{ value: "active", label: "Active" }, { value: "canceled", label: "Canceled" }], showWhen: { operation: ["listEvents"] } },
      { key: "minStartTime", label: "Starts After", type: "text", advanced: true, placeholder: "2026-06-01T00:00:00Z", showWhen: { operation: ["listEvents"] } },
      { key: "maxStartTime", label: "Starts Before", type: "text", advanced: true, placeholder: "2026-07-01T00:00:00Z", showWhen: { operation: ["listEvents"] } },
      { key: "count",       label: "Max Results",   type: "number", default: 20, advanced: true, showWhen: { operation: ["listEvents", "listEventTypes", "listInvitees"] } },
    ],
    output: "uri, name, start_time, end_time, status, invitees_counter",
  },

  asana: {
    subtitle: "Tasks & projects",
    accent: "rose",
    credential: { label: "Asana Account", placeholder: "Select Asana credential…" },
    defaultOperation: "createTask",
    operations: [
      { value: "createTask",    label: "Create Task" },
      { value: "updateTask",    label: "Update Task" },
      { value: "completeTask",  label: "Complete Task" },
      { value: "getTask",       label: "Get Task" },
      { value: "addComment",    label: "Add Comment" },
      { value: "listTasks",     label: "List Tasks" },
      { value: "createProject", label: "Create Project" },
      { value: "listProjects",  label: "List Projects" },
    ],
    fields: [
      { key: "name",       label: "Task Name",    type: "text", required: true, placeholder: "Ship the launch email", showWhen: { operation: ["createTask"] } },
      { key: "name",       label: "Project Name", type: "text", required: true, showWhen: { operation: ["createProject"] } },
      { key: "teamGid",    label: "Team GID",     type: "text", required: true, showWhen: { operation: ["createProject"] } },
      { key: "taskGid",    label: "Task GID",     type: "text", required: true, showWhen: { operation: ["updateTask", "completeTask", "getTask", "addComment"] } },
      { key: "name",       label: "New Name",     type: "text", showWhen: { operation: ["updateTask"] } },
      { key: "projectGid", label: "Project GID",  type: "text", required: true, showWhen: { operation: ["listTasks"] } },
      { key: "projectGid", label: "Project GID",  type: "text", showWhen: { operation: ["createTask"] } },
      { key: "notes",      label: "Notes",        type: "textarea", showWhen: { operation: ["createTask", "updateTask"] } },
      { key: "text",       label: "Comment",      type: "textarea", required: true, showWhen: { operation: ["addComment"] } },
      { key: "dueOn",      label: "Due Date",     type: "text", advanced: true, placeholder: "2026-06-30", showWhen: { operation: ["createTask", "updateTask"] } },
      { key: "assignee",   label: "Assignee",     type: "text", advanced: true, placeholder: "GID or email", showWhen: { operation: ["createTask", "updateTask"] } },
    ],
    output: "gid, name, completed, due_on, permalink_url",
  },

  clickup: {
    subtitle: "Tasks, lists & spaces",
    accent: "purple",
    credential: { label: "ClickUp Account", placeholder: "Select ClickUp credential…" },
    defaultOperation: "createTask",
    operations: [
      { value: "createTask",   label: "Create Task" },
      { value: "updateTask",   label: "Update Task" },
      { value: "deleteTask",   label: "Delete Task" },
      { value: "getTask",      label: "Get Task" },
      { value: "addComment",   label: "Add Comment" },
      { value: "listTasks",    label: "List Tasks" },
      { value: "listSpaces",   label: "List Spaces" },
      { value: "createSpace",  label: "Create Space" },
      { value: "listFolders",  label: "List Folders" },
      { value: "createFolder", label: "Create Folder" },
      { value: "listLists",    label: "List Lists" },
      { value: "createList",   label: "Create List" },
      { value: "getList",      label: "Get List" },
    ],
    fields: [
      { key: "listId",      label: "List ID",     type: "text", required: true, showWhen: { operation: ["createTask", "listTasks", "getList"] } },
      { key: "name",        label: "Name",        type: "text", required: true, showWhen: { operation: ["createTask", "createSpace", "createFolder", "createList"] } },
      { key: "taskId",      label: "Task ID",     type: "text", required: true, showWhen: { operation: ["updateTask", "deleteTask", "getTask", "addComment"] } },
      { key: "name",        label: "New Name",    type: "text", showWhen: { operation: ["updateTask"] } },
      { key: "description", label: "Description", type: "textarea", showWhen: { operation: ["createTask", "updateTask"] } },
      { key: "comment",     label: "Comment",     type: "textarea", required: true, showWhen: { operation: ["addComment"] } },
      { key: "teamId",      label: "Team ID",     type: "text", required: true, showWhen: { operation: ["listSpaces", "createSpace"] } },
      { key: "spaceId",     label: "Space ID",    type: "text", required: true, showWhen: { operation: ["listFolders", "createFolder"] } },
      { key: "folderId",    label: "Folder ID",   type: "text", required: true, showWhen: { operation: ["listLists", "createList"] } },
      { key: "priority",    label: "Priority",    type: "select", advanced: true, options: [{ value: "1", label: "Urgent" }, { value: "2", label: "High" }, { value: "3", label: "Normal" }, { value: "4", label: "Low" }], showWhen: { operation: ["createTask", "updateTask"] } },
      { key: "dueDate",     label: "Due Date",    type: "text", advanced: true, placeholder: "2026-06-30 or timestamp", showWhen: { operation: ["createTask", "updateTask"] } },
      { key: "assignees",   label: "Assignees",   type: "text", advanced: true, placeholder: "Comma-separated user IDs", showWhen: { operation: ["createTask"] } },
      { key: "content",     label: "Description", type: "text", advanced: true, showWhen: { operation: ["createList"] } },
      { key: "status",      label: "Status",      type: "text", advanced: true, showWhen: { operation: ["createList"] } },
      { key: "multipleAssignees", label: "Multiple Assignees", type: "toggle", advanced: true, showWhen: { operation: ["createSpace"] } },
    ],
    output: "id, name, status, url, due_date",
  },

  trello: {
    subtitle: "Boards, lists & cards",
    accent: "sky",
    credential: { label: "Trello Account", placeholder: "Select Trello credential…" },
    defaultOperation: "createCard",
    operations: [
      { value: "createCard",  label: "Create Card" },
      { value: "updateCard",  label: "Update Card" },
      { value: "moveCard",    label: "Move Card" },
      { value: "archiveCard", label: "Archive Card" },
      { value: "getCard",     label: "Get Card" },
      { value: "addComment",  label: "Add Comment" },
      { value: "addLabel",    label: "Add Label" },
      { value: "listCards",   label: "List Cards" },
      { value: "listBoards",  label: "List Boards" },
      { value: "listLists",   label: "List Lists" },
      { value: "createList",  label: "Create List" },
    ],
    fields: [
      { key: "listId",     label: "List ID",     type: "text", required: true, showWhen: { operation: ["createCard", "listCards"] } },
      { key: "name",       label: "Card Name",   type: "text", required: true, placeholder: "Follow up with customer", showWhen: { operation: ["createCard"] } },
      { key: "cardId",     label: "Card ID",     type: "text", required: true, showWhen: { operation: ["updateCard", "moveCard", "archiveCard", "getCard", "addComment", "addLabel"] } },
      { key: "listId",     label: "Target List ID", type: "text", required: true, showWhen: { operation: ["moveCard"] } },
      { key: "name",       label: "New Name",    type: "text", showWhen: { operation: ["updateCard"] } },
      { key: "desc",       label: "Description", type: "textarea", showWhen: { operation: ["createCard", "updateCard"] } },
      { key: "text",       label: "Comment",     type: "textarea", required: true, showWhen: { operation: ["addComment"] } },
      { key: "labelColor", label: "Label Color", type: "select", options: [{ value: "green", label: "Green" }, { value: "yellow", label: "Yellow" }, { value: "orange", label: "Orange" }, { value: "red", label: "Red" }, { value: "purple", label: "Purple" }, { value: "blue", label: "Blue" }], showWhen: { operation: ["addLabel"] } },
      { key: "labelName",  label: "Label Name",  type: "text", showWhen: { operation: ["addLabel"] } },
      { key: "boardId",    label: "Board ID",    type: "text", required: true, showWhen: { operation: ["listLists", "createList"] } },
      { key: "name",       label: "List Name",   type: "text", required: true, showWhen: { operation: ["createList"] } },
      { key: "due",        label: "Due Date",    type: "text", advanced: true, placeholder: "2026-06-30", showWhen: { operation: ["createCard", "updateCard"] } },
      { key: "position",   label: "Position",    type: "text", advanced: true, placeholder: "top | bottom", showWhen: { operation: ["createList"] } },
    ],
    output: "id, name, desc, due, url, idList",
  },

  typeform: {
    subtitle: "Forms & responses",
    accent: "indigo",
    credential: { label: "Typeform Account", placeholder: "Select Typeform credential…" },
    defaultOperation: "listResponses",
    operations: [
      { value: "listResponses",  label: "List Responses" },
      { value: "getResponse",    label: "Get Response" },
      { value: "deleteResponse", label: "Delete Response" },
      { value: "getForm",        label: "Get Form" },
      { value: "listForms",      label: "List Forms" },
      { value: "createForm",     label: "Create Form" },
    ],
    fields: [
      { key: "formId",        label: "Form ID",        type: "text", required: true, showWhen: { operation: ["listResponses", "getResponse", "deleteResponse", "getForm"] } },
      { key: "responseToken", label: "Response Token", type: "text", required: true, showWhen: { operation: ["getResponse", "deleteResponse"] } },
      { key: "title",         label: "Form Title",     type: "text", required: true, showWhen: { operation: ["createForm"] } },
      { key: "pageSize",      label: "Page Size",      type: "number", default: 25, advanced: true, showWhen: { operation: ["listResponses"] } },
      { key: "since",         label: "Since",          type: "text", advanced: true, placeholder: "2026-06-01T00:00:00Z", showWhen: { operation: ["listResponses"] } },
      { key: "includeHidden", label: "Include Hidden Fields", type: "toggle", advanced: true, showWhen: { operation: ["listResponses"] } },
    ],
    output: "token, submitted_at, answers[]",
  },

  zoom: {
    subtitle: "Meetings",
    accent: "blue",
    credential: { label: "Zoom Account", placeholder: "Select Zoom credential…" },
    defaultOperation: "createMeeting",
    operations: [
      { value: "createMeeting", label: "Create Meeting" },
      { value: "updateMeeting", label: "Update Meeting" },
      { value: "getMeeting",    label: "Get Meeting" },
      { value: "deleteMeeting", label: "Delete Meeting" },
      { value: "listMeetings",  label: "List Meetings" },
    ],
    fields: [
      { key: "topic",     label: "Topic",        type: "text", required: true, placeholder: "Weekly sync", showWhen: { operation: ["createMeeting"] } },
      { key: "meetingId", label: "Meeting ID",   type: "text", required: true, showWhen: { operation: ["updateMeeting", "getMeeting", "deleteMeeting"] } },
      { key: "topic",     label: "New Topic",    type: "text", showWhen: { operation: ["updateMeeting"] } },
      { key: "startTime", label: "Start Time",   type: "text", placeholder: "2026-06-15T10:00:00Z", showWhen: { operation: ["createMeeting", "updateMeeting"] } },
      { key: "duration",  label: "Duration (min)", type: "number", default: 60, showWhen: { operation: ["createMeeting", "updateMeeting"] } },
      { key: "agenda",    label: "Agenda",       type: "textarea", showWhen: { operation: ["createMeeting", "updateMeeting"] } },
      { key: "listType",  label: "Show",         type: "select", default: "scheduled", options: [{ value: "scheduled", label: "Scheduled" }, { value: "live", label: "Live" }, { value: "upcoming", label: "Upcoming" }], showWhen: { operation: ["listMeetings"] } },
      { key: "type",      label: "Meeting Type", type: "select", default: "2", advanced: true, options: [{ value: "1", label: "Instant" }, { value: "2", label: "Scheduled" }, { value: "3", label: "Recurring" }], showWhen: { operation: ["createMeeting"] } },
      { key: "timezone",  label: "Timezone",     type: "text", default: "UTC", advanced: true, showWhen: { operation: ["createMeeting"] } },
      { key: "password",  label: "Passcode",     type: "text", advanced: true, showWhen: { operation: ["createMeeting", "updateMeeting"] } },
      { key: "userId",    label: "Host User ID", type: "text", default: "me", advanced: true, showWhen: { operation: ["createMeeting", "listMeetings"] } },
    ],
    output: "id, topic, join_url, start_url, start_time",
  },
};

export function getConfigSchema(backendType) {
  return CONFIG_SCHEMAS[backendType] || null;
}
