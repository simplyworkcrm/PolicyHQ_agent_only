
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronDown,
  Building2,
  Check,
  Zap,
  BarChart3,
  Calendar,
  Layers
} from 'lucide-react';
import { 
  agentOverviewApi, 
  AllTimeLeaderboardEntry, 
  AgencyMeta, 
  SubmissionSummary, 
  CarrierBreakdown,
  TeamRankingEntry
} from '../services/agentOverviewApi';
import { useRealtime } from '../../../context/RealtimeContext';

// Refactored Modular Components
import { DateRange, getTodayRange, getYesterdayRange, getWeekRange, getMonthRange, getYearRange } from './overview/utils';
import { PerformanceMetrics } from './overview/PerformanceMetrics';
import { CarrierSection } from './overview/CarrierSection';
import { TeamSalesSection } from './overview/TeamSalesSection';
import { TopClosers } from './overview/TopClosers';
import { AgentSummaryPopup, AgentSummaryStats } from './AgentleaderboardRealtime';
import { agentleaderboardRealtimeApi } from '../services/agentleaderboardRealtimeApi';
import { LeadInfoSection } from './overview/LeadInfoSection';
import { ClosersDrawer, CarrierDrawer, TeamRankingDrawer } from './overview/OverviewDrawers';
import { MiniDatePicker } from './overview/MiniDatePicker';

