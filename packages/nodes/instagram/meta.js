export default {
  backendType: "instagram",
  label: "Instagram",
  description: "Read posts, media and user data via Meta Graph API",
  fields: [
    { name: "credentialId", label: "Instagram OAuth Credential", type: "credential", accentColor: "pink", placeholder: "Select Instagram credential…" },
    { name: "operation", label: "Operation", type: "options", cols: 2, default: "getUserMedia", options: [
      { value: "getUserMedia", label: "Get User Media" },
      { value: "getUserInfo",  label: "Get User Info" },
      { value: "getMedia",     label: "Get Single Media" },
      { value: "createPost",   label: "Create Post" },
      { value: "getComments",  label: "Get Comments" },
    ]},
    { name: "mediaId", label: "Media ID", type: "string", smart: true, placeholder: "{{upstream.id}}", show: { operation: ["getMedia","getComments"] } },
    { name: "userId", label: "User ID", type: "string", smart: true, placeholder: "{{upstream.userId}}", show: { operation: "createPost" } },
    { name: "imageUrl", label: "Image URL", type: "string", smart: true, placeholder: "https://example.com/image.jpg", show: { operation: "createPost" } },
    { name: "caption", label: "Caption", type: "string", smart: true, placeholder: "Post caption...", show: { operation: "createPost" } },
    { name: "limit", label: "Limit", type: "string", smart: true, placeholder: "20", show: { operation: ["getUserMedia","getComments"] } },
  ],
};
