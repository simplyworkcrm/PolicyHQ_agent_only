import React, { useEffect, useState, useRef } from 'react';
import { 
  Users, 
  UserX, 
  Search, 
  Filter, 
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
  Hash
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAgentContext } from '../context/AgentContext';
import { agentDownlineApi, DownlineAgent, DownlineHierarchy } from '../services/agentDownlineApi';
import { agentPoliciesApi } from '../services/agentPoliciesApi';
import { Policy } from '../../../shared/types/index';

interface DateRange {
    start: number;
    end: number;
    label: string;
}

// --- HELPERS & UTILITIES ---

const getDateRange = (type: 'today' | 'weekly' | 'monthly' | 'yearly'): DateRange => {
    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);
    
    start.setHours(0,0,0,0);
    end.setHours(23,59,59,999);

    if (type === 'today') return { start: start.getTime(), end: end.getTime(), label: 'Today' };
    
    if (type === 'weekly') {
        const day = start.getDay(); // 0 is Sunday
        const diff = start.getDate() - day; // Start of week (Sunday)
        start.setDate(diff);
        end.setDate(diff + 6);
        end.setHours(23,59,59,999);
        return { start: start.getTime(), end: end.getTime(), label: 'Weekly' };
    }

    if (type === 'monthly') {
        start.setDate(1);
        const endMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        endMonth.setHours(23,59,59,999);
        return { start: start.getTime(), end: endMonth.getTime(), label: 'Monthly' };
    }

    if (type === 'yearly') {
        start.setMonth(0, 1);
        const endYear = new Date(now.getFullYear(), 11, 31);
        endYear.setHours(23,59,59,999);
        return { start: start.getTime(), end: endYear.getTime(), label: 'Yearly' };
    }
    
    return { start: start.getTime(), end: end.getTime(), label: 'Custom' };
};

const formatDate = (date: string | number | undefined) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
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
                onChange({ start: s.getTime(), end: e.getTime(), label: 'Custom Range' });
                setIsOpen(false);
            } else {
                setSelectionEnd(date);
                const s = selectionStart;
                const e = date;
                s.setHours(0,0,0,0);
                e.setHours(23,59,59,999);
                onChange({ start: s.getTime(), end: e.getTime(), label: 'Custom Range' });
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

export const AgentDownlines: React.FC = () => {
  const { currentAgentId, selectedAgentIds, subAgents, viewingAgentName, hasAgentProfile } = useAgentContext();
  const navigate = useNavigate();

  // Main View State
  const [selectedAgentId, setSelectedAgentId] = useState<string>(currentAgentId);
  const [selectedHierarchyData, setSelectedHierarchyData] = useState<DownlineHierarchy | null>(null);
  const [loadingSelected, setLoadingSelected] = useState(false);
  
  // Tabs & Views
  const [viewMode, setViewMode] = useState<'team' | 'policies'>('team');

  // Policy Table State
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loadingPolicies, setLoadingPolicies] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>(getDateRange('monthly'));
  
  // Table Filtering
  const [tableSearch, setTableSearch] = useState('');

  // 1. Keep the direct-downline request scoped to one selected agent.
  useEffect(() => {
    const scopeIds = selectedAgentIds.filter(Boolean);
    const nextSelectedId = scopeIds.includes(selectedAgentId) ? selectedAgentId : (scopeIds[0] || currentAgentId);
    if (nextSelectedId && nextSelectedId !== selectedAgentId) {
      setSelectedAgentId(nextSelectedId);
      setTableSearch('');
    }
  }, [currentAgentId, selectedAgentId, selectedAgentIds]);

  // 2. Fetch Selected Agent Hierarchy Data
  useEffect(() => {
    if (selectedAgentId) {
        setLoadingSelected(true);
        agentDownlineApi.getHierarchy(selectedAgentId)
            .then(data => setSelectedHierarchyData(data))
            .catch(err => console.error(err))
            .finally(() => setLoadingSelected(false));
    }
  }, [selectedAgentId]);

  // 3. Fetch Policies when viewMode is policies or dates change
  useEffect(() => {
    if (selectedAgentId && viewMode === 'policies') {
        setLoadingPolicies(true);
        agentPoliciesApi.getPolicies(selectedAgentId, dateRange.start, dateRange.end)
            .then(setPolicies)
            .catch(err => console.error(err))
            .finally(() => setLoadingPolicies(false));
    }
  }, [selectedAgentId, dateRange, viewMode]);

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

  // Filter Table Agents (from selectedHierarchyData)
  const tableAgents = selectedHierarchyData?.direct_downlines?.filter(a => {
    const search = tableSearch.toLowerCase();
    return [
      a.first_name,
      a.last_name,
      a.ref_ffl_agency_name,
      a.phone,
      a.npn,
    ].some(value => String(value || '').toLowerCase().includes(search));
  }) || [];

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
    <div className="font-sans w-full">
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex flex-col gap-5">
                <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4">
                    <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Downline Scope</p>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight truncate">{selectedAgentLabel}</h2>
                        <p className="text-xs font-semibold text-slate-400 mt-1">
                          Direct downlines are loaded one agent at a time.
                        </p>
                    </div>

                    <div className="flex gap-1 p-1 bg-slate-50 rounded-xl border border-slate-100 shrink-0">
                         <button 
                            onClick={() => setViewMode('team')}
                            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${viewMode === 'team' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                         >
                            Team List
                         </button>
                         <button 
                            onClick={() => setViewMode('policies')}
                            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${viewMode === 'policies' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                         >
                            Production
                         </button>
                    </div>
                </div>

                {agentSwitchOptions.length > 1 && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {agentSwitchOptions.map(agent => {
                      const active = agent.id === selectedAgentId;
                      return (
                        <button
                          key={agent.id}
                          onClick={() => {
                            setSelectedAgentId(agent.id);
                            setTableSearch('');
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

                {!agentSwitchOptions.some(agent => agent.id === selectedAgentId) && (
                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
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

                {viewMode === 'team' ? (
                     <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input 
                                type="text" 
                                placeholder="Filter list..." 
                                value={tableSearch}
                                onChange={(e) => setTableSearch(e.target.value)}
                                className="pl-11 pr-4 py-2.5 bg-slate-50 border border-transparent rounded-xl text-sm font-bold focus:bg-white focus:border-brand-200 focus:ring-4 focus:ring-brand-500/10 transition-all w-64 text-slate-800 placeholder:font-medium"
                            />
                        </div>
                        <button className="p-2.5 bg-slate-50 rounded-xl hover:bg-slate-100 text-slate-500 border border-slate-100 hover:border-slate-200 transition-all">
                            <Filter className="w-4 h-4" />
                        </button>
                    </div>
                ) : (
                    <DateRangeSelector value={dateRange} onChange={setDateRange} />
                )}
            </div>

            <div className="overflow-x-auto">
              {viewMode === 'team' ? (
                  // TEAM TABLE
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-100/50">
                        <th className="py-5 pl-8 text-[10px] font-bold uppercase tracking-widest text-slate-400">Agent Name</th>
                        <th className="py-5 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Agency</th>
                        <th className="py-5 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Phone</th>
                        <th className="py-5 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">NPN</th>
                        <th className="py-5 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Direct Downlines</th>
                        <th className="py-5 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Status</th>
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
    </div>
  );
};
