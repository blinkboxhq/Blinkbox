import {
  MousePointerClick,
  AppWindow,
  Clock,
  Webhook,
  ClipboardList,
  Workflow,
  MessageSquare,
  FlaskConical,
  FolderOpen,
} from "lucide-react";

import TriggerNode from "./components/nodes/TriggerNode";
import WebhookTriggerNode from "./components/nodes/WebhookTriggerNode";
import ScheduleTriggerNode from "./components/nodes/ScheduleTriggerNode";
import AppEventTriggerNode from "./components/nodes/AppEventTriggerNode";
import FormTriggerNode from "./components/nodes/FormTriggerNode";
import SubWorkflowTriggerNode from "./components/nodes/SubWorkflowTriggerNode";
import ChatTriggerNode from "./components/nodes/ChatTriggerNode";
import EvaluationTriggerNode from "./components/nodes/EvaluationTriggerNode";
import OtherTriggerNode from "./components/nodes/OtherTriggerNode";

// Single source of truth for all 9 visual trigger variants.
// backendType maps to the 3 actual execution types the backend supports.
// ConfigPanel is what the right sidebar renders when this variant is selected.

export const TRIGGER_VARIANTS = {
  manual: {
    backendType: "manual",
    icon: MousePointerClick,
    label: "Trigger Manually",
    colorClass: "text-green-400",
    accentColor: "34,197,94",
    ConfigPanel: TriggerNode,
  },
  app_event: {
    backendType: "webhook",
    icon: AppWindow,
    label: "On App Event",
    colorClass: "text-violet-400",
    accentColor: "139,92,246",
    ConfigPanel: AppEventTriggerNode,
  },
  cron: {
    backendType: "cron_trigger",
    icon: Clock,
    label: "On a Schedule",
    colorClass: "text-amber-400",
    accentColor: "251,191,36",
    ConfigPanel: ScheduleTriggerNode,
  },
  webhook: {
    backendType: "webhook",
    icon: Webhook,
    label: "On Webhook Call",
    colorClass: "text-blue-400",
    accentColor: "59,130,246",
    ConfigPanel: WebhookTriggerNode,
  },
  form: {
    backendType: "webhook",
    icon: ClipboardList,
    label: "On Form Submission",
    colorClass: "text-emerald-400",
    accentColor: "52,211,153",
    ConfigPanel: FormTriggerNode,
  },
  sub_workflow: {
    backendType: "webhook",
    icon: Workflow,
    label: "Called by Another Workflow",
    colorClass: "text-cyan-400",
    accentColor: "34,211,238",
    ConfigPanel: SubWorkflowTriggerNode,
  },
  chat: {
    backendType: "webhook",
    icon: MessageSquare,
    label: "On Chat Message",
    colorClass: "text-pink-400",
    accentColor: "236,72,153",
    ConfigPanel: ChatTriggerNode,
  },
  test: {
    backendType: "manual",
    icon: FlaskConical,
    label: "When Running Evaluation",
    colorClass: "text-orange-400",
    accentColor: "251,146,60",
    ConfigPanel: EvaluationTriggerNode,
  },
  other: {
    backendType: "webhook",
    icon: FolderOpen,
    label: "Other Ways",
    colorClass: "text-zinc-400",
    accentColor: "161,161,170",
    ConfigPanel: OtherTriggerNode,
  },
};
