
import React, { useState } from 'react';
import { Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  FileCheck, 
  Split, 
  DollarSign, 
  AlertCircle, 
  LogOut,
  ChevronDown, 
  Lock, 
  ChevronLeft, 
  ChevronRight, 
  Briefcase, 
  RotateCcw, 
  Users, 
  Ticket,
  Trophy,
  Check, // Imported Check
  PhoneCall,
  Settings,
  Bot
} from 'lucide-react';
import { useAgentContext } from './context/AgentContext';
import { useAuth } from '../../context/AuthContext';
import { InternalAiProvider, useInternalAi } from './context/InternalAiContext';
import { AgentOverview } from './components/AgentOverview';
import { AgentPoliciesV2 } from './components/AgentPoliciesV2';
import { AgentPolicyDetails } from './components/AgentPolicyDetails';
import { AgentCommissions } from './components/AgentCommissions';
import { AgentSplits } from './components/AgentSplits';
import { AgentDebtRecovery } from './components/AgentDebtRecovery';
import { AgentDownlines } from './components/AgentDownlines';
import { DownlineAgentDetails } from './components/DownlineAgentDetails';
import { AgentTickets } from './components/AgentTickets';
import { AgentleaderboardRealtime, TrainerDetailPage } from './components/AgentleaderboardRealtime';
import { CallReportPolicytek } from './components/CallReportPolicytek';
import { CallReportWavv } from './components/CallReportWavv';
import { CallReportCallx } from './components/CallReportCallx';
import { AgentStats } from './components/AgentStats';
import { AgencyDetailPage } from './components/AgencyDetailPage';
import { MyProfilePage } from './components/MyProfilePage';
import { SettingsPage } from './components/SettingsPage';
import { ModuleSwitcher } from '../../shared/components/ModuleSwitcher';
import { NotificationBell } from '../../shared/components/NotificationBell';
import { NotificationDirect } from '../../shared/components/NotificationDirect';
import { NotificationSale } from '../../shared/components/NotificationSale';
import { InternalAiDrawer } from './components/InternalAiDrawer';

// Sidebar Group - Expandable parent with sub-items
const SidebarGroup = ({
  icon,
  label,
  active,
  locked,
  collapsed,
  dark,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  locked?: boolean;
  collapsed?: boolean;
  dark?: boolean;
  children: React.ReactNode;
}) => {
  const [open, setOpen] = React.useState(active);

  React.useEffect(() => {
    if (active) setOpen(true);
  }, [active]);

  return (
    <div className="w-full mb-1">
      <button
        onClick={() => !locked && setOpen((o) => !o)}
        className={`
          relative flex items-center transition-all duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1.0)] group
          ${collapsed
            ? 'justify-center w-12 h-12 rounded-2xl mx-auto'
            : 'w-full px-5 py-4 rounded-[1.25rem] gap-4'
          }
          ${active
            ? dark ? 'bg-white/8 text-white border border-brand-500/30' : 'bg-brand-500/10 text-slate-900 border border-brand-500/20'
            : locked
            ? 'opacity-50 cursor-not-allowed grayscale'
            : dark ? 'text-slate-500 hover:bg-white/5 hover:text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
          }
        `}
        title={collapsed ? label : undefined}
      >
        <span className={`shrink-0 transition-transform duration-300 ${collapsed ? 'scale-110' : 'scale-100'} ${active ? 'text-brand-500' : dark ? 'text-slate-600 group-hover:text-slate-300' : 'text-slate-400 group-hover:text-slate-600'}`}>
          {icon}
        </span>
        <span className={`
          font-bold text-sm whitespace-nowrap overflow-hidden transition-all duration-300 origin-left flex-1 text-left
          ${collapsed ? 'w-0 opacity-0 -translate-x-2' : 'w-auto opacity-100 translate-x-0'}
        `}>
          {label}
        </span>
        {!collapsed && !locked && (
          <ChevronDown
            size={14}
            className={`shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''} ${active ? 'text-brand-400' : dark ? 'text-slate-600' : 'text-slate-400'}`}
          />
        )}
        {!collapsed && locked && <Lock className="w-3.5 h-3.5 text-slate-300 shrink-0" />}
        {active && collapsed && (
          <span className="absolute top-2 right-2 w-2 h-2 bg-brand-500 rounded-full border border-white animate-in zoom-in duration-300" />
        )}
      </button>

      {!collapsed && open && (
        <div className={`mt-2 ml-3 pl-4 border-l-2 space-y-1 pb-1 animate-in fade-in slide-in-from-top-1 duration-200 ${dark ? 'border-white/10' : 'border-brand-500/20'}`}>
          {children}
        </div>
      )}
    </div>
  );
};

