import React, { useEffect, useState, useMemo, useRef } from 'react';
import { 
    AlertCircle, 
    UserX, 
    Loader2, 
    CheckCircle2, 
    Clock, 
    Search,
    Filter,
    ArrowUpDown,
    ChevronLeft,
    ChevronRight,
    Calendar,
    ChevronDown,
    CheckCircle
} from 'lucide-react';
import { useAgentContext } from '../context/AgentContext';
import { agentDebtRecoveryApi, DebtSummary, DebtRecord } from '../services/agentDebtRecoveryApi';
import { AgentDebtDetails } from './AgentDebtDetails';
import { PolicyDateRangeFilter, PoliciesTimeframe } from './AgentPoliciesV2';
import { WorkspaceToolbarPortal } from './WorkspaceToolbarPortal';

type SortConfig = {
    key: keyof DebtRecord;
    direction: 'asc' | 'desc';
};

interface DateRange {
    start: number;
    end: number;
    label: string;
}

const formatDate = (timestamp: number) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const getDateRange = (type: 'today' | 'weekly' | 'monthly' | 'yearly' | 'all'): DateRange => {
    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);
    
    start.setHours(0,0,0,0);
    end.setHours(23,59,59,999);

    if (type === 'today') return { start: start.getTime(), end: end.getTime(), label: 'Today' };
    
    if (type === 'weekly') {
        const day = start.getDay(); 
        const diff = start.getDate() - day; 
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

    if (type === 'all') {
        return { start: 0, end: end.getTime(), label: 'All Time' };
    }
    
    return { start: start.getTime(), end: end.getTime(), label: 'Custom' };
};

