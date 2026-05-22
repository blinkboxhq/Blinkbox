import { useEffect, useState, useRef } from 'react';
import api from '../../../lib/api';
import { NodeRegistry, CATEGORIES } from '../../Workspace/nodeRegistry';

const W = 345;
const H = 215;
const NODE_SIZE = 42;    // regular nodes
const TOOL_SIZE = 34;    // circular tool nodes (ai_tools, agent sub-nodes)
const PAD = 28;

const CIRCULAR_CATS = new Set(['ai_tools', 'agent_llm', 'agent_memory', 'agent_tool']);

function getNodeDef(type) {
  return NodeRegistry[type] || null;
}

function getShape(type) {
  const def = getNodeDef(type);
  if (!def) return { radius: 10, size: NODE_SIZE, circular: false };
  const cat = def.category;
  if (CIRCULAR_CATS.has(cat)) return { radius: TOOL_SIZE / 2, size: TOOL_SIZE, circular: true };
  const shape = CATEGORIES.find(c => c.id === cat)?.shape;
  const radius = shape === 'sharp' ? 6 : shape === 'pill' ? 20 : shape === 'rounded' ? 10 : 14;
  return { radius, size: NODE_SIZE, circular: false };
}

function getAccentColor(type) {
  const def = getNodeDef(type);
  if (!def) return '#52525b';
  // parse colorClass like "text-blue-400" or "text-[#3b82f6]"
  const cc = def.colorClass || '';
  const hex = cc.match(/text-\[([^\]]+)\]/)?.[1];
  if (hex) return hex;
  const named = {
    'blue': '#3b82f6', 'violet': '#8b5cf6', 'amber': '#f59e0b', 'red': '#ef4444',
    'green': '#22c55e', 'emerald': '#10b981', 'cyan': '#06b6d4', 'pink': '#ec4899',
    'orange': '#f97316', 'purple': '#a855f7', 'zinc': '#71717a', 'white': '#e5e5e5',
    'rose': '#f43f5e', 'sky': '#0ea5e9', 'indigo': '#6366f1', 'teal': '#14b8a6',
  };
  for (const [k, v] of Object.entries(named)) {
    if (cc.includes(k)) return v;
  }
  return '#52525b';
}

function fitLayout(rawNodes) {
  if (!rawNodes?.length) return [];
  const xs = rawNodes.map(n => n.x ?? 0);
  const ys = rawNodes.map(n => n.y ?? 0);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const usableW = W - PAD * 2 - NODE_SIZE;
  const usableH = H - PAD * 2 - NODE_SIZE;
  const scale = Math.min(usableW / rangeX, usableH / rangeY, 1.4);
  const scaledW = rangeX * scale + NODE_SIZE;
  const scaledH = rangeY * scale + NODE_SIZE;
  const ox = (W - scaledW) / 2;
  const oy = (H - scaledH) / 2;
  return rawNodes.map(n => ({
    ...n,
    px: ox + (n.x - minX) * scale,
    py: oy + (n.y - minY) * scale,
  }));
}

function MiniNode({ node }) {
  const def = getNodeDef(node.type);
  const { radius, size, circular } = getShape(node.type);
  const color = getAccentColor(node.type);
  const Icon = def?.icon;
  const logoUrl = def?.logoUrl;
  const imgFilter = def?.imgFilter;

  const style = {
    position: 'absolute',
    left: node.px,
    top: node.py,
    width: size,
    height: size,
    borderRadius: circular ? '50%' : radius,
    background: 'linear-gradient(145deg, #232328 0%, #1c1c20 60%, #19191d 100%)',
    border: '1px solid rgba(255,255,255,0.09)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
    overflow: 'hidden',
  };

  return (
    <div style={style}>
      {/* Colored top strip (non-circular nodes) */}
      {!circular && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 5,
          background: color, opacity: 0.55, borderRadius: `${radius}px ${radius}px 0 0`,
        }} />
      )}
      {/* Icon */}
      {logoUrl ? (
        <img src={logoUrl} alt="" style={{ width: size * 0.42, height: size * 0.42, objectFit: 'contain', filter: imgFilter || undefined, opacity: 0.85 }} />
      ) : Icon ? (
        <Icon style={{ width: size * 0.38, height: size * 0.38, color: circular ? color : 'rgba(255,255,255,0.75)', strokeWidth: 1.5, flexShrink: 0 }} />
      ) : (
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, opacity: 0.6 }} />
      )}
      {/* Circular accent ring */}
      {circular && (
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `1.5px solid ${color}`, opacity: 0.4, pointerEvents: 'none' }} />
      )}
    </div>
  );
}

