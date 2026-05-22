import { useEffect, useState } from 'react';
import api from '../../../lib/api';

const W = 345;
const H = 215;

// Mini node dimensions (real nodes are 120×120, we scale down)
const N = 44; // node square size
const PAD = 24;

// Shape radii matching CustomNode category shapes
const SHAPE_RADIUS = {
  trigger: 12,
  ai: 8, ai_tools: 8,
  flow: 4,
  data: 4, transform: 4, research: 4, code: 4,
  integration: 16,
  devtools: 8, payments: 8, crm: 8, social: 8,
  design: 16, social_pub: 8, gaming: 4,
};

// Node accent colors by type — used for the icon glow / top strip
const TYPE_COLOR = {
  webhook: '#3b82f6', webhookTrigger: '#3b82f6',
  cron_trigger: '#f59e0b', cronTrigger: '#f59e0b',
  gmail_trigger: '#ea4335', imapTrigger: '#3b82f6',
  slack_trigger: '#8b5cf6', discord_trigger: '#6366f1',
  github_trigger: '#a3a3a3', rss_trigger: '#f97316',
  shopify_trigger: '#95bf47', stripe_trigger: '#635bff',
  database_trigger: '#06b6d4', telegram_trigger: '#26a5e4',
  manual: '#6b7280',
  httpRequest: '#3b82f6', sendEmail: '#ea4335',
  condition: '#f59e0b', filter: '#f59e0b', switchNode: '#f59e0b',
  aiAgent: '#a78bfa', openai: '#10a37f', anthropic: '#d4c1b3',
  code: '#a3a3a3', setFields: '#06b6d4', mergeData: '#06b6d4',
  delay: '#f97316', loop: '#06b6d4', forEach: '#06b6d4',
  slackSend: '#8b5cf6', discordSend: '#6366f1',
  httpTrigger: '#3b82f6',
};

const CATEGORY_COLOR = {
  trigger: '#f59e0b', ai: '#a78bfa', ai_tools: '#c084fc',
  data: '#3b82f6', transform: '#06b6d4', research: '#10b981',
  flow: '#f59e0b', code: '#a3a3a3', integration: '#8b5cf6',
  devtools: '#64748b', payments: '#635bff', crm: '#f97316',
  social: '#ec4899', design: '#f43f5e', gaming: '#84cc16',
};

function getNodeColor(type) {
  return TYPE_COLOR[type] || '#52525b';
}

function getCategoryFromType(type) {
  if (!type) return 'data';
  if (type.includes('trigger') || type === 'webhook' || type === 'manual' || type === 'cronTrigger' || type === 'webhookTrigger') return 'trigger';
  if (type === 'aiAgent' || type === 'openai' || type === 'anthropic') return 'ai';
  if (type === 'condition' || type === 'filter' || type === 'loop' || type === 'forEach' || type === 'switchNode' || type === 'delay') return 'flow';
  if (type === 'code') return 'code';
  return 'data';
}

function fitLayout(rawNodes, rawEdges) {
  if (!rawNodes?.length) return { nodes: [], edges: [] };

  const xs = rawNodes.map(n => n.x ?? n.position?.x ?? 0);
  const ys = rawNodes.map(n => n.y ?? n.position?.y ?? 0);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const rangeX = Math.max(...xs) - minX || 1;
  const rangeY = Math.max(...ys) - minY || 1;

  const usableW = W - PAD * 2 - N;
  const usableH = H - PAD * 2 - N;
  const scale = Math.min(usableW / rangeX, usableH / rangeY, 1.2);

  const scaledW = rangeX * scale + N;
  const scaledH = rangeY * scale + N;
  const ox = (W - scaledW) / 2;
  const oy = (H - scaledH) / 2;

  const mapped = rawNodes.map((n, i) => {
    const rx = n.x ?? n.position?.x ?? 0;
    const ry = n.y ?? n.position?.y ?? 0;
    const cat = getCategoryFromType(n.type);
    return {
      id: n.id || String(i),
      type: n.type,
      px: ox + (rx - minX) * scale,
      py: oy + (ry - minY) * scale,
      color: getNodeColor(n.type),
      radius: SHAPE_RADIUS[cat] ?? 8,
      cat,
    };
  });

  const byId = Object.fromEntries(mapped.map(n => [n.id, n]));

  const mappedEdges = (rawEdges || []).map(e => {
    const s = byId[e.s ?? e.source];
    const t = byId[e.t ?? e.target];
    if (!s || !t) return null;
    const x1 = s.px + N;
    const y1 = s.py + N / 2;
    const x2 = t.px;
    const y2 = t.py + N / 2;
    const cx = (x1 + x2) / 2;
    return { x1, y1, x2, y2, cx };
  }).filter(Boolean);

  return { nodes: mapped, edges: mappedEdges };
}

