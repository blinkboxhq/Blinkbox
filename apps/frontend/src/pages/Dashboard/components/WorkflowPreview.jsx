const W = 345;
const H = 215;
const PAD = 28;
const NODE_W = 38;
const NODE_H = 24;

const TYPE_COLOR = {
  webhook: '#3b82f6', webhookTrigger: '#3b82f6',
  cron_trigger: '#f59e0b', cronTrigger: '#f59e0b',
  gmail_trigger: '#ef4444', imapTrigger: '#3b82f6',
  slack_trigger: '#8b5cf6', discord_trigger: '#6366f1',
  github_trigger: '#a3a3a3', rss_trigger: '#f97316',
  shopify_trigger: '#10b981', stripe_trigger: '#8b5cf6',
  database_trigger: '#06b6d4', telegram_trigger: '#0ea5e9',
  manual: '#525252',
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

function layout(nodes, edges) {
  if (!nodes?.length) return { nodes: [], edges: [] };

  const xs = nodes.map(n => n.x ?? 0);
  const ys = nodes.map(n => n.y ?? 0);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs) + NODE_W;
  const maxY = Math.max(...ys) + NODE_H;

  const scaleX = (maxX - minX) > 0 ? (W - PAD * 2 - NODE_W) / (maxX - minX) : 1;
  const scaleY = (maxY - minY) > 0 ? (H - PAD * 2 - NODE_H) / (maxY - minY) : 1;
  const scale = Math.min(scaleX, scaleY, 1);

  const mapped = nodes.map(n => ({
    ...n,
    px: PAD + ((n.x ?? 0) - minX) * scale,
    py: PAD + ((n.y ?? 0) - minY) * scale,
    color: getColor(n.type),
  }));

  const byId = Object.fromEntries(mapped.map(n => [n.id, n]));

  const mappedEdges = (edges || []).map(e => {
    const s = byId[e.s];
    const t = byId[e.t];
    if (!s || !t) return null;
    return { x1: s.px + NODE_W / 2, y1: s.py + NODE_H / 2, x2: t.px + NODE_W / 2, y2: t.py + NODE_H / 2 };
  }).filter(Boolean);

  return { nodes: mapped, edges: mappedEdges };
}

export default function WorkflowPreview({ preview, accentColor }) {
  if (!preview?.nodes?.length) {
    return (
      <div style={{ width: W, height: H, backgroundImage: 'radial-gradient(circle, #1e1e1e 1px, transparent 1px)', backgroundSize: '18px 18px' }}
        className="rounded-xl border border-[#181818] flex items-center justify-center mx-auto">
        <span className="text-[10px] text-[#2a2a2a]">No steps yet</span>
      </div>
    );
  }

  const { nodes, edges } = layout(preview.nodes, preview.edges);

  return (
    <div style={{ width: W, height: H, position: 'relative', backgroundImage: 'radial-gradient(circle, #1a1a1a 1px, transparent 1px)', backgroundSize: '18px 18px' }}
      className="rounded-xl border border-[#181818] overflow-hidden mx-auto">

      {/* Accent glow */}
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 50% 110%, ${accentColor}14 0%, transparent 65%)`, pointerEvents: 'none' }} />

      <svg style={{ position: 'absolute', inset: 0 }} width={W} height={H}>
        {/* Edges */}
        {edges.map((e, i) => {
          const mx = (e.x1 + e.x2) / 2;
          return (
            <path key={i}
              d={`M${e.x1},${e.y1} C${mx},${e.y1} ${mx},${e.y2} ${e.x2},${e.y2}`}
              fill="none" stroke="#2a2a2a" strokeWidth={1.5} strokeLinecap="round" />
          );
        })}

        {/* Nodes */}
        {nodes.map((n, i) => (
          <g key={n.id || i}>
            <rect x={n.px} y={n.py} width={NODE_W} height={NODE_H} rx={6}
              fill="#111" stroke={n.color} strokeWidth={1.5} strokeOpacity={0.7} />
            <rect x={n.px} y={n.py} width={NODE_W} height={4} rx={6}
              fill={n.color} opacity={0.6} />
          </g>
        ))}
      </svg>
    </div>
  );
}
