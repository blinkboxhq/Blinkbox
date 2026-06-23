import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, ArrowLeft, ChevronRight, Zap, AppWindow, Server } from "lucide-react";
import useWorkspaceStore from "../../../store/workspaceStore";
import { TRIGGER_VARIANTS } from "../triggerVariants";
import { playNodeLand } from "../../../lib/sounds";

const CORE_KEYS = ["manual", "cron", "webhook", "chat", "error"];

const TRIGGER_CATEGORIES = [
  {
    id: "events",
    label: "Events",
    icon: Server,
    description: "Infrastructure, monitoring & system triggers",
    accent: "#34d399",
    keys: [
      "imap", "rss", "database",
      "http_monitor", "port_monitor", "dns", "ssl",
      "price_alert", "ssh", "docker", "virustotal",
    ],
  },
  {
    id: "app_events",
    label: "App Events",
    icon: AppWindow,
    description: "SaaS & platform integrations",
    accent: "#38bdf8",
    keys: [
      "slack", "discord", "telegram", "whatsapp", "gmail", "outlook", "teams",
      "github", "github_issue", "gitlab", "stripe", "shopify", "notion", "airtable",
      "google_calendar", "google_sheets", "google_drive", "google_docs", "google_forms",
      "hubspot", "linear", "jira", "trello", "asana", "pipedrive",
      "clickup", "monday", "typeform", "figma",
      "sentry", "vercel", "netlify", "pagerduty", "datadog",
      "zendesk", "calendly", "mailchimp", "intercom", "woocommerce",
      "azure_devops", "onedrive", "sharepoint",
      "instagram", "tiktok", "mastodon", "youtube", "reddit", "hackernews", "producthunt",
    ],
  },
];

const ALL_TRIGGERS  = Object.entries(TRIGGER_VARIANTS).map(([key, v]) => ({ id: key, ...v }));
const CORE_TRIGGERS = CORE_KEYS.map((k) => ALL_TRIGGERS.find((t) => t.id === k)).filter(Boolean);

