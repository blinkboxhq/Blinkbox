import {
  GitBranch, GitPullRequest, GitMerge, AlertCircle, CircleDot,
  Tag, MessageSquare, MessagesSquare, Star, BookOpen, List, Search,
  Pencil, CheckCircle2, Tags, FileCode, FilePlus, FileX, Files,
  GitFork, Play, Workflow, Rocket, Package, User, UserCircle, Users,
  FolderGit2, GitCommitHorizontal, GitPullRequestClosed, ClipboardCheck,
} from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';
import CredentialPicker from '@/components/ui/CredentialPicker';

const ACCENT = '#8b949e';

const GROUPS = [
  {
    title: 'Issues',
    ops: [
      { value: 'listIssues', label: 'List Issues', icon: List },
      { value: 'getIssue', label: 'Get Issue', icon: Search },
      { value: 'createIssue', label: 'Create Issue', icon: AlertCircle },
      { value: 'updateIssue', label: 'Update Issue', icon: Pencil },
      { value: 'closeIssue', label: 'Close Issue', icon: CircleDot },
      { value: 'addLabels', label: 'Add Labels', icon: Tags },
      { value: 'createComment', label: 'Add Comment', icon: MessageSquare },
      { value: 'listComments', label: 'List Comments', icon: MessagesSquare },
    ],
  },
  {
    title: 'Pull Requests',
    ops: [
      { value: 'listPRs', label: 'List PRs', icon: GitPullRequest },
      { value: 'getPR', label: 'Get PR', icon: GitPullRequest },
      { value: 'createPR', label: 'Create PR', icon: GitBranch },
      { value: 'updatePR', label: 'Update PR', icon: Pencil },
      { value: 'mergePR', label: 'Merge PR', icon: GitMerge },
      { value: 'listPRFiles', label: 'List PR Files', icon: Files },
      { value: 'requestReviewers', label: 'Request Review', icon: Users },
      { value: 'createReview', label: 'Submit Review', icon: ClipboardCheck },
    ],
  },
  {
    title: 'Content & Branches',
    ops: [
      { value: 'createFile', label: 'Create / Update File', icon: FilePlus },
      { value: 'getFile', label: 'Get File', icon: FileCode },
      { value: 'deleteFile', label: 'Delete File', icon: FileX },
      { value: 'listBranches', label: 'List Branches', icon: GitBranch },
      { value: 'getBranch', label: 'Get Branch', icon: GitBranch },
      { value: 'createBranch', label: 'Create Branch', icon: GitFork },
      { value: 'listCommits', label: 'List Commits', icon: GitCommitHorizontal },
      { value: 'getCommit', label: 'Get Commit', icon: GitCommitHorizontal },
    ],
  },
  {
    title: 'Releases & Actions',
    ops: [
      { value: 'createRelease', label: 'Create Release', icon: Tag },
      { value: 'listReleases', label: 'List Releases', icon: Rocket },
      { value: 'getLatestRelease', label: 'Latest Release', icon: Star },
      { value: 'listWorkflowRuns', label: 'Workflow Runs', icon: Workflow },
      { value: 'dispatchWorkflow', label: 'Dispatch Workflow', icon: Play },
    ],
  },
  {
    title: 'Repos, Users & Search',
    ops: [
      { value: 'getRepo', label: 'Get Repo', icon: BookOpen },
      { value: 'listMyRepos', label: 'My Repos', icon: FolderGit2 },
      { value: 'createRepo', label: 'Create Repo', icon: Package },
      { value: 'getUser', label: 'Get User', icon: User },
      { value: 'getAuthenticatedUser', label: 'My Profile', icon: UserCircle },
      { value: 'searchIssues', label: 'Search Issues', icon: Search },
      { value: 'searchRepos', label: 'Search Repos', icon: Search },
      { value: 'searchCode', label: 'Search Code', icon: Search },
    ],
  },
];

const NO_REPO_OPS = [
  'getAuthenticatedUser', 'listMyRepos', 'createRepo', 'getUser',
  'searchIssues', 'searchRepos', 'searchCode',
];

const lbl = 'text-[10px] font-bold text-zinc-500 uppercase tracking-widest';

