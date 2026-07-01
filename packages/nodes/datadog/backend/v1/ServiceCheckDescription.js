/**
 * Datadog — Service Checks.
 */
import { need, num, csv } from "../GenericFunctions.js";

async function opPostServiceCheck(config, { v1 }) {
  let e = need(config, "checkName", "postServiceCheck"); if (e) return e;
  e = need(config, "hostName", "postServiceCheck"); if (e) return e;
  const body = {
    check: config.checkName,
    host_name: config.hostName,
    status: num(config.status, 0),
    message: config.message || "",
  };
  if (config.tags) body.tags = csv(config.tags);
  const { data } = await v1.post("/check_run", body);
  return { success: true, status: data.status };
}

export const serviceCheckOperations = {
  postServiceCheck: opPostServiceCheck,
};
