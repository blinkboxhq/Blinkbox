import { redis } from "./redis.client.js";
import { acquireLock, releaseLock } from "./redis.lock.js";
import Automation from "../models/automation.model.js";
import { resolveSecret } from "../utils/resolveSecret.js";

const SEEN_TTL = 7 * 24 * 60 * 60;
const SNAP_TTL = 7 * 24 * 60 * 60;
const lc = (s) => String(s ?? "").toLowerCase();

// Each event is a predicate over the current post (`p`), its previous snapshot
// (`prev`, may be null) and config (`c`). Vote/comment counts mutate during the
// launch day, so `changeAware` events dedup on a changing token to re-fire as the
// numbers climb; `needsPrev` events stay quiet until a baseline snapshot exists.
const PH_EVENTS = {
  new_launch:       { needsPrev: false, dedup: (p) => `${p.id}`, match: () => true },
  name_contains:    { needsPrev: false, dedup: (p) => `${p.id}`, match: (p, _v, c) => lc(p.name).includes(lc(c.targetValue)) },
  tagline_contains: { needsPrev: false, dedup: (p) => `${p.id}`, match: (p, _v, c) => lc(p.tagline).includes(lc(c.targetValue)) },
  by_maker:         { needsPrev: false, dedup: (p) => `${p.id}`, match: (p, _v, c) => lc(p.makerUsername) === lc(c.targetValue).replace(/^@/, "") || lc(p.maker).includes(lc(c.targetValue)) },
  in_topic:         { needsPrev: false, dedup: (p) => `${p.id}`, match: (p, _v, c) => (p.topics || []).some((t) => lc(t).includes(lc(c.targetValue))) },
  ai_product:       { needsPrev: false, dedup: (p) => `${p.id}`, match: (p) => `${lc(p.name)} ${lc(p.tagline)} ${(p.topics || []).map(lc).join(" ")}`.match(/\bai\b|artificial intelligence|gpt|llm/) != null },
  votes_over:       { needsPrev: false, changeAware: true, dedup: (p) => `${p.id}:v${p.votesCount}`, match: (p, _v, c) => Number(p.votesCount) >= Number(c.targetValue || 0) },
  comments_over:    { needsPrev: false, changeAware: true, dedup: (p) => `${p.id}:c${p.commentsCount}`, match: (p, _v, c) => Number(p.commentsCount) >= Number(c.targetValue || 0) },
  new_vote:         { needsPrev: true,  changeAware: true, dedup: (p) => `${p.id}:v${p.votesCount}`, match: (p, prev) => Number(p.votesCount) > Number(prev.votesCount || 0) },
  new_comment:      { needsPrev: true,  changeAware: true, dedup: (p) => `${p.id}:c${p.commentsCount}`, match: (p, prev) => Number(p.commentsCount) > Number(prev.commentsCount || 0) },
  trending:         { needsPrev: true,  changeAware: true, dedup: (p) => `${p.id}:trend`, match: (p, prev, c) => Number(p.votesCount) >= Number(c.targetValue || 500) && Number(prev.votesCount || 0) < Number(c.targetValue || 500) },
  has_website:      { needsPrev: false, dedup: (p) => `${p.id}`, match: (p) => !!p.website },
};

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

export async function pollProductHunt(automationId, triggerNodeId, cfg) {
  const scope = triggerNodeId || automationId;
  const lockKey = `bb:producthunt:lock:${scope}`;
  const locked = await acquireLock(lockKey, "poller", 60);
  if (!locked) return;

  try {
    const { apiKey: rawApiKey, category, minVotes } = cfg;
    const eventType = cfg.eventType || cfg.watchType || "new_launch";
    const spec = PH_EVENTS[eventType] || PH_EVENTS.new_launch;
    if (!rawApiKey) return;

    const automation = await Automation.findOne({ _id: automationId, active: true });
    if (!automation) return;
    const apiKey = await resolveSecret(rawApiKey, automation.workspaceId?.toString(), "Product Hunt trigger");

    const raw = await fetchProductHuntPosts(apiKey, category, minVotes);
    if (!raw.length) return;

    const posts = raw.map((post) => ({
      id: post.id, name: post.name, slug: post.slug,
      tagline: post.tagline, description: post.description,
      votesCount: post.votesCount, commentsCount: post.commentsCount,
      thumbnail: post.thumbnail?.url, website: post.website,
      maker: post.user?.name, makerUsername: post.user?.username,
      topics: (post.topics?.edges || []).map(e => e.node?.name),
      url: post.url, createdAt: post.createdAt,
    }));

    const snapKey = `bb:producthunt:snap:${scope}`;
    const prevRaw = await redis.get(snapKey);
    const prevSnap = prevRaw ? JSON.parse(prevRaw) : {};
    const firstSync = !prevRaw;
    const nextSnap = {};
    for (const p of posts) nextSnap[p.id] = { votesCount: p.votesCount, commentsCount: p.commentsCount };
    await redis.set(snapKey, JSON.stringify(nextSnap), "EX", SNAP_TTL);

    // Only "new_launch" needs to skip the first sync — every post in that initial
    // pull would otherwise look "new". Content predicates (name_contains, by_maker,
    // ai_product, etc.) describe the post itself, not its novelty, so they fire on
    // first sync too.
    if (firstSync && (spec.needsPrev || eventType === "new_launch")) return;

    const { executeAutomation } = await import("../modules/automation/automation.executor.js");

    const seenKey = `bb:producthunt:seen:${scope}:${eventType}`;
    for (const post of posts) {
      const prev = prevSnap[post.id] || null;
      if (spec.needsPrev && !prev) continue;
      if (!spec.match(post, prev, cfg)) continue;

      const added = await redis.sadd(seenKey, spec.dedup(post));
      if (!added) continue;
      await redis.expire(seenKey, SEEN_TTL);
      try {
        await executeAutomation(automation, post, { workspaceId: automation.workspaceId, entryNodeId: triggerNodeId || automation.entryNodeId, idempotencyKey: `producthunt:${scope}:${eventType}:${spec.dedup(post)}` });
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
