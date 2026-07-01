import React, { useEffect, useState, useRef } from 'react';
import { 
  Users, 
  UserX, 
  Search, 
  ChevronRight, 
  Loader2, 
  FileText,
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  Lock,
  Building2,
  Phone,
  Hash,
  ArrowUpDown
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAgentContext } from '../context/AgentContext';
import { agentDownlineApi, DownlineAgent, DownlineHierarchy } from '../services/agentDownlineApi';
import { AgentPoliciesV2 } from './AgentPoliciesV2';
import { BusinessOverviewDashboard } from './BusinessOverviewDashboard';
import { Policy } from '../../../shared/types/index';

type DownlineSortKey = 'first_name' | 'ref_ffl_agency_name' | 'phone' | 'npn' | 'direct_downlines' | 'status';
type DownlineSortConfig = { key: DownlineSortKey; direction: 'asc' | 'desc' };

interface DateRange {
    start: number;
    end: number;
    label: string;
    timeframe: 'today' | 'weekly' | 'monthly' | 'yearly' | 'custom';
}

// --- HELPERS & UTILITIES ---

const getDateRange = (type: 'today' | 'weekly' | 'monthly' | 'yearly'): DateRange => {
    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);
    
    start.setHours(0,0,0,0);
    end.setHours(23,59,59,999);

    if (type === 'today') return { start: start.getTime(), end: end.getTime(), label: 'Today', timeframe: 'today' };
    
    if (type === 'weekly') {
        const day = start.getDay(); // 0 is Sunday
        const diff = start.getDate() - day; // Start of week (Sunday)
        start.setDate(diff);
        end.setDate(diff + 6);
        end.setHours(23,59,59,999);
        return { start: start.getTime(), end: end.getTime(), label: 'Weekly', timeframe: 'weekly' };
    }

    if (type === 'monthly') {
        start.setDate(1);
        const endMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        endMonth.setHours(23,59,59,999);
        return { start: start.getTime(), end: endMonth.getTime(), label: 'Monthly', timeframe: 'monthly' };
    }

    if (type === 'yearly') {
        start.setMonth(0, 1);
        const endYear = new Date(now.getFullYear(), 11, 31);
        endYear.setHours(23,59,59,999);
        return { start: start.getTime(), end: endYear.getTime(), label: 'Yearly', timeframe: 'yearly' };
    }
    
    return { start: start.getTime(), end: end.getTime(), label: 'Custom', timeframe: 'custom' };
};

const formatDate = (date: string | number | undefined) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
};

const toRequestDate = (ts: number | undefined) => {
    if (ts === undefined) return null;
    const date = new Date(ts);
    return `${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}-${date.getUTCFullYear()}`;
};

const getStatusStyles = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s.includes('approve')) return 'bg-emerald-100 text-emerald-700';
    if (s.includes('lapsed pending')) return 'bg-amber-100 text-amber-700';
    if (s.includes('underwrit')) return 'bg-blue-100 text-blue-700';
    if (s.includes('cancel') || s.includes('decline') || s.includes('follow')) return 'bg-red-100 text-red-700';
    if (s.includes('lapsed')) return 'bg-orange-100 text-orange-700';
    if (s.includes('taken')) return 'bg-slate-100 text-slate-600';
    return 'bg-slate-100 text-slate-600';
};

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || 'AG';
};

const DOWNLINE_SORT_FIELDS: Record<DownlineSortKey, string> = {
  first_name: 'first_name',
  ref_ffl_agency_name: 'ref_ffl_agency_name',
  phone: 'phone',
  npn: 'npn',
  direct_downlines: 'direct_downlines',
  status: 'status',
};

// --- COMPONENTS ---

