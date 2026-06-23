export default {
  backendType: "twitter",
  label: "Twitter / X",
  description: "Post tweets, search, and manage Twitter/X content via API v2.",
  fields: [
    { name: "credentialId", type: "credential", label: "Twitter / X Credential", accentColor: "#1DA1F2" },
    {
      name: "operation", type: "options", label: "Operation", cols: 2, default: "postTweet",
      options: [
        { value: "postTweet",    label: "Post Tweet" },
        { value: "replyTweet",   label: "Reply to Tweet" },
        { value: "deleteTweet",  label: "Delete Tweet" },
        { value: "likeTweet",    label: "Like Tweet" },
        { value: "getUserTweets",label: "Get User Tweets" },
        { value: "getUser",      label: "Get User" },
        { value: "searchTweets", label: "Search Tweets" },
      ],
    },

    { name: "text", type: "string", label: "Tweet Text", smart: true, multiline: true, placeholder: "Tweet content (max 280 chars)", show: { operation: ["postTweet", "replyTweet"] } },
    { name: "replyToId", type: "string", label: "Reply To Tweet ID", smart: true, optional: true, hint: "Tweet ID to reply to", show: { operation: "postTweet" } },
    { name: "tweetId", type: "string", label: "Tweet ID", smart: true, show: { operation: ["replyTweet", "deleteTweet", "likeTweet"] } },

    { name: "userId", type: "string", label: "User ID", smart: true, optional: true, show: { operation: "getUserTweets" } },
    { name: "username", type: "string", label: "Username", smart: true, optional: true, hint: "Either userId or username", show: { operation: "getUserTweets" } },
    { name: "limit", type: "number", label: "Limit", default: 10, show: { operation: ["getUserTweets", "searchTweets"] } },

    { name: "username", type: "string", label: "Username", smart: true, placeholder: "elonmusk", show: { operation: "getUser" } },

    { name: "query", type: "string", label: "Search Query", smart: true, placeholder: "AI from:OpenAI -is:retweet", show: { operation: "searchTweets" } },
    {
      name: "sortOrder", type: "options", label: "Sort Order", cols: 2, default: "recency",
      options: [
        { value: "recency",   label: "Recency" },
        { value: "relevancy", label: "Relevancy" },
      ],
      show: { operation: "searchTweets" },
    },
  ],
  outputs: ["tweet", "tweets", "user", "deleted"],
};
