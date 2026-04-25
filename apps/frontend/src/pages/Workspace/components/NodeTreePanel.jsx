import { useState } from 'react';
import { ChevronDown, ChevronRight, Folder, FolderOpen, Circle, ArrowRight, Zap, Code2, Mail, Globe, GitBranch, Clock, Database, Box } from 'lucide-react';
import useWorkspaceStore from '../../../store/workspaceStore';

const TYPE_ICON = {
  webhook: Globe,
  cron_trigger: Clock,
  manual: Zap,
  email: Mail,
  email_trigger: Mail,
  code: Code2,
  http_request: Globe,
  logic_router: GitBranch,
  data_mapper: Database,
  web_scraper: Globe,
  chat_trigger: Box,
};

function nodeIcon(backendType) {
  const Icon = TYPE_ICON[backendType] || Box;
  return Icon;
}

function statusColor(status) {
  if (status === 'completed' || status === 'executed') return 'text-emerald-400';
  if (status === 'failed') return 'text-red-400';
  if (status === 'running') return 'text-blue-400';
  return 'text-zinc-600';
}

function NodeRow({ node, edges, allNodes, depth = 0, visited = new Set() }) {
  const [open, setOpen] = useState(true);
  const nodeStatuses = useWorkspaceStore(s => s.nodeStatuses);
  const setSelectedNodeId = useWorkspaceStore(s => s.setSelectedNodeId);

  if (visited.has(node.id)) return null;
  visited = new Set([...visited, node.id]);

  const children = edges
    .filter(e => e.source === node.id)
    .map(e => allNodes.find(n => n.id === e.target))
    .filter(Boolean);

  const status = nodeStatuses?.[node.id];
  const Icon = nodeIcon(node.data?.backendType);
  const isTrigger = node.data?.type === 'trigger';

  return (
    <div>
      <div
        className="flex items-center gap-1.5 py-[3px] px-2 rounded-md hover:bg-zinc-800/60 cursor-pointer group transition-colors"
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        onClick={() => setSelectedNodeId(node.id)}
      >
        {/* Expand arrow */}
        <button
          className="w-3.5 h-3.5 flex items-center justify-center text-zinc-700 hover:text-zinc-400 shrink-0"
          onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        >
          {children.length > 0
            ? open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />
            : <span className="w-3 h-3 inline-block" />
          }
        </button>

        {/* Icon */}
        <Icon className={`w-3.5 h-3.5 shrink-0 ${isTrigger ? 'text-amber-400' : 'text-zinc-500'}`} />

        {/* Label */}
        <span className="text-[11.5px] text-zinc-400 group-hover:text-zinc-200 truncate flex-1 transition-colors">
          {node.data?.label || node.data?.backendType || node.id}
        </span>

        {/* Status dot */}
        {status && (
          <Circle className={`w-1.5 h-1.5 shrink-0 fill-current ${statusColor(status)}`} />
        )}

        {/* Edge arrow hint */}
        {children.length > 0 && (
          <ArrowRight className="w-2.5 h-2.5 text-zinc-800 group-hover:text-zinc-600 shrink-0 transition-colors" />
        )}
      </div>

      {/* Children */}
      {open && children.map(child => (
        <NodeRow
          key={child.id}
          node={child}
          edges={edges}
          allNodes={allNodes}
          depth={depth + 1}
          visited={visited}
        />
      ))}
    </div>
  );
}

export default function NodeTreePanel() {
  const nodes = useWorkspaceStore(s => s.nodes);
  const edges = useWorkspaceStore(s => s.edges);
  const workflowName = useWorkspaceStore(s => s.workflowName);
  const [folderOpen, setFolderOpen] = useState(true);

  // Root nodes = nodes with no incoming edges
  const targetIds = new Set(edges.map(e => e.target));
  const roots = nodes.filter(n => !targetIds.has(n.id));
  const displayRoots = roots.length > 0 ? roots : nodes.slice(0, 1);

  return (
    <div className="w-[220px] shrink-0 bg-[#0a0a0a] border-l border-zinc-800/80 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-zinc-800/60 shrink-0">
        <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-widest">Node Tree</p>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto py-2 min-h-0">
        {nodes.length === 0 ? (
          <p className="text-[11px] text-zinc-700 text-center mt-6 px-4">No nodes yet.</p>
        ) : (
          <>
            {/* Workflow folder */}
            <div
              className="flex items-center gap-1.5 px-2 py-[3px] rounded-md hover:bg-zinc-800/40 cursor-pointer mb-0.5 transition-colors"
              onClick={() => setFolderOpen(o => !o)}
            >
              <button className="w-3.5 h-3.5 flex items-center justify-center text-zinc-600 shrink-0">
                {folderOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              </button>
              {folderOpen
                ? <FolderOpen className="w-3.5 h-3.5 text-amber-400/80 shrink-0" />
                : <Folder className="w-3.5 h-3.5 text-amber-400/80 shrink-0" />
              }
              <span className="text-[11.5px] font-medium text-zinc-300 truncate">{workflowName}</span>
              <span className="text-[10px] text-zinc-700 shrink-0 ml-auto">{nodes.length}</span>
            </div>

            {/* Nodes */}
            {folderOpen && displayRoots.map(root => (
              <NodeRow
                key={root.id}
                node={root}
                edges={edges}
                allNodes={nodes}
                depth={1}
              />
            ))}
          </>
        )}
      </div>

      {/* Footer stats */}
      <div className="px-3 py-2 border-t border-zinc-800/60 shrink-0">
        <div className="flex items-center justify-between text-[10px] text-zinc-700">
          <span>{nodes.length} nodes</span>
          <span>{edges.length} edges</span>
        </div>
      </div>
    </div>
  );
}
