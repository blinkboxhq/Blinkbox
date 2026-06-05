export default {
  backendType: "notion",
  label: "Notion",
  description: "Create and query Notion pages, databases, and blocks.",
  fields: [
    { name: "credentialId", label: "Credential", type: "credential", accentColor: "#000000" },
    { name: "_authNotice", label: "", type: "notice", level: "info", text: "Connect Notion via OAuth or Internal Integration Token" },
    { name: "operation", label: "Operation", type: "options", cols: 2, default: "createPage", options: [
      { value: "createPage",     label: "Create Page" },
      { value: "updatePage",     label: "Update Page" },
      { value: "getPage",        label: "Get Page" },
      { value: "queryDatabase",  label: "Query Database" },
      { value: "appendBlock",    label: "Append Block" },
      { value: "searchPages",    label: "Search Pages" },
      { value: "createDatabase", label: "Create Database" },
      { value: "deletePage",     label: "Delete Page" },
    ]},

    { name: "parentId", label: "Parent ID", type: "string", smart: true, placeholder: "Page or Database ID", show: { operation: ["createPage", "createDatabase"] } },
    { name: "title", label: "Title", type: "string", smart: true, show: { operation: ["createPage", "createDatabase"] } },
    { name: "content", label: "Content", type: "string", smart: true, multiline: true, optional: true, hint: "Plain text content", show: { operation: ["createPage"] } },
    { name: "icon", label: "Icon", type: "string", smart: true, optional: true, placeholder: "🚀", show: { operation: ["createPage", "updatePage"] } },
    { name: "cover", label: "Cover URL", type: "string", smart: true, optional: true, placeholder: "Image URL", show: { operation: ["createPage"] } },

    { name: "pageId", label: "Page ID", type: "string", smart: true, show: { operation: ["updatePage", "getPage", "appendBlock", "deletePage"] } },

    { name: "updateTitle", label: "Title", type: "string", smart: true, optional: true, show: { operation: ["updatePage"] } },
    { name: "archived", label: "Archived", type: "boolean", show: { operation: ["updatePage"] } },

    { name: "databaseId", label: "Database ID", type: "string", smart: true, show: { operation: ["queryDatabase"] } },
    { name: "filter", label: "Filter", type: "string", smart: true, multiline: true, optional: true, hint: "JSON Notion filter object", show: { operation: ["queryDatabase"] } },
    { name: "sorts", label: "Sorts", type: "string", smart: true, optional: true, hint: "JSON Notion sorts array", show: { operation: ["queryDatabase"] } },
    { name: "queryLimit", label: "Limit", type: "number", default: 100, show: { operation: ["queryDatabase"] } },

    { name: "blockType", label: "Block Type", type: "options", cols: 3, default: "paragraph", options: [
      { value: "paragraph",     label: "Paragraph" },
      { value: "heading1",      label: "Heading 1" },
      { value: "heading2",      label: "Heading 2" },
      { value: "heading3",      label: "Heading 3" },
      { value: "bulletedList",  label: "Bulleted List" },
      { value: "numberedList",  label: "Numbered List" },
      { value: "todo",          label: "To-do" },
      { value: "code",          label: "Code" },
    ], show: { operation: ["appendBlock"] } },
    { name: "blockContent", label: "Content", type: "string", smart: true, multiline: true, show: { operation: ["appendBlock"] } },

    { name: "searchQuery", label: "Search Query", type: "string", smart: true, placeholder: "Search term", show: { operation: ["searchPages"] } },
    { name: "searchLimit", label: "Limit", type: "number", default: 10, show: { operation: ["searchPages"] } },

    { name: "dbProperties", label: "Properties Schema", type: "string", smart: true, multiline: true, hint: "JSON Notion properties schema", show: { operation: ["createDatabase"] } },
  ],
  outputs: ["page", "pages", "results", "database"],
};
