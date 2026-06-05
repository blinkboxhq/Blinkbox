export default {
  backendType: "reddit",
  label: "Reddit",
  description: "List posts, get post details, submit posts, and search Reddit.",
  fields: [
    { name: "credentialId", type: "credential", label: "Reddit Credential", accentColor: "#FF4500" },
    {
      name: "operation", type: "options", label: "Operation", cols: 2, default: "listPosts",
      options: [
        { value: "listPosts",  label: "List Posts" },
        { value: "getPost",    label: "Get Post" },
        { value: "submitPost", label: "Submit Post" },
        { value: "search",     label: "Search" },
      ],
    },

    { name: "subreddit", type: "string", label: "Subreddit", smart: true, placeholder: "programming", show: { operation: "listPosts" } },
    {
      name: "sort", type: "options", label: "Sort", cols: 2, default: "hot",
      options: [
        { value: "hot",    label: "Hot" },
        { value: "new",    label: "New" },
        { value: "top",    label: "Top" },
        { value: "rising", label: "Rising" },
      ],
      show: { operation: "listPosts" },
    },
    { name: "limit", type: "number", label: "Limit", default: 25, show: { operation: "listPosts" } },
    {
      name: "time", type: "options", label: "Time Range", cols: 3, default: "day",
      options: [
        { value: "hour",  label: "Hour" },
        { value: "day",   label: "Day" },
        { value: "week",  label: "Week" },
        { value: "month", label: "Month" },
        { value: "year",  label: "Year" },
        { value: "all",   label: "All Time" },
      ],
      show: { operation: "listPosts", sort: ["top"] },
    },

    { name: "postId", type: "string", label: "Post ID", smart: true, placeholder: "abc123", show: { operation: "getPost" } },

    { name: "subreddit", type: "string", label: "Subreddit", smart: true, show: { operation: "submitPost" } },
    { name: "title", type: "string", label: "Title", smart: true, show: { operation: "submitPost" } },
    {
      name: "kind", type: "options", label: "Post Type", cols: 2, default: "self",
      options: [
        { value: "self", label: "Text" },
        { value: "link", label: "Link" },
      ],
      show: { operation: "submitPost" },
    },
    { name: "text", type: "string", label: "Text", smart: true, multiline: true, show: { operation: "submitPost", kind: "self" } },
    { name: "url", type: "string", label: "URL", smart: true, show: { operation: "submitPost", kind: "link" } },
    { name: "nsfw", type: "boolean", label: "NSFW", default: false, show: { operation: "submitPost" } },
    { name: "spoiler", type: "boolean", label: "Spoiler", default: false, show: { operation: "submitPost" } },

    { name: "query", type: "string", label: "Search Query", smart: true, show: { operation: "search" } },
    { name: "subreddit", type: "string", label: "Subreddit", smart: true, optional: true, hint: "Leave blank to search all", show: { operation: "search" } },
    {
      name: "sort", type: "options", label: "Sort", cols: 2, default: "relevance",
      options: [
        { value: "relevance", label: "Relevance" },
        { value: "hot",       label: "Hot" },
        { value: "top",       label: "Top" },
        { value: "new",       label: "New" },
      ],
      show: { operation: "search" },
    },
    { name: "limit", type: "number", label: "Limit", default: 25, show: { operation: "search" } },
  ],
  outputs: ["posts", "post", "id", "url"],
};
