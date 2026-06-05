export default {
  backendType: "salesforce",
  label: "Salesforce",
  description: "Create, read, update, delete, and query Salesforce records via the REST API.",
  fields: [
    { name: "credentialId", label: "Credential", type: "credential", accentColor: "#00A1E0" },
    { name: "_notice", label: "", type: "notice", level: "info", text: "Use OAuth Connected App credentials — store access token + instance URL" },
    { name: "operation", label: "Operation", type: "options", cols: 2, default: "queryRecords", options: [
      { value: "createRecord",   label: "Create Record" },
      { value: "getRecord",      label: "Get Record" },
      { value: "updateRecord",   label: "Update Record" },
      { value: "deleteRecord",   label: "Delete Record" },
      { value: "queryRecords",   label: "Query Records" },
      { value: "searchRecords",  label: "Search Records" },
      { value: "upsertRecord",   label: "Upsert Record" },
      { value: "listObjects",    label: "List Objects" },
      { value: "describeObject", label: "Describe Object" },
    ]},

    { name: "objectType", label: "Object Type", type: "string", smart: true, placeholder: "Contact", hint: "Salesforce object API name", show: { operation: ["createRecord", "getRecord", "updateRecord", "deleteRecord", "upsertRecord", "describeObject"] } },

    { name: "fields", label: "Fields (JSON)", type: "string", smart: true, multiline: true, hint: "JSON object of field values: {FirstName: John, Email: ...}", show: { operation: ["createRecord"] } },

    { name: "recordId", label: "Record ID", type: "string", smart: true, placeholder: "Salesforce 18-char ID", show: { operation: ["getRecord", "updateRecord", "deleteRecord"] } },

    { name: "updateFields", label: "Fields (JSON)", type: "string", smart: true, multiline: true, hint: "JSON object of fields to update", show: { operation: ["updateRecord"] } },

    { name: "soql", label: "SOQL Query", type: "string", smart: true, multiline: true, default: "SELECT Id, Name FROM Contact LIMIT 10", hint: "SOQL query", show: { operation: ["queryRecords"] } },

    { name: "sosl", label: "SOSL Query", type: "string", smart: true, multiline: true, default: "FIND {search term} IN ALL FIELDS RETURNING Contact(Id, Name)", show: { operation: ["searchRecords"] } },

    { name: "externalIdField", label: "External ID Field", type: "string", smart: true, placeholder: "External_Id__c", show: { operation: ["upsertRecord"] } },
    { name: "externalId", label: "External ID Value", type: "string", smart: true, show: { operation: ["upsertRecord"] } },
    { name: "upsertFields", label: "Fields (JSON)", type: "string", smart: true, multiline: true, show: { operation: ["upsertRecord"] } },
  ],
  outputs: ["record", "records", "id", "objects"],
};
