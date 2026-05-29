export default {
  backendType: "file_download",
  label: "File Download",
  description: "Download any file into the workflow payload",
  fields: [
    { name: "url", label: "URL", type: "string", smart: true, placeholder: "{{ $json.downloadUrl }}" },
    { name: "outputAs", label: "Output As", type: "options", cols: 4, default: "base64", options: [
      { value: "base64", label: "Base64" },
      { value: "text",   label: "Text" },
      { value: "json",   label: "JSON" },
      { value: "binary", label: "Buffer" },
    ]},
    { type: "row", fields: [
      { name: "outputField", label: "Output Field", type: "string", smart: false, mono: true, default: "fileContent" },
      { name: "filename", label: "Save as Filename", type: "string", smart: true, placeholder: "file.pdf" },
    ]},
    { name: "headers", label: "Extra Headers (JSON)", type: "string", smart: true, multiline: true, placeholder: '{ "Authorization": "Bearer {{ $json.token }}" }' },
    { type: "row", fields: [
      { name: "timeout", label: "Timeout (s)", type: "number", default: 30, min: 1, max: 300 },
      { name: "followRedirects", label: "Follow Redirects", type: "boolean", default: true },
    ]},
  ],
  outputs: ["fileContent", "contentType", "size", "filename", "statusCode"],
};
