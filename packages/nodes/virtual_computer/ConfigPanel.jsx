import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { Monitor, Play, Square, Loader2, MousePointerClick, Camera, Type, Globe } from "lucide-react";
import useWorkspaceStore from "@/store/workspaceStore";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const ACTION_ICON = {
  open_url: Globe,
  click: MousePointerClick,
  left_click: MousePointerClick,
  right_click: MousePointerClick,
  double_click: MousePointerClick,
  type: Type,
  screenshot: Camera,
};

function actionLabel(action, args = {}) {
  switch (action) {
    case "open_url": return `Open ${args.url || "URL"}`;
    case "click":
    case "left_click": return args.selector ? `Click "${args.selector}"` : `Click (${args.x}, ${args.y})`;
    case "type": return `Type "${(args.text || "").slice(0, 40)}"`;
    case "scroll": return `Scroll ${args.direction || "down"}`;
    case "screenshot": return "Screenshot";
    default: return action;
  }
}

export default function VirtualComputerPanel({ config = {}, nodeId }) {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [frame, setFrame] = useState(null);       // current screenshot data URL
  const [meta, setMeta] = useState(null);         // { url, title }
  const [log, setLog] = useState([]);             // recent actions
  const [error, setError] = useState(null);
  const socketRef = useRef(null);

  // The agent's tool_virtual_computer keys its browser session by the live
  // execution's ID (ctx.executionId) — NOT by node ID. To actually watch the
  // agent's real browser (not a disconnected, empty session) we must connect
  // using that same ID, and only while a run is actually in flight.
  const isExecutionLive = useWorkspaceStore((s) => s.isExecutionLive);
  const executionId = useWorkspaceStore((s) => s.liveExecutionState?._id);
  const canWatch = Boolean(isExecutionLive && executionId);
  const sessionId = executionId;

  function connect() {
    if (socketRef.current || !sessionId) return;
    setConnecting(true);
    setError(null);

    const token = localStorage.getItem("blinkbox_token");
    const socket = io(`${API_URL}/vc`, {
      auth: { token },
      query: { sessionId },
      transports: ["polling", "websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
    });

    socket.on("connect", () => {
      setConnecting(false);
      setConnected(true);
    });

    socket.on("connected", () => {
      // Pull an initial frame so the cockpit isn't blank on attach
      socket.emit("action", { action: "screenshot" });
    });

    socket.on("result", (res) => {
      if (res.screenshot) setFrame(res.screenshot);
      if (res.url || res.title) setMeta({ url: res.url, title: res.title });
      if (res.action) {
        setLog((prev) => [{ action: res.action, ts: Date.now(), ok: res.success !== false }, ...prev].slice(0, 30));
      }
      setError(res.success === false ? (res.error || "Action failed") : null);
    });

    socket.on("error", (err) => {
      if (err.screenshot) setFrame(err.screenshot);
      setError(err.error || "Virtual computer error");
      if (err.action) {
        setLog((prev) => [{ action: err.action, ts: Date.now(), ok: false }, ...prev].slice(0, 30));
      }
    });

    socket.on("closed", () => {
      setConnected(false);
      setFrame(null);
      setMeta(null);
    });

    socket.on("disconnect", () => {
      setConnected(false);
      setConnecting(false);
    });

    socket.on("connect_error", (err) => {
      setConnecting(false);
      setError(err.message || "Could not reach the virtual computer");
    });

    socketRef.current = socket;
  }

  function disconnect() {
    socketRef.current?.emit("close_session");
    socketRef.current?.disconnect();
    socketRef.current = null;
    setConnected(false);
    setConnecting(false);
    setFrame(null);
    setMeta(null);
    setLog([]);
  }

  function refresh() {
    socketRef.current?.emit("action", { action: "screenshot" });
  }

  useEffect(() => () => {
    socketRef.current?.disconnect();
    socketRef.current = null;
  }, []);

  // The agent's browser session lives only as long as its execution does —
  // once the run ends, drop the viewer rather than show a stale last frame.
  useEffect(() => {
    if (!isExecutionLive && socketRef.current) disconnect();
  }, [isExecutionLive]);

  return (
    <div className="flex flex-col gap-4 p-4 bg-[#0d0d0f] min-h-full">

      {/* Header */}
      <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-violet-500/20 bg-violet-500/[0.07]">
        <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
          <Monitor className="w-4 h-4 text-violet-400" strokeWidth={2} />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-zinc-100">Virtual Computer</p>
          <p className="text-[10px] text-zinc-500 mt-0.5 truncate">
            {connected
              ? "Live — agent's browser, in real time"
              : canWatch
                ? "A run is in progress — watch the agent's browser live"
                : "Run this workflow to watch the agent's browser live"}
          </p>
        </div>
        <span className={`ml-auto w-2 h-2 rounded-full shrink-0 ${connected ? "bg-emerald-400" : connecting ? "bg-amber-400 animate-pulse" : "bg-zinc-700"}`} />
      </div>

      {/* Live viewport */}
      <div className="rounded-lg border border-zinc-800 overflow-hidden bg-black">
        {/* URL bar */}
        <div className="flex items-center gap-2 px-3 py-2 bg-[#141416] border-b border-zinc-800">
          <span className="w-2 h-2 rounded-full bg-red-500/70 shrink-0" />
          <span className="w-2 h-2 rounded-full bg-amber-500/70 shrink-0" />
          <span className="w-2 h-2 rounded-full bg-emerald-500/70 shrink-0" />
          <div className="flex-1 min-w-0 ml-1 px-2 py-1 rounded bg-black/40 border border-zinc-800/80">
            <p className="text-[10px] text-zinc-400 font-mono truncate">
              {meta?.url || (connected ? "about:blank" : "not connected")}
            </p>
          </div>
        </div>

        {/* Screenshot canvas */}
        <div className="relative aspect-video flex items-center justify-center bg-[#0a0a0b]">
          {frame ? (
            <img src={frame} alt="Live virtual computer screen" className="w-full h-full object-contain" />
          ) : connecting ? (
            <div className="flex flex-col items-center gap-2 text-zinc-600">
              <Loader2 className="w-5 h-5 animate-spin" />
              <p className="text-[11px]">Booting browser session…</p>
            </div>
          ) : connected ? (
            <div className="flex flex-col items-center gap-2 text-zinc-600">
              <Camera className="w-5 h-5" />
              <p className="text-[11px]">Waiting for first frame…</p>
            </div>
          ) : canWatch ? (
            <div className="flex flex-col items-center gap-2 text-zinc-600">
              <Monitor className="w-6 h-6" strokeWidth={1.5} />
              <p className="text-[11px]">Connect to watch this run live</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-zinc-600">
              <Monitor className="w-6 h-6" strokeWidth={1.5} />
              <p className="text-[11px]">No run in progress — start the workflow to watch live</p>
            </div>
          )}

          {connected && (
            <button
              onClick={refresh}
              title="Capture a fresh frame"
              className="absolute top-2 right-2 p-1.5 rounded-md bg-black/50 backdrop-blur-sm border border-zinc-700/60 text-zinc-400 hover:text-white hover:border-zinc-500 transition-all duration-150"
            >
              <Camera className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Connect / disconnect controls */}
      <div className="flex items-center gap-2">
        {!connected ? (
          <button
            onClick={connect}
            disabled={connecting || !canWatch}
            title={canWatch ? undefined : "No execution is currently running"}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-violet-500/30 bg-violet-500/10 text-violet-300 text-[12px] font-semibold hover:bg-violet-500/15 transition-all duration-150 disabled:opacity-50"
          >
            {connecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            {connecting ? "Connecting…" : canWatch ? "Watch Live" : "No Run In Progress"}
          </button>
        ) : (
          <button
            onClick={disconnect}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-400 text-[12px] font-semibold hover:text-white hover:border-zinc-600 transition-all duration-150"
          >
            <Square className="w-3.5 h-3.5" />
            Disconnect
          </button>
        )}
      </div>

      {error && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] px-3 py-2 rounded-lg leading-relaxed">
          {error}
        </div>
      )}

      {/* Action log */}
      {log.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">Recent actions</p>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 overflow-hidden max-h-[180px] overflow-y-auto">
            {log.map((entry, i) => {
              const Icon = ACTION_ICON[entry.action] || MousePointerClick;
              return (
                <div key={i} className="flex items-center gap-2 px-3 py-1.5 border-b border-zinc-800/60 last:border-b-0">
                  <Icon className={`w-3 h-3 shrink-0 ${entry.ok ? "text-zinc-500" : "text-red-400"}`} strokeWidth={2} />
                  <p className={`text-[10px] truncate ${entry.ok ? "text-zinc-400" : "text-red-300"}`}>
                    {actionLabel(entry.action)}
                  </p>
                  <span className="ml-auto text-[9px] text-zinc-600 shrink-0 tabular-nums">
                    {new Date(entry.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Info banner */}
      <div className="bg-zinc-900 border border-zinc-800 text-zinc-500 text-[11px] px-3 py-2 rounded-lg leading-relaxed">
        This tool gives the agent a real, stealth-enabled browser it controls like a human — clicking,
        typing, and scrolling with natural movement. While a workflow run is in progress, connect above
        to watch the agent's browser live — the session ends with the run.
      </div>
    </div>
  );
}
