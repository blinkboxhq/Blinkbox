import { useState } from 'react';
import { Circle, Zap, Code2, Mail, Globe, GitBranch, Clock, Database, Box, Cpu, MessageSquare, Webhook } from 'lucide-react';
import useWorkspaceStore from '../../../store/workspaceStore';

const TYPE_ICON = {
  webhook: Webhook,
  cron_trigger: Clock,
  manual: Zap,
  email: Mail,
  email_trigger: Mail,
  gmail_trigger: Mail,
  imap_trigger: Mail,
  code: Code2,
  http_request: Globe,
  logic_router: GitBranch,
  data_mapper: Database,
  web_scraper: Globe,
  ai_agent: Cpu,
  chat_trigger: MessageSquare,
};

function getIcon(backendType) {
  return TYPE_ICON[backendType] || Box;
}

function statusDot(status) {
  if (status === 'completed' || status === 'executed') return 'bg-emerald-400';
  if (status === 'failed') return 'bg-red-400';
  if (status === 'running') return 'bg-blue-400 animate-pulse';
  return null;
}

// Recursive tree node with │ ├ └ connector lines
function TreeNode({ node, edges, allNodes, depth, isLast, ancestorLines, visited }) {
  const [open, setOpen] = useState(true);
  const nodeStatuses    = useWorkspaceStore(s => s.nodeStatuses);
  const selectedNodeId  = useWorkspaceStore(s => s.selectedNodeId);
  const setSelectedNodeId = useWorkspaceStore(s => s.setSelectedNodeId);

  if (visited.has(node.id)) return null;
  const nextVisited = new Set([...visited, node.id]);

  const children = edges
    .filter(e => e.source === node.id)
    .map(e => allNodes.find(n => n.id === e.target))
    .filter(Boolean);

  const status   = nodeStatuses?.[node.id];
  const dot      = statusDot(status);
  const Icon     = getIcon(node.data?.backendType);
  const isTrigger = node.data?.type === 'trigger';
  const isSelected = selectedNodeId === node.id;

  // Build the line prefix for this depth
  // ancestorLines[i] = true → draw a vertical continuation line at that indent level
  const LINE_W = 16; // px per indent level

  return (
    <div>
      <div
        className={`relative flex items-center h-[26px] pr-2 cursor-pointer group transition-colors rounded-md mx-1
          ${isSelected ? 'bg-white/[0.07]' : 'hover:bg-white/[0.04]'}`}
        onClick={() => setSelectedNodeId(node.id)}
        style={{ paddingLeft: `${depth * LINE_W + 8}px` }}
      >
        {/* Vertical continuation lines for ancestor levels */}
        {ancestorLines.map((show, i) =>
          show ? (
            <span
              key={i}
              className="absolute top-0 bottom-0 border-l border-neutral-800"
              style={{ left: `${i * LINE_W + 8 + LINE_W / 2}px` }}
            />
          ) : null
        )}

        {/* The branch connector: vertical down to here + horizontal across */}
        {depth > 0 && (
          <>
            {/* Vertical part of connector (top half) */}
            <span
              className="absolute top-0 border-l border-neutral-800"
              style={{
                left: `${(depth - 1) * LINE_W + 8 + LINE_W / 2}px`,
                height: '13px',
              }}
            />
            {/* Horizontal part */}
            <span
              className="absolute border-t border-neutral-800"
              style={{
                top: '13px',
                left: `${(depth - 1) * LINE_W + 8 + LINE_W / 2}px`,
                width: `${LINE_W / 2 + 2}px`,
              }}
            />
            {/* Vertical continuation below (only if NOT last child) */}
            {!isLast && (
              <span
                className="absolute border-l border-neutral-800"
                style={{
                  left: `${(depth - 1) * LINE_W + 8 + LINE_W / 2}px`,
                  top: '13px',
                  bottom: 0,
                }}
              />
            )}
          </>
        )}

        {/* Expand/collapse toggle */}
        {children.length > 0 && (
          <button
            className="w-3.5 h-3.5 flex items-center justify-center mr-1 shrink-0 relative z-10"
            onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
          >
            <span className={`w-1.5 h-1.5 rounded-sm border border-neutral-700 bg-neutral-900 flex items-center justify-center transition-colors group-hover:border-neutral-600`}>
              <span className={`block w-[5px] h-px bg-neutral-600 transition-transform ${open ? '' : 'rotate-90'}`} />
              <span className="block w-px h-[5px] bg-neutral-600 absolute" style={{ display: open ? 'none' : 'block' }} />
            </span>
          </button>
        )}
        {children.length === 0 && <span className="w-3.5 mr-1 shrink-0" />}

        {/* Node icon */}
        <Icon className={`w-3 h-3 mr-1.5 shrink-0 relative z-10 ${isTrigger ? 'text-amber-400/90' : 'text-neutral-600'}`} />

        {/* Label */}
        <span className={`text-[11px] truncate flex-1 relative z-10 transition-colors ${isSelected ? 'text-white' : 'text-neutral-500 group-hover:text-neutral-300'}`}>
          {node.data?.label || node.data?.backendType || node.id}
        </span>

        {/* Status dot */}
        {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 relative z-10 ml-1 ${dot}`} />}
      </div>

      {/* Children */}
      {open && children.map((child, i) => {
        const childIsLast = i === children.length - 1;
        // Pass down which ancestor levels still have a vertical continuation
        const nextAncestorLines = [...ancestorLines, !isLast];
        return (
          <TreeNode
            key={child.id}
            node={child}
            edges={edges}
            allNodes={allNodes}
            depth={depth + 1}
            isLast={childIsLast}
            ancestorLines={nextAncestorLines}
            visited={nextVisited}
          />
        );
      })}
    </div>
  );
}

export default function NodeTreePanel({ embedded = false, hideHeader = false, className = '' }) {
  const nodes = useWorkspaceStore(s => s.nodes);
  const edges = useWorkspaceStore(s => s.edges);
  const workflowName = useWorkspaceStore(s => s.workflowName);

  const targetIds  = new Set(edges.map(e => e.target));
  const roots = nodes.filter(n => !targetIds.has(n.id));
  const displayRoots = roots.length > 0 ? roots : nodes.slice(0, 1);

  return (
    <div className={`${embedded ? 'flex-1 min-w-0' : 'w-[220px] shrink-0 border-l border-[#222]'} bg-neutral-950 flex flex-col overflow-hidden ${className}`}>
      {/* Header */}
      {!hideHeader && (
        <div className="px-3 py-2 border-b border-[#222] shrink-0 flex items-center justify-between">
          <p className="text-[10px] font-medium text-neutral-600 uppercase tracking-widest">Flow</p>
          <span className="text-[10px] text-neutral-700 font-mono">{nodes.length}</span>
        </div>
      )}

      {/* Tree */}
      <div className="flex-1 overflow-y-auto py-1.5 min-h-0">
        {nodes.length === 0 ? (
          <p className="text-[11px] text-neutral-700 text-center mt-6 px-4">No nodes yet.</p>
        ) : (
          <>
            {/* Workflow root label */}
            <div className="flex items-center gap-1.5 px-3 py-[3px] mb-0.5">
              <span className="text-[10px] text-neutral-700 truncate font-medium">{workflowName}</span>
            </div>
            {displayRoots.map((root, i) => (
              <TreeNode
                key={root.id}
                node={root}
                edges={edges}
                allNodes={nodes}
                depth={0}
                isLast={i === displayRoots.length - 1}
                ancestorLines={[]}
                visited={new Set()}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
