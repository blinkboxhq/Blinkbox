export default {
  backendType: "instagram",
  label: "Instagram",
  description: "Read posts, media and user data via Meta Graph API.",
  fields: [
    { name: "credentialId", type: "credential", label: "Instagram Credential", accentColor: "#E1306C" },
    { type: "notice", level: "warning", text: "Requires Instagram Business or Creator account connected via Facebook" },
    {
      name: "operation", type: "options", label: "Operation", cols: 2, default: "getUserInfo",
      options: [
        { value: "getUserInfo",  label: "Get User Info" },
        { value: "getUserMedia", label: "Get User Media" },
        { value: "getMedia",     label: "Get Media" },
        { value: "createPost",   label: "Create Post" },
        { value: "getComments",  label: "Get Comments" },
      ],
    },

    {
      name: "fields", type: "multiOptions", label: "Fields", default: ["id", "username", "followers_count"],
      options: [
        { value: "id",                  label: "ID" },
        { value: "username",            label: "Username" },
        { value: "name",                label: "Name" },
        { value: "biography",           label: "Biography" },
        { value: "followers_count",     label: "Followers Count" },
        { value: "following_count",     label: "Following Count" },
        { value: "media_count",         label: "Media Count" },
        { value: "profile_picture_url", label: "Profile Picture URL" },
        { value: "website",             label: "Website" },
      ],
      show: { operation: "getUserInfo" },
    },

    {
      name: "fields", type: "multiOptions", label: "Fields", default: ["id", "caption", "media_url", "timestamp"],
      options: [
        { value: "id",             label: "ID" },
        { value: "caption",        label: "Caption" },
        { value: "media_type",     label: "Media Type" },
        { value: "media_url",      label: "Media URL" },
        { value: "timestamp",      label: "Timestamp" },
        { value: "like_count",     label: "Like Count" },
        { value: "comments_count", label: "Comments Count" },
      ],
      show: { operation: "getUserMedia" },
    },
    { name: "limit", type: "number", label: "Limit", default: 12, show: { operation: "getUserMedia" } },

    { name: "mediaId", type: "string", label: "Media ID", smart: true, show: { operation: ["getMedia", "getComments"] } },
    { name: "limit", type: "number", label: "Limit", default: 20, show: { operation: "getComments" } },

    { name: "imageUrl", type: "string", label: "Image URL", smart: true, placeholder: "Publicly accessible image URL", show: { operation: "createPost" } },
    { name: "caption", type: "string", label: "Caption", smart: true, multiline: true, optional: true, show: { operation: "createPost" } },
  ],
  outputs: ["user", "media", "mediaId", "post", "comments"],
};
