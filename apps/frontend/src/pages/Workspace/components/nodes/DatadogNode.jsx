import SmartVariableInput from "../../../../components/ui/SmartVariableInput";
import CredentialPicker from "../../../../components/ui/CredentialPicker";

const OPERATIONS = [
  { value: "submitMetric",   label: "Submit Metric" },
  { value: "sendEvent",      label: "Send Event" },
  { value: "createMonitor",  label: "Create Monitor" },
  { value: "muteMonitor",    label: "Mute Monitor" },
  { value: "queryMetrics",   label: "Query Metrics" },
  { value: "listMonitors",   label: "List Monitors" },
  { value: "sendLog",        label: "Send Log" },
];

const METRIC_TYPES = ["gauge","count","rate","distribution"];
const ALERT_TYPES = ["metric alert","query alert","log alert","process alert"];

export default function DatadogNode({ config = {}, updateConfig, nodeId }) {
  const op = config.operation || "submitMetric";

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-[#632CA6]/10 border border-[#632CA6]/30 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="#632CA6">
            <path d="M14.785 10.306l-1.166-.766 1.107-1.727 1.167.768-1.108 1.725zM5.508 18.8L4.31 18.05l1.12-1.714 1.198.747L5.508 18.8zm16.258-9.86l-2.535-1.557-.944 1.55 2.537 1.556.942-1.549zm-6.43 4.032l-5.566-3.43L8.27 11.61l5.566 3.432 1.5-2.07zm-7.84 5.37L2.85 15.49l-.944 1.55 4.647 2.853.943-1.55zM22 6.664l-1.17-.768-5.67-3.476L0 11.613l5.67 3.477L22 6.664z"/>
          </svg>
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Datadog</div>
          <div className="text-[11px] text-zinc-500">Metrics, monitors, events, logs</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Operation</label>
        <div className="grid grid-cols-2 gap-1">
          {OPERATIONS.map((o) => (
            <button key={o.value} onClick={() => updateConfig("operation", o.value)}
              className={`py-1.5 px-2 rounded-lg border text-[11px] font-bold transition-all text-left ${op === o.value ? "bg-[#632CA6]/10 border-[#632CA6]/40 text-[#632CA6]" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {op === "submitMetric" && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Metric Name</label>
            <SmartVariableInput nodeId={nodeId} value={config.metricName || ""} onChange={(v) => updateConfig("metricName", v)} placeholder="app.request.count" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Value</label>
            <SmartVariableInput nodeId={nodeId} value={config.value || ""} onChange={(v) => updateConfig("value", v)} placeholder="{{ $json.count }}" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Type</label>
            <div className="flex gap-1.5">
              {METRIC_TYPES.map((t) => (
                <button key={t} onClick={() => updateConfig("metricType", t)}
                  className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold border transition-all ${(config.metricType||"gauge") === t ? "bg-[#632CA6]/10 border-[#632CA6]/40 text-[#632CA6]" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Tags (key:value, comma-sep)</label>
            <SmartVariableInput nodeId={nodeId} value={config.tags || ""} onChange={(v) => updateConfig("tags", v)} placeholder="env:production,service:api" />
          </div>
        </>
      )}

      {op === "sendEvent" && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Event Title</label>
            <SmartVariableInput nodeId={nodeId} value={config.title || ""} onChange={(v) => updateConfig("title", v)} placeholder="Deployment completed: {{ $json.version }}" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Event Text</label>
            <SmartVariableInput nodeId={nodeId} value={config.text || ""} onChange={(v) => updateConfig("text", v)} placeholder="Deployed {{ $json.service }} to production" multiline />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Alert Type</label>
            <div className="flex gap-1.5">
              {["info","warning","error","success"].map((a) => (
                <button key={a} onClick={() => updateConfig("alertType", a)}
                  className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold border transition-all ${(config.alertType||"info") === a ? "bg-[#632CA6]/10 border-[#632CA6]/40 text-[#632CA6]" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}>
                  {a}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {op === "createMonitor" && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Monitor Name</label>
            <SmartVariableInput nodeId={nodeId} value={config.name || ""} onChange={(v) => updateConfig("name", v)} placeholder="API Error Rate > 5%" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Monitor Type</label>
            <div className="grid grid-cols-2 gap-1">
              {ALERT_TYPES.map((t) => (
                <button key={t} onClick={() => updateConfig("type", t)}
                  className={`py-1.5 px-2 rounded-lg border text-[10px] font-bold transition-all ${(config.type||"metric alert") === t ? "bg-[#632CA6]/10 border-[#632CA6]/40 text-[#632CA6]" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Query</label>
            <SmartVariableInput nodeId={nodeId} value={config.query || ""} onChange={(v) => updateConfig("query", v)} placeholder="avg(last_5m):avg:system.cpu.user{*} > 90" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Notification Message</label>
            <SmartVariableInput nodeId={nodeId} value={config.message || ""} onChange={(v) => updateConfig("message", v)} placeholder="High CPU on {{host.name}} @pagerduty-oncall" multiline />
          </div>
        </>
      )}

      {op === "muteMonitor" && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Monitor ID</label>
            <SmartVariableInput nodeId={nodeId} value={config.monitorId || ""} onChange={(v) => updateConfig("monitorId", v)} placeholder="{{ $json.monitorId }}" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Mute Until (ISO datetime)</label>
            <SmartVariableInput nodeId={nodeId} value={config.end || ""} onChange={(v) => updateConfig("end", v)} placeholder="2024-01-01T08:00:00" />
          </div>
        </>
      )}

      {op === "queryMetrics" && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Query</label>
            <SmartVariableInput nodeId={nodeId} value={config.query || ""} onChange={(v) => updateConfig("query", v)} placeholder="avg:system.cpu.user{env:production}" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">From (epoch)</label>
              <SmartVariableInput nodeId={nodeId} value={config.from || ""} onChange={(v) => updateConfig("from", v)} placeholder="{{ $json.start }}" />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">To (epoch)</label>
              <SmartVariableInput nodeId={nodeId} value={config.to || ""} onChange={(v) => updateConfig("to", v)} placeholder="{{ $json.end }}" />
            </div>
          </div>
        </>
      )}

      {op === "sendLog" && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Message</label>
            <SmartVariableInput nodeId={nodeId} value={config.message || ""} onChange={(v) => updateConfig("message", v)} placeholder="{{ $json.logLine }}" multiline />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Service</label>
            <SmartVariableInput nodeId={nodeId} value={config.service || ""} onChange={(v) => updateConfig("service", v)} placeholder="my-api" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Tags</label>
            <SmartVariableInput nodeId={nodeId} value={config.ddtags || ""} onChange={(v) => updateConfig("ddtags", v)} placeholder="env:prod,version:1.2.3" />
          </div>
        </>
      )}

      <CredentialPicker value={config.credentialId || ""} onChange={(id) => updateConfig("credentialId", id)}
        accentColor="blue" label="Datadog API Key + App Key" placeholder="Select Datadog credential..." />

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        Returns: <span className="text-zinc-300">status, errors[ ], metric, series</span>
      </div>
    </div>
  );
}
