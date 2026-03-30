import { useState } from 'react';
import { Network, Activity, Key, Settings, LogOut, LayoutTemplate, ChevronLeft, ChevronRight } from 'lucide-react';
import logo from '../../../assets/logo.svg';

const NAV_TOP = [
  { key: 'workflows', icon: Network, label: 'Workflows' },
  { key: 'templates', icon: LayoutTemplate, label: 'Templates' },
  { key: 'logs', icon: Activity, label: 'History' },
  { key: 'vault', icon: Key, label: 'Credentials' },
];

const NAV_BOTTOM = [
  { key: 'settings', icon: Settings, label: 'Settings' },
];

export default function DashboardSidebar({ user, onLogout, activeTab, setActiveTab, usage }) {
  const [expanded, setExpanded] = useState(true);
  const [showLogout, setShowLogout] = useState(false);

  const w = expanded ? 'w-[220px]' : 'w-[56px]';

  const NavBtn = ({ item }) => {
    const active = activeTab === item.key;
    return (
      <button
        onClick={() => setActiveTab(item.key)}
        title={!expanded ? item.label : undefined}
        className={`w-full flex items-center gap-2.5 rounded-md transition-all duration-150 ${expanded ? 'px-3 py-2' : 'px-0 py-2 justify-center'} ${
          active
            ? 'bg-white/[0.07] text-white'
            : 'text-neutral-500 hover:text-neutral-300 hover:bg-white/[0.03]'
        }`}
      >
        <item.icon className="w-[18px] h-[18px] shrink-0" strokeWidth={active ? 2 : 1.5} />
        {expanded && <span className="text-[13px] font-medium truncate">{item.label}</span>}
      </button>
    );
  };

  const usedPct = usage ? Math.min(100, Math.round((usage.creditsUsed / usage.monthlyLimit) * 100)) : 0;

  const UserAvatar = ({ size = 'w-7 h-7', textSize = 'text-[11px]', className = '' }) => {
    if (user?.picture) {
      return <img src={user.picture} alt="" className={`${size} rounded-full object-cover shrink-0 ${className}`} referrerPolicy="no-referrer" />;
    }
    return (
      <div className={`${size} rounded-full bg-neutral-800 flex items-center justify-center ${textSize} font-semibold text-neutral-400 uppercase shrink-0 ${className}`}>
        {user?.name?.charAt(0) || '?'}
      </div>
    );
  };

  return (
    <>
      <aside className={`${w} bg-neutral-950 border-r border-neutral-900/80 flex flex-col shrink-0 relative z-20 transition-all duration-200`}>
        {/* Header */}
        <div className={`h-[52px] flex items-center border-b border-neutral-900/80 shrink-0 ${expanded ? 'px-4 justify-between' : 'justify-center'}`}>
          {expanded ? (
            <div className="flex items-center gap-2.5">
              <img src={logo} alt="B" className="w-5 h-5 object-contain" />
              <span className="text-[13px] font-semibold tracking-[0.1em] text-white">BLINKBOX</span>
            </div>
          ) : (
            <img src={logo} alt="B" className="w-5 h-5 object-contain" />
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className={`text-neutral-600 hover:text-neutral-400 transition-colors ${expanded ? '' : 'hidden'}`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Expand button when collapsed */}
        {!expanded && (
          <button
            onClick={() => setExpanded(true)}
            className="mx-auto mt-2 text-neutral-700 hover:text-neutral-400 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        {/* Primary nav */}
        <nav className={`flex-1 py-3 space-y-0.5 ${expanded ? 'px-2.5' : 'px-1.5'}`}>
          {expanded && <p className="text-[10px] font-medium text-neutral-700 uppercase tracking-wider px-3 mb-2">Platform</p>}
          {NAV_TOP.map((item) => <NavBtn key={item.key} item={item} />)}

          <div className={`border-t border-neutral-900/60 my-3 ${expanded ? 'mx-3' : 'mx-2'}`} />

          {NAV_BOTTOM.map((item) => <NavBtn key={item.key} item={item} />)}
        </nav>

        {/* Usage meter */}
        {usage && expanded && (
          <div className="px-4 pb-2">
            <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-900/60">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-medium text-neutral-600 uppercase tracking-wider">Usage</span>
                <span className="text-[10px] text-neutral-600">{usedPct}%</span>
              </div>
              <div className="w-full bg-neutral-900 rounded-full h-1">
                <div
                  className={`h-1 rounded-full transition-all duration-500 ${usedPct > 80 ? 'bg-red-400' : usedPct > 50 ? 'bg-yellow-400' : 'bg-white'}`}
                  style={{ width: `${usedPct}%` }}
                />
              </div>
              <p className="text-[10px] text-neutral-700 mt-1.5">{usage.creditsUsed} / {usage.monthlyLimit} credits</p>
            </div>
          </div>
        )}

        {/* User */}
        <div className={`border-t border-neutral-900/80 ${expanded ? 'p-3' : 'p-2'}`}>
          {expanded ? (
            <div className="flex items-center gap-2.5 px-1">
              <UserAvatar />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium text-neutral-300 truncate">{user?.name}</p>
                <p className="text-[10px] text-neutral-700 truncate">{user?.email}</p>
              </div>
              <button onClick={() => setShowLogout(true)} className="p-1 text-neutral-700 hover:text-red-400 rounded transition-colors shrink-0" title="Log out">
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowLogout(true)}
              className="w-full flex justify-center"
              title="Log out"
            >
              <UserAvatar className="hover:ring-2 hover:ring-neutral-700 transition-all" />
            </button>
          )}
        </div>
      </aside>

      {/* Logout modal */}
      {showLogout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px]" style={{ animation: 'dbFadeIn 0.12s ease-out' }}>
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl w-full max-w-[340px] p-5 mx-4" style={{ animation: 'dbScaleIn 0.12s ease-out' }}>
            <h3 className="text-[15px] font-semibold text-white mb-1.5">Log out of BlinkBox?</h3>
            <p className="text-[13px] text-neutral-500 mb-5">You'll need to sign in again to access your workspace.</p>
            <div className="flex items-center gap-2.5 justify-end">
              <button onClick={() => setShowLogout(false)} className="px-3.5 py-1.5 text-[13px] font-medium text-neutral-400 hover:text-white rounded-md transition-colors">Cancel</button>
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