export const AgentOverview: React.FC = () => {
  const navigate = useNavigate();
  const { latestSale } = useRealtime();
  
  // SHARED STATE
  const [leaderboardData, setLeaderboardData] = useState<AllTimeLeaderboardEntry[]>([]);
  const [teamRankingData, setTeamRankingData] = useState<TeamRankingEntry[]>([]);
  const [agencies, setAgencies] = useState<AgencyMeta[]>([]);
  const [selectedAgencyId, setSelectedAgencyId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>(getMonthRange()); 
  const [summary, setSummary] = useState<SubmissionSummary>({ submissions: 0, premiums: 0 });
  const [carrierBreakdown, setCarrierBreakdown] = useState<CarrierBreakdown[]>([]);
  
  // UI STATE
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingCarriers, setLoadingCarriers] = useState(false);
  const [isAgencyDropdownOpen, setIsAgencyDropdownOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isAllClosersDrawerOpen, setIsAllClosersDrawerOpen] = useState(false);
  const [isCarrierDrawerOpen, setIsCarrierDrawerOpen] = useState(false);
  const [isTeamDrawerOpen, setIsTeamDrawerOpen] = useState(false);
  const [popupStats, setPopupStats] = useState<AgentSummaryStats | null>(null);
  const [popupLoading, setPopupLoading] = useState(false);

  const handleAgentClick = async (agentId: string) => {
    setPopupLoading(true);
    setPopupStats(null);
    try {
      const res = await agentleaderboardRealtimeApi.getAgentDetails(agentId);
      const entry = leaderboardData.find(e => e.agent_id === agentId);
      setPopupStats({
        agent_id: agentId,
        agent_name: entry?.agent_name || 'Agent',
        agent_profile_url: entry?.agent_profile?.url || null,
        agency: (entry?.agency as any)?.label || (entry?.agency as any) || 'Organization',
        production: res.production,
        sources: res.sources,
        carrier: res.carrier,
      });
    } catch (err) {
      console.error('Agent popup fetch failed', err);
    } finally {
      setPopupLoading(false);
    }
  };

  const dropdownRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  // FETCH META
  useEffect(() => {
    agentOverviewApi.getAgencies()
      .then(setAgencies)
      .catch(console.error);
  }, []);

  // FETCH DATA
  useEffect(() => {
    setLoadingLeaderboard(true);
    agentOverviewApi.getAllTimeLeaderboard(selectedAgencyId, dateRange.start, dateRange.end)
      .then(setLeaderboardData)
      .catch(console.error)
      .finally(() => setLoadingLeaderboard(false));

    setLoadingTeams(true);
    agentOverviewApi.getTeamRanking(dateRange.start, dateRange.end)
      .then(setTeamRankingData)
      .catch(console.error)
      .finally(() => setLoadingTeams(false));

    setLoadingSummary(true);
    agentOverviewApi.getSubmissionSummary(selectedAgencyId, dateRange.start, dateRange.end)
        .then(setSummary)
        .catch(console.error)
        .finally(() => setLoadingSummary(false));

    setLoadingCarriers(true);
    agentOverviewApi.getCarrierBreakdown(selectedAgencyId, dateRange.start, dateRange.end)
        .then(setCarrierBreakdown)
        .catch(console.error)
        .finally(() => setLoadingCarriers(false));
  }, [selectedAgencyId, dateRange, latestSale]);

  // UI HELPERS
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsAgencyDropdownOpen(false);
      }
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setIsCalendarOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedAgencyLabel = useMemo(() => {
    if (!selectedAgencyId) return "Global Overview";
    return agencies.find(a => a.id === selectedAgencyId)?.label || "Global Overview";
  }, [selectedAgencyId, agencies]);

  const presets = [
    { label: 'TODAY', setter: getTodayRange },
    { label: 'YESTERDAY', setter: getYesterdayRange },
    { label: 'THIS WEEK', setter: getWeekRange },
    { label: 'THIS MONTH', setter: getMonthRange },
    { label: 'THIS YEAR', setter: getYearRange },
  ] as const;

  const presetLabels = presets.map(p => p.label);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 relative">
      {/* HEADER: UNIFIED CONTROL STRIP */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center">
          {/* Unified Filter Component */}
          <div className="flex items-center p-1 bg-white rounded-full border border-slate-100 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)]">
            {/* Agency Context Switcher */}
            <div className="relative border-r border-slate-100 pr-1" ref={dropdownRef}>
                <button 
                    onClick={() => setIsAgencyDropdownOpen(!isAgencyDropdownOpen)}
                    className={`flex items-center gap-3 px-5 py-2.5 rounded-full transition-all group border ${isAgencyDropdownOpen ? 'bg-slate-100 border-slate-200 shadow-inner' : 'border-slate-200 hover:bg-slate-50 hover:border-slate-300 hover:shadow-sm'}`}
                >
                    <div className="p-1.5 bg-slate-900 rounded-lg text-brand-500 shadow-lg shadow-slate-900/10 transition-transform group-hover:scale-105">
                        <Building2 className="w-3.5 h-3.5" strokeWidth={3} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 min-w-[100px] text-left">{selectedAgencyLabel}</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-300 ${isAgencyDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {isAgencyDropdownOpen && (
                    <div className="absolute top-full left-0 w-full mt-3 w-72 bg-white rounded-[1.75rem] shadow-2xl border border-slate-100 py-3 z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-left ring-1 ring-black/5">
                        <div className="px-5 py-2 mb-2 border-b border-slate-50">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Active Context</p>
                        </div>
                        <button
                            onClick={() => { setSelectedAgencyId(null); setIsAgencyDropdownOpen(false); }}
                            className={`w-full flex items-center justify-between px-5 py-3 text-[10px] font-black uppercase tracking-widest transition-colors ${!selectedAgencyId ? 'text-brand-600 bg-brand-50/30' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                            <span className="flex items-center gap-2"><Layers className="w-3.5 h-3.5" /> Global Overview</span>
                            {!selectedAgencyId && <Check className="w-3.5 h-3.5" strokeWidth={4} />}
                        </button>
                        <div className="h-px bg-slate-100 my-1 mx-4"></div>
                        <div className="max-h-64 overflow-y-auto px-1">
                            {agencies.map(agency => (
                                <button
                                    key={agency.id}
                                    onClick={() => { setSelectedAgencyId(agency.id); setIsAgencyDropdownOpen(false); }}
                                    className={`w-full flex items-center justify-between px-5 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${selectedAgencyId === agency.id ? 'text-brand-600 bg-brand-50/30' : 'text-slate-500 hover:bg-slate-50'}`}
                                >
                                    <span className="truncate">{agency.label}</span>
                                    {selectedAgencyId === agency.id && <Check className="w-3.5 h-3.5" strokeWidth={4} />}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Date Range Strip */}
            <div className="flex items-center gap-0.5 px-1">
                {presets.map(({ label, setter }) => {
                    const isActive = dateRange.label.toUpperCase() === label;
                    return (
                        <button 
                            key={label}
                            onClick={() => { setDateRange(setter()); setIsCalendarOpen(false); }}
                            className={`px-5 py-2.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${isActive ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
                        >
                            {label}
                        </button>
                    )
                })}
                <div className="w-px h-4 bg-slate-100 mx-1"></div>
                <div className="relative" ref={calendarRef}>
                    <button 
                        onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                        className={`px-5 py-2.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${!presetLabels.includes(dateRange.label.toUpperCase() as any) ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
                    >
                        <Calendar className="w-3.5 h-3.5" />
                        {presetLabels.includes(dateRange.label.toUpperCase() as any) ? 'CUSTOM' : dateRange.label.toUpperCase()}
                    </button>
                    {isCalendarOpen && (
                        <div className="absolute top-full right-0 mt-3 z-50">
                            <MiniDatePicker onChange={(range) => { setDateRange(range); setIsCalendarOpen(false); }} />
                        </div>
                    )}
                </div>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-4">
          <div className="relative group">
              <button 
                  onClick={() => navigate('/my-profile')}
                  className="flex items-center gap-3 bg-slate-900 text-white px-6 py-3 rounded-2xl border border-slate-800 hover:bg-black transition-all shadow-xl group"
              >
                  <BarChart3 className="w-5 h-5 text-brand-500" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">My Stats</span>
              </button>
          </div>

          <div className="relative group">
              <button 
                  onClick={() => navigate('/leaderboard/realtime')}
                  className="flex items-center gap-3 bg-slate-900 text-white px-6 py-3 rounded-2xl border border-slate-800 hover:bg-black transition-all shadow-xl group"
              >
                  <Zap className="w-5 h-5 fill-brand-500 text-brand-500 group-hover:scale-110 transition-transform animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">Realtime Arena</span>
              </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT COLUMN: MAIN WORKSPACE */}
        <div className="lg:col-span-8 space-y-8">
          <PerformanceMetrics summary={summary} loading={loadingSummary} />

          {/* Lead Information positioned under Performance Metrics */}
          <LeadInfoSection 
            agencyId={selectedAgencyId}
            startDate={dateRange.start}
            endDate={dateRange.end}
            dateRangeLabel={dateRange.label}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
            <CarrierSection 
              carrierBreakdown={carrierBreakdown} 
              loading={loadingCarriers} 
              onViewAll={() => setIsCarrierDrawerOpen(true)}
            />

            <TeamSalesSection 
              teamRankingData={teamRankingData} 
              loading={loadingTeams} 
              dateRangeLabel={dateRange.label.toUpperCase()}
              dateRangeStart={dateRange.start}
              dateRangeEnd={dateRange.end}
              selectedAgencyLabel={selectedAgencyLabel}
              onViewAll={() => setIsTeamDrawerOpen(true)}
            />
          </div>
        </div>

        {/* RIGHT COLUMN: SIDEBAR */}
        <div className="lg:col-span-4 space-y-8">
          <TopClosers 
            leaderboardData={leaderboardData} 
            loading={loadingLeaderboard} 
            selectedAgencyLabel={selectedAgencyLabel.toUpperCase()}
            dateRangeLabel={dateRange.label}
            onViewAll={() => setIsAllClosersDrawerOpen(true)}
            onAgentClick={handleAgentClick}
          />
        </div>
      </div>

      {/* OVERLAYS & DRAWERS */}
      <ClosersDrawer 
        isOpen={isAllClosersDrawerOpen} 
        onClose={() => setIsAllClosersDrawerOpen(false)} 
        data={leaderboardData} 
        selectedAgencyLabel={selectedAgencyLabel}
        dateRangeLabel={dateRange.label}
      />

      <CarrierDrawer 
        isOpen={isCarrierDrawerOpen} 
        onClose={() => setIsCarrierDrawerOpen(false)} 
        data={carrierBreakdown} 
      />

      <TeamRankingDrawer
        isOpen={isTeamDrawerOpen}
        onClose={() => setIsTeamDrawerOpen(false)}
        data={teamRankingData}
        dateRangeLabel={dateRange.label}
      />

      {/* Agent Summary Popup - loading state */}
      {popupLoading && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setPopupLoading(false)} />
          <div className="relative w-16 h-16 rounded-full border border-white/10 bg-slate-900 flex items-center justify-center">
            <svg className="animate-spin w-8 h-8 text-brand-500" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
          </div>
        </div>
      )}
      {popupStats && (
        <AgentSummaryPopup stats={popupStats} isNightMode={false} onClose={() => setPopupStats(null)} />
      )}
    </div>
  );
};
