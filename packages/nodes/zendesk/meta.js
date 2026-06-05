export default {
  backendType: "zendesk",
  label: "Zendesk",
  description: "Manage tickets, users, and support operations in Zendesk.",
  fields: [
    { name: "credentialId", label: "Credential", type: "credential", accentColor: "#03363D" },
    { name: "subdomain", label: "Subdomain", type: "string", smart: false, placeholder: "yourcompany" },
    { name: "operation", label: "Operation", type: "options", cols: 2, default: "listTickets", options: [
      { value: "listTickets",   label: "List Tickets" },
      { value: "getTicket",     label: "Get Ticket" },
      { value: "createTicket",  label: "Create Ticket" },
      { value: "updateTicket",  label: "Update Ticket" },
      { value: "replyTicket",   label: "Reply to Ticket" },
      { value: "addComment",    label: "Add Comment" },
      { value: "closeTicket",   label: "Close Ticket" },
      { value: "assignTicket",  label: "Assign Ticket" },
      { value: "searchTickets", label: "Search Tickets" },
      { value: "listUsers",     label: "List Users" },
      { value: "createUser",    label: "Create User" },
    ]},

    { name: "listStatus", label: "Status (optional)", type: "options", cols: 3, options: [
      { value: "new",     label: "New" },
      { value: "open",    label: "Open" },
      { value: "pending", label: "Pending" },
      { value: "hold",    label: "Hold" },
      { value: "solved",  label: "Solved" },
      { value: "closed",  label: "Closed" },
    ], optional: true, show: { operation: ["listTickets"] } },
    { name: "listLimit", label: "Limit", type: "number", default: 25, show: { operation: ["listTickets"] } },

    { name: "ticketId", label: "Ticket ID", type: "string", smart: true, show: { operation: ["getTicket", "updateTicket", "replyTicket", "addComment", "closeTicket", "assignTicket"] } },

    { name: "subject", label: "Subject", type: "string", smart: true, show: { operation: ["createTicket"] } },
    { name: "body", label: "Description", type: "string", smart: true, multiline: true, show: { operation: ["createTicket"] } },
    { name: "priority", label: "Priority", type: "options", cols: 2, default: "normal", options: [
      { value: "low",    label: "Low" },
      { value: "normal", label: "Normal" },
      { value: "high",   label: "High" },
      { value: "urgent", label: "Urgent" },
    ], show: { operation: ["createTicket", "updateTicket"] } },
    { name: "type", label: "Type", type: "options", cols: 2, default: "question", options: [
      { value: "question", label: "Question" },
      { value: "incident", label: "Incident" },
      { value: "problem",  label: "Problem" },
      { value: "task",     label: "Task" },
    ], show: { operation: ["createTicket"] } },
    { name: "requesterId", label: "Requester ID", type: "string", smart: true, optional: true, hint: "Requester user ID", show: { operation: ["createTicket"] } },

    { name: "updateSubject", label: "Subject", type: "string", smart: true, optional: true, show: { operation: ["updateTicket"] } },
    { name: "updateStatus", label: "Status", type: "options", cols: 3, options: [
      { value: "new",     label: "New" },
      { value: "open",    label: "Open" },
      { value: "pending", label: "Pending" },
      { value: "hold",    label: "Hold" },
      { value: "solved",  label: "Solved" },
      { value: "closed",  label: "Closed" },
    ], show: { operation: ["updateTicket"] } },
    { name: "tags", label: "Tags", type: "string", smart: true, optional: true, hint: "Comma-separated", show: { operation: ["updateTicket"] } },

    { name: "replyBody", label: "Reply Body", type: "string", smart: true, multiline: true, show: { operation: ["replyTicket", "addComment"] } },
    { name: "public", label: "Public", type: "boolean", default: true, hint: "True = public reply, False = internal note", show: { operation: ["replyTicket", "addComment"] } },

    { name: "assigneeId", label: "Assignee ID", type: "string", smart: true, placeholder: "Agent user ID", show: { operation: ["assignTicket"] } },
    { name: "groupId", label: "Group ID", type: "string", smart: true, optional: true, show: { operation: ["assignTicket"] } },

    { name: "query", label: "Search Query", type: "string", smart: true, placeholder: "status:open subject:billing", show: { operation: ["searchTickets"] } },

    { name: "userRole", label: "Role (optional)", type: "options", cols: 3, options: [
      { value: "end-user", label: "End User" },
      { value: "agent",    label: "Agent" },
      { value: "admin",    label: "Admin" },
    ], optional: true, show: { operation: ["listUsers"] } },
    { name: "usersLimit", label: "Limit", type: "number", default: 25, show: { operation: ["listUsers"] } },

    { name: "userName", label: "Name", type: "string", smart: true, show: { operation: ["createUser"] } },
    { name: "userEmail", label: "Email", type: "string", smart: true, show: { operation: ["createUser"] } },
    { name: "newUserRole", label: "Role", type: "options", cols: 2, default: "end-user", options: [
      { value: "end-user", label: "End User" },
      { value: "agent",    label: "Agent" },
    ], show: { operation: ["createUser"] } },
    { name: "userPhone", label: "Phone", type: "string", smart: true, optional: true, show: { operation: ["createUser"] } },
  ],
  outputs: ["ticket", "tickets", "user", "users"],
};
