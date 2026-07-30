
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BusinessGamification } from './components/BusinessGamification';
import goalsUniverseBackground from './assets/goals-universe-background.jpg';
import { Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  FileCheck, 
  FileImage,
  Split, 
  DollarSign, 
  AlertCircle, 
  LogOut,
  ChevronDown, 
  Lock, 
  ChevronLeft, 
  ChevronRight, 
  Briefcase, 
  BarChart3,
  Calendar,
  History,
  Loader2,
  MapPinned,
  ReceiptText,
  Users, 
  Ticket,
  Trophy,
  Check, // Imported Check
  Pencil,
  PhoneCall,
  Plus,
  Store,
  Settings,
  CircleHelp,
  Bot,
  Moon,
  Search,
  SlidersHorizontal,
  Sun,
  Trash2,
  Upload,
  X
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
} from 'recharts';
import { useAgentContext } from './context/AgentContext';
import { useAuth } from '../../context/AuthContext';
import { AgentOverview } from './components/AgentOverview';
import { AgentPoliciesV2, PolicyDateRangeFilter, PoliciesTimeframe, toPolicyRequestDate } from './components/AgentPoliciesV2';
import { WorkspaceToolbarPortal } from './components/WorkspaceToolbarPortal';
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
import { ServicesPage } from './components/ServicesPage';
import { AmericoReconciliation } from './components/AmericoReconciliation';
import { AmericoBusinessPolicies } from './components/AmericoBusinessPolicies';
import { ModuleSwitcher } from '../../shared/components/ModuleSwitcher';
import { NotificationBell } from '../../shared/components/NotificationBell';
import { NotificationDirect } from '../../shared/components/NotificationDirect';
import { NotificationSale } from '../../shared/components/NotificationSale';
import { myBusinessOverviewApi, MyBusinessOverviewResponse } from './services/myBusinessOverviewApi';
import { CallXActivityRundownRow, ManualActivityRundownRow, PolicyTekCallRundownRow, PolicyTekLeadStatRow, SubmittedSaleActivityRundownRow, WavvActivityRundownRow, myBusinessActivityApi } from './services/myBusinessActivityApi';
import { AssistPolicySplit, MyBusinessExpenseRow, UtilityAgent, myBusinessExpenseApi } from './services/myBusinessExpenseApi';

const useDelayedHover = (enabled: boolean, closeDelay = 400) => {
  const [mounted, setMounted] = React.useState(false);
  const [visible, setVisible] = React.useState(false);
  const closeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const enterTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    if (unmountTimer.current) clearTimeout(unmountTimer.current);
    if (enterTimer.current) clearTimeout(enterTimer.current);
    closeTimer.current = null;
    unmountTimer.current = null;
    enterTimer.current = null;
  };

  const show = () => {
    if (!enabled) return;
    clearTimers();
    if (mounted) {
      setVisible(true);
      return;
    }
    setMounted(true);
    enterTimer.current = setTimeout(() => {
      setVisible(true);
      enterTimer.current = null;
    }, 20);
  };

  const hide = () => {
    if (!enabled) return;
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => {
      setVisible(false);
      closeTimer.current = null;
      unmountTimer.current = setTimeout(() => {
        setMounted(false);
        unmountTimer.current = null;
      }, 200);
    }, closeDelay);
  };

  React.useEffect(() => () => clearTimers(), []);

  React.useEffect(() => {
    if (!enabled) {
      clearTimers();
      setVisible(false);
      setMounted(false);
    }
  }, [enabled]);

  return { mounted, visible, show, hide };
};

