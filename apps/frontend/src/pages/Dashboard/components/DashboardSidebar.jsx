import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Network, Activity, Key, Settings, LogOut, BarChart2, Layers, ChevronRight } from 'lucide-react';
import logo from '../../../assets/logo.svg';

const NAV = [
  { key: 'workflows', icon: Network,   label: 'Workflows' },
  { key: 'nodes',     icon: Layers,    label: 'Node Library' },
  { key: 'analytics', icon: BarChart2, label: 'Analytics' },
  { key: 'logs',      icon: Activity,  label: 'Executions' },
  { key: 'vault',     icon: Key,       label: 'Credentials' },
];

const NAV_BOTTOM = [
  { key: 'settings', icon: Settings, label: 'Settings' },
];

export default function DashboardSidebar({ user, onLogout, activeTab, setActiveTab, usage }) {
  const [showLogout, setShowLogout] = useState(false);
  const usedPct = usage ? Math.min(100, Math.round((usage.creditsUsed / usage.monthlyLimit) * 100)) : 0;

  const src = user?.picture || user?.avatar;

  return (
    <>
      <aside className="w-[220px] bg-[#080808] border-r border-[#161616] flex flex-col shrink-0 z-20 h-screen">

        {/* Logo */}
        <Link to="/dashboard" className="h-14 flex items-center gap-3 px-5 border-b border-[#161616] shrink-0 hover:bg-white/[0.02] transition-colors">
          <img src={logo} alt="Blinkbox" className="w-5 h-5 object-contain shrink-0" />
          <span className="text-[13px] font-semibold tracking-wide text-white">Blinkbox</span>
        </Link>

        {/* Nav */}
        <nav className="flex-1 flex flex-col gap-0.5 px-3 py-4 overflow-y-auto">
          <p className="text-[9px] font-bold text-neutral-700 uppercase tracking-[0.12em] px-2 mb-2">Platform</p>

          {NAV.map(item => {
            const active = activeTab === item.key;
            return (
              <button key={item.key} onClick={() => setActiveTab(item.key)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12.5px] font-medium transition-all duration-100 ${
                  active
                    ? 'bg-white/[0.07] text-white'
                    : 'text-neutral-600 hover:text-neutral-300 hover:bg-white/[0.04]'
                }`}>
                <item.icon className="w-4 h-4 shrink-0" strokeWidth={active ? 2 : 1.5} />
                {item.label}
                {active && <ChevronRight className="w-3 h-3 ml-auto text-neutral-700" />}
              </button>
            );
          })}

          <div className="border-t border-[#161616] my-3 mx-1" />

          {NAV_BOTTOM.map(item => {
            const active = activeTab === item.key;
            return (
              <button key={item.key} onClick={() => setActiveTab(item.key)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12.5px] font-medium transition-all duration-100 ${
                  active
                    ? 'bg-white/[0.07] text-white'
                    : 'text-neutral-600 hover:text-neutral-300 hover:bg-white/[0.04]'
                }`}>
                <item.icon className="w-4 h-4 shrink-0" strokeWidth={active ? 2 : 1.5} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Usage */}
        {usage && (
          <div className="mx-3 mb-3 p-3 rounded-xl bg-[#0f0f0f] border border-[#1a1a1a]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold text-neutral-600 uppercase tracking-wider">Usage</span>
              <span className="text-[10px] text-neutral-700 font-mono">{usedPct}%</span>
            </div>
            <div className="w-full bg-[#1a1a1a] rounded-full h-[3px] mb-2">
              <div className={`h-[3px] rounded-full transition-all duration-500 ${usedPct > 80 ? 'bg-red-400' : usedPct > 50 ? 'bg-amber-400' : 'bg-violet-400'}`}
                style={{ width: `${usedPct}%` }} />
            </div>
            <p className="text-[10px] text-neutral-700">{usage.creditsUsed.toLocaleString()} / {usage.monthlyLimit.toLocaleString()} credits</p>
          </div>
        )}

        {/* User */}
        <div className="border-t border-[#161616] p-3">
          <div className="flex items-center gap-2.5 px-1">
            {src
              ? <img src={src} alt="" referrerPolicy="no-referrer" className="w-7 h-7 rounded-full object-cover shrink-0 ring-1 ring-white/10" />
              : <div className="w-7 h-7 rounded-full bg-neutral-800 flex items-center justify-center text-[11px] font-bold text-neutral-400 uppercase shrink-0">
                  {user?.name?.charAt(0) || '?'}
                </div>
            }
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium text-neutral-300 truncate">{user?.name || 'User'}</p>
              <p className="text-[10px] text-neutral-700 truncate">{user?.email}</p>
            </div>
            <button onClick={() => setShowLogout(true)} title="Log out"
              className="p-1.5 rounded-md text-neutral-700 hover:text-red-400 hover:bg-red-500/[0.06] transition-all shrink-0">
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Logout confirm */}
      {showLogout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0f0f0f] border border-[#222] rounded-2xl w-full max-w-[320px] p-6 mx-4 shadow-2xl">
            <h3 className="text-[15px] font-semibold text-white mb-1.5">Log out?</h3>
            <p className="text-[12px] text-neutral-500 mb-5 leading-relaxed">You'll need to sign in again to access your workspace.</p>
            <div className="flex items-center gap-2.5 justify-end">
              <button onClick={() => setShowLogout(false)} className="px-3.5 py-1.5 text-[12px] font-medium text-neutral-500 hover:text-white rounded-lg transition-colors">Cancel</button>
              <button onClick={onLogout} className="px-3.5 py-1.5 text-[12px] font-medium bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-all">Log Out</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
