import { useState } from 'react';
import {
  Network, Activity, Key, Settings, LogOut,
  LayoutTemplate, ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  Folder, FolderOpen, File, Zap,
} from 'lucide-react';
import logo from '../../../assets/logo.svg';

// ── Folder groups ──────────────────────────────────────────────────────────
const FOLDERS = [
  {
    key: 'workspaces',
    label: 'Workspaces',
    defaultOpen: true,
    children: [
      { key: 'workflows', icon: Network, label: 'Workflows' },
      { key: 'templates', icon: LayoutTemplate, label: 'Templates' },
    ],
  },
  {
    key: 'monitoring',
    label: 'Monitoring',
    defaultOpen: true,
    children: [
      { key: 'logs', icon: Activity, label: 'History' },
    ],
  },
  {
    key: 'integrations',
    label: 'Integrations',
    defaultOpen: false,
    children: [
      { key: 'vault', icon: Key, label: 'Credentials' },
    ],
  },
  {
    key: 'config',
    label: 'Settings',
    defaultOpen: false,
    children: [
      { key: 'settings', icon: Settings, label: 'Preferences' },
    ],
  },
];

export default function DashboardSidebar({ user, onLogout, activeTab, setActiveTab, usage }) {
  const [expanded, setExpanded] = useState(true);
  const [showLogout, setShowLogout] = useState(false);
  const [openFolders, setOpenFolders] = useState(() => {
    const init = {};
    FOLDERS.forEach((f) => { init[f.key] = f.defaultOpen; });
    return init;
  });

  const w = expanded ? 'w-[220px]' : 'w-[56px]';

  const toggleFolder = (key) => {
    setOpenFolders((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const usedPct = usage ? Math.min(100, Math.round((usage.creditsUsed / usage.monthlyLimit) * 100)) : 0;

  return (
    <>
      <aside className={`${w} bg-[#0d1117] border-r border-zinc-800 flex flex-col shrink-0 relative z-20 transition-all duration-200`}>
        {/* Header */}
        <div className={`h-[48px] flex items-center border-b border-zinc-800 shrink-0 ${expanded ? 'px-4 justify-between' : 'justify-center'}`}>
          {expanded ? (
            <div className="flex items-center gap-2.5">
              <img src={logo} alt="B" className="w-5 h-5 object-contain" />
              <span className="text-[13px] font-semibold tracking-[0.1em] text-zinc-200">BLINKBOX</span>
            </div>
          ) : (
            <img src={logo} alt="B" className="w-5 h-5 object-contain" />
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className={`text-zinc-600 hover:text-zinc-400 transition-colors ${expanded ? '' : 'hidden'}`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Expand toggle when collapsed */}
        {!expanded && (
          <button
            onClick={() => setExpanded(true)}
            className="mx-auto mt-2 text-zinc-700 hover:text-zinc-400 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        {/* Folder tree nav */}
        <nav className={`flex-1 py-3 overflow-y-auto ${expanded ? 'px-2' : 'px-1.5'}`}>
          {expanded && <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider px-3 mb-2">Explorer</p>}

          {FOLDERS.map((folder) => {
            const isOpen = openFolders[folder.key];
            const FolderIcon = isOpen ? FolderOpen : Folder;
            const Chevron = isOpen ? ChevronDown : ChevronUp;

            return (
              <div key={folder.key} className="mb-0.5">
                {/* Folder header */}
                {expanded ? (
                  <button
                    onClick={() => toggleFolder(folder.key)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03] transition-all duration-150"
                  >
                    <FolderIcon className="w-4 h-4 text-zinc-600 shrink-0" strokeWidth={1.5} />
                    <span className="text-[12px] font-medium flex-1 text-left truncate">{folder.label}</span>
                    <Chevron className="w-3 h-3 text-zinc-700" />
                  </button>
                ) : (
                  <div className="flex justify-center py-1">
                    <FolderIcon className="w-[18px] h-[18px] text-zinc-600" strokeWidth={1.5} />
                  </div>
                )}

                {/* Child items (expanded only) */}
                {expanded && isOpen && (
                  <div className="ml-3 border-l border-zinc-800/60 pl-1">
                    {folder.children.map((item) => {
                      const active = activeTab === item.key;
                      return (
                        <button
                          key={item.key}
                          onClick={() => setActiveTab(item.key)}
                          className={`w-full flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-md transition-all duration-150 ${
                            active
                              ? 'bg-white/[0.07] text-zinc-100'
                              : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03]'
                          }`}
                        >
                          <File className="w-3.5 h-3.5 shrink-0 text-zinc-600" strokeWidth={1.5} />
                          <span className="text-[12px] font-medium truncate">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Collapsed: show children as icon buttons */}
                {!expanded && (
                  <div className="space-y-0.5">
                    {folder.children.map((item) => {
                      const active = activeTab === item.key;
                      return (
                        <button
                          key={item.key}
                          onClick={() => setActiveTab(item.key)}
                          title={item.label}
                          className={`w-full flex justify-center py-2 rounded-md transition-all duration-150 ${
                            active
                              ? 'bg-white/[0.07] text-zinc-100'
                              : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03]'
                          }`}
                        >
                          <item.icon className="w-[18px] h-[18px] shrink-0" strokeWidth={active ? 2 : 1.5} />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Usage meter */}
        {usage && expanded && (
          <div className="px-4 pb-2">
            <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/60">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider">Usage</span>
                <span className="text-[10px] text-zinc-600">{usedPct}%</span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-1">
                <div
                  className={`h-1 rounded-full transition-all duration-500 ${usedPct > 80 ? 'bg-red-400' : usedPct > 50 ? 'bg-yellow-400' : 'bg-white'}`}
                  style={{ width: `${usedPct}%` }}
                />
              </div>
              <p className="text-[10px] text-zinc-700 mt-1.5">{usage.creditsUsed} / {usage.monthlyLimit} credits</p>
            </div>
          </div>
        )}

        {/* User */}
        <div className={`border-t border-zinc-800 ${expanded ? 'p-3' : 'p-2'}`}>
          {expanded ? (
            <div className="flex items-center gap-2.5 px-1">
              <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-[11px] font-semibold text-zinc-400 uppercase shrink-0">
                {user?.name?.charAt(0) || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium text-zinc-300 truncate">{user?.name}</p>
                <p className="text-[10px] text-zinc-700 truncate">{user?.email}</p>
              </div>
              <button onClick={() => setShowLogout(true)} className="p-1 text-zinc-700 hover:text-red-400 rounded transition-colors shrink-0" title="Log out">
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowLogout(true)}
              className="w-full flex justify-center"
              title="Log out"
            >
              <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-[11px] font-semibold text-zinc-400 uppercase hover:bg-zinc-700 transition-colors">
                {user?.name?.charAt(0) || '?'}
              </div>
            </button>
          )}
        </div>
      </aside>

      {/* Logout modal */}
      {showLogout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px]" style={{ animation: 'dbFadeIn 0.12s ease-out' }}>
          <div className="bg-[#1c2128] border border-zinc-700 rounded-xl w-full max-w-[340px] p-5 mx-4" style={{ animation: 'dbScaleIn 0.12s ease-out' }}>
            <h3 className="text-[15px] font-semibold text-white mb-1.5">Log out of BlinkBox?</h3>
            <p className="text-[13px] text-zinc-500 mb-5">You'll need to sign in again to access your workspace.</p>
            <div className="flex items-center gap-2.5 justify-end">
              <button onClick={() => setShowLogout(false)} className="px-3.5 py-1.5 text-[13px] font-medium text-zinc-400 hover:text-white rounded-md transition-colors">Cancel</button>
              <button onClick={onLogout} className="px-3.5 py-1.5 text-[13px] font-medium bg-red-500/10 text-red-400 border border-red-500/20 rounded-md hover:bg-red-500/20 transition-all">Log Out</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes dbFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes dbScaleIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </>
  );
}
