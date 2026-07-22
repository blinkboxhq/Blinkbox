export default {
  backendType: "file_upload",
  label: "File Upload",
  description: "Upload a file to an S3 bucket or a pre-signed HTTP endpoint.",
  fields: [
    { name: "destination", label: "Destination", type: "options", cols: 2, default: "s3", options: [
      { value: "s3",   label: "Amazon S3",     desc: "Put an object into a bucket" },
      { value: "http", label: "HTTP (PUT)",    desc: "Upload to a pre-signed URL" },
    ]},

    { name: "base64", label: "File Content", type: "string", smart: true, multiline: true, required: true, placeholder: "{{ $json.base64 }}", hint: "Base64-encoded file data — usually piped from a previous node." },
    { name: "filename", label: "Filename", type: "string", smart: true, default: "upload", placeholder: "report.pdf" },
    { name: "contentType", label: "Content Type", type: "string", smart: true, default: "application/octet-stream", placeholder: "application/pdf" },

    { name: "uploadUrl", label: "Upload URL", type: "string", smart: true, placeholder: "https://…?X-Amz-Signature=…", hint: "Pre-signed URL that accepts a PUT.", show: { destination: ["http"] } },

    { name: "credentialId", label: "AWS Credential", type: "credential", accentColor: "#FF9900", show: { destination: ["s3"] } },
    { name: "bucket", label: "Bucket", type: "string", smart: true, placeholder: "my-bucket", show: { destination: ["s3"] } },
    { name: "key", label: "Object Key", type: "string", smart: true, optional: true, placeholder: "invoices/2026/report.pdf", hint: "Defaults to the filename.", show: { destination: ["s3"] } },
    { name: "region", label: "Region", type: "string", smart: false, default: "us-east-1", placeholder: "us-east-1", show: { destination: ["s3"] } },
  ],
  outputs: ["success", "destination", "url", "bucket", "key", "filename", "status"],
};