// --- COMPONENT: MainDateRangeSelector ---
const MainDateRangeSelector: React.FC<{
    value: DateRange;
    onChange: (range: DateRange) => void;
    placeholder?: string;
}> = ({ value, onChange, placeholder = "Select Range" }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [view, setView] = useState<'presets' | 'calendar'>('presets');
    const containerRef = useRef<HTMLDivElement>(null);
    
    // Calendar State
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

    const handlePresetClick = (type: 'today' | 'weekly' | 'monthly' | 'yearly' | 'all') => {
        onChange(getDateRange(type));
        setIsOpen(false);
        setView('presets');
    };

    const handleCustomClick = () => {
        setView('calendar');
        setSelectionStart(null);
        setSelectionEnd(null);
    };

    const changeMonth = (delta: number) => {
        const newMonth = new Date(currentMonth);
        newMonth.setMonth(newMonth.getMonth() + delta);
        setCurrentMonth(newMonth);
    };

    const handleDateClick = (date: Date) => {
        let newStart = selectionStart;
        let newEnd = selectionEnd;

        if (!newStart || (newStart && newEnd)) {
            newStart = date;
            newEnd = null;
        } else {
            if (date < newStart) {
                newEnd = newStart;
                newStart = date;
            } else {
                newEnd = date;
            }
        }

        setSelectionStart(newStart);
        setSelectionEnd(newEnd);

        if (newStart && newEnd) {
            const s = new Date(newStart);
            const e = new Date(newEnd);
            s.setHours(0,0,0,0);
            e.setHours(23,59,59,999);
            
            setTimeout(() => {
                setIsOpen(false);
                setView('presets');
            }, 300);
            
            onChange({ 
                start: s.getTime(), 
                end: e.getTime(), 
                label: `${s.toLocaleDateString()} - ${e.toLocaleDateString()}` 
            });
        }
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
       <div className="relative z-50 w-full sm:w-auto" ref={containerRef}>
          <button 
              onClick={() => { setIsOpen(!isOpen); setView('presets'); }}
              className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-2 px-5 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 hover:bg-slate-50 transition-all shadow-sm hover:shadow-md"
          >
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-brand-500" />
                <span>{value.label}</span>
              </div>
              <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
          {isOpen && (
              <div className="absolute top-full right-0 mt-3 bg-white rounded-[2rem] shadow-2xl shadow-slate-200/50 border border-slate-100 p-2 min-w-[300px] z-[60] animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                  {view === 'presets' ? (
                      <div className="flex flex-col gap-1 p-2">
                           {['Today', 'Weekly', 'Monthly', 'Yearly', 'All'].map((item) => (
                              <button
                                  key={item}
                                  onClick={() => handlePresetClick(item.toLowerCase() as any)}
                                  className={`w-full text-left px-5 py-3.5 rounded-2xl text-sm font-bold transition-all flex items-center justify-between ${value.label === (item === 'All' ? 'All Time' : item) ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
                              >
                                  {item === 'All' ? 'All Time' : item}
                                  {value.label === (item === 'All' ? 'All Time' : item) && <CheckCircle className="w-4 h-4 text-brand-400" />}
                              </button>
                          ))}
                          <div className="h-px bg-slate-100 my-1"></div>
                          <button
                              onClick={handleCustomClick}
                              className={`w-full text-left px-5 py-3.5 rounded-2xl text-sm font-bold transition-all flex items-center justify-between ${value.label.includes('-') ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
                          >
                              Custom Range
                              <Calendar className={`w-4 h-4 ${value.label.includes('-') ? 'text-brand-400' : 'text-slate-400'}`} />
                          </button>
                      </div>
                  ) : (
                      <div className="p-4">
                          <div className="flex items-center justify-between mb-4 bg-slate-50 p-2 rounded-xl">
                              <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-slate-900 transition-colors shadow-sm"><ChevronLeft className="w-4 h-4" /></button>
                              <span className="font-bold text-slate-900 text-sm">{MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}</span>
                              <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-slate-900 transition-colors shadow-sm"><ChevronRight className="w-4 h-4" /></button>
                          </div>
                          <div className="grid grid-cols-7 mb-2 text-center">{['S','M','T','W','T','F','S'].map((d,i) => <span key={i} className="text-[10px] font-bold text-slate-400">{d}</span>)}</div>
                          <div className="grid grid-cols-7 gap-1">
                              {generateCalendar().map((date, i) => (
                                  <div key={i} className="aspect-square">
                                      {date ? (
                                          <button 
                                              onClick={() => handleDateClick(date)} 
                                              className={`
                                                  w-full h-full flex items-center justify-center rounded-lg text-xs font-bold transition-all
                                                  ${isSelected(date) ? 'bg-brand-500 text-white shadow-md shadow-brand-200' : ''}
                                                  ${isInRange(date) ? 'bg-brand-50 text-brand-900' : ''}
                                                  ${!isSelected(date) && !isInRange(date) ? 'text-slate-700 hover:bg-slate-50' : ''}
                                              `}
                                          >
                                              {date.getDate()}
                                          </button>
                                      ) : <div />}
                                  </div>
                              ))}
                          </div>
                          <div className="mt-4 pt-3 border-t border-slate-100 flex justify-center flex-col items-center gap-2">
                              <p className="text-[10px] font-bold text-slate-400">Select start and end date</p>
                              <button 
                                  onClick={() => setView('presets')}
                                  className="text-xs font-bold text-brand-500 hover:text-brand-600 transition-colors"
                              >
                                  Back to Presets
                              </button>
                          </div>
                      </div>
                  )}
              </div>
          )}
       </div>
    );
};

export const AgentDebtRecovery: React.FC<{ toolbarSlotId?: string }> = ({ toolbarSlotId }) => {
  const { currentAgentId, hasAgentProfile } = useAgentContext();
  
  // Summary State
  const [summary, setSummary] = useState<DebtSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  // Table State
  const [debts, setDebts] = useState<DebtRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  
  // Selected Debt for Drawer
  const [selectedDebt, setSelectedDebt] = useState<DebtRecord | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'unresolved' | 'resolved' | 'all'>('unresolved');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>(getDateRange('all'));
  const toolbarTimeframe: PoliciesTimeframe = dateRange.label === 'All Time'
      ? 'all'
      : dateRange.label.toLowerCase() as PoliciesTimeframe;

  const handleToolbarTimeframeChange = (nextTimeframe: PoliciesTimeframe) => {
      if (nextTimeframe === 'custom') return;
      setDateRange(getDateRange(nextTimeframe));
  };

  // Pagination & Sort
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'statement_date', direction: 'desc' });

  useEffect(() => {
    if (currentAgentId) {
        setLoadingSummary(true);
        agentDebtRecoveryApi.getDebtSummary(currentAgentId)
            .then(data => setSummary(data))
            .catch(err => console.error("Failed to load debt summary", err))
            .finally(() => setLoadingSummary(false));
    }
  }, [currentAgentId]);

  useEffect(() => {
    if (currentAgentId) {
        setLoadingRecords(true);
        agentDebtRecoveryApi.getDebtRecords(currentAgentId, statusFilter)
            .then(data => setDebts(data))
            .catch(err => console.error("Failed to load debt records", err))
            .finally(() => setLoadingRecords(false));
    }
  }, [currentAgentId, statusFilter]);

  // Update local state when a debt record is modified in the drawer
  const handleDebtUpdate = (updatedDebt: DebtRecord) => {
      // Update list
      setDebts(prev => prev.map(d => d.id === updatedDebt.id ? updatedDebt : d));
      if (selectedDebt && selectedDebt.id === updatedDebt.id) {
          setSelectedDebt(updatedDebt);
      }

      // Sync summary state
      if (!summary) return;
      const amount = updatedDebt.amount;
      const isNowResolved = updatedDebt.isResolved;

      setSummary(prev => {
          if (!prev) return null;
          const newSummary = { ...prev };
          
          if (isNowResolved) {
              // Moved from Unresolved -> Resolved
              // Note: Only subtract from unresolved / add to resolved if it WAS unresolved before.
              // Assuming update came from a toggle action that flipped the state.
              // However, since we don't track previous state explicitly here, we rely on the fact that
              // 'resolveDebt' api call toggles it.
              // A safer approach if we don't know the previous state:
              // But here we know the user just clicked "Mark Resolved" or "Mark Unresolved" which flips it.
              
              // If current view is filtered, the item might disappear from list, but summary should update.
              // We'll optimistically update summary based on the new state.
              
              // Decrement unresolved, increment resolved
              newSummary.unresolved = {
                  total_amount: Math.max(0, prev.unresolved.total_amount - amount),
                  records: Math.max(0, prev.unresolved.records - 1)
              };
              newSummary.resolved = {
                  total_amount: prev.resolved.total_amount + amount,
                  records: prev.resolved.records + 1
              };
          } else {
              // Moved from Resolved -> Unresolved
              newSummary.resolved = {
                  total_amount: Math.max(0, prev.resolved.total_amount - amount),
                  records: Math.max(0, prev.resolved.records - 1)
              };
              newSummary.unresolved = {
                  total_amount: prev.unresolved.total_amount + amount,
                  records: prev.unresolved.records + 1
              };
          }
          return newSummary;
      });
  };

  // --- Process Data (Filter, Sort, Paginate) ---
  const processedData = useMemo(() => {
      let data = [...debts];

      // 1. Search Text
      if (searchTerm) {
          const lower = searchTerm.toLowerCase();
          data = data.filter(d => 
              d.carrier.toLowerCase().includes(lower) || 
              d.created_by.toLowerCase().includes(lower) ||
              d.amount.toString().includes(lower)
          );
      }

      // 2. Date Filter using DateRange
      data = data.filter(d => d.statement_date >= dateRange.start && d.statement_date <= dateRange.end);

      // 3. Sorting
      if (sortConfig) {
          data.sort((a, b) => {
              const aVal = a[sortConfig.key];
              const bVal = b[sortConfig.key];

              if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
              if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
              return 0;
          });
      }

      return data;
  }, [debts, searchTerm, dateRange, sortConfig]);

  const totalPages = Math.ceil(processedData.length / rowsPerPage);
  const paginatedData = processedData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const handleSort = (key: keyof DebtRecord) => {
      setSortConfig(current => ({
          key,
          direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
      }));
  };

  if (!hasAgentProfile) {
    return (
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-8 flex flex-col items-center justify-center min-h-[400px] text-center">
         <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-6 shadow-inner">
           <UserX className="w-10 h-10 text-slate-300" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">No Agent Profile Connected</h2>
        <p className="text-slate-500 max-w-md">
           You don't have an Agent Profile connected. Please switch to an agent workspace to view debt and recovery logs.
        </p>
      </div>
    );
  }

  return (
    <div className="font-sans flex flex-col gap-8 max-w-[1600px] mx-auto w-full pb-20 relative">
        <WorkspaceToolbarPortal slotId={toolbarSlotId} fallbackClassName="flex justify-start">
            <PolicyDateRangeFilter
                timeframe={toolbarTimeframe}
                startDate={dateRange.start}
                endDate={dateRange.end}
                onTimeframeChange={handleToolbarTimeframeChange}
                onDateChange={(start, end) => {
                    if (start !== undefined && end !== undefined) {
                        setDateRange({ start, end, label: 'Custom' });
                    }
                }}
                variant="inline"
            />
        </WorkspaceToolbarPortal>

        {/* SUMMARY CARDS */}
        {loadingSummary ? (
            <div className="h-48 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="w-10 h-10 animate-spin mb-4 text-slate-300" />
                <p className="text-xs font-bold uppercase tracking-widest">Calculating Debt Exposure...</p>
            </div>
        ) : summary ? (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-stretch animate-in fade-in duration-300">
                
                {/* Overall Debt Record */}
                <div 
                    onClick={() => setStatusFilter('all')}
                    className={`bg-white rounded-[2.5rem] p-8 border shadow-sm relative overflow-hidden group cursor-pointer transition-all duration-300
                        ${statusFilter === 'all' 
                            ? 'border-brand-500 ring-2 ring-brand-500/20 shadow-xl shadow-brand-500/10' 
                            : 'border-slate-100 hover:border-brand-200 hover:shadow-md'
                        }
                    `}
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                    
                    <div className="flex justify-between items-start mb-8 relative z-10">
                        <div>
                            <h3 className="text-lg font-black text-slate-900">Overall Debt Record</h3>
                            <p className="text-slate-400 text-xs font-bold mt-1 uppercase tracking-wider">Chargebacks + Vectors</p>
                        </div>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-colors ${statusFilter === 'all' ? 'bg-red-500 text-white border-red-600' : 'bg-red-50 text-red-500 border-red-100'}`}>
                            <AlertCircle className="w-5 h-5" />
                        </div>
                    </div>

                    <div className="mb-4 relative z-10">
                        <h2 className="text-5xl font-black text-slate-900 tracking-tighter">
                            ${summary.overall.overalltotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h2>
                        <div className="flex items-center gap-2 mt-3">
                            <span className="bg-red-50 text-red-600 px-2 py-1 rounded-lg text-xs font-bold border border-red-100">
                                {summary.overall.overallrecords} Total Records
                            </span>
                        </div>
                    </div>
                </div>

                {/* Unresolved / Active Debt */}
                <div 
                    onClick={() => setStatusFilter('unresolved')}
                    className={`bg-white rounded-[2.5rem] p-8 border shadow-sm relative overflow-hidden group cursor-pointer transition-all duration-300
                        ${statusFilter === 'unresolved' 
                            ? 'border-amber-500 ring-2 ring-amber-500/20 shadow-xl shadow-amber-500/10' 
                            : 'border-slate-100 hover:border-amber-200 hover:shadow-md'
                        }
                    `}
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>

                    <div className="flex justify-between items-start mb-8 relative z-10">
                        <div>
                            <h3 className="text-lg font-black text-slate-900">Unresolved</h3>
                            <p className="text-slate-400 text-xs font-bold mt-1 uppercase tracking-wider">Pending Action</p>
                        </div>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-colors ${statusFilter === 'unresolved' ? 'bg-amber-500 text-white border-amber-600' : 'bg-amber-50 text-amber-500 border-amber-100'}`}>
                            <Clock className="w-5 h-5" />
                        </div>
                    </div>

                    <div className="mb-4 relative z-10">
                        <h2 className="text-5xl font-black text-slate-900 tracking-tighter">
                            ${summary.unresolved.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h2>
                        <div className="flex items-center gap-2 mt-3">
                            <span className="bg-amber-50 text-amber-600 px-2 py-1 rounded-lg text-xs font-bold border border-amber-100">
                                {summary.unresolved.records} Pending Items
                            </span>
                        </div>
                    </div>
                </div>

                {/* Resolved */}
                <div 
                    onClick={() => setStatusFilter('resolved')}
                    className={`bg-white rounded-[2.5rem] p-8 border shadow-sm relative overflow-hidden group cursor-pointer transition-all duration-300
                        ${statusFilter === 'resolved' 
                            ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-xl shadow-emerald-500/10' 
                            : 'border-slate-100 hover:border-emerald-200 hover:shadow-md'
                        }
                    `}
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>

                    <div className="flex justify-between items-start mb-8 relative z-10">
                        <div>
                            <h3 className="text-lg font-black text-slate-900">Resolved</h3>
                            <p className="text-slate-400 text-xs font-bold mt-1 uppercase tracking-wider">Cleared & Paid</p>
                        </div>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-colors ${statusFilter === 'resolved' ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-emerald-50 text-emerald-500 border-emerald-100'}`}>
                            <CheckCircle2 className="w-5 h-5" />
                        </div>
                    </div>

                    <div className="mb-4 relative z-10">
                        <h2 className="text-5xl font-black text-slate-900 tracking-tighter">
                            ${summary.resolved.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h2>
                        <div className="flex items-center gap-2 mt-3">
                            <span className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded-lg text-xs font-bold border border-emerald-100">
                                {summary.resolved.records} Cleared Items
                            </span>
                        </div>
                    </div>
                </div>

            </div>
        ) : (
            <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-slate-200 rounded-[2rem] bg-slate-50/50 mb-6">
                <p className="text-slate-400 text-sm font-medium">No Summary Data</p>
            </div>
        )}

        {/* RECORDS TABLE */}
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden relative">
            {/* Table Header / Filters */}
            <div className="p-8 border-b border-slate-50 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-red-50 rounded-2xl text-red-500 border border-red-100">
                        <AlertCircle className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Debt Records</h3>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mt-0.5">
                            {processedData.length} entries found
                        </p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
                    <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Search carrier, amount..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-slate-700 placeholder:text-slate-400 shadow-sm"
                        />
                    </div>

                    {/* Status Filter Buttons */}
                    <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200">
                        {(['unresolved', 'resolved', 'all'] as const).map(status => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${statusFilter === status ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                {status}
                            </button>
                        ))}
                    </div>

                </div>
            </div>

            {/* Table Content */}
            <div className="overflow-x-auto min-h-[400px]">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="text-slate-400 border-b border-slate-100/50">
                            <th className="py-5 pl-8 text-[10px] font-bold uppercase tracking-widest text-slate-400 w-32">Status</th>
                            <th 
                                className="py-5 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 cursor-pointer hover:text-brand-500 group"
                                onClick={() => handleSort('carrier')}
                            >
                                <div className="flex items-center gap-1">Carrier <ArrowUpDown className="w-3 h-3" /></div>
                            </th>
                            <th 
                                className="py-5 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 cursor-pointer hover:text-brand-500 group"
                                onClick={() => handleSort('amount')}
                            >
                                <div className="flex items-center gap-1">Amount <ArrowUpDown className="w-3 h-3" /></div>
                            </th>
                            <th 
                                className="py-5 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 cursor-pointer hover:text-brand-500 group"
                                onClick={() => handleSort('statement_date')}
                            >
                                <div className="flex items-center gap-1">Date Created <ArrowUpDown className="w-3 h-3" /></div>
                            </th>
                            <th className="py-5 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Created By</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {loadingRecords ? (
                            <tr>
                                <td colSpan={5} className="py-12 text-center">
                                    <div className="flex items-center justify-center gap-3 text-slate-400">
                                        <Loader2 className="w-6 h-6 animate-spin" />
                                        <span className="text-sm font-medium">Loading records...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : paginatedData.length > 0 ? (
                            paginatedData.map((record) => (
                                <tr 
                                    key={record.id} 
                                    className="hover:bg-slate-50/50 transition-colors cursor-pointer group"
                                    onClick={() => setSelectedDebt(record)}
                                >
                                    <td className="py-5 pl-8">
                                        {record.isResolved ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wide border border-emerald-200">
                                                <CheckCircle2 className="w-3 h-3" /> Resolved
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-100 text-red-700 text-[10px] font-bold uppercase tracking-wide border border-red-200">
                                                <AlertCircle className="w-3 h-3" /> Unresolved
                                            </span>
                                        )}
                                    </td>
                                    <td className="py-5 px-4">
                                        <span className="text-sm font-bold text-slate-900">{record.carrier}</span>
                                    </td>
                                    <td className="py-5 px-4">
                                        <span className={`text-sm font-black ${record.isResolved ? 'text-emerald-600' : 'text-red-600'}`}>
                                            ${record.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                        </span>
                                    </td>
                                    <td className="py-5 px-4">
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                            <span className="text-xs font-bold">{formatDate(record.statement_date)}</span>
                                        </div>
                                    </td>
                                    <td className="py-5 px-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 border border-slate-200">
                                                {record.created_by.charAt(0)}
                                            </div>
                                            <span className="text-xs font-bold text-slate-700">{record.created_by}</span>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={5} className="py-12 text-center text-slate-400 text-sm font-medium">
                                    No debt records found matching your criteria.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="p-6 border-t border-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs font-bold text-slate-500">
                    Showing <span className="text-slate-900">{paginatedData.length > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0}</span> to <span className="text-slate-900">{Math.min(currentPage * rowsPerPage, processedData.length)}</span> of <span className="text-slate-900">{processedData.length}</span> entries
                </div>
                
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Rows</span>
                        <select 
                            value={rowsPerPage}
                            onChange={(e) => {
                                setRowsPerPage(Number(e.target.value));
                                setCurrentPage(1);
                            }}
                            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                        >
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-1">
                        <button 
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-xs font-bold text-slate-700 px-2">
                            Page {currentPage}
                        </span>
                        <button 
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages || totalPages === 0}
                            className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>

        {selectedDebt && (
            <AgentDebtDetails 
                debt={selectedDebt} 
                onClose={() => setSelectedDebt(null)} 
                onUpdate={handleDebtUpdate}
            />
        )}
    </div>
  );
};
