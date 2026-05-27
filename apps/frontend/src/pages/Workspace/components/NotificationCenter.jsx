import { AnimatePresence, motion } from "framer-motion";
import { X, Check, AlertTriangle, Info, XCircle } from "lucide-react";
import useWorkspaceStore from "../../../store/workspaceStore";

const TYPE_CONFIG = {
  success: {
    bg: "#16a34a",
    iconBg: "#16a34a",
    Icon: Check,
  },
  error: {
    bg: "#ef4444",
    iconBg: "#ef4444",
    Icon: XCircle,
  },
  warning: {
    bg: "#d97706",
    iconBg: "#d97706",
    Icon: AlertTriangle,
  },
  info: {
    bg: "#3b82f6",
    iconBg: "#3b82f6",
    Icon: Info,
  },
};

function NotificationCard({ notif, onDismiss }) {
  const cfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.info;
  const { Icon } = cfg;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.96 }}
      transition={{ type: "spring", damping: 28, stiffness: 340, mass: 0.8 }}
      style={{
        background: "#1c1c1e",
        border: "1px solid #333",
        borderRadius: 8,
        boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
        width: 360,
        overflow: "hidden",
      }}
    >
      {/* Top accent */}
      <div style={{ height: 2, background: cfg.bg }} />

      <div className="flex items-start gap-3 px-4 pt-3.5 pb-3">
        {/* Icon circle */}
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
          style={{ background: cfg.iconBg }}
        >
          <Icon className="w-3.5 h-3.5 text-white" strokeWidth={notif.type === "success" ? 3 : 2.5} />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold text-white leading-snug">{notif.title}</p>
          {notif.message && (
            <p className="text-[11px] text-neutral-400 mt-0.5 leading-relaxed">{notif.message}</p>
          )}
        </div>

        {/* Dismiss */}
        <button
          onClick={() => onDismiss(notif.id)}
          className="shrink-0 w-5 h-5 flex items-center justify-center text-neutral-600 hover:text-white transition-colors mt-0.5"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Optional action */}
      {notif.action && (
        <div className="px-4 pb-3.5">
          <div style={{ height: 1, background: "#2a2a2a", marginBottom: 10 }} />
          <button
            onClick={() => { notif.action.onClick(); onDismiss(notif.id); }}
            className="text-[11px] font-semibold text-white px-3 py-1.5 transition-colors"
            style={{ background: "#2a2a2a", border: "1px solid #3a3a3a", borderRadius: 5 }}
            onMouseEnter={e => e.currentTarget.style.background = "#333"}
            onMouseLeave={e => e.currentTarget.style.background = "#2a2a2a"}
          >
            {notif.action.label}
          </button>
        </div>
      )}
    </motion.div>
  );
}

export default function NotificationCenter() {
  const notifications    = useWorkspaceStore((s) => s.notifications);
  const dismissNotification = useWorkspaceStore((s) => s.dismissNotification);

  return (
    <div
      className="absolute bottom-20 right-5 z-20 flex flex-col-reverse gap-2"
      style={{ pointerEvents: "none" }}
    >
      <AnimatePresence mode="popLayout">
        {notifications.map((n) => (
          <div key={n.id} style={{ pointerEvents: "auto" }}>
            <NotificationCard notif={n} onDismiss={dismissNotification} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
