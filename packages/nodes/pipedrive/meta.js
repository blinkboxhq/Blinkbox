export default {
  backendType: "pipedrive",
  label: "Pipedrive",
  description: "Manage persons, deals, activities, and notes in Pipedrive CRM.",
  fields: [
    { name: "credentialId", label: "Credential", type: "credential", accentColor: "#006064" },
    { name: "operation", label: "Operation", type: "options", cols: 2, default: "createPerson", options: [
      { value: "createPerson",    label: "Create Person" },
      { value: "listPersons",     label: "List Persons" },
      { value: "updatePerson",    label: "Update Person" },
      { value: "createDeal",      label: "Create Deal" },
      { value: "getDeal",         label: "Get Deal" },
      { value: "listDeals",       label: "List Deals" },
      { value: "updateDeal",      label: "Update Deal" },
      { value: "searchDeals",     label: "Search Deals" },
      { value: "createActivity",  label: "Create Activity" },
      { value: "listActivities",  label: "List Activities" },
      { value: "createNote",      label: "Create Note" },
    ]},

    { name: "name", label: "Name", type: "string", smart: true, show: { operation: ["createPerson"] } },
    { name: "personEmail", label: "Email", type: "string", smart: true, optional: true, show: { operation: ["createPerson"] } },
    { name: "personPhone", label: "Phone", type: "string", smart: true, optional: true, show: { operation: ["createPerson"] } },
    { name: "orgId", label: "Organization ID", type: "string", smart: true, optional: true, placeholder: "Organization ID", show: { operation: ["createPerson", "createDeal"] } },

    { name: "listPersonsLimit", label: "Limit", type: "number", default: 100, show: { operation: ["listPersons"] } },
    { name: "searchTerm", label: "Search Term", type: "string", smart: true, optional: true, show: { operation: ["listPersons"] } },

    { name: "personId", label: "Person ID", type: "string", smart: true, show: { operation: ["updatePerson"] } },
    { name: "updatePersonName", label: "Name", type: "string", smart: true, optional: true, show: { operation: ["updatePerson"] } },
    { name: "updatePersonEmail", label: "Email", type: "string", smart: true, optional: true, show: { operation: ["updatePerson"] } },
    { name: "updatePersonPhone", label: "Phone", type: "string", smart: true, optional: true, show: { operation: ["updatePerson"] } },

    { name: "title", label: "Deal Title", type: "string", smart: true, show: { operation: ["createDeal"] } },
    { name: "dealPersonId", label: "Person ID", type: "string", smart: true, optional: true, placeholder: "Person ID", show: { operation: ["createDeal"] } },
    { name: "value", label: "Value", type: "string", smart: true, optional: true, show: { operation: ["createDeal"] } },
    { name: "currency", label: "Currency", type: "string", smart: true, optional: true, default: "USD", show: { operation: ["createDeal"] } },
    { name: "stageId", label: "Stage ID", type: "string", smart: true, optional: true, placeholder: "Pipeline stage ID", show: { operation: ["createDeal"] } },

    { name: "dealId", label: "Deal ID", type: "string", smart: true, show: { operation: ["getDeal", "updateDeal"] } },

    { name: "listDealsStatus", label: "Status", type: "options", cols: 2, default: "open", options: [
      { value: "open", label: "Open" },
      { value: "won",  label: "Won" },
      { value: "lost", label: "Lost" },
      { value: "all",  label: "All" },
    ], show: { operation: ["listDeals"] } },
    { name: "listDealsLimit", label: "Limit", type: "number", default: 100, show: { operation: ["listDeals"] } },

    { name: "updateDealTitle", label: "Deal Title", type: "string", smart: true, optional: true, show: { operation: ["updateDeal"] } },
    { name: "updateDealStatus", label: "Status", type: "options", cols: 3, options: [
      { value: "open", label: "Open" },
      { value: "won",  label: "Won" },
      { value: "lost", label: "Lost" },
    ], show: { operation: ["updateDeal"] } },
    { name: "updateDealValue", label: "Value", type: "string", smart: true, optional: true, show: { operation: ["updateDeal"] } },

    { name: "searchTerm2", label: "Search Term", type: "string", smart: true, show: { operation: ["searchDeals"] } },

    { name: "subject", label: "Subject", type: "string", smart: true, show: { operation: ["createActivity"] } },
    { name: "activityType", label: "Type", type: "options", cols: 3, default: "task", options: [
      { value: "call",      label: "Call" },
      { value: "email",     label: "Email" },
      { value: "meeting",   label: "Meeting" },
      { value: "lunch",     label: "Lunch" },
      { value: "task",      label: "Task" },
      { value: "deadline",  label: "Deadline" },
      { value: "follow-up", label: "Follow-up" },
    ], show: { operation: ["createActivity"] } },
    { name: "activityDealId", label: "Deal ID", type: "string", smart: true, optional: true, show: { operation: ["createActivity"] } },
    { name: "activityPersonId", label: "Person ID", type: "string", smart: true, optional: true, show: { operation: ["createActivity"] } },
    { name: "dueDate", label: "Due Date", type: "string", smart: true, optional: true, placeholder: "2024-12-31", show: { operation: ["createActivity"] } },

    { name: "done", label: "Done", type: "boolean", default: false, show: { operation: ["listActivities"] } },
    { name: "listActivitiesLimit", label: "Limit", type: "number", default: 100, show: { operation: ["listActivities"] } },

    { name: "noteContent", label: "Content", type: "string", smart: true, multiline: true, show: { operation: ["createNote"] } },
    { name: "noteDealId", label: "Deal ID", type: "string", smart: true, optional: true, show: { operation: ["createNote"] } },
    { name: "notePersonId", label: "Person ID", type: "string", smart: true, optional: true, show: { operation: ["createNote"] } },
  ],
  outputs: ["person", "persons", "deal", "deals", "activity", "note"],
};
