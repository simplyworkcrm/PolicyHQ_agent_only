import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
    Split, 
    UserX, 
    Calendar, 
    ChevronDown, 
    CheckCircle, 
    ChevronLeft, 
    ChevronRight,
    Loader2,
    Search,
    Filter,
    ArrowUpRight,
    AlertTriangle,
    XCircle,
    Ban,
    FileWarning,
    RefreshCw,
    ArrowUpDown,
    ListFilter,
    Check,
    X,
    Send,
    MessageSquare,
    Folder,
    Download
} from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { useAgentContext } from '../context/AgentContext';
import { agentSplitsApi } from '../services/agentSplitsApi';
import { agentPolicyDetailsApi } from '../services/agentPolicyDetailsApi';
import { agentPoliciesV2Api, PolicyFilterOption } from '../services/agentPoliciesV2Api';
import { SplitPolicy } from '../../../shared/types/index';

interface DateRange {
    start: number;
    end: number;
    label: string;
}

type SplitsTimeframe = 'today' | 'weekly' | 'monthly' | 'yearly' | 'custom' | null;

interface PolicyComment {
    created_at: number;
    type: string;
    message: string;
    _commentby: {
        id: string;
        first_name: string;
        last_name: string;
    };
}

// --- UTILS ---

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const getDateRange = (type: 'all' | 'today' | 'weekly' | 'monthly' | 'yearly'): DateRange => {
    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);
    
    start.setHours(0,0,0,0);
    end.setHours(23,59,59,999);

    if (type === 'all') return { start: 0, end: end.getTime(), label: 'All Time' };

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
    
    return { start: start.getTime(), end: end.getTime(), label: 'Custom' };
};

// --- UNIFIED FILTER COMPONENTS ---

// Shared styles for filter buttons to ensure consistency
const FILTER_BUTTON_BASE = "h-11 w-full bg-white border border-slate-200 rounded-xl px-4 text-xs font-bold text-slate-700 flex items-center justify-between shadow-sm hover:border-brand-500 hover:ring-4 hover:ring-brand-500/10 transition-all focus:outline-none";
const FILTER_ACTIVE_STYLE = "bg-brand-50 border-brand-200 text-brand-700";

