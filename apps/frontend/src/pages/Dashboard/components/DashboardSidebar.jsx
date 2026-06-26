import { useState, useRef, useLayoutEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Network, Activity, Key, Settings, LogOut, ChevronLeft, ChevronRight, BarChart2, Layers, Zap, Sparkles, Plug } from 'lucide-react';
import logo from '../../../assets/logo.svg';

const NAV_TOP = [
  { key: 'workflows', icon: Network,  label: 'Workflows' },
  { key: 'nodes',     icon: Layers,   label: 'Nodes' },
  { key: 'analytics', icon: BarChart2, label: 'Analytics' },
  { key: 'logs',      icon: Activity, label: 'History' },
  { key: 'vault',     icon: Key,      label: 'Credentials' },
  { key: 'mcp',       icon: Plug,     label: 'Connect to Chat' },
];

const NAV_BOTTOM = [
  { key: 'settings', icon: Settings, label: 'Settings' },
];

export default function DashboardSidebar({ user, onLogout, activeTab, setActiveTab, usage, defaultExpanded = true }) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [showLogout, setShowLogout] = useState(false);
  const navRef = useRef(null);
  const [indicator, setIndicator] = useState({ top: 0, height: 0, show: false });

  const w = expanded ? 'w-[220px]' : 'w-[56px]';

  useLayoutEffect(() => {
    const el = navRef.current?.querySelector(`[data-tab="${activeTab}"]`);
    if (!el) { setIndicator(i => ({ ...i, show: false })); return; }
    setIndicator({ top: el.offsetTop + 6, height: el.offsetHeight - 12, show: true });
  }, [activeTab, expanded]);

  const NavBtn = ({ item }) => {
    const active = activeTab === item.key;
    return (
      <button
        data-tab={item.key}
        onClick={() => setActiveTab(item.key)}
        title={!expanded ? item.label : undefined}
        className={`bb-nav-item group w-full flex items-center gap-2.5 rounded-[10px] transition-colors duration-150 ${expanded ? 'px-3 py-2' : 'px-0 py-2 justify-center'} ${
          active
            ? 'is-active text-[var(--bb-text-hi)]'
            : 'text-[var(--bb-text-lo)] hover:text-[var(--bb-text-hi)]'
        }`}
      >
        <item.icon className="bb-nav-icon w-[18px] h-[18px] shrink-0 relative z-10" strokeWidth={active ? 2 : 1.5} />
        {expanded && <span className="text-[13px] font-medium truncate relative z-10">{item.label}</span>}
      </button>
    );
  };

  const usedPct = usage ? Math.min(100, Math.round((usage.creditsUsed / usage.monthlyLimit) * 100)) : 0;

  const UserAvatar = ({ size = 'w-7 h-7', textSize = 'text-[11px]', className = '' }) => {
    if (user?.picture) {
      return <img src={user.picture} alt="" className={`${size} rounded-full object-cover shrink-0 ring-1 ring-white/10 ${className}`} referrerPolicy="no-referrer" />;
    }
    return (
      <div className={`${size} rounded-full flex items-center justify-center ${textSize} font-semibold uppercase shrink-0 ring-1 ring-white/10 ${className}`} style={{ background: 'var(--bb-surface-3)', color: 'var(--bb-text-mid)' }}>
        {user?.name?.charAt(0) || '?'}
      </div>
    );
  };

  return (
    <>
      <aside className={`${w} bb-liquid border-r flex flex-col shrink-0 relative z-20 transition-all duration-200 h-screen`}>
        {/* Header — logo links to dashboard */}
        <div className={`h-14 flex items-center border-b border-white/[0.06] shrink-0 ${expanded ? 'px-4 justify-between' : 'justify-center'}`}>
          {expanded ? (
            <Link to="/dashboard" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
              <img src={logo} alt="B" className="w-5 h-5 object-contain" />
              <span className="text-[13px] font-semibold tracking-[0.05em] text-[var(--bb-text-hi)]">Blinkbox</span>
            </Link>
          ) : (
            <Link to="/dashboard" className="hover:opacity-80 transition-opacity">
              <img src={logo} alt="B" className="w-5 h-5 object-contain" />
            </Link>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className={`text-[var(--bb-text-dim)] hover:text-[var(--bb-text-hi)] transition-colors ${expanded ? '' : 'hidden'}`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Expand button when collapsed */}
        {!expanded && (
          <button
            onClick={() => setExpanded(true)}
            className="mx-auto mt-2 text-[var(--bb-text-dim)] hover:text-[var(--bb-text-hi)] transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        {/* Primary nav */}
        <nav ref={navRef} className={`relative flex-1 py-3 space-y-0.5 ${expanded ? 'px-2.5' : 'px-1.5'}`}>
          <span
            className="bb-nav-indicator"
            style={{ top: indicator.top, height: indicator.height, opacity: indicator.show ? 1 : 0 }}
          />
          {expanded && <p className="bb-eyebrow px-3 mb-2">Platform</p>}
          {NAV_TOP.map((item, i) => (
            <div key={item.key} className="bb-rise" style={{ '--bb-i': i }}><NavBtn item={item} /></div>
          ))}

          <div className={`border-t border-white/[0.06] my-3 ${expanded ? 'mx-3' : 'mx-2'}`} />

          {NAV_BOTTOM.map((item) => <NavBtn key={item.key} item={item} />)}
        </nav>

        {/* Usage meter */}
        {usage && expanded && (
          <div className="px-4 pb-2">
            <div className="bb-panel p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="bb-eyebrow">Usage</span>
                <span className="text-[10px] font-mono text-[var(--bb-text-lo)]">{usedPct}%</span>
              </div>
              <div className="w-full rounded-full h-1" style={{ background: 'var(--bb-surface-3)' }}>
                <div
                  className={`h-1 rounded-full transition-all duration-500 ${usedPct > 80 ? 'bg-red-400' : usedPct > 50 ? 'bg-amber-400' : 'bg-[var(--bb-text-hi)]'}`}
                  style={{ width: `${usedPct}%` }}
                />
              </div>
              <p className="text-[10px] font-mono text-[var(--bb-text-dim)] mt-1.5">{usage.creditsUsed} / {usage.monthlyLimit} credits</p>
            </div>
          </div>
        )}

        {/* Upgrade / Pro badge */}
        {usage && (
          expanded ? (
            usage.plan === 'free' || usage.plan === 'starter' ? (
              <div className="px-3 pb-3">
                <button
                  onClick={() => navigate('/upgrade')}
                  className="bb-btn bb-btn-accent w-full flex items-center justify-center gap-2 h-9 text-[12px]"
                >
                  <Zap className="w-3.5 h-3.5 shrink-0" />
                  Upgrade to Pro
                </button>
              </div>
            ) : (
              <div className="px-3 pb-3">
                <button
                  onClick={() => navigate('/upgrade')}
                  className="bb-btn bb-btn-ghost w-full flex items-center justify-center gap-2 h-9 text-[12px] text-[var(--bb-accent)]"
                >
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  Pro · Manage plan
                </button>
              </div>
            )
          ) : (
            usage.plan === 'free' || usage.plan === 'starter' ? (
              <button
                onClick={() => navigate('/upgrade')}
                title="Upgrade to Pro"
                className="bb-btn bb-btn-accent mx-auto mb-2 flex items-center justify-center w-8 h-8 !rounded-[10px]"
              >
                <Zap className="w-3.5 h-3.5 shrink-0" />
              </button>
            ) : (
              <button
                onClick={() => navigate('/upgrade')}
                title="Manage Pro plan"
                className="bb-btn bb-btn-ghost mx-auto mb-2 flex items-center justify-center w-8 h-8 !rounded-[10px] text-[var(--bb-accent)]"
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
              </button>
            )
          )
        )}

        {/* User */}
        <div className={`border-t border-white/[0.06] ${expanded ? 'p-3' : 'p-2'}`}>
          {expanded ? (
            <div className="flex items-center gap-2.5 px-1">
              <UserAvatar />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium text-[var(--bb-text-mid)] truncate">{user?.name}</p>
                <p className="text-[10px] text-[var(--bb-text-dim)] truncate">{user?.email}</p>
              </div>
              <button onClick={() => setShowLogout(true)} className="p-1 text-[var(--bb-text-dim)] hover:text-red-400 rounded transition-colors shrink-0" title="Log out">
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowLogout(true)}
              className="w-full flex justify-center"
              title="Log out"
            >
              <UserAvatar className="hover:ring-2 hover:ring-white/20 transition-all" />
            </button>
          )}
        </div>
      </aside>

      {/* Logout modal */}
      {showLogout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px]" style={{ animation: 'dbFadeIn 0.12s ease-out' }}>
          <div className="bb-glass-strong w-full max-w-[340px] p-5 mx-4" style={{ animation: 'dbScaleIn 0.12s ease-out' }}>
            <h3 className="text-[15px] font-semibold text-[var(--bb-text-hi)] mb-1.5">Log out of Blinkbox?</h3>
            <p className="text-[13px] text-[var(--bb-text-lo)] mb-5">You'll need to sign in again to access your workspace.</p>
            <div className="flex items-center gap-2.5 justify-end">
              <button onClick={() => setShowLogout(false)} className="px-3.5 py-1.5 text-[13px] font-medium text-[var(--bb-text-lo)] hover:text-[var(--bb-text-hi)] rounded-md transition-colors">Cancel</button>
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
