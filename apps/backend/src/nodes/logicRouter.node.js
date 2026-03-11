/**
 * LOGIC ROUTER NODE — Traffic Cop for Workflows
 *
 * Evaluates $json conditions and dynamically routes the execution cursor
 * to Path A, Path B, Path C, or a default fallback.
 *
 * Unlike the old if_condition (binary true/false), the Logic Router supports
 * unlimited named paths. The executor reads `__routedPath` from the output
 * and only follows edges whose label matches.
 *
 * Config:
 *   routes: [
 *     { path: "high_value",  operator: "gt",       left: "{{ $json.amount }}", right: 1000 },
 *     { path: "medium",      operator: "gt",       left: "{{ $json.amount }}", right: 100 },
 *     { path: "low_value" }  // No condition = catch-all / default
 *   ]
 *
 * Evaluation:
 *   - Routes are evaluated in order (first match wins)
 *   - A route with no operator/condition is the default fallback
 *   - Output includes `__routedPath` for the edge router
 *
 * Edge wiring:
 *   - Edges from this node should have condition: { path: "high_value" }
 *   - The condition evaluator checks __routedPath === edge.condition.path
 */

import { evaluateCondition } from "../modules/automation/engine/condition.evaluator.js";

export default {
  async run(config, input) {
    const { routes = [] } = config;

    if (routes.length === 0) {
      // No routes configured — pass everything through as "default"
      return { ...input, __routedPath: "default", __conditionMatched: true };
    }

    for (const route of routes) {
      // A route with no operator is the default/fallback
      if (!route.operator) {
        return {
          ...input,
          __routedPath: route.path || "default",
          __conditionMatched: true,
        };
      }

      const condition = {
        operator: route.operator,
        left: route.left,
        right: route.right,
      };

      if (evaluateCondition(condition, input)) {
        return {
          ...input,
          __routedPath: route.path || "default",
          __conditionMatched: true,
        };
      }
    }

    // No route matched and no fallback defined
    return {
      ...input,
      __routedPath: "none",
      __conditionMatched: false,
    };
  },
};
