import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { 
  ChevronLeft, 
  Zap, 
  Trophy, 
  Crown, 
  Star, 
  Loader2, 
  Building2,
  Clock,
  ArrowUpRight,
  TrendingUp,
  FileText,
  Activity,
  BarChart3,
  History,
  RefreshCw,
  X,
  Target,
  User,
  PieChart,
  ArrowRight,
  LayoutDashboard,
  Moon,
  Sun,
  Share2
} from 'lucide-react';
import { agentleaderboardRealtimeApi, ArenaEntry, SaleRecord, AgentDetailsResponse, TrainerDetailsResponse } from '../services/agentleaderboardRealtimeApi';
import { useRealtime } from '../../../context/RealtimeContext';
import { LeaderboardControls, LeaderboardMode } from './LeaderboardControls';
import { AgentComparisonView } from './AgentComparisonView';

const formatShort = (val: number) => {
  if (val >= 1000) {
    return `${(val / 1000).toFixed(2)}K`;
  }
  return val.toLocaleString();
};

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(val || 0);
};

const parseLeaderboardAmount = (value: unknown) => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value.replace(/[^0-9.-]/g, '')) || 0;
  return 0;
};

const getInitials = (name: string) => {
  if (!name) return '??';
  return name
    .split(' ')
    .filter(n => n.length > 0)
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
};

type LeaderboardTimeframe = 'today' | 'weekly' | 'monthly' | 'yearly' | 'custom';

const leaderboardModes: LeaderboardMode[] = ['agent', 'team', 'source', 'trainer'];
const leaderboardTimeframes: LeaderboardTimeframe[] = ['today', 'weekly', 'monthly', 'yearly', 'custom'];

const getLeaderboardTimestampRange = (
  timeframe: LeaderboardTimeframe,
  dateRange: { startDate: string; endDate: string }
) => {
  const now = new Date();
  let start: Date;
  let end: Date;

  if (timeframe === 'custom' && dateRange.startDate && dateRange.endDate) {
    start = new Date(`${dateRange.startDate}T00:00:00`);
    end = new Date(`${dateRange.endDate}T23:59:59.999`);
    return { startDate: start.getTime(), endDate: end.getTime() };
  }

  if (timeframe === 'weekly') {
    start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    start.setHours(0, 0, 0, 0);
    end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return { startDate: start.getTime(), endDate: end.getTime() };
  }

  if (timeframe === 'monthly') {
    start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { startDate: start.getTime(), endDate: end.getTime() };
  }

  if (timeframe === 'yearly') {
    start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
    end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    return { startDate: start.getTime(), endDate: end.getTime() };
  }

  start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  return { startDate: start.getTime(), endDate: end.getTime() };
};

