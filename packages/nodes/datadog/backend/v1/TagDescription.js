/**
 * Datadog — Host Tags.
 */
import { need, csv } from "../GenericFunctions.js";

async function opGetHostTags(config, { v1 }) {
  const e = need(config, "hostName", "getHostTags"); if (e) return e;
  const { data } = await v1.get(`/tags/hosts/${encodeURIComponent(config.hostName)}`);
  return { success: true, tags: data.tags, host: data.host };
}

async function opAddHostTags(config, { v1 }) {
  let e = need(config, "hostName", "addHostTags"); if (e) return e;
  e = need(config, "tags", "addHostTags"); if (e) return e;
  const { data } = await v1.post(`/tags/hosts/${encodeURIComponent(config.hostName)}`, { tags: csv(config.tags) });
  return { success: true, ...data };
}

export const tagOperations = {
  getHostTags: opGetHostTags,
  addHostTags: opAddHostTags,
};
