/**
 * Credit gateway — picks the metering backend once, at boot.
 *
 * Cloud deployments talk to WorkspaceUsage directly. Self-hosted instances have
 * no billing collection of their own, so the same two calls go over HTTP to the
 * Blinkbox cloud. Callers (cursor.executor.js) import from here and never need
 * to know which one is live.
 */

import { SELF_HOSTED } from "../config/env.js";
import * as local from "./credit.engine.js";
import * as remote from "./credit.remote.js";

const impl = SELF_HOSTED ? remote : local;

if (SELF_HOSTED) {
  console.log("[Credits] self-hosted mode — metering against Blinkbox cloud");
}

export const checkCredits = impl.checkCredits;
export const deductCredits = impl.deductCredits;
export const getNodeCost = impl.getNodeCost;
