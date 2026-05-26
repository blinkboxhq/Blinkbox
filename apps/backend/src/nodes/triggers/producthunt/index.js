import axios from "axios";

export default {
  async run(config, input) {
    if (input?.posts || input?.post) {
      const post = input?.post ?? input?.posts?.[0] ?? input;
      return normalizePost(post);
    }
    const tag = config.tag || "artificial-intelligence";
    const limit = Math.min(config.limit || 10, 20);
    const query = `{
      posts(first: ${limit}, topic: "${tag}", order: VOTES) {
        edges { node {
          id name tagline description url
          votesCount commentsCount
          thumbnail { url }
          topics { edges { node { name } } }
          makers { name }
          createdAt
        }}
      }
    }`;
    const { data } = await axios.post("https://api.producthunt.com/v2/api/graphql",
      { query },
      { headers: { Authorization: `Bearer ${config.accessToken || config.apiToken}`, "Content-Type": "application/json" }, timeout: 10000 }
    );
    const posts = (data?.data?.posts?.edges ?? []).map(e => normalizePost(e.node));
    return { posts, count: posts.length, tag, triggeredAt: new Date().toISOString() };
  },
};

function normalizePost(p) {
  return {
    id: p?.id, name: p?.name, tagline: p?.tagline, description: p?.description,
    url: p?.url, thumbnailUrl: p?.thumbnail?.url,
    votes: p?.votesCount, comments: p?.commentsCount,
    topics: (p?.topics?.edges ?? []).map(e => e.node?.name),
    makers: (p?.makers ?? []).map(m => m.name),
    createdAt: p?.createdAt,
  };
}