// Sub-item inside a SidebarGroup
const SidebarSubItem = ({
  to,
  label,
  active,
  locked,
  dark,
}: {
  to: string;
  label: string;
  active: boolean;
  locked?: boolean;
  dark?: boolean;
}) => (
  <Link
    to={locked ? '#' : to}
    onClick={(e) => locked && e.preventDefault()}
    className={`
      flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all duration-200
      ${
        active
          ? dark ? 'bg-white/10 text-white shadow-md' : 'bg-slate-900 text-white shadow-md'
          : locked
          ? dark ? 'text-slate-700 cursor-not-allowed' : 'text-slate-400 cursor-not-allowed'
          : dark ? 'text-slate-500 hover:bg-white/5 hover:text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
      }
    `}
  >
    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${active ? 'bg-brand-400' : dark ? 'bg-slate-700' : 'bg-slate-300'}`} />
    {label}
    {locked && <span className={`ml-auto text-[10px] font-black uppercase tracking-wider ${dark ? 'text-slate-700' : 'text-slate-300'}`}>Soon</span>}
  </Link>
);

// Sidebar Item - Polished iOS Style
const SidebarItem = ({ 
  to, 
  icon, 
  label, 
  active, 
  locked, 
  collapsed,
  dark,
}: { 
  to: string, 
  icon: React.ReactNode, 
  label: string, 
  active: boolean, 
  locked?: boolean, 
  collapsed?: boolean,
  dark?: boolean,
}) => {
  return (
    <Link 
      to={locked ? '#' : to} 
      onClick={(e) => locked && e.preventDefault()}
      className={`
        relative flex items-center transition-all duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1.0)] group
        ${collapsed 
          ? 'justify-center w-12 h-12 rounded-2xl mx-auto mb-3' 
          : 'w-full px-5 py-4 rounded-[1.25rem] gap-4 mb-2'
        }
        ${active 
          ? dark ? 'bg-white/10 text-white shadow-xl shadow-black/30 scale-[1.02]' : 'bg-slate-900 text-white shadow-xl shadow-slate-900/20 scale-[1.02]'
          : locked 
            ? 'opacity-50 cursor-not-allowed grayscale' 
            : dark ? 'text-slate-500 hover:bg-white/5 hover:text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
        }
      `}
      title={collapsed ? label : undefined}
    >
      <span className={`shrink-0 transition-transform duration-300 ${collapsed ? 'scale-110' : 'scale-100'} ${active ? 'text-brand-400' : dark ? 'text-slate-600 group-hover:text-slate-300' : 'text-slate-400 group-hover:text-slate-600'}`}>
        {icon}
      </span>
      
      <span className={`
        font-bold text-sm whitespace-nowrap overflow-hidden transition-all duration-300 origin-left
        ${collapsed ? 'w-0 opacity-0 -translate-x-2' : 'w-auto opacity-100 translate-x-0 flex-1'}
      `}>
        {label}
      </span>

      {!collapsed && locked && <Lock className="w-3.5 h-3.5 text-slate-300 shrink-0" />}

      {/* Active Dot for Collapsed Mode */}
      {active && collapsed && (
        <span className="absolute top-2 right-2 w-2 h-2 bg-brand-500 rounded-full border border-white animate-in zoom-in duration-300"></span>
      )}
    </Link>
  );
};

const AgentLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const { toggleDrawer } = useInternalAi();
  const { 
    currentAgentId, 
    selectedAgentIds,
    isImpersonating, 
    startImpersonation, 
    stopImpersonation, 
    toggleAgentSelection,
    selectAllAgents,
    availableFeatures,
    subAgents,
    viewingAgentName,
    hasAgentProfile
  } = useAgentContext();
  const location = useLocation();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isActive = (path: string) => location.pathname === path || (path !== '/' && location.pathname.startsWith(path));
  const isDarkRoute = location.pathname.startsWith('/call-report');
  const isPoliciesPage = location.pathname === '/policies' || location.pathname === '/policies/v2';
  
  // Feature Key Determination
  const featureKey = (() => {
    const path = location.pathname;
    if (path === '/' || path === '') return 'overview';
    if (path.startsWith('/policies')) return 'policies';
    if (path.startsWith('/downlines')) return 'downlines';
    if (path.startsWith('/splits')) return 'splits';
    if (path.startsWith('/commissions')) return 'commissions';
    if (path.startsWith('/debts')) return 'debts';
    if (path.startsWith('/tickets')) return 'ticketing';
    if (path.startsWith('/leaderboard/realtime')) return 'overview';
    if (path.startsWith('/stats')) return 'overview';
    if (path.startsWith('/my-profile')) return 'overview';
    if (path.startsWith('/agency/')) return 'overview';
    return null;
  })();

  // Permission Logic
  const isLocked = (key: string) => {
    if (key === 'ticketing' && !isImpersonating) return false;
    return !availableFeatures.includes(key);
  };

  const isRestricted = featureKey && isLocked(featureKey);

  const currentSelectionLabel = viewingAgentName;

  // Extract agency initials for fallback logo
  const agencyInitials = user?.agencyName
    ? user.agencyName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : 'HQ';

  return (
    <div
      className={`h-screen flex font-sans overflow-hidden p-4 gap-4 selection:bg-brand-500/30 selection:text-brand-900 transition-colors duration-500 ${isDarkRoute ? 'bg-[#08080f]' : ''}`}
      style={!isDarkRoute ? { background: isPoliciesPage ? '#F3F4F6' : '#D4DBE5' } : undefined}
    >
      {/* Floating Sidebar */}
      <aside 
        className={`
          ${isCollapsed ? 'w-24 px-3' : 'w-80 px-6'} 
          ${isDarkRoute ? 'bg-[#0d0d1a] border-white/6' : 'bg-white border-slate-200/80 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.12)]'}
          rounded-[2.5rem] flex flex-col transition-[width,padding,background-color,border-color] duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1.0)] 
          border relative z-20 shrink-0 py-8
        `}
      >
        {/* Toggle Handle */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)} 
          className={`absolute -right-3 top-12 w-8 h-8 rounded-full shadow-lg flex items-center justify-center transition-all z-50 hover:scale-110 active:scale-95 ${isDarkRoute ? 'bg-[#0d0d1a] border border-white/10 text-slate-600 hover:text-brand-400' : 'bg-white border border-slate-100 shadow-slate-200/50 text-slate-400 hover:text-brand-500'}`}
        >
          {isCollapsed ? <ChevronRight size={16} strokeWidth={3} /> : <ChevronLeft size={16} strokeWidth={3} />}
        </button>

        {/* Brand Header */}
        <div className={`flex items-center gap-4 mb-10 transition-all duration-500 ${isCollapsed ? 'justify-center' : 'px-2'}`}>
            <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white font-black shadow-xl shadow-slate-900/20 shrink-0 text-2xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-brand-500/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                {user?.agencyLogoUrl ? (
                    <img src={user.agencyLogoUrl} alt="Agency Logo" className="relative z-10 w-full h-full object-contain p-2" />
                ) : (
                    <span className="relative z-10 text-brand-500">{agencyInitials}</span>
                )}
            </div>
            <div className={`overflow-hidden transition-all duration-500 ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                <span className={`font-extrabold text-2xl tracking-tight whitespace-nowrap block ${isDarkRoute ? 'text-white' : 'text-slate-900'}`}>
                  PolicyHQ
                </span>
                <span className={`text-[10px] font-bold tracking-widest uppercase truncate block ${isDarkRoute ? 'text-slate-600' : 'text-slate-400'}`}>
                  {user?.agencyName || 'Agent Portal'}
                </span>
            </div>
        </div>
        
        {/* Context Switcher - Collapsible */}
        <div className="mb-8 relative z-40">
            {!isCollapsed ? (
              <>
                <button 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className={`w-full flex items-center justify-between text-sm font-bold rounded-2xl py-4 px-5 transition-all ${isDarkRoute ? 'bg-white/5 border border-white/8 text-slate-300 hover:bg-white/8' : 'bg-slate-50 border border-slate-100 text-slate-800 hover:bg-white hover:shadow-lg hover:shadow-slate-200/50'} ${isDropdownOpen ? 'ring-2 ring-brand-500/20 border-brand-500' : ''}`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${isImpersonating ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
                      <span className="truncate">{currentSelectionLabel}</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
                    <div className="absolute top-full left-0 w-full mt-2 bg-white border border-slate-100 rounded-[1.5rem] shadow-2xl shadow-slate-300/50 z-50 p-2 animate-in fade-in zoom-in-95 duration-200 origin-top">
                      <button
                          onClick={() => {
                            stopImpersonation();
                            setIsDropdownOpen(false);
                          }}
                          className={`w-full text-left px-5 py-3.5 rounded-2xl text-sm font-bold transition-all flex items-center justify-between group ${!isImpersonating ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10' : 'text-slate-500 hover:bg-slate-50'}`}
                      >
                        <span>My Workspace</span>
                        {!isImpersonating && <CheckCircleIcon />}
                      </button>
                      
                      {subAgents.length > 0 && (
                        <>
                          <div className="px-5 py-3 mt-1 flex items-center justify-between">
                             <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Team Access</div>
                             <button onClick={selectAllAgents} className="text-[10px] font-bold text-brand-500 hover:text-brand-600 uppercase">Select All</button>
                          </div>
                          <div className="max-h-60 overflow-y-auto pr-1">
                            {subAgents.map(agent => {
                              const isSelected = selectedAgentIds.includes(agent.agentId) && isImpersonating;
                              return (
                                <button
                                  key={agent.agentId}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    toggleAgentSelection(agent.agentId);
                                  }}
                                  className={`w-full text-left px-5 py-3 rounded-2xl text-sm font-bold transition-all flex items-center justify-between mb-1 ${isSelected ? 'bg-amber-50 text-amber-900 border border-amber-100' : 'text-slate-600 hover:bg-slate-50'}`}
                                >
                                  <span className="truncate">{agent.name}</span>
                                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${isSelected ? 'bg-amber-500 border-amber-500' : 'border-slate-300'}`}>
                                    {isSelected && <Check className="w-3 h-3 text-white" />}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  </>
                )}
              </>
            ) : (
              <button 
                onClick={() => setIsCollapsed(false)} 
                className={`w-12 h-12 rounded-2xl border flex items-center justify-center transition-all mx-auto ${isImpersonating ? 'bg-amber-50 border-amber-200 text-amber-500' : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-900 hover:bg-white hover:shadow-md'}`}
                title="Switch Context"
              >
                  <Briefcase size={20} strokeWidth={2.5} />
              </button>
            )}
        </div>

        {/* Navigation Label */}
        <div className={`transition-all duration-300 px-2 mb-4 ${isCollapsed ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100 h-auto'}`}>
          <div className={`text-[10px] font-extrabold uppercase tracking-widest pl-2 ${isDarkRoute ? 'text-slate-700' : 'text-slate-400'}`}>Menu</div>
        </div>
        
        {/* Nav Items */}
        <nav className="space-y-1 flex flex-col items-center w-full flex-1 overflow-y-auto overflow-x-hidden min-h-0 scrollbar-hide">
            <SidebarItem to="/" icon={<Trophy size={20} />} label="Leaderboard" active={location.pathname === '/' || location.pathname === ''} locked={isLocked('overview')} collapsed={isCollapsed} dark={isDarkRoute} />
            <SidebarItem to="/policies" icon={<FileCheck size={20} />} label="Policies" active={isPoliciesPage} locked={isLocked('policies')} collapsed={isCollapsed} dark={isDarkRoute} />
            <SidebarItem to="/downlines" icon={<Users size={20} />} label="Downlines" active={isActive('/downlines')} locked={isLocked('downlines')} collapsed={isCollapsed} dark={isDarkRoute} />
            <SidebarItem to="/splits" icon={<Split size={20} />} label="Splits" active={isActive('/splits')} locked={isLocked('splits')} collapsed={isCollapsed} dark={isDarkRoute} />
            <SidebarItem to="/commissions" icon={<DollarSign size={20} />} label="Commissions" active={isActive('/commissions')} locked={isLocked('commissions')} collapsed={isCollapsed} dark={isDarkRoute} />
            <SidebarItem to="/debts" icon={<AlertCircle size={20} />} label="Debt Recovery" active={isActive('/debts')} locked={isLocked('debts')} collapsed={isCollapsed} dark={isDarkRoute} />
            <SidebarItem to="/tickets" icon={<Ticket size={20} />} label="Tickets" active={isActive('/tickets')} locked={isLocked('ticketing')} collapsed={isCollapsed} dark={isDarkRoute} />
            <SidebarItem to="/settings" icon={<Settings size={20} />} label="Settings" active={isActive('/settings')} collapsed={isCollapsed} dark={isDarkRoute} />
            <SidebarGroup
              icon={<PhoneCall size={20} />}
              label="Activity Dashboard"
              active={location.pathname.startsWith('/call-report')}
              collapsed={isCollapsed}
              dark={isDarkRoute}
            >
              <SidebarSubItem to="/call-report/policytek" label="PolicyTek" active={isActive('/call-report/policytek')} dark={isDarkRoute} />
              <SidebarSubItem to="/call-report/wavv" label="Wavv" active={isActive('/call-report/wavv')} dark={isDarkRoute} />
              <SidebarSubItem to="/call-report/callx" label="CallX" active={isActive('/call-report/callx')} dark={isDarkRoute} />
            </SidebarGroup>
        </nav>

        {/* User Account Footer */}
        <div className="mt-auto w-full pt-4">
            <div className={`flex items-center gap-3 p-2.5 rounded-[1.25rem] border transition-all duration-500 ${isCollapsed ? 'justify-center border-transparent bg-transparent' : isDarkRoute ? 'bg-white/5 border-white/6 hover:bg-white/8' : 'bg-slate-50 border-slate-100 hover:bg-white hover:shadow-lg hover:shadow-slate-200/50'}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-black border-2 shadow-sm shrink-0 ${isDarkRoute ? 'bg-white/10 text-white border-white/10' : 'bg-white text-slate-900 border-slate-100'}`}>
                  {user?.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                </div>
                
                <div className={`flex-1 min-w-0 transition-all duration-500 ${isCollapsed ? 'w-0 opacity-0 overflow-hidden' : 'w-auto opacity-100'}`}>
                    <p className={`text-sm font-bold truncate ${isDarkRoute ? 'text-white' : 'text-slate-900'}`}>{user?.name}</p>
                    <div className="flex flex-col gap-0.5 mt-0.5">
                        <p className={`text-[10px] truncate font-bold ${isDarkRoute ? 'text-slate-600' : 'text-slate-400'}`}>{user?.email || user?.phone || 'Signed in'}</p>
                        <p className="text-[9px] text-brand-500 truncate font-black uppercase tracking-tighter">User Account</p>
                    </div>
                </div>
                
                <button onClick={logout} className={`rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all ${isCollapsed ? 'hidden' : 'p-2'}`} title="Logout">
                  <LogOut className="w-4 h-4" />
                </button>
            </div>
        </div>
      </aside>

      {/* Main Content - Floating Panel */}
      <main className={`flex-1 min-w-0 h-full overflow-hidden flex flex-col relative transition-colors duration-500 ${isRestricted ? 'bg-slate-950' : isDarkRoute ? 'bg-[#08080f] rounded-[2.5rem]' : 'bg-transparent'}`}>
        {isRestricted ? (
            <div className="flex-1 h-full flex flex-col items-center justify-center relative overflow-hidden text-center p-8 animate-in fade-in duration-500 rounded-[2.5rem]">
                <div className="w-24 h-24 rounded-[2rem] bg-slate-900 border border-slate-800 flex items-center justify-center mb-8 shadow-2xl shadow-black/50 ring-1 ring-white/5 relative group">
                    <div className="absolute inset-0 bg-brand-500/10 rounded-[2rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <Lock className="w-10 h-10 text-brand-500 relative z-10" />
                </div>
                <h2 className="text-3xl font-extrabold text-white mb-3 tracking-tight">Access Restricted</h2>
                <p className="text-slate-400 text-base mb-10 max-w-md">This module is not enabled for <span className="text-white font-semibold">{viewingAgentName}</span>.<br/><span className="text-sm opacity-60 mt-1 block">Please request permission from the organization administrator.</span></p>
                <button onClick={() => { stopImpersonation(); navigate('/'); }} className="flex items-center gap-2 px-8 py-4 bg-brand-500 hover:bg-brand-400 text-slate-950 font-bold rounded-2xl transition-all shadow-lg shadow-brand-500/20 hover:-translate-y-1 active:scale-95">
                    <RotateCcw className="w-4 h-4" />
                    <span>Restore My View</span>
                </button>
            </div>
        ) : (
            <div className="flex-1 overflow-y-auto scroll-smooth scrollbar-hide relative">
            <header className={`h-24 sticky top-0 z-[100] px-6 flex items-center justify-between mb-2 rounded-2xl mt-2 mx-2 shadow-sm transition-colors duration-500 ${isDarkRoute ? 'bg-white/5 backdrop-blur-md border border-white/8' : 'bg-white/60 backdrop-blur-md border border-white/80'}`}>
                <div className="flex items-center gap-4">
                    <h2 className={`text-3xl font-black tracking-tighter transition-colors duration-500 ${isDarkRoute ? 'text-white' : 'text-slate-900'}`}>
                    {viewingAgentName}
                    {isImpersonating && <span className="ml-3 inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 align-middle border border-amber-200">READ ONLY</span>}
                    </h2>
                </div>

                <div className="flex items-center gap-3">
                    <ModuleSwitcher />
                    <button
                      type="button"
                      onClick={toggleDrawer}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200/60 bg-white/70 px-4 py-2 text-xs font-black text-slate-700 shadow-sm transition-colors hover:bg-white hover:text-slate-900"
                    >
                      <Bot className="w-4 h-4 text-brand-500" />
                      AI
                    </button>
                    <div className="flex items-center gap-2 bg-white/50 backdrop-blur-sm p-1.5 rounded-full border border-slate-200/50 shadow-sm">
                        <NotificationDirect />
                        <NotificationBell />
                        <NotificationSale />
                    </div>
                </div>
            </header>

            {user && !user.agentId && (
              <div className="mx-2 mb-2 px-5 py-3 rounded-2xl border border-amber-200 bg-amber-50 text-amber-900 flex items-center gap-3 shadow-sm">
                <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black">Create your agent profile</p>
                  <p className="text-xs font-semibold text-amber-700">
                    Your user account is active, but you do not have an agent profile yet.
                  </p>
                </div>
                <button
                  onClick={() => navigate('/settings?tab=agent')}
                  className="shrink-0 px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-black hover:bg-amber-700 transition-colors"
                >
                  Open Settings
                </button>
              </div>
            )}

            <div className="px-6 pt-4 pb-12 max-w-[1600px] mx-auto">
                <Routes>
                  <Route path="/" element={<AgentOverview />} />
                  <Route path="/leaderboard/realtime" element={<AgentleaderboardRealtime />} />
                  <Route path="/leaderboard/trainer/:trainerId" element={<TrainerDetailPage />} />
                  <Route path="/call-report/policytek" element={<CallReportPolicytek />} />
                  <Route path="/call-report/wavv" element={<CallReportWavv />} />
                  <Route path="/call-report/callx" element={<CallReportCallx />} />
                  <Route path="/agency/:teamId" element={<AgencyDetailPage />} />
                  <Route path="/stats" element={<AgentStats />} />
                  <Route path="/my-profile" element={<MyProfilePage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/policies" element={<AgentPoliciesV2 />} />
                  <Route path="/policies/v2" element={<Navigate to="/policies" replace />} />
                  <Route path="/policies/details" element={<AgentPolicyDetails />} />
                  <Route path="/downlines" element={<AgentDownlines />} />
                  <Route path="/downlines/:agentId" element={<DownlineAgentDetails />} />
                  <Route path="/commissions" element={<AgentCommissions />} />
                  <Route path="/splits" element={<AgentSplits />} />
                  <Route path="/debts" element={<AgentDebtRecovery />} />
                  <Route path="/tickets" element={<AgentTickets />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </div>
            <InternalAiDrawer />
            </div>
        )}
      </main>
    </div>
  );
};

const CheckCircleIcon = () => (
  <svg className="w-4 h-4 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

export const AgentWorkspace: React.FC = () => {
  return (
    <InternalAiProvider>
      <AgentLayout />
    </InternalAiProvider>
  );
};

export default AgentWorkspace;
