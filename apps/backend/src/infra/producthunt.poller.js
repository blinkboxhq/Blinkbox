import { redis } from "./redis.client.js";
import { acquireLock, releaseLock } from "./redis.lock.js";
import Automation from "../models/automation.model.js";

const SEEN_TTL = 7 * 24 * 60 * 60;

async function fetchProductHuntPosts(apiKey, category, minVotes) {
  const query = `query {
    posts(order: RANKING, first: 20${category && category !== "all" ? `, topic: "${category}"` : ""}) {
      edges {
        node {
          id slug name tagline description
          votesCount commentsCount
          thumbnail { url }
          website
          user { name username }
          topics { edges { node { name } } }
          createdAt
          url
        }
      }
    }
  }`;

  const headers = { "Content-Type": "application/json", Accept: "application/json" };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const res = await fetch("https://api.producthunt.com/v2/api/graphql", {
    method: "POST",
    headers,
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`Product Hunt API ${res.status}`);
  const data = await res.json();
  if (data.errors) throw new Error(`Product Hunt: ${data.errors[0]?.message}`);

  return (data.data?.posts?.edges || [])
    .map(e => e.node)
    .filter(p => !minVotes || p.votesCount >= parseInt(minVotes) || 0);
}

export async function pollProductHunt(automationId, cfg) {
  const lockKey = `bb:producthunt:lock:${automationId}`;
  const locked = await acquireLock(lockKey, "poller", 60);
  if (!locked) return;

  try {
    const { apiKey, category, minVotes } = cfg;
    const posts = await fetchProductHuntPosts(apiKey, category, minVotes);
    if (!posts.length) return;

    const { executeAutomation } = await import("../modules/automation/automation.executor.js");
    const automation = await Automation.findOne({ _id: automationId, active: true });
    if (!automation) return;

    const seenKey = `bb:producthunt:seen:${automationId}`;
    for (const post of posts) {
      const added = await redis.sadd(seenKey, post.id);
      if (!added) continue;
      await redis.expire(seenKey, SEEN_TTL);
      try {
        await executeAutomation(automation, {
          id: post.id, name: post.name, slug: post.slug,
          tagline: post.tagline, description: post.description,
          votesCount: post.votesCount, commentsCount: post.commentsCount,
          thumbnail: post.thumbnail?.url, website: post.website,
          maker: post.user?.name, makerUsername: post.user?.username,
          topics: (post.topics?.edges || []).map(e => e.node?.name),
          url: post.url, createdAt: post.createdAt,
        }, { workspaceId: automation.workspaceId, idempotencyKey: `producthunt:${automation._id}:${post.id}` });
      } catch (err) {
        console.error(`[ProductHuntPoller] Failed for "${automation.name}":`, err.message);
      }
    }
  } catch (err) {
    console.warn(`[ProductHuntPoller] Error for ${automationId}:`, err.message);
  } finally {
    await releaseLock(lockKey, "poller");
  }
}
