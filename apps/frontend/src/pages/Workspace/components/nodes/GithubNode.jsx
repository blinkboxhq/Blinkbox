import {
  GitBranch, GitPullRequest, GitMerge, AlertCircle,
  Tag, MessageSquare, Star, BookOpen, List, Search,
} from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';
import CredentialPicker from '../../../../components/ui/CredentialPicker';

const OPERATIONS = [
  { value: 'listIssues',    label: 'List Issues',        icon: List },
  { value: 'getIssue',      label: 'Get Issue',          icon: Search },
  { value: 'createIssue',   label: 'Create Issue',       icon: AlertCircle },
  { value: 'createComment', label: 'Add Comment',        icon: MessageSquare },
  { value: 'listPRs',       label: 'List Pull Requests', icon: GitPullRequest },
  { value: 'createPR',      label: 'Create PR',          icon: GitBranch },
  { value: 'mergePR',       label: 'Merge PR',           icon: GitMerge },
  { value: 'getRepo',       label: 'Get Repo Info',      icon: BookOpen },
  { value: 'createRelease', label: 'Create Release',     icon: Tag },
];

export default function GithubNode({ config = {}, updateConfig, nodeId }) {
  const op = config.operation || 'listIssues';

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-zinc-900/80 border border-zinc-700/40 rounded-xl">
        <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
          <GitBranch className="w-4 h-4 text-zinc-200" />
        </div>
        <div>
          <span className="text-sm font-bold text-zinc-100">GitHub</span>
          <span className="text-[10px] text-zinc-500 block">Issues, PRs, releases, and more</span>
        </div>
      </div>

      {/* Operation picker */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Operation</span>
        <div className="grid grid-cols-1 gap-1">
          {OPERATIONS.map((o) => {
            const Icon = o.icon;
            const active = op === o.value;
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => updateConfig('operation', o.value)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all duration-150
                  ${active
                    ? 'bg-zinc-700/30 border-zinc-600/50'
                    : 'bg-[#0d0d0d] border-[#222] hover:bg-zinc-800/40 hover:border-zinc-700/40'
                  }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${active ? 'text-zinc-200' : 'text-zinc-500'}`}
                  strokeWidth={1.75}
                />
                <span className={`text-xs font-semibold ${active ? 'text-zinc-100' : 'text-zinc-400'}`}>
                  {o.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="border-t border-[#222]" />

      {/* Repo context — always visible */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Owner</span>
          <SmartVariableInput
            nodeId={nodeId}
            value={config.owner || ''}
            onChange={(v) => updateConfig('owner', v)}
            placeholder="octocat"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Repository</span>
          <SmartVariableInput
            nodeId={nodeId}
            value={config.repo || ''}
            onChange={(v) => updateConfig('repo', v)}
            placeholder="my-repo"
          />
        </div>
      </div>

      {/* State filter — listIssues / listPRs */}
      {['listIssues', 'listPRs'].includes(op) && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">State</span>
          <div className="grid grid-cols-3 gap-1.5">
            {['open', 'closed', 'all'].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => updateConfig('state', s)}
                className={`py-2 rounded-lg border text-xs font-bold capitalize transition-all ${
                  (config.state || 'open') === s
                    ? 'bg-zinc-700/30 border-zinc-600/50 text-zinc-100'
                    : 'bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Issue number */}
      {['getIssue', 'createComment'].includes(op) && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Issue Number</span>
          <SmartVariableInput
            nodeId={nodeId}
            value={config.issueNumber || ''}
            onChange={(v) => updateConfig('issueNumber', v)}
            placeholder="42"
          />
        </div>
      )}

      {/* Create issue */}
      {op === 'createIssue' && (
        <>
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Title</span>
            <SmartVariableInput
              nodeId={nodeId}
              value={config.title || ''}
              onChange={(v) => updateConfig('title', v)}
              placeholder="Bug: something is broken"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Body</span>
            <SmartVariableInput
              nodeId={nodeId}
              value={config.body || ''}
              onChange={(v) => updateConfig('body', v)}
              placeholder="{{n1.errorDetails}}"
              multiline
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Labels (comma-separated)</span>
            <SmartVariableInput
              nodeId={nodeId}
              value={config.labels || ''}
              onChange={(v) => updateConfig('labels', v)}
              placeholder="bug, help wanted"
            />
          </div>
        </>
      )}

      {/* Add comment */}
      {op === 'createComment' && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Comment</span>
          <SmartVariableInput
            nodeId={nodeId}
            value={config.body || ''}
            onChange={(v) => updateConfig('body', v)}
            placeholder="{{n1.summary}}"
            multiline
          />
        </div>
      )}

      {/* Create PR */}
      {op === 'createPR' && (
        <>
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Title</span>
            <SmartVariableInput
              nodeId={nodeId}
              value={config.title || ''}
              onChange={(v) => updateConfig('title', v)}
              placeholder="feat: add new feature"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Head Branch</span>
              <SmartVariableInput
                nodeId={nodeId}
                value={config.head || ''}
                onChange={(v) => updateConfig('head', v)}
                placeholder="feature/my-branch"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Base Branch</span>
              <SmartVariableInput
                nodeId={nodeId}
                value={config.base || 'main'}
                onChange={(v) => updateConfig('base', v)}
                placeholder="main"
              />
            </div>
          </div>
        </>
      )}

      {/* Merge PR */}
      {op === 'mergePR' && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">PR Number</span>
          <SmartVariableInput
            nodeId={nodeId}
            value={config.prNumber || ''}
            onChange={(v) => updateConfig('prNumber', v)}
            placeholder="{{n1.number}}"
          />
        </div>
      )}

      {/* Create release */}
      {op === 'createRelease' && (
        <>
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Tag Name</span>
            <SmartVariableInput
              nodeId={nodeId}
              value={config.tagName || ''}
              onChange={(v) => updateConfig('tagName', v)}
              placeholder="v1.2.0"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Release Notes</span>
            <SmartVariableInput
              nodeId={nodeId}
              value={config.body || ''}
              onChange={(v) => updateConfig('body', v)}
              placeholder="{{n1.changelog}}"
              multiline
            />
          </div>
        </>
      )}

      <CredentialPicker
        value={config.credentialId || ''}
        onChange={(id) => updateConfig('credentialId', id)}
        accentColor="zinc"
        label="GitHub Personal Access Token"
        placeholder="Select GitHub credential..."
      />

      <div className="p-2 bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg">
        <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest block mb-0.5">Available as</span>
        <span className="text-[9px] font-mono text-zinc-500 block">{"{{ nodeId.items }}"} — array of results</span>
        <span className="text-[9px] font-mono text-zinc-500 block">{"{{ nodeId.number }}"} — issue / PR number</span>
        <span className="text-[9px] font-mono text-zinc-500 block">{"{{ nodeId.url }}"} — HTML URL</span>
      </div>
    </div>
  );
}