function MiniCanvas({ nodes, edges, accentColor }) {
  const { nodes: fitted, edges: fittedEdges } = fitLayout(nodes, edges);

  return (
    <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }} overflow="visible">
      <defs>
        {fitted.map(n => (
          <radialGradient key={`g-${n.id}`} id={`g-${n.id}`} cx="40%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#2a2a2e" />
            <stop offset="100%" stopColor="#19191d" />
          </radialGradient>
        ))}
      </defs>

      {/* Edges — bezier matching real canvas style */}
      {fittedEdges.map((e, i) => (
        <path key={i}
          d={`M${e.x1},${e.y1} C${e.cx},${e.y1} ${e.cx},${e.y2} ${e.x2},${e.y2}`}
          fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={1.5} strokeLinecap="round" />
      ))}

      {/* Nodes */}
      {fitted.map(n => (
        <g key={n.id}>
          {/* Card body */}
          <rect x={n.px} y={n.py} width={N} height={N} rx={n.radius}
            fill={`url(#g-${n.id})`}
            stroke="rgba(255,255,255,0.08)" strokeWidth={1} />

          {/* Color accent strip at top */}
          <rect x={n.px + 1} y={n.py + 1} width={N - 2} height={6} rx={n.radius - 1}
            fill={n.color} opacity={0.55} />

          {/* Bottom clip mask for top strip */}
          <rect x={n.px + 1} y={n.py + 5} width={N - 2} height={4}
            fill={`url(#g-${n.id})`} />

          {/* Icon dot — centered */}
          <circle cx={n.px + N / 2} cy={n.py + N / 2 + 3} r={6}
            fill={n.color} opacity={0.25} />
          <circle cx={n.px + N / 2} cy={n.py + N / 2 + 3} r={3}
            fill={n.color} opacity={0.7} />
        </g>
      ))}
    </svg>
  );
}

export default function WorkflowPreview({ preview, nodeCount, workflowId, accentColor }) {
  const [nodes, setNodes] = useState(preview?.nodes?.length ? preview.nodes : null);
  const [edges, setEdges] = useState(preview?.edges?.length ? preview.edges : null);
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

  return (
    <div style={{ width: W, height: H, position: 'relative',
      backgroundImage: 'radial-gradient(circle, #1c1c1c 1px, transparent 1px)',
      backgroundSize: '20px 20px' }}
      className="rounded-xl border border-[#1e1e1e] overflow-hidden mx-auto flex-shrink-0">

      {/* Accent glow from trigger color */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `radial-gradient(ellipse at 50% 115%, ${accentColor}15 0%, transparent 60%)` }} />

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-4 h-4 rounded-full border border-[#333] border-t-[#555] animate-spin" />
        </div>
      )}

      {!loading && nodes?.length > 0 && (
        <MiniCanvas nodes={nodes} edges={edges} accentColor={accentColor} />
      )}

      {!loading && !nodes?.length && !nodeCount && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[10px] text-[#2a2a2a] select-none">Empty workflow</span>
        </div>
      )}
    </div>
  );
}