const SimpleDateRangePicker: React.FC<{
    value: DateRange | null;
    onChange: (range: DateRange | null) => void;
    placeholder?: string;
}> = ({ value, onChange, placeholder = "Select Dates" }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectionStart, setSelectionStart] = useState<Date | null>(value ? new Date(value.start) : null);
    const [selectionEnd, setSelectionEnd] = useState<Date | null>(value ? new Date(value.end) : null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Sync internal state if prop changes externally (e.g. clear filter)
    useEffect(() => {
        if (!value) {
            setSelectionStart(null);
            setSelectionEnd(null);
        }
    }, [value]);

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
            
            // Auto close after selection
            setTimeout(() => setIsOpen(false), 300);
            
            onChange({ 
                start: s.getTime(), 
                end: e.getTime(), 
                label: `${s.toLocaleDateString()} - ${e.toLocaleDateString()}` 
            });
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
        <div className="relative z-50 w-full" ref={containerRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`${FILTER_BUTTON_BASE} ${value ? FILTER_ACTIVE_STYLE : ''}`}
            >
                <div className="flex items-center gap-2 overflow-hidden">
                    <Calendar className={`w-4 h-4 shrink-0 ${value ? 'text-brand-500' : 'text-slate-400'}`} />
                    <span className="truncate">{value ? value.label : placeholder}</span>
                </div>
                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform shrink-0 ml-2 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 bg-white rounded-[1.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100 p-4 min-w-[280px] z-[60] animate-in fade-in zoom-in-95 duration-200 origin-top-left">
                     <div className="flex items-center justify-between mb-4">
                        <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-900 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                        <span className="font-bold text-slate-900 text-sm">{MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}</span>
                        <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-900 transition-colors"><ChevronRight className="w-4 h-4" /></button>
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
                    {value && (
                        <div className="mt-4 pt-3 border-t border-slate-100 flex justify-center">
                            <button 
                                onClick={() => { onChange(null); setIsOpen(false); }}
                                className="text-xs font-bold text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                            >
                                Clear Dates
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const MultiSelectDropdown: React.FC<{
    label: string;
    options: string[];
    selected: string[];
    onChange: (selected: string[]) => void;
    icon?: React.ReactNode;
}> = ({ label, options, selected, onChange, icon }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = options.filter(opt => 
        opt.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const toggleOption = (option: string) => {
        if (selected.includes(option)) {
            onChange(selected.filter(s => s !== option));
        } else {
            onChange([...selected, option]);
        }
    };

    const isAllSelected = selected.length === 0;

    return (
        <div className="relative z-40 w-full" ref={containerRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`${FILTER_BUTTON_BASE} ${selected.length > 0 ? FILTER_ACTIVE_STYLE : ''}`}
            >
                <div className="flex items-center gap-2 overflow-hidden">
                    {icon}
                    <span className="truncate">
                        {selected.length > 0 ? `${selected.length} ${label}` : label}
                    </span>
                </div>
                <ChevronDown className={`w-3 h-3 transition-transform shrink-0 ml-2 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-[1.5rem] shadow-2xl shadow-slate-300/50 border border-slate-100 p-2 z-[60] animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-2">
                        <div className="relative mb-2">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input 
                                type="text"
                                placeholder={`Search ${label}...`}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-50 border-none rounded-xl py-2.5 pl-9 pr-3 text-xs font-bold focus:ring-2 focus:ring-brand-500/20 text-slate-800 placeholder:text-slate-400"
                                autoFocus
                            />
                        </div>
                    </div>
                    
                    <div className="max-h-48 overflow-y-auto px-2 space-y-1 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                        <button
                            onClick={() => onChange([])}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${isAllSelected ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isAllSelected ? 'bg-slate-900 border-slate-900 text-white' : 'border-slate-300 bg-white'}`}>
                                {isAllSelected && <Check className="w-3 h-3" />}
                            </div>
                            All {label}
                        </button>
                        
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map(option => {
                                const isSelected = selected.includes(option);
                                return (
                                    <button
                                        key={option}
                                        onClick={() => toggleOption(option)}
                                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${isSelected ? 'bg-brand-50 text-brand-900' : 'text-slate-600 hover:bg-slate-50'}`}
                                    >
                                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-brand-500 border-brand-500 text-white' : 'border-slate-300 bg-white group-hover:border-slate-400'}`}>
                                            {isSelected && <Check className="w-3 h-3" />}
                                        </div>
                                        <span className="truncate text-left">{option}</span>
                                    </button>
                                )
                            })
                        ) : (
                            <div className="px-3 py-4 text-center text-xs text-slate-400 font-medium">No results found</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// --- DATA ACCESSORS ---

const formatDate = (date: string | number | undefined) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
};

const formatApiDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${month}-${day}-${date.getFullYear()}`;
};

const getTimeframeFromRange = (range: DateRange): SplitsTimeframe => {
    const label = range.label.toLowerCase();
    if (label === 'all time') return null;
    if (label === 'today') return 'today';
    if (label === 'weekly') return 'weekly';
    if (label === 'monthly') return 'monthly';
    if (label === 'yearly') return 'yearly';
    return 'custom';
};

const getStatusStyles = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s.includes('approve')) return 'bg-emerald-100 text-emerald-700';
    if (s.includes('underwrit')) return 'bg-blue-100 text-blue-700';
    if (s.includes('cancel') || s.includes('decline')) return 'bg-red-100 text-red-700';
    if (s.includes('pending') || s.includes('follow')) return 'bg-amber-100 text-amber-700';
    return 'bg-slate-100 text-slate-600';
};

// --- CONSTANTS ---
const STATUS_GROUPS = {
    APPROVED: ['Active', 'Approved', 'Paid'],
    PENDING: ['Pending', 'Underwriting', 'Submitted']
};

const STATUS_ACCENT_CLASSES = [
    {
        active: 'bg-emerald-500 text-white shadow-xl shadow-emerald-500/30 scale-[1.02]',
        idle: 'bg-white border border-slate-100 hover:shadow-lg hover:shadow-emerald-500/10 hover:border-emerald-100',
        iconActive: 'bg-white/20 text-white',
        iconIdle: 'bg-emerald-50 text-emerald-500',
        labelActive: 'text-emerald-100',
        countActive: 'bg-white text-emerald-600',
    },
    {
        active: 'bg-blue-500 text-white shadow-xl shadow-blue-500/30 scale-[1.02]',
        idle: 'bg-white border border-slate-100 hover:shadow-lg hover:shadow-blue-500/10 hover:border-blue-100',
        iconActive: 'bg-white/20 text-white',
        iconIdle: 'bg-blue-50 text-blue-500',
        labelActive: 'text-blue-100',
        countActive: 'bg-white text-blue-600',
    },
    {
        active: 'bg-amber-500 text-white shadow-xl shadow-amber-500/30 scale-[1.02]',
        idle: 'bg-white border border-slate-100 hover:shadow-lg hover:shadow-amber-500/10 hover:border-amber-100',
        iconActive: 'bg-white/20 text-white',
        iconIdle: 'bg-amber-50 text-amber-500',
        labelActive: 'text-amber-100',
        countActive: 'bg-white text-amber-600',
    },
    {
        active: 'bg-slate-900 text-white shadow-xl shadow-slate-900/20 scale-[1.02]',
        idle: 'bg-white border border-slate-100 hover:shadow-lg hover:shadow-slate-500/10 hover:border-slate-200',
        iconActive: 'bg-white/20 text-white',
        iconIdle: 'bg-slate-50 text-slate-500',
        labelActive: 'text-slate-300',
        countActive: 'bg-white text-slate-700',
    },
];

const ACTION_STATUSES = [
    'Follow up', 
    'Cancelled before draft', 
    'Declined', 
    'Lapsed Pending', 
    'Lapsed', 
    'Not Taken'
];

const ATTENTION_POLICY_STATUSES = new Set([
    'cancelled before draft',
    'declined',
    'lapsed pending',
    'lapsed',
]);

const ATTENTION_PAID_STATUSES = new Set([
    'chargeback',
]);

type SortConfig = {
    key: keyof SplitPolicy;
    direction: 'asc' | 'desc';
};

const SPLIT_SORT_FIELD_TO_API: Partial<Record<keyof SplitPolicy, string>> = {
    client: 'client',
    created_at: 'created_at',
    policy_number: 'policy_number',
    carrier: 'ref_carrier_name',
    carrier_product: 'carrier_product',
    source_name: 'ref_metacontactsource_name',
    annual_premium: 'annual_premium',
    status: 'ref_policyStatus_name',
    paid_status: 'meta_policy_paidstatus_name',
    agent_name: 'ref_agent_owner_name',
    split_percentage: 'split.split_percent',
    initial_draft_date: 'initial_draft_date',
};

type SplitFilterOp = '==' | '!=' | 'ilike' | 'not ilike' | '>=' | '<=' | 'is null' | 'is not null';
type SplitFilterFieldKey =
    | 'client'
    | 'policy_number'
    | 'ref_agent_owner'
    | 'ref_carrier_name'
    | 'carrier_product'
    | 'ref_policyStatus_name'
    | 'meta_policy_paidstatus_name'
    | 'initial_draft_date'
    | 'split_percent';

interface SplitFilterField {
    key: SplitFilterFieldKey;
    label: string;
    type: 'text' | 'select' | 'date-range' | 'number' | 'null-check';
}

interface SplitFilterRow {
    id: string;
    field: SplitFilterFieldKey | '';
    op: SplitFilterOp;
    value: string;
    displayValue?: string;
    dateRange: DateRange | null;
}

interface SplitFilterGroup {
    id: string;
    rows: SplitFilterRow[];
}

const SPLIT_FILTER_FIELDS: SplitFilterField[] = [
    { key: 'client', label: 'Client', type: 'text' },
    { key: 'policy_number', label: 'Policy Number', type: 'null-check' },
    { key: 'ref_agent_owner', label: 'Partner Agent', type: 'select' },
    { key: 'ref_carrier_name', label: 'Carrier', type: 'select' },
    { key: 'carrier_product', label: 'Product', type: 'text' },
    { key: 'ref_policyStatus_name', label: 'Policy Status', type: 'select' },
    { key: 'meta_policy_paidstatus_name', label: 'Paid Status', type: 'select' },
    { key: 'initial_draft_date', label: 'Effective Date', type: 'date-range' },
    { key: 'split_percent', label: 'Split Percent', type: 'number' },
];

const makeSplitFilterRow = (): SplitFilterRow => ({
    id: crypto.randomUUID(),
    field: '',
    op: 'ilike',
    value: '',
    displayValue: '',
    dateRange: null,
});

const makeSplitFilterGroup = (): SplitFilterGroup => ({
    id: crypto.randomUUID(),
    rows: [makeSplitFilterRow()],
});

const getSplitFilterField = (key: SplitFilterFieldKey | '') => SPLIT_FILTER_FIELDS.find(field => field.key === key);

const getSplitFilterOps = (fieldKey: SplitFilterFieldKey | ''): Array<{ op: SplitFilterOp; label: string }> => {
    const field = getSplitFilterField(fieldKey);
    if (field?.type === 'date-range') return [{ op: '>=', label: 'is between' }];
    if (field?.type === 'null-check') return [{ op: 'is null', label: 'is empty' }, { op: 'is not null', label: 'is not empty' }];
    if (field?.type === 'select' || field?.type === 'number') return [{ op: '==', label: 'equals' }, { op: '!=', label: 'does not equal' }];
    return [
        { op: 'ilike', label: 'contains' },
        { op: 'not ilike', label: 'does not contain' },
        { op: '==', label: 'equals' },
        { op: '!=', label: 'does not equal' },
    ];
};

const isSplitFilterComplete = (row: SplitFilterRow) => {
    const field = getSplitFilterField(row.field);
    if (!row.field) return false;
    if (field?.type === 'null-check') return row.op === 'is null' || row.op === 'is not null';
    if (field?.type === 'date-range') return row.dateRange?.start != null && row.dateRange?.end != null;
    return Boolean(row.value.trim());
};

const makeStatement = (operand: string, op: string, value: unknown, or = false) => ({
    or,
    type: 'statement',
    statement: {
        left: { tag: 'col', operand },
        op,
        right: { operand: value },
    },
});

const makeOrGroup = (operand: string, values: string[]) => ({
    or: false,
    type: 'group',
    group: {
        expression: values.map((value, index) => makeStatement(operand, '==', value, index > 0)),
    },
});

const buildSplitFilterStatements = (row: SplitFilterRow) => {
    const field = getSplitFilterField(row.field);
    if (!field) return [];

    if (field.type === 'date-range' && row.dateRange) {
        return [
            makeStatement(row.field, '>=', formatApiDate(row.dateRange.start)),
            makeStatement(row.field, '<=', formatApiDate(row.dateRange.end)),
        ];
    }

    if (field.type === 'null-check') {
        return [makeStatement(row.field, row.op === 'is null' ? '==' : '!=', null)];
    }

    const value = field.type === 'number'
        ? Number(row.value)
        : (row.op === 'ilike' || row.op === 'not ilike' ? `%${row.value.trim()}%` : row.value.trim());
    return [makeStatement(row.field, row.op, value)];
};

const getCompleteSplitFilterGroups = (groups: SplitFilterGroup[]) => groups
    .map(group => ({ ...group, rows: group.rows.filter(isSplitFilterComplete) }))
    .filter(group => group.rows.length > 0);

type SelectOption = { value: string; label: string };

const SplitFilterSelect: React.FC<{
    value: string;
    options: SelectOption[];
    placeholder: string;
    onChange: (value: string) => void;
}> = ({ value, options, placeholder, onChange }) => {
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const selected = options.find(option => option.value === value);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={containerRef}>
            <button
                type="button"
                onClick={() => setOpen(current => !current)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 hover:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all"
            >
                <span className={selected ? 'text-slate-800 truncate' : 'text-slate-400 truncate'}>{selected?.label || placeholder}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <div className="absolute z-[230] top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-[1.25rem] shadow-2xl shadow-slate-200/70 overflow-hidden p-1">
                    {options.map(option => (
                        <button
                            key={option.value || 'empty'}
                            type="button"
                            onClick={() => {
                                onChange(option.value);
                                setOpen(false);
                            }}
                            className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left text-xs font-bold transition-all ${
                                option.value === value ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                            }`}
                        >
                            <span className="truncate">{option.label}</span>
                            {option.value === value && <Check className="w-3.5 h-3.5 text-brand-400 shrink-0" />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

const SplitSearchSelect: React.FC<{
    value: string;
    options: SelectOption[];
    placeholder: string;
    onChange: (option: SelectOption) => void;
}> = ({ value, options, placeholder, onChange }) => {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const selected = options.find(option => option.value === value);
    const filteredOptions = options.filter(option => option.label.toLowerCase().includes(query.toLowerCase()));

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setOpen(false);
                setQuery('');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={containerRef}>
            <button
                type="button"
                onClick={() => setOpen(current => !current)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 hover:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all"
            >
                <span className={selected ? 'text-slate-800 truncate' : 'text-slate-400 truncate'}>{selected?.label || placeholder}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <div className="absolute z-[230] top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-[1.25rem] shadow-2xl shadow-slate-200/70 overflow-hidden p-2">
                    <div className="relative mb-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input
                            value={query}
                            onChange={event => setQuery(event.target.value)}
                            placeholder="Search..."
                            className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-brand-300"
                            autoFocus
                        />
                    </div>
                    <div className="max-h-56 overflow-y-auto space-y-1">
                        {filteredOptions.length > 0 ? filteredOptions.map(option => (
                            <button
                                key={option.value || 'empty'}
                                type="button"
                                onClick={() => {
                                    onChange(option);
                                    setOpen(false);
                                    setQuery('');
                                }}
                                className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left text-xs font-bold transition-all ${
                                    option.value === value ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                }`}
                            >
                                <span className="truncate">{option.label}</span>
                                {option.value === value && <Check className="w-3.5 h-3.5 text-brand-400 shrink-0" />}
                            </button>
                        )) : (
                            <div className="px-3 py-5 text-center text-xs font-bold text-slate-400">No matches</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// --- SPLIT DETAILS DRAWER ---
const SplitDetailsDrawer: React.FC<{ 
    split: SplitPolicy; 
    onClose: () => void; 
}> = ({ split, onClose }) => {
    const [comments, setComments] = useState<PolicyComment[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loadingComments, setLoadingComments] = useState(false);
    const [sending, setSending] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (split.policy_id) {
            setLoadingComments(true);
            agentPolicyDetailsApi.getPublicComments(split.policy_id)
                .then(data => setComments(data))
                .catch(console.error)
                .finally(() => setLoadingComments(false));
        }
    }, [split.policy_id]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [comments]);

    const handleSend = async () => {
        if (!newMessage.trim() || sending) return;
        setSending(true);
        try {
            const newComment = await agentPolicyDetailsApi.createComment(split.policy_id, newMessage);
            setComments(prev => [...prev, newComment]);
            setNewMessage('');
        } catch (e) {
            console.error("Failed to send comment", e);
        } finally {
            setSending(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <>
            <div 
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] transition-opacity animate-in fade-in duration-300"
                onClick={onClose}
            />
            
            <div className="fixed top-0 right-0 h-full w-full max-w-xl bg-[#F8F9FC] shadow-2xl z-[110] transform transition-transform animate-in slide-in-from-right duration-300 flex flex-col border-l border-slate-200">
                <div className="px-8 py-6 bg-white border-b border-slate-100 flex items-start justify-between shrink-0">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Policy Details</h2>
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold ${getStatusStyles(split.status)}`}>
                                {split.status}
                            </span>
                        </div>
                        <p className="text-slate-400 text-sm font-bold flex items-center gap-2">
                            <span className="font-mono bg-slate-50 px-2 py-0.5 rounded border border-slate-100 text-slate-500">#{split.policy_number || 'PENDING'}</span>
                        </p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto scrollbar-hide">
                    <div className="p-8 pb-4 grid grid-cols-2 gap-4">
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Client</p>
                            <p className="font-bold text-slate-900 text-sm truncate">{split.client}</p>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Premium</p>
                            <p className="font-black text-slate-900 text-xl">${split.annual_premium.toLocaleString()}</p>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Product</p>
                            <p className="font-bold text-slate-900 text-sm truncate">{split.carrier}</p>
                            <p className="text-xs text-slate-500 font-medium truncate mt-0.5">{split.carrier_product}</p>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Split Share</p>
                            <div className="flex items-center gap-2">
                                <span className="font-black text-slate-900 text-xl">{split.split_percentage}%</span>
                                <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100 truncate max-w-[100px]">{split.agent_name}</span>
                            </div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Source</p>
                            <p className="font-bold text-slate-900 text-sm truncate">{split.source_name || 'Not set'}</p>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Contact Type</p>
                            <p className="font-bold text-slate-900 text-sm truncate">{split.contact_type_name || 'Not set'}</p>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Paid Status</p>
                            <p className="font-bold text-slate-900 text-sm truncate">{split.paid_status || 'Not set'}</p>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Effective Date</p>
                            <p className="font-bold text-slate-900 text-sm truncate">{split.initial_draft_date ? formatDate(split.initial_draft_date) : 'Not set'}</p>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Phone</p>
                            <p className="font-bold text-slate-900 text-sm truncate">{split.phone || 'Not set'}</p>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">State</p>
                            <p className="font-bold text-slate-900 text-sm truncate">{split.state || 'Not set'}</p>
                        </div>
                    </div>

                    <div className="px-8 mt-2 mb-6">
                         <div className="flex items-center gap-4">
                             <div className="h-px bg-slate-200 flex-1"></div>
                             <div className="flex items-center gap-2 text-slate-400">
                                 <Folder className="w-4 h-4" />
                                 <span className="text-xs font-bold uppercase tracking-widest">Public Notes</span>
                             </div>
                             <div className="h-px bg-slate-200 flex-1"></div>
                         </div>
                    </div>

                    <div className="px-8 pb-6 min-h-[300px]" ref={scrollRef}>
                        {loadingComments ? (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                                <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
                                <span className="text-xs font-bold uppercase tracking-wider">Syncing Notes...</span>
                            </div>
                        ) : comments.length > 0 ? (
                            <div className="space-y-6">
                                {comments.map((comment, idx) => (
                                    <div key={idx} className="flex gap-4 group">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-black text-slate-500 shrink-0 mt-1 shadow-sm">
                                            {comment._commentby.first_name[0]}{comment._commentby.last_name[0]}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <span className="text-xs font-bold text-slate-900">{comment._commentby.first_name} {comment._commentby.last_name}</span>
                                                <span className="text-[10px] font-bold text-slate-400">{new Date(comment.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' })}</span>
                                            </div>
                                            <div className="bg-white border border-slate-200/60 p-4 rounded-2xl rounded-tl-none text-sm text-slate-600 shadow-sm leading-relaxed">
                                                {comment.message}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-400 border-2 border-dashed border-slate-200 rounded-[2rem] bg-slate-50/50">
                                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm border border-slate-100">
                                   <MessageSquare className="w-7 h-7 text-slate-300" />
                                </div>
                                <span className="text-sm font-bold text-slate-500">No public notes yet.</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-6 bg-white border-t border-slate-100 shrink-0">
                    <div className="relative group">
                        <input
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Write a public note..."
                            className="w-full bg-slate-50 border-0 rounded-2xl py-4 pl-5 pr-14 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-4 focus:ring-slate-100 transition-all shadow-sm hover:bg-slate-50/80"
                            disabled={sending}
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2">
                            <button 
                                onClick={handleSend}
                                disabled={!newMessage.trim() || sending}
                                className="p-2.5 rounded-xl text-white bg-slate-900 hover:bg-brand-50 disabled:opacity-20 disabled:hover:bg-slate-900 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg hover:shadow-brand-500/20 flex items-center justify-center transform active:scale-95 duration-200"
                            >
                                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

// --- MAIN DATE RANGE SELECTOR ---
const MainDateRangeSelector: React.FC<{
    value: DateRange;
    onChange: (range: DateRange) => void;
    placeholder?: string;
}> = ({ value, onChange, placeholder = "Select Range" }) => {
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
                onChange({ start: s.getTime(), end: e.getTime(), label: `${s.toLocaleDateString()} - ${e.toLocaleDateString()}` });
                setIsOpen(false);
            } else {
                setSelectionEnd(date);
                const s = selectionStart;
                const e = date;
                s.setHours(0,0,0,0);
                e.setHours(23,59,59,999);
                onChange({ start: s.getTime(), end: e.getTime(), label: `${s.toLocaleDateString()} - ${e.toLocaleDateString()}` });
                setIsOpen(false);
            }
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
       <div className="relative z-50" ref={containerRef}>
          <button 
              onClick={() => { setIsOpen(!isOpen); setView('presets'); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 hover:bg-slate-50 transition-all shadow-sm hover:shadow-md"
          >
              <Calendar className="w-4 h-4 text-brand-500" />
              <span>{value.label || placeholder}</span>
              <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
          {isOpen && (
              <div className="absolute top-full right-0 mt-3 bg-white rounded-[1.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100 p-2 min-w-[300px] z-[60] animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                  {view === 'presets' ? (
                      <div className="flex flex-col gap-1 p-2">
                           {[
                              { label: 'All Time', value: 'all' },
                              { label: 'Today', value: 'today' },
                              { label: 'Weekly', value: 'weekly' },
                              { label: 'Monthly', value: 'monthly' },
                              { label: 'Yearly', value: 'yearly' },
                            ].map((item) => (
                              <button
                                  key={item.value}
                                  onClick={() => handlePresetClick(item.value as any)}
                                  className={`w-full text-left px-5 py-3.5 rounded-2xl text-sm font-bold transition-all flex items-center justify-between ${value.label === item.label ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
                              >
                                  {item.label}
                                  {value.label === item.label && <CheckCircle className="w-4 h-4 text-brand-400" />}
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

export const AgentSplits: React.FC = () => {
  const { currentAgentId, selectedAgentIds, hasAgentProfile, viewingAgentName } = useAgentContext();
  const [splits, setSplits] = useState<SplitPolicy[]>([]);
  const [apiPartners, setApiPartners] = useState<Array<{ id: string; name: string; totalPremium: number; count: number }>>([]);
  const [itemsTotal, setItemsTotal] = useState(0);
  const [pageTotal, setPageTotal] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Selection State
  const [selectedSplitIds, setSelectedSplitIds] = useState<Set<string>>(new Set());
  const [selectedSplit, setSelectedSplit] = useState<SplitPolicy | null>(null);

  // Primary Time Filter
  const [dateRange, setDateRange] = useState<DateRange>(getDateRange('all'));
  
  // Filtering State
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [partnerSearch, setPartnerSearch] = useState('');
  const [isPartnersCollapsed, setIsPartnersCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Table Filter State
  const [activeStatusFilter, setActiveStatusFilter] = useState<string | 'GROUP_APPROVED' | 'GROUP_PENDING' | null>(null);
  const [statusSummaries, setStatusSummaries] = useState<Array<{ id: string; name: string; totalPremium: number; policyCount: number }>>([]);
  const [paidStatusSummaries, setPaidStatusSummaries] = useState<Array<{ id: string; name: string; totalPremium: number; policyCount: number }>>([]);
  const [carrierOptions, setCarrierOptions] = useState<PolicyFilterOption[]>([]);
  const [policyStatusOptions, setPolicyStatusOptions] = useState<PolicyFilterOption[]>([]);
  const [paidStatusOptions, setPaidStatusOptions] = useState<PolicyFilterOption[]>([]);
  const [selectedCarriers, setSelectedCarriers] = useState<string[]>([]);
  const [selectedPaidStatus, setSelectedPaidStatus] = useState<string[]>([]);
  const [effectiveDateRange, setEffectiveDateRange] = useState<DateRange | null>(null);
  const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState(false);
  const [filterGroups, setFilterGroups] = useState<SplitFilterGroup[]>([makeSplitFilterGroup()]);
  
  // Sorting & Pagination
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const effectiveAgentIds = useMemo(
    () => (selectedAgentIds && selectedAgentIds.length > 0 ? selectedAgentIds : [currentAgentId]).filter(Boolean),
    [selectedAgentIds, currentAgentId],
  );

  const timeframe = getTimeframeFromRange(dateRange);
  const apiStartDate = timeframe === 'custom' ? formatApiDate(dateRange.start) : null;
  const apiEndDate = timeframe === 'custom' ? formatApiDate(dateRange.end) : null;

  useEffect(() => {
    Promise.all([
      agentPoliciesV2Api.getCarrierOptions(),
      agentPoliciesV2Api.getPolicyStatusOptions(),
      agentPoliciesV2Api.getPolicyPaidStatusOptions(),
    ])
      .then(([carriers, statuses, paidStatuses]) => {
        setCarrierOptions(carriers);
        setPolicyStatusOptions(statuses);
        setPaidStatusOptions(paidStatuses);
      })
      .catch(error => console.error('Failed to load split filter options', error));
  }, []);

  const filterPayload = useMemo(() => {
    const expression: unknown[] = [];

    if (selectedPartnerId) expression.push(makeStatement('ref_agent_owner', '==', selectedPartnerId));
    if (activeStatusFilter === 'GROUP_APPROVED') {
      expression.push(makeOrGroup('ref_policyStatus_name', STATUS_GROUPS.APPROVED));
    } else if (activeStatusFilter === 'GROUP_PENDING') {
      expression.push(makeOrGroup('ref_policyStatus_name', STATUS_GROUPS.PENDING));
    } else if (activeStatusFilter) {
      expression.push(makeStatement('ref_policyStatus_name', '==', activeStatusFilter));
    }
    if (selectedCarriers.length > 0) expression.push(makeOrGroup('ref_carrier_name', selectedCarriers));
    if (selectedPaidStatus.length > 0) expression.push(makeOrGroup('meta_policy_paidstatus_name', selectedPaidStatus));
    if (effectiveDateRange) {
      expression.push(makeStatement('initial_draft_date', '>=', formatApiDate(effectiveDateRange.start)));
      expression.push(makeStatement('initial_draft_date', '<=', formatApiDate(effectiveDateRange.end)));
    }
    getCompleteSplitFilterGroups(filterGroups).forEach((group, groupIndex) => {
      expression.push({
        or: groupIndex > 0,
        type: 'group',
        group: {
          expression: group.rows.flatMap(buildSplitFilterStatements),
        },
      });
    });
    return expression.length > 0 ? { expression } : null;
  }, [selectedPartnerId, activeStatusFilter, selectedCarriers, selectedPaidStatus, effectiveDateRange, filterGroups]);

  const sortPayload = useMemo(() => {
    if (!sortConfig) return {};
    const apiField = SPLIT_SORT_FIELD_TO_API[sortConfig.key] || sortConfig.key;
    return { [apiField]: sortConfig.direction };
  }, [sortConfig]);

  const activeAdvancedFilters = getCompleteSplitFilterGroups(filterGroups).reduce((total, group) => total + group.rows.length, 0);
  const activeFilterCount = activeAdvancedFilters
    + (selectedPartnerId ? 1 : 0)
    + (activeStatusFilter ? 1 : 0)
    + selectedCarriers.length
    + selectedPaidStatus.length
    + (effectiveDateRange ? 1 : 0);

  useEffect(() => {
    setCurrentPage(1);
  }, [dateRange, searchQuery, selectedPartnerId, activeStatusFilter, selectedCarriers, selectedPaidStatus, effectiveDateRange, filterGroups, rowsPerPage]);

  useEffect(() => {
    if (effectiveAgentIds.length > 0) {
        setLoading(true);
        agentSplitsApi.getSplits({
            agentIds: effectiveAgentIds,
            page: currentPage,
            perPage: rowsPerPage,
            search: searchQuery,
            sort: sortPayload,
            filter: filterPayload,
            startDate: apiStartDate,
            endDate: apiEndDate,
            timeframe,
        })
            .then(data => {
                setSplits(data.items);
                setItemsTotal(data.itemsTotal);
                setPageTotal(Math.max(data.pageTotal || 1, 1));
                setApiPartners(data.partners.map(partner => ({
                    id: partner.id,
                    name: partner.name,
                    totalPremium: partner.totalPremium,
                    count: partner.policyCount,
                })));
                setStatusSummaries(data.policiesByStatus);
                setPaidStatusSummaries(data.policiesByPaidStatus);
                // Clear selection on new data fetch to avoid stale IDs
                setSelectedSplitIds(new Set());
            })
            .catch(err => console.error("Failed to load splits", err))
            .finally(() => setLoading(false));
    }
  }, [effectiveAgentIds, currentPage, rowsPerPage, searchQuery, sortPayload, filterPayload, apiStartDate, apiEndDate, timeframe]);

  const partners = useMemo(() => {
    const excludedAgentIds = new Set(effectiveAgentIds);
    if (currentAgentId) excludedAgentIds.add(currentAgentId);
    if (apiPartners.length > 0) {
        return apiPartners
            .filter(partner => !excludedAgentIds.has(partner.id))
            .sort((a, b) => b.totalPremium - a.totalPremium);
    }
    const map = new Map<string, { id: string; name: string; totalPremium: number; count: number }>();
    splits.forEach(s => {
        if (!s.agent_id || excludedAgentIds.has(s.agent_id)) return;
        if (!map.has(s.agent_id)) {
            map.set(s.agent_id, { id: s.agent_id, name: s.agent_name || 'Unknown Agent', totalPremium: 0, count: 0 });
        }
        const p = map.get(s.agent_id)!;
        p.totalPremium += s.annual_premium || 0;
        p.count++;
    });
    return Array.from(map.values()).sort((a, b) => b.totalPremium - a.totalPremium);
  }, [apiPartners, splits, effectiveAgentIds, currentAgentId]);

  const filteredPartners = partners.filter(p => 
    p.name.toLowerCase().includes(partnerSearch.toLowerCase())
  );

  const baseFilteredSplits = splits.filter(s => {
    if (selectedPartnerId && s.agent_id !== selectedPartnerId) return false;
    return true;
  });

  const carriers = useMemo(() => carrierOptions.map(carrier => carrier.label).sort(), [carrierOptions]);

  const processTableData = useMemo(() => {
      let data = [...baseFilteredSplits];

      if (activeStatusFilter) {
          data = data.filter(s => {
              if (activeStatusFilter === 'GROUP_APPROVED') return STATUS_GROUPS.APPROVED.includes(s.status);
              if (activeStatusFilter === 'GROUP_PENDING') return STATUS_GROUPS.PENDING.includes(s.status);
              return s.status === activeStatusFilter;
          });
      }

      if (selectedCarriers.length > 0) {
          data = data.filter(s => selectedCarriers.includes(s.carrier));
      }

      if (selectedPaidStatus.length > 0) {
          data = data.filter(s => {
              const status = s.paid_status || 'N/A';
              return selectedPaidStatus.includes(status);
          });
      }

      if (effectiveDateRange) {
          data = data.filter(s => {
              if (!s.initial_draft_date) return false;
              const d = new Date(s.initial_draft_date).getTime();
              return d >= effectiveDateRange.start && d <= effectiveDateRange.end;
          });
      }

      return data;
  }, [baseFilteredSplits, activeStatusFilter, selectedCarriers, selectedPaidStatus, effectiveDateRange]);

  const totalPages = pageTotal;
  const paginatedData = processTableData;

  const handleSort = (key: keyof SplitPolicy) => {
      setSortConfig(current => ({
          key,
          direction: current?.key === key && current.direction === 'asc' ? 'desc' : 'asc'
      }));
      setCurrentPage(1);
  };

  const handlePageChange = (newPage: number) => {
      if (newPage >= 1 && newPage <= totalPages) {
          setCurrentPage(newPage);
      }
  };

  // --- SELECTION LOGIC ---
  
  // Are all items on the current page selected?
  const isPageSelected = paginatedData.length > 0 && paginatedData.every(row => selectedSplitIds.has(row.id));
  
  // Are all items in the filtered set selected?
  const isAllSelected = paginatedData.length > 0 && selectedSplitIds.size === paginatedData.length;

  const handleSelectPage = () => {
    if (isPageSelected) {
        // Deselect current page
        const newSelected = new Set(selectedSplitIds);
        paginatedData.forEach(row => newSelected.delete(row.id));
        setSelectedSplitIds(newSelected);
    } else {
        // Select current page
        const newSelected = new Set(selectedSplitIds);
        paginatedData.forEach(row => newSelected.add(row.id));
        setSelectedSplitIds(newSelected);
    }
  };

  const handleSelectAllGlobal = () => {
    const allIds = new Set(paginatedData.map(d => d.id));
    setSelectedSplitIds(allIds);
  };
  
  const handleClearSelection = () => {
      setSelectedSplitIds(new Set());
  };

  const handleSelectOne = (id: string) => {
      const next = new Set(selectedSplitIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setSelectedSplitIds(next);
  };

  const handleExportCSV = () => {
    const selectedData = processTableData.filter(s => selectedSplitIds.has(s.id));
    if (selectedData.length === 0) return;

    const headers = ['Client', 'Sale Date', 'Partner Agent', 'Policy Number', 'Split %', 'Carrier', 'Product', 'Source', 'Premium', 'Status', 'Paid Status'];
    const csvContent = [
        headers.join(','),
        ...selectedData.map(row => [
            `"${row.client}"`,
            `"${new Date(row.created_at).toLocaleDateString()}"`,
            `"${row.agent_name}"`,
            `"${row.policy_number || ''}"`,
            `${row.split_percentage}%`,
            `"${row.carrier}"`,
            `"${row.carrier_product}"`,
            `"${row.source_name || ''}"`,
            row.annual_premium,
            row.status,
            row.paid_status || 'Unpaid'
        ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `splits_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- STATS ---
  const buildMetricCards = (
    options: PolicyFilterOption[],
    summaries: Array<{ id: string; name: string; totalPremium: number; policyCount: number }>,
  ) => {
    const summaryMap = new Map(summaries.map(status => [status.name.toLowerCase(), status]));
    const utilityCards = options.map(status => {
        const summary = summaryMap.get(status.label.toLowerCase());
        return {
            id: status.id || status.label,
            label: status.label,
            policyCount: summary?.policyCount ?? 0,
            totalPremium: summary?.totalPremium ?? 0,
        };
    });

    if (utilityCards.length > 0) return utilityCards;

    return summaries.map(status => ({
        id: status.id || status.name,
        label: status.name,
        policyCount: status.policyCount,
        totalPremium: status.totalPremium,
    }));
  };

  const policyStatusMetricCards = useMemo(() => {
    return buildMetricCards(policyStatusOptions, statusSummaries);
  }, [policyStatusOptions, statusSummaries]);

  const paidStatusMetricCards = useMemo(() => {
    return buildMetricCards(paidStatusOptions, paidStatusSummaries);
  }, [paidStatusOptions, paidStatusSummaries]);

  const policyStatusChartData = useMemo(() => {
    const nonZero = policyStatusMetricCards.filter(metric => metric.policyCount > 0);
    const maxCount = Math.max(...nonZero.map(metric => metric.policyCount), 1);
    return nonZero.map((metric, index) => ({
        ...metric,
        percent: Math.max((metric.policyCount / maxCount) * 100, 3),
        isAttention: ATTENTION_POLICY_STATUSES.has(metric.label.toLowerCase()),
        color: ATTENTION_POLICY_STATUSES.has(metric.label.toLowerCase()) ? '#ef4444' : ['#0f172a', '#f59e0b', '#2563eb', '#10b981', '#8b5cf6'][index % 5],
    }));
  }, [policyStatusMetricCards]);

  const paidStatusChartData = useMemo(() => {
    return paidStatusMetricCards
        .filter(metric => metric.policyCount > 0)
        .map((metric, index) => ({
            ...metric,
            value: metric.policyCount,
            isAttention: ATTENTION_PAID_STATUSES.has(metric.label.toLowerCase()),
            color: ATTENTION_PAID_STATUSES.has(metric.label.toLowerCase()) ? '#ef4444' : ['#0f172a', '#f59e0b', '#10b981', '#8b5cf6', '#06b6d4'][index % 5],
        }));
  }, [paidStatusMetricCards]);

  const totalPolicyMetrics = useMemo(() => {
    const source = statusSummaries.length > 0 ? statusSummaries : paidStatusSummaries;
    return source.reduce(
        (total, metric) => ({
            policyCount: total.policyCount + metric.policyCount,
            totalPremium: total.totalPremium + metric.totalPremium,
        }),
        { policyCount: 0, totalPremium: 0 },
    );
  }, [statusSummaries, paidStatusSummaries]);

  const actionItems = useMemo(() => {
    const counts = new Map<string, number>();
    baseFilteredSplits.forEach(s => {
        if (ACTION_STATUSES.some(status => s.status.toLowerCase() === status.toLowerCase())) {
            const key = s.status; 
            counts.set(key, (counts.get(key) || 0) + 1);
        }
    });
    return Array.from(counts.entries()).map(([status, count]) => ({ status, count }));
  }, [baseFilteredSplits]);

  const totalActionCount = actionItems.reduce((acc, curr) => acc + curr.count, 0);

  const toggleFilter = (filter: string | 'GROUP_APPROVED' | 'GROUP_PENDING') => {
      setActiveStatusFilter(current => current === filter ? null : filter);
  };

  const handlePolicyStatusMetricClick = (status: string) => {
      setSelectedPaidStatus([]);
      setActiveStatusFilter(current => current === status ? null : status);
  };

  const handlePaidStatusMetricClick = (status: string) => {
      setActiveStatusFilter(null);
      setSelectedPaidStatus(current => current.length === 1 && current[0] === status ? [] : [status]);
  };

  const handleTotalMetricClick = () => {
      setActiveStatusFilter(null);
      setSelectedPaidStatus([]);
  };

  const getFilterOptions = (fieldKey: SplitFilterFieldKey | '') => {
      if (fieldKey === 'ref_agent_owner') {
          return partners.map(partner => ({ value: partner.id, label: partner.name }));
      }
      if (fieldKey === 'ref_carrier_name') {
          return carrierOptions.map(carrier => ({ value: carrier.label, label: carrier.label }));
      }
      if (fieldKey === 'ref_policyStatus_name') {
          return policyStatusOptions.map(status => ({ value: status.label, label: status.label }));
      }
      if (fieldKey === 'meta_policy_paidstatus_name') {
          return paidStatusOptions.map(status => ({ value: status.label, label: status.label }));
      }
      return [];
  };

  const updateFilterRow = (groupId: string, rowId: string, updates: Partial<SplitFilterRow>) => {
      setFilterGroups(current => current.map(group => {
          if (group.id !== groupId) return group;
          return {
              ...group,
              rows: group.rows.map(row => {
                  if (row.id !== rowId) return row;
                  const next = { ...row, ...updates };
                  if (updates.field) {
                      const ops = getSplitFilterOps(updates.field);
                      next.op = ops[0]?.op || 'ilike';
                      next.value = '';
                      next.displayValue = '';
                      next.dateRange = null;
                  }
                  return next;
              }),
          };
      }));
  };

  const addFilterRow = (groupId: string) => {
      setFilterGroups(current => current.map(group => (
          group.id === groupId ? { ...group, rows: [...group.rows, makeSplitFilterRow()] } : group
      )));
  };

  const removeFilterRow = (groupId: string, rowId: string) => {
      setFilterGroups(current => current.map(group => {
          if (group.id !== groupId) return group;
          return { ...group, rows: group.rows.length > 1 ? group.rows.filter(row => row.id !== rowId) : [makeSplitFilterRow()] };
      }));
  };

  const duplicateFilterGroup = (group: SplitFilterGroup) => {
      setFilterGroups(current => [
          ...current,
          {
              id: crypto.randomUUID(),
              rows: group.rows.map(row => ({ ...row, id: crypto.randomUUID() })),
          },
      ]);
  };

  const removeFilterGroup = (groupId: string) => {
      setFilterGroups(current => current.length > 1 ? current.filter(group => group.id !== groupId) : [makeSplitFilterGroup()]);
  };

  const clearAllFilters = () => {
      setSelectedPartnerId(null);
      setActiveStatusFilter(null);
      setSelectedCarriers([]);
      setSelectedPaidStatus([]);
      setEffectiveDateRange(null);
      setFilterGroups([makeSplitFilterGroup()]);
      setSearchQuery('');
      setSortConfig(null);
      setCurrentPage(1);
  };

  const getActionIcon = (status: string) => {
      const s = status.toLowerCase();
      if (s.includes('decline') || s.includes('cancel')) return <XCircle className="w-4 h-4" />;
      if (s.includes('taken')) return <Ban className="w-4 h-4" />;
      if (s.includes('lapsed')) return <FileWarning className="w-4 h-4" />;
      return <AlertTriangle className="w-4 h-4" />;
  };

  if (!hasAgentProfile) {
    return (
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-8 flex flex-col items-center justify-center min-h-[400px] text-center">
         <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-6 shadow-inner">
           <UserX className="w-10 h-10 text-slate-300" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">No Agent Profile Connected</h2>
        <p className="text-slate-500 max-w-md">
           You don't have an Agent Profile connected. Please switch to an agent workspace to view split business.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col xl:flex-row gap-8 items-start font-sans relative">
        {/* LEFT SIDEBAR: PARTNERS LIST */}
        <div className={`${isPartnersCollapsed ? 'w-full xl:w-20' : 'w-full xl:w-80'} flex-shrink-0 bg-white rounded-[2.5rem] border border-slate-100 shadow-[0_4px_30px_-4px_rgba(0,0,0,0.02)] flex flex-col xl:sticky xl:top-24 h-[800px] overflow-hidden transition-all duration-300`}>
            <div className={isPartnersCollapsed ? 'p-4' : 'p-6 pb-2'}>
                <div className={`flex items-center gap-3 mb-6 ${isPartnersCollapsed ? 'justify-center' : 'justify-between'}`}>
                    {!isPartnersCollapsed && <h2 className="text-xs font-extrabold text-slate-900 uppercase tracking-widest">Partners</h2>}
                    <button
                        type="button"
                        onClick={() => setIsPartnersCollapsed(value => !value)}
                        className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-100 text-slate-500 hover:text-slate-900 hover:bg-white hover:shadow-sm flex items-center justify-center transition-all"
                        title={isPartnersCollapsed ? 'Expand partners' : 'Collapse partners'}
                    >
                        <ChevronLeft className={`w-4 h-4 transition-transform ${isPartnersCollapsed ? 'rotate-180' : ''}`} strokeWidth={2.5} />
                    </button>
                </div>
                {!isPartnersCollapsed && (
                <div className="relative mb-2">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Search..." 
                        value={partnerSearch}
                        onChange={e => setPartnerSearch(e.target.value)}
                        className="w-full pl-11 pr-4 py-4 bg-slate-50 border-none rounded-[1.25rem] text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all placeholder:text-slate-400 text-slate-700"
                    />
                </div>
                )}
            </div>

            {isPartnersCollapsed ? (
                <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-3 scrollbar-hide">
                    <button
                        type="button"
                        onClick={() => setSelectedPartnerId(null)}
                        className={`w-12 h-12 mx-auto rounded-2xl flex items-center justify-center transition-all ${
                            !selectedPartnerId ? 'bg-slate-900 text-brand-400 shadow-xl shadow-slate-900/20' : 'bg-slate-50 text-slate-500 hover:bg-brand-50 hover:text-brand-600'
                        }`}
                        title="All Splits"
                    >
                        <Split size={18} strokeWidth={2.5} />
                    </button>
                    {filteredPartners.slice(0, 12).map(partner => (
                        <button
                            key={partner.id}
                            type="button"
                            onClick={() => setSelectedPartnerId(partner.id)}
                            className={`w-12 h-12 mx-auto rounded-2xl text-xs font-black flex items-center justify-center transition-all ${
                                selectedPartnerId === partner.id ? 'bg-slate-900 text-brand-400 shadow-xl shadow-slate-900/20' : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                            }`}
                            title={`${partner.name} - ${partner.count.toLocaleString()} policies`}
                        >
                            {partner.name.split(' ').map(n=>n[0]).join('').substring(0,2)}
                        </button>
                    ))}
                </div>
            ) : (
            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2 scrollbar-hide">
                 <button
                    onClick={() => setSelectedPartnerId(null)}
                    className={`w-full flex items-center justify-between p-4 rounded-[1.25rem] transition-all duration-300 group relative overflow-hidden ${!selectedPartnerId ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/20 scale-[1.02]' : 'bg-white hover:bg-slate-50 text-slate-600 border border-transparent hover:border-slate-100'}`}
                 >
                    <div className="relative z-10 flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${!selectedPartnerId ? 'bg-white/10 border-white/10 text-brand-400' : 'bg-brand-50 border-brand-100 text-brand-600'}`}>
                            <Split size={18} strokeWidth={2.5} />
                        </div>
                        <span className="font-bold text-sm">All Splits</span>
                    </div>
                    <span className={`relative z-10 text-xs font-bold px-2.5 py-1 rounded-lg ${!selectedPartnerId ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>{itemsTotal}</span>
                 </button>

                 {filteredPartners.length > 0 ? (
                    filteredPartners.map(partner => (
                        <button
                            key={partner.id}
                            onClick={() => setSelectedPartnerId(partner.id)}
                            className={`w-full flex items-center justify-between p-4 rounded-[1.25rem] transition-all duration-300 group ${selectedPartnerId === partner.id ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/20 scale-[1.02]' : 'bg-white hover:bg-slate-50 border border-transparent hover:border-slate-100'}`}
                        >
                            <div className="flex items-center gap-4 min-w-0">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border-2 ${selectedPartnerId === partner.id ? 'bg-white/10 border-white/10 text-brand-400' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
                                    {partner.name.split(' ').map(n=>n[0]).join('').substring(0,2)}
                                </div>
                                <div className="text-left min-w-0">
                                    <p className={`font-bold text-sm truncate ${selectedPartnerId === partner.id ? 'text-white' : 'text-slate-900'}`}>{partner.name}</p>
                                    <p className={`text-xs font-medium ${selectedPartnerId === partner.id ? 'text-slate-400' : 'text-slate-500'}`}>
                                        {partner.count.toLocaleString()} policies · ${partner.totalPremium.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                                    </p>
                                </div>
                            </div>
                            <ChevronRight className={`w-4 h-4 transition-all ${selectedPartnerId === partner.id ? 'text-brand-500 opacity-100' : 'text-slate-300 opacity-0 group-hover:opacity-100'}`} />
                        </button>
                    ))
                 ) : (
                    <div className="text-center py-8 text-xs text-slate-400 font-bold">
                        No partners found
                    </div>
                 )}
            </div>
            )}
        </div>

        {/* RIGHT: MAIN CONTENT */}
        <div className="flex-1 w-full space-y-8 pb-32">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Split Business</h1>
                    <p className="text-sm text-slate-500 font-medium mt-1">Shared production for <span className="font-bold text-slate-800">{viewingAgentName}</span></p>
                </div>
                <MainDateRangeSelector value={dateRange} onChange={setDateRange} placeholder="Fetch Period" />
            </div>

            {/* DASHBOARD GRID */}
            <div className="grid grid-cols-1 xl:grid-cols-[280px_minmax(0,1fr)_minmax(360px,0.95fr)] gap-5 items-stretch">
                    <button
                        onClick={handleTotalMetricClick}
                        className={`p-6 rounded-[2rem] min-h-[220px] flex flex-col justify-between relative overflow-hidden transition-all text-left group ${
                            !activeStatusFilter && selectedPaidStatus.length === 0
                                ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/20 scale-[1.02]'
                                : 'bg-white border border-slate-100 hover:shadow-lg hover:shadow-slate-500/10 hover:border-slate-200'
                        }`}
                    >
                        <div className="flex items-start justify-between">
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${!activeStatusFilter && selectedPaidStatus.length === 0 ? 'bg-white/20 text-brand-400' : 'bg-brand-50 text-brand-600'}`}>
                                <ListFilter className="w-5 h-5" strokeWidth={2.5} />
                            </div>
                            <span className={`text-xs font-black px-2 py-1 rounded-lg ${!activeStatusFilter && selectedPaidStatus.length === 0 ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                                {totalPolicyMetrics.policyCount.toLocaleString()}
                            </span>
                        </div>
                        <div>
                            <h3 className={`text-3xl font-extrabold mb-1 ${!activeStatusFilter && selectedPaidStatus.length === 0 ? 'text-white' : 'text-slate-900'}`}>
                                ${totalPolicyMetrics.totalPremium.toLocaleString('en-US', { notation: 'compact' })}
                            </h3>
                            <p className={`text-[10px] font-black uppercase tracking-wider ${!activeStatusFilter && selectedPaidStatus.length === 0 ? 'text-slate-300' : 'text-slate-400'}`}>
                                Total Policies
                            </p>
                        </div>
                    </button>

                    <section className="min-w-0 rounded-[2rem] bg-white border border-slate-100 shadow-sm p-5">
                        <p className="px-1 pb-2 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Policies By Status</p>
                        <div className="space-y-3 max-h-[230px] overflow-y-auto pr-1">
                            {policyStatusChartData.map((metric) => {
                                const isActive = activeStatusFilter === metric.label;
                                const isAttention = metric.isAttention;
                                return (
                                    <button
                                        key={metric.id}
                                        onClick={() => handlePolicyStatusMetricClick(metric.label)}
                                        className={`w-full p-3 rounded-[1.25rem] transition-all text-left ${
                                            isActive
                                                ? (isAttention ? 'bg-red-600 text-white shadow-xl shadow-red-500/25 scale-[1.01]' : 'bg-slate-900 text-white shadow-xl shadow-slate-900/20 scale-[1.01]')
                                                : (isAttention ? 'bg-red-50 border border-red-200 hover:border-red-300 hover:shadow-md hover:shadow-red-500/10' : 'bg-white border border-slate-100 hover:border-slate-200 hover:shadow-sm')
                                        }`}
                                    >
                                        <div className="flex items-center justify-between gap-3 mb-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                                {isAttention && (
                                                    <span className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${isActive ? 'bg-white/20 text-white' : 'bg-red-100 text-red-600'}`}>
                                                        <AlertTriangle className="w-3.5 h-3.5" strokeWidth={2.8} />
                                                    </span>
                                                )}
                                                <p className={`text-xs font-black uppercase tracking-wider truncate ${isActive ? 'text-slate-200' : isAttention ? 'text-red-700' : 'text-slate-600'}`}>{metric.label}</p>
                                            </div>
                                            <span className={`text-xs font-bold px-2 py-1 rounded-lg shrink-0 ${isActive ? 'bg-white text-slate-900' : 'bg-slate-100 text-slate-600'}`}>
                                                {metric.policyCount.toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all duration-500"
                                                style={{ width: `${metric.percent}%`, backgroundColor: metric.color }}
                                            />
                                        </div>
                                        <div className="mt-2 flex items-center justify-between gap-2">
                                            <p className={`text-lg font-black ${isActive ? 'text-white' : 'text-slate-900'}`}>
                                                ${metric.totalPremium.toLocaleString('en-US', { notation: 'compact' })}
                                            </p>
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-slate-300' : 'text-slate-400'}`}>Policies</span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </section>

                    <section className="min-w-0 rounded-[2rem] bg-white border border-slate-100 shadow-sm p-5 overflow-hidden">
                        <p className="px-1 pb-2 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Policies By Paid Status</p>
                        <div className="grid grid-cols-1 2xl:grid-cols-[220px_minmax(140px,1fr)] gap-5 items-center">
                            <div className="relative h-52 min-w-[210px] overflow-visible [&_.recharts-wrapper]:overflow-visible [&_svg]:overflow-visible">
                                <ResponsiveContainer width="100%" height="100%" className="relative z-10">
                                    <PieChart margin={{ top: 18, right: 18, bottom: 18, left: 18 }}>
                                        <Pie
                                            data={paidStatusChartData}
                                            dataKey="value"
                                            nameKey="label"
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={64}
                                            outerRadius={88}
                                            paddingAngle={5}
                                            cornerRadius={12}
                                            stroke="none"
                                            onClick={(entry: any) => handlePaidStatusMetricClick(entry.label)}
                                        >
                                            {paidStatusChartData.map((entry) => (
                                                <Cell
                                                    key={entry.id}
                                                    fill={entry.color}
                                                    className="cursor-pointer outline-none"
                                                />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip
                                            formatter={(value: number, _name, entry: any) => [`${value.toLocaleString()} policies`, entry.payload.label]}
                                            contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 16px 40px rgba(15,23,42,0.12)' }}
                                            wrapperStyle={{ zIndex: 40, pointerEvents: 'none' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 z-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-3xl font-black text-slate-900">{paidStatusChartData.reduce((total, item) => total + item.policyCount, 0).toLocaleString()}</span>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Paid Status</span>
                                </div>
                            </div>
                            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                                {paidStatusChartData.map((metric) => {
                                    const isActive = selectedPaidStatus.length === 1 && selectedPaidStatus[0] === metric.label;
                                    const isAttention = metric.isAttention;
                                    return (
                                        <button
                                            key={metric.id}
                                            onClick={() => handlePaidStatusMetricClick(metric.label)}
                                            className={`w-full p-3 rounded-[1.25rem] transition-all text-left ${
                                                isActive
                                                    ? (isAttention ? 'bg-red-600 text-white shadow-xl shadow-red-500/25 scale-[1.01]' : 'bg-slate-900 text-white shadow-xl shadow-slate-900/20 scale-[1.01]')
                                                    : (isAttention ? 'bg-red-50 border border-red-200 hover:border-red-300 hover:shadow-md hover:shadow-red-500/10' : 'bg-white border border-slate-100 hover:border-slate-200 hover:shadow-sm')
                                            }`}
                                        >
                                            <div className="flex items-start gap-3 min-w-0">
                                                {isAttention ? (
                                                    <span className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${isActive ? 'bg-white/20 text-white' : 'bg-red-100 text-red-600'}`}>
                                                        <AlertTriangle className="w-3.5 h-3.5" strokeWidth={2.8} />
                                                    </span>
                                                ) : (
                                                    <span className="w-3 h-3 rounded-full shrink-0 mt-1" style={{ backgroundColor: metric.color }} />
                                                )}
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <p className={`text-xs font-black uppercase tracking-wider truncate ${isActive ? 'text-slate-200' : isAttention ? 'text-red-700' : 'text-slate-500'}`}>{metric.label}</p>
                                                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg shrink-0 ${isActive ? 'bg-white text-slate-900' : 'bg-slate-100 text-slate-600'}`}>
                                                            {metric.policyCount.toLocaleString()}
                                                        </span>
                                                    </div>
                                                    <p className={`text-lg font-black ${isActive ? 'text-white' : 'text-slate-900'}`}>
                                                        ${metric.totalPremium.toLocaleString('en-US', { notation: 'compact' })}
                                                    </p>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                            {paidStatusChartData.length === 0 && (
                                <div className="xl:col-span-2 rounded-2xl border border-dashed border-slate-200 p-6 text-center text-xs font-bold text-slate-400">
                                    No paid status totals yet
                                </div>
                            )}
                        </div>
                    </section>
            </div>

            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 relative">
                <div className="p-8 border-b border-slate-50 flex flex-col xl:flex-row xl:items-center justify-between gap-6 relative z-30">
                    <div className="flex items-center gap-4 min-w-max">
                        <div className={`p-3 rounded-2xl transition-colors shadow-sm ${activeStatusFilter ? 'bg-brand-500 text-white shadow-brand-500/30' : 'bg-slate-100 text-slate-500'}`}>
                            {activeStatusFilter ? <Filter className="w-5 h-5" /> : <Split className="w-5 h-5" />}
                        </div>
                        <div>
                             <h3 className="text-lg font-bold text-slate-900">
                                {selectedPartnerId ? 'Partner Agreements' : 'All Split Agreements'}
                            </h3>
                            {activeStatusFilter && (
                                <p className="text-xs font-bold text-brand-500 uppercase tracking-wide animate-in slide-in-from-left-2 mt-0.5">
                                    Filtered by: {activeStatusFilter.replace('GROUP_', '')}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full xl:w-auto overflow-visible pb-1 sm:pb-0">
                        <div className="relative w-full sm:w-[260px]">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search client, policy #, carrier..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="h-11 w-full pl-11 pr-4 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-sm focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-400 placeholder:text-slate-400"
                            />
                        </div>

                        <button
                            onClick={() => setIsAdvancedFilterOpen(true)}
                            className={`h-11 px-5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-sm ${
                                activeFilterCount > 0
                                    ? 'bg-slate-900 text-white border border-slate-900'
                                    : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                            }`}
                        >
                            <ListFilter className="w-4 h-4" />
                            Advanced Filter
                            {activeFilterCount > 0 && (
                                <span className="min-w-5 h-5 px-1.5 rounded-full bg-brand-500 text-slate-900 text-[10px] font-black flex items-center justify-center">
                                    {activeFilterCount}
                                </span>
                            )}
                        </button>

                        {(searchQuery || activeFilterCount > 0 || sortConfig) && (
                            <button
                                onClick={clearAllFilters}
                                className="h-11 px-4 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 transition-colors flex items-center justify-center gap-2 shadow-sm"
                            >
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Reset</span>
                            </button>
                        )}
                    </div>
                </div>
                
                {selectedSplitIds.size > 0 && !isAllSelected && (
                    <div className="bg-blue-50 border-b border-blue-100 py-3 text-center text-sm font-medium text-blue-800 animate-in fade-in slide-in-from-top-1">
                        <span className="font-bold">{selectedSplitIds.size}</span> items selected on this page. 
                        <button 
                            onClick={handleSelectAllGlobal}
                            className="font-bold underline hover:text-blue-900 ml-1 decoration-blue-800"
                        >
                            Select all {paginatedData.length} loaded items
                        </button>
                    </div>
                )}
                
                {isAllSelected && selectedSplitIds.size > 0 && (
                    <div className="bg-blue-50 border-b border-blue-100 py-3 text-center text-sm font-medium text-blue-800 animate-in fade-in slide-in-from-top-1">
                        All <span className="font-bold">{paginatedData.length}</span> loaded items selected. 
                        <button 
                            onClick={handleClearSelection}
                            className="font-bold underline hover:text-blue-900 ml-1 decoration-blue-800"
                        >
                            Clear selection
                        </button>
                    </div>
                )}

                <div className="overflow-hidden rounded-b-[2.5rem]">
                    <div className="overflow-x-auto min-h-[400px]">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="text-slate-400 border-b border-slate-100/50">
                                    <th className="py-5 pl-8 w-10">
                                        <input 
                                            type="checkbox" 
                                            className="rounded border-slate-300 text-brand-500 focus:ring-brand-500" 
                                            checked={isPageSelected}
                                            onChange={handleSelectPage}
                                        />
                                    </th>
                                    <th 
                                        className="py-5 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 cursor-pointer hover:text-brand-500 group transition-colors"
                                        onClick={() => handleSort('client')}
                                    >
                                        <div className="flex items-center gap-1">
                                            Client & Date
                                            <ArrowUpDown className={`w-3 h-3 ${sortConfig?.key === 'client' ? 'text-brand-500' : 'text-slate-300 group-hover:text-brand-300'}`} />
                                        </div>
                                    </th>
                                    <th 
                                        className="py-5 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 cursor-pointer hover:text-brand-500 group transition-colors"
                                        onClick={() => handleSort('agent_name')}
                                    >
                                        <div className="flex items-center gap-1">
                                            Partner Agent
                                            <ArrowUpDown className={`w-3 h-3 ${sortConfig?.key === 'agent_name' ? 'text-brand-500' : 'text-slate-300 group-hover:text-brand-300'}`} />
                                        </div>
                                    </th>
                                    <th 
                                        className="py-5 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 cursor-pointer hover:text-brand-500 group transition-colors"
                                        onClick={() => handleSort('policy_number')}
                                    >
                                        <div className="flex items-center gap-1">
                                            Policy Number
                                            <ArrowUpDown className={`w-3 h-3 ${sortConfig?.key === 'policy_number' ? 'text-brand-500' : 'text-slate-300 group-hover:text-brand-300'}`} />
                                        </div>
                                    </th>
                                    <th 
                                        className="py-5 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 cursor-pointer hover:text-brand-500 group transition-colors"
                                        onClick={() => handleSort('split_percentage')}
                                    >
                                        <div className="flex items-center gap-1">
                                            My Split %
                                            <ArrowUpDown className={`w-3 h-3 ${sortConfig?.key === 'split_percentage' ? 'text-brand-500' : 'text-slate-300 group-hover:text-brand-300'}`} />
                                        </div>
                                    </th>
                                    <th 
                                        className="py-5 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 cursor-pointer hover:text-brand-500 group transition-colors"
                                        onClick={() => handleSort('carrier')}
                                    >
                                        <div className="flex items-center gap-1">
                                            Carrier
                                            <ArrowUpDown className={`w-3 h-3 ${sortConfig?.key === 'carrier' ? 'text-brand-500' : 'text-slate-300 group-hover:text-brand-300'}`} />
                                        </div>
                                    </th>
                                    <th
                                        className="py-5 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 cursor-pointer hover:text-brand-500 group transition-colors"
                                        onClick={() => handleSort('source_name')}
                                    >
                                        <div className="flex items-center gap-1">
                                            Source
                                            <ArrowUpDown className={`w-3 h-3 ${sortConfig?.key === 'source_name' ? 'text-brand-500' : 'text-slate-300 group-hover:text-brand-300'}`} />
                                        </div>
                                    </th>
                                    <th 
                                        className="py-5 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 cursor-pointer hover:text-brand-500 group transition-colors"
                                        onClick={() => handleSort('annual_premium')}
                                    >
                                        <div className="flex items-center gap-1">
                                            Premium
                                            <ArrowUpDown className={`w-3 h-3 ${sortConfig?.key === 'annual_premium' ? 'text-brand-500' : 'text-slate-300 group-hover:text-brand-300'}`} />
                                        </div>
                                    </th>
                                    <th 
                                        className="py-5 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 cursor-pointer hover:text-brand-500 group transition-colors"
                                        onClick={() => handleSort('status')}
                                    >
                                        <div className="flex items-center gap-1">
                                            Status
                                            <ArrowUpDown className={`w-3 h-3 ${sortConfig?.key === 'status' ? 'text-brand-500' : 'text-slate-300 group-hover:text-brand-300'}`} />
                                        </div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {loading ? (
                                    <tr>
                                        <td colSpan={9} className="py-12 text-center">
                                            <div className="flex items-center justify-center gap-3 text-slate-400">
                                                <Loader2 className="w-6 h-6 animate-spin" />
                                                <span className="text-sm font-medium">Loading splits...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : paginatedData.length > 0 ? (
                                    paginatedData.map((item) => {
                                        const isSelected = selectedSplitIds.has(item.id);
                                        return (
                                            <tr 
                                                key={item.id} 
                                                onClick={() => setSelectedSplit(item)}
                                                className={`hover:bg-slate-50/50 transition-colors group cursor-pointer ${isSelected ? 'bg-brand-50/30' : ''}`}
                                            >
                                                <td className="py-5 pl-8">
                                                    <input 
                                                        type="checkbox" 
                                                        className="rounded border-slate-300 text-brand-500 focus:ring-brand-500" 
                                                        checked={isSelected}
                                                        onClick={(e) => e.stopPropagation()}
                                                        onChange={() => handleSelectOne(item.id)}
                                                    />
                                                </td>
                                                <td className="py-5 px-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-900 text-sm">{item.client}</span>
                                                        <span className="text-[10px] text-slate-400 font-bold">{formatDate(item.created_at)}</span>
                                                    </div>
                                                </td>
                                                <td className="py-5 px-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 border border-slate-200">
                                                            {item.agent_name ? item.agent_name.split(' ').map(n=>n[0]).join('').substring(0,2) : '?'}
                                                        </div>
                                                        <span className="text-xs font-bold text-slate-700">{item.agent_name}</span>
                                                    </div>
                                                </td>
                                                <td className="py-5 px-4">
                                                    <span className="font-mono text-xs font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                                                        #{item.policy_number || 'PENDING'}
                                                    </span>
                                                </td>
                                                <td className="py-5 px-4">
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-brand-50 text-brand-700 border border-brand-100">
                                                        {item.split_percentage}%
                                                    </span>
                                                </td>
                                                <td className="py-5 px-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-900 text-xs">{item.carrier}</span>
                                                        <span className="text-[10px] text-slate-400 font-medium">{item.carrier_product}</span>
                                                    </div>
                                                </td>
                                                <td className="py-5 px-4">
                                                    <span className="text-xs font-bold text-slate-600">
                                                        {item.source_name || '—'}
                                                    </span>
                                                </td>
                                                <td className="py-5 px-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-900 text-sm">${item.annual_premium.toLocaleString()}</span>
                                                        {item.initial_draft_date && (
                                                            <span className="text-[9px] text-slate-400 font-bold">Eff: {formatDate(item.initial_draft_date)}</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-5 px-4">
                                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold ${getStatusStyles(item.status)}`}>
                                                        {item.status}
                                                    </span>
                                                    <div className="text-[9px] text-slate-400 mt-1 ml-1 font-bold">{item.paid_status === 'Paid' ? 'Paid' : 'Unpaid'}</div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={9} className="py-12 text-center text-slate-400 text-sm">
                                            No split business found for this selection.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="p-6 border-t border-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="text-xs font-bold text-slate-500">
                            Showing <span className="text-slate-900">{paginatedData.length > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0}</span> to <span className="text-slate-900">{paginatedData.length > 0 ? Math.min((currentPage - 1) * rowsPerPage + paginatedData.length, itemsTotal) : 0}</span> of <span className="text-slate-900">{itemsTotal}</span> entries
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
                                    <option value={25}>25</option>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-1">
                                <button 
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <span className="text-xs font-bold text-slate-700 px-2">
                                    Page {currentPage}
                                </span>
                                <button 
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage === totalPages || totalPages === 0}
                                    className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                {selectedSplitIds.size > 0 && (
                    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white rounded-full px-6 py-3 shadow-2xl flex items-center gap-6 z-[100] animate-in slide-in-from-bottom-4 fade-in duration-300">
                        <div className="flex items-center gap-2">
                            <span className="bg-brand-500 text-slate-900 text-xs font-black px-2 py-0.5 rounded-md">{selectedSplitIds.size}</span>
                            <span className="text-sm font-bold">Selected</span>
                        </div>
                        <div className="h-4 w-px bg-slate-700"></div>
                        <button 
                            onClick={handleExportCSV}
                            className="flex items-center gap-2 text-sm font-bold text-slate-300 hover:text-white transition-colors"
                        >
                            <Download className="w-4 h-4" />
                            <span>Export CSV</span>
                        </button>
                    </div>
                )}
            </div>
        </div>

        {isAdvancedFilterOpen && (
            <>
                <div className="fixed inset-0 z-[110] bg-black/20 backdrop-blur-[1px]" onClick={() => setIsAdvancedFilterOpen(false)} />
                <aside className="fixed top-0 right-0 z-[120] h-full w-96 max-w-[calc(100vw-2rem)] bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out translate-x-0">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center">
                                <Filter className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <p className="text-sm font-black text-slate-900">Filters</p>
                                {activeFilterCount > 0 && (
                                    <p className="text-[11px] text-slate-400 font-medium">{activeFilterCount} active</p>
                                )}
                            </div>
                        </div>
                        <button onClick={() => setIsAdvancedFilterOpen(false)} className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
                        <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3 space-y-3">
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Partner Scope</p>
                                    <p className="text-xs font-semibold text-slate-500">Filters by ref_agent_owner = partner.id.</p>
                                </div>
                                {selectedPartnerId && (
                                    <button onClick={() => setSelectedPartnerId(null)} className="text-[10px] font-black uppercase tracking-widest text-brand-600 hover:text-brand-700">
                                        Clear
                                    </button>
                                )}
                            </div>
                            <SplitSearchSelect
                                value={selectedPartnerId || ''}
                                placeholder="All partners"
                                options={[
                                    { value: '', label: 'All partners' },
                                    ...partners.map(partner => ({ value: partner.id, label: partner.name })),
                                ]}
                                onChange={option => setSelectedPartnerId(option.value || null)}
                            />
                        </div>

                        {filterGroups.map((group, groupIndex) => (
                            <div key={group.id} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3 space-y-3">
                                <div className="flex items-center justify-between gap-3">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        {groupIndex === 0 ? 'Filter Group' : 'Or Group'}
                                    </p>
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => duplicateFilterGroup(group)} className="px-2 py-1 rounded-lg text-[10px] font-black text-slate-500 hover:bg-white border border-slate-200">Duplicate</button>
                                        <button onClick={() => removeFilterGroup(group.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-white border border-slate-200">
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>

                                {group.rows.map((row, rowIndex) => {
                                    const field = getSplitFilterField(row.field);
                                    const ops = getSplitFilterOps(row.field);
                                    const options = getFilterOptions(row.field);

                                    return (
                                        <div key={row.id} className="rounded-2xl bg-white border border-slate-100 p-3 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">{rowIndex === 0 ? 'Where' : 'And'}</span>
                                                <button onClick={() => removeFilterRow(group.id, row.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50">
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>

                                            <SplitFilterSelect
                                                value={row.field}
                                                placeholder="Choose field"
                                                options={[
                                                    { value: '', label: 'Choose field' },
                                                    ...SPLIT_FILTER_FIELDS.map(option => ({ value: option.key, label: option.label })),
                                                ]}
                                                onChange={value => updateFilterRow(group.id, row.id, { field: value as SplitFilterFieldKey })}
                                            />

                                            {row.field && (
                                                <SplitFilterSelect
                                                    value={row.op}
                                                    placeholder="Choose condition"
                                                    options={ops.map(option => ({ value: option.op, label: option.label }))}
                                                    onChange={value => updateFilterRow(group.id, row.id, { op: value as SplitFilterOp })}
                                                />
                                            )}

                                            {(field?.type === 'text' || field?.type === 'number') && (
                                                <input
                                                    value={row.value}
                                                    onChange={event => updateFilterRow(group.id, row.id, { value: event.target.value })}
                                                    type={field.type === 'number' ? 'number' : 'text'}
                                                    placeholder="Enter value..."
                                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500"
                                                />
                                            )}

                                            {field?.type === 'select' && (
                                                <SplitSearchSelect
                                                    value={row.value}
                                                    placeholder={`Select ${field.label.toLowerCase()}`}
                                                    options={options}
                                                    onChange={option => updateFilterRow(group.id, row.id, { value: option.value, displayValue: option.label })}
                                                />
                                            )}

                                            {field?.type === 'date-range' && (
                                                <SimpleDateRangePicker value={row.dateRange} onChange={range => updateFilterRow(group.id, row.id, { dateRange: range, value: range ? `${range.start}-${range.end}` : '' })} placeholder="Date Range" />
                                            )}

                                            {field?.type === 'null-check' && (
                                                <div className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-400">
                                                    No value needed
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                <button onClick={() => addFilterRow(group.id)} className="w-full py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-black text-slate-500 hover:text-slate-900 hover:border-slate-300 transition-all">
                                    Add AND Condition
                                </button>
                            </div>
                        ))}

                        <button onClick={() => setFilterGroups(current => [...current, makeSplitFilterGroup()])} className="w-full py-3 rounded-2xl border border-dashed border-slate-300 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 hover:border-slate-400 transition-all">
                            Add OR Group
                        </button>
                    </div>

                    <div className="px-5 py-4 border-t border-slate-100 grid grid-cols-2 gap-3">
                        <button onClick={clearAllFilters} className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-red-500 hover:bg-red-50 border border-red-100 hover:border-red-200 transition-all">
                            <X className="w-3.5 h-3.5" />
                            Clear
                        </button>
                        <button onClick={() => setIsAdvancedFilterOpen(false)} className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black text-white bg-slate-900 hover:bg-slate-800 transition-all">
                            Apply
                        </button>
                    </div>
                </aside>
            </>
        )}

        {selectedSplit && (
            <SplitDetailsDrawer 
                split={selectedSplit} 
                onClose={() => setSelectedSplit(null)} 
            />
        )}
    </div>
  );
};
