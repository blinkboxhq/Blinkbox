import { useEffect, useState } from "react";
import api from "@/lib/api";

const cache = new Map();

/**
 * Every operation an integration exposes, straight from the backend manifest —
 * the same list the AI Agent turns into tools, so the checklist can never drift.
 */
export default function useIntegrationActions(type) {
  const [state, setState] = useState(() => cache.get(type) || null);

  useEffect(() => {
    let alive = true;
    if (!type) return;
    if (cache.has(type)) {
      setState(cache.get(type));
      return;
    }
    setState(null);
    api
      .get(`/api/integrations/${type}/actions`)
      .then((res) => {
        const actions = res.data?.actions;
        if (!alive || !Array.isArray(actions)) return;
        const payload = {
          actions,
          defaultOperation: res.data?.defaultOperation || null,
          resources: Array.isArray(res.data?.resources) ? res.data.resources : [],
        };
        cache.set(type, payload);
        setState(payload);
      })
      .catch(() => {
        if (alive) setState({ actions: [], defaultOperation: null, resources: [] });
      });
    return () => {
      alive = false;
    };
  }, [type]);

  return {
    actions: state?.actions || [],
    defaultOperation: state?.defaultOperation || null,
    resources: state?.resources || [],
    loading: state === null && Boolean(type),
  };
}
