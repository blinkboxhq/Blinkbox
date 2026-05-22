import { useEffect, useState } from 'react';
import api from '../../../lib/api';

const W = 345;
const H = 215;
const PAD = 32;
const NODE_W = 40;
const NODE_H = 26;

const TYPE_COLOR = {
  webhook: '#3b82f6', webhookTrigger: '#3b82f6',
  cron_trigger: '#f59e0b', cronTrigger: '#f59e0b',
  gmail_trigger: '#ef4444', imapTrigger: '#3b82f6',
  slack_trigger: '#8b5cf6', discord_trigger: '#6366f1',
  github_trigger: '#a3a3a3', rss_trigger: '#f97316',
  shopify_trigger: '#10b981', stripe_trigger: '#8b5cf6',
  database_trigger: '#06b6d4', telegram_trigger: '#0ea5e9',
  manual: '#6b7280',
  httpRequest: '#3b82f6', sendEmail: '#ef4444',
  condition: '#f59e0b', filter: '#f59e0b',
  aiAgent: '#8b5cf6', openai: '#10a37f',
  code: '#a3a3a3', setFields: '#06b6d4',
  delay: '#f97316', loop: '#06b6d4',
  slackSend: '#8b5cf6', discordSend: '#6366f1',
};

function getColor(type) {
  return TYPE_COLOR[type] || '#404040';
}

function fitLayout(rawNodes, rawEdges) {
  if (!rawNodes?.length) return { nodes: [], edges: [] };

  const xs = rawNodes.map(n => n.x ?? n.position?.x ?? 0);
  const ys = rawNodes.map(n => n.y ?? n.position?.y ?? 0);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);

  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;

  const usableW = W - PAD * 2 - NODE_W;
  const usableH = H - PAD * 2 - NODE_H;
  const scale = Math.min(usableW / rangeX, usableH / rangeY, 1.4);

  const scaledW = rangeX * scale + NODE_W;
  const scaledH = rangeY * scale + NODE_H;
  const offsetX = (W - scaledW) / 2;
  const offsetY = (H - scaledH) / 2;

  const mapped = rawNodes.map((n, i) => {
    const rx = n.x ?? n.position?.x ?? 0;
    const ry = n.y ?? n.position?.y ?? 0;
    return {
      id: n.id || String(i),
      type: n.type,
      px: offsetX + (rx - minX) * scale,
      py: offsetY + (ry - minY) * scale,
      color: getColor(n.type),
    };
  });

  const byId = Object.fromEntries(mapped.map(n => [n.id, n]));

  const mappedEdges = (rawEdges || []).map(e => {
    const s = byId[e.s ?? e.source];
    const t = byId[e.t ?? e.target];
    if (!s || !t) return null;
    const x1 = s.px + NODE_W;
    const y1 = s.py + NODE_H / 2;
    const x2 = t.px;
    const y2 = t.py + NODE_H / 2;
    const cx = (x1 + x2) / 2;
    return { x1, y1, x2, y2, cx };
  }).filter(Boolean);

  return { nodes: mapped, edges: mappedEdges };
}

function Canvas({ nodes, edges, accentColor }) {
  const { nodes: fitted, edges: fittedEdges } = fitLayout(nodes, edges);

  return (
    <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
      {fittedEdges.map((e, i) => (
        <path key={i}
          d={`M${e.x1},${e.y1} C${e.cx},${e.y1} ${e.cx},${e.y2} ${e.x2},${e.y2}`}
          fill="none" stroke="#252525" strokeWidth={1.5} strokeLinecap="round" />
      ))}
      {fitted.map((n, i) => (
        <g key={n.id || i}>
          <rect x={n.px} y={n.py} width={NODE_W} height={NODE_H} rx={6}
            fill="#0f0f0f" stroke={n.color} strokeWidth={1.2} strokeOpacity={0.65} />
          <rect x={n.px + 1} y={n.py + 1} width={NODE_W - 2} height={5} rx={5}
            fill={n.color} opacity={0.55} />
        </g>
      ))}
    </svg>
  );
}

export default function WorkflowPreview({ preview, nodeCount, workflowId, accentColor }) {
  const [nodes, setNodes] = useState(preview?.nodes || null);
  const [edges, setEdges] = useState(preview?.edges || null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (nodes?.length) return;
    if (!nodeCount) return;
    setLoading(true);
    api.get(`/api/automations/${workflowId}`)
      .then(r => {
        const wf = r.data.automation || r.data;
        setNodes((wf.nodes || []).map(n => ({ id: n.id, type: n.type, x: n.position?.x ?? 0, y: n.position?.y ?? 0 })));
        setEdges((wf.edges || []).map(e => ({ s: e.source, t: e.target })));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [workflowId, nodeCount]);

  const hasNodes = nodes?.length > 0;

  return (
    <div style={{ width: W, height: H, position: 'relative',
      backgroundImage: 'radial-gradient(circle, #1c1c1c 1px, transparent 1px)',
      backgroundSize: '18px 18px' }}
      className="rounded-xl border border-[#1e1e1e] overflow-hidden mx-auto">

      <div style={{ position: 'absolute', inset: 0,
        background: `radial-gradient(ellipse at 50% 110%, ${accentColor}12 0%, transparent 65%)`,
        pointerEvents: 'none' }} />

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-3 h-3 rounded-full border border-[#333] border-t-[#555] animate-spin" />
        </div>
      )}

      {!loading && hasNodes && <Canvas nodes={nodes} edges={edges} accentColor={accentColor} />}

      {!loading && !hasNodes && !nodeCount && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[10px] text-[#282828]">No steps yet</span>
        </div>
      )}
    </div>
  );
}
