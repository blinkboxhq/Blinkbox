export default {
  backendType: "youtube",
  label: "YouTube",
  description: "Upload videos, search, and manage YouTube content via Data API v3.",
  fields: [
    { name: "credentialId", type: "credential", label: "YouTube Credential", accentColor: "#FF0000" },
    {
      name: "operation", type: "options", label: "Operation", cols: 2, default: "searchVideos",
      options: [
        { value: "uploadVideo",       label: "Upload Video" },
        { value: "searchVideos",      label: "Search Videos" },
        { value: "getVideo",          label: "Get Video" },
        { value: "listChannelVideos", label: "List Channel Videos" },
        { value: "getChannel",        label: "Get Channel" },
        { value: "listPlaylists",     label: "List Playlists" },
        { value: "getComments",       label: "Get Comments" },
      ],
    },

    { name: "videoPath", type: "string", label: "Video Path or URL", smart: true, placeholder: "/tmp/video.mp4 or URL", show: { operation: "uploadVideo" } },
    { name: "title", type: "string", label: "Title", smart: true, show: { operation: "uploadVideo" } },
    { name: "description", type: "string", label: "Description", smart: true, multiline: true, optional: true, show: { operation: "uploadVideo" } },
    { name: "categoryId", type: "string", label: "Category ID", smart: true, optional: true, default: "22", hint: "22=People&Blogs, 28=Science&Technology", show: { operation: "uploadVideo" } },
    {
      name: "privacyStatus", type: "options", label: "Privacy", cols: 3, default: "public",
      options: [
        { value: "public",   label: "Public" },
        { value: "private",  label: "Private" },
        { value: "unlisted", label: "Unlisted" },
      ],
      show: { operation: "uploadVideo" },
    },
    { name: "tags", type: "string", label: "Tags", smart: true, optional: true, hint: "Comma-separated", show: { operation: "uploadVideo" } },

    { name: "q", type: "string", label: "Search Query", smart: true, placeholder: "Search query", show: { operation: "searchVideos" } },
    { name: "maxResults", type: "number", label: "Max Results", default: 10, show: { operation: ["searchVideos", "listPlaylists"] } },
    {
      name: "order", type: "options", label: "Order", cols: 2, default: "relevance",
      options: [
        { value: "relevance", label: "Relevance" },
        { value: "date",      label: "Date" },
        { value: "viewCount", label: "View Count" },
        { value: "rating",    label: "Rating" },
      ],
      show: { operation: "searchVideos" },
    },
    { name: "channelId", type: "string", label: "Channel ID", smart: true, optional: true, show: { operation: "searchVideos" } },

    { name: "videoId", type: "string", label: "Video ID", smart: true, show: { operation: ["getVideo", "getComments"] } },

    { name: "channelId", type: "string", label: "Channel ID", smart: true, show: { operation: "listChannelVideos" } },
    { name: "maxResults", type: "number", label: "Max Results", default: 10, show: { operation: "listChannelVideos" } },
    {
      name: "order", type: "options", label: "Order", cols: 3, default: "date",
      options: [
        { value: "date",      label: "Date" },
        { value: "viewCount", label: "View Count" },
        { value: "rating",    label: "Rating" },
      ],
      show: { operation: "listChannelVideos" },
    },

    { name: "channelId", type: "string", label: "Channel ID", smart: true, optional: true, hint: "Leave blank for authenticated user's channel", show: { operation: "getChannel" } },

    { name: "channelId", type: "string", label: "Channel ID", smart: true, optional: true, show: { operation: "listPlaylists" } },

    { name: "maxResults", type: "number", label: "Max Results", default: 20, show: { operation: "getComments" } },
    {
      name: "order", type: "options", label: "Order", cols: 2, default: "time",
      options: [
        { value: "time",      label: "Time" },
        { value: "relevance", label: "Relevance" },
      ],
      show: { operation: "getComments" },
    },
  ],
  outputs: ["video", "videos", "channel", "playlists", "comments", "videoId"],
};