const DateRangeSelector: React.FC<{
    value: DateRange;
    onChange: (range: DateRange) => void;
}> = ({ value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [view, setView] = useState<'presets' | 'calendar'>('presets');
    const containerRef = useRef<HTMLDivElement>(null);
    const [currentMonth, setCurrentMonth] = useState(new Date()); 
    const [selectionStart, setSelectionStart] = useState<Date | null>(null);
    const [selectionEnd, setSelectionEnd] = useState<Date | null>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setView('presets');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handlePresetClick = (type: 'today' | 'weekly' | 'monthly' | 'yearly') => {
        onChange(getDateRange(type));
        setIsOpen(false);
    };

    const handleCustomClick = () => {
        setView('calendar');
        setSelectionStart(null);
        setSelectionEnd(null);
    };

    const handleDateClick = (date: Date) => {
        if (!selectionStart || (selectionStart && selectionEnd)) {
            setSelectionStart(date);
            setSelectionEnd(null);
        } else {
            if (date < selectionStart) {
                setSelectionEnd(selectionStart);
                setSelectionStart(date);
                const s = date;
                const e = selectionStart;
                s.setHours(0,0,0,0);
                e.setHours(23,59,59,999);
                onChange({ start: s.getTime(), end: e.getTime(), label: 'Custom Range', timeframe: 'custom' });
                setIsOpen(false);
            } else {
                setSelectionEnd(date);
                const s = selectionStart;
                const e = date;
                s.setHours(0,0,0,0);
                e.setHours(23,59,59,999);
                onChange({ start: s.getTime(), end: e.getTime(), label: 'Custom Range', timeframe: 'custom' });
                setIsOpen(false);
            }
        }
    };

    const changeMonth = (delta: number) => {
        const newMonth = new Date(currentMonth);
        newMonth.setMonth(newMonth.getMonth() + delta);
        setCurrentMonth(newMonth);
    };

    const generateCalendar = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const days = [];
        for (let i = 0; i < firstDay; i++) days.push(null);
        for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
        return days;
    };

    const isSelected = (date: Date) => {
        if (!date) return false;
        if (selectionStart && date.getTime() === selectionStart.getTime()) return true;
        if (selectionEnd && date.getTime() === selectionEnd.getTime()) return true;
        return false;
    };

    const isInRange = (date: Date) => {
        if (!date || !selectionStart || !selectionEnd) return false;
        return date > selectionStart && date < selectionEnd;
    };

    return (
        <div className="relative" ref={containerRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 hover:bg-slate-50 transition-all shadow-sm hover:shadow-md"
            >
                <Calendar className="w-4 h-4 text-brand-500" />
                <span>{value.label}</span>
                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full right-0 mt-3 bg-white rounded-[2rem] shadow-2xl shadow-slate-200/50 border border-slate-100 p-2 min-w-[320px] z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                    {view === 'presets' ? (
                        <div className="flex flex-col gap-1 p-2">
                            {['Today', 'Weekly', 'Monthly', 'Yearly'].map((item) => (
                                <button
                                    key={item}
                                    onClick={() => handlePresetClick(item.toLowerCase() as any)}
                                    className={`w-full text-left px-5 py-3.5 rounded-2xl text-sm font-bold transition-all flex items-center justify-between ${value.label === item ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
                                >
                                    {item}
                                    {value.label === item && <CheckCircle className="w-4 h-4 text-brand-400" />}
                                </button>
                            ))}
                            <div className="h-px bg-slate-100 my-2"></div>
                            <button onClick={handleCustomClick} className="w-full text-left px-5 py-3.5 rounded-2xl text-sm font-bold text-slate-900 hover:bg-slate-50 transition-all border border-slate-200 hover:border-slate-300">Custom Range</button>
                        </div>
                    ) : (
                        <div className="p-4">
                            <div className="flex items-center justify-between bg-slate-900 text-white p-4 rounded-2xl mb-4 shadow-lg shadow-slate-900/20">
                                <span className="font-bold text-sm">Custom Range</span>
                                <Calendar className="w-4 h-4 text-brand-400" />
                            </div>
                            <div className="flex items-center justify-between mb-4 px-2">
                                <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-900 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                                <span className="font-bold text-slate-900 text-sm">{MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}</span>
                                <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-900 transition-colors"><ChevronRight className="w-4 h-4" /></button>
                            </div>
                            <div className="grid grid-cols-7 mb-2 text-center">{['S','M','T','W','T','F','S'].map((d,i) => <span key={i} className="text-[10px] font-bold text-slate-400">{d}</span>)}</div>
                            <div className="grid grid-cols-7 gap-1 mb-4">
                                {generateCalendar().map((date, i) => (
                                    <div key={i} className="aspect-square">
                                        {date ? (
                                            <button onClick={() => handleDateClick(date)} className={`w-full h-full flex items-center justify-center rounded-full text-xs font-bold transition-all ${isSelected(date) ? 'bg-brand-500 text-white shadow-md shadow-brand-200 ring-2 ring-white' : isInRange(date) ? 'bg-brand-50 text-brand-900' : 'text-slate-700 hover:bg-slate-50'}`}>{date.getDate()}</button>
                                        ) : <div />}
                                    </div>
                                ))}
                            </div>
                            <div className="pt-2 border-t border-slate-100 text-center">
                                <button onClick={() => setView('presets')} className="text-xs font-bold text-brand-500 hover:text-brand-600 transition-colors">Back to Presets</button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const DownlineSortableHeader = ({
  label,
  sortKey,
  sortConfig,
  onSort,
  className = '',
}: {
  label: string;
  sortKey: DownlineSortKey;
  sortConfig: DownlineSortConfig | null;
  onSort: (key: DownlineSortKey) => void;
  className?: string;
}) => {
  const isActive = sortConfig?.key === sortKey;

  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest transition-colors ${
        isActive ? 'text-slate-900' : 'text-slate-400 hover:text-slate-700'
      } ${className}`}
    >
      {label}
      <ArrowUpDown className={`h-3 w-3 ${isActive ? 'text-brand-500' : 'text-slate-300'}`} />
      {isActive && <span className="text-[9px] text-brand-600">{sortConfig?.direction === 'asc' ? 'ASC' : 'DESC'}</span>}
    </button>
  );
};

export const AgentDownlines: React.FC = () => {
  const { currentAgentId, selectedAgentIds, subAgents, viewingAgentName, hasAgentProfile } = useAgentContext();
  const navigate = useNavigate();

  // Main View State
  const [selectedAgentId, setSelectedAgentId] = useState<string>(currentAgentId);
  const [selectedHierarchyData, setSelectedHierarchyData] = useState<DownlineHierarchy | null>(null);
  const [loadingSelected, setLoadingSelected] = useState(false);
  
  // Tabs & Views
  const [viewMode, setViewMode] = useState<'overview' | 'team' | 'policies'>('overview');

  // Policy Table State
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loadingPolicies, setLoadingPolicies] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>(getDateRange('monthly'));
  
  // Table controls
  const [tableSearch, setTableSearch] = useState('');
  const [debouncedTableSearch, setDebouncedTableSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [sortConfig, setSortConfig] = useState<DownlineSortConfig | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedTableSearch(tableSearch.trim());
      setPage(1);
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [tableSearch]);

  // 1. Keep the direct-downline request scoped to one selected agent.
  useEffect(() => {
    const scopeIds = selectedAgentIds.filter(Boolean);
    const nextSelectedId = scopeIds.includes(selectedAgentId) ? selectedAgentId : (scopeIds[0] || currentAgentId);
    if (nextSelectedId && nextSelectedId !== selectedAgentId) {
      setSelectedAgentId(nextSelectedId);
      setTableSearch('');
      setDebouncedTableSearch('');
      setPage(1);
    }
  }, [currentAgentId, selectedAgentId, selectedAgentIds]);

  // 2. Fetch Selected Agent Hierarchy Data
  useEffect(() => {
    if (selectedAgentId) {
        setLoadingSelected(true);
        agentDownlineApi.getHierarchy(selectedAgentId, {
            page,
            perPage,
            search: debouncedTableSearch,
            sort: sortConfig ? { [DOWNLINE_SORT_FIELDS[sortConfig.key]]: sortConfig.direction } : null,
        })
            .then(data => setSelectedHierarchyData(data))
            .catch(err => console.error(err))
            .finally(() => setLoadingSelected(false));
    }
  }, [debouncedTableSearch, page, perPage, selectedAgentId, sortConfig]);

  if (!hasAgentProfile) {
    return (
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-8 flex flex-col items-center justify-center min-h-[400px] text-center">
         <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-6 shadow-inner">
           <UserX className="w-10 h-10 text-slate-300" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">No Agent Profile Connected</h2>
        <p className="text-slate-500 max-w-md text-center">
           You don't have an Agent Profile connected. Please switch to an agent workspace to view downlines.
        </p>
      </div>
    );
  }

  const tableAgents = selectedHierarchyData?.direct_downlines || [];
  const totalAgents = selectedHierarchyData?.itemsTotal ?? tableAgents.length;
  const pageTotal = selectedHierarchyData?.pageTotal ?? 1;
  const currentPage = selectedHierarchyData?.curPage ?? page;
  const pageStart = totalAgents === 0 ? 0 : ((currentPage - 1) * perPage) + 1;
  const pageEnd = totalAgents === 0 ? 0 : Math.min(pageStart + tableAgents.length - 1, totalAgents);

  const handleSort = (key: DownlineSortKey) => {
    setSortConfig(current => ({
      key,
      direction: current?.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
    setPage(1);
  };

  const agentSwitchOptions = (selectedAgentIds.length > 0 ? selectedAgentIds : [currentAgentId])
    .filter(Boolean)
    .filter((agentId, index, all) => all.indexOf(agentId) === index)
    .map(agentId => {
      const subAgent = subAgents.find(agent => agent.agentId === agentId);
      const isCurrentSingleView = agentId === currentAgentId && selectedAgentIds.length <= 1;
      return {
        id: agentId,
        label: subAgent?.name || (isCurrentSingleView ? viewingAgentName : agentId),
      };
    });

  const selectedAgentLabel = agentSwitchOptions.find(agent => agent.id === selectedAgentId)?.label
    || `${selectedHierarchyData?.first_name || ''} ${selectedHierarchyData?.last_name || ''}`.trim()
    || 'Selected Agent';

  return (
    <div className="font-sans w-full animate-in fade-in duration-300">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-slate-900 text-white shadow-xl shadow-slate-900/10">
            <Users className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-3xl font-black tracking-tight text-slate-900">
              {viewMode === 'policies' ? 'Team Production' : viewMode === 'overview' ? 'My Agency' : 'Downlines'}
            </h2>
            <p className="text-sm font-bold text-slate-500">
              {viewMode === 'policies'
                ? `Aggregated policies for ${selectedAgentLabel} and their downline tree.`
                : viewMode === 'overview'
                  ? 'Review agency analytics, state coverage, sources, and policy status trends.'
                  : 'Review direct team access and aggregated production.'}
            </p>
          </div>
        </div>
        <div className="flex gap-1 p-1 bg-white rounded-2xl border border-slate-100 shadow-sm shrink-0">
          <button
            onClick={() => setViewMode('overview')}
            className={`px-4 py-2.5 text-xs font-black rounded-xl transition-all ${viewMode === 'overview' ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'}`}
          >
            Overview
          </button>
          <button
            onClick={() => setViewMode('team')}
            className={`px-4 py-2.5 text-xs font-black rounded-xl transition-all ${viewMode === 'team' ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'}`}
          >
            Team List
          </button>
          <button
            onClick={() => setViewMode('policies')}
            className={`px-4 py-2.5 text-xs font-black rounded-xl transition-all ${viewMode === 'policies' ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'}`}
          >
            Production
          </button>
        </div>
      </div>

      {viewMode !== 'overview' && agentSwitchOptions.length > 1 && (
        <div className="mb-5 flex items-center gap-2 overflow-x-auto pb-1">
          {agentSwitchOptions.map(agent => {
            const active = agent.id === selectedAgentId;
            return (
              <button
                key={agent.id}
                onClick={() => {
                  setSelectedAgentId(agent.id);
                  setTableSearch('');
                  setDebouncedTableSearch('');
                  setPage(1);
                  setPolicies([]);
                }}
                className={`shrink-0 px-4 py-2.5 rounded-2xl text-xs font-black border transition-all ${
                  active
                    ? 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-900/10'
                    : 'bg-white text-slate-500 border-slate-200 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                {agent.label}
              </button>
            );
          })}
        </div>
      )}

      {viewMode !== 'overview' && !agentSwitchOptions.some(agent => agent.id === selectedAgentId) && (
        <div className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div>
            <p className="text-xs font-black text-amber-900">Viewing direct downline profile</p>
            <p className="text-[11px] font-semibold text-amber-700">Use a workspace tab to return to your selected agents.</p>
          </div>
          {agentSwitchOptions[0] && (
            <button
              onClick={() => {
                setSelectedAgentId(agentSwitchOptions[0].id);
                setTableSearch('');
                setPolicies([]);
              }}
              className="shrink-0 rounded-xl bg-slate-900 px-4 py-2 text-xs font-black text-white hover:bg-slate-800 transition-colors"
            >
              Back to {agentSwitchOptions[0].label}
            </button>
          )}
        </div>
      )}

      {viewMode === 'overview' ? (
        <BusinessOverviewDashboard
          mode="agency"
          scopeEyebrow="Agency Scope"
          overviewEyebrow="Agency Overview"
          title="Agency Analytics Dashboard"
          subtitlePrefix="Agency production signals for"
          loadingLabel="Loading agency overview..."
          initialTimeframe="weekly"
        />
      ) : viewMode === 'policies' ? (
        <AgentPoliciesV2
          agentIdsOverride={[selectedAgentId]}
          dataSource="team"
          headingTitle="Team Production"
          headingSubtitle={`Aggregated policies for ${selectedAgentLabel} and their downline tree.`}
          hideHeader
          showDateRangeWhenHeaderHidden
          initialTimeframe="monthly"
        />
      ) : (
      <div className="flex-1 min-w-0 bg-white border border-slate-100 shadow-sm overflow-visible relative min-h-[600px] flex flex-col rounded-[2.5rem]">
        <div className="p-5 border-b border-slate-50 flex flex-col xl:flex-row xl:items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-brand-50 rounded-2xl text-brand-600 border border-brand-100 shadow-sm">
              <FileText className="w-5 h-5" />
      </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.28em] text-slate-400">Downline Scope</p>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">{selectedAgentLabel}</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                {viewMode === 'team'
                  ? `${totalAgents.toLocaleString()} direct agents matching current view`
                  : `${policies.length.toLocaleString()} production records loaded`}
              </p>
            </div>
          </div>
          {viewMode === 'team' ? (
            <div className="flex items-center gap-3 flex-1 min-w-0 xl:max-w-xl">
              <div className="relative flex-1 min-w-60 group">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none group-focus-within:text-brand-500 transition-colors" />
                <input
                  type="text"
                  placeholder="Search list..."
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  className="w-full pl-11 pr-3 py-4 text-sm rounded-2xl bg-slate-50 border border-slate-100 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all font-bold"
                />
              </div>
            </div>
          ) : (
            <DateRangeSelector value={dateRange} onChange={setDateRange} />
          )}
        </div>

            <div className="overflow-x-auto">
              {viewMode === 'team' ? (
                  // TEAM TABLE
                  <>
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-100/50">
                        <th className="py-5 pl-8"><DownlineSortableHeader label="Agent Name" sortKey="first_name" sortConfig={sortConfig} onSort={handleSort} /></th>
                        <th className="py-5 px-4"><DownlineSortableHeader label="Agency" sortKey="ref_ffl_agency_name" sortConfig={sortConfig} onSort={handleSort} /></th>
                        <th className="py-5 px-4"><DownlineSortableHeader label="Phone" sortKey="phone" sortConfig={sortConfig} onSort={handleSort} /></th>
                        <th className="py-5 px-4"><DownlineSortableHeader label="NPN" sortKey="npn" sortConfig={sortConfig} onSort={handleSort} /></th>
                        <th className="py-5 px-4"><DownlineSortableHeader label="Direct Downlines" sortKey="direct_downlines" sortConfig={sortConfig} onSort={handleSort} /></th>
                        <th className="py-5 px-4"><DownlineSortableHeader label="Status" sortKey="status" sortConfig={sortConfig} onSort={handleSort} /></th>
                        <th className="py-5 px-4 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {loadingSelected ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center">
                              <div className="flex items-center justify-center gap-2 text-slate-400">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span className="text-sm font-bold">Loading details...</span>
                              </div>
                          </td>
                        </tr>
                      ) : tableAgents.length > 0 ? (
                        tableAgents.map((agent: DownlineAgent) => (
                          <tr
                            key={agent.agent_id}
                            onClick={() => {
                              navigate(`/downlines/${agent.agent_id}`, { state: { agent } });
                            }}
                            className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                          >
                            <td className="py-5 pl-8">
                              <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500 font-black text-xs border border-slate-200 overflow-hidden shrink-0">
                                    {agent.profile_url ? (
                                      <img src={agent.profile_url} alt={`${agent.first_name} ${agent.last_name}`} className="h-full w-full object-cover" />
                                    ) : (
                                      getInitials(agent.first_name, agent.last_name)
                                    )}
                                  </div>
                                  <div>
                                    <p className="font-bold text-slate-900 text-sm">{agent.first_name} {agent.last_name}</p>
                                    <p className="text-xs text-slate-400 font-medium">View profile and direct downlines</p>
                                  </div>
                              </div>
                            </td>
                            <td className="py-5 px-4">
                              <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                                <Building2 className="w-4 h-4 text-slate-300" />
                                <span>{agent.ref_ffl_agency_name || 'Not set'}</span>
                              </div>
                            </td>
                            <td className="py-5 px-4">
                              <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                                <Phone className="w-4 h-4 text-slate-300" />
                                <span>{agent.phone || 'Not set'}</span>
                              </div>
                            </td>
                            <td className="py-5 px-4">
                              <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                                <Hash className="w-4 h-4 text-slate-300" />
                                <span>{agent.npn || 'Not set'}</span>
                              </div>
                            </td>
                            <td className="py-5 px-4">
                              <div className="flex items-center gap-2">
                                  <Users className="w-4 h-4 text-slate-400" />
                                  <span className="font-bold text-slate-900 text-sm">{agent.directDownline_count}</span>
                              </div>
                            </td>
                            <td className="py-5 px-4">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-100 text-emerald-700">
                                  {agent.status || 'Active'}
                              </span>
                            </td>
                            <td className="py-5 px-4 text-right pr-8">
                              <button
                                type="button"
                                aria-label={`Open ${agent.first_name} ${agent.last_name} profile`}
                                className="p-2 rounded-full hover:bg-slate-100 text-slate-300 hover:text-slate-600 transition-colors"
                              >
                                  <ChevronRight className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-slate-400 text-sm font-medium">
                            No downline agents found for this selection.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  <div className="flex flex-col gap-3 border-t border-slate-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
                      <span>
                        Showing {pageStart.toLocaleString()}-{pageEnd.toLocaleString()} of {totalAgents.toLocaleString()}
                      </span>
                      <select
                        value={perPage}
                        onChange={(event) => {
                          setPerPage(Number(event.target.value));
                          setPage(1);
                        }}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 outline-none"
                      >
                        {[10, 25, 50, 100].map(size => (
                          <option key={size} value={size}>{size} / page</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={currentPage <= 1 || loadingSelected}
                        onClick={() => setPage(current => Math.max(1, current - 1))}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Prev
                      </button>
                      <span className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-black text-white">
                        {currentPage} / {Math.max(pageTotal, 1)}
                      </span>
                      <button
                        type="button"
                        disabled={currentPage >= pageTotal || loadingSelected}
                        onClick={() => setPage(current => Math.min(pageTotal, current + 1))}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                  </>
              ) : (
                  // POLICIES TABLE
                  <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="text-slate-400 border-b border-slate-100/50">
                        <th className="py-5 pl-8 text-[10px] font-bold uppercase tracking-widest text-slate-400">Client & Date</th>
                        <th className="py-5 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Policy No.</th>
                        <th className="py-5 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Carrier / Product</th>
                        <th className="py-5 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Eff. Date</th>
                        <th className="py-5 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Premium</th>
                        <th className="py-5 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Status / Paid</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {loadingPolicies ? (
                        <tr>
                            <td colSpan={6} className="py-12 text-center">
                            <div className="flex items-center justify-center gap-3 text-slate-400">
                                <Loader2 className="w-6 h-6 animate-spin" />
                                <span className="text-sm font-bold">Loading policies...</span>
                            </div>
                            </td>
                        </tr>
                        ) : policies.length > 0 ? (
                        policies.map((policy) => (
                            <tr key={policy.policy_id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-5 pl-8">
                                <div className="flex flex-col">
                                    <span className="font-bold text-slate-900 text-sm">{policy.client}</span>
                                    <span className="text-[11px] text-slate-400 font-bold mt-0.5">{formatDate(policy.created_at)}</span>
                                </div>
                            </td>
                            <td className="py-5 px-4">
                                <div className="flex items-center gap-1.5">
                                    <span className="inline-flex items-center px-2 py-1 rounded-lg bg-slate-50 border border-slate-100 text-[10px] font-bold text-slate-500 font-mono">
                                        #{policy.policy_number || 'PENDING'}
                                    </span>
                                    {policy.isLocked && (
                                        <Lock className="w-3 h-3 text-slate-400" />
                                    )}
                                </div>
                            </td>
                            <td className="py-5 px-4">
                                <div className="flex flex-col">
                                    <span className="font-bold text-slate-900 text-xs">{policy.carrier}</span>
                                    <span className="text-[10px] text-slate-400 font-medium">{policy.carrier_product}</span>
                                </div>
                            </td>
                            <td className="py-5 px-4">
                                <span className="font-bold text-slate-900 text-xs">{formatDate(policy.initial_draft_date)}</span>
                            </td>
                            <td className="py-5 px-4">
                                <div className="flex flex-col">
                                    <span className="font-bold text-slate-900 text-sm">${policy.annual_premium.toLocaleString('en-US', { minimumFractionDigits: 0 })}</span>
                                    <span className="text-[10px] text-slate-400 font-medium">Annual</span>
                                </div>
                            </td>
                            <td className="py-5 px-4">
                                <div className="flex flex-col items-start gap-1">
                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold ${getStatusStyles(policy.status)}`}>
                                    {policy.status}
                                    </span>
                                    {policy.paid_status && (
                                    <span className="text-[10px] font-bold text-slate-500 px-1">
                                        {policy.paid_status}
                                    </span>
                                    )}
                                </div>
                            </td>
                            </tr>
                        ))
                        ) : (
                        <tr>
                            <td colSpan={6} className="py-12 text-center text-slate-400 text-sm font-medium">
                                No policies found for this period.
                            </td>
                        </tr>
                        )}
                    </tbody>
                  </table>
              )}
            </div>
          </div>
      )}
    </div>
  );
};
