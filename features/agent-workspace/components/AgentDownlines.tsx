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
  ArrowUpDown,
  ReceiptText,
  AlertCircle,
  DollarSign,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAgentContext } from '../context/AgentContext';
import { agentDownlineApi, DownlineAgent, DownlineHierarchy } from '../services/agentDownlineApi';
import { agencyExpenseManagementApi, AgencyExpenseLogRow, AgencyExpenseLogSummary, AgencyExpenseOverviewResponse, AgencyExpenseRiskAgent, AgencyExpenseRiskAgency } from '../services/agencyExpenseManagementApi';
import { AgentPoliciesV2 } from './AgentPoliciesV2';
import { BusinessOverviewDashboard } from './BusinessOverviewDashboard';
import { Policy } from '../../../shared/types/index';

type DownlineSortKey = 'first_name' | 'direct_upline_name' | 'ref_ffl_agency_name' | 'phone' | 'npn' | 'direct_downlines' | 'status';
type DownlineSortConfig = { key: DownlineSortKey; direction: 'asc' | 'desc' };

interface AgencyDebtRow {
  id?: string | number;
  created_at?: string | number | null;
  agent_id?: string | null;
  amount?: number | string | null;
  isResolved?: boolean | null;
  agentName?: string | null;
  agent_name?: string | null;
  carrier_name?: string | null;
  profile?: unknown;
  notes?: string | null;
  [key: string]: unknown;
}

interface AgencyDebtsSummary {
  total_debts?: number | string | null;
  debts_count?: number | string | null;
  debt_count?: number | string | null;
  [key: string]: unknown;
}

interface RiskDockState {
  title: string;
  eyebrow: string;
  amountLabel: string;
  rows: Array<{
    id: string;
    name: string;
    helper?: string;
    amount: number;
    production: number;
    riskGap: number;
  }>;
}

interface DateRange {
    start: number;
    end: number;
    label: string;
    timeframe: 'all' | 'today' | 'weekly' | 'monthly' | 'yearly' | 'custom';
}

const AGENCY_EXPENSE_LOG_URL = 'https://api1.simplyworkcrm.com/api:SZgR1JsR/my_agency/expense-management/expense-log';
const AGENCY_DEBTS_URL = 'https://api1.simplyworkcrm.com/api:SZgR1JsR/my_agency/expense-management/debts';

// --- HELPERS & UTILITIES ---

const getDateRange = (type: 'all' | 'today' | 'weekly' | 'monthly' | 'yearly'): DateRange => {
    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);
    
    start.setHours(0,0,0,0);
    end.setHours(23,59,59,999);

    if (type === 'all') return { start: 0, end: end.getTime(), label: 'All Time', timeframe: 'all' };
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
  direct_upline_name: 'direct_upline_name',
  ref_ffl_agency_name: 'ref_ffl_agency_name',
  phone: 'phone',
  npn: 'npn',
  direct_downlines: 'direct_downlines',
  status: 'status',
};

const moneyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const toNumber = (value: unknown) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') return Number(value.replace(/[^0-9.-]/g, '')) || 0;
  return 0;
};

const formatMoney = (value: unknown) => moneyFormatter.format(toNumber(value));

const formatRiskGap = (gap: number) => moneyFormatter.format(gap);

const formatExpenseDate = (value?: string | null) => {
  if (!value) return 'N/A';
  const dateKey = value.slice(0, 10);
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = year && month && day ? new Date(year, month - 1, day) : new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
};

const formatTimestampDate = (value?: string | number | null) => {
  if (value === null || value === undefined || value === '') return 'N/A';
  const numeric = typeof value === 'number' ? value : Number(value);
  const date = Number.isFinite(numeric) ? new Date(numeric) : new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
};

const safeText = (value: unknown, fallback = '-') => {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return fallback;
};

const getRowAgentName = (row: AgencyExpenseLogRow | AgencyDebtRow) => safeText(
  row.agent_name ?? row.agentName ?? row.name ?? row.full_name,
  'Agency agent'
);

const getRowProfileUrl = (row: AgencyExpenseLogRow | AgencyDebtRow) => {
  const profile = row.profile ?? row.agent_profile ?? row.agentProfile ?? row.profile_url ?? row.profileUrl ?? row.image_url ?? row.avatar_url;
  if (typeof profile === 'string') return profile;
  if (profile && typeof profile === 'object') {
    const record = profile as Record<string, unknown>;
    return safeText(record.url ?? record.src ?? record.profile ?? record.path, '');
  }
  return '';
};

