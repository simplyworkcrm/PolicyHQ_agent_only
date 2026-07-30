
import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Search, Trophy, X, Crown, Target, ChevronRight, Briefcase, User, Users, FileCheck, CheckCircle2, GitBranch, TrendingUp } from 'lucide-react';
import { AllTimeLeaderboardEntry, CarrierBreakdown, TeamRankingEntry } from '../../services/agentOverviewApi';
import { getAgencyName, formatCurrencyCompact } from './utils';

function getBreakout(entry: TeamRankingEntry): number {
  return entry.breakout_premium ?? Math.round(entry.total_premium * 0.35);
}

interface AllClosersDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  data: AllTimeLeaderboardEntry[];
  selectedAgencyLabel: string;
  dateRangeLabel: string;
}

const getInitials = (name: string) => {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return parts[0].substring(0, 2).toUpperCase();
};

export const ClosersDrawer: React.FC<AllClosersDrawerProps> = ({ isOpen, onClose, data, selectedAgencyLabel, dateRangeLabel }) => {
  const [search, setSearch] = useState('');
  const filtered = data.filter(entry => entry.agent_name.toLowerCase().includes(search.toLowerCase()));

  const dynamicTitle = useMemo(() => {
    const presets = ['Today', 'Yesterday', 'This Week', 'This Month', 'This Year', 'All Time'];
    if (presets.includes(dateRangeLabel)) {
      if (dateRangeLabel === 'All Time') {
        return `${selectedAgencyLabel} All Time Rankings`;
      }
      return `${selectedAgencyLabel} ${dateRangeLabel}'s Rankings`;
    }
    return `${selectedAgencyLabel}'s Rankings`;
  }, [selectedAgencyLabel, dateRangeLabel]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] isolate flex justify-end overflow-hidden">
        <div className="absolute inset-0 bg-slate-950/35 backdrop-blur-[2px] transition-opacity animate-in fade-in duration-300" onClick={onClose} />
        <div className="relative flex h-dvh w-full max-w-[560px] flex-col overflow-hidden border-l border-slate-200/80 bg-white shadow-2xl animate-in slide-in-from-right duration-300 sm:rounded-l-[2rem]">
            <div className="p-8 border-b border-slate-50 flex items-start justify-between shrink-0 bg-white z-10">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2.5 bg-slate-900 rounded-xl text-brand-500 shadow-lg shadow-navy-900/10"><Trophy className="w-5 h-5" /></div>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">{dynamicTitle}</h3>
                    </div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Historical production records</p>
                </div>
                <button onClick={onClose} className="p-2.5 rounded-full hover:bg-slate-50 text-slate-400 hover:text-navy-900 transition-colors"><X className="w-6 h-6" /></button>
            </div>
            <div className="p-6 bg-slate-50/50 border-b border-slate-100 shrink-0">
                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
                    <input type="text" placeholder="Search agents..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-12 pr-5 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all placeholder:text-slate-300 shadow-sm" />
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-3 scrollbar-hide bg-white">
                {filtered.length > 0 ? (
                    filtered.map((entry) => {
                        const absoluteRank = data.findIndex(e => e.agent_id === entry.agent_id) + 1;
                        const isPodium = absoluteRank <= 3;
                        const avatarUrl = entry.agent_profile?.url;
                        
                        return (
                            <div key={entry.agent_id} className={`flex items-center justify-between p-4 rounded-2xl border transition-all group ${isPodium ? 'bg-brand-50/30 border-brand-100 shadow-sm' : 'bg-white border-slate-50 hover:border-slate-200 hover:shadow-lg hover:shadow-slate-200/40'}`}>
                                <div className="flex items-center gap-4 min-w-0">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shadow-sm shrink-0 border ${absoluteRank === 1 ? 'bg-slate-900 text-brand-500 border-navy-900' : absoluteRank === 2 ? 'bg-orange-500 text-white border-orange-600' : absoluteRank === 3 ? 'bg-pink-500 text-white border-pink-600' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                                        {absoluteRank === 1 ? <Crown className="w-3.5 h-3.5" /> : absoluteRank}
                                    </div>
                                    <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center border-2 border-slate-100 overflow-hidden shadow-sm group-hover:scale-105 transition-transform shrink-0">
                                        {avatarUrl ? (
                                          <img 
                                            src={avatarUrl} 
                                            className="w-full h-full object-cover" 
                                            alt={entry.agent_name} 
                                          />
                                        ) : (
                                          <span className="text-white font-black text-[11px] tracking-tighter">
                                            {getInitials(entry.agent_name)}
                                          </span>
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-black text-slate-800 truncate leading-tight mb-0.5">{entry.agent_name}</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase truncate tracking-tight mb-1">{getAgencyName(entry)}</p>
                                        <div className="flex items-center gap-2"><Target className="w-2.5 h-2.5 text-brand-500" /><span className="text-[10px] font-black text-slate-600 tracking-tight">{formatCurrencyCompact(entry.total_annualPremium)} AP</span></div>
                                    </div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-brand-500 transition-colors" />
                            </div>
                        );
                    })
                ) : (
                    <div className="h-full flex flex-col items-center justify-center py-20 text-slate-300 opacity-60">
                        <Search className="w-16 h-16 mb-4" />
                        <p className="text-sm font-bold uppercase tracking-widest">No matching agents</p>
                    </div>
                )}
            </div>
        </div>
    </div>,
    document.body,
  );
};

interface CarrierDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  data: CarrierBreakdown[];
}

export const CarrierDrawer: React.FC<CarrierDrawerProps> = ({ isOpen, onClose, data }) => {
  const [search, setSearch] = useState('');
  const sorted = [...data].sort((a, b) => b.total_premium - a.total_premium);
  const filtered = sorted.filter(c => c.label.toLowerCase().includes(search.toLowerCase()));

  const getCarrierInitials = (label: string) => {
    if (!label) return '??';
    return label.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] isolate flex justify-end overflow-hidden">
        <div className="absolute inset-0 bg-slate-950/35 backdrop-blur-[2px] transition-opacity animate-in fade-in duration-300" onClick={onClose} />
        <div className="relative flex h-dvh w-full max-w-[560px] flex-col overflow-hidden border-l border-slate-200/80 bg-white shadow-2xl animate-in slide-in-from-right duration-300 sm:rounded-l-[2rem]">
            <div className="z-10 flex shrink-0 items-start justify-between border-b border-slate-100 bg-white p-6">
                <div>
                    <div className="mb-1.5 flex items-center gap-3">
                        <div className="rounded-xl bg-slate-900 p-2.5 text-brand-500 shadow-lg shadow-navy-900/10"><Briefcase className="h-5 w-5" /></div>
                        <h3 className="text-xl font-black tracking-tight text-slate-900">Full Carrier Portfolio</h3>
                    </div>
                    <p className="pl-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Ranked by total premium</p>
                </div>
                <button type="button" aria-label="Close carrier portfolio" onClick={onClose} className="rounded-xl p-2.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-navy-900"><X className="h-5 w-5" /></button>
            </div>
            <div className="shrink-0 border-b border-slate-100 bg-slate-50/70 p-4">
                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
                    <input 
                        type="text" 
                        placeholder="Search carriers..." 
                        value={search} 
                        onChange={(e) => setSearch(e.target.value)} 
                        className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-12 pr-5 text-sm font-bold shadow-sm transition-all placeholder:text-slate-300 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10"
                    />
                </div>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto bg-white p-4 scrollbar-hide">
                {filtered.length > 0 ? (
                    filtered.map((carrier) => {
                        const placement = carrier.submissions > 0 ? ((carrier.issued / carrier.submissions) * 100).toFixed(2) : "0.00";
                        const avgPrem = carrier.issued > 0 ? (carrier.total_premium / carrier.issued).toFixed(2) : "0.00";
                        return (
                            <div key={carrier.id} className="group cursor-default rounded-2xl border border-slate-200/70 bg-slate-50 p-4 transition-all hover:bg-white hover:shadow-xl hover:shadow-slate-200/50">
                                <div className="mb-3 flex items-start justify-between gap-4">
                                    <div className="flex min-w-0 items-center gap-3">
                                        <div className="w-12 h-12 bg-white rounded-xl border border-slate-200 p-1 flex items-center justify-center shadow-sm overflow-hidden shrink-0">
                                            {carrier.logo?.url ? (
                                                <img src={carrier.logo.url} className="w-full h-full object-contain p-1" alt={carrier.label} />
                                            ) : (
                                                <div className="w-full h-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400">
                                                    {getCarrierInitials(carrier.label)}
                                                </div>
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-black leading-tight text-slate-900">{carrier.label}</p>
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Placement Ratio: <span className="font-black text-blue-500">{placement}%</span></p>
                                        </div>
                                    </div>
                                    <div className="shrink-0 text-right">
                                        <p className="text-lg font-black text-blue-600">${(carrier.total_premium / 1000).toFixed(1)}K</p>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Total Premium</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-4 pb-4">
                                    <div className="text-center">
                                        <p className="text-sm font-black text-slate-900">{carrier.submissions}</p>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Apps</p>
                                    </div>
                                    <div className="text-center border-x border-slate-100">
                                        <p className="text-sm font-black text-slate-900">{carrier.issued}</p>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Issued</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm font-black text-slate-900">${Number(avgPrem).toLocaleString()}</p>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Avg Prem</p>
                                    </div>
                                </div>
                                {carrier.top_agent && (
                                    <div className="mt-2 pt-3 border-t border-slate-100 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[8px] font-black text-slate-500">
                                                <User className="w-2.5 h-2.5" />
                                            </div>
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-tight">Top Agent: {carrier.top_agent.name}</span>
                                        </div>
                                        <span className="text-[10px] font-black text-brand-600">${carrier.top_agent.submitted_premium.toLocaleString()}</span>
                                    </div>
                                )}
                            </div>
                        );
                    })
                ) : (
                    <div className="h-full flex flex-col items-center justify-center py-20 text-slate-300 opacity-60">
                        <Search className="w-16 h-16 mb-4" />
                        <p className="text-sm font-bold uppercase tracking-widest">No matching carriers</p>
                    </div>
                )}
            </div>
        </div>
    </div>,
    document.body,
  );
};

interface TeamRankingDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  data: TeamRankingEntry[];
  dateRangeLabel: string;
}

export const TeamRankingDrawer: React.FC<TeamRankingDrawerProps> = ({ isOpen, onClose, data, dateRangeLabel }) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const sorted = useMemo(() => [...data].sort((a, b) => b.total_premium - a.total_premium), [data]);
  const filtered = sorted.filter(t => t.name.toLowerCase().includes(search.toLowerCase()));

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] isolate flex justify-end overflow-hidden">
        <div className="absolute inset-0 bg-slate-950/35 backdrop-blur-[2px] transition-opacity animate-in fade-in duration-300" onClick={onClose} />
        <div className="relative flex h-dvh w-full max-w-[560px] flex-col overflow-hidden border-l border-slate-200/80 bg-white shadow-2xl animate-in slide-in-from-right duration-300 sm:rounded-l-[2rem]">
            <div className="p-8 border-b border-slate-50 flex items-start justify-between shrink-0 bg-white z-10">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2.5 bg-slate-900 rounded-xl text-brand-500 shadow-lg shadow-navy-900/10"><Users className="w-5 h-5" /></div>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Organizational Standings</h3>
                    </div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">{dateRangeLabel} Team Performance</p>
                </div>
                <button onClick={onClose} className="p-2.5 rounded-full hover:bg-slate-50 text-slate-400 hover:text-navy-900 transition-colors"><X className="w-6 h-6" /></button>
            </div>
            <div className="p-6 bg-slate-50/50 border-b border-slate-100 shrink-0">
                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
                    <input 
                        type="text" 
                        placeholder="Search teams..." 
                        value={search} 
                        onChange={(e) => setSearch(e.target.value)} 
                        className="w-full pl-12 pr-5 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all placeholder:text-slate-300 shadow-sm" 
                    />
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide bg-white">
                {filtered.length > 0 ? (
                    filtered.map((team, idx) => {
                        const rank = idx + 1;
                        return (
                            <div key={team.id} onClick={() => { onClose(); navigate(`/agency/${team.id}`, { state: { team, allTeams: sorted } }); }} className="bg-slate-50 border border-slate-100 rounded-2xl p-5 hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all cursor-pointer group">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black border transition-all ${
                                          rank === 1 ? 'bg-slate-900 text-brand-500 border-navy-900' : 
                                          rank === 2 ? 'bg-slate-400 text-white border-slate-500' :
                                          rank === 3 ? 'bg-orange-500 text-white border-orange-600' :
                                          'bg-white text-slate-400 border-slate-100 shadow-sm'
                                        }`}>
                                          {rank === 1 ? <Crown className="w-5 h-5" /> : rank}
                                        </div>
                                        <div className="flex items-center gap-3">
                                          <div className="w-12 h-12 bg-white rounded-xl border border-slate-200 flex items-center justify-center shadow-sm overflow-hidden shrink-0">
                                              {team.logo?.url ? (
                                                  <img src={team.logo.url} className="w-full h-full object-contain p-1" alt={team.name} />
                                              ) : (
                                                  <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${team.name}`} className="w-full h-full object-cover" alt={team.name} />
                                              )}
                                          </div>
                                          <div>
                                              <p className="text-sm font-black text-slate-900 leading-tight">{team.name}</p>
                                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Manager: <span className="text-slate-600">{team.manager}</span></p>
                                          </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-black text-blue-600">{formatCurrencyCompact(team.total_premium)}</p>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Production</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-4">
                                    <div className="text-center">
                                        <p className="text-sm font-black text-slate-900">{team.agents}</p>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Agents</p>
                                    </div>
                                    <div className="text-center border-x border-slate-100">
                                        <p className="text-sm font-black text-slate-900">{team.submissions}</p>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Subs</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm font-black text-slate-900">{team.issued}</p>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Issued</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 border-t border-slate-100 mt-3 pt-3">
                                    <div className="flex items-center gap-1.5">
                                        <GitBranch className="w-3 h-3 text-slate-400 shrink-0" />
                                        <div>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Breakout Premium</p>
                                            <p className="text-sm font-black text-indigo-600">{formatCurrencyCompact(getBreakout(team))}</p>
                                            <p className="text-[8px] text-slate-300 font-bold">Child Teams AP</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 border-l border-slate-100 pl-2">
                                        <TrendingUp className="w-3 h-3 text-slate-400 shrink-0" />
                                        <div>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Leadership Impact</p>
                                            <p className="text-sm font-black text-emerald-600">{formatCurrencyCompact(team.total_premium + getBreakout(team))}</p>
                                            <p className="text-[8px] text-slate-300 font-bold">Team + Breakout</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="h-full flex flex-col items-center justify-center py-20 text-slate-300 opacity-60">
                        <Search className="w-16 h-16 mb-4" />
                        <p className="text-sm font-bold uppercase tracking-widest">No matching teams</p>
                    </div>
                )}
            </div>
        </div>
    </div>,
    document.body,
  );
};
