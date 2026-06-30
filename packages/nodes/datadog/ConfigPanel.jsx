import SmartVariableInput from "@/components/ui/SmartVariableInput";
import CredentialPicker from "@/components/ui/CredentialPicker";
import {
  Activity, LineChart, List, FileText, Pencil, Search, Bell, Plus, Trash2,
  BellOff, CalendarOff, CalendarPlus, CalendarMinus, Server, VolumeX, Volume2,
  BarChart3, Gauge, Megaphone, ScrollText, Target, AlertTriangle, TestTubes,
  PlayCircle, Tags, Users, User, ShieldCheck, Hash,
} from "lucide-react";

const ACCENT = "#632CA6";

const GROUPS = [
  {
    title: "Metrics",
    ops: [
      { value: "submitMetric", label: "Submit Metric", icon: Gauge },
      { value: "queryMetrics", label: "Query Metrics", icon: LineChart },
      { value: "listActiveMetrics", label: "Active Metrics", icon: Activity },
      { value: "getMetricMetadata", label: "Get Metadata", icon: FileText },
      { value: "updateMetricMetadata", label: "Update Metadata", icon: Pencil },
      { value: "searchMetrics", label: "Search Metrics", icon: Search },
    ],
  },
  {
    title: "Events",
    ops: [
      { value: "createEvent", label: "Create Event", icon: Megaphone },
      { value: "getEvent", label: "Get Event", icon: FileText },
      { value: "listEvents", label: "List Events", icon: List },
    ],
  },
  {
    title: "Monitors",
    ops: [
      { value: "createMonitor", label: "Create Monitor", icon: Plus },
      { value: "getMonitor", label: "Get Monitor", icon: FileText },
      { value: "listMonitors", label: "List Monitors", icon: Bell },
      { value: "updateMonitor", label: "Update Monitor", icon: Pencil },
      { value: "deleteMonitor", label: "Delete Monitor", icon: Trash2 },
      { value: "muteMonitor", label: "Mute Monitor", icon: BellOff },
      { value: "unmuteMonitor", label: "Unmute Monitor", icon: Bell },
      { value: "searchMonitors", label: "Search Monitors", icon: Search },
    ],
  },
  {
    title: "Logs & Dashboards",
    ops: [
      { value: "sendLog", label: "Send Log", icon: ScrollText },
      { value: "searchLogs", label: "Search Logs", icon: Search },
      { value: "listDashboards", label: "List Dashboards", icon: BarChart3 },
      { value: "getDashboard", label: "Get Dashboard", icon: FileText },
      { value: "deleteDashboard", label: "Delete Dashboard", icon: Trash2 },
    ],
  },
  {
    title: "Downtimes & Hosts",
    ops: [
      { value: "listDowntimes", label: "List Downtimes", icon: CalendarOff },
      { value: "scheduleDowntime", label: "Schedule Downtime", icon: CalendarPlus },
      { value: "cancelDowntime", label: "Cancel Downtime", icon: CalendarMinus },
      { value: "listHosts", label: "List Hosts", icon: Server },
      { value: "getHostTotals", label: "Host Totals", icon: Hash },
      { value: "muteHost", label: "Mute Host", icon: VolumeX },
      { value: "unmuteHost", label: "Unmute Host", icon: Volume2 },
      { value: "getHostTags", label: "Get Host Tags", icon: Tags },
      { value: "addHostTags", label: "Add Host Tags", icon: Tags },
    ],
  },
  {
    title: "SLOs, Incidents & More",
    ops: [
      { value: "listSlos", label: "List SLOs", icon: Target },
      { value: "getSlo", label: "Get SLO", icon: FileText },
      { value: "deleteSlo", label: "Delete SLO", icon: Trash2 },
      { value: "listIncidents", label: "List Incidents", icon: AlertTriangle },
      { value: "getIncident", label: "Get Incident", icon: FileText },
      { value: "createIncident", label: "Create Incident", icon: Plus },
      { value: "updateIncident", label: "Update Incident", icon: Pencil },
      { value: "listSyntheticTests", label: "Synthetic Tests", icon: TestTubes },
      { value: "getSyntheticTest", label: "Get Test", icon: FileText },
      { value: "triggerSyntheticTest", label: "Trigger Test", icon: PlayCircle },
      { value: "listUsers", label: "List Users", icon: Users },
      { value: "getUser", label: "Get User", icon: User },
      { value: "postServiceCheck", label: "Service Check", icon: ShieldCheck },
    ],
  },
];

