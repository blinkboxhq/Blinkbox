import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, ArrowLeft, ChevronRight, Zap, AppWindow, Server } from "lucide-react";
import useWorkspaceStore from "../../../store/workspaceStore";
import { TRIGGER_VARIANTS } from "../triggerVariants";
import { getTriggerEvents, eventDefaults } from "../triggerEvents";
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
  const [eventTrigger, setEventTrigger] = useState(null);
  const inputRef = useRef(null);

  const addNode              = useWorkspaceStore((s) => s.addNode);
  const nodes                = useWorkspaceStore((s) => s.nodes);
  const setTriggerPickerOpen = useWorkspaceStore((s) => s.setTriggerPickerOpen);
  const setSelectedNodeId    = useWorkspaceStore((s) => s.setSelectedNodeId);
  const addNotification      = useWorkspaceStore((s) => s.addNotification);

  useEffect(() => { inputRef.current?.focus(); }, [page]);

  const close = useCallback(() => setTriggerPickerOpen(false), [setTriggerPickerOpen]);

  const commit = useCallback((trigger, event) => {
    const existingTriggers = nodes.filter((n) => n.data?.type === "trigger");
    const position = existingTriggers.length > 0
      ? { x: existingTriggers[existingTriggers.length - 1].position.x, y: existingTriggers[existingTriggers.length - 1].position.y + 220 }
      : { x: -47, y: -47 };
    const newId = `${trigger.id}-${crypto.randomUUID()}`;
    const config = { triggerVariant: trigger.id };
    if (event) Object.assign(config, eventDefaults(trigger.id, event.id));
    const label = event ? `${trigger.label.replace(/^On /, "")}: ${event.label}` : trigger.label;
    addNode({ id: newId, type: "custom", position, data: { backendType: trigger.backendType, label, type: "trigger", config } });
    playNodeLand();
    close();
    setSelectedNodeId(newId);
  }, [addNode, nodes, close, setSelectedNodeId, addNotification]);

  const selectTrigger = useCallback((trigger) => {
    const events = getTriggerEvents(trigger.id);
    if (events) { setEventTrigger(trigger); setPage("events_of"); setSearch(""); }
    else commit(trigger);
  }, [commit]);

  const currentCat = TRIGGER_CATEGORIES.find((c) => c.id === page);

  const baseTriggers = currentCat
    ? currentCat.keys.map((k) => ALL_TRIGGERS.find((t) => t.id === k)).filter(Boolean)
    : ALL_TRIGGERS;

  const eventList = page === "events_of" && eventTrigger ? getTriggerEvents(eventTrigger.id)?.events ?? [] : null;

  const query = search.trim().toLowerCase();
  const visibleTriggers = eventList
    ? null
    : query
    ? ALL_TRIGGERS.filter((t) => t.label.toLowerCase().includes(query) || t.backendType?.includes(query))
    : page === "home"
    ? CORE_TRIGGERS
    : baseTriggers;

  useEffect(() => { setFocusIdx(0); }, [search, page]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        if (page === "events_of") { setPage("home"); setEventTrigger(null); setSearch(""); return; }
        if (page !== "home") { setPage("home"); setSearch(""); return; }
        if (search) { setSearch(""); return; }
        close();
        return;
      }
      const list = eventList || visibleTriggers;
      if (!list) return;
      if (e.key === "ArrowDown") { e.preventDefault(); setFocusIdx((i) => Math.min(i + 1, list.length - 1)); }
      if (e.key === "ArrowUp")   { e.preventDefault(); setFocusIdx((i) => Math.max(i - 1, 0)); }
      if (e.key === "Enter" && list[focusIdx]) {
        if (eventList) commit(eventTrigger, list[focusIdx]);
        else selectTrigger(list[focusIdx]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, visibleTriggers, eventList, eventTrigger, focusIdx, commit, selectTrigger, page, search]);

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={close} />
      <div
        className="bb-liquid bb-edge-left fixed top-0 right-0 bottom-0 z-50 flex flex-col"
        style={{ width: "clamp(360px, 32vw, 480px)" }}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-3 shrink-0">
          <div className="flex items-start gap-3">
            {page !== "home" && (
              <button onClick={() => { setPage("home"); setEventTrigger(null); setSearch(""); }}
                className="flex items-center justify-center w-7 h-7 -ml-1 rounded-lg text-neutral-500 hover:text-white hover:bg-white/[0.06] transition-colors shrink-0">
                <ArrowLeft size={16} />
              </button>
            )}
            <div className="flex-1 min-w-0">
              <h2 className="text-[16px] font-semibold text-white leading-tight">
                {eventList ? eventTrigger.label.replace(/^On /, "") : currentCat ? currentCat.label : "What triggers this workflow?"}
              </h2>
              <p className="text-[12px] text-neutral-500 mt-1 leading-snug">
                {eventList ? "Pick the event that starts this workflow" : currentCat ? currentCat.description : "A trigger is the step that starts your workflow"}
              </p>
            </div>
            <button onClick={close}
              className="flex items-center justify-center w-7 h-7 rounded-lg text-neutral-500 hover:text-white hover:bg-white/[0.06] transition-colors shrink-0">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div className="px-5 pb-3 shrink-0">
          <div className="bb-input bb-glow-border flex items-center gap-2.5 px-3.5 h-11 rounded-xl focus-within:border-white/[0.22] transition-all">
            <Search size={15} className="text-neutral-500 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); if (page !== "home") setPage("home"); }}
              placeholder={currentCat ? `Search in ${currentCat.label}…` : "Search triggers…"}
              className="flex-1 bg-transparent text-[14px] text-white outline-none placeholder:text-neutral-600 font-medium"
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-neutral-600 hover:text-white transition-colors">
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-3 pb-2 flex flex-col gap-0.5" style={{ scrollbarWidth: "thin", scrollbarColor: "#222 transparent" }}>
          {eventList ? (
            eventList.map((ev, i) => (
              <EventRow key={ev.id} event={ev} subject={eventTrigger} focused={i === focusIdx}
                onHover={() => setFocusIdx(i)} onSelect={() => commit(eventTrigger, ev)} />
            ))
          ) : query ? (
            visibleTriggers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Search size={24} className="text-neutral-700" />
                <p className="text-[12px] text-neutral-600">No triggers match "{search}"</p>
              </div>
            ) : (
              visibleTriggers.map((t, i) => (
                <TriggerRow key={t.id} trigger={t} focused={i === focusIdx}
                  onHover={() => setFocusIdx(i)} onSelect={() => selectTrigger(t)} />
              ))
            )
          ) : page === "home" ? (
            <>
              {CORE_TRIGGERS.map((t, i) => (
                <TriggerRow key={t.id} trigger={t} focused={i === focusIdx}
                  onHover={() => setFocusIdx(i)} onSelect={() => selectTrigger(t)} />
              ))}

              <div className="h-px bg-white/[0.06] mx-2 my-1.5" />

              {TRIGGER_CATEGORIES.map((cat) => {
                const count = cat.keys.filter((k) => TRIGGER_VARIANTS[k]).length;
                const CatIcon = cat.icon;
                return (
                  <button key={cat.id} onClick={() => setPage(cat.id)}
                    className="bb-nav-item flex items-center gap-3.5 w-full px-3.5 py-3.5 transition-colors text-left group rounded-xl">
                    <span className="w-7 h-7 shrink-0 flex items-center justify-center">
                      <CatIcon size={24} strokeWidth={1.7} className="text-neutral-300 group-hover:text-white transition-colors" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-semibold text-white leading-tight">{cat.label}</div>
                      <div className="text-[12px] text-neutral-500 mt-0.5 truncate">{cat.description} · {count}</div>
                    </div>
                    <ChevronRight size={16} className="text-neutral-600 shrink-0 group-hover:text-neutral-300 transition-colors" />
                  </button>
                );
              })}
            </>
          ) : (
            baseTriggers.map((t, i) => (
              <TriggerRow key={t.id} trigger={t} focused={i === focusIdx}
                onHover={() => setFocusIdx(i)} onSelect={() => selectTrigger(t)} />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-5 py-3.5 border-t border-white/[0.06] flex items-center gap-2">
          <Zap size={12} className="text-neutral-600" />
          <span className="text-[12px] text-neutral-600">{ALL_TRIGGERS.length} triggers</span>
          <span className="text-[11px] text-neutral-700 ml-auto">ESC {page !== "home" ? "back" : "close"}</span>
        </div>
      </div>
    </>
  );
}

function TriggerRow({ trigger, focused, onHover, onSelect }) {
  const rowRef = useRef(null);
  useEffect(() => { if (focused) rowRef.current?.scrollIntoView({ block: "nearest" }); }, [focused]);

  const Icon = trigger.icon;
  const onDragStart = (e) => {
    e.dataTransfer.effectAllowed = "copy";
    e.dataTransfer.setData("application/json", JSON.stringify({
      backendType: trigger.backendType,
      label: trigger.label,
      type: "trigger",
      config: { triggerVariant: trigger.id },
    }));
  };
  return (
    <button
      ref={rowRef}
      draggable
      onDragStart={onDragStart}
      onClick={onSelect}
      onMouseEnter={onHover}
      className={`bb-nav-item rounded-xl flex items-center gap-3.5 w-full px-3.5 py-3.5 transition-colors text-left group cursor-grab active:cursor-grabbing ${
        focused ? "bg-white/[0.05]" : ""
      }`}
    >
      <span className="w-7 h-7 shrink-0 flex items-center justify-center">
        {trigger.logoUrl ? (
          <img src={trigger.logoUrl} alt={trigger.label} className="w-[26px] h-[26px] object-contain"
            style={trigger.imgFilter ? { filter: trigger.imgFilter } : undefined} />
        ) : (
          <Icon size={24} strokeWidth={1.7} className="text-neutral-300 group-hover:text-white transition-colors" />
        )}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-semibold text-white leading-tight">{trigger.label}</div>
        {trigger.description && (
          <div className="text-[12px] text-neutral-500 mt-0.5 truncate">{trigger.description}</div>
        )}
      </div>
      <ChevronRight size={16} className="text-neutral-700 shrink-0 opacity-0 group-hover:opacity-100 group-hover:text-neutral-400 transition-all" />
    </button>
  );
}

function EventRow({ event, subject, focused, onHover, onSelect }) {
  const rowRef = useRef(null);
  useEffect(() => { if (focused) rowRef.current?.scrollIntoView({ block: "nearest" }); }, [focused]);

  const Icon = subject?.icon || event.icon;
  const onDragStart = (e) => {
    e.dataTransfer.effectAllowed = "copy";
    e.dataTransfer.setData("application/json", JSON.stringify({
      backendType: subject.backendType,
      label: `${subject.label.replace(/^On /, "")}: ${event.label}`,
      type: "trigger",
      config: { triggerVariant: subject.id, ...eventDefaults(subject.id, event.id) },
    }));
  };
  return (
    <button
      ref={rowRef}
      draggable
      onDragStart={onDragStart}
      onClick={onSelect}
      onMouseEnter={onHover}
      className={`bb-nav-item rounded-xl flex items-center gap-3.5 w-full px-3.5 py-3 transition-colors text-left group cursor-grab active:cursor-grabbing ${
        focused ? "bg-white/[0.05]" : ""
      }`}
    >
      <span className="w-7 h-7 shrink-0 flex items-center justify-center">
        {subject?.logoUrl ? (
          <img src={subject.logoUrl} alt={subject.label} className="w-[24px] h-[24px] object-contain"
            style={subject.imgFilter ? { filter: subject.imgFilter } : undefined} />
        ) : (
          Icon && <Icon size={22} strokeWidth={1.7} className="text-neutral-300" />
        )}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[13.5px] font-semibold text-white leading-tight">{event.label}</div>
        {event.description && (
          <div className="text-[11.5px] text-neutral-500 mt-0.5 truncate">{event.description}</div>
        )}
      </div>
      <ChevronRight size={16} className="text-neutral-700 shrink-0 opacity-0 group-hover:opacity-100 group-hover:text-neutral-400 transition-all" />
    </button>
  );
}