function EdgeLayer({ nodes, edges }) {
  const byId = Object.fromEntries(nodes.map(n => [n.id, n]));

  const paths = (edges || []).map((e, i) => {
    const s = byId[e.s ?? e.source];
    const t = byId[e.t ?? e.target];
    if (!s || !t) return null;
    const { size: sSize } = getShape(s.type);
    const { size: tSize } = getShape(t.type);
    const x1 = s.px + sSize;
    const y1 = s.py + sSize / 2;
    const x2 = t.px;
    const y2 = t.py + tSize / 2;
    const cx = (x1 + x2) / 2;
    return <path key={i} d={`M${x1},${y1} C${cx},${y1} ${cx},${y2} ${x2},${y2}`}
      fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={1.2} strokeLinecap="round" />;
  }).filter(Boolean);

  return (
    <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible' }} width={W} height={H}>
      {paths}
    </svg>
  );
}

export default function WorkflowPreview({ preview, nodeCount, workflowId, accentColor }) {
  const [rawNodes, setRawNodes] = useState(null);
  const [rawEdges, setRawEdges] = useState(null);
  const [loading, setLoading] = useState(false);
  const fetched = useRef(false);

  useEffect(() => {
    // Use preview data from list API if available
    if (preview?.nodes?.length) {
      setRawNodes(preview.nodes.map(n => ({ id: n.id, type: n.type, x: n.x ?? 0, y: n.y ?? 0 })));
      setRawEdges(preview.edges || []);
      return;
    }
    // Fallback: fetch full workflow
    if (!nodeCount || fetched.current) return;
    fetched.current = true;
    setLoading(true);
    api.get(`/api/automations/${workflowId}`)
      .then(r => {
        const wf = r.data.automation || r.data;
        setRawNodes((wf.nodes || []).map(n => ({ id: n.id, type: n.type, x: n.position?.x ?? 0, y: n.position?.y ?? 0 })));
        setRawEdges((wf.edges || []).map(e => ({ s: e.source, t: e.target })));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [workflowId, nodeCount, preview]);

  const fitted = rawNodes?.length ? fitLayout(rawNodes) : [];

  return (
    <div style={{ width: W, height: H, position: 'relative', overflow: 'hidden',
      backgroundImage: 'radial-gradient(circle, #1d1d1d 1px, transparent 1px)',
      backgroundSize: '20px 20px' }}
      className="rounded-xl border border-[#1e1e1e] mx-auto flex-shrink-0">

      {/* Trigger color glow */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `radial-gradient(ellipse at 20% 110%, ${accentColor}18 0%, transparent 55%)` }} />

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-4 h-4 rounded-full border border-[#333] border-t-[#666] animate-spin" />
        </div>
      )}

      {!loading && fitted.length > 0 && (
        <>
          <EdgeLayer nodes={fitted} edges={rawEdges} />
          {fitted.map((n, i) => <MiniNode key={n.id || i} node={n} />)}
        </>
      )}

      {!loading && !fitted.length && !nodeCount && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[10px] text-[#2a2a2a] select-none">Empty workflow</span>
        </div>
      )}
    </div>
  );
}
