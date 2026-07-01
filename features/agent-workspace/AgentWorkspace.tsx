
import React, { useEffect, useMemo, useState } from 'react';
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
  BarChart3,
  History,
  Loader2,
  MapPinned,
  ReceiptText,
  RotateCcw, 
  Users, 
  Ticket,
  Trophy,
  Check, // Imported Check
  PhoneCall,
  Settings,
  Bot
} from 'lucide-react';
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from 'recharts';
import { useAgentContext } from './context/AgentContext';
import { useAuth } from '../../context/AuthContext';
import { AgentOverview } from './components/AgentOverview';
import { AgentPoliciesV2, PolicyDateRangeFilter, PoliciesTimeframe, toPolicyRequestDate } from './components/AgentPoliciesV2';
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
import { myBusinessOverviewApi, MyBusinessOverviewResponse } from './services/myBusinessOverviewApi';

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

const MyBusinessOverview = () => {
  const { currentAgentId, selectedAgentIds, subAgents, viewingAgentName } = useAgentContext();
  const [timeframe, setTimeframe] = useState<PoliciesTimeframe>('all');
  const [startDate, setStartDate] = useState<number | undefined>(undefined);
  const [endDate, setEndDate] = useState<number | undefined>(undefined);
  const [selectedBusinessAgentId, setSelectedBusinessAgentId] = useState<string>(currentAgentId);
  const [data, setData] = useState<MyBusinessOverviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const businessAgentOptions = useMemo(() => (
    (selectedAgentIds.length > 0 ? selectedAgentIds : [currentAgentId])
      .filter(Boolean)
      .filter((agentId, index, all) => all.indexOf(agentId) === index)
      .map(agentId => {
        const subAgent = subAgents.find(agent => agent.agentId === agentId);
        return {
          id: agentId,
          label: subAgent?.name || (agentId === currentAgentId ? viewingAgentName : agentId),
        };
      })
  ), [currentAgentId, selectedAgentIds, subAgents, viewingAgentName]);

  useEffect(() => {
    const nextSelectedId = businessAgentOptions.some(agent => agent.id === selectedBusinessAgentId)
      ? selectedBusinessAgentId
      : (businessAgentOptions[0]?.id || currentAgentId);

    if (nextSelectedId && nextSelectedId !== selectedBusinessAgentId) {
      setSelectedBusinessAgentId(nextSelectedId);
    }
  }, [businessAgentOptions, currentAgentId, selectedBusinessAgentId]);

  const selectedBusinessAgentLabel = businessAgentOptions.find(agent => agent.id === selectedBusinessAgentId)?.label || viewingAgentName || 'My Business';

  useEffect(() => {
    if (!selectedBusinessAgentId) {
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
      agentId: selectedBusinessAgentId,
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
  }, [selectedBusinessAgentId, timeframe, startDate, endDate]);

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
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Business Scope</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {businessAgentOptions.map(agent => {
              const active = agent.id === selectedBusinessAgentId;
              return (
                <button
                  key={agent.id}
                  type="button"
                  onClick={() => setSelectedBusinessAgentId(agent.id)}
                  className={`rounded-2xl px-4 py-2.5 text-xs font-black transition-all ${
                    active
                      ? 'bg-slate-950 text-white shadow-lg shadow-slate-900/15'
                      : 'border border-slate-100 bg-white text-slate-500 hover:border-slate-200 hover:text-slate-950'
                  }`}
                >
                  {agent.label}
                </button>
              );
            })}
          </div>
        </div>

        <PolicyDateRangeFilter
          timeframe={timeframe}
          startDate={startDate}
          endDate={endDate}
          onTimeframeChange={handleTimeframeChange}
          onDateChange={(start, end) => {
            setStartDate(start);
            setEndDate(end);
          }}
        />
      </div>

      <section className="overflow-hidden rounded-[2rem] border border-white/80 bg-white shadow-sm">
        <div className="flex flex-col gap-5 border-b border-slate-100 p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-amber-300 shadow-lg shadow-slate-200">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Business Overview</p>
              <h2 className="text-2xl font-black tracking-tight text-slate-950">Analytics Dashboard</h2>
              <p className="text-sm font-semibold text-slate-500">Production signals for {selectedBusinessAgentLabel}.</p>
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
          <div className="space-y-6 bg-slate-50/70 p-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="relative overflow-hidden rounded-[1.75rem] bg-slate-950 p-6 text-white shadow-xl shadow-slate-200">
                <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full border border-white/10" />
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-400 text-slate-950">
                  <MapPinned className="h-5 w-5" />
                </div>
                <p className="mt-8 text-[10px] font-black uppercase tracking-[0.26em] text-white/45">Total Annual Premium</p>
                <p className="mt-2 text-4xl font-black tracking-tight">{compactCurrencyFormatter.format(totals.annualPremium)}</p>
                <p className="mt-1 text-xs font-bold text-white/55">{currencyFormatter.format(totals.annualPremium)} exact</p>
              </div>

              <div className="rounded-[1.75rem] border border-slate-100 bg-white p-6 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Submitted Records</p>
                <p className="mt-4 text-4xl font-black tracking-tight text-slate-950">{totals.records.toLocaleString()}</p>
                <p className="mt-2 text-xs font-bold text-slate-500">Across the selected scope and date range.</p>
              </div>

              <div className="rounded-[1.75rem] border border-slate-100 bg-white p-6 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Market Coverage</p>
                <p className="mt-4 text-4xl font-black tracking-tight text-slate-950">{totals.stateCount.toLocaleString()}</p>
                <p className="mt-2 text-xs font-bold text-slate-500">States with production returned.</p>
              </div>

              <div className="rounded-[1.75rem] border border-amber-200 bg-amber-50 p-6 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-700">Lead Sources</p>
                <p className="mt-4 text-4xl font-black tracking-tight text-slate-950">{sources.length.toLocaleString()}</p>
                <p className="mt-2 text-xs font-bold text-amber-800/70">
                  Avg AP / record: {currencyFormatter.format(totals.averagePremium)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <section className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
                <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">State Heat Map</p>
                    <h3 className="text-2xl font-black tracking-tight text-slate-950">Production by state</h3>
                    <p className="mt-1 text-sm font-semibold text-slate-500">Darker states carry higher annual premium.</p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Top State</p>
                    <p className="text-sm font-black text-slate-950">{totals.topState?.state || 'No state data'}</p>
                  </div>
                </div>

                {states.length === 0 ? (
                  <div className="flex h-80 items-center justify-center rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 text-sm font-bold text-slate-400">
                    No state production returned for this range.
                  </div>
                ) : (
                  <div className="grid grid-cols-11 gap-2 rounded-[1.5rem] bg-slate-50 p-5">
                    {stateTileRows.flatMap((row, rowIndex) => row.map((code, colIndex) => {
                      const state = code ? statesByCode.get(code) : null;
                      const title = state ? `${state.state}: ${currencyFormatter.format(state.total_ap)} · ${state.records} records` : code;
                      return code ? (
                        <div
                          key={`${code}-${rowIndex}-${colIndex}`}
                          title={title}
                          className={`flex aspect-square min-h-9 items-center justify-center rounded-xl border text-[10px] font-black transition-all ${stateTileClass(state?.total_ap || 0)}`}
                        >
                          {code}
                        </div>
                      ) : (
                        <div key={`empty-${rowIndex}-${colIndex}`} className="aspect-square min-h-9" />
                      );
                    }))}
                  </div>
                )}
              </section>

              <section className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">State Rundown</p>
                <h3 className="text-2xl font-black tracking-tight text-slate-950">Top markets</h3>
                <div className="mt-5 max-h-[24rem] space-y-3 overflow-y-auto pr-2">
                  {states.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm font-bold text-slate-400">No state data.</div>
                  ) : states.slice(0, 12).map((item, index) => {
                    const percent = Math.max(4, (item.total_ap / maxStatePremium) * 100);
                    return (
                      <div key={`${item.state}-rundown-${index}`} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-slate-950">{index + 1}. {item.state}</p>
                            <p className="mt-1 text-xs font-bold text-slate-400">{item.records.toLocaleString()} records</p>
                          </div>
                          <p className="text-sm font-black text-slate-950">{currencyFormatter.format(item.total_ap)}</p>
                        </div>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                          <div className="h-full rounded-full bg-gradient-to-r from-slate-950 to-amber-400" style={{ width: `${percent}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <section className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
                <div className="mb-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Policy Status</p>
                  <h3 className="text-2xl font-black tracking-tight text-slate-950">Status breakdown</h3>
                </div>
                <div className="max-h-80 space-y-3 overflow-y-auto pr-2">
                  {policyStatuses.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm font-bold text-slate-400">No policy status data returned yet.</div>
                  ) : policyStatuses.map((item, index) => {
                    const percent = Math.max(4, (item.total_ap / maxPolicyStatusPremium) * 100);
                    return (
                      <div key={`${item.label}-${index}`} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-slate-950">{item.label}</p>
                            <p className="mt-1 text-xs font-bold text-slate-400">{item.records.toLocaleString()} policies</p>
                          </div>
                          <p className="text-sm font-black text-slate-950">{currencyFormatter.format(item.total_ap)}</p>
                        </div>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                          <div className="h-full rounded-full bg-amber-400" style={{ width: `${percent}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
                <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Lead Source Mix</p>
                    <h3 className="text-2xl font-black tracking-tight text-slate-950">Source performance</h3>
                  </div>
                  <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Source AP</p>
                    <p className="text-sm font-black text-slate-950">{currencyFormatter.format(sourceTotals.annualPremium)}</p>
                  </div>
                </div>

                {topSourceChartData.length === 0 ? (
                  <div className="flex h-80 items-center justify-center rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 text-sm font-bold text-slate-400">
                    No source production returned for this range.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-5 lg:grid-cols-[0.9fr_1.1fr]">
                    <div className="relative h-72 min-w-0 rounded-[1.5rem] border border-slate-100 bg-slate-50 p-4">
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

                    <div className="max-h-72 space-y-3 overflow-y-auto pr-2">
                      {sources.slice(0, 8).map((item, index) => (
                        <div key={`${item.label}-source-${index}`} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span
                                  className="h-2.5 w-2.5 rounded-full"
                                  style={{ backgroundColor: businessChartColors[index % businessChartColors.length] }}
                                />
                                <p className="truncate text-sm font-black text-slate-950">{item.label}</p>
                              </div>
                              <p className="mt-2 text-lg font-black text-slate-950">{currencyFormatter.format(item.total_ap)}</p>
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

const MyBusinessPage = ({ tab }: { tab: 'overview' | 'policies' | 'activity' | 'expenses' }) => {
  const tabs = [
    { key: 'overview', label: 'Overview', to: '/business', icon: <BarChart3 className="h-4 w-4" /> },
    { key: 'policies', label: 'Policies', to: '/business/policies', icon: <FileCheck className="h-4 w-4" /> },
    { key: 'activity', label: 'Activity Log', to: '/business/activity-log', icon: <History className="h-4 w-4" /> },
    { key: 'expenses', label: 'Expense Log', to: '/business/expense-log', icon: <ReceiptText className="h-4 w-4" /> },
  ] as const;

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-amber-300 shadow-lg shadow-slate-200">
            <Briefcase className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-950">My Business</h1>
            <p className="text-sm font-semibold text-slate-500">Review your personal production, policy records, activity, and expenses.</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 rounded-2xl border border-white/80 bg-white/70 p-1.5 shadow-sm">
          {tabs.map((item) => {
            const active = item.key === tab;
            return (
              <Link
                key={item.key}
                to={item.to}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black transition-all ${
                  active
                    ? 'bg-slate-900 text-white shadow-lg shadow-slate-200'
                    : 'text-slate-500 hover:bg-white hover:text-slate-950'
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      {tab === 'policies' ? (
        <AgentPoliciesV2 hideHeader showDateRangeWhenHeaderHidden />
      ) : tab === 'activity' ? (
        <BusinessPlaceholder
          title="Activity Log"
          description="A timeline for business activity will live here once the activity workflow is connected."
          icon={<History className="h-6 w-6" />}
        />
      ) : tab === 'expenses' ? (
        <BusinessPlaceholder
          title="Expense Log"
          description="Expense tracking will live here once the expense workflow is connected."
          icon={<ReceiptText className="h-6 w-6" />}
        />
      ) : (
        <MyBusinessOverview />
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
  const isBusinessPage = location.pathname.startsWith('/business') || location.pathname.startsWith('/policies');
  const isPoliciesPage = location.pathname === '/business/policies' || location.pathname === '/policies' || location.pathname === '/policies/v2';
  
  // Feature Key Determination
  const featureKey = (() => {
    const path = location.pathname;
    if (path === '/' || path === '') return 'overview';
    if (path === '/business' || path.startsWith('/business/activity-log') || path.startsWith('/business/expense-log')) return 'overview';
    if (path.startsWith('/business/policies')) return 'policies';
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
            <SidebarItem to="/business" icon={<Briefcase size={20} />} label="My Business" active={isBusinessPage} collapsed={isCollapsed} dark={isDarkRoute} />
            <SidebarItem to="/downlines" icon={<Users size={20} />} label="My Agency" active={isActive('/downlines')} locked={isLocked('downlines')} collapsed={isCollapsed} dark={isDarkRoute} />
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
                      disabled
                      title="I am coming soon and currently under training. Hope to meet you soon!"
                      className="inline-flex cursor-not-allowed items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-black text-amber-700 shadow-sm opacity-90"
                    >
                      <Bot className="w-4 h-4 text-brand-500" />
                      AI Coming Soon
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
                  <Route path="/business" element={<MyBusinessPage tab="overview" />} />
                  <Route path="/business/policies" element={<MyBusinessPage tab="policies" />} />
                  <Route path="/business/activity-log" element={<MyBusinessPage tab="activity" />} />
                  <Route path="/business/expense-log" element={<MyBusinessPage tab="expenses" />} />
                  <Route path="/policies" element={<Navigate to="/business/policies" replace />} />
                  <Route path="/policies/v2" element={<Navigate to="/business/policies" replace />} />
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



