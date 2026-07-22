import { useEffect, useMemo, useState } from "react";
import { Check, Search, ShieldCheck, Wrench } from "lucide-react";
import { ConfigLabel, ConfigBanner, BB_ACCENT } from "@/components/ui/ConfigKit";
import useIntegrationActions from "@/hooks/useIntegrationActions";

const MAX_DEFAULT = 5;

/**
 * Checklist of the operations this app exposes to a connected AI Agent.
 * Ticking nothing means "recommended only" — every op would balloon the tool
 * schema and the agent's token bill, so the default set stays small.
 */
export default function AgentActionPicker({ type, value = [], onChange, accentColor = BB_ACCENT }) {
  const { actions, loading } = useIntegrationActions(type);
  const [query, setQuery] = useState("");

  const selected = Array.isArray(value) ? value : [];
  // Seed = the app's own recommended ops, padded to MAX_DEFAULT with the first
  // few it lists. Handing an agent all 30 operations triples the tool schema.
  const recommended = useMemo(() => {
    const keys = actions.filter((a) => a.recommended).map((a) => a.key);
    for (const a of actions) {
      if (keys.length >= MAX_DEFAULT) break;
      if (!keys.includes(a.key)) keys.push(a.key);
    }
    return keys.slice(0, MAX_DEFAULT);
  }, [actions]);
  const effective = selected.length ? selected : recommended;

  useEffect(() => {
    if (!loading && !selected.length && recommended.length) onChange(recommended);
  }, [loading, recommended.join("|")]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return actions;
    return actions.filter(
      (a) => a.key.toLowerCase().includes(q) || a.label.toLowerCase().includes(q)
    );
  }, [actions, query]);

  const scopes = useMemo(() => {
    const set = new Set();
    for (const a of actions) {
      if (!effective.includes(a.key)) continue;
      for (const s of a.scopes || []) set.add(s);
    }
    return [...set];
  }, [actions, effective]);

  const toggle = (key) => {
    const base = selected.length ? selected : recommended;
    const next = base.includes(key) ? base.filter((k) => k !== key) : [...base, key];
    onChange(next);
  };

  if (!loading && !actions.length) return null;

  return (
    <div className="flex flex-col">
      <ConfigLabel
        icon={Wrench}
        action={
          <span className="text-[9px] font-mono text-neutral-600 tabular-nums">
            {effective.length}/{actions.length}
          </span>
        }
      >
        Agent Actions
      </ConfigLabel>

      {loading ? (
        <div className="bb-glow-border rounded-md bg-[#0f0f0f] border border-[#2b2b2b] px-3 py-4 text-[10px] font-mono text-neutral-600">
          Loading actions…
        </div>
      ) : (
        <>
          {actions.length > 8 && (
            <div className="bb-glow-border flex items-center gap-2 mb-2 rounded-md bg-[#0f0f0f] border border-[#3b3b3b] px-3 py-2">
              <Search className="w-3 h-3 text-neutral-600 shrink-0" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search actions…"
                className="w-full bg-transparent outline-none text-[11.5px] font-mono text-neutral-100 placeholder-neutral-600"
              />
            </div>
          )}

          <div className="bb-glow-border rounded-md bg-[#0f0f0f] border border-[#2b2b2b] max-h-[260px] overflow-y-auto divide-y divide-[#1c1c1c]">
            {filtered.map((a) => {
              const on = effective.includes(a.key);
              return (
                <button
                  key={a.key}
                  type="button"
                  onClick={() => toggle(a.key)}
                  className="w-full flex items-start gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-white/[0.03]"
                >
                  <span
                    className="w-3.5 h-3.5 rounded-[4px] border flex items-center justify-center shrink-0 mt-0.5 transition-colors"
                    style={{
                      borderColor: on ? accentColor : "#3b3b3b",
                      backgroundColor: on ? accentColor : "transparent",
                    }}
                  >
                    {on && <Check className="w-2.5 h-2.5 text-black" strokeWidth={3} />}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[11px] font-mono text-neutral-200 truncate">{a.label}</span>
                    {a.description && (
                      <span className="block text-[9px] font-mono text-neutral-600 mt-0.5 leading-relaxed">
                        {a.description}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
            {!filtered.length && (
              <div className="px-3 py-4 text-[10px] font-mono text-neutral-600">No matching actions</div>
            )}
          </div>

          {scopes.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className="flex items-center gap-1 text-[9px] font-mono text-neutral-600 uppercase tracking-[0.18em]">
                <ShieldCheck className="w-3 h-3" /> Access
              </span>
              {scopes.map((s) => (
                <span
                  key={s}
                  className="text-[9px] font-mono text-neutral-400 bg-[#0f0f0f] border border-[#2b2b2b] rounded px-1.5 py-0.5"
                >
                  {s.split("/").pop()}
                </span>
              ))}
            </div>
          )}

          <ConfigBanner>
            {`The agent can only run the ${effective.length} ticked action${effective.length === 1 ? "" : "s"} — one credential covers them all.`}
          </ConfigBanner>
        </>
      )}
    </div>
  );
}
