export default {
  backendType: "intercom",
  label: "Intercom",
  description: "Manage contacts, conversations, events, and tags in Intercom.",
  fields: [
    { name: "credentialId", label: "Credential", type: "credential", accentColor: "#1F8EED" },
    { name: "operation", label: "Operation", type: "options", cols: 2, default: "createContact", options: [
      { value: "createContact",       label: "Create Contact" },
      { value: "getContact",          label: "Get Contact" },
      { value: "updateContact",       label: "Update Contact" },
      { value: "archiveContact",      label: "Archive Contact" },
      { value: "listContacts",        label: "List Contacts" },
      { value: "searchContacts",      label: "Search Contacts" },
      { value: "createConversation",  label: "Create Conversation" },
      { value: "getConversation",     label: "Get Conversation" },
      { value: "replyConversation",   label: "Reply to Conversation" },
      { value: "listConversations",   label: "List Conversations" },
      { value: "closeConversation",   label: "Close Conversation" },
      { value: "sendMessage",         label: "Send Message" },
      { value: "createEvent",         label: "Create Event" },
      { value: "addTag",              label: "Add Tag" },
      { value: "tagContact",          label: "Tag Contact" },
    ]},

    { name: "email", label: "Email", type: "string", smart: true, show: { operation: ["createContact"] } },
    { name: "name", label: "Name", type: "string", smart: true, optional: true, show: { operation: ["createContact", "updateContact"] } },
    { name: "phone", label: "Phone", type: "string", smart: true, optional: true, show: { operation: ["createContact", "updateContact"] } },
    { name: "role", label: "Role", type: "options", cols: 2, default: "user", options: [
      { value: "user", label: "User" },
      { value: "lead", label: "Lead" },
    ], show: { operation: ["createContact"] } },
    { name: "externalId", label: "External ID", type: "string", smart: true, optional: true, show: { operation: ["createContact"] } },

    { name: "contactId", label: "Contact ID", type: "string", smart: true, show: { operation: ["getContact", "updateContact", "archiveContact"] } },

    { name: "updateEmail", label: "Email", type: "string", smart: true, optional: true, show: { operation: ["updateContact"] } },

    { name: "listContactsLimit", label: "Limit", type: "number", default: 50, show: { operation: ["listContacts"] } },

    { name: "searchQuery", label: "Search Query", type: "string", smart: true, placeholder: "email or name", show: { operation: ["searchContacts"] } },

    { name: "userId", label: "User ID", type: "string", smart: true, show: { operation: ["createConversation"] } },
    { name: "conversationBody", label: "Message Body", type: "string", smart: true, multiline: true, show: { operation: ["createConversation"] } },

    { name: "conversationId", label: "Conversation ID", type: "string", smart: true, show: { operation: ["getConversation", "replyConversation", "closeConversation"] } },

    { name: "replyBody", label: "Reply Body", type: "string", smart: true, multiline: true, show: { operation: ["replyConversation"] } },
    { name: "replyType", label: "Reply As", type: "options", cols: 2, default: "admin", options: [
      { value: "user",  label: "User" },
      { value: "admin", label: "Admin" },
    ], show: { operation: ["replyConversation"] } },
    { name: "replyAdminId", label: "Admin ID", type: "string", smart: true, optional: true, show: { operation: ["replyConversation"] } },

    { name: "listConvState", label: "State", type: "options", cols: 3, default: "open", options: [
      { value: "open",    label: "Open" },
      { value: "closed",  label: "Closed" },
      { value: "snoozed", label: "Snoozed" },
    ], show: { operation: ["listConversations"] } },
    { name: "listConvLimit", label: "Limit", type: "number", default: 20, show: { operation: ["listConversations"] } },

    { name: "closeAdminId", label: "Admin ID", type: "string", smart: true, show: { operation: ["closeConversation"] } },

    { name: "msgTo", label: "To", type: "string", smart: true, placeholder: "user@email.com", show: { operation: ["sendMessage"] } },
    { name: "msgSubject", label: "Subject", type: "string", smart: true, optional: true, show: { operation: ["sendMessage"] } },
    { name: "msgBody", label: "Message Body", type: "string", smart: true, multiline: true, show: { operation: ["sendMessage"] } },
    { name: "msgFrom", label: "From (Admin ID)", type: "string", smart: true, optional: true, placeholder: "Admin ID", show: { operation: ["sendMessage"] } },

    { name: "eventUserId", label: "User ID", type: "string", smart: true, show: { operation: ["createEvent"] } },
    { name: "eventName", label: "Event Name", type: "string", smart: true, show: { operation: ["createEvent"] } },
    { name: "createdAt", label: "Created At", type: "string", smart: true, optional: true, placeholder: "ISO timestamp", show: { operation: ["createEvent"] } },
    { name: "metadata", label: "Metadata (JSON)", type: "string", smart: true, multiline: true, optional: true, hint: "JSON object", show: { operation: ["createEvent"] } },

    { name: "tagContactId", label: "Contact ID", type: "string", smart: true, show: { operation: ["addTag", "tagContact"] } },
    { name: "tagName", label: "Tag Name", type: "string", smart: true, placeholder: "VIP", show: { operation: ["addTag", "tagContact"] } },
  ],
  outputs: ["contact", "contacts", "conversation", "conversations", "event"],
};
