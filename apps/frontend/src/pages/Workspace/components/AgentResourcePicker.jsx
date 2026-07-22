import { useEffect, useMemo, useState } from "react";
import { Check, Hash, RefreshCw, Search } from "lucide-react";
import { ConfigLabel, ConfigBanner, BB_ACCENT } from "@/components/ui/ConfigKit";
import api from "@/lib/api";

/**
 * Pins real IDs (Slack channels, …) onto an agent integration. An LLM cannot
 * invent a channel ID, so whatever is ticked here is baked into the tool schema
 * as an enum — the model picks from this list or nothing.
 */
export default function AgentResourcePicker({
  type,
  kind,
  label,
  hint,
  credentialId,
  value = [],
  onChange,
  accentColor = BB_ACCENT,
}) {
  const [options, setOptions] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [nonce, setNonce] = useState(0);
  const [query, setQuery] = useState("");

  const pinned = Array.isArray(value) ? value : [];

  useEffect(() => {
    let alive = true;
    if (!credentialId) {
      setOptions([]);
      setError("");
      return;
    }
    setLoading(true);
    setError("");
    api
      .get(`/api/integrations/${type}/resources/${kind}`, { params: { credentialId } })
      .then((res) => {
        if (!alive) return;
        setOptions(Array.isArray(res.data?.options) ? res.data.options : []);
      })
      .catch((err) => {
        if (!alive) return;
        setOptions([]);
        setError(err?.response?.data?.message || "Could not load from this account.");
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [type, kind, credentialId, nonce]);

  // Anything pinned before but missing from the fresh list still shows, so a
  // renamed or newly-private channel does not silently vanish from the agent.
  const rows = useMemo(() => {
    const byId = new Map(options.map((o) => [o.id, o]));
    for (const p of pinned) if (!byId.has(p.id)) byId.set(p.id, { ...p, stale: true });
    const all = [...byId.values()];
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter((o) => o.label?.toLowerCase().includes(q) || o.id.toLowerCase().includes(q));
  }, [options, pinned, query]);

  const toggle = (opt) => {
    const next = pinned.some((p) => p.id === opt.id)
      ? pinned.filter((p) => p.id !== opt.id)
      : [...pinned, { id: opt.id, label: opt.label }];
    onChange(next);
  };

  return (
    <div className="flex flex-col">
      <ConfigLabel
        icon={Hash}
        action={
          credentialId ? (
            <button
              type="button"
              onClick={() => setNonce((n) => n + 1)}
              className="flex items-center gap-1 text-[9px] font-mono text-neutral-600 hover:text-neutral-300 transition-colors"
            >
              <RefreshCw className={`w-2.5 h-2.5 ${loading ? "animate-spin" : ""}`} />
              {pinned.length ? `${pinned.length} pinned` : "refresh"}
            </button>
          ) : null
        }
      >
        {label}
      </ConfigLabel>

      {!credentialId ? (
        <div className="bb-glow-border rounded-md bg-[#0f0f0f] border border-[#2b2b2b] px-3 py-4 text-[10px] font-mono text-neutral-600">
          Connect an account to load {label.toLowerCase()}.
        </div>
      ) : loading && !options.length ? (
        <div className="bb-glow-border rounded-md bg-[#0f0f0f] border border-[#2b2b2b] px-3 py-4 text-[10px] font-mono text-neutral-600">
          Loading {label.toLowerCase()}…
        </div>
      ) : error && !rows.length ? (
        <div className="bb-glow-border rounded-md bg-[#0f0f0f] border border-[#3b2b2b] px-3 py-3 text-[10px] font-mono text-amber-400/80">
          {error}
        </div>
      ) : (
        <>
          {options.length > 8 && (
            <div className="bb-glow-border flex items-center gap-2 mb-2 rounded-md bg-[#0f0f0f] border border-[#3b3b3b] px-3 py-2">
              <Search className="w-3 h-3 text-neutral-600 shrink-0" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${label.toLowerCase()}…`}
                className="w-full bg-transparent outline-none text-[11.5px] font-mono text-neutral-100 placeholder-neutral-600"
              />
            </div>
          )}

          <div className="bb-glow-border rounded-md bg-[#0f0f0f] border border-[#2b2b2b] max-h-[220px] overflow-y-auto divide-y divide-[#1c1c1c]">
            {rows.map((o) => {
              const on = pinned.some((p) => p.id === o.id);
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => toggle(o)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-white/[0.03]"
                >
                  <span
                    className="w-3.5 h-3.5 rounded-[4px] border flex items-center justify-center shrink-0 transition-colors"
                    style={{
                      borderColor: on ? accentColor : "#3b3b3b",
                      backgroundColor: on ? accentColor : "transparent",
                    }}
                  >
                    {on && <Check className="w-2.5 h-2.5 text-black" strokeWidth={3} />}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[11px] font-mono text-neutral-200 truncate">{o.label}</span>
                    <span className="block text-[9px] font-mono text-neutral-600 mt-0.5">
                      {o.id}
                      {o.meta ? ` · ${o.meta}` : ""}
                      {o.stale ? " · not in this account" : ""}
                    </span>
                  </span>
                </button>
              );
            })}
            {!rows.length && (
              <div className="px-3 py-4 text-[10px] font-mono text-neutral-600">Nothing to show</div>
            )}
          </div>

          <ConfigBanner>
            {pinned.length
              ? `The agent may only use these ${pinned.length} — it gets the real IDs, not names.`
              : hint || `Pin the ${label.toLowerCase()} the agent may touch, or it has to guess.`}
          </ConfigBanner>
        </>
      )}
    </div>
  );
}