const METRIC_TYPES = ["gauge", "count", "rate", "distribution"];
const MONITOR_TYPES = ["metric alert", "query alert", "log alert", "process alert", "service check"];
const ALERT_TYPES = ["info", "warning", "error", "success"];
const CHECK_STATUS = ["0", "1", "2", "3"];

const lbl = "text-[10px] font-bold text-zinc-500 uppercase tracking-widest";
const inputCls =
  "w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#632CA6]/40";

function Field({ label, hint, children }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className={lbl}>{label}</span>
        {hint && <span className="text-[9px] text-zinc-600">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

export default function DatadogNode({ config = {}, updateConfig }) {
  const op = config.operation || "submitMetric";
  const set = (k) => (v) => updateConfig(k, v);
  const show = (...ops) => ops.includes(op);

  const Var = ({ k, placeholder, multiline, def }) => (
    <SmartVariableInput
      value={config[k] ?? def ?? ""}
      onChange={set(k)}
      placeholder={placeholder}
      multiline={multiline}
      className={inputCls}
    />
  );

  const Pills = ({ k, items, def }) => (
    <div className="flex flex-wrap gap-1.5">
      {items.map((it) => {
        const active = (config[k] ?? def) === it;
        return (
          <button
            key={it}
            onClick={() => updateConfig(k, it)}
            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
              active
                ? "bg-[#632CA6]/15 border-[#632CA6]/50 text-[#b292e0]"
                : "bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]"
            }`}
          >
            {it}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-[#632CA6]/10 border border-[#632CA6]/25 flex items-center justify-center shrink-0">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="#632CA6">
            <path d="M14.785 10.306l-1.166-.766 1.107-1.727 1.167.768-1.108 1.725zM5.508 18.8L4.31 18.05l1.12-1.714 1.198.747L5.508 18.8zm16.258-9.86l-2.535-1.557-.944 1.55 2.537 1.556.942-1.549zm-6.43 4.032l-5.566-3.43L8.27 11.61l5.566 3.432 1.5-2.07zm-7.84 5.37L2.85 15.49l-.944 1.55 4.647 2.853.943-1.55zM22 6.664l-1.17-.768-5.67-3.476L0 11.613l5.67 3.477L22 6.664z" />
          </svg>
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Datadog</div>
          <div className="text-[11px] text-zinc-500">Metrics, monitors, events, logs & more</div>
        </div>
      </div>

      <div>
        <span className={lbl}>Operation</span>
        <div className="flex flex-col gap-3 mt-2">
          {GROUPS.map((group) => (
            <div key={group.title}>
              <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">{group.title}</span>
              <div className="grid grid-cols-2 gap-2 mt-1.5">
                {group.ops.map((o) => {
                  const Icon = o.icon;
                  const active = op === o.value;
                  return (
                    <button
                      key={o.value}
                      onClick={() => updateConfig("operation", o.value)}
                      className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg border transition-all ${
                        active
                          ? "bg-[#632CA6]/15 border-[#632CA6]/50 text-[#b292e0]"
                          : "bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span className="text-[11px] font-semibold truncate">{o.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {show("submitMetric") && (
        <>
          <Field label="Metric Name" hint="required">
            <Var k="metricName" placeholder="app.requests.count" />
          </Field>
          <Field label="Value" hint="required">
            <Var k="value" placeholder="{{ $json.count }}" />
          </Field>
          <Field label="Type">
            <Pills k="metricType" items={METRIC_TYPES} def="gauge" />
          </Field>
          <Field label="Host" hint="optional">
            <Var k="host" placeholder="{{ $json.host }}" />
          </Field>
        </>
      )}

      {show("queryMetrics") && (
        <Field label="Query" hint="required">
          <Var k="query" placeholder="avg:system.cpu.user{*}" />
        </Field>
      )}

      {show("getMetricMetadata", "updateMetricMetadata") && (
        <Field label="Metric Name" hint="required">
          <Var k="metricName" placeholder="app.requests.count" />
        </Field>
      )}

      {show("updateMetricMetadata") && (
        <>
          <Field label="Description" hint="optional">
            <Var k="description" placeholder="Total inbound requests" />
          </Field>
          <Field label="Unit" hint="optional">
            <Var k="unit" placeholder="request" />
          </Field>
          <Field label="Type">
            <Pills k="metricType" items={METRIC_TYPES} />
          </Field>
        </>
      )}

      {show("searchMetrics") && (
        <Field label="Search Query" hint="required">
          <Var k="query" placeholder="system.cpu" />
        </Field>
      )}

      {show("createEvent") && (
        <>
          <Field label="Title" hint="required">
            <Var k="title" placeholder="Deploy completed — {{ $json.version }}" />
          </Field>
          <Field label="Text" hint="optional, supports markdown">
            <Var k="text" placeholder="%%% \n Released {{ $json.version }} \n %%%" multiline />
          </Field>
          <Field label="Alert Type">
            <Pills k="alertType" items={ALERT_TYPES} def="info" />
          </Field>
          <Field label="Aggregation Key" hint="optional">
            <Var k="aggregationKey" placeholder="deploy" />
          </Field>
        </>
      )}

      {show("getEvent") && (
        <Field label="Event ID" hint="required">
          <Var k="eventId" placeholder="{{ $json.id }}" />
        </Field>
      )}

      {show("createMonitor", "updateMonitor") && (
        <>
          {show("updateMonitor") && (
            <Field label="Monitor ID" hint="required">
              <Var k="monitorId" placeholder="{{ $json.id }}" />
            </Field>
          )}
          <Field label="Name" hint={show("createMonitor") ? "required" : "optional"}>
            <Var k="name" placeholder="High CPU alert" />
          </Field>
          {show("createMonitor") && (
            <Field label="Type">
              <Pills k="type" items={MONITOR_TYPES} def="metric alert" />
            </Field>
          )}
          <Field label="Query" hint={show("createMonitor") ? "required" : "optional"}>
            <Var k="query" placeholder="avg(last_5m):avg:system.cpu.user{*} > 90" />
          </Field>
          <Field label="Message" hint="optional, supports @notifications">
            <Var k="message" placeholder="CPU is high @slack-ops" multiline />
          </Field>
          <Field label="Tags" hint="comma-separated, optional">
            <Var k="tags" placeholder="env:prod, team:infra" />
          </Field>
        </>
      )}

      {show("getMonitor", "deleteMonitor", "muteMonitor", "unmuteMonitor") && (
        <Field label="Monitor ID" hint="required">
          <Var k="monitorId" placeholder="{{ $json.id }}" />
        </Field>
      )}

      {show("muteMonitor") && (
        <>
          <Field label="Scope" hint="optional, e.g. host:web1">
            <Var k="scope" placeholder="host:web1" />
          </Field>
          <Field label="End (unix ts)" hint="optional">
            <Var k="end" placeholder="1719800000" />
          </Field>
        </>
      )}

      {show("searchMonitors") && (
        <Field label="Search Query" hint="optional">
          <Var k="query" placeholder="status:Alert" />
        </Field>
      )}

      {show("sendLog") && (
        <>
          <Field label="Message" hint="required">
            <Var k="message" placeholder="{{ $json.log }}" multiline />
          </Field>
          <Field label="Service" hint="optional">
            <Var k="service" placeholder="api" def="blinkbox" />
          </Field>
          <Field label="Source" hint="optional">
            <Var k="source" placeholder="nodejs" def="blinkbox" />
          </Field>
          <Field label="Hostname" hint="optional">
            <Var k="hostname" placeholder="{{ $json.host }}" />
          </Field>
          <Field label="Tags" hint="ddtags, optional">
            <Var k="ddtags" placeholder="env:prod,version:1.0" />
          </Field>
        </>
      )}

      {show("searchLogs") && (
        <>
          <Field label="Query" hint="default *">
            <Var k="query" placeholder="service:api status:error" def="*" />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="From" hint="default now-1h">
              <Var k="from" placeholder="now-1h" def="now-1h" />
            </Field>
            <Field label="To" hint="default now">
              <Var k="to" placeholder="now" def="now" />
            </Field>
          </div>
        </>
      )}

      {show("getDashboard", "deleteDashboard") && (
        <Field label="Dashboard ID" hint="required">
          <Var k="dashboardId" placeholder="abc-def-ghi" />
        </Field>
      )}

      {show("scheduleDowntime") && (
        <>
          <Field label="Scope" hint="comma-separated, required">
            <Var k="scope" placeholder="env:staging, host:web1" />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Start (unix ts)" hint="optional">
              <Var k="from" placeholder="1719800000" />
            </Field>
            <Field label="End (unix ts)" hint="optional">
              <Var k="to" placeholder="1719810000" />
            </Field>
          </div>
          <Field label="Monitor ID" hint="optional">
            <Var k="monitorId" placeholder="123456" />
          </Field>
          <Field label="Message" hint="optional">
            <Var k="message" placeholder="Deploying v2" />
          </Field>
        </>
      )}

      {show("cancelDowntime") && (
        <Field label="Downtime ID" hint="required">
          <Var k="downtimeId" placeholder="{{ $json.id }}" />
        </Field>
      )}

      {show("muteHost", "unmuteHost", "getHostTags", "addHostTags") && (
        <Field label="Host Name" hint="required">
          <Var k="hostName" placeholder="web-prod-01" />
        </Field>
      )}

      {show("muteHost") && (
        <>
          <Field label="End (unix ts)" hint="optional">
            <Var k="end" placeholder="1719800000" />
          </Field>
          <Field label="Message" hint="optional">
            <Var k="message" placeholder="Maintenance" />
          </Field>
        </>
      )}

      {show("addHostTags") && (
        <Field label="Tags" hint="comma-separated, required">
          <Var k="tags" placeholder="role:db, env:prod" />
        </Field>
      )}

      {show("listHosts") && (
        <Field label="Filter" hint="optional">
          <Var k="query" placeholder="env:prod" />
        </Field>
      )}

      {show("getSlo", "deleteSlo") && (
        <Field label="SLO ID" hint="required">
          <Var k="sloId" placeholder="{{ $json.id }}" />
        </Field>
      )}

      {show("getIncident", "updateIncident") && (
        <Field label="Incident ID" hint="required">
          <Var k="incidentId" placeholder="{{ $json.id }}" />
        </Field>
      )}

      {show("createIncident", "updateIncident") && (
        <Field label="Title" hint={show("createIncident") ? "required" : "optional"}>
          <Var k="title" placeholder="API outage" />
        </Field>
      )}

      {show("createIncident") && (
        <Field label="Severity" hint="optional, e.g. SEV-1">
          <Var k="severity" placeholder="SEV-2" />
        </Field>
      )}

      {show("updateIncident") && (
        <Field label="Status" hint="optional, e.g. resolved">
          <Var k="status" placeholder="resolved" />
        </Field>
      )}

      {show("getSyntheticTest", "triggerSyntheticTest") && (
        <Field label="Test Public ID" hint="required">
          <Var k="testId" placeholder="abc-def-ghi" />
        </Field>
      )}

      {show("getUser") && (
        <Field label="User ID" hint="required">
          <Var k="userId" placeholder="{{ $json.id }}" />
        </Field>
      )}

      {show("postServiceCheck") && (
        <>
          <Field label="Check Name" hint="required">
            <Var k="checkName" placeholder="app.is_ok" />
          </Field>
          <Field label="Host Name" hint="required">
            <Var k="hostName" placeholder="web-prod-01" />
          </Field>
          <Field label="Status" hint="0=OK 1=Warn 2=Crit 3=Unknown">
            <Pills k="status" items={CHECK_STATUS} def="0" />
          </Field>
          <Field label="Message" hint="optional">
            <Var k="message" placeholder="All good" />
          </Field>
        </>
      )}

      {show("listEvents", "listMonitors", "listSlos", "listHosts") && (
        <Field label="Tags / Filter" hint="optional">
          <Var k="tags" placeholder="env:prod" />
        </Field>
      )}

      {show("listUsers", "listSlos") && (
        <Field label="Search Query" hint="optional">
          <Var k="query" placeholder="search text" />
        </Field>
      )}

      {show("queryMetrics", "listEvents", "listActiveMetrics") && (
        <div className="grid grid-cols-2 gap-2">
          <Field label="From (unix ts)" hint="optional">
            <Var k="from" placeholder="now-1h" />
          </Field>
          <Field label="To (unix ts)" hint="optional">
            <Var k="to" placeholder="now" />
          </Field>
        </div>
      )}

      {show(
        "searchLogs", "listMonitors", "searchMonitors", "listHosts", "listSlos",
        "listIncidents", "listUsers"
      ) && (
        <Field label="Limit" hint="result count">
          <Var k="limit" placeholder="25" />
        </Field>
      )}

      <Field label="Datadog Site" hint="default datadoghq.com">
        <Var k="site" placeholder="datadoghq.com" def="datadoghq.com" />
      </Field>

      <CredentialPicker
        provider="datadog"
        value={config.credentialId || ""}
        onChange={set("credentialId")}
        accentColor={ACCENT}
        label="Datadog API + App Key"
        placeholder="Select Datadog credential..."
      />

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        Returns: <span className="text-zinc-300">status, id, name, series, html_url</span>
      </div>
    </div>
  );
}
