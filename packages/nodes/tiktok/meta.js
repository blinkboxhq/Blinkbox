export default {
  backendType: "tiktok",
  label: "TikTok",
  description: "Read videos and user data via TikTok v2 API",
  fields: [
    { name: "credentialId", label: "TikTok OAuth Credential", type: "credential", accentColor: "zinc", placeholder: "Select TikTok credential…" },
    { name: "operation", label: "Operation", type: "options", cols: 2, default: "listVideos", options: [
      { value: "listVideos",  label: "List Videos" },
      { value: "getUserInfo", label: "Get User Info" },
      { value: "getVideo",    label: "Get Video" },
      { value: "searchVideos",label: "Search Videos" },
    ]},
    { name: "videoId", label: "Video ID", type: "string", smart: true, placeholder: "{{upstream.id}}", show: { operation: "getVideo" } },
    { name: "query", label: "Query", type: "string", smart: true, placeholder: "search term...", show: { operation: "searchVideos" } },
    { name: "limit", label: "Limit", type: "string", smart: true, placeholder: "20", show: { operation: ["listVideos","searchVideos"] } },
  ],
  outputs: ["videos / userInfo / video"],
};
