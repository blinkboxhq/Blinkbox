import { useState } from "react";
import {
  Search,
  MousePointerClick,
  Webhook,
  Clock,
  MessageSquare,
  Mail,
  AlertTriangle,
  Rss,
  Inbox,
  Database,
  Github,
  CreditCard,
  X,
} from "lucide-react";
import useWorkspaceStore from "../../../store/workspaceStore";

const TRIGGER_OPTIONS = [
  // ── Core ────────────────────────────────────────────────────────────────────
  {
    id: "manual",
    backendType: "manual",
    icon: MousePointerClick,
    label: "Trigger manually",
    description: "Run on demand by clicking a button. Great for testing and one-off tasks.",
    color: "text-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/20",
  },
  {
    id: "cron",
    backendType: "cron_trigger",
    icon: Clock,
    label: "On a schedule",
    description: "Run every minute, hour, day, or on a custom cron expression.",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
  },
  {
    id: "webhook",
    backendType: "webhook",
    icon: Webhook,
    label: "On webhook call",
    description: "Run when your URL receives an HTTP request. Works with any app that can POST.",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
  },
  {
    id: "chat",
    backendType: "webhook",
    icon: MessageSquare,
    label: "On chat message",
    description: "Run when a user sends a message. Wire into AI nodes to build chatbots.",
    color: "text-pink-400",
    bg: "bg-pink-500/10",
    border: "border-pink-500/20",
  },
  // ── Email ───────────────────────────────────────────────────────────────────
  {
    id: "email",
    backendType: "webhook",
    icon: Mail,
    label: "On email received (webhook)",
    description: "Run when an email arrives via Mailgun, SendGrid, Postmark, or Forward Email.",
    color: "text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
  },
  {
    id: "imap",
    backendType: "imap_trigger",
    icon: Inbox,
    label: "On email in inbox (IMAP)",
    description: "Poll Gmail, Outlook, or any IMAP inbox directly. No external webhook setup.",
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/20",
  },
  // ── Data ────────────────────────────────────────────────────────────────────
  {
    id: "rss",
    backendType: "rss_trigger",
    icon: Rss,
    label: "On RSS / Atom update",
    description: "Poll any RSS or Atom feed. Triggers once per new article or item.",
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/20",
  },
  {
    id: "database",
    backendType: "db_trigger",
    icon: Database,
    label: "On database row",
    description: "Watch a PostgreSQL or MySQL table for new or updated rows.",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
  },
  // ── Integrations ────────────────────────────────────────────────────────────
  {
    id: "github",
    backendType: "github_trigger",
    icon: Github,
    label: "On GitHub event",
    description: "Push, PR, issue, release — BlinkBox registers the webhook for you.",
    color: "text-zinc-300",
    bg: "bg-zinc-500/10",
    border: "border-zinc-500/20",
  },
  {
    id: "stripe",
    backendType: "stripe_trigger",
    icon: CreditCard,
    label: "On Stripe event",
    description: "Payment succeeded, subscription cancelled — auto-registered on your Stripe account.",
    color: "text-indigo-400",
    bg: "bg-indigo-500/10",
    border: "border-indigo-500/20",
  },
  // ── System ──────────────────────────────────────────────────────────────────
  {
    id: "error",
    backendType: "error_trigger",
    icon: AlertTriangle,
    label: "On workflow error",
    description: "Fires when any workflow in your workspace fails. Build alert & recovery automations.",
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
  },
];

// Group labels for the picker
const GROUPS = [
  { label: "Core",         ids: ["manual", "cron", "webhook", "chat"] },
  { label: "Email",        ids: ["email", "imap"] },
  { label: "Data",         ids: ["rss", "database"] },
  { label: "Integrations", ids: ["github", "stripe"] },
  { label: "System",       ids: ["error"] },
];

export default function TriggerPicker() {
  const [search, setSearch] = useState("");
  const addNode = useWorkspaceStore((s) => s.addNode);
  const setTriggerPickerOpen = useWorkspaceStore((s) => s.setTriggerPickerOpen);
  const setSelectedNodeId = useWorkspaceStore((s) => s.setSelectedNodeId);

  const filtered = search
    ? TRIGGER_OPTIONS.filter(
        (t) =>
          t.label.toLowerCase().includes(search.toLowerCase()) ||
          t.description.toLowerCase().includes(search.toLowerCase()),
      )
    : null; // null = show grouped view

  const handleSelect = (trigger) => {
    const newId = `${trigger.id}-${crypto.randomUUID()}`;
    addNode({
      id: newId,
      type: "custom",
      position: { x: 400, y: 300 },
      data: {
        backendType: trigger.backendType,
        label: trigger.label,
        type: "trigger",
        config: { triggerVariant: trigger.id },
      },
    });
    setTriggerPickerOpen(false);
    setSelectedNodeId(newId);
  };

  const renderTrigger = (trigger) => {
    const Icon = trigger.icon;
    return (
      <button
        key={trigger.id}
        onClick={() => handleSelect(trigger)}
        className="flex items-start gap-4 px-4 py-3.5 rounded-xl hover:bg-zinc-800/60 transition-all duration-150 text-left group border border-transparent hover:border-zinc-700/40"
      >
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border ${trigger.bg} ${trigger.border}`}>
          <Icon className={`w-4 h-4 ${trigger.color}`} strokeWidth={1.75} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-zinc-100 group-hover:text-white transition-colors">
            {trigger.label}
          </div>
          <div className="text-xs text-zinc-500 mt-0.5 leading-relaxed group-hover:text-zinc-400 transition-colors">
            {trigger.description}
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between px-6 pt-6 pb-4">
        <div>
          <h2 className="text-base font-semibold text-zinc-100 tracking-tight">
            What triggers this workflow?
          </h2>
          <p className="text-sm text-zinc-500 mt-1">
            Choose how this workflow starts
          </p>
        </div>
        <button
          onClick={() => setTriggerPickerOpen(false)}
          className="p-1.5 text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search */}
      <div className="px-6 pb-3">
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-zinc-900 border border-zinc-700/60 rounded-xl focus-within:border-zinc-500 transition-colors">
          <Search className="w-4 h-4 text-zinc-500 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search triggers..."
            className="flex-1 bg-transparent text-sm text-zinc-200 outline-none placeholder:text-zinc-600"
            autoFocus
          />
        </div>
      </div>

      {/* Trigger list */}
      <div className="flex-1 overflow-y-auto px-3 pb-6">
        {filtered !== null ? (
          // Search results — flat list
          filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Search className="w-8 h-8 text-zinc-700 mb-2" />
              <p className="text-sm text-zinc-600">No triggers found</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {filtered.map(renderTrigger)}
            </div>
          )
        ) : (
          // Grouped view
          <div className="flex flex-col gap-4">
            {GROUPS.map(({ label, ids }) => {
              const triggers = ids.map((id) => TRIGGER_OPTIONS.find((t) => t.id === id)).filter(Boolean);
              return (
                <div key={label}>
                  <div className="px-4 pb-1">
                    <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">{label}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {triggers.map(renderTrigger)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