function Field({ label, hint, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className={lbl}>{label}</span>
      {children}
      {hint && <span className="text-[9px] text-zinc-600">{hint}</span>}
    </div>
  );
}

function Toggle({ value, onChange, label }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="flex items-center justify-between w-full px-3 py-2.5 bg-[#0a0a0a] border border-[#222] rounded-lg"
    >
      <span className="text-xs font-semibold text-zinc-300">{label}</span>
      <span className={`relative w-10 h-5 rounded-full transition-colors ${value ? 'bg-zinc-400' : 'bg-zinc-700'}`}>
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${value ? 'left-[22px]' : 'left-0.5'}`} />
      </span>
    </button>
  );
}

export default function GithubNode({ config = {}, updateConfig, nodeId }) {
  const op = config.operation || 'listIssues';
  const set = (k) => (v) => updateConfig(k, v);
  const showRepo = !NO_REPO_OPS.includes(op);

  const Var = ({ k, placeholder, multiline }) => (
    <SmartVariableInput nodeId={nodeId} value={config[k] || ''} onChange={set(k)} placeholder={placeholder} multiline={multiline} />
  );

  return (
    <div className="flex flex-col gap-5 w-full">
      <div className="flex items-center gap-3 p-4 bg-zinc-900/80 border border-zinc-700/40 rounded-xl">
        <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
          <GitBranch className="w-4 h-4 text-zinc-200" />
        </div>
        <div>
          <span className="text-sm font-bold text-zinc-100">GitHub</span>
          <span className="text-[10px] text-zinc-500 block">Issues, PRs, content, releases, actions & search</span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <span className={lbl}>Operation</span>
        {GROUPS.map((group) => (
          <div key={group.title} className="flex flex-col gap-1.5">
            <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">{group.title}</span>
            <div className="grid grid-cols-2 gap-2">
              {group.ops.map((o) => {
                const Icon = o.icon;
                const active = op === o.value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => updateConfig('operation', o.value)}
                    className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-left transition-all duration-150 ${
                      active
                        ? 'bg-zinc-400/10 border-zinc-400/40 text-zinc-100'
                        : 'bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
                    <span className="text-[11px] font-semibold truncate">{o.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-[#222]" />

      {showRepo && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Owner"><Var k="owner" placeholder="octocat" /></Field>
          <Field label="Repository"><Var k="repo" placeholder="my-repo" /></Field>
        </div>
      )}

      {['listIssues', 'listPRs'].includes(op) && (
        <Field label="State">
          <div className="grid grid-cols-3 gap-1.5">
            {['open', 'closed', 'all'].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => updateConfig('state', s)}
                className={`py-2 rounded-lg border text-xs font-bold capitalize transition-all ${
                  (config.state || 'open') === s
                    ? 'bg-zinc-400/10 border-zinc-400/40 text-zinc-100'
                    : 'bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </Field>
      )}

      {['listIssues', 'listPRs', 'listComments', 'listPRFiles', 'listBranches', 'listCommits', 'listReleases', 'listMyRepos', 'listWorkflowRuns', 'searchIssues', 'searchRepos', 'searchCode'].includes(op) && (
        <Field label="Limit" hint="Max results to return (1–100)">
          <Var k="limit" placeholder="30" />
        </Field>
      )}

      {['getIssue', 'updateIssue', 'closeIssue', 'addLabels', 'createComment', 'listComments'].includes(op) && (
        <Field label="Issue Number"><Var k="issueNumber" placeholder="42" /></Field>
      )}

      {['getPR', 'updatePR', 'mergePR', 'listPRFiles', 'requestReviewers', 'createReview'].includes(op) && (
        <Field label="PR Number"><Var k="prNumber" placeholder="{{n1.number}}" /></Field>
      )}

      {(op === 'createIssue' || op === 'updateIssue') && (
        <>
          <Field label="Title"><Var k="title" placeholder="Bug: something is broken" /></Field>
          <Field label="Body"><Var k="body" placeholder="{{n1.errorDetails}}" multiline /></Field>
          <Field label="Labels" hint="Comma-separated"><Var k="labels" placeholder="bug, help wanted" /></Field>
          <Field label="Assignees" hint="Comma-separated usernames"><Var k="assignees" placeholder="octocat, hubot" /></Field>
        </>
      )}

      {op === 'updateIssue' && (
        <Field label="State">
          <div className="grid grid-cols-2 gap-1.5">
            {['open', 'closed'].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => updateConfig('state', s)}
                className={`py-2 rounded-lg border text-xs font-bold capitalize transition-all ${
                  config.state === s ? 'bg-zinc-400/10 border-zinc-400/40 text-zinc-100' : 'bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </Field>
      )}

      {op === 'closeIssue' && (
        <Field label="Close Reason">
          <div className="grid grid-cols-2 gap-1.5">
            {[['completed', 'Completed'], ['not_planned', 'Not Planned']].map(([v, l]) => (
              <button
                key={v}
                type="button"
                onClick={() => updateConfig('stateReason', v)}
                className={`py-2 rounded-lg border text-xs font-bold transition-all ${
                  (config.stateReason || 'completed') === v ? 'bg-zinc-400/10 border-zinc-400/40 text-zinc-100' : 'bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </Field>
      )}

      {op === 'addLabels' && (
        <Field label="Labels" hint="Comma-separated"><Var k="labels" placeholder="bug, priority:high" /></Field>
      )}

      {op === 'createComment' && (
        <Field label="Comment"><Var k="body" placeholder="{{n1.summary}}" multiline /></Field>
      )}

      {(op === 'createPR' || op === 'updatePR') && (
        <Field label="Title"><Var k="title" placeholder="feat: add new feature" /></Field>
      )}

      {op === 'createPR' && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Head Branch"><Var k="head" placeholder="feature/my-branch" /></Field>
            <Field label="Base Branch"><Var k="base" placeholder="main" /></Field>
          </div>
          <Field label="Description"><Var k="body" placeholder="What this PR does…" multiline /></Field>
          <Toggle value={!!config.draft} onChange={set('draft')} label="Open as draft" />
        </>
      )}

      {op === 'updatePR' && (
        <Field label="Description"><Var k="body" placeholder="Updated description…" multiline /></Field>
      )}

      {op === 'mergePR' && (
        <>
          <Field label="Merge Method">
            <div className="grid grid-cols-3 gap-1.5">
              {[['merge', 'Merge'], ['squash', 'Squash'], ['rebase', 'Rebase']].map(([v, l]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => updateConfig('mergeMethod', v)}
                  className={`py-2 rounded-lg border text-xs font-bold transition-all ${
                    (config.mergeMethod || 'merge') === v ? 'bg-zinc-400/10 border-zinc-400/40 text-zinc-100' : 'bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Commit Title" hint="Optional"><Var k="commitTitle" placeholder="Merge pull request #42" /></Field>
        </>
      )}

      {op === 'requestReviewers' && (
        <>
          <Field label="Reviewers" hint="Comma-separated usernames"><Var k="reviewers" placeholder="octocat, hubot" /></Field>
          <Field label="Team Reviewers" hint="Comma-separated team slugs"><Var k="teamReviewers" placeholder="core-team" /></Field>
        </>
      )}

      {op === 'createReview' && (
        <>
          <Field label="Review Action">
            <div className="grid grid-cols-3 gap-1.5">
              {[['APPROVE', 'Approve'], ['REQUEST_CHANGES', 'Request'], ['COMMENT', 'Comment']].map(([v, l]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => updateConfig('reviewEvent', v)}
                  className={`py-2 rounded-lg border text-[11px] font-bold transition-all ${
                    (config.reviewEvent || 'COMMENT') === v ? 'bg-zinc-400/10 border-zinc-400/40 text-zinc-100' : 'bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Review Body"><Var k="body" placeholder="Looks good!" multiline /></Field>
        </>
      )}

      {['createFile', 'getFile', 'deleteFile'].includes(op) && (
        <Field label="File Path"><Var k="path" placeholder="src/index.js" /></Field>
      )}

      {op === 'createFile' && (
        <>
          <Field label="Content"><Var k="content" placeholder="{{n1.fileContents}}" multiline /></Field>
          <Field label="Commit Message"><Var k="commitMessage" placeholder="Update index.js" /></Field>
          <Field label="Branch" hint="Defaults to repo default branch"><Var k="branch" placeholder="main" /></Field>
        </>
      )}

      {op === 'deleteFile' && (
        <>
          <Field label="Commit Message"><Var k="commitMessage" placeholder="Remove file" /></Field>
          <Field label="Branch" hint="Optional"><Var k="branch" placeholder="main" /></Field>
        </>
      )}

      {op === 'getFile' && (
        <Field label="Branch / Ref" hint="Optional"><Var k="branch" placeholder="main" /></Field>
      )}

      {(op === 'getBranch' || op === 'createBranch') && (
        <Field label={op === 'createBranch' ? 'New Branch Name' : 'Branch'}><Var k="branch" placeholder="feature/new-thing" /></Field>
      )}

      {op === 'createBranch' && (
        <Field label="Create From" hint="Source branch (defaults to main)"><Var k="fromBranch" placeholder="main" /></Field>
      )}

      {op === 'listCommits' && (
        <>
          <Field label="Branch" hint="Optional"><Var k="branch" placeholder="main" /></Field>
          <Field label="Path Filter" hint="Optional — only commits touching this path"><Var k="path" placeholder="src/" /></Field>
        </>
      )}

      {op === 'getCommit' && (
        <Field label="Commit SHA"><Var k="sha" placeholder="{{n1.sha}}" /></Field>
      )}

      {op === 'createRelease' && (
        <>
          <Field label="Tag Name"><Var k="tagName" placeholder="v1.2.0" /></Field>
          <Field label="Release Name" hint="Optional — defaults to tag"><Var k="name" placeholder="Version 1.2.0" /></Field>
          <Field label="Release Notes"><Var k="body" placeholder="{{n1.changelog}}" multiline /></Field>
          <Toggle value={!!config.draft} onChange={set('draft')} label="Draft release" />
          <Toggle value={!!config.prerelease} onChange={set('prerelease')} label="Mark as pre-release" />
        </>
      )}

      {op === 'dispatchWorkflow' && (
        <>
          <Field label="Workflow" hint="Filename (e.g. ci.yml) or workflow ID"><Var k="workflowId" placeholder="ci.yml" /></Field>
          <Field label="Ref / Branch"><Var k="branch" placeholder="main" /></Field>
          <Field label="Inputs (JSON)" hint="Optional — workflow_dispatch inputs"><Var k="workflowInputs" placeholder='{"env":"prod"}' multiline /></Field>
        </>
      )}

      {op === 'listWorkflowRuns' && (
        <Field label="Workflow" hint="Optional — filename or ID; blank = all runs"><Var k="workflowId" placeholder="ci.yml" /></Field>
      )}

      {op === 'createRepo' && (
        <>
          <Field label="Name"><Var k="name" placeholder="my-new-repo" /></Field>
          <Field label="Organization" hint="Optional — blank creates under your account"><Var k="org" placeholder="my-org" /></Field>
          <Field label="Description"><Var k="description" placeholder="A short description" /></Field>
          <Toggle value={!!config.private} onChange={set('private')} label="Private repository" />
          <Toggle value={!!config.autoInit} onChange={set('autoInit')} label="Initialize with README" />
        </>
      )}

      {op === 'getUser' && (
        <Field label="Username"><Var k="username" placeholder="octocat" /></Field>
      )}

      {['searchIssues', 'searchRepos', 'searchCode'].includes(op) && (
        <Field label="Search Query" hint="GitHub search syntax">
          <Var k="query" placeholder={op === 'searchCode' ? 'addClass repo:jquery/jquery' : 'is:open label:bug'} multiline />
        </Field>
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
        <span className="text-[9px] font-mono text-zinc-500 block">{"{{ nodeId.number }}"} — issue / PR number</span>
        <span className="text-[9px] font-mono text-zinc-500 block">{"{{ nodeId.url }}"} — HTML URL</span>
        <span className="text-[9px] font-mono text-zinc-500 block">{"{{ nodeId.sha }}"} — commit / file SHA</span>
      </div>
    </div>
  );
}
