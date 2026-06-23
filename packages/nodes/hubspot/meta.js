export default {
  backendType: "hubspot",
  label: "HubSpot",
  description: "Manage contacts, deals, companies, and notes in HubSpot CRM.",
  fields: [
    { name: "credentialId", label: "Credential", type: "credential", accentColor: "#FF7A59" },
    { name: "operation", label: "Operation", type: "options", cols: 2, default: "createContact", options: [
      { value: "createContact",    label: "Create Contact" },
      { value: "getContact",       label: "Get Contact" },
      { value: "updateContact",    label: "Update Contact" },
      { value: "deleteContact",    label: "Delete Contact" },
      { value: "searchContacts",   label: "Search Contacts" },
      { value: "listContacts",     label: "List Contacts" },
      { value: "createDeal",       label: "Create Deal" },
      { value: "getDeal",          label: "Get Deal" },
      { value: "updateDeal",       label: "Update Deal" },
      { value: "createCompany",    label: "Create Company" },
      { value: "addNote",          label: "Add Note" },
      { value: "createNote",       label: "Create Note" },
      { value: "associateObjects", label: "Associate Objects" },
      { value: "listOwners",       label: "List Owners" },
    ]},

    { name: "email", label: "Email", type: "string", smart: true, show: { operation: ["createContact"] } },
    { name: "firstName", label: "First Name", type: "string", smart: true, optional: true, show: { operation: ["createContact", "updateContact"] } },
    { name: "lastName", label: "Last Name", type: "string", smart: true, optional: true, show: { operation: ["createContact", "updateContact"] } },
    { name: "phone", label: "Phone", type: "string", smart: true, optional: true, show: { operation: ["createContact", "updateContact"] } },
    { name: "company", label: "Company", type: "string", smart: true, optional: true, show: { operation: ["createContact", "updateContact"] } },
    { name: "jobTitle", label: "Job Title", type: "string", smart: true, optional: true, show: { operation: ["createContact"] } },

    { name: "contactId", label: "Contact ID", type: "string", smart: true, placeholder: "HubSpot contact ID", show: { operation: ["getContact", "updateContact", "deleteContact"] } },

    { name: "query", label: "Search Query", type: "string", smart: true, placeholder: "email or name", show: { operation: ["searchContacts"] } },

    { name: "limit", label: "Limit", type: "number", default: 100, show: { operation: ["listContacts"] } },
    { name: "after", label: "After (Cursor)", type: "string", smart: true, optional: true, hint: "Cursor for pagination", show: { operation: ["listContacts"] } },

    { name: "dealName", label: "Deal Name", type: "string", smart: true, show: { operation: ["createDeal", "updateDeal"] } },
    { name: "amount", label: "Amount", type: "string", smart: true, optional: true, show: { operation: ["createDeal", "updateDeal"] } },
    { name: "closeDate", label: "Close Date", type: "string", smart: true, optional: true, placeholder: "2024-12-31", show: { operation: ["createDeal", "updateDeal"] } },
    { name: "pipeline", label: "Pipeline", type: "string", smart: true, optional: true, placeholder: "default", show: { operation: ["createDeal"] } },
    { name: "dealStage", label: "Deal Stage", type: "string", smart: true, optional: true, placeholder: "appointmentscheduled", show: { operation: ["createDeal", "updateDeal"] } },

    { name: "dealId", label: "Deal ID", type: "string", smart: true, show: { operation: ["getDeal", "updateDeal"] } },

    { name: "companyName", label: "Company Name", type: "string", smart: true, show: { operation: ["createCompany"] } },
    { name: "domain", label: "Domain", type: "string", smart: true, optional: true, placeholder: "acme.com", show: { operation: ["createCompany"] } },
    { name: "companyPhone", label: "Phone", type: "string", smart: true, optional: true, show: { operation: ["createCompany"] } },
    { name: "city", label: "City", type: "string", smart: true, optional: true, show: { operation: ["createCompany"] } },

    { name: "body", label: "Note Body", type: "string", smart: true, multiline: true, show: { operation: ["addNote", "createNote"] } },
    { name: "noteContactId", label: "Contact ID (optional)", type: "string", smart: true, optional: true, show: { operation: ["addNote", "createNote"] } },
    { name: "noteDealId", label: "Deal ID (optional)", type: "string", smart: true, optional: true, show: { operation: ["addNote", "createNote"] } },

    { name: "fromObjectType", label: "From Object Type", type: "options", cols: 2, options: [
      { value: "contact", label: "Contact" },
      { value: "deal",    label: "Deal" },
      { value: "company", label: "Company" },
      { value: "ticket",  label: "Ticket" },
    ], show: { operation: ["associateObjects"] } },
    { name: "fromObjectId", label: "From Object ID", type: "string", smart: true, show: { operation: ["associateObjects"] } },
    { name: "toObjectType", label: "To Object Type", type: "options", cols: 2, options: [
      { value: "contact", label: "Contact" },
      { value: "deal",    label: "Deal" },
      { value: "company", label: "Company" },
      { value: "ticket",  label: "Ticket" },
    ], show: { operation: ["associateObjects"] } },
    { name: "toObjectId", label: "To Object ID", type: "string", smart: true, show: { operation: ["associateObjects"] } },
    { name: "associationType", label: "Association Type", type: "string", smart: true, default: "contact_to_company", show: { operation: ["associateObjects"] } },
  ],
  outputs: ["contact", "contacts", "deal", "deals", "company", "note", "owners"],
};