export default function TriggerPicker() {
  const [page, setPage]         = useState("home");
  const [search, setSearch]     = useState("");
  const [focusIdx, setFocusIdx] = useState(0);
  const inputRef = useRef(null);

  const addNode              = useWorkspaceStore((s) => s.addNode);
  const nodes                = useWorkspaceStore((s) => s.nodes);
  const setTriggerPickerOpen = useWorkspaceStore((s) => s.setTriggerPickerOpen);
  const setSelectedNodeId    = useWorkspaceStore((s) => s.setSelectedNodeId);

  useEffect(() => { inputRef.current?.focus(); }, [page]);

  const close = useCallback(() => setTriggerPickerOpen(false), [setTriggerPickerOpen]);

  const commit = useCallback((trigger) => {
    const existingTriggers = nodes.filter((n) => n.data?.type === "trigger");
    const position = existingTriggers.length > 0
      ? { x: existingTriggers[existingTriggers.length - 1].position.x, y: existingTriggers[existingTriggers.length - 1].position.y + 220 }
      : { x: 400, y: 300 };
    const newId = `${trigger.id}-${crypto.randomUUID()}`;
    addNode({ id: newId, type: "custom", position, data: { backendType: trigger.backendType, label: trigger.label, type: "trigger", config: { triggerVariant: trigger.id } } });
    playNodeLand();
    close();
    setSelectedNodeId(newId);
  }, [addNode, nodes, close, setSelectedNodeId]);

  const currentCat = TRIGGER_CATEGORIES.find((c) => c.id === page);

  const baseTriggers = currentCat
    ? currentCat.keys.map((k) => ALL_TRIGGERS.find((t) => t.id === k)).filter(Boolean)
    : ALL_TRIGGERS;

  const query = search.trim().toLowerCase();
  const visibleTriggers = query
    ? ALL_TRIGGERS.filter((t) => t.label.toLowerCase().includes(query) || t.backendType?.includes(query))
    : page === "home"
    ? CORE_TRIGGERS
    : baseTriggers;

  useEffect(() => { setFocusIdx(0); }, [search, page]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        if (page !== "home") { setPage("home"); setSearch(""); return; }
        if (search) { setSearch(""); return; }
        close();
        return;
      }
      const list = visibleTriggers;
      if (!list) return;
      if (e.key === "ArrowDown") { e.preventDefault(); setFocusIdx((i) => Math.min(i + 1, list.length - 1)); }
      if (e.key === "ArrowUp")   { e.preventDefault(); setFocusIdx((i) => Math.max(i - 1, 0)); }
      if (e.key === "Enter" && list[focusIdx]) commit(list[focusIdx]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, visibleTriggers, focusIdx, commit, page, search]);

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={close} />
      <div
        className="fixed top-14 right-0 bottom-0 z-50 flex flex-col bg-neutral-950 border-l border-white/[0.12]"
        style={{ width: "clamp(300px, 28vw, 420px)" }}
      >
        {/* Search bar */}
        <div className="px-3 py-3 border-b border-white/[0.08] shrink-0 flex items-center gap-2">
          {page !== "home" && (
            <button onClick={() => { setPage("home"); setSearch(""); }}
              className="flex items-center justify-center w-8 h-8 text-neutral-500 hover:text-white transition-colors shrink-0">
              <ArrowLeft size={15} />
            </button>
          )}
          <div className="flex-1 flex items-center gap-2.5 px-3 h-9 rounded-lg border border-white/[0.1] bg-white/[0.06] backdrop-blur-md focus-within:border-white/[0.22] focus-within:bg-white/[0.09] transition-all">
            <Search size={13} className="text-neutral-500 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); if (page !== "home") setPage("home"); }}
              placeholder={currentCat ? `Search in ${currentCat.label}…` : "Search triggers…"}
              className="flex-1 bg-transparent text-[13px] text-white outline-none placeholder:text-neutral-600 font-medium"
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-neutral-600 hover:text-white transition-colors">
                <X size={12} />
              </button>
            )}
          </div>
          <button onClick={close}
            className="flex items-center justify-center w-8 h-8 text-neutral-600 hover:text-white transition-colors shrink-0">
            <X size={14} />
          </button>
        </div>

        {/* Category label strip */}
        {currentCat && !query && (
          <div className="flex items-center gap-2.5 px-5 py-2.5 border-b border-white/[0.06] shrink-0">
            <currentCat.icon size={13} style={{ color: currentCat.accent }} />
            <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: currentCat.accent }}>
              {currentCat.label}
            </span>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "#222 transparent" }}>
          {query ? (
            visibleTriggers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Search size={24} className="text-neutral-700" />
                <p className="text-[12px] text-neutral-600">No triggers match "{search}"</p>
              </div>
            ) : (
              visibleTriggers.map((t, i) => (
                <TriggerRow key={t.id} trigger={t} focused={i === focusIdx}
                  onHover={() => setFocusIdx(i)} onSelect={() => commit(t)} />
              ))
            )
          ) : page === "home" ? (
            <>
              {CORE_TRIGGERS.map((t, i) => (
                <TriggerRow key={t.id} trigger={t} focused={i === focusIdx}
                  onHover={() => setFocusIdx(i)} onSelect={() => commit(t)} />
              ))}

              <div className="border-t border-white/[0.05] my-1" />

              {TRIGGER_CATEGORIES.map((cat) => {
                const count = cat.keys.filter((k) => TRIGGER_VARIANTS[k]).length;
                const CatIcon = cat.icon;
                return (
                  <button key={cat.id} onClick={() => setPage(cat.id)}
                    className="relative flex items-center gap-4 w-full px-5 py-4 hover:bg-white/[0.04] transition-colors text-left group">
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: cat.accent }} />
                    <CatIcon size={21} strokeWidth={1.6} className="shrink-0 text-white/70 group-hover:text-white transition-colors" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-semibold text-white leading-tight">{cat.label}</div>
                      <div className="text-[11px] text-neutral-600 mt-0.5">{cat.description} · {count}</div>
                    </div>
                    <ChevronRight size={14} className="text-neutral-700 shrink-0 group-hover:text-neutral-400 transition-colors" />
                  </button>
                );
              })}
            </>
          ) : (
            baseTriggers.map((t, i) => (
              <TriggerRow key={t.id} trigger={t} focused={i === focusIdx}
                onHover={() => setFocusIdx(i)} onSelect={() => commit(t)} />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-5 py-3 border-t border-white/[0.06] flex items-center gap-2">
          <Zap size={11} className="text-neutral-700" />
          <span className="text-[11px] text-neutral-700">{ALL_TRIGGERS.length} triggers</span>
          <span className="text-[10px] text-neutral-800 ml-auto">ESC {page !== "home" ? "back" : "close"}</span>
        </div>
      </div>
    </>
  );
}

function TriggerRow({ trigger, focused, onHover, onSelect }) {
  const rowRef = useRef(null);
  useEffect(() => { if (focused) rowRef.current?.scrollIntoView({ block: "nearest" }); }, [focused]);

  const Icon = trigger.icon;
  return (
    <button
      ref={rowRef}
      onClick={onSelect}
      onMouseEnter={onHover}
      className={`flex items-center gap-4 w-full pl-5 pr-4 py-3.5 transition-colors text-left group relative ${
        focused ? "bg-white/[0.05]" : "hover:bg-white/[0.04]"
      }`}
    >
      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity bg-white/40" />
      <div className="w-5 h-5 shrink-0 flex items-center justify-center">
        {trigger.logoUrl ? (
          <img src={trigger.logoUrl} alt={trigger.label} className="w-5 h-5 object-contain"
            style={trigger.imgFilter ? { filter: trigger.imgFilter } : undefined} />
        ) : (
          <Icon size={20} strokeWidth={1.7} className="text-neutral-500 group-hover:text-neutral-300 transition-colors" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold text-white leading-tight">{trigger.label}</div>
        {trigger.description && (
          <div className="text-[11px] text-neutral-600 mt-0.5 truncate">{trigger.description}</div>
        )}
      </div>
    </button>
  );
}
