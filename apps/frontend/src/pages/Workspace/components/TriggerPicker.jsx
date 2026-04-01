import { useState } from "react";
import {
  Search,
  MousePointerClick,
  Webhook,
  Clock,
  AppWindow,
  MessageSquare,
  FolderOpen,
  ArrowRight,
  ClipboardList,
  Workflow,
  FlaskConical,
} from "lucide-react";
import useWorkspaceStore from "../../../store/workspaceStore";

// ── Trigger options (n8n-style) mapped to actual backend trigger types ──────
const TRIGGER_OPTIONS = [
  {
    id: "manual",
    backendType: "manual",
    icon: MousePointerClick,
    label: "Trigger manually",
    description:
      "Runs the flow on clicking a button. Good for getting started quickly",
  },
  {
    id: "app_event",
    backendType: "webhook",
    icon: AppWindow,
    label: "On app event",
    description:
      "Runs the flow when something happens in an app like Telegram, Slack or Airtable",
    hasArrow: true,
  },
  {
    id: "cron",
    backendType: "cron_trigger",
    icon: Clock,
    label: "On a schedule",
    description: "Runs the flow every day, hour, or custom interval",
  },
  {
    id: "webhook",
    backendType: "webhook",
    icon: Webhook,
    label: "On webhook call",
    description: "Runs the flow on receiving an HTTP request",
  },
  {
    id: "form",
    backendType: "webhook",
    icon: ClipboardList,
    label: "On form submission",
    description: "Receive form data via webhook and pass responses to the workflow",
  },
  {
    id: "sub_workflow",
    backendType: "webhook",
    icon: Workflow,
    label: "When called by another workflow",
    description:
      "Runs the flow when called by another workflow via HTTP request",
  },
  {
    id: "chat",
    backendType: "webhook",
    icon: MessageSquare,
    label: "On chat message",
    description:
      "Runs the flow when a user sends a chat message. For use with AI nodes",
  },
  {
    id: "test",
    backendType: "manual",
    icon: FlaskConical,
    label: "When running evaluation",
    description: "Run a dataset through your workflow to test performance",
  },
  {
    id: "other",
    backendType: "webhook",
    icon: FolderOpen,
    label: "Other ways...",
    description: "Runs the flow on workflow errors, file changes, etc.",
    hasArrow: true,
  },
];

export default function TriggerPicker() {
  const [search, setSearch] = useState("");
  const addNode = useWorkspaceStore((s) => s.addNode);
  const setTriggerPickerOpen = useWorkspaceStore(
    (s) => s.setTriggerPickerOpen,
  );
  const setSelectedNodeId = useWorkspaceStore((s) => s.setSelectedNodeId);

  const filtered = search
    ? TRIGGER_OPTIONS.filter(
        (t) =>
          t.label.toLowerCase().includes(search.toLowerCase()) ||
          t.description.toLowerCase().includes(search.toLowerCase()),
      )
    : TRIGGER_OPTIONS;

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
        config: {
          triggerVariant: trigger.id,
        },
      },
    });

    setTriggerPickerOpen(false);
    setSelectedNodeId(newId);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 pt-6 pb-2">
        <h2 className="text-lg font-semibold text-zinc-100 tracking-tight">
          What triggers this workflow?
        </h2>
        <p className="text-sm text-zinc-500 mt-1">
          A trigger is a step that starts your workflow
        </p>
      </div>

      {/* Search */}
      <div className="px-6 py-3">
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-zinc-900 border border-zinc-700/60 rounded-xl focus-within:border-violet-500/50 transition-colors">
          <Search className="w-4 h-4 text-zinc-500 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search nodes..."
            className="flex-1 bg-transparent text-sm text-zinc-200 outline-none placeholder:text-zinc-600"
            autoFocus
          />
        </div>
      </div>

      {/* Trigger List */}
      <div className="flex-1 overflow-y-auto px-3 pb-6">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Search className="w-8 h-8 text-zinc-700 mb-2" />
            <p className="text-sm text-zinc-600">No triggers found</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {filtered.map((trigger) => {
              const Icon = trigger.icon;
              return (
                <button
                  key={trigger.id}
                  onClick={() => handleSelect(trigger)}
                  className="flex items-start gap-4 px-4 py-4 rounded-xl hover:bg-zinc-800/60 transition-all duration-150 text-left group border border-transparent hover:border-zinc-700/40"
                >
                  {/* Icon */}
                  <div
                    className="w-10 h-10 flex items-center justify-center shrink-0 mt-0.5"
                  >
                    <Icon
                      className="w-5 h-5 text-zinc-400 group-hover:text-zinc-200 transition-colors"
                      strokeWidth={1.75}
                    />
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-zinc-100 group-hover:text-white transition-colors">
                      {trigger.label}
                    </div>
                    <div className="text-xs text-zinc-500 mt-0.5 leading-relaxed group-hover:text-zinc-400 transition-colors">
                      {trigger.description}
                    </div>
                  </div>

                  {/* Arrow for expandable items */}
                  {trigger.hasArrow && (
                    <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 shrink-0 mt-1.5 transition-colors" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