// Sidebar Group - Expandable parent with sub-items
const SidebarGroup = ({
  icon,
  label,
  active,
  locked,
  collapsed,
  dark,
  defaultOpen,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  locked?: boolean;
  collapsed?: boolean;
  dark?: boolean;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) => {
  const [open, setOpen] = React.useState(active || Boolean(defaultOpen));
  const { mounted: flyoutMounted, visible: flyoutVisible, show: showFlyout, hide: hideFlyout } = useDelayedHover(Boolean(collapsed));

  React.useEffect(() => {
    if (active) setOpen(true);
  }, [active]);

  return (
    <div
      className={`relative w-full transition-colors duration-200 ${collapsed ? 'flex justify-center' : ''} ${
        !collapsed && open
          ? dark
            ? 'rounded-2xl bg-white/[0.04] p-1'
            : 'rounded-2xl bg-slate-100/80 p-1'
          : ''
      }`}
      onMouseEnter={showFlyout}
      onMouseLeave={hideFlyout}
    >
      <button
        onClick={() => !locked && setOpen((o) => !o)}
        className={`
          relative flex items-center transition-all duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1.0)] group
          ${collapsed
            ? 'h-9 w-9 shrink-0 justify-center rounded-lg'
            : 'w-full px-2.5 py-2.5 rounded-xl gap-2.5'
          }
          ${active
            ? dark ? 'bg-white/[0.06] text-white' : 'bg-white text-slate-950 shadow-sm'
            : locked
            ? 'opacity-50 cursor-not-allowed grayscale'
            : dark ? 'text-slate-400 hover:bg-white/5 hover:text-white' : 'text-slate-700 hover:bg-white hover:text-slate-950'
          }
        `}
        title={collapsed ? label : undefined}
      >
        <span className={`flex h-4 w-4 shrink-0 items-center justify-center transition-colors duration-200 ${active ? 'text-violet-600' : dark ? 'text-slate-500 group-hover:text-slate-300' : 'text-slate-500 group-hover:text-slate-800'}`}>
          {icon}
        </span>
        <span className={`
          whitespace-nowrap overflow-hidden transition-all duration-300 origin-left text-left text-xs font-bold
          ${collapsed ? 'w-0 opacity-0 -translate-x-2' : 'w-auto flex-1 opacity-100 translate-x-0'}
        `}>
          {label}
        </span>
        {!collapsed && !locked && (
          <ChevronDown
            size={14}
            className={`shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''} ${active ? 'text-violet-500' : dark ? 'text-slate-600' : 'text-slate-400'}`}
          />
        )}
        {!collapsed && locked && <Lock className="w-3.5 h-3.5 text-slate-300 shrink-0" />}
        {active && collapsed && (
          <span className="absolute top-2 right-2 w-2 h-2 bg-brand-500 rounded-full border border-white animate-in zoom-in duration-300" />
        )}
      </button>

      {!collapsed && open && (
        <div className="relative ml-3 mt-0.5 w-[calc(100%-0.75rem)] space-y-0.5 pb-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
          {children}
        </div>
      )}

      {collapsed && flyoutMounted && !locked && (
        <div
          className={`absolute left-full top-0 z-50 ml-2 w-56 overflow-hidden rounded-xl border p-2 shadow-2xl transition-all duration-200 ease-out ${
            flyoutVisible ? 'translate-x-0 opacity-100' : 'pointer-events-none -translate-x-2 opacity-0'
          } ${
            dark
              ? 'border-white/10 bg-[#151522] shadow-black/40'
              : 'border-slate-200 bg-white shadow-slate-900/15'
          }`}
        >
          <div className={`px-3 pb-2 pt-1 text-[10px] font-black uppercase tracking-[0.14em] ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
            {label}
          </div>
          <div className="relative ml-2 space-y-0.5">
            {children}
          </div>
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
  icon,
  badgeLabel,
}: {
  to: string;
  label: string;
  active: boolean;
  locked?: boolean;
  dark?: boolean;
  icon?: React.ReactNode;
  badgeLabel?: string;
}) => (
  <Link
    to={locked ? '#' : to}
    onClick={(e) => locked && e.preventDefault()}
    className={`
      relative flex w-full min-h-8 items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold transition-all duration-200
      ${
        active
          ? dark ? 'bg-violet-500/20 text-violet-200' : 'bg-violet-200/80 text-violet-700'
          : locked
          ? dark ? 'text-slate-700 cursor-not-allowed' : 'text-slate-400 cursor-not-allowed'
          : dark ? 'text-slate-500 hover:bg-white/5 hover:text-white' : 'text-slate-600 hover:bg-white hover:text-slate-950'
      }
    `}
  >
    <span
      aria-hidden="true"
      className={`flex h-4 w-4 shrink-0 items-center justify-center ${active ? 'text-violet-600' : dark ? 'text-slate-600' : 'text-slate-400'}`}
    >
      {icon ?? (
        <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-violet-600' : dark ? 'bg-slate-700' : 'bg-slate-300'}`} />
      )}
    </span>
    <span className="truncate">{label}</span>
    {locked && (
      <span className={`ml-auto shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide ${
        dark ? 'bg-white/5 text-slate-600' : 'bg-slate-200/70 text-slate-500'
      }`}>
        {badgeLabel || 'Soon'}
      </span>
    )}
  </Link>
);

// Compact primary navigation item.
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
  const { mounted: flyoutMounted, visible: flyoutVisible, show: showFlyout, hide: hideFlyout } = useDelayedHover(Boolean(collapsed));

  return (
    <div
      className={`relative w-full ${collapsed ? 'flex justify-center' : ''}`}
      onMouseEnter={showFlyout}
      onMouseLeave={hideFlyout}
    >
      <Link
        to={locked ? '#' : to}
        onClick={(e) => locked && e.preventDefault()}
        className={`
          relative flex items-center transition-all duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1.0)] group
          ${collapsed
            ? 'h-9 w-9 shrink-0 justify-center rounded-lg'
            : 'w-full px-3 py-2.5 rounded-lg gap-3'
          }
          ${active
            ? dark ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-950'
            : locked
              ? 'opacity-50 cursor-not-allowed grayscale'
              : dark ? 'text-slate-400 hover:bg-white/5 hover:text-white' : 'text-slate-700 hover:bg-slate-50 hover:text-slate-950'
          }
        `}
      >
        <span className={`flex h-4 w-4 shrink-0 items-center justify-center transition-colors duration-200 ${active ? 'text-violet-600' : dark ? 'text-slate-500 group-hover:text-slate-300' : 'text-slate-500 group-hover:text-slate-800'}`}>
          {icon}
        </span>

        <span className={`
          font-bold text-xs whitespace-nowrap overflow-hidden transition-all duration-300 origin-left
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

      {collapsed && flyoutMounted && (
        <div className={`pointer-events-none absolute left-full top-1/2 z-50 ml-2 whitespace-nowrap rounded-lg border px-3 py-2 text-xs font-bold shadow-xl transition-all duration-200 ease-out ${
          flyoutVisible ? '-translate-y-1/2 translate-x-0 opacity-100' : '-translate-x-2 -translate-y-1/2 opacity-0'
        } ${
          dark ? 'border-white/10 bg-[#151522] text-white shadow-black/40' : 'border-slate-200 bg-white text-slate-800 shadow-slate-900/10'
        }`}>
          {label}
        </div>
      )}
    </div>
  );
};

const BusinessPlaceholder = ({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
}) => (
  <div className="rounded-[2rem] border border-white/80 bg-white/80 p-10 shadow-sm">
    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-amber-300 shadow-lg shadow-slate-200">
      {icon}
    </div>
    <h3 className="mt-6 text-2xl font-black tracking-tight text-slate-950">{title}</h3>
    <p className="mt-2 max-w-xl text-sm font-semibold text-slate-500">{description}</p>
  </div>
);

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const compactCurrencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
});

const businessChartColors = ['#0f172a', '#d49b17', '#10b981', '#64748b', '#f97316', '#3b82f6'];

const stateNameToCode: Record<string, string> = {
  Alabama: 'AL', Alaska: 'AK', Arizona: 'AZ', Arkansas: 'AR', California: 'CA', Colorado: 'CO', Connecticut: 'CT', Delaware: 'DE',
  Florida: 'FL', Georgia: 'GA', Hawaii: 'HI', Idaho: 'ID', Illinois: 'IL', Indiana: 'IN', Iowa: 'IA', Kansas: 'KS',
  Kentucky: 'KY', Louisiana: 'LA', Maine: 'ME', Maryland: 'MD', Massachusetts: 'MA', Michigan: 'MI', Minnesota: 'MN', Mississippi: 'MS',
  Missouri: 'MO', Montana: 'MT', Nebraska: 'NE', Nevada: 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM',
  'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', Ohio: 'OH', Oklahoma: 'OK', Oregon: 'OR', Pennsylvania: 'PA',
  'Rhode Island': 'RI', 'South Carolina': 'SC', 'South Dakota': 'SD', Tennessee: 'TN', Texas: 'TX', Utah: 'UT', Vermont: 'VT',
  Virginia: 'VA', Washington: 'WA', 'West Virginia': 'WV', Wisconsin: 'WI', Wyoming: 'WY',
};

const stateTileRows = [
  ['AK', '', '', '', '', '', '', '', '', '', 'ME'],
  ['', '', '', '', '', '', '', '', '', 'VT', 'NH'],
  ['WA', 'ID', 'MT', 'ND', 'MN', 'IL', 'WI', 'MI', 'NY', 'MA', 'RI'],
  ['OR', 'NV', 'WY', 'SD', 'IA', 'IN', 'OH', 'PA', 'NJ', 'CT', ''],
  ['CA', 'UT', 'CO', 'NE', 'MO', 'KY', 'WV', 'VA', 'MD', 'DE', ''],
  ['', 'AZ', 'NM', 'KS', 'AR', 'TN', 'NC', 'SC', '', '', ''],
  ['', '', 'OK', 'LA', 'MS', 'AL', 'GA', '', '', '', ''],
  ['HI', '', 'TX', '', '', '', 'FL', '', '', '', ''],
];

const MyBusinessOverviewContent = ({
  selectedAgentId,
  selectedAgentLabel,
  toolbarSlotId,
}: {
  selectedAgentId: string;
  selectedAgentLabel: string;
  toolbarSlotId?: string;
}) => {
  const [timeframe, setTimeframe] = useState<PoliciesTimeframe>('weekly');
  const [startDate, setStartDate] = useState<number | undefined>(undefined);
  const [endDate, setEndDate] = useState<number | undefined>(undefined);
  const [data, setData] = useState<MyBusinessOverviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedAgentId) {
      setData(null);
      return;
    }
    if (timeframe === 'custom' && (startDate === undefined || endDate === undefined)) {
      setData(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    myBusinessOverviewApi.getOverview({
      agentId: selectedAgentId,
      timeframe: timeframe === 'all' ? null : timeframe,
      startDate: timeframe === 'custom' ? toPolicyRequestDate(startDate) : null,
      endDate: timeframe === 'custom' ? toPolicyRequestDate(endDate) : null,
    })
      .then(result => {
        if (!cancelled) setData(result);
      })
      .catch(err => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load business overview.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedAgentId, timeframe, startDate, endDate]);

  const states = useMemo(() => (
    [...(data?.by_state || [])]
      .filter(item => item.state)
      .map(item => ({
        ...item,
        records: Number(item.records) || 0,
        total_ap: Number(item.total_ap) || 0,
        code: stateNameToCode[item.state] || item.state.slice(0, 2).toUpperCase(),
      }))
      .sort((a, b) => b.total_ap - a.total_ap)
  ), [data]);

  const sources = useMemo(() => (
    [...(data?.by_source || [])]
      .map(item => ({
        ...item,
        label: item.source_name || item.name || item.source || 'Unknown Source',
        records: Number(item.records) || 0,
        total_ap: Number(item.total_ap) || 0,
      }))
      .filter(item => item.label)
      .sort((a, b) => b.total_ap - a.total_ap)
  ), [data]);

  const policyStatuses = useMemo(() => (
    [...(data?.by_policyStatus || [])]
      .map(item => ({
        label: item.policy_status_name || item.policy_status || item.status || item.name || 'Unknown Status',
        records: Number(item.policy_count ?? item.records) || 0,
        total_ap: Number(item.total_ap) || 0,
      }))
      .filter(item => item.label && (item.records > 0 || item.total_ap > 0))
      .sort((a, b) => b.total_ap - a.total_ap)
  ), [data]);

  const totals = useMemo(() => {
    const records = states.reduce((sum, item) => sum + item.records, 0);
    const annualPremium = states.reduce((sum, item) => sum + item.total_ap, 0);
    return {
      records,
      annualPremium,
      stateCount: states.length,
      averagePremium: records > 0 ? annualPremium / records : 0,
      topState: states[0],
    };
  }, [states]);

  const maxStatePremium = Math.max(...states.map(item => item.total_ap), 1);
  const maxPolicyStatusPremium = Math.max(...policyStatuses.map(item => item.total_ap), 1);
  const statesByCode = useMemo(() => new Map(states.map(item => [item.code, item])), [states]);

  const topSourceChartData = useMemo(() => (
    sources.slice(0, 6).map(item => ({
      name: item.label,
      records: item.records,
      annualPremium: item.total_ap,
    }))
  ), [sources]);

  const sourceTotals = useMemo(() => ({
    records: sources.reduce((sum, item) => sum + item.records, 0),
    annualPremium: sources.reduce((sum, item) => sum + item.total_ap, 0),
  }), [sources]);

  const stateTileClass = (amount: number) => {
    if (amount <= 0) return 'border-slate-100 bg-slate-100 text-slate-300';
    const intensity = amount / maxStatePremium;
    if (intensity > 0.75) return 'border-slate-950 bg-slate-950 text-white shadow-lg shadow-slate-200';
    if (intensity > 0.45) return 'border-amber-400 bg-amber-400 text-slate-950 shadow-md shadow-amber-100';
    if (intensity > 0.2) return 'border-amber-200 bg-amber-100 text-amber-900';
    return 'border-slate-200 bg-white text-slate-500';
  };

  const handleTimeframeChange = (next: PoliciesTimeframe) => {
    setTimeframe(next);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <WorkspaceToolbarPortal slotId={toolbarSlotId}>
        <>
          <PolicyDateRangeFilter
            timeframe={timeframe}
            startDate={startDate}
            endDate={endDate}
            onTimeframeChange={handleTimeframeChange}
            onDateChange={(start, end) => {
              setStartDate(start);
              setEndDate(end);
            }}
            variant="inline"
          />
          <BusinessViewToggle active="overview" />
        </>
      </WorkspaceToolbarPortal>

      <section className="overflow-hidden rounded-[2rem] border border-white/80 bg-white shadow-sm">
        <div className="flex flex-col gap-5 border-b border-slate-100 p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-amber-300 shadow-lg shadow-slate-200">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Business Overview</p>
              <h2 className="text-2xl font-black tracking-tight text-slate-950">Analytics Dashboard</h2>
              <p className="text-sm font-semibold text-slate-500">Production signals for {selectedAgentLabel}.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setTimeframe('all');
              setStartDate(undefined);
              setEndDate(undefined);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-500 transition-all hover:bg-white hover:text-slate-950"
          >
            <RotateCcw className="h-4 w-4" />
            Reset Range
          </button>
        </div>

        {error ? (
          <div className="p-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-500">
              <AlertCircle className="h-5 w-5" />
            </div>
            <p className="mt-4 text-sm font-black text-slate-950">Failed to load overview</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">{error}</p>
          </div>
        ) : isLoading ? (
          <div className="flex min-h-72 items-center justify-center gap-3 p-10 text-sm font-bold text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
            Loading business overview...
          </div>
        ) : (
          <div className="space-y-4 bg-slate-50/70 p-4 sm:p-5">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="relative overflow-hidden rounded-2xl bg-slate-950 p-4 text-white shadow-lg shadow-slate-200">
                <div className="absolute -right-7 -top-7 h-24 w-24 rounded-full border border-white/10" />
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400 text-slate-950">
                  <MapPinned className="h-4 w-4" />
                </div>
                <p className="mt-4 text-[9px] font-black uppercase tracking-[0.22em] text-white/45">Total Annual Premium</p>
                <p className="mt-1 text-2xl font-black tracking-tight">{compactCurrencyFormatter.format(totals.annualPremium)}</p>
                <p className="mt-0.5 text-[11px] font-bold text-white/55">{currencyFormatter.format(totals.annualPremium)} exact</p>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-400">Submitted Records</p>
                <p className="mt-2 text-2xl font-black tracking-tight text-slate-950">{totals.records.toLocaleString()}</p>
                <p className="mt-1 text-[11px] font-bold leading-snug text-slate-500">Across the selected scope and date range.</p>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-400">Market Coverage</p>
                <p className="mt-2 text-2xl font-black tracking-tight text-slate-950">{totals.stateCount.toLocaleString()}</p>
                <p className="mt-1 text-[11px] font-bold leading-snug text-slate-500">States with production returned.</p>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-amber-700">Lead Sources</p>
                <p className="mt-2 text-2xl font-black tracking-tight text-slate-950">{sources.length.toLocaleString()}</p>
                <p className="mt-1 text-[11px] font-bold leading-snug text-amber-800/70">
                  Avg AP / record: {currencyFormatter.format(totals.averagePremium)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
              <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-400">State Heat Map</p>
                    <h3 className="text-lg font-black tracking-tight text-slate-950">Production by state</h3>
                    <p className="text-xs font-semibold text-slate-500">Darker states carry higher annual premium.</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-right">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Top State</p>
                    <p className="text-xs font-black text-slate-950">{totals.topState?.state || 'No state data'}</p>
                  </div>
                </div>

                {states.length === 0 ? (
                  <div className="flex h-80 items-center justify-center rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 text-sm font-bold text-slate-400">
                    No state production returned for this range.
                  </div>
                ) : (
                  <div className="grid grid-cols-11 gap-1.5 rounded-xl bg-slate-50 p-3">
                    {stateTileRows.flatMap((row, rowIndex) => row.map((code, colIndex) => {
                      const state = code ? statesByCode.get(code) : null;
                      const title = state ? `${state.state}: ${currencyFormatter.format(state.total_ap)} · ${state.records} records` : code;
                      return code ? (
                        <div
                          key={`${code}-${rowIndex}-${colIndex}`}
                          title={title}
                          className={`flex aspect-square min-h-8 items-center justify-center rounded-lg border text-[9px] font-black transition-all ${stateTileClass(state?.total_ap || 0)}`}
                        >
                          {code}
                        </div>
                      ) : (
                        <div key={`empty-${rowIndex}-${colIndex}`} className="aspect-square min-h-8" />
                      );
                    }))}
                  </div>
                )}
              </section>

              <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-400">State Rundown</p>
                <h3 className="text-lg font-black tracking-tight text-slate-950">Top markets</h3>
                <div className="mt-3 max-h-[20rem] space-y-2 overflow-y-auto pr-1">
                  {states.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm font-bold text-slate-400">No state data.</div>
                  ) : states.slice(0, 12).map((item, index) => {
                    const percent = Math.max(4, (item.total_ap / maxStatePremium) * 100);
                    return (
                      <div key={`${item.state}-rundown-${index}`} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-slate-950">{index + 1}. {item.state}</p>
                            <p className="text-[11px] font-bold text-slate-400">{item.records.toLocaleString()} records</p>
                          </div>
                          <p className="text-sm font-black text-slate-950">{currencyFormatter.format(item.total_ap)}</p>
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white">
                          <div className="h-full rounded-full bg-gradient-to-r from-slate-950 to-amber-400" style={{ width: `${percent}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="mb-3">
                  <p className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-400">Policy Status</p>
                  <h3 className="text-lg font-black tracking-tight text-slate-950">Status breakdown</h3>
                </div>
                <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                  {policyStatuses.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm font-bold text-slate-400">No policy status data returned yet.</div>
                  ) : policyStatuses.map((item, index) => {
                    const percent = Math.max(4, (item.total_ap / maxPolicyStatusPremium) * 100);
                    return (
                      <div key={`${item.label}-${index}`} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-slate-950">{item.label}</p>
                            <p className="text-[11px] font-bold text-slate-400">{item.records.toLocaleString()} policies</p>
                          </div>
                          <p className="text-sm font-black text-slate-950">{currencyFormatter.format(item.total_ap)}</p>
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white">
                          <div className="h-full rounded-full bg-amber-400" style={{ width: `${percent}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-400">Lead Source Mix</p>
                    <h3 className="text-lg font-black tracking-tight text-slate-950">Source performance</h3>
                  </div>
                  <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-right">
                    <p className="text-[9px] font-black uppercase tracking-widest text-amber-700">Source AP</p>
                    <p className="text-xs font-black text-slate-950">{currencyFormatter.format(sourceTotals.annualPremium)}</p>
                  </div>
                </div>

                {topSourceChartData.length === 0 ? (
                  <div className="flex h-80 items-center justify-center rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 text-sm font-bold text-slate-400">
                    No source production returned for this range.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-[0.9fr_1.1fr]">
                    <div className="relative h-64 min-w-0 rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart margin={{ top: 18, right: 18, bottom: 18, left: 18 }}>
                          <Pie
                            data={topSourceChartData}
                            dataKey="annualPremium"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={58}
                            outerRadius={94}
                            paddingAngle={4}
                            cornerRadius={12}
                          >
                            {topSourceChartData.map((entry, index) => (
                              <Cell key={`${entry.name}-${index}`} fill={businessChartColors[index % businessChartColors.length]} />
                            ))}
                          </Pie>
                          <RechartsTooltip
                            formatter={(value: number | string) => currencyFormatter.format(Number(value) || 0)}
                            labelStyle={{ color: '#0f172a', fontWeight: 800 }}
                            contentStyle={{ borderRadius: 16, border: '1px solid #e2e8f0' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <p className="text-3xl font-black tracking-tight text-slate-950">{sourceTotals.records.toLocaleString()}</p>
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Records</p>
                        </div>
                      </div>
                    </div>

                    <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                      {sources.slice(0, 8).map((item, index) => (
                        <div key={`${item.label}-source-${index}`} className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span
                                  className="h-2.5 w-2.5 rounded-full"
                                  style={{ backgroundColor: businessChartColors[index % businessChartColors.length] }}
                                />
                                <p className="truncate text-sm font-black text-slate-950">{item.label}</p>
                              </div>
                              <p className="mt-1 text-base font-black text-slate-950">{currencyFormatter.format(item.total_ap)}</p>
                            </div>
                            <span className="rounded-xl bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-500">
                              {item.records.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

type ManualActivityKey = 'dials' | 'contacts' | 'presentations' | 'appointments' | 'sold';
type PlatformActivityName = 'Wavv' | 'PolicyTek' | 'CallX' | 'Submitted Sale';
type PolicyTekRundownTab = 'lead_stat' | 'call_rundown';

const emptyManualActivity: Record<ManualActivityKey, number> = {
  dials: 0,
  contacts: 0,
  presentations: 0,
  appointments: 0,
  sold: 0,
};

const toManualActivityNumber = (value: unknown) => {
  const next = Number(value);
  return Number.isFinite(next) ? next : 0;
};

const formatActivityCount = (value: unknown) => Math.round(toManualActivityNumber(value)).toLocaleString();

const formatActivityDuration = (seconds: unknown) => {
  const totalSeconds = Math.max(0, Math.round(toManualActivityNumber(seconds)));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m ${String(remainingSeconds).padStart(2, '0')}s`;
};

const formatActivityCurrency = (value: unknown) => compactCurrencyFormatter.format(toManualActivityNumber(value));

const formatActivityPercent = (value: unknown) => `${toManualActivityNumber(value).toFixed(1)}%`;

const denverDatePartsFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Denver',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const monthLabelFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
});

const denverDateKeyFromTimestamp = (value?: number | string | null) => {
  if (value === null || value === undefined || value === '') return null;

  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }

  const timestamp = Number(value);
  const date = Number.isFinite(timestamp) ? new Date(timestamp) : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const parts = denverDatePartsFormatter.formatToParts(date).reduce<Record<string, string>>((acc, part) => {
    if (part.type !== 'literal') acc[part.type] = part.value;
    return acc;
  }, {});

  return `${parts.year}-${parts.month}-${parts.day}`;
};

const dateKeyToUtcDate = (dateKey: string) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
};

const getLastDayOfMonth = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();

const getActivityBucket = (dateKey: string, timeframe: PoliciesTimeframe) => {
  const [year, month, day] = dateKey.split('-').map(Number);

  if (timeframe === 'yearly') {
    const key = `${year}-${String(month).padStart(2, '0')}`;
    return {
      key,
      label: monthLabelFormatter.format(new Date(Date.UTC(year, month - 1, 1))),
      sort: Date.UTC(year, month - 1, 1),
    };
  }

  if (timeframe === 'monthly') {
    const startDay = Math.floor((day - 1) / 4) * 4 + 1;
    const endDay = Math.min(startDay + 3, getLastDayOfMonth(year, month));
    const key = `${year}-${String(month).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`;
    return {
      key,
      label: `${monthLabelFormatter.format(new Date(Date.UTC(year, month - 1, 1)))} ${startDay}-${endDay}`,
      sort: Date.UTC(year, month - 1, startDay),
    };
  }

  return {
    key: dateKey,
    label: dateKeyToUtcDate(dateKey).toLocaleDateString('en-US', { month: 'short', day: '2-digit' }),
    sort: dateKeyToUtcDate(dateKey).getTime(),
  };
};

const normalizeManualActivity = (
  value?: Partial<Record<ManualActivityKey, unknown>> | null
): Record<ManualActivityKey, number> => ({
  dials: toManualActivityNumber(value?.dials),
  contacts: toManualActivityNumber(value?.contacts),
  presentations: toManualActivityNumber(value?.presentations),
  appointments: toManualActivityNumber(value?.appointments),
  sold: toManualActivityNumber(value?.sold),
});

const hasManualActivityValues = (activity: Record<ManualActivityKey, number>) => (
  activity.dials > 0 || activity.contacts > 0 || activity.presentations > 0 || activity.appointments > 0 || activity.sold > 0
);

const toLocalActivityDate = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const resolveTodayManualActivity = (
  todayActivity?: Partial<Record<ManualActivityKey, unknown>> | null,
  rows: ManualActivityRundownRow[] = []
) => {
  const normalizedToday = normalizeManualActivity(todayActivity);
  if (hasManualActivityValues(normalizedToday)) return normalizedToday;

  const todayRow = rows.find(row => row.created_date === toLocalActivityDate());
  return todayRow ? normalizeManualActivity(todayRow) : normalizedToday;
};

const formatManualActivityDate = (value?: string | null) => {
  if (!value) return 'Not set';

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
};

const formatActivityTimestamp = (value?: number | string | null) => {
  if (value === null || value === undefined || value === '') return 'Not set';

  const timestamp = Number(value);
  const date = Number.isFinite(timestamp) ? new Date(timestamp) : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const mockActivityChart = [
  { date: 'Mon', manual: 62, wavv: 48, policytek: 18, callx: 22, sold: 2 },
  { date: 'Tue', manual: 74, wavv: 55, policytek: 24, callx: 19, sold: 1 },
  { date: 'Wed', manual: 58, wavv: 39, policytek: 16, callx: 28, sold: 3 },
  { date: 'Thu', manual: 81, wavv: 61, policytek: 22, callx: 31, sold: 4 },
  { date: 'Fri', manual: 69, wavv: 52, policytek: 20, callx: 24, sold: 2 },
  { date: 'Sat', manual: 28, wavv: 19, policytek: 8, callx: 10, sold: 1 },
  { date: 'Sun', manual: 18, wavv: 12, policytek: 4, callx: 6, sold: 0 },
];

const activityPlatforms = [
  {
    name: 'Wavv',
    accent: 'emerald',
    total: '286',
    label: 'Calls dialed',
    metrics: [
      ['Conversations', '92'],
      ['Contacts called', '178'],
      ['Talk time', '7h 42m'],
      ['Avg call', '5m 01s'],
    ],
  },
  {
    name: 'PolicyTek',
    accent: 'amber',
    total: '108',
    label: 'Calls received',
    metrics: [
      ['Valid calls', '74'],
      ['Avg call', '4m 18s'],
      ['Submitted', '16'],
      ['Submitted AP', '$18.4K'],
    ],
  },
  {
    name: 'CallX',
    accent: 'sky',
    total: '126',
    label: 'Calls received',
    metrics: [
      ['Valid calls', '91'],
      ['Paid calls', '67'],
      ['Submitted', '21'],
      ['Submitted AP', '$26.7K'],
    ],
  },
  {
    name: 'Submitted Sale',
    accent: 'slate',
    total: '68',
    label: 'Dials',
    metrics: [
      ['Contacts', '24'],
      ['Sits', '8'],
      ['Submitted', '2'],
      ['Submitted AP', '$4.8K'],
    ],
  },
];

const emptyWavvSummary = {
  dials: 0,
  conversations: 0,
  contacts: 0,
  talkTime: 0,
  avgCallLength: 0,
};

const emptyPolicyTekSummary = {
  callsReceived: 0,
  validCalls: 0,
  submitted: 0,
  submittedPremium: 0,
  averageCall: 0,
};

const emptyCallXSummary = {
  callsReceived: 0,
  validCalls: 0,
  paidCalls: 0,
  submitted: 0,
  submittedPremium: 0,
};

const emptySubmittedSaleSummary = {
  dials: 0,
  contacts: 0,
  sits: 0,
  submitted: 0,
  submittedAp: 0,
};

const platformRundownRows: Record<PlatformActivityName, Array<Record<string, string | number>>> = {
  Wavv: [
    { date: 'Jul 01, 2026', calls: 64, conversations: 21, contacts: 39, talkTime: '1h 42m', avgCall: '4m 51s' },
    { date: 'Jun 30, 2026', calls: 71, conversations: 24, contacts: 44, talkTime: '1h 58m', avgCall: '4m 55s' },
    { date: 'Jun 29, 2026', calls: 58, conversations: 19, contacts: 36, talkTime: '1h 31m', avgCall: '4m 47s' },
    { date: 'Jun 28, 2026', calls: 42, conversations: 15, contacts: 27, talkTime: '1h 09m', avgCall: '4m 36s' },
    { date: 'Jun 27, 2026', calls: 51, conversations: 13, contacts: 32, talkTime: '1h 22m', avgCall: '6m 18s' },
  ],
  PolicyTek: [
    { date: 'Jul 01, 2026', callsReceived: 26, validCalls: 18, submitted: 4, submittedAp: '$4.7K', avgCall: '4m 12s' },
    { date: 'Jun 30, 2026', callsReceived: 24, validCalls: 17, submitted: 3, submittedAp: '$3.6K', avgCall: '4m 38s' },
    { date: 'Jun 29, 2026', callsReceived: 19, validCalls: 12, submitted: 2, submittedAp: '$2.1K', avgCall: '3m 58s' },
    { date: 'Jun 28, 2026', callsReceived: 17, validCalls: 11, submitted: 3, submittedAp: '$5.2K', avgCall: '4m 44s' },
    { date: 'Jun 27, 2026', callsReceived: 22, validCalls: 16, submitted: 4, submittedAp: '$2.8K', avgCall: '3m 59s' },
  ],
  CallX: [
    { date: 'Jul 01, 2026', callsReceived: 31, validCalls: 23, paidCalls: 18, submitted: 5, submittedAp: '$6.4K' },
    { date: 'Jun 30, 2026', callsReceived: 28, validCalls: 21, paidCalls: 16, submitted: 4, submittedAp: '$5.1K' },
    { date: 'Jun 29, 2026', callsReceived: 24, validCalls: 18, paidCalls: 13, submitted: 3, submittedAp: '$3.2K' },
    { date: 'Jun 28, 2026', callsReceived: 19, validCalls: 14, paidCalls: 10, submitted: 4, submittedAp: '$7.8K' },
    { date: 'Jun 27, 2026', callsReceived: 24, validCalls: 15, paidCalls: 10, submitted: 5, submittedAp: '$4.2K' },
  ],
  'Submitted Sale': [
    { date: 'Jul 01, 2026', dials: 18, contacts: 8, sits: 3, submitted: 1, submittedAp: '$2.4K' },
    { date: 'Jun 30, 2026', dials: 21, contacts: 7, sits: 2, submitted: 1, submittedAp: '$2.4K' },
    { date: 'Jun 29, 2026', dials: 16, contacts: 5, sits: 2, submitted: 0, submittedAp: '$0' },
    { date: 'Jun 28, 2026', dials: 13, contacts: 4, sits: 1, submitted: 0, submittedAp: '$0' },
  ],
};

const platformRundownColumns: Record<PlatformActivityName, Array<{ key: string; label: string }>> = {
  Wavv: [
    { key: 'date', label: 'Date' },
    { key: 'calls', label: 'Calls' },
    { key: 'conversations', label: 'Conversations' },
    { key: 'contacts', label: 'Contacts' },
    { key: 'talkTime', label: 'Talk Time' },
    { key: 'avgCall', label: 'Avg Call' },
  ],
  PolicyTek: [
    { key: 'date', label: 'Date' },
    { key: 'callsReceived', label: 'Calls' },
    { key: 'validCalls', label: 'Valid' },
    { key: 'submitted', label: 'Submitted' },
    { key: 'submittedAp', label: 'Submitted AP' },
    { key: 'avgCall', label: 'Avg Call' },
  ],
  CallX: [
    { key: 'date', label: 'Date' },
    { key: 'callsReceived', label: 'Calls' },
    { key: 'validCalls', label: 'Valid' },
    { key: 'paidCalls', label: 'Paid' },
    { key: 'submitted', label: 'Submitted' },
    { key: 'submittedAp', label: 'Submitted AP' },
  ],
  'Submitted Sale': [
    { key: 'date', label: 'Date' },
    { key: 'dials', label: 'Dials' },
    { key: 'contacts', label: 'Contacts' },
    { key: 'sits', label: 'Sits' },
    { key: 'submitted', label: 'Submitted' },
    { key: 'submittedAp', label: 'Submitted AP' },
  ],
};

const BusinessViewToggle = ({ active }: { active: 'goals' | 'overview' }) => (
  <div className="ml-auto inline-flex rounded-2xl bg-gradient-to-r from-fuchsia-500 via-violet-500 to-cyan-400 p-[2px] shadow-lg shadow-violet-300/40">
    <div className="inline-flex items-center rounded-[14px] bg-slate-950/95 p-1" role="group" aria-label="Switch My Business view">
      <Link
        to="/business"
        aria-current={active === 'goals' ? 'page' : undefined}
        className={`inline-flex h-8 items-center gap-1.5 rounded-[10px] px-3 text-[10px] font-black transition-all ${active === 'goals' ? 'bg-gradient-to-r from-amber-300 to-orange-400 text-slate-950 shadow-md' : 'text-white/60 hover:bg-white/10 hover:text-white'}`}
      >
        <Trophy className="h-3.5 w-3.5" />
        Goals
      </Link>
      <Link
        to="/business/overview"
        aria-current={active === 'overview' ? 'page' : undefined}
        className={`inline-flex h-8 items-center gap-1.5 rounded-[10px] px-3 text-[10px] font-black transition-all ${active === 'overview' ? 'bg-gradient-to-r from-cyan-300 to-violet-400 text-slate-950 shadow-md' : 'text-white/60 hover:bg-white/10 hover:text-white'}`}
      >
        <BarChart3 className="h-3.5 w-3.5" />
        Business Overview
      </Link>
    </div>
  </div>
);

const MyBusinessGamification = ({
  selectedAgentId,
  toolbarSlotId,
}: {
  selectedAgentId: string;
  toolbarSlotId?: string;
}) => (
  <div className="space-y-5">
    <WorkspaceToolbarPortal slotId={toolbarSlotId}>
      <BusinessViewToggle active="goals" />
    </WorkspaceToolbarPortal>
    <BusinessGamification selectedAgentId={selectedAgentId} />
  </div>
);

const ActivityMetricStepper = ({
  label,
  value,
  onChange,
  tooltip,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  tooltip?: string;
}) => (
  <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
    <div className="group relative inline-flex">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
      {tooltip ? (
        <div className="pointer-events-none absolute left-0 top-full z-20 mt-2 w-56 rounded-2xl border border-slate-100 bg-slate-950 px-3 py-2 text-[11px] font-bold leading-snug text-white opacity-0 shadow-xl shadow-slate-900/20 transition group-hover:opacity-100">
          {tooltip}
        </div>
      ) : null}
    </div>
    <div className="mt-4 flex items-center justify-between gap-3">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-lg font-black text-slate-500 transition hover:border-amber-300 hover:text-slate-950"
      >
        -
      </button>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(event) => onChange(Math.max(0, Number(event.target.value) || 0))}
        className="h-12 min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white text-center text-2xl font-black text-slate-950 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-400/10"
      />
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-lg font-black text-white shadow-lg shadow-slate-200 transition hover:bg-slate-800"
      >
        +
      </button>
    </div>
  </div>
);

const MyBusinessActivityLog = ({ selectedAgentId, toolbarSlotId }: { selectedAgentId: string; toolbarSlotId?: string }) => {
  const currentAgentId = selectedAgentId;
  const [timeframe, setTimeframe] = useState<PoliciesTimeframe>('weekly');
  const [startDate, setStartDate] = useState<number | undefined>(undefined);
  const [endDate, setEndDate] = useState<number | undefined>(undefined);
  const [manualActivity, setManualActivity] = useState<Record<ManualActivityKey, number>>(emptyManualActivity);
  const [manualSummary, setManualSummary] = useState<Record<ManualActivityKey, number>>(emptyManualActivity);
  const [manualRows, setManualRows] = useState<ManualActivityRundownRow[]>([]);
  const [manualLoading, setManualLoading] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);
  const [manualSaving, setManualSaving] = useState(false);
  const [manualSaveError, setManualSaveError] = useState<string | null>(null);
  const [manualSaveMessage, setManualSaveMessage] = useState<string | null>(null);
  const [wavvSummary, setWavvSummary] = useState(emptyWavvSummary);
  const [wavvRows, setWavvRows] = useState<WavvActivityRundownRow[]>([]);
  const [wavvLoading, setWavvLoading] = useState(false);
  const [wavvError, setWavvError] = useState<string | null>(null);
  const [policyTekSummary, setPolicyTekSummary] = useState(emptyPolicyTekSummary);
  const [policyTekRows, setPolicyTekRows] = useState<PolicyTekLeadStatRow[]>([]);
  const [policyTekCallRows, setPolicyTekCallRows] = useState<PolicyTekCallRundownRow[]>([]);
  const [policyTekLoading, setPolicyTekLoading] = useState(false);
  const [policyTekError, setPolicyTekError] = useState<string | null>(null);
  const [policyTekRundownTab, setPolicyTekRundownTab] = useState<PolicyTekRundownTab>('lead_stat');
  const [callXSummary, setCallXSummary] = useState(emptyCallXSummary);
  const [callXRows, setCallXRows] = useState<CallXActivityRundownRow[]>([]);
  const [callXLoading, setCallXLoading] = useState(false);
  const [callXError, setCallXError] = useState<string | null>(null);
  const [submittedSaleSummary, setSubmittedSaleSummary] = useState(emptySubmittedSaleSummary);
  const [submittedSaleRows, setSubmittedSaleRows] = useState<SubmittedSaleActivityRundownRow[]>([]);
  const [submittedSaleLoading, setSubmittedSaleLoading] = useState(false);
  const [submittedSaleError, setSubmittedSaleError] = useState<string | null>(null);
  const [selectedRundown, setSelectedRundown] = useState<PlatformActivityName | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadManualActivity = async () => {
      if (!currentAgentId) {
        setManualActivity(emptyManualActivity);
        setManualSummary(emptyManualActivity);
        setManualRows([]);
        return;
      }

      if (timeframe === 'custom' && (!startDate || !endDate)) {
        return;
      }

      setManualLoading(true);
      setManualError(null);

      try {
        const response = await myBusinessActivityApi.getManualActivity({
          agentId: currentAgentId,
          timeframe,
          startDate: timeframe === 'custom' && startDate ? toPolicyRequestDate(startDate) : null,
          endDate: timeframe === 'custom' && endDate ? toPolicyRequestDate(endDate) : null,
        });

        if (cancelled) return;

        const manual = response.manual_activity;
        const rows = Array.isArray(manual?.rundown) ? manual.rundown : [];
        setManualActivity(resolveTodayManualActivity(manual?.today_activity, rows));
        setManualSummary(normalizeManualActivity(manual?.summary));
        setManualRows(rows);
      } catch (error) {
        if (cancelled) return;

        setManualActivity(emptyManualActivity);
        setManualSummary(emptyManualActivity);
        setManualRows([]);
        setManualError(error instanceof Error ? error.message : 'Failed to load manual activity');
      } finally {
        if (!cancelled) setManualLoading(false);
      }
    };

    loadManualActivity();

    return () => {
      cancelled = true;
    };
  }, [currentAgentId, timeframe, startDate, endDate]);

  useEffect(() => {
    let cancelled = false;

    const loadSubmittedSaleActivity = async () => {
      if (!currentAgentId) {
        setSubmittedSaleSummary(emptySubmittedSaleSummary);
        setSubmittedSaleRows([]);
        return;
      }

      if (timeframe === 'custom' && (!startDate || !endDate)) {
        return;
      }

      setSubmittedSaleLoading(true);
      setSubmittedSaleError(null);

      try {
        const response = await myBusinessActivityApi.getSubmittedSaleActivity({
          agentId: currentAgentId,
          timeframe,
          startDate: timeframe === 'custom' && startDate ? toPolicyRequestDate(startDate) : null,
          endDate: timeframe === 'custom' && endDate ? toPolicyRequestDate(endDate) : null,
        });

        if (cancelled) return;

        if (response.submitted_sale?.connected === false) {
          setSubmittedSaleSummary(emptySubmittedSaleSummary);
          setSubmittedSaleRows([]);
          setSubmittedSaleError('Submitted Sale is not connected');
          return;
        }

        const rows = Array.isArray(response.submitted_sale?.rundown) ? response.submitted_sale.rundown : [];
        const summary = response.submitted_sale?.summary;
        const rundownDials = rows.reduce((sum, row) => sum + toManualActivityNumber(row.outboundLogDials), 0);
        const rundownContacts = rows.reduce((sum, row) => sum + toManualActivityNumber(row.outboundLogContacts), 0);
        const rundownSits = rows.reduce((sum, row) => sum + toManualActivityNumber(row.outboundLogSits), 0);
        const rundownSubmitted = rows.reduce((sum, row) => sum + toManualActivityNumber(row.outboundLogSales), 0);
        const rundownSubmittedAp = rows.reduce((sum, row) => sum + toManualActivityNumber(row.annual_premium), 0);

        setSubmittedSaleRows(rows);
        setSubmittedSaleSummary({
          dials: summary?.dials === null || summary?.dials === undefined ? rundownDials : toManualActivityNumber(summary.dials),
          contacts: summary?.contacts === null || summary?.contacts === undefined ? rundownContacts : toManualActivityNumber(summary.contacts),
          sits: summary?.sits === null || summary?.sits === undefined ? rundownSits : toManualActivityNumber(summary.sits),
          submitted: summary?.submitted === null || summary?.submitted === undefined ? rundownSubmitted : toManualActivityNumber(summary.submitted),
          submittedAp: summary?.submitted_ap === null || summary?.submitted_ap === undefined ? rundownSubmittedAp : toManualActivityNumber(summary.submitted_ap),
        });
      } catch (error) {
        if (cancelled) return;

        setSubmittedSaleSummary(emptySubmittedSaleSummary);
        setSubmittedSaleRows([]);
        setSubmittedSaleError(error instanceof Error ? error.message : 'Failed to load submitted sale activity');
      } finally {
        if (!cancelled) setSubmittedSaleLoading(false);
      }
    };

    loadSubmittedSaleActivity();

    return () => {
      cancelled = true;
    };
  }, [currentAgentId, timeframe, startDate, endDate]);

  useEffect(() => {
    let cancelled = false;

    const loadWavvActivity = async () => {
      if (!currentAgentId) {
        setWavvSummary(emptyWavvSummary);
        setWavvRows([]);
        return;
      }

      if (timeframe === 'custom' && (!startDate || !endDate)) {
        return;
      }

      setWavvLoading(true);
      setWavvError(null);

      try {
        const response = await myBusinessActivityApi.getWavvActivity({
          agentId: currentAgentId,
          timeframe,
          startDate: timeframe === 'custom' && startDate ? toPolicyRequestDate(startDate) : null,
          endDate: timeframe === 'custom' && endDate ? toPolicyRequestDate(endDate) : null,
        });

        if (cancelled) return;

        const rows = Array.isArray(response.wavv?.rundown) ? response.wavv.rundown : [];
        const summary = response.wavv?.summary;
        const rundownDials = rows.reduce((sum, row) => sum + toManualActivityNumber(row.calls), 0);
        const rundownConversations = rows.reduce((sum, row) => sum + toManualActivityNumber(row.conversations), 0);
        const rundownContacts = rows.reduce((sum, row) => sum + toManualActivityNumber(row.contactsCalled), 0);
        const rundownTalkTime = rows.reduce((sum, row) => sum + toManualActivityNumber(row.talktime), 0);

        setWavvRows(rows);
        setWavvSummary({
          dials: summary?.dials === null || summary?.dials === undefined ? rundownDials : toManualActivityNumber(summary.dials),
          conversations: rundownConversations,
          contacts: summary?.contacts === null || summary?.contacts === undefined ? rundownContacts : toManualActivityNumber(summary.contacts),
          talkTime: summary?.talk_time === null || summary?.talk_time === undefined ? rundownTalkTime : toManualActivityNumber(summary.talk_time),
          avgCallLength: toManualActivityNumber(summary?.avgCallLength),
        });
      } catch (error) {
        if (cancelled) return;

        setWavvSummary(emptyWavvSummary);
        setWavvRows([]);
        setWavvError(error instanceof Error ? error.message : 'Failed to load Wavv activity');
      } finally {
        if (!cancelled) setWavvLoading(false);
      }
    };

    loadWavvActivity();

    return () => {
      cancelled = true;
    };
  }, [currentAgentId, timeframe, startDate, endDate]);

  useEffect(() => {
    let cancelled = false;

    const loadPolicyTekActivity = async () => {
      if (!currentAgentId) {
        setPolicyTekSummary(emptyPolicyTekSummary);
        setPolicyTekRows([]);
        setPolicyTekCallRows([]);
        return;
      }

      if (timeframe === 'custom' && (!startDate || !endDate)) {
        return;
      }

      setPolicyTekLoading(true);
      setPolicyTekError(null);

      try {
        const response = await myBusinessActivityApi.getPolicyTekActivity({
          agentId: currentAgentId,
          timeframe,
          startDate: timeframe === 'custom' && startDate ? toPolicyRequestDate(startDate) : null,
          endDate: timeframe === 'custom' && endDate ? toPolicyRequestDate(endDate) : null,
        });

        if (cancelled) return;

        if (response.policytek?.connected === false) {
          setPolicyTekSummary(emptyPolicyTekSummary);
          setPolicyTekRows([]);
          setPolicyTekCallRows([]);
          setPolicyTekError('PolicyTek is not connected');
          return;
        }

        const rows = Array.isArray(response.policytek?.rundown?.lead_stat) ? response.policytek.rundown.lead_stat : [];
        const callRows = Array.isArray(response.policytek?.rundown?.call_rundown) ? response.policytek.rundown.call_rundown : [];
        const summary = response.policytek?.summary;
        const rundownCallsReceived = rows.reduce((sum, row) => sum + toManualActivityNumber(row.leadsAssigned), 0);
        const rundownValidCalls = rows.reduce((sum, row) => sum + toManualActivityNumber(row.validLeads), 0);
        const rundownSubmitted = rows.reduce((sum, row) => sum + toManualActivityNumber(row.applicationSubmitted), 0);
        const rundownSubmittedPremium = rows.reduce((sum, row) => sum + toManualActivityNumber(row.submittedPremium), 0);

        setPolicyTekRows(rows);
        setPolicyTekCallRows(callRows);
        setPolicyTekSummary({
          callsReceived: summary?.calls_received === null || summary?.calls_received === undefined ? rundownCallsReceived : toManualActivityNumber(summary.calls_received),
          validCalls: summary?.valid_calls === null || summary?.valid_calls === undefined ? rundownValidCalls : toManualActivityNumber(summary.valid_calls),
          submitted: summary?.submitted === null || summary?.submitted === undefined ? rundownSubmitted : toManualActivityNumber(summary.submitted),
          submittedPremium: summary?.submitted_premium === null || summary?.submitted_premium === undefined ? rundownSubmittedPremium : toManualActivityNumber(summary.submitted_premium),
          averageCall: toManualActivityNumber(summary?.averageMin_perCall),
        });
      } catch (error) {
        if (cancelled) return;

        setPolicyTekSummary(emptyPolicyTekSummary);
        setPolicyTekRows([]);
        setPolicyTekCallRows([]);
        setPolicyTekError(error instanceof Error ? error.message : 'Failed to load PolicyTek activity');
      } finally {
        if (!cancelled) setPolicyTekLoading(false);
      }
    };

    loadPolicyTekActivity();

    return () => {
      cancelled = true;
    };
  }, [currentAgentId, timeframe, startDate, endDate]);

  useEffect(() => {
    let cancelled = false;

    const loadCallXActivity = async () => {
      if (!currentAgentId) {
        setCallXSummary(emptyCallXSummary);
        setCallXRows([]);
        return;
      }

      if (timeframe === 'custom' && (!startDate || !endDate)) {
        return;
      }

      setCallXLoading(true);
      setCallXError(null);

      try {
        const response = await myBusinessActivityApi.getCallXActivity({
          agentId: currentAgentId,
          timeframe,
          startDate: timeframe === 'custom' && startDate ? toPolicyRequestDate(startDate) : null,
          endDate: timeframe === 'custom' && endDate ? toPolicyRequestDate(endDate) : null,
        });

        if (cancelled) return;

        if (response.callx?.connected === false) {
          setCallXSummary(emptyCallXSummary);
          setCallXRows([]);
          setCallXError('CallX is not connected');
          return;
        }

        const rows = Array.isArray(response.callx?.rundown) ? response.callx.rundown : [];
        const summary = response.callx?.summary;
        const rundownCallsReceived = rows.reduce((sum, row) => sum + toManualActivityNumber(row.total), 0);
        const rundownValidCalls = rows.reduce((sum, row) => sum + toManualActivityNumber(row.valid), 0);
        const rundownPaidCalls = rows.reduce((sum, row) => sum + toManualActivityNumber(row.paid), 0);
        const rundownSubmitted = rows.reduce((sum, row) => sum + toManualActivityNumber(row.submitted), 0);
        const rundownSubmittedPremium = rows.reduce((sum, row) => sum + toManualActivityNumber(row.totalSubmittedAP), 0);

        setCallXRows(rows);
        setCallXSummary({
          callsReceived: summary?.calls_received === null || summary?.calls_received === undefined ? rundownCallsReceived : toManualActivityNumber(summary.calls_received),
          validCalls: summary?.valid_calls === null || summary?.valid_calls === undefined ? rundownValidCalls : toManualActivityNumber(summary.valid_calls),
          paidCalls: rundownPaidCalls,
          submitted: summary?.submitted === null || summary?.submitted === undefined ? rundownSubmitted : toManualActivityNumber(summary.submitted),
          submittedPremium: summary?.submitted_premium === null || summary?.submitted_premium === undefined ? rundownSubmittedPremium : toManualActivityNumber(summary.submitted_premium),
        });
      } catch (error) {
        if (cancelled) return;

        setCallXSummary(emptyCallXSummary);
        setCallXRows([]);
        setCallXError(error instanceof Error ? error.message : 'Failed to load CallX activity');
      } finally {
        if (!cancelled) setCallXLoading(false);
      }
    };

    loadCallXActivity();

    return () => {
      cancelled = true;
    };
  }, [currentAgentId, timeframe, startDate, endDate]);

  const updateManualActivity = (key: ManualActivityKey, value: number) => {
    setManualSaveError(null);
    setManualSaveMessage(null);
    setManualActivity(current => ({ ...current, [key]: value }));
  };

  const refreshManualActivity = async () => {
    if (!currentAgentId) return;
    if (timeframe === 'custom' && (!startDate || !endDate)) return;

    const response = await myBusinessActivityApi.getManualActivity({
      agentId: currentAgentId,
      timeframe,
      startDate: timeframe === 'custom' && startDate ? toPolicyRequestDate(startDate) : null,
      endDate: timeframe === 'custom' && endDate ? toPolicyRequestDate(endDate) : null,
    });
    const manual = response.manual_activity;
    const rows = Array.isArray(manual?.rundown) ? manual.rundown : [];
    setManualActivity(resolveTodayManualActivity(manual?.today_activity, rows));
    setManualSummary(normalizeManualActivity(manual?.summary));
    setManualRows(rows);
  };

  const handleSaveManualActivity = async () => {
    if (!currentAgentId || manualSaving) return;

    setManualSaving(true);
    setManualSaveError(null);
    setManualSaveMessage(null);

    try {
      const response = await myBusinessActivityApi.saveManualActivity({
        agentId: currentAgentId,
        dials: manualActivity.dials,
        contacts: manualActivity.contacts,
        presentations: manualActivity.presentations,
        appointments: manualActivity.appointments,
        sold: manualActivity.sold,
      });

      if (response.manual_activity?.today_activity) {
        setManualActivity(normalizeManualActivity(response.manual_activity.today_activity));
      }

      await refreshManualActivity();
      setManualSaveMessage('Activity saved.');
    } catch (error) {
      setManualSaveError(error instanceof Error ? error.message : 'Failed to save activity');
    } finally {
      setManualSaving(false);
    }
  };

  const liveActivityPlatforms = activityPlatforms.map(platform => {
    if (platform.name === 'Submitted Sale') {
      return {
        ...platform,
        total: submittedSaleLoading ? '...' : formatActivityCount(submittedSaleSummary.dials),
        metrics: [
          ['Contacts', submittedSaleLoading ? '...' : formatActivityCount(submittedSaleSummary.contacts)],
          ['Sits', submittedSaleLoading ? '...' : formatActivityCount(submittedSaleSummary.sits)],
          ['Submitted', submittedSaleLoading ? '...' : formatActivityCount(submittedSaleSummary.submitted)],
          ['Submitted AP', submittedSaleLoading ? '...' : formatActivityCurrency(submittedSaleSummary.submittedAp)],
        ],
      };
    }

    if (platform.name === 'CallX') {
      return {
        ...platform,
        total: callXLoading ? '...' : formatActivityCount(callXSummary.callsReceived),
        metrics: [
          ['Valid calls', callXLoading ? '...' : formatActivityCount(callXSummary.validCalls)],
          ['Paid calls', callXLoading ? '...' : formatActivityCount(callXSummary.paidCalls)],
          ['Submitted', callXLoading ? '...' : formatActivityCount(callXSummary.submitted)],
          ['Submitted AP', callXLoading ? '...' : formatActivityCurrency(callXSummary.submittedPremium)],
        ],
      };
    }

    if (platform.name === 'PolicyTek') {
      return {
        ...platform,
        total: policyTekLoading ? '...' : formatActivityCount(policyTekSummary.callsReceived),
        metrics: [
          ['Valid calls', policyTekLoading ? '...' : formatActivityCount(policyTekSummary.validCalls)],
          ['Avg call', policyTekLoading ? '...' : formatActivityDuration(policyTekSummary.averageCall)],
          ['Submitted', policyTekLoading ? '...' : formatActivityCount(policyTekSummary.submitted)],
          ['Submitted AP', policyTekLoading ? '...' : formatActivityCurrency(policyTekSummary.submittedPremium)],
        ],
      };
    }

    if (platform.name !== 'Wavv') return platform;

    return {
      ...platform,
      total: wavvLoading ? '...' : formatActivityCount(wavvSummary.dials),
      metrics: [
        ['Conversations', wavvLoading ? '...' : formatActivityCount(wavvSummary.conversations)],
        ['Contacts called', wavvLoading ? '...' : formatActivityCount(wavvSummary.contacts)],
        ['Talk time', wavvLoading ? '...' : formatActivityDuration(wavvSummary.talkTime)],
        ['Avg call', wavvLoading ? '...' : formatActivityDuration(wavvSummary.avgCallLength)],
      ],
    };
  });
  const wavvRundownRows = wavvRows.map((row, index) => ({
    date: formatManualActivityDate(row.stat_date),
    calls: formatActivityCount(row.calls),
    conversations: formatActivityCount(row.conversations),
    contacts: formatActivityCount(row.contactsCalled),
    talkTime: formatActivityDuration(row.talktime),
    avgCall: formatActivityDuration(row.avgCallLength),
    id: row.id ?? `${row.stat_date ?? 'wavv'}-${index}`,
  }));
  const policyTekRundownRows = policyTekRows.map((row, index) => ({
    date: formatManualActivityDate(row.date),
    callsReceived: formatActivityCount(row.leadsAssigned),
    validCalls: formatActivityCount(row.validLeads),
    noSale: formatActivityCount(row.noSale),
    refund: formatActivityCount(row.refund),
    quoted: formatActivityCount(row.quoted),
    submitted: formatActivityCount(row.applicationSubmitted),
    submittedAp: formatActivityCurrency(row.submittedPremium),
    totalCost: formatActivityCurrency(row.totalCost),
    id: row.id ?? `${row.date ?? 'policytek'}-${index}`,
  }));
  const policyTekCallRundownRows = policyTekCallRows.map((row, index) => ({
    createdAt: formatActivityTimestamp(row.created_at),
    duration: row.duration === null || row.duration === undefined ? '-' : formatActivityDuration(row.duration),
    direction: row.direction || '-',
    leadSource: row.leadSource || '-',
    result: row.result || '-',
    callRecordId: row.callRecordId || '-',
    id: row.id ?? row.callRecordId ?? `policytek-call-${index}`,
  }));
  const policyTekLeadStatColumns = [
    { key: 'date', label: 'Date' },
    { key: 'callsReceived', label: 'Leads' },
    { key: 'validCalls', label: 'Valid' },
    { key: 'noSale', label: 'No Sale' },
    { key: 'refund', label: 'Refund' },
    { key: 'quoted', label: 'Quoted' },
    { key: 'submitted', label: 'Submitted' },
    { key: 'submittedAp', label: 'Submitted AP' },
    { key: 'totalCost', label: 'Cost' },
  ];
  const policyTekCallRundownColumns = [
    { key: 'createdAt', label: 'Created' },
    { key: 'duration', label: 'Duration' },
    { key: 'direction', label: 'Direction' },
    { key: 'leadSource', label: 'Lead Source' },
    { key: 'result', label: 'Result' },
    { key: 'callRecordId', label: 'Call Record' },
  ];
  const callXRundownRows = callXRows.map((row, index) => ({
    date: formatActivityTimestamp(row.stat_date),
    callsReceived: formatActivityCount(row.total),
    paidCalls: formatActivityCount(row.paid),
    validCalls: formatActivityCount(row.valid),
    refund: formatActivityCount(row.refund),
    submitted: formatActivityCount(row.submitted),
    quoted: formatActivityCount(row.quoted),
    submittedPercentage: formatActivityPercent(row.submittedPercentage),
    quotedPercentage: formatActivityPercent(row.quotedPercentage),
    closePercentage: formatActivityPercent(row.closePercentage),
    scpa: formatActivityCurrency(row.scpa),
    totalSpend: formatActivityCurrency(row.totalSpend),
    submittedAp: formatActivityCurrency(row.totalSubmittedAP),
    id: row.id ?? `${row.stat_date ?? 'callx'}-${index}`,
  }));
  const callXRundownColumns = [
    { key: 'date', label: 'Date' },
    { key: 'callsReceived', label: 'Calls' },
    { key: 'paidCalls', label: 'Paid' },
    { key: 'validCalls', label: 'Valid' },
    { key: 'refund', label: 'Refund' },
    { key: 'submitted', label: 'Submitted' },
    { key: 'quoted', label: 'Quoted' },
    { key: 'submittedPercentage', label: 'Submitted %' },
    { key: 'quotedPercentage', label: 'Quoted %' },
    { key: 'closePercentage', label: 'Close %' },
    { key: 'scpa', label: 'SCPA' },
    { key: 'totalSpend', label: 'Spend' },
    { key: 'submittedAp', label: 'Submitted AP' },
  ];
  const submittedSaleRundownRows = submittedSaleRows.map((row, index) => ({
    createdAt: formatActivityTimestamp(row.created_at),
    client: row.client || '-',
    policyNumber: row.policy_number || '-',
    dials: formatActivityCount(row.outboundLogDials),
    contacts: formatActivityCount(row.outboundLogContacts),
    sits: formatActivityCount(row.outboundLogSits),
    submitted: formatActivityCount(row.outboundLogSales),
    annualPremium: formatActivityCurrency(row.annual_premium),
    id: row.id ?? `${row.policy_number ?? row.client ?? 'sale'}-${index}`,
  }));
  const submittedSaleRundownColumns = [
    { key: 'createdAt', label: 'Created' },
    { key: 'client', label: 'Client' },
    { key: 'policyNumber', label: 'Policy #' },
    { key: 'dials', label: 'Dials' },
    { key: 'contacts', label: 'Contacts' },
    { key: 'sits', label: 'Sits' },
    { key: 'submitted', label: 'Submitted' },
    { key: 'annualPremium', label: 'Annual Premium' },
  ];
  const chartMode = timeframe === 'today' ? 'bar' : timeframe === 'yearly' ? 'line' : 'area';
  const activityChartData = useMemo(() => {
    if (timeframe === 'today') {
      return [
        { label: 'Manual', value: manualActivity.dials },
        { label: 'Wavv', value: wavvSummary.dials },
        { label: 'PolicyTek', value: policyTekSummary.callsReceived },
        { label: 'CallX', value: callXSummary.callsReceived },
        { label: 'Submitted', value: submittedSaleSummary.dials },
      ];
    }

    const buckets = new Map<string, {
      label: string;
      sort: number;
      manual: number;
      wavv: number;
      policytek: number;
      callx: number;
      submitted: number;
    }>();
    const ensureBucket = (dateKey: string) => {
      const bucket = getActivityBucket(dateKey, timeframe);
      const existing = buckets.get(bucket.key);
      if (existing) return existing;

      const next = {
        label: bucket.label,
        sort: bucket.sort,
        manual: 0,
        wavv: 0,
        policytek: 0,
        callx: 0,
        submitted: 0,
      };
      buckets.set(bucket.key, next);
      return next;
    };

    manualRows.forEach(row => {
      if (!row.created_date) return;
      ensureBucket(row.created_date).manual += toManualActivityNumber(row.dials);
    });
    wavvRows.forEach(row => {
      const dateKey = denverDateKeyFromTimestamp(row.stat_date);
      if (!dateKey) return;
      ensureBucket(dateKey).wavv += toManualActivityNumber(row.calls);
    });
    policyTekRows.forEach(row => {
      if (!row.date) return;
      ensureBucket(row.date).policytek += toManualActivityNumber(row.leadsAssigned);
    });
    callXRows.forEach(row => {
      const dateKey = denverDateKeyFromTimestamp(row.stat_date);
      if (!dateKey) return;
      ensureBucket(dateKey).callx += toManualActivityNumber(row.total);
    });
    submittedSaleRows.forEach(row => {
      const dateKey = denverDateKeyFromTimestamp(row.created_at);
      if (!dateKey) return;
      ensureBucket(dateKey).submitted += toManualActivityNumber(row.outboundLogDials);
    });

    return Array.from(buckets.values()).sort((a, b) => a.sort - b.sort);
  }, [
    callXRows,
    callXSummary.callsReceived,
    manualActivity.dials,
    manualRows,
    policyTekRows,
    policyTekSummary.callsReceived,
    submittedSaleRows,
    submittedSaleSummary.dials,
    timeframe,
    wavvRows,
    wavvSummary.dials,
  ]);
  const chartTotalSold = submittedSaleSummary.submitted || manualSummary.sold;
  const activePolicyTekRows = policyTekRundownTab === 'lead_stat' ? policyTekRundownRows : policyTekCallRundownRows;
  const activePolicyTekColumns = policyTekRundownTab === 'lead_stat' ? policyTekLeadStatColumns : policyTekCallRundownColumns;
  const activePolicyTekTitle = policyTekRundownTab === 'lead_stat' ? 'Lead Stat' : 'Call Rundown';
  const activePolicyTekEmptyMessage = policyTekRundownTab === 'lead_stat'
    ? 'No PolicyTek lead stats found for this range.'
    : 'No PolicyTek calls found for this range.';
  const selectedRundownColumns = selectedRundown ? platformRundownColumns[selectedRundown] : [];
  const selectedRundownRows = selectedRundown === 'Wavv'
    ? wavvRundownRows
    : selectedRundown === 'PolicyTek'
      ? policyTekRundownRows
    : selectedRundown === 'CallX'
      ? callXRundownRows
    : selectedRundown === 'Submitted Sale'
      ? submittedSaleRundownRows
    : selectedRundown
      ? platformRundownRows[selectedRundown]
      : [];
  const selectedRundownIsLoading = (selectedRundown === 'Wavv' && wavvLoading) || (selectedRundown === 'PolicyTek' && policyTekLoading) || (selectedRundown === 'CallX' && callXLoading) || (selectedRundown === 'Submitted Sale' && submittedSaleLoading);
  const selectedRundownError = selectedRundown === 'Wavv' ? wavvError : selectedRundown === 'PolicyTek' ? policyTekError : selectedRundown === 'CallX' ? callXError : selectedRundown === 'Submitted Sale' ? submittedSaleError : null;
  const selectedRundownIsPolicyTek = selectedRundown === 'PolicyTek';
  const selectedRundownIsCallX = selectedRundown === 'CallX';
  const selectedRundownIsSubmittedSale = selectedRundown === 'Submitted Sale';
  const renderRundownTable = (
    title: string,
    columns: Array<{ key: string; label: string }>,
    rows: Array<Record<string, unknown>>,
    emptyMessage: string
  ) => (
    <div className="overflow-hidden rounded-3xl border border-slate-100">
      <div className="border-b border-slate-100 bg-white px-5 py-4">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{title}</p>
      </div>
      <div className="max-h-[28rem] overflow-auto">
        <div className="min-w-[48rem]">
          <div
            className="sticky top-0 z-10 grid bg-slate-50 px-5 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400"
            style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}
          >
            {columns.map((column) => (
              <span key={column.key}>{column.label}</span>
            ))}
          </div>
          {rows.length > 0 ? (
            rows.map((row, index) => (
              <div
                key={`${title}-${row.id ?? index}`}
                className="grid items-center border-t border-slate-50 px-5 py-4 text-xs font-bold text-slate-600"
                style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}
              >
                {columns.map((column) => (
                  <span key={column.key} className={column.key === 'date' || column.key === 'createdAt' ? 'font-black text-slate-950' : 'truncate'}>
                    {String(row[column.key] ?? '-')}
                  </span>
                ))}
              </div>
            ))
          ) : (
            <div className="border-t border-slate-50 px-5 py-8 text-center text-xs font-black text-slate-400">
              {emptyMessage}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="business-activity-page space-y-5 animate-in fade-in duration-300">
      <WorkspaceToolbarPortal slotId={toolbarSlotId}>
        <PolicyDateRangeFilter
          timeframe={timeframe}
          startDate={startDate}
          endDate={endDate}
          onTimeframeChange={setTimeframe}
          onDateChange={(start, end) => {
            setStartDate(start);
            setEndDate(end);
          }}
          variant="inline"
        />
      </WorkspaceToolbarPortal>

      <section className="overflow-hidden rounded-[2rem] border border-white/80 bg-white shadow-sm">
        <div className="grid grid-cols-1 gap-0 xl:grid-cols-[1fr_1.2fr]">
          <div className="border-b border-slate-100 p-6 xl:border-b-0 xl:border-r">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Manual Entry</p>
                <h3 className="text-2xl font-black tracking-tight text-slate-950">Today&apos;s activity</h3>
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <ActivityMetricStepper label="Dials" value={manualActivity.dials} onChange={(value) => updateManualActivity('dials', value)} />
                <ActivityMetricStepper
                  label="Contacts"
                  value={manualActivity.contacts}
                  onChange={(value) => updateManualActivity('contacts', value)}
                  tooltip="Calls that ran for more than 1 minute."
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <ActivityMetricStepper label="Presentations" value={manualActivity.presentations} onChange={(value) => updateManualActivity('presentations', value)} />
                <ActivityMetricStepper label="Appointments" value={manualActivity.appointments} onChange={(value) => updateManualActivity('appointments', value)} />
                <ActivityMetricStepper label="Sold" value={manualActivity.sold} onChange={(value) => updateManualActivity('sold', value)} />
              </div>
            </div>

            <button
              type="button"
              onClick={handleSaveManualActivity}
              disabled={!currentAgentId || manualSaving}
              className="mt-5 w-full rounded-2xl bg-amber-400 px-5 py-4 text-sm font-black text-slate-950 shadow-lg shadow-amber-200 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"
            >
              {manualSaving ? 'Saving...' : 'Save Activity'}
            </button>
            {manualSaveError ? (
              <p className="mt-3 text-xs font-bold text-red-600">{manualSaveError}</p>
            ) : manualSaveMessage ? (
              <p className="mt-3 text-xs font-bold text-emerald-600">{manualSaveMessage}</p>
            ) : null}
          </div>

          <div className="p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Manual Log</p>
                <h3 className="text-2xl font-black tracking-tight text-slate-950">Manual activity by date</h3>
              </div>
              <span className={`rounded-full border px-3 py-1 text-xs font-black ${
                manualError
                  ? 'border-red-100 bg-red-50 text-red-600'
                  : manualLoading
                    ? 'border-amber-100 bg-amber-50 text-amber-700'
                    : 'border-emerald-100 bg-emerald-50 text-emerald-700'
              }`}>
                {manualError ? 'Unavailable' : manualLoading ? 'Loading' : 'Live data'}
              </span>
            </div>

            <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
              {[
                ['Dials', manualSummary.dials],
                ['Contacts', manualSummary.contacts],
                ['Presentations', manualSummary.presentations],
                ['Appointments', manualSummary.appointments],
                ['Sold', manualSummary.sold],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">{label}</p>
                  <p className="mt-2 text-xl font-black text-slate-950">{Number(value).toLocaleString()}</p>
                </div>
              ))}
            </div>

            <div className="overflow-hidden rounded-3xl border border-slate-100">
              <div className="grid grid-cols-[1.2fr_repeat(5,0.8fr)] bg-slate-50 px-5 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                <span>Date</span>
                <span>Dials</span>
                <span>Contacts</span>
                <span>Pres.</span>
                <span>Appts.</span>
                <span>Sold</span>
              </div>
              {manualLoading ? (
                <div className="border-t border-slate-50 px-5 py-8 text-center text-xs font-black text-slate-400">
                  Loading manual activity...
                </div>
              ) : manualError ? (
                <div className="border-t border-slate-50 px-5 py-8 text-center text-xs font-black text-red-500">
                  {manualError}
                </div>
              ) : manualRows.length > 0 ? (
                manualRows.map((row, index) => {
                  const normalized = normalizeManualActivity(row);

                  return (
                    <div key={`${row.id ?? row.created_date ?? index}`} className="grid grid-cols-[1.2fr_repeat(5,0.8fr)] items-center border-t border-slate-50 px-5 py-4 text-xs font-bold text-slate-600">
                      <span className="font-black text-slate-950">{formatManualActivityDate(row.created_date)}</span>
                      <span>{normalized.dials}</span>
                      <span>{normalized.contacts}</span>
                      <span>{normalized.presentations}</span>
                      <span>{normalized.appointments}</span>
                      <span>{normalized.sold}</span>
                    </div>
                  );
                })
              ) : (
                <div className="border-t border-slate-50 px-5 py-8 text-center text-xs font-black text-slate-400">
                  No manual activity found for this range.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-4">
        {liveActivityPlatforms.map((platform) => {
          const hasRundown = platform.name === 'Wavv' || platform.name === 'PolicyTek' || platform.name === 'CallX' || platform.name === 'Submitted Sale';
          const cardClass =
            platform.accent === 'slate' ? 'border-slate-900/10 bg-slate-950 text-white shadow-xl shadow-slate-300' :
            platform.accent === 'emerald' ? 'border-emerald-100 bg-gradient-to-br from-white via-white to-emerald-50/80' :
            platform.accent === 'amber' ? 'border-amber-100 bg-gradient-to-br from-white via-white to-amber-50/90' :
            'border-sky-100 bg-gradient-to-br from-white via-white to-sky-50/90';
          const titleClass = platform.accent === 'slate' ? 'text-slate-400' : 'text-slate-400';
          const totalClass = platform.accent === 'slate' ? 'text-white' : 'text-slate-950';
          const labelClass = platform.accent === 'slate' ? 'text-slate-400' : 'text-slate-400';
          const metricClass = platform.accent === 'slate'
            ? 'border-white/10 bg-white/5'
            : 'border-slate-100 bg-white/70';
          const metricLabelClass = platform.accent === 'slate' ? 'text-slate-400' : 'text-slate-400';
          const metricValueClass = platform.accent === 'slate' ? 'text-white' : 'text-slate-950';

          return (
            <section key={platform.name} className={`rounded-[2rem] border p-6 shadow-sm ${cardClass}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className={`text-[10px] font-black uppercase tracking-[0.22em] ${titleClass}`}>{platform.name}</p>
                  <h3 className={`mt-2 text-4xl font-black tracking-tight ${totalClass}`}>{platform.total}</h3>
                  <p className={`text-xs font-bold ${labelClass}`}>{platform.label}</p>
                  {((platform.name === 'Wavv' && wavvError) || (platform.name === 'PolicyTek' && policyTekError) || (platform.name === 'CallX' && callXError)) && (
                    <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-red-500">Unavailable</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {hasRundown && (
                    <button
                      type="button"
                      onClick={() => {
                        if (platform.name === 'PolicyTek') setPolicyTekRundownTab('lead_stat');
                        setSelectedRundown(platform.name as PlatformActivityName);
                      }}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/70 bg-white/80 text-slate-500 shadow-sm transition hover:border-amber-300 hover:bg-amber-50 hover:text-slate-950"
                      aria-label={`View ${platform.name} rundown`}
                      title={`View ${platform.name} rundown`}
                    >
                      <BarChart3 className="h-4 w-4" />
                    </button>
                  )}
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border shadow-sm ${
                    platform.accent === 'slate' ? 'border-amber-400/20 bg-amber-300 text-slate-950 shadow-amber-950/10' :
                    platform.accent === 'emerald' ? 'border-emerald-200 bg-emerald-100 text-emerald-700 shadow-emerald-200/60' :
                    platform.accent === 'amber' ? 'border-amber-200 bg-amber-100 text-amber-700 shadow-amber-200/60' :
                    'border-sky-200 bg-sky-100 text-sky-700 shadow-sky-200/60'
                  }`}>
                    {platform.accent === 'slate' ? <History className="h-5 w-5" /> : <PhoneCall className="h-5 w-5" />}
                  </div>
                </div>
              </div>
              <div className={`mt-6 grid gap-3 ${platform.metrics.length > 4 ? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2' : 'grid-cols-2'}`}>
                {platform.metrics.map(([label, value]) => (
                  <div key={`${platform.name}-${label}`} className={`rounded-2xl border p-4 ${metricClass}`}>
                    <p className={`text-[10px] font-black uppercase tracking-[0.14em] ${metricLabelClass}`}>{label}</p>
                    <p className={`mt-2 text-lg font-black ${metricValueClass}`}>{value}</p>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <section className="overflow-hidden rounded-[2rem] border border-slate-900 bg-slate-950 p-6 shadow-2xl shadow-slate-300">
        <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-300">Combined Activity</p>
            <h3 className="text-3xl font-black tracking-tight text-white">Activity momentum</h3>
            <p className="mt-1 text-sm font-semibold text-slate-400">Manual effort, Wavv, PolicyTek, CallX, and submitted sales in one view.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-right">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Submitted</p>
            <p className="text-2xl font-black text-white">{formatActivityCount(chartTotalSold)}</p>
          </div>
        </div>
        <div className="h-[360px] min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            {chartMode === 'today' ? (
              <BarChart data={activityChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.18)" vertical={false} />
                <XAxis dataKey="label" stroke="#94a3b8" tickLine={false} axisLine={false} tick={{ fontSize: 12, fontWeight: 800 }} />
                <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} tick={{ fontSize: 12, fontWeight: 800 }} />
                <RechartsTooltip
                  contentStyle={{ borderRadius: 18, border: '1px solid rgba(255,255,255,0.12)', background: '#020617', color: '#fff' }}
                  labelStyle={{ color: '#fbbf24', fontWeight: 900 }}
                />
                <Bar dataKey="value" name="Activity" fill="#f59e0b" radius={[10, 10, 0, 0]} />
              </BarChart>
            ) : chartMode === 'yearly' ? (
              <LineChart data={activityChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.18)" vertical={false} />
                <XAxis dataKey="label" stroke="#94a3b8" tickLine={false} axisLine={false} tick={{ fontSize: 12, fontWeight: 800 }} />
                <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} tick={{ fontSize: 12, fontWeight: 800 }} />
                <RechartsTooltip
                  contentStyle={{ borderRadius: 18, border: '1px solid rgba(255,255,255,0.12)', background: '#020617', color: '#fff' }}
                  labelStyle={{ color: '#fbbf24', fontWeight: 900 }}
                />
                <Legend wrapperStyle={{ fontSize: 12, fontWeight: 800, color: '#cbd5e1' }} />
                <Line type="monotone" dataKey="manual" name="Manual dials" stroke="#f59e0b" strokeWidth={3} dot={false} />
                <Line type="monotone" dataKey="wavv" name="Wavv calls" stroke="#10b981" strokeWidth={3} dot={false} />
                <Line type="monotone" dataKey="policytek" name="PolicyTek" stroke="#38bdf8" strokeWidth={3} dot={false} />
                <Line type="monotone" dataKey="callx" name="CallX" stroke="#a78bfa" strokeWidth={3} dot={false} />
                <Line type="monotone" dataKey="submitted" name="Submitted Sale" stroke="#facc15" strokeWidth={3} dot={false} />
              </LineChart>
            ) : (
              <AreaChart data={activityChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="manualActivityGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="wavvActivityGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="platformActivityGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.18)" vertical={false} />
                <XAxis dataKey="label" stroke="#94a3b8" tickLine={false} axisLine={false} tick={{ fontSize: 12, fontWeight: 800 }} />
                <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} tick={{ fontSize: 12, fontWeight: 800 }} />
                <RechartsTooltip
                  contentStyle={{ borderRadius: 18, border: '1px solid rgba(255,255,255,0.12)', background: '#020617', color: '#fff' }}
                  labelStyle={{ color: '#fbbf24', fontWeight: 900 }}
                />
                <Legend wrapperStyle={{ fontSize: 12, fontWeight: 800, color: '#cbd5e1' }} />
                <Area type="monotone" dataKey="manual" name="Manual dials" stroke="#f59e0b" strokeWidth={3} fill="url(#manualActivityGradient)" />
                <Area type="monotone" dataKey="wavv" name="Wavv calls" stroke="#10b981" strokeWidth={3} fill="url(#wavvActivityGradient)" />
                <Area type="monotone" dataKey="policytek" name="PolicyTek" stroke="#38bdf8" strokeWidth={3} fill="url(#platformActivityGradient)" />
                <Area type="monotone" dataKey="callx" name="CallX" stroke="#a78bfa" strokeWidth={3} fillOpacity={0.08} fill="#a78bfa" />
                <Area type="monotone" dataKey="submitted" name="Submitted Sale" stroke="#facc15" strokeWidth={3} fillOpacity={0.08} fill="#facc15" />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      </section>

      {selectedRundown && (
        <div className="fixed inset-0 z-[240] flex items-center justify-center bg-slate-950/45 p-6 backdrop-blur-sm">
          <div className="flex max-h-[calc(100vh-3rem)] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl shadow-slate-950/20">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-slate-950 px-6 py-5 text-white">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">{selectedRundown} Rundown</p>
                <h3 className="mt-1 text-2xl font-black tracking-tight">Daily source breakdown</h3>
                <p className="mt-1 text-sm font-semibold text-slate-400">
                  {selectedRundown === 'Wavv'
                    ? 'Date-level Wavv records for the selected range.'
                    : selectedRundown === 'PolicyTek'
                      ? 'Date-level PolicyTek lead records for the selected range.'
                    : selectedRundown === 'CallX'
                      ? 'Date-level CallX records for the selected range.'
                    : selectedRundown === 'Submitted Sale'
                      ? 'Submitted sale records for the selected range.'
                    : 'Mock date-level records showing how this platform total came together.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRundown(null)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white transition hover:bg-white/20"
                aria-label="Close rundown"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-6">
              {selectedRundownIsLoading ? (
                <div className="rounded-3xl border border-slate-100 px-5 py-8 text-center text-xs font-black text-slate-400">
                  Loading {selectedRundown} activity...
                </div>
              ) : selectedRundownError ? (
                <div className="rounded-3xl border border-red-100 bg-red-50 px-5 py-8 text-center text-xs font-black text-red-500">
                  {selectedRundownError}
                </div>
              ) : selectedRundownIsPolicyTek ? (
                <div className="space-y-5">
                  <div className="inline-flex rounded-2xl border border-slate-100 bg-slate-50 p-1.5">
                    {[
                      { key: 'lead_stat' as const, label: 'Lead Stat' },
                      { key: 'call_rundown' as const, label: 'Call Rundown' },
                    ].map((item) => {
                      const active = item.key === policyTekRundownTab;
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => setPolicyTekRundownTab(item.key)}
                          className={`rounded-xl px-4 py-2 text-xs font-black transition ${
                            active
                              ? 'bg-slate-950 text-white shadow-sm'
                              : 'text-slate-500 hover:bg-white hover:text-slate-950'
                          }`}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                  {renderRundownTable(
                    activePolicyTekTitle,
                    activePolicyTekColumns,
                    activePolicyTekRows,
                    activePolicyTekEmptyMessage
                  )}
                </div>
              ) : selectedRundownIsCallX ? (
                renderRundownTable(
                  'CallX Rundown',
                  callXRundownColumns,
                  callXRundownRows,
                  'No CallX activity found for this range.'
                )
              ) : selectedRundownIsSubmittedSale ? (
                renderRundownTable(
                  'Submitted Sale Rundown',
                  submittedSaleRundownColumns,
                  submittedSaleRundownRows,
                  'No submitted sales found for this range.'
                )
              ) : (
                <div className="overflow-hidden rounded-3xl border border-slate-100">
                  <div
                    className="grid bg-slate-50 px-5 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400"
                    style={{ gridTemplateColumns: `repeat(${selectedRundownColumns.length}, minmax(0, 1fr))` }}
                  >
                    {selectedRundownColumns.map((column) => (
                      <span key={column.key}>{column.label}</span>
                    ))}
                  </div>
                  {selectedRundownRows.length > 0 ? (
                    selectedRundownRows.map((row, index) => (
                      <div
                        key={`${selectedRundown}-${row.id ?? index}`}
                        className="grid items-center border-t border-slate-50 px-5 py-4 text-xs font-bold text-slate-600"
                        style={{ gridTemplateColumns: `repeat(${selectedRundownColumns.length}, minmax(0, 1fr))` }}
                      >
                        {selectedRundownColumns.map((column) => (
                          <span key={column.key} className={column.key === 'date' ? 'font-black text-slate-950' : ''}>
                            {row[column.key] ?? '-'}
                          </span>
                        ))}
                      </div>
                    ))
                  ) : (
                    <div className="border-t border-slate-50 px-5 py-8 text-center text-xs font-black text-slate-400">
                      No {selectedRundown} activity found for this range.
                    </div>
                  )}
                </div>
              )}

              <div className="mt-5 flex items-center justify-between gap-4 rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4">
                <p className="text-sm font-bold text-amber-900">
                  {selectedRundown === 'Wavv'
                    ? 'Wavv rows are loaded from the live activity log API for the selected range.'
                    : selectedRundown === 'PolicyTek'
                      ? 'PolicyTek rows are loaded from the live activity log API for the selected range.'
                    : selectedRundown === 'CallX'
                      ? 'CallX rows are loaded from the live activity log API for the selected range.'
                    : selectedRundown === 'Submitted Sale'
                      ? 'Submitted sale rows are loaded from the live activity log API for the selected range.'
                    : 'This is mock data for layout review. PolicyTek, CallX, and submitted sale logs can be connected as their APIs come online.'}
                </p>
                <button
                  type="button"
                  onClick={() => setSelectedRundown(null)}
                  className="shrink-0 rounded-2xl bg-slate-900 px-5 py-3 text-xs font-black uppercase tracking-[0.12em] text-white transition hover:bg-slate-800"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

type ExpenseTableView = 'rundown' | 'month';
type ExpenseType = 'personal' | 'assist';

interface ExpenseFormState {
  expenseDate: string;
  expense: string;
  cost: string;
  notes: string;
  type: 'personal' | 'assist';
  agentOnAssist: string;
  receipt: File | null;
}

const emptyExpenseForm = (): ExpenseFormState => ({
  expenseDate: toLocalActivityDate(),
  expense: '',
  cost: '',
  notes: '',
  type: 'personal',
  agentOnAssist: '',
  receipt: null,
});

const toExpenseNumber = (value: unknown) => {
  const next = Number(value);
  return Number.isFinite(next) ? next : 0;
};

const formatExpenseCurrency = (value: unknown) => currencyFormatter.format(toExpenseNumber(value));

const getExpenseReceiptDisplay = (receipt: unknown) => {
  if (!receipt) return null;

  if (typeof receipt === 'string') {
    return {
      label: 'View receipt',
      url: /^https?:\/\//i.test(receipt) ? receipt : null,
    };
  }

  if (typeof receipt === 'object') {
    const value = receipt as Record<string, unknown>;
    const rawUrl = [value.url, value.path, value.access].find(item => typeof item === 'string') as string | undefined;
    const rawLabel = [value.name, value.filename, value.original_name].find(item => typeof item === 'string') as string | undefined;
    return {
      label: rawLabel || 'View receipt',
      url: rawUrl && /^https?:\/\//i.test(rawUrl) ? rawUrl : null,
    };
  }

  return null;
};

const normalizeExpenseDate = (value?: string | null) => {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return toLocalActivityDate(date);
};

const formatExpenseMonth = (monthKey: string) => {
  const [year, month] = monthKey.split('-').map(Number);
  if (!year || !month) return monthKey;

  return new Date(year, month - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
};

const toExpenseMonthKey = (date: Date) => `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;

const addExpenseMonths = (start: Date, end: Date) => {
  const months: string[] = [];
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));

  while (cursor.getTime() <= last.getTime()) {
    months.push(toExpenseMonthKey(cursor));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return months;
};

const getExpenseDisplayMonths = (
  timeframe: PoliciesTimeframe,
  startDate: number | undefined,
  endDate: number | undefined,
  rows: MyBusinessExpenseRow[]
) => {
  const now = new Date();
  const currentUtcDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

  if (timeframe === 'yearly') {
    return Array.from({ length: 12 }, (_, month) => `${currentUtcDate.getUTCFullYear()}-${String(month + 1).padStart(2, '0')}`);
  }

  if (timeframe === 'custom' && startDate && endDate) {
    return addExpenseMonths(new Date(startDate), new Date(endDate));
  }

  if (timeframe === 'all') {
    const rowMonths = rows
      .map(row => normalizeExpenseDate(row.expense_date))
      .filter(Boolean)
      .map(dateKey => dateKey.slice(0, 7));

    if (rowMonths.length === 0) return [toExpenseMonthKey(currentUtcDate)];

    const sortedMonths = [...new Set(rowMonths)].sort();
    const [firstYear, firstMonth] = sortedMonths[0].split('-').map(Number);
    const [lastYear, lastMonth] = sortedMonths[sortedMonths.length - 1].split('-').map(Number);

    return addExpenseMonths(
      new Date(Date.UTC(firstYear, firstMonth - 1, 1)),
      new Date(Date.UTC(lastYear, lastMonth - 1, 1))
    );
  }

  return [toExpenseMonthKey(currentUtcDate)];
};

const parseExpenseDateKey = (dateKey: string) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  if (!year || !month || !day) return new Date();
  return new Date(year, month - 1, day);
};

const expenseDatePickerDays = (year: number, month: number) => {
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = firstDay.getDay();

  return [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
};

const ExpenseDatePicker = ({
  value,
  onChange,
  onSelect,
}: {
  value: string;
  onChange: (value: string) => void;
  onSelect?: () => void;
}) => {
  const selectedDate = parseExpenseDateKey(value || toLocalActivityDate());
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth());
  const selectedKey = normalizeExpenseDate(value);
  const todayKey = toLocalActivityDate();
  const days = expenseDatePickerDays(viewYear, viewMonth);
  const viewLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  useEffect(() => {
    const nextDate = parseExpenseDateKey(value || toLocalActivityDate());
    setViewYear(nextDate.getFullYear());
    setViewMonth(nextDate.getMonth());
  }, [value]);

  const moveMonth = (step: number) => {
    const nextDate = new Date(viewYear, viewMonth + step, 1);
    setViewYear(nextDate.getFullYear());
    setViewMonth(nextDate.getMonth());
  };

  const selectDay = (day: number) => {
    const dateKey = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onChange(dateKey);
    onSelect?.();
  };

  return (
    <div className="rounded-3xl border border-slate-100 bg-slate-50 p-3">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => moveMonth(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm transition hover:text-slate-950"
          title="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-black text-slate-950">{viewLabel}</span>
        </div>
        <button
          type="button"
          onClick={() => moveMonth(1)}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm transition hover:text-slate-950"
          title="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
          <span key={day} className="py-1">{day}</span>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {days.map((day, index) => {
          if (!day) return <span key={`blank-${index}`} className="h-9" />;

          const dateKey = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const selected = dateKey === selectedKey;
          const today = dateKey === todayKey;

          return (
            <button
              key={dateKey}
              type="button"
              onClick={() => selectDay(day)}
              className={`h-9 rounded-xl text-xs font-black transition ${
                selected
                  ? 'bg-slate-950 text-white shadow-lg shadow-slate-200'
                  : today
                    ? 'border border-amber-300 bg-amber-50 text-amber-800'
                    : 'bg-white text-slate-600 hover:bg-amber-100 hover:text-slate-950'
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const MyBusinessExpenseLog = ({
  selectedAgentId,
  selectedAgentLabel,
  toolbarSlotId,
}: {
  selectedAgentId: string;
  selectedAgentLabel: string;
  toolbarSlotId?: string;
}) => {
  const [timeframe, setTimeframe] = useState<PoliciesTimeframe>('weekly');
  const [startDate, setStartDate] = useState<number | undefined>();
  const [endDate, setEndDate] = useState<number | undefined>();
  const [rows, setRows] = useState<MyBusinessExpenseRow[]>([]);
  const [summary, setSummary] = useState({ totalCost: 0, expenseCount: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [view, setView] = useState<ExpenseTableView>('rundown');
  const [expenseType, setExpenseType] = useState<ExpenseType>('personal');
  const [formOpen, setFormOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<MyBusinessExpenseRow | null>(null);
  const [form, setForm] = useState<ExpenseFormState>(() => emptyExpenseForm());
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MyBusinessExpenseRow | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [collapsedMonths, setCollapsedMonths] = useState<Record<string, boolean>>({});
  const [assistAgents, setAssistAgents] = useState<UtilityAgent[]>([]);
  const [assistAgentsLoading, setAssistAgentsLoading] = useState(false);
  const [assistAgentsError, setAssistAgentsError] = useState<string | null>(null);
  const [assistAgentPickerOpen, setAssistAgentPickerOpen] = useState(false);
  const [assistAgentSearch, setAssistAgentSearch] = useState('');
  const [splitTarget, setSplitTarget] = useState<MyBusinessExpenseRow | null>(null);
  const [splitPolicies, setSplitPolicies] = useState<AssistPolicySplit[]>([]);
  const [splitLoading, setSplitLoading] = useState(false);
  const [splitError, setSplitError] = useState<string | null>(null);
  const [splitSearch, setSplitSearch] = useState('');
  const datePickerRef = useRef<HTMLDivElement>(null);
  const assistAgentPickerRef = useRef<HTMLDivElement>(null);
  const selectedAssistAgent = useMemo(
    () => assistAgents.find(agent => agent.id === form.agentOnAssist) || null,
    [assistAgents, form.agentOnAssist],
  );
  const filteredAssistAgents = useMemo(() => {
    const query = assistAgentSearch.trim().toLocaleLowerCase();
    const matches = query
      ? assistAgents.filter(agent => `${agent.first_name || ''} ${agent.last_name || ''}`.trim().toLocaleLowerCase().includes(query))
      : assistAgents;
    return matches.slice(0, 75);
  }, [assistAgentSearch, assistAgents]);
  const filteredSplitPolicies = useMemo(() => {
    const query = splitSearch.trim().toLocaleLowerCase();
    if (!query) return splitPolicies;

    return splitPolicies.filter(policy => (
      [
        policy.client,
        policy.policy_number,
        policy.ref_carrier_name,
        policy.carrier_product,
        policy.state,
        policy.ref_policyStatus_name,
      ]
        .filter(Boolean)
        .some(value => String(value).toLocaleLowerCase().includes(query))
    ));
  }, [splitPolicies, splitSearch]);
  const splitTotals = useMemo(() => splitPolicies.reduce((totals, policy) => {
    const annualPremium = toExpenseNumber(policy.annual_premium);
    const splitPercent = toExpenseNumber(policy.split?.agent_on_split_percent);
    totals.annualPremium += annualPremium;
    totals.splitPremium += annualPremium * (splitPercent / 100);
    return totals;
  }, { annualPremium: 0, splitPremium: 0 }), [splitPolicies]);

  useEffect(() => {
    if (!formOpen || form.type !== 'assist' || assistAgents.length > 0) return;

    let cancelled = false;
    setAssistAgentsLoading(true);
    setAssistAgentsError(null);

    myBusinessExpenseApi.getUtilityAgents()
      .then(agents => {
        if (cancelled) return;
        const sortedAgents = [...agents].sort((a, b) => {
          const aName = `${a.first_name || ''} ${a.last_name || ''}`.trim();
          const bName = `${b.first_name || ''} ${b.last_name || ''}`.trim();
          return aName.localeCompare(bName);
        });
        setAssistAgents(sortedAgents);
      })
      .catch(err => {
        if (!cancelled) setAssistAgentsError(err instanceof Error ? err.message : 'Unable to load agents.');
      })
      .finally(() => {
        if (!cancelled) setAssistAgentsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [assistAgents.length, form.type, formOpen]);

  useEffect(() => {
    if (!datePickerOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setDatePickerOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [datePickerOpen]);

  useEffect(() => {
    if (!assistAgentPickerOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (assistAgentPickerRef.current && !assistAgentPickerRef.current.contains(event.target as Node)) {
        setAssistAgentPickerOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [assistAgentPickerOpen]);

  const loadExpenses = useCallback(async () => {
    if (!selectedAgentId) return;

    setLoading(true);
    setError(null);

    try {
      const requestTimeframe = timeframe === 'all' ? null : timeframe;
      const response = await myBusinessExpenseApi.getExpenses({
        agentId: selectedAgentId,
        type: expenseType,
        timeframe: requestTimeframe,
        startDate: timeframe === 'custom' && startDate ? toPolicyRequestDate(startDate) : null,
        endDate: timeframe === 'custom' && endDate ? toPolicyRequestDate(endDate) : null,
      });

      const expenseLog = response.expense_log;
      const nextRows = expenseLog?.rundown || [];
      const nextTotalCost = toExpenseNumber(expenseLog?.summary?.total_cost);
      const nextExpenseCount = toExpenseNumber(expenseLog?.summary?.expense_count);
      const fallbackTotalCost = nextRows.reduce((sum, row) => sum + toExpenseNumber(row.cost), 0);

      setRows(nextRows);
      setSummary({
        totalCost: nextTotalCost || fallbackTotalCost,
        expenseCount: nextExpenseCount || nextRows.length,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load expenses.');
    } finally {
      setLoading(false);
    }
  }, [endDate, expenseType, selectedAgentId, startDate, timeframe]);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  const sortedRows = useMemo(() => (
    [...rows].sort((a, b) => normalizeExpenseDate(b.expense_date).localeCompare(normalizeExpenseDate(a.expense_date)))
  ), [rows]);

  const monthlyGroups = useMemo(() => {
    const groups = new Map<string, { key: string; total: number; count: number; rows: MyBusinessExpenseRow[] }>();
    const displayMonths = getExpenseDisplayMonths(timeframe, startDate, endDate, sortedRows);

    displayMonths.forEach(monthKey => {
      groups.set(monthKey, { key: monthKey, total: 0, count: 0, rows: [] });
    });

    sortedRows.forEach(row => {
      const dateKey = normalizeExpenseDate(row.expense_date) || 'Undated';
      const monthKey = dateKey === 'Undated' ? 'Undated' : dateKey.slice(0, 7);
      const group = groups.get(monthKey) || { key: monthKey, total: 0, count: 0, rows: [] };

      group.total += toExpenseNumber(row.cost);
      group.count += 1;
      group.rows.push(row);
      groups.set(monthKey, group);
    });

    return Array.from(groups.values()).sort((a, b) => b.key.localeCompare(a.key));
  }, [endDate, sortedRows, startDate, timeframe]);

  const averageCost = summary.expenseCount > 0 ? summary.totalCost / summary.expenseCount : 0;

  useEffect(() => {
    setCollapsedMonths(current => {
      const next: Record<string, boolean> = {};
      monthlyGroups.forEach(group => {
        next[group.key] = current[group.key] ?? group.count === 0;
      });
      return next;
    });
  }, [monthlyGroups]);

  const toggleMonth = (monthKey: string) => {
    setCollapsedMonths(current => ({
      ...current,
      [monthKey]: !current[monthKey],
    }));
  };

  const openCreateForm = () => {
    setEditingRow(null);
    setForm(emptyExpenseForm());
    setFormError(null);
    setMessage(null);
    setDatePickerOpen(false);
    setAssistAgentPickerOpen(false);
    setAssistAgentSearch('');
    setFormOpen(true);
  };

  const openEditForm = (row: MyBusinessExpenseRow) => {
    setEditingRow(row);
    setForm({
      expenseDate: normalizeExpenseDate(row.expense_date) || toLocalActivityDate(),
      expense: String(row.expense || ''),
      cost: row.cost === null || row.cost === undefined ? '' : String(row.cost),
      notes: String(row.notes || ''),
      type: row.type === 'assist' ? 'assist' : row.type === 'personal' ? 'personal' : expenseType,
      agentOnAssist: String(row.agent_on_assist || ''),
      receipt: null,
    });
    setFormError(null);
    setMessage(null);
    setDatePickerOpen(false);
    setAssistAgentPickerOpen(false);
    setAssistAgentSearch('');
    setFormOpen(true);
  };

  const closeForm = () => {
    if (saving) return;
    setFormOpen(false);
    setEditingRow(null);
    setForm(emptyExpenseForm());
    setFormError(null);
    setDatePickerOpen(false);
    setAssistAgentPickerOpen(false);
    setAssistAgentSearch('');
  };

  const handleSaveExpense = async () => {
    if (!selectedAgentId) return;

    const expenseDate = form.expenseDate.trim();
    const expense = form.expense.trim();
    const cost = Number(form.cost);

    if (!expenseDate) {
      setFormError('Date is required.');
      return;
    }

    if (!expense) {
      setFormError('Expense is required.');
      return;
    }

    if (form.cost.trim() === '' || !Number.isFinite(cost) || cost < 0) {
      setFormError('Cost must be zero or greater.');
      return;
    }

    if (form.type === 'assist' && !form.agentOnAssist) {
      setFormError('Select the agent receiving the assist.');
      return;
    }

    setSaving(true);
    setFormError(null);
    setMessage(null);

    try {
      const input = {
        agentId: selectedAgentId,
        expenseDate,
        expense,
        cost,
        notes: form.notes.trim(),
        type: form.type,
        agentOnAssist: form.type === 'assist' ? form.agentOnAssist : null,
        receipt: form.receipt,
      };

      if (editingRow?.id !== undefined && editingRow.id !== null) {
        await myBusinessExpenseApi.updateExpense({ ...input, id: editingRow.id });
        setMessage('Expense updated.');
      } else {
        await myBusinessExpenseApi.createExpense(input);
        setMessage('Expense added.');
      }

      setFormOpen(false);
      setEditingRow(null);
      setForm(emptyExpenseForm());
      if (form.type === expenseType) {
        await loadExpenses();
      } else {
        setExpenseType(form.type);
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to save expense.');
    } finally {
      setSaving(false);
    }
  };

  const openDeleteConfirm = (row: MyBusinessExpenseRow) => {
    if (row.id === undefined || row.id === null) return;
    setDeleteTarget(row);
    setMessage(null);
    setError(null);
  };

  const closeDeleteConfirm = () => {
    if (deletingId !== null) return;
    setDeleteTarget(null);
  };

  const confirmDeleteExpense = async () => {
    if (deleteTarget?.id === undefined || deleteTarget.id === null) return;

    setDeletingId(deleteTarget.id);
    setMessage(null);
    setError(null);

    try {
      await myBusinessExpenseApi.deleteExpense(deleteTarget.id);
      setMessage('Expense deleted.');
      setDeleteTarget(null);
      await loadExpenses();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete expense.');
    } finally {
      setDeletingId(null);
    }
  };

  const openAssistSplits = async (row: MyBusinessExpenseRow) => {
    const agentOnAssist = String(row.agent_on_assist || '').trim();
    const expenseDate = normalizeExpenseDate(row.expense_date);

    setSplitTarget(row);
    setSplitPolicies([]);
    setSplitSearch('');
    setSplitError(null);

    if (!selectedAgentId || !agentOnAssist || !expenseDate) {
      setSplitError('This expense is missing the agent or expense date required to load policy splits.');
      return;
    }

    setSplitLoading(true);
    try {
      const policies = await myBusinessExpenseApi.getAssistSplits({
        agentId: selectedAgentId,
        agentOnAssist,
        expenseDate,
      });
      setSplitPolicies(policies);
    } catch (err) {
      setSplitError(err instanceof Error ? err.message : 'Unable to load policy splits.');
    } finally {
      setSplitLoading(false);
    }
  };

  const closeAssistSplits = () => {
    setSplitTarget(null);
    setSplitPolicies([]);
    setSplitSearch('');
    setSplitError(null);
  };

  const renderExpenseRows = (items: MyBusinessExpenseRow[], keyPrefix: string) => (
    items.length > 0 ? (
      items.map((row, index) => {
        const isDeleting = deletingId !== null && row.id === deletingId;
        const rowType = row.type === 'assist' ? 'assist' : row.type === 'personal' ? 'personal' : expenseType;
        const receipt = getExpenseReceiptDisplay(row.receipt);

        return (
          <div
            key={`${keyPrefix}-${row.id ?? index}`}
            className="grid min-w-[82rem] grid-cols-[0.9fr_1.25fr_1.2fr_0.8fr_0.9fr_1.3fr_1fr] items-center gap-3 border-t border-slate-50 px-5 py-4 text-xs font-bold text-slate-600"
          >
            <span className="font-black text-slate-950">{formatManualActivityDate(normalizeExpenseDate(row.expense_date))}</span>
            <span className="min-w-0 truncate font-black text-slate-700" title={rowType === 'assist' ? row.agent_on_assist_name || row.agent_on_assist || '' : ''}>
              {rowType === 'assist' ? row.agent_on_assist_name || row.agent_on_assist || 'Agent unavailable' : '—'}
            </span>
            <span className="truncate text-slate-800">{row.expense || '-'}</span>
            <span className="font-black text-slate-950">{formatExpenseCurrency(row.cost)}</span>
            <span>
              {receipt ? (
                receipt.url ? (
                  <a href={receipt.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[10px] font-black text-amber-700 transition hover:bg-amber-100" title={receipt.label}>
                    <FileImage className="h-3.5 w-3.5" /> Receipt
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-slate-500" title={receipt.label}><FileImage className="h-3.5 w-3.5" /> Attached</span>
                )
              ) : <span className="text-slate-300">—</span>}
            </span>
            <span className="truncate">{row.notes || '-'}</span>
            <span className="flex justify-end gap-2">
              {rowType === 'assist' ? (
                <button
                  type="button"
                  onClick={() => openAssistSplits(row)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-violet-100 bg-violet-50 text-violet-600 transition hover:border-violet-300 hover:bg-violet-100 hover:text-violet-800"
                  title="View agent splits"
                >
                  <Split className="h-4 w-4" />
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => openEditForm(row)}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-100 bg-white text-slate-500 transition hover:border-amber-200 hover:text-amber-700"
                title="Edit expense"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => openDeleteConfirm(row)}
                disabled={isDeleting}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-100 bg-white text-slate-500 transition hover:border-red-200 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                title="Delete expense"
              >
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </button>
            </span>
          </div>
        );
      })
    ) : (
      <div className="border-t border-slate-50 px-5 py-10 text-center text-xs font-black text-slate-400">
        No expenses found for this range.
      </div>
    )
  );

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <WorkspaceToolbarPortal
        slotId={toolbarSlotId}
        fallbackClassName="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-start"
      >
        <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-start">
        <PolicyDateRangeFilter
          timeframe={timeframe}
          startDate={startDate}
          endDate={endDate}
          onTimeframeChange={setTimeframe}
          onDateChange={(start, end) => {
            setStartDate(start);
            setEndDate(end);
          }}
          label="Expense Date Range"
          description="Controls expenses loaded from the API"
          variant="inline"
        />

        <button
          type="button"
          onClick={openCreateForm}
          disabled={!selectedAgentId}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-400 px-5 py-3 text-sm font-black text-slate-950 shadow-lg shadow-amber-200 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none sm:ml-auto"
        >
          <Plus className="h-4 w-4" />
          Add Expense
        </button>
        </div>
      </WorkspaceToolbarPortal>

      <section className="overflow-hidden rounded-[2rem] border border-white/80 bg-white shadow-sm">
        <div className="flex flex-col gap-5 border-b border-slate-100 p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-amber-300 shadow-lg shadow-slate-200">
              <ReceiptText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Expense Log</p>
              <h2 className="text-2xl font-black tracking-tight text-slate-950">Expense management</h2>
              <p className="text-sm font-semibold text-slate-500">Track expenses for {selectedAgentLabel}.</p>
            </div>
          </div>

          <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black ${
            error
              ? 'border-red-100 bg-red-50 text-red-600'
              : loading
                ? 'border-amber-100 bg-amber-50 text-amber-700'
                : 'border-emerald-100 bg-emerald-50 text-emerald-700'
          }`}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {error ? 'Unavailable' : loading ? 'Loading' : 'Live data'}
          </span>
        </div>

        <div className="p-6">
          {error ? (
            <div className="mb-5 flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          ) : message ? (
            <div className="mb-5 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
              {message}
            </div>
          ) : null}

          <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="grid grid-cols-2 gap-2" role="group" aria-label="Expense table type">
              {(['personal', 'assist'] as const).map(type => (
                <button
                  key={type}
                  type="button"
                  aria-pressed={expenseType === type}
                  onClick={() => {
                    setExpenseType(type);
                    setRows([]);
                    setSummary({ totalCost: 0, expenseCount: 0 });
                    setMessage(null);
                  }}
                  className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-xs font-black capitalize transition-all ${expenseType === type ? type === 'assist' ? 'bg-violet-600 text-white shadow-lg shadow-violet-200' : 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' : 'bg-white text-slate-500 hover:text-slate-950'}`}
                >
                  {type === 'assist' ? <Users className="h-4 w-4" /> : <ReceiptText className="h-4 w-4" />}
                  {type}
                </button>
              ))}
            </div>
            <p className="px-3 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Showing {expenseType} expenses</p>
          </div>

          <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-3">
            {[
              ['Total Cost', formatExpenseCurrency(summary.totalCost)],
              ['Expense Count', Math.round(summary.expenseCount).toLocaleString()],
              ['Average Cost', formatExpenseCurrency(averageCost)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
                <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
              </div>
            ))}
          </div>

          <div className="mb-5 flex flex-wrap gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-1.5">
            {[
              { key: 'rundown' as const, label: 'Rundown' },
              { key: 'month' as const, label: 'By Month' },
            ].map(item => {
              const active = view === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setView(item.key)}
                  className={`rounded-xl px-4 py-2.5 text-xs font-black transition-all ${
                    active ? 'bg-slate-950 text-white shadow-lg shadow-slate-200' : 'text-slate-500 hover:bg-white hover:text-slate-950'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          {view === 'rundown' ? (
            <div className="overflow-hidden rounded-3xl border border-slate-100">
              <div className="overflow-auto">
                <div className="grid min-w-[82rem] grid-cols-[0.9fr_1.25fr_1.2fr_0.8fr_0.9fr_1.3fr_1fr] gap-3 bg-slate-50 px-5 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                  <span>Date</span>
                  <span>Assisted Agent</span>
                  <span>Expense</span>
                  <span>Cost</span>
                  <span>Receipt</span>
                  <span>Notes</span>
                  <span className="text-right">Actions</span>
                </div>
                {loading && sortedRows.length === 0 ? (
                  <div className="border-t border-slate-50 px-5 py-10 text-center text-xs font-black text-slate-400">
                    Loading expenses...
                  </div>
                ) : renderExpenseRows(sortedRows, 'expense')}
              </div>
            </div>
          ) : monthlyGroups.length > 0 ? (
            <div className="space-y-4">
              {monthlyGroups.map(group => {
                const collapsed = collapsedMonths[group.key] ?? group.count === 0;

                return (
                  <div key={group.key} className="overflow-hidden rounded-3xl border border-slate-100">
                    <button
                      type="button"
                      onClick={() => toggleMonth(group.key)}
                      className="flex w-full flex-col gap-2 border-b border-slate-100 bg-slate-50 px-5 py-4 text-left transition hover:bg-slate-100/70 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm">
                          <ChevronDown className={`h-4 w-4 transition-transform ${collapsed ? '-rotate-90' : ''}`} />
                        </span>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Month</p>
                          <h3 className="text-lg font-black text-slate-950">{group.key === 'Undated' ? 'Undated' : formatExpenseMonth(group.key)}</h3>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-slate-600">{group.count} expenses</span>
                        <span className="rounded-full bg-slate-950 px-3 py-1.5 text-xs font-black text-white">{formatExpenseCurrency(group.total)}</span>
                      </div>
                    </button>
                    {!collapsed ? (
                      <div className="overflow-auto">
                        <div className="grid min-w-[82rem] grid-cols-[0.9fr_1.25fr_1.2fr_0.8fr_0.9fr_1.3fr_1fr] gap-3 bg-white px-5 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                          <span>Date</span>
                          <span>Assisted Agent</span>
                          <span>Expense</span>
                          <span>Cost</span>
                          <span>Receipt</span>
                          <span>Notes</span>
                          <span className="text-right">Actions</span>
                        </div>
                        {renderExpenseRows(group.rows, `month-${group.key}`)}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-3xl border border-slate-100 px-5 py-10 text-center text-xs font-black text-slate-400">
              No monthly expense groups found for this range.
            </div>
          )}
        </div>
      </section>

      {formOpen ? (
        <div className="fixed inset-0 z-[240] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-[2rem] bg-white shadow-2xl shadow-slate-950/20">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-slate-950 px-6 py-5 text-white">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">Expense</p>
                <h3 className="text-2xl font-black tracking-tight">{editingRow ? 'Edit expense' : 'Add expense'}</h3>
              </div>
              <button
                type="button"
                onClick={closeForm}
                className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white transition hover:bg-white/20"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 p-6">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-2">
                <p className="px-2 pb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Expense type</p>
                <div className="grid grid-cols-2 gap-2" role="group" aria-label="Expense type">
                  {(['personal', 'assist'] as const).map(type => (
                    <button
                      key={type}
                      type="button"
                      aria-pressed={form.type === type}
                      onClick={() => {
                        setForm(current => ({
                          ...current,
                          type,
                          agentOnAssist: type === 'personal' ? '' : current.agentOnAssist,
                        }));
                        setAssistAgentPickerOpen(false);
                        setAssistAgentSearch('');
                        setFormError(null);
                      }}
                      className={`h-11 rounded-xl text-xs font-black capitalize transition-all ${form.type === type ? 'bg-slate-950 text-white shadow-lg shadow-slate-300' : 'bg-white text-slate-500 hover:text-slate-950'}`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {form.type === 'assist' ? (
                <div className="block space-y-2" ref={assistAgentPickerRef}>
                  <span id="assist-agent-label" className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Agent receiving assist</span>
                  <div className="relative">
                    <button
                      type="button"
                      aria-labelledby="assist-agent-label"
                      aria-haspopup="listbox"
                      aria-expanded={assistAgentPickerOpen}
                      disabled={assistAgentsLoading}
                      onClick={() => setAssistAgentPickerOpen(open => !open)}
                      className="flex h-12 w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 text-left text-sm font-bold text-slate-900 outline-none transition hover:border-amber-300 focus:border-amber-300 disabled:cursor-wait disabled:bg-slate-50 disabled:text-slate-400"
                    >
                      <span className="inline-flex min-w-0 items-center gap-2">
                        <Users className="h-4 w-4 shrink-0 text-amber-500" />
                        <span className={`truncate ${selectedAssistAgent ? 'text-slate-950' : 'text-slate-400'}`}>
                          {assistAgentsLoading
                            ? 'Loading agents...'
                            : selectedAssistAgent
                              ? `${selectedAssistAgent.first_name || ''} ${selectedAssistAgent.last_name || ''}`.trim()
                              : 'Search and select an agent'}
                        </span>
                      </span>
                      {assistAgentsLoading ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-amber-500" /> : <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${assistAgentPickerOpen ? 'rotate-180' : ''}`} />}
                    </button>

                    {assistAgentPickerOpen ? (
                      <div className="absolute left-0 right-0 top-full z-[270] mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-300/70">
                        <div className="border-b border-slate-100 p-3">
                          <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                            <input
                              autoFocus
                              type="search"
                              value={assistAgentSearch}
                              onChange={event => setAssistAgentSearch(event.target.value)}
                              placeholder="Search agents by name..."
                              className="h-10 w-full rounded-xl bg-slate-50 pl-10 pr-3 text-sm font-bold text-slate-900 outline-none ring-1 ring-slate-100 transition focus:ring-amber-300"
                            />
                          </div>
                        </div>
                        <div className="max-h-56 overflow-y-auto p-2" role="listbox" aria-labelledby="assist-agent-label">
                          {filteredAssistAgents.length > 0 ? filteredAssistAgents.map(agent => {
                            const label = `${agent.first_name || ''} ${agent.last_name || ''}`.trim() || agent.id;
                            const selected = agent.id === form.agentOnAssist;
                            return (
                              <button
                                key={agent.id}
                                type="button"
                                role="option"
                                aria-selected={selected}
                                onClick={() => {
                                  setForm(current => ({ ...current, agentOnAssist: agent.id }));
                                  setAssistAgentPickerOpen(false);
                                  setAssistAgentSearch('');
                                  setFormError(null);
                                }}
                                className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-bold transition ${selected ? 'bg-slate-950 text-white' : 'text-slate-700 hover:bg-amber-50 hover:text-slate-950'}`}
                              >
                                <span className="truncate">{label}</span>
                                {selected ? <Check className="h-4 w-4 shrink-0" /> : null}
                              </button>
                            );
                          }) : (
                            <p className="px-3 py-8 text-center text-xs font-bold text-slate-400">No agents match your search.</p>
                          )}
                        </div>
                        {!assistAgentSearch && assistAgents.length > filteredAssistAgents.length ? (
                          <p className="border-t border-slate-100 px-4 py-2 text-[10px] font-bold text-slate-400">Showing the first 75 agents. Search to find anyone else.</p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  {assistAgentsError ? <span className="block text-xs font-bold text-red-600">Unable to load agents: {assistAgentsError}</span> : null}
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="relative space-y-2" ref={datePickerRef}>
                  <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Date</span>
                  <button
                    type="button"
                    onClick={() => setDatePickerOpen(open => !open)}
                    className="flex h-12 w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 text-left text-sm font-black text-slate-950 outline-none transition hover:border-amber-300 focus:border-amber-300"
                  >
                    <span className="inline-flex min-w-0 items-center gap-2">
                      <Calendar className="h-4 w-4 shrink-0 text-amber-500" />
                      <span className="truncate">{formatManualActivityDate(form.expenseDate)}</span>
                    </span>
                    <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${datePickerOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {datePickerOpen ? (
                    <div className="absolute left-0 top-full z-[260] mt-2 w-[19rem] rounded-[1.5rem] border border-slate-100 bg-white p-2 shadow-2xl shadow-slate-300/60">
                      <ExpenseDatePicker
                        value={form.expenseDate}
                        onChange={value => setForm(current => ({ ...current, expenseDate: value }))}
                        onSelect={() => setDatePickerOpen(false)}
                      />
                    </div>
                  ) : null}
                </div>

                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Cost</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.cost}
                    onChange={event => setForm(current => ({ ...current, cost: event.target.value }))}
                    className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm font-bold text-slate-900 outline-none transition focus:border-amber-300"
                    placeholder="0.00"
                  />
                </label>
              </div>

              <label className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Expense</span>
                <input
                  type="text"
                  value={form.expense}
                  onChange={event => setForm(current => ({ ...current, expense: event.target.value }))}
                  className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm font-bold text-slate-900 outline-none transition focus:border-amber-300"
                  placeholder="Lead source, software, travel, supplies"
                />
              </label>

              <label className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Notes</span>
                <textarea
                  value={form.notes}
                  onChange={event => setForm(current => ({ ...current, notes: event.target.value }))}
                  className="min-h-28 w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-900 outline-none transition focus:border-amber-300"
                  placeholder="Optional notes"
                />
              </label>

              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Receipt <span className="normal-case tracking-normal text-slate-300">(optional image)</span></span>
                {form.receipt ? (
                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white"><FileImage className="h-5 w-5" /></span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-slate-950">{form.receipt.name}</p>
                        <p className="text-[10px] font-bold text-emerald-700">{(form.receipt.size / 1024).toFixed(1)} KB ready to upload</p>
                      </div>
                    </div>
                    <button type="button" onClick={() => setForm(current => ({ ...current, receipt: null }))} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-slate-400 shadow-sm transition hover:text-red-500" title="Remove receipt">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex cursor-pointer items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm font-black text-slate-500 transition hover:border-amber-300 hover:bg-amber-50 hover:text-slate-950">
                    <Upload className="h-5 w-5 text-amber-500" />
                    Upload receipt image
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={event => {
                        const file = event.target.files?.[0] || null;
                        setForm(current => ({ ...current, receipt: file }));
                        event.target.value = '';
                      }}
                    />
                  </label>
                )}
              </div>

              {formError ? (
                <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                  {formError}
                </div>
              ) : null}

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeForm}
                  className="rounded-2xl border border-slate-100 bg-white px-5 py-3 text-sm font-black text-slate-600 transition hover:border-slate-200 hover:text-slate-950"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveExpense}
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-400 px-5 py-3 text-sm font-black text-slate-950 shadow-lg shadow-amber-200 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {saving ? 'Saving...' : 'Save Expense'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {splitTarget ? (
        <div className="fixed inset-0 z-[255] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-7xl flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-white shadow-2xl shadow-slate-950/40">
            <div className="relative overflow-hidden bg-gradient-to-r from-slate-950 via-violet-950 to-indigo-950 px-6 py-6 text-white">
              <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-violet-500/20 blur-3xl" />
              <div className="relative flex items-start justify-between gap-5">
                <div className="flex items-start gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-500 text-white shadow-lg shadow-violet-950/50">
                    <Split className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-violet-200">Assist Intelligence</p>
                    <h3 className="mt-1 text-2xl font-black tracking-tight">Agent policy splits</h3>
                    <p className="mt-1 text-sm font-semibold text-slate-300">
                      {splitTarget.agent_on_assist_name || 'Assisted agent'} · {formatManualActivityDate(normalizeExpenseDate(splitTarget.expense_date))}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeAssistSplits}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white transition hover:bg-white/20"
                  title="Close policy splits"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 p-6">
              {splitLoading ? (
                <div className="flex min-h-80 flex-col items-center justify-center rounded-3xl border border-violet-100 bg-white text-center shadow-sm">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </span>
                  <p className="mt-4 text-base font-black text-slate-950">Loading policy splits</p>
                  <p className="mt-1 text-sm font-semibold text-slate-500">Matching policies to this assist expense...</p>
                </div>
              ) : splitError ? (
                <div className="flex min-h-64 flex-col items-center justify-center rounded-3xl border border-red-100 bg-white p-8 text-center shadow-sm">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500">
                    <AlertCircle className="h-6 w-6" />
                  </span>
                  <p className="mt-4 text-base font-black text-slate-950">Policy splits unavailable</p>
                  <p className="mt-1 max-w-lg text-sm font-semibold text-slate-500">{splitError}</p>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    {[
                      { label: 'Matched Policies', value: splitPolicies.length.toLocaleString(), accent: 'from-violet-600 to-indigo-600' },
                      { label: 'Total Annual Premium', value: formatExpenseCurrency(splitTotals.annualPremium), accent: 'from-cyan-500 to-blue-600' },
                      { label: 'Your Split Premium', value: formatExpenseCurrency(splitTotals.splitPremium), accent: 'from-emerald-500 to-teal-600' },
                    ].map(card => (
                      <div key={card.label} className="relative overflow-hidden rounded-3xl border border-white bg-white p-5 shadow-sm">
                        <div className={`absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b ${card.accent}`} />
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{card.label}</p>
                        <p className="mt-2 text-2xl font-black tracking-tight text-slate-950">{card.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
                    <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-500">Policy Breakdown</p>
                        <h4 className="mt-1 text-lg font-black text-slate-950">Policies connected to this assist</h4>
                      </div>
                      <div className="flex w-full flex-col gap-2 sm:max-w-xl sm:flex-row">
                        <label className="relative block min-w-0 flex-1">
                          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <input
                            type="search"
                            value={splitSearch}
                            onChange={event => setSplitSearch(event.target.value)}
                            placeholder="Search client, policy, carrier..."
                            className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-bold text-slate-800 outline-none transition focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-100"
                          />
                        </label>
                        <button
                          type="button"
                          disabled
                          title="Advanced policy filters are coming soon"
                          className="inline-flex h-11 shrink-0 cursor-not-allowed items-center justify-center gap-2 rounded-2xl border border-violet-100 bg-violet-50 px-3.5 text-xs font-black text-violet-700 opacity-90"
                        >
                          <SlidersHorizontal className="h-4 w-4" />
                          Filters
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.08em] text-amber-700">Coming Soon</span>
                        </button>
                      </div>
                    </div>

                    <div className="overflow-auto">
                      <div className="grid min-w-[72rem] grid-cols-[1.25fr_1fr_1.35fr_0.85fr_0.85fr_0.7fr_0.9fr] gap-3 bg-slate-50 px-5 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                        <span>Client</span>
                        <span>Policy</span>
                        <span>Carrier / Product</span>
                        <span>Status</span>
                        <span>Annual Premium</span>
                        <span>Split</span>
                        <span>Split Premium</span>
                      </div>
                      {filteredSplitPolicies.length > 0 ? filteredSplitPolicies.map(policy => {
                        const annualPremium = toExpenseNumber(policy.annual_premium);
                        const splitPercent = toExpenseNumber(policy.split?.agent_on_split_percent);
                        const status = policy.meta_policy_paidstatus_name || policy.ref_policyStatus_name || 'Unknown';
                        return (
                          <div key={policy.id} className="grid min-w-[72rem] grid-cols-[1.25fr_1fr_1.35fr_0.85fr_0.85fr_0.7fr_0.9fr] items-center gap-3 border-t border-slate-100 px-5 py-4 text-xs font-bold text-slate-600 transition hover:bg-violet-50/40">
                            <div className="min-w-0">
                              <p className="truncate font-black text-slate-950">{policy.client || 'Client unavailable'}</p>
                              <p className="mt-1 truncate text-[10px] font-bold text-slate-400">{policy.state || 'State unavailable'} · Draft {formatManualActivityDate(normalizeExpenseDate(policy.initial_draft_date))}</p>
                            </div>
                            <span className="truncate font-black text-slate-800">{policy.policy_number || 'Pending'}</span>
                            <div className="min-w-0">
                              <p className="truncate font-black text-slate-800">{policy.ref_carrier_name || 'Carrier unavailable'}</p>
                              <p className="mt-1 truncate text-[10px] text-slate-400">{policy.carrier_product || 'Product unavailable'}</p>
                            </div>
                            <span className={`w-fit rounded-full px-2.5 py-1 text-[10px] font-black ${String(status).toLocaleLowerCase() === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>{status}</span>
                            <span className="font-black text-slate-950">{formatExpenseCurrency(annualPremium)}</span>
                            <span className="w-fit rounded-xl bg-violet-100 px-2.5 py-1.5 font-black text-violet-700">{splitPercent.toLocaleString()}%</span>
                            <span className="font-black text-emerald-700">{formatExpenseCurrency(annualPremium * (splitPercent / 100))}</span>
                          </div>
                        );
                      }) : (
                        <div className="border-t border-slate-100 px-5 py-12 text-center">
                          <p className="text-sm font-black text-slate-500">{splitPolicies.length > 0 ? 'No policies match your search.' : 'No policy splits were found for this expense.'}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-[2rem] bg-white shadow-2xl shadow-slate-950/20">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-slate-950 px-6 py-5 text-white">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-red-300">Delete Expense</p>
                <h3 className="text-2xl font-black tracking-tight">Remove this expense?</h3>
              </div>
              <button
                type="button"
                onClick={closeDeleteConfirm}
                className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white transition hover:bg-white/20"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-5 p-6">
              <div className="rounded-3xl border border-red-100 bg-red-50 p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-500">Expense</p>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Date</p>
                    <p className="mt-1 text-sm font-black text-slate-950">{formatManualActivityDate(normalizeExpenseDate(deleteTarget.expense_date))}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Cost</p>
                    <p className="mt-1 text-sm font-black text-slate-950">{formatExpenseCurrency(deleteTarget.cost)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Name</p>
                    <p className="mt-1 truncate text-sm font-black text-slate-950">{deleteTarget.expense || '-'}</p>
                  </div>
                </div>
              </div>

              <p className="text-sm font-semibold text-slate-500">
                This removes the expense from the selected agent&apos;s expense log.
              </p>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeDeleteConfirm}
                  disabled={deletingId !== null}
                  className="rounded-2xl border border-slate-100 bg-white px-5 py-3 text-sm font-black text-slate-600 transition hover:border-slate-200 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteExpense}
                  disabled={deletingId !== null}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-red-100 transition hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"
                >
                  {deletingId !== null ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  {deletingId !== null ? 'Deleting...' : 'Delete Expense'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

type MyBusinessTab = 'gamification' | 'overview' | 'policies' | 'americo-policies' | 'activity' | 'expenses' | 'splits' | 'commissions' | 'debts';

const MyBusinessPage = ({ tab }: { tab: MyBusinessTab }) => {
  const { currentAgentId, viewingAgentName } = useAgentContext();
  const selectedBusinessAgentId = currentAgentId;
  const selectedBusinessAgentLabel = viewingAgentName || 'My Workspace';
  const toolbarSlotId = 'my-business-toolbar-actions';
  const hasToolbar = tab === 'gamification' || tab === 'overview' || tab === 'policies' || tab === 'americo-policies' || tab === 'activity' || tab === 'expenses' || tab === 'splits' || tab === 'commissions' || tab === 'debts';

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {hasToolbar && (
        <div className="flex min-h-11 justify-start">
          <div id={toolbarSlotId} className="flex min-h-11 w-full flex-wrap items-center justify-start gap-3" />
        </div>
      )}

      {tab === 'gamification' ? (
        <MyBusinessGamification selectedAgentId={selectedBusinessAgentId} toolbarSlotId={toolbarSlotId} />
      ) : tab === 'americo-policies' ? (
        <AmericoBusinessPolicies toolbarSlotId={toolbarSlotId} />
      ) : tab === 'policies' ? (
        <AgentPoliciesV2
          agentIdsOverride={selectedBusinessAgentId ? [selectedBusinessAgentId] : []}
          hideHeader
          showDateRangeWhenHeaderHidden
          showPolicySourceSelector
          enableNeedAttention
          hideAgentFilter
          toolbarSlotId={toolbarSlotId}
        />
      ) : tab === 'activity' ? (
        <MyBusinessActivityLog selectedAgentId={selectedBusinessAgentId} toolbarSlotId={toolbarSlotId} />
      ) : tab === 'expenses' ? (
        <MyBusinessExpenseLog selectedAgentId={selectedBusinessAgentId} selectedAgentLabel={selectedBusinessAgentLabel} toolbarSlotId={toolbarSlotId} />
      ) : tab === 'splits' ? (
        <AgentSplits toolbarSlotId={toolbarSlotId} />
      ) : tab === 'commissions' ? (
        <AgentCommissions selectedAgentId={selectedBusinessAgentId} toolbarSlotId={toolbarSlotId} />
      ) : tab === 'debts' ? (
        <AgentDebtRecovery toolbarSlotId={toolbarSlotId} />
      ) : (
        <MyBusinessOverviewContent selectedAgentId={selectedBusinessAgentId} selectedAgentLabel={selectedBusinessAgentLabel} toolbarSlotId={toolbarSlotId} />
      )}
    </div>
  );
};

const AgentLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const { 
    currentAgentId, 
    selectedAgentIds,
    isImpersonating, 
    startImpersonation, 
    stopImpersonation, 
    toggleAgentSelection,
    availableFeatures,
    subAgents,
    viewingAgentName,
    hasAgentProfile
  } = useAgentContext();
  const location = useLocation();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [agentSearch, setAgentSearch] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const isSidebarCompact = isCollapsed;
  const [isNightMode, setIsNightMode] = useState(() => {
    const savedTheme = localStorage.getItem('workspace_theme') || localStorage.getItem('arena_theme');
    return savedTheme === 'night';
  });

  useEffect(() => {
    localStorage.setItem('workspace_theme', isNightMode ? 'night' : 'light');
    localStorage.removeItem('arena_theme');
    document.documentElement.classList.toggle('workspace-night', isNightMode);
    document.documentElement.style.colorScheme = isNightMode ? 'dark' : 'light';

    return () => {
      document.documentElement.classList.remove('workspace-night');
      document.documentElement.style.colorScheme = '';
    };
  }, [isNightMode]);

  const isActive = (path: string) => location.pathname === path || (path !== '/' && location.pathname.startsWith(path));
  const isDarkRoute = isNightMode;
  const isBusinessPage = location.pathname.startsWith('/business') || location.pathname.startsWith('/policies');
  const isPoliciesPage = location.pathname.startsWith('/business/policies') || location.pathname === '/policies' || location.pathname === '/policies/v2';
  const pageTitle = (() => {
    const path = location.pathname;
    if (path === '/' || path === '') return 'Global Performance';
    if (path.startsWith('/leaderboard/realtime')) return 'Realtime Leaderboard';
    if (path.startsWith('/leaderboard/trainer/')) return 'Trainer Performance';
    if (path === '/business' || path === '/business/overview') return 'My Business';
    if (path.startsWith('/business/policies') || path === '/policies' || path === '/policies/v2') return 'Policies';
    if (path.startsWith('/business/activity-log')) return 'Daily Activity';
    if (path.startsWith('/business/expense-log')) return 'Expense Log';
    if (path.startsWith('/business/splits')) return 'Split Business';
    if (path.startsWith('/business/commissions')) return 'Commissions';
    if (path.startsWith('/business/debt-recovery')) return 'Debt Recovery';
    if (path.startsWith('/policies/details')) return 'Policy Details';
    if (['/downlines', '/downlines/team', '/downlines/production', '/downlines/expenses'].includes(path)) return 'My Agency';
    if (path.startsWith('/downlines/')) return 'Downline Profile';
    if (path.startsWith('/services')) return 'Services';
    if (path.startsWith('/splits')) return 'Split Business';
    if (path.startsWith('/commissions')) return 'Commissions';
    if (path.startsWith('/debts')) return 'Debt Recovery';
    if (path.startsWith('/tickets')) return 'Help';
    if (path.startsWith('/settings')) return 'Settings';
    if (path.startsWith('/call-report/policytek')) return 'PolicyTek';
    if (path.startsWith('/call-report/wavv')) return 'Wavv';
    if (path.startsWith('/call-report/callx')) return 'CallX';
    if (path.startsWith('/reconciliation/americo')) return 'Americo Reconciliation';
    if (path.startsWith('/stats') || path.startsWith('/my-profile')) return 'My Stats';
    if (path.startsWith('/agency/')) return 'Agency';
    return 'PolicyHQ';
  })();
  
  // Feature Key Determination
  const featureKey = (() => {
    const path = location.pathname;
    if (path === '/' || path === '') return 'overview';
    if (path === '/business' || path === '/business/overview' || path.startsWith('/business/activity-log') || path.startsWith('/business/expense-log')) return 'overview';
    if (path.startsWith('/business/splits')) return 'splits';
    if (path.startsWith('/business/commissions')) return 'commissions';
    if (path.startsWith('/business/debt-recovery')) return 'debts';
    if (path.startsWith('/business/policies')) return 'policies';
    if (path.startsWith('/policies')) return 'policies';
    if (path.startsWith('/downlines')) return 'downlines';
    if (path.startsWith('/services')) return 'overview';
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
  const filteredSubAgents = useMemo(() => {
    const query = agentSearch.trim().toLowerCase();
    if (!query) return subAgents;
    return subAgents.filter(agent => agent.name.toLowerCase().includes(query));
  }, [agentSearch, subAgents]);

  // Extract agency initials for fallback logo
  const safeAgencyName = typeof user?.agencyName === 'string' ? user.agencyName.trim() : '';
  const agencyInitials = safeAgencyName
    ? safeAgencyName.split(/\s+/).filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : 'HQ';
  const workspaceBrandName = safeAgencyName || 'PolicyHQ';

  return (
    <div
      className={`workspace-app h-screen flex font-sans overflow-hidden p-2 gap-2 selection:bg-brand-500/30 selection:text-brand-900 transition-colors duration-500 ${isNightMode ? 'workspace-night' : ''} ${isDarkRoute ? 'bg-[#08080f]' : ''}`}
      style={!isDarkRoute ? { background: isPoliciesPage ? '#F3F4F6' : '#E9EDF2' } : undefined}
    >
      {/* Floating Sidebar */}
      <aside 
        className={`
          ${isSidebarCompact ? 'w-16 px-2' : 'w-60 px-3'}
          ${isDarkRoute ? 'bg-[#0d0d1a] border-white/6' : 'bg-transparent border-transparent'}
          rounded-2xl flex flex-col transition-[width,padding,background-color,border-color] duration-300 ease-out
          border relative z-20 shrink-0 py-4
        `}
      >
        {/* Toggle Handle */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)} 
          className={`absolute top-5 rounded-lg flex items-center justify-center transition-all z-50 ${
            isSidebarCompact ? '-right-4 h-6 w-6 shadow-md' : 'right-3 h-7 w-7'
          } ${isDarkRoute ? 'bg-[#181827] text-slate-500 hover:text-brand-400' : 'border border-slate-200 bg-white text-slate-400 hover:bg-slate-100 hover:text-slate-700'}`}
          aria-label={isCollapsed ? 'Expand navigation' : 'Collapse navigation'}
        >
          {isSidebarCompact ? <ChevronRight size={16} strokeWidth={3} /> : <ChevronLeft size={16} strokeWidth={3} />}
        </button>

        {/* Brand Header */}
        <div className={`flex items-center gap-3 mb-6 transition-all duration-300 ${isSidebarCompact ? 'justify-center' : 'px-1 pr-9'}`} title={workspaceBrandName}>
            <div className="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center text-white font-black shrink-0 text-sm relative overflow-hidden group shadow-sm">
                <div className="absolute inset-0 bg-brand-500/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                {user?.agencyLogoUrl ? (
                    <img src={user.agencyLogoUrl} alt={`${workspaceBrandName} logo`} className="relative z-10 w-full h-full object-contain p-1.5" />
                ) : (
                    <span className="relative z-10 text-brand-500">{agencyInitials}</span>
                )}
            </div>
            <div className={`min-w-0 overflow-hidden transition-all duration-500 ${isSidebarCompact ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                <span className={`block max-w-[9.5rem] truncate whitespace-nowrap text-sm font-bold tracking-tight ${isDarkRoute ? 'text-white' : 'text-slate-900'}`}>
                  {workspaceBrandName}
                </span>
                <span className={`text-[8px] font-semibold uppercase truncate block ${isDarkRoute ? 'text-slate-600' : 'text-slate-400'}`}>
                  {safeAgencyName ? 'Agency Portal' : 'Agent Portal'}
                </span>
            </div>
        </div>
        
        {/* Context Switcher - Collapsible */}
        <div className="mb-5 relative z-40">
            {!isSidebarCompact ? (
              <>
                <button 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className={`w-full flex items-center justify-between text-xs font-semibold rounded-lg py-2.5 px-3 transition-colors ${isDarkRoute ? 'bg-white/5 border border-white/8 text-slate-300 hover:bg-white/8' : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100'} ${isDropdownOpen ? 'ring-2 ring-brand-500/20 border-brand-500' : ''}`}
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
                    <div className="absolute top-full left-0 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl shadow-slate-300/30 z-50 p-1.5 animate-in fade-in zoom-in-95 duration-200 origin-top">
                      <button
                          onClick={() => {
                            stopImpersonation();
                            setIsDropdownOpen(false);
                            setAgentSearch('');
                          }}
                          className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-between group ${!isImpersonating ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                      >
                        <span>My Workspace</span>
                        {!isImpersonating && <CheckCircleIcon />}
                      </button>
                      
                      {subAgents.length > 0 && (
                        <>
                          <div className="relative mx-1.5 mt-2 mb-1.5">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                            <input
                              type="search"
                              value={agentSearch}
                              onChange={event => setAgentSearch(event.target.value)}
                              placeholder="Search team..."
                              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs font-semibold text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-brand-400 focus:bg-white"
                            />
                          </div>
                          <div className="max-h-60 overflow-y-auto pr-1">
                            {filteredSubAgents.map(agent => {
                              const isSelected = selectedAgentIds.includes(agent.agentId) && isImpersonating;
                              return (
                                <button
                                  key={agent.agentId}
                                  onClick={() => {
                                    toggleAgentSelection(agent.agentId);
                                    setIsDropdownOpen(false);
                                    setAgentSearch('');
                                  }}
                                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-between mb-0.5 ${isSelected ? 'bg-amber-50 text-amber-900 border border-amber-100' : 'text-slate-600 hover:bg-slate-50'}`}
                                >
                                  <span className="truncate">{agent.name}</span>
                                  {isSelected && <Check className="h-4 w-4 text-amber-600" />}
                                </button>
                              );
                            })}
                            {filteredSubAgents.length === 0 && (
                              <p className="px-3 py-4 text-center text-xs font-semibold text-slate-400">No agents found.</p>
                            )}
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
                className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-all mx-auto ${isImpersonating ? 'bg-amber-50 border-amber-200 text-amber-500' : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-900 hover:bg-white'}`}
                title="Switch Context"
              >
                  <Briefcase size={20} strokeWidth={2.5} />
              </button>
            )}
        </div>

        {/* Nav Items */}
        <nav className={`space-y-0.5 flex flex-col items-center w-full flex-1 min-h-0 scrollbar-hide ${isSidebarCompact ? 'overflow-visible' : 'overflow-y-auto overflow-x-hidden'}`}>
          <div className="w-full space-y-0.5">
            {!isSidebarCompact && (
              <p className={`px-3 pb-1 text-[9px] font-bold uppercase tracking-wider ${isDarkRoute ? 'text-slate-700' : 'text-slate-400'}`}>
                Main
              </p>
            )}
            <SidebarItem to="/" icon={<Trophy size={16} />} label="Leaderboard" active={location.pathname === '/' || location.pathname === ''} locked={isLocked('overview')} collapsed={isSidebarCompact} dark={isDarkRoute} />
            <SidebarGroup
              icon={<PhoneCall size={16} />}
              label="Activity Dashboard"
              active={location.pathname.startsWith('/call-report')}
              collapsed={isSidebarCompact}
              dark={isDarkRoute}
            >
              <SidebarSubItem to="/call-report/policytek" label="PolicyTek" active={isActive('/call-report/policytek')} dark={isDarkRoute} />
              <SidebarSubItem to="/call-report/wavv" label="Wavv" active={isActive('/call-report/wavv')} dark={isDarkRoute} />
              <SidebarSubItem to="/call-report/callx" label="CallX" active={isActive('/call-report/callx')} dark={isDarkRoute} />
            </SidebarGroup>
          </div>

          <div className="h-1 w-full shrink-0" />

          <div className="w-full space-y-0.5">
            <SidebarGroup
              icon={<Briefcase size={16} />}
              label="My Business"
              active={isBusinessPage}
              collapsed={isSidebarCompact}
              dark={isDarkRoute}
              defaultOpen
            >
                        <SidebarSubItem to="/business" label="Overview" active={location.pathname === '/business' || location.pathname === '/business/overview'} dark={isDarkRoute} icon={<BarChart3 size={13} strokeWidth={1.8} />} />
                        <SidebarSubItem to="/business/policies" label="Policies" active={location.pathname.startsWith('/business/policies')} dark={isDarkRoute} icon={<FileCheck size={13} strokeWidth={1.8} />} />
                        <SidebarSubItem to="/business/splits" label="Splits" active={location.pathname === '/business/splits'} dark={isDarkRoute} icon={<Split size={13} strokeWidth={1.8} />} />
                        <SidebarSubItem to="/business/commissions" label="Commissions" active={location.pathname === '/business/commissions'} dark={isDarkRoute} icon={<DollarSign size={13} strokeWidth={1.8} />} />
                        <SidebarSubItem to="/business/debt-recovery" label="Debts" active={location.pathname === '/business/debt-recovery'} dark={isDarkRoute} icon={<AlertCircle size={13} strokeWidth={1.8} />} />
                        <SidebarSubItem to="/business/activity-log" label="Daily Tracker" active={location.pathname === '/business/activity-log'} dark={isDarkRoute} icon={<History size={13} strokeWidth={1.8} />} />
                        <SidebarSubItem to="/business/expense-log" label="Expense Log" active={location.pathname === '/business/expense-log'} dark={isDarkRoute} icon={<ReceiptText size={13} strokeWidth={1.8} />} />
            </SidebarGroup>
          </div>

          <div className="h-1 w-full shrink-0" />

          <div className="w-full space-y-0.5">
            <SidebarGroup
              icon={<Users size={16} />}
              label="Team Agency"
              active={location.pathname.startsWith('/downlines')}
              collapsed={isSidebarCompact}
              dark={isDarkRoute}
            >
              <SidebarSubItem to="/downlines" label="Overview" active={location.pathname === '/downlines'} dark={isDarkRoute} icon={<BarChart3 size={13} strokeWidth={1.8} />} />
              <SidebarSubItem to="/downlines/team" label="Team List" active={location.pathname === '/downlines/team'} dark={isDarkRoute} icon={<Users size={13} strokeWidth={1.8} />} />
              <SidebarSubItem to="/downlines/production" label="Production" active={location.pathname === '/downlines/production'} dark={isDarkRoute} icon={<FileCheck size={13} strokeWidth={1.8} />} />
              <SidebarSubItem to="/downlines/expenses" label="Expense Management" active={location.pathname === '/downlines/expenses'} dark={isDarkRoute} icon={<ReceiptText size={13} strokeWidth={1.8} />} />
            </SidebarGroup>
          </div>

          <div className="h-1 w-full shrink-0" />

          <div className="w-full space-y-0.5">
            <SidebarItem to="/services" icon={<Store size={16} />} label="Services" active={isActive('/services')} collapsed={isSidebarCompact} dark={isDarkRoute} />
          </div>
        </nav>

        {/* Bottom utilities and user account */}
        <div className={`mt-auto w-full pt-3 border-t ${isDarkRoute ? 'border-white/8' : 'border-slate-300/60'}`}>
            <div className="mb-2 space-y-0.5">
              <SidebarItem
                to="/tickets"
                icon={<CircleHelp size={16} />}
                label="Help"
                active={isActive('/tickets')}
                locked={isLocked('ticketing')}
                collapsed={isSidebarCompact}
                dark={isDarkRoute}
              />
              <SidebarItem
                to="/settings"
                icon={<Settings size={16} />}
                label="Settings"
                active={isActive('/settings')}
                collapsed={isSidebarCompact}
                dark={isDarkRoute}
              />
            </div>
            <div className={`pt-2 border-t ${isDarkRoute ? 'border-white/8' : 'border-slate-300/60'}`}>
            <div className={`flex items-center gap-2 p-2 rounded-lg transition-all duration-300 ${isSidebarCompact ? 'justify-center' : isDarkRoute ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold border shrink-0 ${isDarkRoute ? 'bg-white/10 text-white border-white/10' : 'bg-slate-50 text-slate-900 border-slate-200'}`}>
                  {user?.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                </div>
                
                <div className={`flex-1 min-w-0 transition-all duration-500 ${isSidebarCompact ? 'w-0 opacity-0 overflow-hidden' : 'w-auto opacity-100'}`}>
                    <p className={`text-xs font-semibold truncate ${isDarkRoute ? 'text-white' : 'text-slate-900'}`}>{user?.name}</p>
                    <div className="flex flex-col gap-0.5 mt-0.5">
                        <p className={`text-[10px] truncate font-bold ${isDarkRoute ? 'text-slate-600' : 'text-slate-400'}`}>{user?.email || user?.phone || 'Signed in'}</p>
                        <p className="text-[8px] text-brand-500 truncate font-bold uppercase">User Account</p>
                    </div>
                </div>
                
                <button onClick={logout} className={`rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all ${isSidebarCompact ? 'hidden' : 'p-2'}`} title="Logout">
                  <LogOut className="w-4 h-4" />
                </button>
            </div>
            </div>
        </div>
      </aside>

      {/* Main Content - Floating Panel */}
      <main className={`flex-1 min-w-0 h-full overflow-hidden flex flex-col relative border transition-colors duration-500 ${isRestricted ? 'bg-slate-950 border-slate-900' : isDarkRoute ? 'bg-[#08080f] rounded-2xl border-white/5' : 'bg-white/40 rounded-2xl border-white'}`}>
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
            <div
              className="flex-1 overflow-y-auto scroll-smooth scrollbar-hide relative"
              style={location.pathname === '/business' ? {
                backgroundImage: `linear-gradient(rgba(3, 7, 18, 0.42), rgba(15, 6, 38, 0.68)), url(${goalsUniverseBackground})`,
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                backgroundSize: 'cover',
                backgroundAttachment: 'fixed',
              } : undefined}
            >
            <header className={`sticky top-0 z-[100] flex h-14 items-center justify-between gap-3 border-b px-4 transition-colors duration-500 ${isDarkRoute ? 'border-white/5 bg-slate-950/70 backdrop-blur-xl' : 'border-slate-200/70 bg-white/75 backdrop-blur-xl'}`}>
                <h1 className={`min-w-0 truncate text-base font-semibold tracking-tight ${isDarkRoute ? 'text-white' : 'text-slate-900'}`}>
                  {pageTitle}
                </h1>
                <div className="flex items-center gap-2">
                    <ModuleSwitcher />
                    <button
                      type="button"
                      onClick={() => setIsNightMode(current => !current)}
                      aria-label={isNightMode ? 'Switch to light mode' : 'Switch to night mode'}
                      title={isNightMode ? 'Switch to light mode' : 'Switch to night mode'}
                      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border transition-colors ${
                        isNightMode
                          ? 'border-amber-400/40 bg-amber-400/10 text-amber-300 hover:bg-amber-400/20'
                          : 'border-indigo-200 bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                      }`}
                    >
                      {isNightMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    </button>
                    <button
                      type="button"
                      disabled
                      title="I am coming soon and currently under training. Hope to meet you soon!"
                      className="inline-flex h-8 cursor-not-allowed items-center gap-1.5 rounded-xl border border-amber-200/80 bg-amber-50/80 px-2.5 text-[9px] font-semibold text-amber-700 opacity-80"
                    >
                      <Bot className="h-3.5 w-3.5 text-amber-600" />
                      <span className="hidden lg:inline">AI Soon</span>
                    </button>
                    <div className="flex items-center gap-0.5">
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

            <div className="workspace-content px-5 pt-4 pb-10 max-w-[1600px] mx-auto">
                <Routes>
                  <Route path="/" element={<AgentOverview />} />
                  <Route path="/leaderboard/realtime" element={<AgentleaderboardRealtime isNightMode={isNightMode} />} />
                  <Route path="/leaderboard/trainer/:trainerId" element={<TrainerDetailPage isNightMode={isNightMode} />} />
                  <Route path="/call-report/policytek" element={<CallReportPolicytek />} />
                  <Route path="/call-report/wavv" element={<CallReportWavv />} />
                  <Route path="/call-report/callx" element={<CallReportCallx />} />
                  <Route path="/reconciliation/americo" element={<AmericoReconciliation />} />
                  <Route path="/agency/:teamId" element={<AgencyDetailPage />} />
                  <Route path="/stats" element={<AgentStats />} />
                  <Route path="/my-profile" element={<MyProfilePage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/services" element={<ServicesPage />} />
                  <Route path="/business" element={<MyBusinessPage tab="gamification" />} />
                  <Route path="/business/overview" element={<MyBusinessPage tab="overview" />} />
                  <Route path="/business/policies" element={<MyBusinessPage tab="policies" />} />
                  <Route path="/business/policies/americo" element={<MyBusinessPage tab="americo-policies" />} />
                  <Route path="/business/activity-log" element={<MyBusinessPage tab="activity" />} />
                  <Route path="/business/expense-log" element={<MyBusinessPage tab="expenses" />} />
                  <Route path="/business/splits" element={<MyBusinessPage tab="splits" />} />
                  <Route path="/business/commissions" element={<MyBusinessPage tab="commissions" />} />
                  <Route path="/business/debt-recovery" element={<MyBusinessPage tab="debts" />} />
                  <Route path="/policies" element={<Navigate to="/business/policies" replace />} />
                  <Route path="/policies/v2" element={<Navigate to="/business/policies" replace />} />
                  <Route path="/policies/details" element={<AgentPolicyDetails />} />
                  <Route path="/downlines" element={<AgentDownlines viewMode="overview" />} />
                  <Route path="/downlines/team" element={<AgentDownlines viewMode="team" />} />
                  <Route path="/downlines/production" element={<AgentDownlines viewMode="policies" />} />
                  <Route path="/downlines/expenses" element={<AgentDownlines viewMode="expenses" />} />
                  <Route path="/downlines/:agentId" element={<DownlineAgentDetails />} />
                  <Route path="/commissions" element={<Navigate to="/business/commissions" replace />} />
                  <Route path="/splits" element={<Navigate to="/business/splits" replace />} />
                  <Route path="/debts" element={<Navigate to="/business/debt-recovery" replace />} />
                  <Route path="/tickets" element={<AgentTickets />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </div>
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
  return <AgentLayout />;
};

export default AgentWorkspace;



