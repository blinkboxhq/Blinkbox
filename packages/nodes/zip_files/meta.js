export default {
  backendType: "zip_files",
  label: "Zip / Unzip Files",
  description: "Compress or extract archives (zip, tar, tar.gz)",
  fields: [
    { name: "mode", label: "Mode", type: "options", cols: 2, default: "zip", options: [
      { value: "zip",   label: "Compress (Zip)" },
      { value: "unzip", label: "Extract (Unzip)" },
    ]},
    { name: "files", label: "Files to Compress (JSON array)", type: "string", smart: true, multiline: true,
      placeholder: '{{ $json.files }}  or  [{"name":"report.pdf","content":"base64..."}]',
      hint: 'Array of { name, content (base64/text/url) } objects', show: { mode: "zip" } },
    { name: "format", label: "Archive Format", type: "options", cols: 3, default: "zip", options: [
      { value: "zip",    label: ".zip" },
      { value: "tar",    label: ".tar" },
      { value: "tar.gz", label: ".tar.gz" },
    ], show: { mode: "zip" } },
    { type: "row", show: { mode: "zip" }, fields: [
      { name: "outputName", label: "Output Filename", type: "string", smart: true, placeholder: "archive.zip" },
      { name: "compression", label: "Compression Level (0-9)", type: "number", default: 6, min: 0, max: 9 },
    ]},
    { name: "zipInput", label: "Archive (URL or base64)", type: "string", smart: true, placeholder: "{{ $json.zipFile }}", show: { mode: "unzip" } },
    { name: "extractPath", label: "Extract Files Matching (glob)", type: "string", smart: false, mono: true, placeholder: "*.pdf  or  reports/*", show: { mode: "unzip" } },
    { name: "password", label: "Password (optional)", type: "string", smart: false, placeholder: "Encrypt/decrypt archive" },
    { name: "outputField", label: "Output Field", type: "string", smart: false, mono: true, default: "zipFile" },
  ],
  outputs: ["zipFile / files", "filename", "size", "fileCount"],
};
