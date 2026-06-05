export default {
  backendType: "tiktok",
  label: "TikTok",
  description: "Publish videos, retrieve user info and video data via TikTok API v2.",
  fields: [
    { name: "credentialId", type: "credential", label: "TikTok Credential", accentColor: "#000000" },
    {
      name: "operation", type: "options", label: "Operation", cols: 2, default: "publishVideo",
      options: [
        { value: "publishVideo", label: "Publish Video" },
        { value: "getUserInfo",  label: "Get User Info" },
        { value: "listVideos",   label: "List Videos" },
        { value: "getVideo",     label: "Get Video" },
        { value: "searchVideos", label: "Search Videos" },
      ],
    },

    { name: "videoUrl", type: "string", label: "Video URL", smart: true, placeholder: "Publicly accessible video URL", show: { operation: "publishVideo" } },
    { name: "title", type: "string", label: "Title", smart: true, show: { operation: "publishVideo" } },
    { name: "description", type: "string", label: "Description", smart: true, multiline: true, optional: true, show: { operation: "publishVideo" } },
    {
      name: "privacyLevel", type: "options", label: "Privacy Level", cols: 1, default: "PUBLIC_TO_EVERYONE",
      options: [
        { value: "PUBLIC_TO_EVERYONE",   label: "Public" },
        { value: "MUTUAL_FOLLOW_FRIENDS", label: "Friends" },
        { value: "SELF_ONLY",            label: "Private" },
      ],
      show: { operation: "publishVideo" },
    },
    { name: "disableComment", type: "boolean", label: "Disable Comments", default: false, show: { operation: "publishVideo" } },
    { name: "disableDuet", type: "boolean", label: "Disable Duet", default: false, show: { operation: "publishVideo" } },
    { name: "disableStitch", type: "boolean", label: "Disable Stitch", default: false, show: { operation: "publishVideo" } },

    {
      name: "fields", type: "multiOptions", label: "Fields", default: ["open_id", "display_name", "follower_count"],
      options: [
        { value: "open_id",           label: "Open ID" },
        { value: "display_name",      label: "Display Name" },
        { value: "avatar_url",        label: "Avatar URL" },
        { value: "profile_deep_link", label: "Profile Deep Link" },
        { value: "bio_description",   label: "Bio Description" },
        { value: "follower_count",    label: "Follower Count" },
        { value: "following_count",   label: "Following Count" },
        { value: "likes_count",       label: "Likes Count" },
        { value: "video_count",       label: "Video Count" },
      ],
      show: { operation: "getUserInfo" },
    },

    { name: "maxCount", type: "number", label: "Max Count", default: 20, show: { operation: "listVideos" } },
    {
      name: "fields", type: "multiOptions", label: "Fields", default: ["id", "title", "create_time", "view_count"],
      options: [
        { value: "id",               label: "ID" },
        { value: "title",            label: "Title" },
        { value: "video_description",label: "Description" },
        { value: "create_time",      label: "Create Time" },
        { value: "view_count",       label: "View Count" },
        { value: "like_count",       label: "Like Count" },
        { value: "comment_count",    label: "Comment Count" },
        { value: "share_count",      label: "Share Count" },
      ],
      show: { operation: "listVideos" },
    },

    { name: "videoId", type: "string", label: "Video ID", smart: true, show: { operation: "getVideo" } },
    {
      name: "fields", type: "multiOptions", label: "Fields", default: ["id", "title"],
      options: [
        { value: "id",               label: "ID" },
        { value: "title",            label: "Title" },
        { value: "video_description",label: "Description" },
        { value: "create_time",      label: "Create Time" },
        { value: "view_count",       label: "View Count" },
        { value: "like_count",       label: "Like Count" },
      ],
      show: { operation: "getVideo" },
    },

    { name: "query", type: "string", label: "Search Query", smart: true, show: { operation: "searchVideos" } },
    { name: "maxCount", type: "number", label: "Max Count", default: 20, show: { operation: "searchVideos" } },
  ],
  outputs: ["video", "videos", "user", "shareId"],
};
