import { useEffect, useState } from "react";
import api from "@/lib/api";

const cache = new Map();

export default function useProviderModels(provider, credentialId, fallback = []) {
  const key = `${provider}:${credentialId || ""}`;
  const [models, setModels] = useState(() => cache.get(key) || null);

  useEffect(() => {
    let alive = true;
    if (cache.has(key)) {
      setModels(cache.get(key));
      return;
    }
    setModels(null);
    api
      .get(`/api/models/${provider}`, { params: credentialId ? { credentialId } : {} })
      .then((res) => {
        const list = res.data?.models;
        if (!alive || !Array.isArray(list) || !list.length) return;
        cache.set(key, list);
        setModels(list);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [key]);

  return models?.length ? models : fallback;
}
