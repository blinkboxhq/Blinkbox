import axios from "axios";

const TIMEOUT = 15000;

export default {
  async run(config, input) {
    const date = config.date || new Date().toISOString().split("T")[0];
    const limit = parseInt(config.limit || 10);
    const query = `{ posts(order: VOTES, postedAfter: "${date}T00:00:00+00:00", first: ${limit}) { edges { node { id name tagline votesCount commentsCount website thumbnail { url } } } } }`;
    try {
      const res = await axios.post("https://api.producthunt.com/v2/api/graphql", { query }, {
        headers: { Authorization: `Bearer ${config.apiKey || process.env.PRODUCTHUNT_API_KEY || ""}`, "Content-Type": "application/json" },
        timeout: TIMEOUT,
      });
      const posts = (res.data.data?.posts?.edges || []).map((e) => e.node);
      return { posts, count: posts.length, date };
    } catch (err) {
      throw new Error(`producthunt: ${err.response?.data?.errors?.[0]?.message || err.message}`);
    }
  },
};
