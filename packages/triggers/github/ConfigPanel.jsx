import { useState } from 'react';
import { Github, Info, CheckCircle, Circle } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { API_URL } from '@/lib/api';
import CredentialPicker from '@/components/ui/CredentialPicker';

const GITHUB_EVENTS = [
  { value: 'push',                label: 'Push',                  desc: 'Commits pushed to any branch' },
  { value: 'pull_request',        label: 'Pull Request',          desc: 'PR opened, closed, merged, or updated' },
  { value: 'pull_request_review', label: 'PR Review',             desc: 'Review submitted on a PR' },
  { value: 'issues',              label: 'Issue',                 desc: 'Issue opened, closed, or labeled' },
  { value: 'issue_comment',       label: 'Issue / PR Comment',    desc: 'Comment posted on issue or PR' },
  { value: 'release',             label: 'Release',               desc: 'Release published or created' },
  { value: 'create',              label: 'Branch / Tag Created',  desc: 'New branch or tag created' },
  { value: 'delete',              label: 'Branch / Tag Deleted',  desc: 'Branch or tag deleted' },
  { value: 'workflow_run',        label: 'Workflow Run',          desc: 'GitHub Actions workflow completed' },
  { value: 'star',                label: 'Star',                  desc: 'Repository starred or unstarred' },
  { value: 'fork',                label: 'Fork',                  desc: 'Repository forked' },
  { value: 'member',              label: 'Collaborator',          desc: 'Collaborator added or removed' },
];

export default function GitHubTriggerNode({ config = {}, updateConfig, nodeId }) {
  const { id: automationId } = useParams();
  const [activeTab, setActiveTab] = useState('setup');

  const repo = config.repo || '';
  const selectedEvents = config.events || ['push'];
  const webhookUrl = `${API_URL}/webhook/${automationId}`;
  const isRegistered = config.webhookRegistered ?? false;

  const toggleEvent = (val) => {
    const current = selectedEvents;
    const updated = current.includes(val)
      ? current.filter((e) => e !== val)
      : [...current, val];
    updateConfig?.('events', updated);
  };

  return (
    <div className="flex flex-col">

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#2A2A2A] bg-[#111111] rounded-t-xl">
        <div className="p-1 bg-[#222] rounded-md border border-[#333]">
          <Github className="w-3 h-3 text-zinc-300" />
        </div>
        <span className="text-[11px] font-semibold text-zinc-200 tracking-wide">GitHub</span>
        {isRegistered && (
          <span className="ml-auto flex items-center gap-1 text-[9px] text-emerald-400 font-semibold">
            <CheckCircle className="w-3 h-3" /> Connected
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex bg-[#0a0a0a] px-3 pt-2 gap-3 border-b border-[#1a1a1a]">
        {['setup', 'events', 'payload'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-2 text-[9px] font-bold uppercase tracking-widest border-b-2 transition-all ${activeTab === tab ? 'border-zinc-400 text-zinc-300' : 'border-transparent text-zinc-600 hover:text-zinc-400'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="p-3 flex flex-col gap-3">

        {activeTab === 'setup' && (
          <>
            {/* Repo */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Repository</label>
              <input
                value={repo}
                onChange={(e) => updateConfig?.('repo', e.target.value)}
                placeholder="owner/repo-name"
                className="w-full bg-[#111] border border-[#222] rounded-md px-2.5 py-1.5 text-xs text-zinc-300 font-mono focus:outline-none focus:border-zinc-400/50 transition-colors"
              />
              <p className="text-[9px] text-zinc-600">Format: <span className="font-mono">username/repository</span></p>
            </div>

            {/* GitHub Token credential */}
            <CredentialPicker
              label="GitHub Token"
              value={config.tokenCredentialKey || ''}
              onChange={(v) => updateConfig?.('tokenCredentialKey', v)}
              oauthProvider="github"
              accentColor="zinc"
              placeholder="Select GitHub credential…"
              hint="Needs repo scope to register webhooks — click Connect with GitHub to authorize."
            />

            {/* Auto-register status */}
            <div className={`p-2.5 rounded-lg border ${isRegistered ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-[#0d0d0d] border-[#1a1a1a]'}`}>
              <div className="flex items-center gap-2">
                {isRegistered
                  ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  : <Circle className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                }
                <div>
                  <span className={`text-[10px] font-bold block ${isRegistered ? 'text-emerald-400' : 'text-zinc-400'}`}>
                    {isRegistered ? 'Webhook registered on GitHub' : 'Webhook will be registered on activation'}
                  </span>
                  <span className="text-[9px] text-zinc-600 mt-0.5 block leading-relaxed">
                    BlinkBox registers the webhook automatically — no manual GitHub setup required.
                  </span>
                </div>
              </div>
              {!isRegistered && (
                <p className="text-[9px] text-zinc-600 mt-2 leading-relaxed">
                  Webhook URL: <span className="font-mono text-zinc-500 break-all">{webhookUrl}</span>
                </p>
              )}
            </div>
          </>
        )}

        {activeTab === 'events' && (
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Trigger on</label>
            <div className="flex flex-col gap-1">
              {GITHUB_EVENTS.map(({ value, label, desc }) => {
                const on = selectedEvents.includes(value);
                return (
                  <button
                    key={value}
                    onClick={() => toggleEvent(value)}
                    className={`flex items-start gap-2.5 px-2.5 py-2 rounded-lg border text-left transition-all ${on ? 'bg-zinc-800/60 border-zinc-600/40' : 'bg-[#0d0d0d] border-[#1a1a1a] hover:border-[#2a2a2a]'}`}
                  >
                    <div className={`w-3.5 h-3.5 rounded border mt-0.5 shrink-0 flex items-center justify-center transition-all ${on ? 'bg-zinc-300 border-zinc-300' : 'border-zinc-600'}`}>
                      {on && <div className="w-1.5 h-1.5 bg-black rounded-sm" />}
                    </div>
                    <div>
                      <span className={`text-[10px] font-semibold block ${on ? 'text-zinc-200' : 'text-zinc-500'}`}>{label}</span>
                      <span className="text-[9px] text-zinc-600">{desc}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'payload' && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Info className="w-3 h-3 text-zinc-600" />
              <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Available in workflow as</span>
            </div>
            <div className="flex flex-col gap-1 p-2.5 bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg">
              {[
                ['$trigger.body.action', 'Event action (e.g. "opened", "closed")'],
                ['$trigger.body.repository.full_name', 'Repo full name (owner/repo)'],
                ['$trigger.body.sender.login', 'GitHub username who triggered event'],
                ['$trigger.body.commits', 'Array of commits (push events)'],
                ['$trigger.body.pull_request', 'PR object (PR events)'],
                ['$trigger.body.issue', 'Issue object (issue events)'],
                ['$trigger.body.release', 'Release object (release events)'],
                ['$trigger.event', 'GitHub event type (X-GitHub-Event header)'],
              ].map(([key, desc]) => (
                <div key={key} className="flex items-baseline gap-2">
                  <span className="text-[10px] font-mono text-zinc-400 shrink-0">{key}</span>
                  <span className="text-[9px] text-zinc-600">{desc}</span>
                </div>
              ))}
            </div>
            <p className="text-[9px] text-zinc-600 leading-relaxed mt-1">
              GitHub sends the full event payload — all fields are accessible via <span className="font-mono text-zinc-500">$trigger.body.*</span>.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