const LeaderboardItem: React.FC<{
  entry: ArenaEntry;
  index: number;
  maxPremium: number;
  isNightMode: boolean;
  onSelectAgent: (agentId: string) => void;
}> = ({ entry, index, maxPremium, isNightMode, onSelectAgent }) => {
  const avgPrem = entry.total_annualPremium / (entry.records || 1);
  const progressWidth = maxPremium > 0 ? (entry.total_annualPremium / maxPremium) * 100 : 0;
  
  return (
    <div 
      onClick={() => onSelectAgent(entry.agent_id)}
      className={`flex items-center gap-3 p-4 transition-all group relative cursor-pointer active:scale-[0.98] min-w-0 ${
        isNightMode ? 'hover:bg-white/[0.04] border-b border-white/[0.03]' : 'hover:bg-slate-50 border-b border-slate-50'
      }`}
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black border transition-all shrink-0 ${
        index === 0 ? (isNightMode ? 'bg-brand-500 text-slate-900 border-brand-400 scale-105 shadow-[0_0_15px_rgba(245,158,11,0.3)]' : 'bg-slate-900 text-brand-500 border-navy-900 scale-105 shadow-md') : 
        index === 1 ? 'bg-slate-400 text-white border-slate-500' :
        index === 2 ? 'bg-orange-500 text-white border-orange-600' :
        isNightMode ? 'bg-white/5 text-slate-400 border-white/10' : 'bg-white text-slate-400 border-slate-100'
      }`}>
        {index === 0 ? <Crown className="w-3.5 h-3.5" /> : index + 1}
      </div>

      <div className={`w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center shadow-sm shrink-0 group-hover:scale-105 transition-transform border ${
        isNightMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'
      }`}>
          {entry.agent_profile?.url ? (
            <img src={entry.agent_profile.url} className="w-full h-full object-cover" alt={entry.agent_name} />
          ) : (
            <span className={`text-[10px] font-black ${isNightMode ? 'text-slate-500' : 'text-slate-400'}`}>{getInitials(entry.agent_name)}</span>
          )}
      </div>

      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex justify-between items-baseline mb-1 gap-2">
          <p className={`text-sm font-black truncate ${isNightMode ? 'text-slate-100' : 'text-slate-900'}`}>{entry.agent_name}</p>
          <div className="flex items-center gap-1 shrink-0">
            <span className={`text-sm font-black tracking-tighter ${isNightMode ? 'text-white' : 'text-slate-900'}`}>
              ${formatShort(entry.total_annualPremium)}
            </span>
            <span className={`text-[9px] font-medium ml-0.5 ${isNightMode ? 'text-slate-500' : 'text-slate-400'}`}>
              ({formatShort(avgPrem)})
            </span>
          </div>
        </div>

        <div className={`w-full h-1 rounded-full overflow-hidden mb-1 ${isNightMode ? 'bg-white/5' : 'bg-slate-100'}`}>
          <div 
            className={`h-full transition-all duration-1000 ease-out rounded-full ${
              index === 0 ? 'bg-brand-500' : (isNightMode ? 'bg-slate-500' : 'bg-slate-900')
            }`}
            style={{ width: `${progressWidth}%` }}
          />
        </div>

        <div className="flex items-center opacity-40 min-w-0">
           <p className={`text-[7px] font-medium uppercase tracking-[0.2em] truncate ${isNightMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {entry.agency || 'Organization'}
           </p>
        </div>
      </div>
    </div>
  );
};

const LeaderboardList: React.FC<{ 
  title: string; 
  icon: React.ReactNode; 
  data: ArenaEntry[]; 
  loading: boolean;
  accentColor: string;
  isNightMode: boolean;
  isMultiColumn?: boolean;
  onSelectAgent: (agentId: string) => void;
}> = ({ title, icon, data, loading, accentColor, isNightMode, isMultiColumn, onSelectAgent }) => {
  const maxPremium = useMemo(() => {
    if (data.length === 0) return 0;
    return Math.max(...data.map(d => d.total_annualPremium));
  }, [data]);

  const halves = useMemo(() => {
    if (!isMultiColumn) return { left: data, right: [] };
    const mid = Math.ceil(data.length / 2);
    return {
      left: data.slice(0, mid),
      right: data.slice(mid)
    };
  }, [data, isMultiColumn]);

  return (
    <div className={`rounded-[2.5rem] shadow-sm overflow-hidden flex flex-col h-full transition-all border ${
      isNightMode ? 'bg-slate-900/60 border-white/5 backdrop-blur-3xl' : 'bg-white border-slate-100'
    }`}>
      <div className={`p-6 flex items-center justify-between shrink-0 border-b ${
        isNightMode ? 'bg-white/[0.03] border-white/10' : 'bg-slate-50/30 border-slate-50'
      }`}>
         <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${accentColor}`}>
              {icon}
            </div>
            <h3 className={`text-base font-black tracking-tight ${isNightMode ? 'text-white' : 'text-slate-900'}`}>
              {title}
            </h3>
         </div>
         <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className={`text-[9px] font-bold uppercase tracking-widest ${isNightMode ? 'text-slate-500' : 'text-slate-300'}`}>Live Updates</span>
         </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide overflow-x-hidden">
        {loading ? (
           <div className="p-20 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-brand-500 mb-4" />
              <p className="text-[10px] font-black uppercase tracking-widest">Tallying production...</p>
           </div>
        ) : data.length > 0 ? (
          isMultiColumn ? (
            <div className="flex flex-col md:flex-row h-full min-w-0">
              <div className={`flex-1 min-w-0 md:w-1/2 md:border-r ${isNightMode ? 'border-white/5' : 'border-slate-50'}`}>
                {halves.left.map((entry, i) => (
                  <LeaderboardItem 
                    key={entry.agent_id} 
                    entry={entry} 
                    index={i} 
                    maxPremium={maxPremium} 
                    isNightMode={isNightMode}
                    onSelectAgent={onSelectAgent} 
                  />
                ))}
              </div>
              <div className="flex-1 min-w-0 md:w-1/2">
                {halves.right.map((entry, i) => (
                  <LeaderboardItem 
                    key={entry.agent_id} 
                    entry={entry} 
                    index={i + halves.left.length} 
                    maxPremium={maxPremium} 
                    isNightMode={isNightMode}
                    onSelectAgent={onSelectAgent} 
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="">
              {data.map((entry, i) => (
                <LeaderboardItem 
                  key={entry.agent_id} 
                  entry={entry} 
                  index={i} 
                  maxPremium={maxPremium} 
                  isNightMode={isNightMode}
                  onSelectAgent={onSelectAgent} 
                />
              ))}
            </div>
          )
        ) : (
          <div className="p-20 text-center text-slate-300">
            <Clock className="w-10 h-10 mx-auto mb-4 opacity-10" />
            <p className="text-[10px] font-black uppercase tracking-widest">Awaiting production...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export interface AgentSummaryStats {
  agent_id: string;
  agent_name: string;
  agent_profile_url?: string | null;
  agency: string;
  production: AgentDetailsResponse['production'];
  sources: AgentDetailsResponse['sources'];
  carrier: AgentDetailsResponse['carrier'];
}

type TrainerHelpedAgent = {
  id: string;
  name: string;
  profileUrl?: string | null;
  apps: number;
  premium: number;
};

type TrainerSpecialization = {
  id: string;
  name: string;
  apps: number;
  premium: number;
};

type TrainerSummaryStats = {
  trainer_id: string;
  trainer_name: string;
  trainer_profile_url?: string | null;
  agency: string;
  production: AgentDetailsResponse['production'];
  specialized_sources: TrainerSpecialization[];
  specialized_types: TrainerSpecialization[];
  helped_agents: TrainerHelpedAgent[];
};

const emptyProduction: AgentDetailsResponse['production'] = {
  today: { premium: 0, apps: 0 },
  this_week: { premium: 0, apps: 0 },
  mtd: { premium: 0, apps: 0 },
  this_year: { premium: 0, apps: 0 },
};

const getProfileUrl = (value: any): string | null => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  return value.url || null;
};

const getFullName = (value: any, fallback = 'Unknown') => {
  if (!value) return fallback;
  const fullName = [value.first_name || value.firstName, value.last_name || value.lastName].filter(Boolean).join(' ');
  return value.trainer_name || value.agent_name || value.name || fullName || fallback;
};

const mapTrainerSpecializations = (items: any[], nameKeys: string[]): TrainerSpecialization[] => {
  return items.map((item, index) => {
    if (typeof item === 'string') {
      return { id: item, name: item, apps: 0, premium: 0 };
    }

    const name = nameKeys.map(key => item?.[key]).find(Boolean) || item?.label || `Specialization ${index + 1}`;
    return {
      id: item?.id || item?.source_id || item?.type_id || name,
      name,
      apps: Number(item?.apps || item?.records || item?.total_records || 0),
      premium: parseLeaderboardAmount(item?.premium ?? item?.total_annualPremium ?? item?.total_annual_premium),
    };
  }).filter((item) => item.name);
};

const mapTrainerDetails = (payload: TrainerDetailsResponse, fallback?: ArenaEntry): TrainerSummaryStats => {
  const root = (payload as any)?.data || (payload as any)?.item || payload || {};
  const trainer = root.trainer || root;
  const helpedAgents = Array.isArray(root.helped_agents)
    ? root.helped_agents
    : Array.isArray(root.helpedAgents)
      ? root.helpedAgents
      : [];

  return {
    trainer_id: trainer.trainer_id || trainer.id || fallback?.agent_id || '',
    trainer_name: getFullName(trainer, fallback?.agent_name || 'Trainer'),
    trainer_profile_url: getProfileUrl(trainer.trainer_profile || trainer.profile || fallback?.agent_profile),
    agency: trainer.agency_name || trainer.agency || fallback?.agency || 'Trainer',
    production: root.production || emptyProduction,
    specialized_sources: mapTrainerSpecializations(root.specialized_sources || root.specializedSources || [], ['source_name', 'name']),
    specialized_types: mapTrainerSpecializations(root.specialized_types || root.specializedTypes || [], ['product_type', 'product_name', 'type', 'name']),
    helped_agents: helpedAgents.map((agent: any) => ({
      id: agent.agent_id || agent.id || '',
      name: getFullName(agent, 'Agent'),
      profileUrl: getProfileUrl(agent.agent_profile || agent.profile),
      apps: Number(agent.apps || agent.records || agent.total_records || 0),
      premium: Number(agent.premium || agent.total_annualPremium || agent.total_annual_premium || 0),
    })).filter((agent: TrainerHelpedAgent) => agent.id || agent.name),
  };
};

export const AgentSummaryPopup: React.FC<{
  stats: AgentSummaryStats;
  isNightMode: boolean;
  onClose: () => void;
}> = ({ stats, isNightMode, onClose }) => {
  const prod = stats.production;
  const maxSourcePremium = stats.sources.length > 0 ? Math.max(...stats.sources.map(s => s.premium)) : 1;
  const maxCarrierPremium = stats.carrier.length > 0 ? Math.max(...stats.carrier.map(c => c.premium)) : 1;

  const fmtCurrency = (v: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
  const fmtCompact = (v: number) =>
    new Intl.NumberFormat('en-US', { notation: 'compact', style: 'currency', currency: 'USD', maximumFractionDigits: 1 }).format(v);

  const bands = [
    { label: 'Today',     accent: 'text-brand-400',   bg: 'bg-brand-500/10 border-brand-500/20',   data: prod.today },
    { label: 'This Week', accent: 'text-sky-400',      bg: 'bg-sky-500/10 border-sky-500/20',       data: prod.this_week },
    { label: 'MTD',       accent: 'text-indigo-400',   bg: 'bg-indigo-500/10 border-indigo-500/20', data: prod.mtd },
    { label: 'This Year', accent: 'text-emerald-400',  bg: 'bg-emerald-500/10 border-emerald-500/20', data: prod.this_year },
  ];

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300"
        onClick={onClose}
      />
      <div className={`relative w-full max-w-xl rounded-[3rem] shadow-2xl border animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[90vh] ${
        isNightMode ? 'bg-slate-900 border-white/10 shadow-black' : 'bg-white border-slate-200'
      }`}>

        {/* ── Hero header ── */}
        <div className="p-10 pb-6 bg-slate-950 relative overflow-hidden text-center shrink-0">
          <div className="absolute top-0 right-0 w-80 h-80 bg-brand-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white transition-all active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-24 h-24 rounded-[2.25rem] bg-white border-4 border-slate-800 shadow-2xl mb-5 overflow-hidden flex items-center justify-center ring-4 ring-brand-500/20">
              {stats.agent_profile_url
                ? <img src={stats.agent_profile_url} className="w-full h-full object-cover" alt="Profile" />
                : <span className="text-4xl font-black text-slate-900">{getInitials(stats.agent_name)}</span>}
            </div>
            <h3 className="text-2xl font-black text-white tracking-tight leading-none mb-1.5">{stats.agent_name}</h3>
            <div className="flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5 text-brand-400" />
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">{stats.agency}</span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide">
          <div className="p-8 space-y-8 animate-in fade-in duration-500">

            {/* ── 4-band production grid ── */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <Zap className="w-3.5 h-3.5 text-brand-500 fill-brand-500" />
                <h4 className={`text-[10px] font-black uppercase tracking-widest ${isNightMode ? 'text-slate-500' : 'text-slate-400'}`}>Production</h4>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {bands.map(({ label, accent, bg, data }) => (
                  <div key={label} className={`p-4 rounded-2xl border ${bg} flex flex-col gap-2`}>
                    <p className={`text-[8px] font-black uppercase tracking-widest ${accent}`}>{label}</p>
                    <p className={`text-xl font-black tracking-tighter ${isNightMode ? 'text-white' : 'text-slate-900'}`}>{fmtCompact(data.premium)}</p>
                    <p className={`text-[9px] font-bold ${isNightMode ? 'text-slate-500' : 'text-slate-400'}`}>{data.apps} app{data.apps !== 1 ? 's' : ''}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Sources breakdown ── */}
            {stats.sources.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <Share2 className="w-3.5 h-3.5 text-indigo-400" />
                  <h4 className={`text-[10px] font-black uppercase tracking-widest ${isNightMode ? 'text-slate-500' : 'text-slate-400'}`}>Lead Sources</h4>
                </div>
                <div className="space-y-2">
                  {stats.sources.map(src => (
                    <div key={src.name} className={`p-3.5 rounded-2xl border ${isNightMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <p className={`text-[10px] font-black truncate ${isNightMode ? 'text-white' : 'text-slate-800'}`}>{src.name}</p>
                        <div className="flex items-center gap-3 shrink-0 ml-3">
                          <span className={`text-[9px] font-bold ${isNightMode ? 'text-slate-400' : 'text-slate-500'}`}>{src.apps} apps</span>
                          <span className={`text-[10px] font-black ${isNightMode ? 'text-indigo-300' : 'text-indigo-600'}`}>{fmtCompact(src.premium)}</span>
                        </div>
                      </div>
                      <div className={`w-full h-1.5 rounded-full ${isNightMode ? 'bg-white/10' : 'bg-slate-200'} overflow-hidden`}>
                        <div
                          className="h-full rounded-full bg-indigo-500 transition-all duration-700"
                          style={{ width: `${Math.min((src.premium / maxSourcePremium) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Carrier breakdown ── */}
            {stats.carrier.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
                  <h4 className={`text-[10px] font-black uppercase tracking-widest ${isNightMode ? 'text-slate-500' : 'text-slate-400'}`}>Carriers</h4>
                </div>
                <div className="space-y-2">
                  {stats.carrier.map(car => (
                    <div key={car.name} className={`p-3.5 rounded-2xl border ${isNightMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <p className={`text-[10px] font-black truncate ${isNightMode ? 'text-white' : 'text-slate-800'}`}>{car.name}</p>
                        <div className="flex items-center gap-3 shrink-0 ml-3">
                          <span className={`text-[9px] font-bold ${isNightMode ? 'text-slate-400' : 'text-slate-500'}`}>{car.apps} apps</span>
                          <span className={`text-[10px] font-black ${isNightMode ? 'text-emerald-300' : 'text-emerald-600'}`}>{fmtCompact(car.premium)}</span>
                        </div>
                      </div>
                      <div className={`w-full h-1.5 rounded-full ${isNightMode ? 'bg-white/10' : 'bg-slate-200'} overflow-hidden`}>
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                          style={{ width: `${Math.min((car.premium / maxCarrierPremium) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>

        <div className={`p-8 pt-4 border-t shrink-0 ${isNightMode ? 'border-white/5 bg-slate-950' : 'border-slate-50 bg-slate-50/30'}`}>
          <button
            onClick={onClose}
            className={`w-full py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${
              isNightMode ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
            }`}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};

const TrainerDetailContent: React.FC<{
  stats: TrainerSummaryStats;
  isNightMode: boolean;
}> = ({ stats, isNightMode }) => {
  const fmtCompact = (v: number) =>
    new Intl.NumberFormat('en-US', { notation: 'compact', style: 'currency', currency: 'USD', maximumFractionDigits: 1 }).format(v || 0);
  const maxAgentPremium = stats.helped_agents.length > 0 ? Math.max(...stats.helped_agents.map(agent => agent.premium)) : 1;
  const bands = [
    { label: 'Today', accent: 'text-brand-400', bg: 'bg-brand-500/10 border-brand-500/20', data: stats.production.today },
    { label: 'This Week', accent: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/20', data: stats.production.this_week },
    { label: 'MTD', accent: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20', data: stats.production.mtd },
    { label: 'This Year', accent: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', data: stats.production.this_year },
  ];
  const hasSpecializations = stats.specialized_sources.length > 0 || stats.specialized_types.length > 0;
  const renderSpecializationList = (items: TrainerSpecialization[], accentClass: string, emptyText: string) => (
    items.length > 0 ? (
      <div className="flex flex-wrap gap-2">
        {items.map(item => (
          <div key={item.id || item.name} className={`px-3 py-2 rounded-xl border ${isNightMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-100'}`}>
            <p className={`text-[10px] font-black ${isNightMode ? 'text-white' : 'text-slate-800'}`}>{item.name}</p>
            {(item.apps > 0 || item.premium > 0) && (
              <div className="mt-1 flex items-center gap-2">
                {item.apps > 0 && <span className={`text-[9px] font-bold ${isNightMode ? 'text-slate-500' : 'text-slate-400'}`}>{item.apps} apps</span>}
                {item.premium > 0 && <span className={`text-[9px] font-black ${accentClass}`}>{fmtCompact(item.premium)}</span>}
              </div>
            )}
          </div>
        ))}
      </div>
    ) : (
      <p className={`text-xs font-bold ${isNightMode ? 'text-slate-600' : 'text-slate-400'}`}>{emptyText}</p>
    )
  );

  return (
    <div className="space-y-6">
      <section className={`rounded-[2rem] overflow-hidden border shadow-sm ${isNightMode ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-100'}`}>
        <div className="p-8 bg-slate-950 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-brand-500/10 rounded-full blur-[110px] -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6">
            <div className="w-24 h-24 rounded-[2rem] bg-white border-4 border-slate-800 shadow-2xl overflow-hidden flex items-center justify-center ring-4 ring-brand-500/20 shrink-0">
              {stats.trainer_profile_url
                ? <img src={stats.trainer_profile_url} className="w-full h-full object-cover" alt="Trainer profile" />
                : <span className="text-4xl font-black text-slate-900">{getInitials(stats.trainer_name)}</span>}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black text-brand-400 uppercase tracking-[0.25em] mb-2">Trainer Detail</p>
              <h1 className="text-3xl font-black text-white tracking-tight leading-none mb-3">{stats.trainer_name}</h1>
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-400" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] truncate">{stats.agency}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={`rounded-[2rem] border p-6 shadow-sm ${isNightMode ? 'bg-slate-900/60 border-white/10' : 'bg-white border-slate-100'}`}>
        <div className="flex items-center gap-2 mb-5">
          <Zap className="w-4 h-4 text-brand-500 fill-brand-500" />
          <h2 className={`text-xs font-black uppercase tracking-widest ${isNightMode ? 'text-slate-400' : 'text-slate-500'}`}>Trainer Production</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {bands.map(({ label, accent, bg, data }) => (
            <div key={label} className={`p-5 rounded-2xl border ${bg} flex flex-col gap-2`}>
              <p className={`text-[9px] font-black uppercase tracking-widest ${accent}`}>{label}</p>
              <p className={`text-2xl font-black tracking-tighter ${isNightMode ? 'text-white' : 'text-slate-900'}`}>{fmtCompact(data?.premium || 0)}</p>
              <p className={`text-[10px] font-bold ${isNightMode ? 'text-slate-500' : 'text-slate-400'}`}>{data?.apps || 0} app{data?.apps !== 1 ? 's' : ''}</p>
            </div>
          ))}
        </div>
      </section>

      {hasSpecializations && (
        <section className={`rounded-[2rem] border p-6 shadow-sm ${isNightMode ? 'bg-slate-900/60 border-white/10' : 'bg-white border-slate-100'}`}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Share2 className="w-4 h-4 text-indigo-400" />
                <h2 className={`text-xs font-black uppercase tracking-widest ${isNightMode ? 'text-slate-400' : 'text-slate-500'}`}>Specialized Sources</h2>
              </div>
              {renderSpecializationList(stats.specialized_sources, isNightMode ? 'text-indigo-300' : 'text-indigo-600', 'No specialized sources yet')}
            </div>

            <div>
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-4 h-4 text-emerald-400" />
                <h2 className={`text-xs font-black uppercase tracking-widest ${isNightMode ? 'text-slate-400' : 'text-slate-500'}`}>Specialized Types</h2>
              </div>
              {renderSpecializationList(stats.specialized_types, isNightMode ? 'text-emerald-300' : 'text-emerald-600', 'No specialized types yet')}
            </div>
          </div>
        </section>
      )}

      <section className={`rounded-[2rem] border p-6 shadow-sm ${isNightMode ? 'bg-slate-900/60 border-white/10' : 'bg-white border-slate-100'}`}>
        <div className="flex items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-indigo-400" />
            <h2 className={`text-xs font-black uppercase tracking-widest ${isNightMode ? 'text-slate-400' : 'text-slate-500'}`}>Helped Agents</h2>
          </div>
          <span className={`text-[10px] font-black uppercase tracking-widest ${isNightMode ? 'text-slate-600' : 'text-slate-300'}`}>{stats.helped_agents.length} total</span>
        </div>

        {stats.helped_agents.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {stats.helped_agents.map(agent => (
              <div key={agent.id || agent.name} className={`p-4 rounded-2xl border flex items-center gap-4 ${isNightMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                <div className={`w-11 h-11 rounded-2xl overflow-hidden shrink-0 flex items-center justify-center ${isNightMode ? 'bg-slate-800 text-slate-500' : 'bg-white text-slate-400'}`}>
                  {agent.profileUrl ? <img src={agent.profileUrl} className="w-full h-full object-cover" alt={agent.name} /> : <span className="text-[10px] font-black">{getInitials(agent.name)}</span>}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <p className={`text-sm font-black truncate ${isNightMode ? 'text-white' : 'text-slate-800'}`}>{agent.name}</p>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`text-[10px] font-bold ${isNightMode ? 'text-slate-400' : 'text-slate-500'}`}>{agent.apps} apps</span>
                      <span className={`text-xs font-black ${isNightMode ? 'text-indigo-300' : 'text-indigo-600'}`}>{fmtCompact(agent.premium)}</span>
                    </div>
                  </div>
                  <div className={`w-full h-1.5 rounded-full ${isNightMode ? 'bg-white/10' : 'bg-slate-200'} overflow-hidden`}>
                    <div className="h-full rounded-full bg-indigo-500 transition-all duration-700" style={{ width: `${Math.min((agent.premium / maxAgentPremium) * 100, 100)}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={`rounded-2xl border p-10 text-center ${isNightMode ? 'bg-white/5 border-white/5 text-slate-500' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
            <p className="text-xs font-black uppercase tracking-widest">No helped agents yet</p>
          </div>
        )}
      </section>
    </div>
  );
};

export const TrainerDetailPage: React.FC = () => {
  const { trainerId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [stats, setStats] = useState<TrainerSummaryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isNightMode = localStorage.getItem('arena_theme') === 'night';
  const arenaQuery = searchParams.toString();
  const arenaBackUrl = arenaQuery ? `/leaderboard/realtime?${arenaQuery}` : '/leaderboard/realtime';

  useEffect(() => {
    if (!trainerId) {
      setError('Trainer id is missing.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    agentleaderboardRealtimeApi.getTrainerDetails(trainerId)
      .then(res => setStats(mapTrainerDetails(res)))
      .catch((err) => {
        console.error('Trainer detail fetch failed:', err);
        setError('Unable to load trainer details.');
      })
      .finally(() => setLoading(false));
  }, [trainerId]);

  return (
    <div className={`relative min-h-screen pb-12 ${isNightMode ? 'bg-black text-white' : 'text-slate-900'}`}>
      <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">
        <button
          onClick={() => navigate(arenaBackUrl)}
          className={`inline-flex items-center gap-2 px-5 py-3 rounded-2xl border text-xs font-black uppercase tracking-widest transition-all active:scale-95 ${
            isNightMode ? 'bg-slate-900 border-white/10 text-slate-300 hover:text-white' : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 shadow-sm'
          }`}
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Arena
        </button>

        {loading ? (
          <div className={`rounded-[2rem] border p-16 flex flex-col items-center justify-center ${isNightMode ? 'bg-slate-900/60 border-white/10' : 'bg-white border-slate-100'}`}>
            <Loader2 className="w-8 h-8 animate-spin text-brand-500 mb-4" />
            <p className={`text-xs font-black uppercase tracking-widest ${isNightMode ? 'text-slate-500' : 'text-slate-400'}`}>Loading trainer details...</p>
          </div>
        ) : error ? (
          <div className={`rounded-[2rem] border p-10 ${isNightMode ? 'bg-slate-900/60 border-white/10 text-slate-300' : 'bg-white border-slate-100 text-slate-600'}`}>
            <p className="text-sm font-black">{error}</p>
          </div>
        ) : stats ? (
          <TrainerDetailContent stats={stats} isNightMode={isNightMode} />
        ) : null}
      </div>
    </div>
  );
};

export const AgentleaderboardRealtime: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sourceId = searchParams.get('sourceId') || undefined;
  const sourceNameParam = searchParams.get('sourceName') || undefined;
  const teamId = searchParams.get('teamId') || undefined;
  const _tfParam = searchParams.get('timeframe') || '';
  const _modeParam = searchParams.get('mode') || '';
  const initTimeframe = leaderboardTimeframes.includes(_tfParam as LeaderboardTimeframe) ? _tfParam as LeaderboardTimeframe : 'today';
  const initMode = leaderboardModes.includes(_modeParam as LeaderboardMode) ? _modeParam as LeaderboardMode : 'agent';
  const initStartDate = searchParams.get('startDate') || '';
  const initEndDate = searchParams.get('endDate') || '';
  const { latestSale } = useRealtime();
  
  const [isNightMode, setIsNightMode] = useState(() => {
    return localStorage.getItem('arena_theme') === 'night';
  });

  // EFFECT: SET GLOBAL BACKGROUND FOR DIV#ROOT, BODY, MAIN AND HEADER
  useEffect(() => {
    const root = document.getElementById('root');
    const body = document.body;
    const main = document.querySelector('main');
    const header = document.querySelector('header');
    const appWrapper = document.querySelector('.bg-\\[\\#F2F3F5\\]'); // Targeting the outer app div
    
    if (isNightMode) {
      body.style.backgroundColor = '#000000';
      if (root) root.style.backgroundColor = '#000000';
      if (main) main.style.backgroundColor = '#000000';
      if (appWrapper instanceof HTMLElement) appWrapper.style.backgroundColor = '#000000';
      if (header) {
          header.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
          header.style.transition = 'all 0.5s ease';
          header.style.borderBottom = '1px solid rgba(255, 255, 255, 0.05)';
          const h2 = header.querySelector('h2');
          if (h2) h2.style.color = '#ffffff';
      }
    } else {
      body.style.backgroundColor = '';
      if (root) root.style.backgroundColor = '';
      if (main) main.style.backgroundColor = '';
      if (appWrapper instanceof HTMLElement) appWrapper.style.backgroundColor = '';
      if (header) {
          header.style.backgroundColor = '';
          header.style.borderBottom = '';
          const h2 = header.querySelector('h2');
          if (h2) h2.style.color = '';
      }
    }
    
    return () => {
      body.style.backgroundColor = '';
      if (root) root.style.backgroundColor = '';
      if (main) main.style.backgroundColor = '';
      if (appWrapper instanceof HTMLElement) appWrapper.style.backgroundColor = '';
      if (header) {
          header.style.backgroundColor = '';
          header.style.borderBottom = '';
          const h2 = header.querySelector('h2');
          if (h2) h2.style.color = '';
      }
    };
  }, [isNightMode]);

  const [todayData, setTodayData] = useState<ArenaEntry[]>([]);
  const [mtdData, setMtdData] = useState<ArenaEntry[]>([]);
  const [todaySummary, setTodaySummary] = useState({ total_premium: 0, total_records: 0 });
  const [mtdSummary, setMtdSummary] = useState({ total_premium: 0, total_records: 0 });
  const [weekSummary, setWeekSummary] = useState({ total_premium: 0, total_records: 0 });
  const [yearSummary, setYearSummary] = useState({ total_premium: 0, total_records: 0 });
  const [arenaFeed, setArenaFeed] = useState<SaleRecord[]>([]);

  // Integrated Leaderboard States
  const [unifiedData, setUnifiedData] = useState<ArenaEntry[]>([]);
  const [leaderboardMode, setLeaderboardMode] = useState<LeaderboardMode>(initMode);
  const [timeframe, setTimeframe] = useState<LeaderboardTimeframe>(initTimeframe);
  const [dateRange, setDateRange] = useState({ startDate: initStartDate, endDate: initEndDate });
  const [selectedTeamsFilter, setSelectedTeamsFilter] = useState<string[]>(teamId ? [teamId] : []);
  const [selectedAgentsFilter, setSelectedAgentsFilter] = useState<string[]>([]);
  const [selectedSourceFilter, setSelectedSourceFilter] = useState<string | undefined>(sourceId);
  const [selectedSourceName, setSelectedSourceName] = useState<string | undefined>(sourceNameParam);
  const [selectedAgencyFilter, setSelectedAgencyFilter] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSync, setLastSync] = useState<string>('Initializing');
  const [mtCountdown, setMtCountdown] = useState('00:00:00');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [agentDetailStats, setAgentDetailStats] = useState<AgentSummaryStats | null>(null);
  const [agentDetailLoading, setAgentDetailLoading] = useState(false);

  const buildArenaQuery = useCallback((modeOverride?: LeaderboardMode) => {
    const params = new URLSearchParams();
    params.set('mode', modeOverride || leaderboardMode);
    params.set('timeframe', timeframe);
    if (dateRange.startDate) params.set('startDate', dateRange.startDate);
    if (dateRange.endDate) params.set('endDate', dateRange.endDate);
    if (selectedTeamsFilter[0]) params.set('teamId', selectedTeamsFilter[0]);
    if (selectedSourceFilter) params.set('sourceId', selectedSourceFilter);
    if (selectedSourceName) params.set('sourceName', selectedSourceName);
    return params.toString();
  }, [dateRange.endDate, dateRange.startDate, leaderboardMode, selectedSourceFilter, selectedSourceName, selectedTeamsFilter, timeframe]);

  useEffect(() => {
    if (!selectedAgentId) { setAgentDetailStats(null); return; }
    setAgentDetailLoading(true);
    agentleaderboardRealtimeApi.getAgentDetails(selectedAgentId)
      .then(res => {
        const todayMatch = todayData.find(e => e.agent_id === selectedAgentId);
        const mtdMatch = mtdData.find(e => e.agent_id === selectedAgentId);
        const feedMatch = arenaFeed.find(e => e.agentId === selectedAgentId);
        setAgentDetailStats({
          agent_id: selectedAgentId,
          agent_name: todayMatch?.agent_name || mtdMatch?.agent_name || feedMatch?.agentOwner_name || 'Agent',
          agent_profile_url: todayMatch?.agent_profile?.url || mtdMatch?.agent_profile?.url || null,
          agency: todayMatch?.agency || mtdMatch?.agency || feedMatch?.teamName || 'Organization',
          production: res.production,
          sources: res.sources,
          carrier: res.carrier,
        });
      })
      .catch(console.error)
      .finally(() => setAgentDetailLoading(false));
  }, [selectedAgentId]);

  const toggleTheme = () => {
    const next = !isNightMode;
    setIsNightMode(next);
    localStorage.setItem('arena_theme', next ? 'night' : 'light');
  };

  // Dynamically extract agents from the currently loaded leaderboard payload 
  // so you don't have to query a separate /meta list!
  const availableAgents = useMemo(() => {
    if (leaderboardMode !== 'agent') return [];
    return unifiedData.map(a => ({
      id: a.agent_id,
      name: a.agent_name
    }));
  }, [unifiedData, leaderboardMode]);

  const availableAgencies = useMemo(() => {
    if (leaderboardMode !== 'agent') return [];
    const seen = new Set<string>();
    return unifiedData
      .filter(a => a.agency && !seen.has(a.agency) && seen.add(a.agency))
      .map(a => ({ id: a.agency, name: a.agency }));
  }, [unifiedData, leaderboardMode]);

  const displayData = useMemo(() => {
    if (leaderboardMode !== 'agent' || selectedAgencyFilter.length === 0) return unifiedData;
    return unifiedData.filter(a => selectedAgencyFilter.includes(a.agency));
  }, [unifiedData, selectedAgencyFilter, leaderboardMode]);

  // For teams and sources, you can either pass them in as props, fetch them globally, 
  // or derive them from the data if your API payload includes them. 
  // For now, left as empty arrays or you can map them similarly.
  const [availableTeams, setAvailableTeams] = useState<{ id: string; name: string }[]>([]);
  const [availableSources, setAvailableSources] = useState<{ id: string; name: string }[]>([]);



  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const mtString = now.toLocaleString("en-US", { timeZone: "America/Denver" });
      const mtNow = new Date(mtString);
      const mtMidnight = new Date(mtString);
      mtMidnight.setHours(24, 0, 0, 0);
      const diff = mtMidnight.getTime() - mtNow.getTime();
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      setMtCountdown(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  const refreshArena = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    setRefreshing(true);
    try {
      const activeTeamId = selectedTeamsFilter.length > 0 ? selectedTeamsFilter[0] : undefined;
      const activeSourceId = selectedSourceFilter;

      const [todayRes, mtdRes, weekYearRes, feedRes] = await Promise.all([
        agentleaderboardRealtimeApi.getRealtimeLeaderboard(null, activeSourceId, activeTeamId),
        agentleaderboardRealtimeApi.getMTDLeaderboard(activeSourceId, activeTeamId),
        agentleaderboardRealtimeApi.getWeekYearStats(activeSourceId, activeTeamId),
        agentleaderboardRealtimeApi.getArenaFeed(activeSourceId, activeTeamId)
      ]);

      setTodayData(todayRes.today_rundown || []);
      setTodaySummary(todayRes.applications || { total_premium: 0, total_records: 0 });
      setMtdData(mtdRes.mtd_rundown || []);
      setMtdSummary(mtdRes.applications || { total_premium: 0, total_records: 0 });
      setWeekSummary(weekYearRes.week_application || { total_premium: 0, total_records: 0 });
      setYearSummary(weekYearRes.year_application || { total_premium: 0, total_records: 0 });
      setArenaFeed(feedRes || []);

      let finalUnifiedData: ArenaEntry[] = [];
      const timestampRange = getLeaderboardTimestampRange(timeframe, dateRange);
      const basePayload = {
        timeframe,
        startDate: timestampRange.startDate,
        endDate: timestampRange.endDate,
      };

      if (leaderboardMode === 'agent') {
        const agentsRaw = await agentleaderboardRealtimeApi.getAgentLeaderboard({
          ...basePayload,
          teamId: selectedTeamsFilter.length > 0 ? selectedTeamsFilter[0] : null,
          sourceId: selectedSourceFilter || null,
        });
        const agentsData = Array.isArray(agentsRaw) ? agentsRaw : (agentsRaw as any)?.rundown ?? [];
        finalUnifiedData = agentsData.map((a: any) => ({
          agent_id: a.agent_id,
          agent_name: a.agent_name,
          total_annualPremium: a.total_annualPremium,
          records: a.records,
          agency: a.agency || '',
          agent_profile: a.agent_profile
        }));
      } else if (leaderboardMode === 'team') {
        const teamsRaw = await agentleaderboardRealtimeApi.getTeamLeaderboard(basePayload);
        const teamsData = Array.isArray(teamsRaw) ? teamsRaw : (teamsRaw as any)?.rundown ?? [];
        finalUnifiedData = teamsData.map((t: any) => ({
          agent_id: t.team_id,
          agent_name: t.team_name,
          total_annualPremium: t.total_annualPremium,
          records: t.records,
          agency: 'Team'
        }));
      } else if (leaderboardMode === 'source') {
        const sourceRaw = await agentleaderboardRealtimeApi.getSourceLeaderboard(basePayload);
        const sourceData = Array.isArray(sourceRaw) ? sourceRaw : (sourceRaw as any)?.rundown ?? [];
        finalUnifiedData = sourceData.map((s: any) => ({
          agent_id: s.source_id,
          agent_name: s.source_name,
          total_annualPremium: s.total_annualPremium,
          records: s.records,
          agency: 'Source'
        }));
      } else if (leaderboardMode === 'trainer') {
        const trainerRaw = await agentleaderboardRealtimeApi.getTrainerLeaderboard({
          ...basePayload,
          teamId: selectedTeamsFilter.length > 0 ? selectedTeamsFilter[0] : null,
          sourceId: selectedSourceFilter || null,
        });
        const trainerData = Array.isArray(trainerRaw) ? trainerRaw : (trainerRaw as any)?.rundown ?? [];
        finalUnifiedData = trainerData.map((trainer: any) => ({
          agent_id: trainer.trainer_id || trainer.agent_id || trainer.id,
          agent_name: trainer.trainer_name || trainer.agent_name || trainer.name || [trainer.first_name, trainer.last_name].filter(Boolean).join(' '),
          total_annualPremium: parseLeaderboardAmount(trainer.total_annualPremium ?? trainer.total_annual_premium ?? trainer.premium),
          records: trainer.records || trainer.apps || trainer.total_records || 0,
          agency: trainer.agency || trainer.agency_name || 'Trainer',
          agent_profile: trainer.trainer_profile || trainer.agent_profile || trainer.profile || null
        }))
          .filter((trainer: ArenaEntry) => trainer.agent_id)
          .sort((a: ArenaEntry, b: ArenaEntry) => b.total_annualPremium - a.total_annualPremium);
      }
      setUnifiedData(finalUnifiedData);

      // Resolve source name from fetched data when coming from URL param
      if (sourceId && !selectedSourceName) {
        const match = finalUnifiedData.find(d => d.agent_id === sourceId);
        if (match) setSelectedSourceName(match.agent_name);
      }
      
      setLastSync(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (error) {
      console.error("Realtime Refresh Error:", error);
    } finally {
      if (isInitial) setLoading(false);
      setRefreshing(false);
    }
  }, [sourceId, teamId, timeframe, dateRange, leaderboardMode, selectedTeamsFilter, selectedAgentsFilter, selectedSourceFilter]);

  useEffect(() => { refreshArena(true); }, [refreshArena]);
  useEffect(() => { if (latestSale) refreshArena(); }, [latestSale, refreshArena]);

  const featuredVictory = arenaFeed[0] || null;
  const previousVictories = arenaFeed.slice(1);
  const MT_SHIFT = 2 * 60 * 60 * 1000;

  return (
    <div className={`relative min-h-screen transition-colors duration-500 pb-12 ${isNightMode ? 'bg-black text-white' : 'text-slate-900'}`}>
      <div className="space-y-8 animate-in fade-in duration-700 relative z-10 max-w-[1800px] mx-auto">
        {selectedAgentId && agentDetailLoading && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setSelectedAgentId(null)} />
            <div className="relative w-16 h-16 rounded-full border border-white/10 bg-slate-900 flex items-center justify-center">
              <Loader2 className="animate-spin w-8 h-8 text-emerald-400" />
            </div>
          </div>
        )}
        {selectedAgentId && agentDetailStats && !agentDetailLoading && (
          <AgentSummaryPopup stats={agentDetailStats} isNightMode={isNightMode} onClose={() => { setSelectedAgentId(null); setAgentDetailStats(null); }} />
        )}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-1">
          <div className="flex items-center gap-6">
            <div>
              <h1 className={`text-3xl font-black tracking-tight flex items-center gap-3 ${isNightMode ? 'text-white' : 'text-slate-900'}`}>
                Realtime Leaderboard <Zap className="w-8 h-8 text-brand-500 fill-brand-500 animate-pulse" />
              </h1>
              <p className={`font-bold uppercase text-[9px] tracking-[0.25em] mt-1 ${isNightMode ? 'text-slate-500' : 'text-slate-400'}`}>Global Competition Matrix</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={toggleTheme}
              className={`p-3 rounded-2xl transition-all border shadow-sm flex items-center justify-center group ${
                isNightMode ? 'bg-slate-900 border-white/10 text-brand-400 hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-400 hover:text-navy-900'
              }`}
            >
              {isNightMode ? <Sun className="w-4 h-4 animate-in spin-in-90" /> : <Moon className="w-4 h-4 animate-in spin-in-90" />}
            </button>

            <div className={`hidden lg:flex items-center gap-3 px-5 py-3 border rounded-2xl shadow-sm transition-colors ${isNightMode ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-100'}`}>
               <RefreshCw className={`w-3 h-3 text-emerald-500 ${refreshing ? 'animate-spin' : ''}`} />
               <div className="flex flex-col">
                  <span className={`text-[7px] font-black uppercase tracking-widest leading-none ${isNightMode ? 'text-slate-600' : 'text-slate-400'}`}>Synced</span>
                  <span className={`text-xs font-black tabular-nums leading-none mt-1 ${isNightMode ? 'text-white' : 'text-slate-900'}`}>{lastSync}</span>
               </div>
            </div>

            <div className={`hidden lg:flex items-center gap-2.5 border px-5 py-3 rounded-2xl shadow-sm transition-colors ${isNightMode ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-100'}`}>
               <Clock className="w-3.5 h-3.5 text-brand-500" />
               <div className="flex flex-col">
                  <span className={`text-[7px] font-black uppercase tracking-widest leading-none ${isNightMode ? 'text-slate-600' : 'text-slate-400'}`}>Cycle Ends</span>
                  <span className={`text-xs font-black font-mono tabular-nums leading-none mt-1 ${isNightMode ? 'text-white' : 'text-slate-900'}`}>{mtCountdown}</span>
               </div>
            </div>

            <div className={`flex items-center gap-3 px-6 py-3 rounded-2xl shadow-xl border ${isNightMode ? 'bg-slate-900 border-brand-500/20 shadow-brand-500/5' : 'bg-slate-900 text-white border-white/5'}`}>
               <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
               <span className={`text-[10px] font-black uppercase tracking-widest ${isNightMode ? 'text-emerald-400' : 'text-white'}`}>Stream Active</span>
            </div>

            <button 
              onClick={() => navigate('/')}
              className={`flex items-center gap-2 px-6 py-3 border rounded-2xl font-black text-xs transition-all shadow-sm ${
                isNightMode ? 'bg-slate-900 border-white/10 text-slate-300 hover:text-white' : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span className="uppercase tracking-widest">Dashboard</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 items-stretch h-[800px]">
          <div className="xl:col-span-3 flex flex-col h-full overflow-hidden">
            <LeaderboardControls 
              isNightMode={isNightMode}
              mode={leaderboardMode}
              setMode={setLeaderboardMode}
              timeframe={timeframe}
              setTimeframe={setTimeframe}
              dateRange={dateRange}
              setDateRange={setDateRange}
              availableTeams={availableTeams}
              availableAgents={availableAgents}
              availableSources={availableSources}
              availableAgencies={availableAgencies}
              selectedTeamsFilter={selectedTeamsFilter}
              setSelectedTeamsFilter={setSelectedTeamsFilter}
              selectedAgentsFilter={selectedAgentsFilter}
              setSelectedAgentsFilter={setSelectedAgentsFilter}
              selectedSourceFilter={selectedSourceFilter}
              selectedSourceName={selectedSourceName}
              setSelectedSourceFilter={(id) => { setSelectedSourceFilter(id); if (!id) setSelectedSourceName(undefined); }}
              selectedAgencyFilter={selectedAgencyFilter}
              setSelectedAgencyFilter={setSelectedAgencyFilter}
            />
            
            <div className="flex-1 min-h-0">
              {selectedAgentsFilter.length > 1 ? (
                <AgentComparisonView 
                  agents={displayData.filter(a => selectedAgentsFilter.includes(a.agent_id))} 
                  isNightMode={isNightMode} 
                  onClear={() => setSelectedAgentsFilter([])}
                  onRemoveAgent={(id) => setSelectedAgentsFilter(prev => prev.filter(p => p !== id))}
                  todayData={todayData}
                  mtdData={mtdData}
                  arenaFeed={arenaFeed}
                />
              ) : (
                <LeaderboardList 
                  title={`Global Rankings - ${leaderboardMode.toUpperCase()} (${timeframe.toUpperCase()})`} 
                  icon={<Trophy className="w-4 h-4 fill-indigo-500" />} 
                  data={selectedAgentsFilter.length === 1 ? displayData.filter(a => a.agent_id === selectedAgentsFilter[0]) : displayData} 
                  loading={loading} 
                  isNightMode={isNightMode} 
                  accentColor="bg-indigo-50 text-indigo-600" 
                  isMultiColumn={true} 
                  onSelectAgent={(id) => {
                     if (leaderboardMode === 'team') {
                        setSelectedTeamsFilter([id]);
                        setLeaderboardMode('agent');
                     } else if (leaderboardMode === 'source') {
                        const sourceName = unifiedData.find(d => d.agent_id === id)?.agent_name;
                        setSelectedSourceFilter(id);
                        setSelectedSourceName(sourceName);
                        setLeaderboardMode('agent');
                     } else if (leaderboardMode === 'trainer') {
                        navigate(`/leaderboard/trainer/${id}?${buildArenaQuery('trainer')}`);
                     } else {
                        setSelectedAgentId(id);
                     }
                  }} 
                />
              )}
            </div>
          </div>

          <div className="xl:col-span-1 flex flex-col h-full gap-6">
            <div className={`rounded-[2.5rem] p-8 relative overflow-hidden shadow-2xl h-[400px] flex flex-col transition-all duration-500 border ${isNightMode ? 'bg-slate-900 border-white/10 shadow-black/50' : 'bg-slate-900 border-transparent text-white'}`}>
               <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2"></div>
               <div className="relative z-10 flex flex-col h-full">
                  <div className="flex items-center justify-between mb-8 shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white/10 rounded-xl border border-white/10 text-brand-400"><Activity className="w-4 h-4" /></div>
                      <h3 className="text-base font-black tracking-tight text-white">Arena Pulse</h3>
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto scrollbar-hide pr-1 space-y-6">
                     {[
                        { label: 'Daily Pulse', amount: todaySummary.total_premium, count: todaySummary.total_records, color: 'brand', icon: Zap },
                        { label: 'Weekly Growth', amount: weekSummary.total_premium, count: weekSummary.total_records, color: 'emerald', icon: BarChart3 },
                        { label: 'MTD Enterprise', amount: mtdSummary.total_premium, count: mtdSummary.total_records, color: 'indigo', icon: TrendingUp },
                        { label: 'Annual Momentum', amount: yearSummary.total_premium, count: yearSummary.total_records, color: 'violet', icon: Crown }
                     ].map((item, idx) => (
                        <div key={idx} className="animate-in fade-in slide-in-from-top-2" style={{ animationDelay: `${idx * 100}ms` }}>
                            <div className="flex items-center gap-2 mb-2">
                               <div className={`w-1 h-3 rounded-full bg-${item.color}-500`}></div>
                               <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{item.label}</p>
                            </div>
                            <div className={`bg-${item.color}-500/10 p-4 rounded-2xl border border-${item.color}-500/20`}>
                                <div className="text-xl font-black text-white tracking-tighter">{formatCurrency(item.amount)}</div>
                                <div className="mt-1 flex items-center justify-between opacity-50">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Total Premium</span>
                                    <span className="text-[10px] font-black text-white">{item.count.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                     ))}
                  </div>
               </div>
            </div>
            
            <div className={`rounded-[2.5rem] p-8 shadow-sm overflow-hidden relative flex-1 flex flex-col min-h-0 border transition-all ${
              isNightMode ? 'bg-slate-900/60 border-white/5 backdrop-blur-2xl' : 'bg-white border-slate-100'
            }`}>
               <div className="absolute top-0 right-0 w-24 h-24 bg-brand-50/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
               <div className="flex items-center justify-between mb-6 relative z-10 shrink-0">
                  <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-slate-950 rounded-lg text-brand-500 border border-white/5 shadow-lg"><Star className="w-3.5 h-3.5 fill-brand-500" /></div>
                      <h3 className={`text-xs font-black uppercase tracking-widest ${isNightMode ? 'text-white' : 'text-slate-900'}`}>Victory Feed</h3>
                  </div>
                  <div className="flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Live</span>
                  </div>
               </div>

               <div className="flex-1 overflow-y-auto scrollbar-hide pr-1 relative z-10 space-y-6">
                  {featuredVictory ? (
                     <>
                        <div className="animate-in slide-in-from-bottom-2 duration-500">
                          <div className={`flex items-center gap-4 p-4 bg-slate-950 rounded-3xl border border-white/5 shadow-2xl group hover:scale-[1.02] transition-transform cursor-pointer ${isNightMode ? 'ring-1 ring-emerald-500/10' : ''}`} onClick={() => setSelectedAgentId(featuredVictory.agentId)}>
                              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-brand-500 shadow-lg shrink-0 overflow-hidden relative">
                                  <Zap className="w-6 h-6 fill-brand-500 relative z-10" />
                                  <div className="absolute inset-0 bg-brand-500/20 animate-pulse"></div>
                              </div>
                              <div className="min-w-0">
                                  <p className="text-[12px] font-black text-white truncate">{featuredVictory.agentOwner_name}</p>
                                  <div className="flex items-center gap-2 mt-0.5 opacity-60">
                                      <p className="text-[8px] font-bold text-slate-400 uppercase truncate">{featuredVictory.policyCarrier}</p>
                                      <p className="text-[8px] font-bold text-slate-400 uppercase truncate">{featuredVictory.teamName}</p>
                                  </div>
                              </div>
                          </div>
                          <div className="text-center mt-6">
                              <p className="text-4xl font-black text-emerald-500 tracking-tighter drop-shadow-[0_2px_15px_rgba(16,185,129,0.3)]">{formatCurrency(featuredVictory.annual_premium)}</p>
                              <p className={`text-[9px] font-bold uppercase tracking-[0.2em] mt-2 ${isNightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                  {new Date(featuredVictory.created_at - MT_SHIFT).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Denver' })} MT
                              </p>
                          </div>
                        </div>

                        {previousVictories.length > 0 && (
                            <div className={`pt-6 border-t space-y-3 ${isNightMode ? 'border-white/5' : 'border-slate-50'}`}>
                               <p className={`text-[9px] font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2 ${isNightMode ? 'text-slate-600' : 'text-slate-300'}`}><History className="w-3 h-3" /> Recent (MT)</p>
                               {previousVictories.map((sale) => (
                                  <div key={sale.id} onClick={() => setSelectedAgentId(sale.agentId)} className={`flex items-center justify-between p-3 rounded-2xl border transition-all group cursor-pointer active:scale-[0.98] ${
                                    isNightMode ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-slate-50/30 border-slate-50 hover:bg-white hover:shadow-md'
                                  }`}>
                                      <div className="flex items-center gap-3 min-w-0">
                                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black shrink-0 transition-colors ${
                                            isNightMode ? 'bg-slate-800 text-slate-500 border border-slate-700' : 'bg-slate-100 text-slate-400 border border-slate-200'
                                          } group-hover:bg-slate-900 group-hover:text-brand-500`}>{getInitials(sale.agentOwner_name)}</div>
                                          <div className="min-w-0">
                                              <p className={`text-[10px] font-black truncate leading-none mb-1 ${isNightMode ? 'text-slate-100' : 'text-slate-900'}`}>{sale.agentOwner_name}</p>
                                              <p className={`text-[8px] font-bold uppercase tracking-tight truncate ${isNightMode ? 'text-slate-500' : 'text-slate-400'}`}>{sale.policyCarrier}</p>
                                          </div>
                                      </div>
                                      <div className="text-right ml-4 shrink-0">
                                          <p className="text-[11px] font-black text-emerald-500 tracking-tighter">${sale.annual_premium.toLocaleString()}</p>
                                          <p className={`text-[7px] font-bold uppercase ${isNightMode ? 'text-slate-600' : 'text-slate-300'}`}>{new Date(sale.created_at - MT_SHIFT).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                                      </div>
                                  </div>
                               ))}
                            </div>
                        )}
                     </>
                  ) : (
                     <div className="text-center py-20 text-slate-300 flex flex-col items-center">
                        <Clock className="w-8 h-8 mb-4 opacity-10" />
                        <p className="text-[9px] font-black uppercase tracking-widest px-4 leading-relaxed">Waiting for data...</p>
                     </div>
                  )}
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};