const getExpenseAgentName = getRowAgentName;
const getExpenseProfileUrl = getRowProfileUrl;

const getNameInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'AG';
  return `${parts[0]?.[0] || ''}${parts[1]?.[0] || ''}`.toUpperCase() || 'AG';
};

const fetchAgencyExpenseLog = async ({
  agentId,
  timeframe,
  startDate,
  endDate,
}: {
  agentId: string;
  timeframe: DateRange['timeframe'] | null;
  startDate: string | null;
  endDate: string | null;
}) => {
  const params = new URLSearchParams();

  params.set('agent_id', agentId);
  if (timeframe && timeframe !== 'all') params.set('timeframe', timeframe);
  if (timeframe === 'custom') {
    if (startDate) params.set('start_date', startDate);
    if (endDate) params.set('end_date', endDate);
  }

  const response = await fetch(`${AGENCY_EXPENSE_LOG_URL}?${params.toString()}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${localStorage.getItem('authToken')}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
};

const fetchAgencyDebts = async (agentId: string) => {
  const params = new URLSearchParams();
  params.set('agent_id', agentId);

  const response = await fetch(`${AGENCY_DEBTS_URL}?${params.toString()}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${localStorage.getItem('authToken')}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
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

    const handlePresetClick = (type: 'all' | 'today' | 'weekly' | 'monthly' | 'yearly') => {
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
                            {['All Time', 'Today', 'Weekly', 'Monthly', 'Yearly'].map((item) => (
                                <button
                                    key={item}
                                    onClick={() => handlePresetClick(item === 'All Time' ? 'all' : item.toLowerCase() as any)}
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

const AgencyExpenseManagement: React.FC<{
  selectedAgentId: string;
  selectedAgentLabel: string;
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
}> = ({ selectedAgentId, selectedAgentLabel, dateRange, onDateRangeChange }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'expenses' | 'debts'>('overview');
  const [overviewData, setOverviewData] = useState<AgencyExpenseOverviewResponse['overview'] | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [agencyRiskData, setAgencyRiskData] = useState<AgencyExpenseRiskAgency[]>([]);
  const [agencyRiskLoading, setAgencyRiskLoading] = useState(false);
  const [agencyRiskError, setAgencyRiskError] = useState<string | null>(null);
  const [expenseRows, setExpenseRows] = useState<AgencyExpenseLogRow[]>([]);
  const [expenseSummary, setExpenseSummary] = useState<AgencyExpenseLogSummary>({});
  const [expenseLoading, setExpenseLoading] = useState(false);
  const [expenseError, setExpenseError] = useState<string | null>(null);
  const [debtRows, setDebtRows] = useState<AgencyDebtRow[]>([]);
  const [debtSummary, setDebtSummary] = useState<AgencyDebtsSummary>({});
  const [debtLoading, setDebtLoading] = useState(false);
  const [debtError, setDebtError] = useState<string | null>(null);
  const [riskScope, setRiskScope] = useState<'agents' | 'agencies'>('agents');
  const [riskDock, setRiskDock] = useState<RiskDockState | null>(null);

  const tabs = [
    { key: 'overview' as const, label: 'Overview', icon: FileText },
    { key: 'expenses' as const, label: 'Expense Logs', icon: ReceiptText },
    { key: 'debts' as const, label: 'Debts', icon: AlertCircle },
  ];

  useEffect(() => {
    if (!selectedAgentId) return;

    let isMounted = true;
    setOverviewLoading(true);
    setOverviewError(null);

    agencyExpenseManagementApi.getOverview({
      agentId: selectedAgentId,
      timeframe: dateRange.timeframe === 'all' ? null : dateRange.timeframe,
      startDate: dateRange.timeframe === 'custom' ? toRequestDate(dateRange.start) : null,
      endDate: dateRange.timeframe === 'custom' ? toRequestDate(dateRange.end) : null,
      debtStatus: 'all',
    })
      .then(response => {
        if (isMounted) setOverviewData(response.overview || null);
      })
      .catch(error => {
        if (isMounted) {
          setOverviewError(error instanceof Error ? error.message : 'Unable to load expense overview.');
          setOverviewData(null);
        }
      })
      .finally(() => {
        if (isMounted) setOverviewLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [dateRange.end, dateRange.start, dateRange.timeframe, selectedAgentId]);

  useEffect(() => {
    if (!selectedAgentId) return;

    let isMounted = true;
    setAgencyRiskLoading(true);
    setAgencyRiskError(null);

    agencyExpenseManagementApi.getAgencyRisk({
      agentId: selectedAgentId,
      timeframe: dateRange.timeframe === 'all' ? null : dateRange.timeframe,
      startDate: dateRange.timeframe === 'custom' ? toRequestDate(dateRange.start) : null,
      endDate: dateRange.timeframe === 'custom' ? toRequestDate(dateRange.end) : null,
    })
      .then(response => {
        if (isMounted) setAgencyRiskData(response);
      })
      .catch(error => {
        if (!isMounted) return;
        setAgencyRiskData([]);
        setAgencyRiskError(error instanceof Error ? error.message : 'Unable to load agency risk data.');
      })
      .finally(() => {
        if (isMounted) setAgencyRiskLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [dateRange.end, dateRange.start, dateRange.timeframe, selectedAgentId]);

  useEffect(() => {
    if (!selectedAgentId) return;

    let isMounted = true;
    setDebtLoading(true);
    setDebtError(null);

    fetchAgencyDebts(selectedAgentId)
      .then(response => {
        if (!isMounted) return;
        const debtLog = response.expense_log;
        setDebtRows(Array.isArray(debtLog?.rundown) ? debtLog.rundown : []);
        setDebtSummary(debtLog?.summary && typeof debtLog.summary === 'object' ? debtLog.summary : {});
      })
      .catch(error => {
        if (!isMounted) return;
        setDebtRows([]);
        setDebtSummary({});
        setDebtError(error instanceof Error ? error.message : 'Unable to load debts.');
      })
      .finally(() => {
        if (isMounted) setDebtLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedAgentId]);

  useEffect(() => {
    if (!selectedAgentId) return;

    let isMounted = true;
    setExpenseLoading(true);
    setExpenseError(null);

    fetchAgencyExpenseLog({
      agentId: selectedAgentId,
      timeframe: dateRange.timeframe === 'all' ? null : dateRange.timeframe,
      startDate: dateRange.timeframe === 'custom' ? toRequestDate(dateRange.start) : null,
      endDate: dateRange.timeframe === 'custom' ? toRequestDate(dateRange.end) : null,
    })
      .then(response => {
        if (!isMounted) return;
        const expenseLog = response.expense_log;
        setExpenseRows(Array.isArray(expenseLog?.rundown) ? expenseLog.rundown : []);
        setExpenseSummary(expenseLog?.summary && typeof expenseLog.summary === 'object' ? expenseLog.summary : {});
      })
      .catch(error => {
        if (!isMounted) return;
        setExpenseRows([]);
        setExpenseSummary({});
        setExpenseError(error instanceof Error ? error.message : 'Unable to load expense logs.');
      })
      .finally(() => {
        if (isMounted) setExpenseLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [dateRange.end, dateRange.start, dateRange.timeframe, selectedAgentId]);

  const summary = overviewData?.summary || {};
  const agentRisk = Array.isArray(overviewData?.agent_risk) ? overviewData.agent_risk : [];
  const debtsByCarrier = Array.isArray(overviewData?.debts_by_carrier) ? overviewData.debts_by_carrier : [];
  const hasOverviewData = Boolean(
    toNumber(summary.total_expenses)
    || toNumber(summary.total_debts)
    || toNumber(summary.total_production)
    || agentRisk.length
    || debtsByCarrier.length
  );

  const buildRiskRows = (amountKey: 'expenses' | 'debts') => (
    [...agentRisk]
      .map((agent: AgencyExpenseRiskAgent) => {
        const rawAmount = toNumber(agent[amountKey]);
        const amount = amountKey === 'debts' ? Math.abs(rawAmount) : rawAmount;
        const production = toNumber(agent.production);
        const riskGap = production - amount;
        return {
          agentId: String(agent.agent_id || ''),
          agentName: String(agent.agent_name || 'Unknown agent'),
          amount,
          production,
          riskGap,
        };
      })
      .filter(row => row.riskGap < 0)
      .sort((a, b) => {
        const gapDiff = a.riskGap - b.riskGap;
        if (gapDiff === 0) return b.amount - a.amount;
        return gapDiff;
      })
  );

  const expenseRiskRows = buildRiskRows('expenses');
  const debtRiskRows = buildRiskRows('debts');

  const buildAgencyRiskRows = (amountKey: 'expenses' | 'debts') => (
    [...agencyRiskData]
      .map((agency: AgencyExpenseRiskAgency) => {
        const rawAmount = toNumber(agency[amountKey]);
        const amount = amountKey === 'debts' ? Math.abs(rawAmount) : rawAmount;
        const production = toNumber(agency.production);
        return {
          agencyId: String(agency.agency_id || ''),
          agencyName: String(agency.agency_name || 'Unknown agency'),
          agencyManager: String(agency.agency_manager || 'Manager not set'),
          amount,
          production,
          riskGap: production - amount,
        };
      })
      .filter(row => row.riskGap < 0)
      .sort((a, b) => {
        const gapDiff = a.riskGap - b.riskGap;
        if (gapDiff === 0) return b.amount - a.amount;
        return gapDiff;
      })
  );

  const agencyExpenseRiskRows = buildAgencyRiskRows('expenses');
  const agencyDebtRiskRows = buildAgencyRiskRows('debts');

  const RiskList = ({
    title,
    rows,
    amountLabel,
    onOpenRundown,
  }: {
    title: string;
    rows: ReturnType<typeof buildRiskRows>;
    amountLabel: string;
    onOpenRundown: () => void;
  }) => {
    const visibleRows = rows.slice(0, 5);
    const canExpand = rows.length > 5;

    return (
      <div className="rounded-3xl border border-slate-100 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">At Risk Agents</p>
            <h4 className="text-lg font-black text-slate-950">{title}</h4>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black text-slate-500">{rows.length} negative</span>
        </div>
        <div className="space-y-3">
          {visibleRows.length > 0 ? visibleRows.map((row, index) => (
            <div key={`${title}-${row.agentId || row.agentName}-${index}`} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-xs font-black text-slate-600 shadow-sm">{index + 1}</span>
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-slate-950">{row.agentName}</p>
                <p className="text-[11px] font-semibold text-slate-500">{amountLabel}: {formatMoney(row.amount)} - Production: {formatMoney(row.production)}</p>
              </div>
              <span className="rounded-xl bg-red-50 px-3 py-1.5 text-xs font-black text-red-600">
                {formatRiskGap(row.riskGap)}
              </span>
            </div>
          )) : (
            <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-xs font-bold text-slate-400">No negative gaps returned for this range.</div>
          )}
          {canExpand && (
            <button
              type="button"
              onClick={onOpenRundown}
              className="flex w-full items-center justify-center rounded-2xl border border-slate-200 px-4 py-3 text-xs font-black text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
            >
              {`Show rundown (${rows.length})`}
            </button>
          )}
        </div>
      </div>
    );
  };

  const AgencyRiskList = ({
    title,
    rows,
    amountLabel,
    onOpenRundown,
  }: {
    title: string;
    rows: ReturnType<typeof buildAgencyRiskRows>;
    amountLabel: string;
    onOpenRundown: () => void;
  }) => {
    const visibleRows = rows.slice(0, 5);
    const canExpand = rows.length > 5;

    return (
      <div className="rounded-3xl border border-slate-100 bg-white p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">At Risk Agencies</p>
            <h4 className="text-lg font-black text-slate-950">{title}</h4>
          </div>
          <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black text-slate-500">{rows.length} negative</span>
        </div>
        <div className="space-y-3">
          {agencyRiskLoading ? (
            <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-xs font-bold text-slate-400">Loading agency risk...</div>
          ) : visibleRows.length > 0 ? visibleRows.map((row, index) => (
            <div key={`${title}-${row.agencyId || row.agencyName}-${index}`} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-xs font-black text-slate-600 shadow-sm">{index + 1}</span>
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-slate-950">{row.agencyName}</p>
                <p className="truncate text-[11px] font-semibold text-slate-500">{row.agencyManager} · {amountLabel}: {formatMoney(row.amount)} · Production: {formatMoney(row.production)}</p>
              </div>
              <span className="rounded-xl bg-red-50 px-3 py-1.5 text-xs font-black text-red-600">
                {formatRiskGap(row.riskGap)}
              </span>
            </div>
          )) : (
            <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-xs font-bold text-slate-400">No agencies have a negative gap for this range.</div>
          )}
          {canExpand && (
            <button
              type="button"
              onClick={onOpenRundown}
              className="flex w-full items-center justify-center rounded-2xl border border-slate-200 px-4 py-3 text-xs font-black text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
            >
              {`Show rundown (${rows.length})`}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <section className="overflow-visible rounded-[2.5rem] border border-slate-100 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-brand-400 shadow-xl shadow-slate-900/10">
              <ReceiptText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Expense Management</p>
              <h3 className="text-2xl font-black tracking-tight text-slate-950">Agency expense center</h3>
              <p className="text-sm font-semibold text-slate-500">Track expenses and debt exposure for {selectedAgentLabel}.</p>
            </div>
          </div>
          <DateRangeSelector value={dateRange} onChange={onDateRangeChange} />
        </div>
      </div>

      <div className="p-6">
        <div className="mb-5 inline-flex rounded-2xl border border-slate-100 bg-slate-50 p-1">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-xs font-black transition-all ${
                  active
                    ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10'
                    : 'text-slate-500 hover:bg-white hover:text-slate-900'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === 'overview' ? (
          <div className="space-y-5">
            {overviewError && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-xs font-black text-red-700">{overviewError}</p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {[
                ['Total Expenses', formatMoney(summary.total_expenses), `${Math.round(toNumber(summary.expense_count)).toLocaleString()} expense logs`],
                ['Total Debts', formatMoney(summary.total_debts), `${Math.round(toNumber(summary.debt_count)).toLocaleString()} debt records`],
                ['Total Production', formatMoney(summary.total_production), `${selectedAgentLabel} agency scope`],
              ].map(([label, value, helper]) => (
                <div key={label} className="rounded-3xl border border-slate-100 bg-slate-50/60 p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{label}</p>
                  <p className="mt-3 truncate text-2xl font-black text-slate-950">{overviewLoading ? '...' : value}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{helper}</p>
                </div>
              ))}
            </div>

            {!overviewLoading && !overviewError && !hasOverviewData && (
              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-6 text-center">
                <p className="text-sm font-black text-slate-900">No overview data returned for this range.</p>
              </div>
            )}

            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Risk Rundown</p>
                <h4 className="text-lg font-black text-slate-950">Production gap by scope</h4>
              </div>
              <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
                <button
                  type="button"
                  onClick={() => setRiskScope('agents')}
                  className={`inline-flex h-10 items-center gap-2 rounded-xl px-4 text-xs font-black transition-all ${
                    riskScope === 'agents'
                      ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10'
                      : 'text-slate-500 hover:bg-white hover:text-slate-900'
                  }`}
                >
                  <Users className="h-4 w-4" />
                  By Agent
                </button>
                <button
                  type="button"
                  onClick={() => setRiskScope('agencies')}
                  className={`inline-flex h-10 items-center gap-2 rounded-xl px-4 text-xs font-black transition-all ${
                    riskScope === 'agencies'
                      ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10'
                      : 'text-slate-500 hover:bg-white hover:text-slate-900'
                  }`}
                >
                  <Building2 className="h-4 w-4" />
                  By Agency
                </button>
              </div>
            </div>

            {riskScope === 'agencies' && agencyRiskError && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-xs font-black text-red-700">Agency risk unavailable: {agencyRiskError}</p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
              {riskScope === 'agents' ? (
                <>
                  <RiskList
                    title="Top Expense Risk Agents"
                    rows={expenseRiskRows}
                    amountLabel="Expenses"
                    onOpenRundown={() => setRiskDock({
                      title: 'Expense Risk Agents',
                      eyebrow: 'At Risk Agents',
                      amountLabel: 'Expenses',
                      rows: expenseRiskRows.map(row => ({
                        id: row.agentId || row.agentName,
                        name: row.agentName,
                        amount: row.amount,
                        production: row.production,
                        riskGap: row.riskGap,
                      })),
                    })}
                  />
                  <RiskList
                    title="Top Debt Risk Agents"
                    rows={debtRiskRows}
                    amountLabel="Debts"
                    onOpenRundown={() => setRiskDock({
                      title: 'Debt Risk Agents',
                      eyebrow: 'At Risk Agents',
                      amountLabel: 'Debts',
                      rows: debtRiskRows.map(row => ({
                        id: row.agentId || row.agentName,
                        name: row.agentName,
                        amount: row.amount,
                        production: row.production,
                        riskGap: row.riskGap,
                      })),
                    })}
                  />
                </>
              ) : (
                <>
                  <AgencyRiskList
                    title="Top Expense Risk Agencies"
                    rows={agencyExpenseRiskRows}
                    amountLabel="Expenses"
                    onOpenRundown={() => setRiskDock({
                      title: 'Expense Risk Agencies',
                      eyebrow: 'At Risk Agencies',
                      amountLabel: 'Expenses',
                      rows: agencyExpenseRiskRows.map(row => ({
                        id: row.agencyId || row.agencyName,
                        name: row.agencyName,
                        helper: row.agencyManager,
                        amount: row.amount,
                        production: row.production,
                        riskGap: row.riskGap,
                      })),
                    })}
                  />
                  <AgencyRiskList
                    title="Top Debt Risk Agencies"
                    rows={agencyDebtRiskRows}
                    amountLabel="Debts"
                    onOpenRundown={() => setRiskDock({
                      title: 'Debt Risk Agencies',
                      eyebrow: 'At Risk Agencies',
                      amountLabel: 'Debts',
                      rows: agencyDebtRiskRows.map(row => ({
                        id: row.agencyId || row.agencyName,
                        name: row.agencyName,
                        helper: row.agencyManager,
                        amount: row.amount,
                        production: row.production,
                        riskGap: row.riskGap,
                      })),
                    })}
                  />
                </>
              )}
            </div>

            <div className="rounded-3xl border border-slate-100 bg-white p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Carrier Exposure</p>
                  <h4 className="text-lg font-black text-slate-950">Total Debts by Carrier</h4>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black text-slate-500">{debtsByCarrier.length.toLocaleString()} carriers</span>
              </div>
              <div className="overflow-hidden rounded-2xl border border-slate-100">
                <div className="grid grid-cols-[1fr_auto_auto] gap-4 bg-slate-50 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <span>Carrier</span>
                  <span className="text-right">Debts</span>
                  <span className="text-right">Records</span>
                </div>
                {debtsByCarrier.length > 0 ? debtsByCarrier.map((carrier, index) => (
                  <div key={`${carrier.carrier || 'carrier'}-${index}`} className="grid grid-cols-[1fr_auto_auto] gap-4 border-t border-slate-50 px-4 py-3 text-sm">
                    <span className="font-black text-slate-950">{carrier.carrier || 'Unknown carrier'}</span>
                    <span className="text-right font-black text-slate-900">{formatMoney(carrier.total_debts)}</span>
                    <span className="text-right font-bold text-slate-500">{Math.round(toNumber(carrier.debt_count)).toLocaleString()}</span>
                  </div>
                )) : (
                  <div className="px-4 py-8 text-center text-xs font-bold text-slate-400">No carrier debt data returned for this range.</div>
                )}
              </div>
            </div>
          </div>
        ) : activeTab === 'expenses' ? (
          <div className="space-y-5">
            {expenseError && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-xs font-black text-red-700">{expenseError}</p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {[
                ['Total Cost', formatMoney(expenseSummary.total_cost), `${Math.round(toNumber(expenseSummary.expense_count)).toLocaleString()} expense logs`],
                ['Expense Count', Math.round(toNumber(expenseSummary.expense_count)).toLocaleString(), `${selectedAgentLabel} agency scope`],
                ['Average Cost', formatMoney(toNumber(expenseSummary.expense_count) > 0 ? toNumber(expenseSummary.total_cost) / toNumber(expenseSummary.expense_count) : 0), dateRange.label],
              ].map(([label, value, helper]) => (
                <div key={label} className="rounded-3xl border border-slate-100 bg-slate-50/60 p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{label}</p>
                  <p className="mt-3 truncate text-2xl font-black text-slate-950">{expenseLoading ? '...' : value}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{helper}</p>
                </div>
              ))}
            </div>

            <div className="overflow-hidden rounded-3xl border border-slate-100">
              <div className="grid min-w-[760px] grid-cols-[1fr_1.1fr_1.4fr_1fr_2fr] bg-slate-50 px-4 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <span>Date</span>
                <span>Agent</span>
                <span>Expense</span>
                <span className="text-right">Cost</span>
                <span>Notes</span>
              </div>
              <div className="overflow-auto">
                {expenseLoading ? (
                  <div className="flex min-h-48 items-center justify-center px-6 py-12 text-center">
                    <div>
                      <Loader2 className="mx-auto mb-4 h-6 w-6 animate-spin text-slate-400" />
                      <p className="text-sm font-black text-slate-900">Loading expense logs...</p>
                    </div>
                  </div>
                ) : expenseRows.length > 0 ? (
                  expenseRows.map((row, index) => {
                    const agentName = getExpenseAgentName(row);
                    const profileUrl = getExpenseProfileUrl(row);

                    return (
                      <div key={`${safeText(row.id || row.expense_date, 'expense')}-${index}`} className="grid min-w-[760px] grid-cols-[1fr_1.1fr_1.4fr_1fr_2fr] items-center gap-4 border-t border-slate-50 px-4 py-4 text-sm">
                        <span className="font-black text-slate-950">{formatExpenseDate(row.expense_date)}</span>
                        <span className="flex min-w-0 items-center gap-2">
                          {profileUrl ? (
                            <img src={profileUrl} alt="" className="h-8 w-8 shrink-0 rounded-xl object-cover ring-1 ring-slate-100" />
                          ) : (
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[10px] font-black text-slate-500">
                              {getNameInitials(agentName)}
                            </span>
                          )}
                          <span className="truncate font-bold text-slate-700">{agentName}</span>
                        </span>
                        <span className="truncate font-black text-slate-900">{safeText(row.expense)}</span>
                        <span className="text-right font-black text-slate-900">{formatMoney(row.cost)}</span>
                        <span className="truncate font-semibold text-slate-500">{safeText(row.notes)}</span>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex min-h-48 items-center justify-center px-6 py-12 text-center">
                    <div>
                      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                        <DollarSign className="h-5 w-5" />
                      </div>
                      <p className="text-sm font-black text-slate-900">No expense logs loaded yet.</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">Expense rows will appear here once the agency expense API returns data.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {debtError && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-xs font-black text-red-700">{debtError}</p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {[
                ['Total Debts', formatMoney(Math.abs(toNumber(debtSummary.total_debts))), `${Math.round(toNumber(debtSummary.debts_count ?? debtSummary.debt_count)).toLocaleString()} debt records`],
                ['Debt Count', Math.round(toNumber(debtSummary.debts_count ?? debtSummary.debt_count)).toLocaleString(), `${selectedAgentLabel} agency scope`],
                ['Unresolved', debtRows.filter(row => !row.isResolved).length.toLocaleString(), 'Current pulled report'],
              ].map(([label, value, helper]) => (
                <div key={label} className="rounded-3xl border border-slate-100 bg-slate-50/60 p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{label}</p>
                  <p className="mt-3 truncate text-2xl font-black text-slate-950">{debtLoading ? '...' : value}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{helper}</p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-xs font-black text-amber-900">Debts refresh every data pulled report.</p>
              <p className="mt-1 text-[11px] font-semibold text-amber-700">For past data, please reach out to dev.</p>
              <p className="mt-1 text-[11px] font-semibold text-amber-700">Please resolve debts within your agency agents to avoid rolled up debts.</p>
            </div>
            <div className="overflow-hidden rounded-3xl border border-slate-100">
              <div className="grid min-w-[900px] grid-cols-[1.5fr_1.1fr_1fr_1fr_1fr_1.4fr] bg-slate-50 px-4 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <span>Agent</span>
                <span>Carrier</span>
                <span className="text-right">Debt</span>
                <span>Status</span>
                <span>Created</span>
                <span>Notes</span>
              </div>
              <div className="overflow-auto">
                {debtLoading ? (
                  <div className="flex min-h-48 items-center justify-center px-6 py-12 text-center">
                    <div>
                      <Loader2 className="mx-auto mb-4 h-6 w-6 animate-spin text-slate-400" />
                      <p className="text-sm font-black text-slate-900">Loading debt records...</p>
                    </div>
                  </div>
                ) : debtRows.length > 0 ? (
                  debtRows.map((row, index) => {
                    const agentName = getRowAgentName(row);
                    const profileUrl = getRowProfileUrl(row);
                    const resolved = Boolean(row.isResolved);

                    return (
                      <div key={`${safeText(row.id || row.created_at, 'debt')}-${index}`} className="grid min-w-[900px] grid-cols-[1.5fr_1.1fr_1fr_1fr_1fr_1.4fr] items-center gap-4 border-t border-slate-50 px-4 py-4 text-sm">
                        <span className="flex min-w-0 items-center gap-2">
                          {profileUrl ? (
                            <img src={profileUrl} alt="" className="h-8 w-8 shrink-0 rounded-xl object-cover ring-1 ring-slate-100" />
                          ) : (
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[10px] font-black text-slate-500">
                              {getNameInitials(agentName)}
                            </span>
                          )}
                          <span className="truncate font-bold text-slate-700">{agentName}</span>
                        </span>
                        <span className="truncate font-black text-slate-900">{safeText(row.carrier_name, 'Unknown carrier')}</span>
                        <span className="text-right font-black text-slate-900">{formatMoney(Math.abs(toNumber(row.amount)))}</span>
                        <span className={`w-fit rounded-xl px-3 py-1.5 text-[10px] font-black ${resolved ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                          {resolved ? 'Resolved' : 'Unresolved'}
                        </span>
                        <span className="font-bold text-slate-600">{formatTimestampDate(row.created_at)}</span>
                        <span className="truncate font-semibold text-slate-500">{safeText(row.notes)}</span>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex min-h-48 items-center justify-center px-6 py-12 text-center">
                    <div>
                      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-500">
                        <AlertCircle className="h-5 w-5" />
                      </div>
                      <p className="text-sm font-black text-slate-900">No debt records loaded yet.</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">Debt rows will appear here once the agency debt API returns data.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {riskDock && (
        <div className="fixed inset-0 z-[100]">
          <button
            type="button"
            aria-label="Close risk rundown"
            onClick={() => setRiskDock(null)}
            className="absolute inset-0 bg-slate-950/35 backdrop-blur-[2px]"
          />
          <aside className="relative ml-auto flex h-full w-full max-w-xl flex-col border-l border-slate-200 bg-white shadow-2xl animate-in slide-in-from-right duration-300">
            <div className="flex items-start justify-between gap-4 bg-slate-950 px-6 py-5 text-white">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-brand-400">{riskDock.eyebrow}</p>
                <h3 className="mt-1 text-xl font-black">{riskDock.title}</h3>
                <p className="mt-1 text-xs font-semibold text-slate-400">Ranked by the highest negative production gap.</p>
              </div>
              <button
                type="button"
                aria-label="Close risk rundown"
                onClick={() => setRiskDock(null)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-white transition-colors hover:bg-white/20"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Full Rundown</p>
                <p className="text-sm font-black text-slate-950">Negative gaps only</p>
              </div>
              <span className="rounded-full bg-red-50 px-3 py-1 text-[10px] font-black text-red-600">{riskDock.rows.length} records</span>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <div className="space-y-3">
                {riskDock.rows.map((row, index) => (
                  <div key={`${riskDock.title}-${row.id}-${index}`} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-xs font-black text-slate-600 shadow-sm">{index + 1}</span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-slate-950">{row.name}</p>
                      {row.helper && <p className="truncate text-[11px] font-bold text-slate-400">{row.helper}</p>}
                      <p className="mt-0.5 text-[11px] font-semibold text-slate-500">{riskDock.amountLabel}: {formatMoney(row.amount)} · Production: {formatMoney(row.production)}</p>
                    </div>
                    <span className="rounded-xl bg-red-100 px-3 py-1.5 text-xs font-black text-red-700">{formatRiskGap(row.riskGap)}</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      )}
    </section>
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
  const [viewMode, setViewMode] = useState<'overview' | 'team' | 'policies' | 'expenses'>('overview');

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
              {viewMode === 'policies' ? 'Team Production' : viewMode === 'expenses' ? 'Expense Management' : viewMode === 'overview' ? 'My Agency' : 'Downlines'}
            </h2>
            <p className="text-sm font-bold text-slate-500">
              {viewMode === 'policies'
                ? `Aggregated policies for ${selectedAgentLabel} and their downline tree.`
                : viewMode === 'expenses'
                  ? `Review expense logs and debts for ${selectedAgentLabel}.`
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
          <button
            onClick={() => setViewMode('expenses')}
            className={`px-4 py-2.5 text-xs font-black rounded-xl transition-all ${viewMode === 'expenses' ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'}`}
          >
            Expense Management
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
      ) : viewMode === 'expenses' ? (
        <AgencyExpenseManagement
          selectedAgentId={selectedAgentId}
          selectedAgentLabel={selectedAgentLabel}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
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
                        <th className="py-5 px-4"><DownlineSortableHeader label="Direct Upline" sortKey="direct_upline_name" sortConfig={sortConfig} onSort={handleSort} /></th>
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
                          <td colSpan={8} className="py-12 text-center">
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
                              <div className="text-xs font-bold text-slate-600">
                                <span>{agent.direct_upline_name || 'Not set'}</span>
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
                          <td colSpan={8} className="py-12 text-center text-slate-400 text-sm font-medium">
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
