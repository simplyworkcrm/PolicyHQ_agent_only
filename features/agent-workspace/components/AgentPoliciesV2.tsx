import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Lock,
  Unlock,
  Loader2,
  AlertCircle,
  FileText,
  X,
  Filter,
  Calendar,
  DollarSign,
  User,
  Tag,
  MapPin,
  ArrowRight,
  Send,
  CheckCheck,
  TrendingUp,
  Zap,
  Activity,
  AlertTriangle,
} from 'lucide-react';
import {
  agentPoliciesV2Api,
  PolicyV2,
  PoliciesV2Response,
  PoliciesV2Stats,
  PolicySortField,
  SortDirection,
} from '../services/agentPoliciesV2Api';
import { useAgentContext } from '../context/AgentContext';

// ── Date Range Picker ─────────────────────────────────────────────────────────

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAY_LABELS  = ['Su','Mo','Tu','We','Th','Fr','Sa'];

interface DateRangePickerProps {
  startDate: number | undefined;
  endDate: number | undefined;
  onChange: (start: number | undefined, end: number | undefined) => void;
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({ startDate, endDate, onChange }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<'start' | 'end'>('start');
  const [hoverTs, setHoverTs] = useState<number | null>(null);

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getUTCFullYear());
  const [viewMonth, setViewMonth] = useState(today.getUTCMonth());

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const firstDayOfWeek = new Date(Date.UTC(viewYear, viewMonth, 1)).getUTCDay();
  const daysInMonth    = new Date(Date.UTC(viewYear, viewMonth + 1, 0)).getUTCDate();

  const fmtLabel = (ts: number) => {
    const d = new Date(ts);
    return `${MONTH_SHORT[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
  };

  const handleDayClick = (dayTs: number) => {
    if (phase === 'start') {
      onChange(dayTs, undefined);
      setPhase('end');
    } else {
      if (startDate !== undefined && dayTs < startDate) {
        // clicked before start — set as new start, wait for end
        onChange(dayTs, undefined);
        setPhase('end');
      } else {
        // end of day UTC
        onChange(startDate, dayTs + 86_400_000 - 1);
        setPhase('start');
        setOpen(false);
      }
    }
  };

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(undefined, undefined);
    setPhase('start');
  };

  const isActive = !!(startDate || endDate);

  const triggerLabel = startDate && endDate
    ? `${fmtLabel(startDate)} → ${fmtLabel(endDate)}`
    : startDate
    ? `${fmtLabel(startDate)} → …`
    : 'Date Range';

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen(o => !o); if (!open) setPhase(startDate && !endDate ? 'end' : 'start'); }}
        className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-semibold border transition-all whitespace-nowrap ${
          isActive
            ? 'bg-slate-900 text-white border-slate-900'
            : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-100'
        }`}
      >
        <Calendar className="w-4 h-4 shrink-0" />
        <span>{triggerLabel}</span>
        {isActive && (
          <span onClick={clear} className="ml-0.5 opacity-60 hover:opacity-100 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 z-[200] bg-white rounded-2xl border border-slate-200 shadow-xl p-4 w-72">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-3">
            <button onClick={prevMonth} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-slate-100 text-slate-500 transition">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <p className="text-sm font-bold text-slate-800">{MONTH_NAMES[viewMonth]} {viewYear}</p>
            <button onClick={nextMonth} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-slate-100 text-slate-500 transition">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Phase hint */}
          <p className="text-[10px] font-bold uppercase tracking-wider text-center text-slate-400 mb-3">
            {phase === 'start' ? 'Pick start date' : 'Pick end date'}
          </p>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAY_LABELS.map(d => (
              <div key={d} className="text-center text-[10px] font-bold text-slate-400 py-1">{d}</div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`pad${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day    = i + 1;
              const dayTs  = Date.UTC(viewYear, viewMonth, day);        // midnight UTC
              const dayEnd = dayTs + 86_400_000 - 1;                    // end of day UTC

              const isStart = startDate !== undefined && dayTs === startDate;
              const isEnd   = endDate   !== undefined && dayTs <= endDate && dayEnd >= endDate;

              const rangeEnd = phase === 'end' && hoverTs !== null ? hoverTs : endDate;
              const inRange  = startDate !== undefined && rangeEnd !== undefined
                && dayTs > startDate && dayTs < rangeEnd;

              return (
                <button
                  key={day}
                  onClick={() => handleDayClick(dayTs)}
                  onMouseEnter={() => setHoverTs(dayTs)}
                  onMouseLeave={() => setHoverTs(null)}
                  className={[
                    'h-8 w-full text-xs font-semibold rounded-lg transition-colors',
                    isStart || isEnd ? 'bg-slate-900 text-white' : '',
                    inRange ? 'bg-slate-100 text-slate-700' : '',
                    !isStart && !isEnd && !inRange ? 'text-slate-700 hover:bg-slate-100' : '',
                  ].join(' ')}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          {isActive && (
            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={clear}
                className="text-xs font-semibold text-slate-400 hover:text-slate-700 transition"
              >
                Clear dates
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  Approved:                 { bg: 'bg-emerald-50',  text: 'text-emerald-700',  dot: 'bg-emerald-500' },
  Underwriting:             { bg: 'bg-sky-50',      text: 'text-sky-700',      dot: 'bg-sky-500' },
  'Cancelled Before Draft': { bg: 'bg-red-50',      text: 'text-red-600',      dot: 'bg-red-500' },
  Declined:                 { bg: 'bg-rose-50',     text: 'text-rose-700',     dot: 'bg-rose-500' },
  'Not Taken':              { bg: 'bg-slate-100',   text: 'text-slate-500',    dot: 'bg-slate-400' },
};

const PAID_STYLES: Record<string, { bg: string; text: string }> = {
  Paid:    { bg: 'bg-green-50',  text: 'text-green-700' },
  Unpaid:  { bg: 'bg-amber-50',  text: 'text-amber-700' },
  'N/A':   { bg: 'bg-slate-50',  text: 'text-slate-400' },
};

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

const fmtDate = (s: string) => {
  if (!s) return '—';
  const [y, m, d] = s.split('-');
  return `${m}/${d}/${y}`;
};

const fmtTs = (ts: number) => {
  const d = new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// ── Sort header button ────────────────────────────────────────────────────────

const SortBtn: React.FC<{
  field: PolicySortField;
  current: PolicySortField;
  dir: SortDirection;
  onSort: (f: PolicySortField) => void;
  children: React.ReactNode;
  className?: string;
}> = ({ field, current, dir, onSort, children, className = '' }) => (
  <button
    onClick={() => onSort(field)}
    className={`group flex items-center gap-1 text-left font-semibold text-xs uppercase tracking-wider text-slate-400 hover:text-slate-700 transition-colors ${className}`}
  >
    {children}
    <span className="shrink-0 ml-0.5">
      {current === field ? (
        dir === 'asc'
          ? <ChevronUp className="w-3 h-3 text-brand-500" />
          : <ChevronDown className="w-3 h-3 text-brand-500" />
      ) : (
        <ChevronDown className="w-3 h-3 opacity-0 group-hover:opacity-40 transition-opacity" />
      )}
    </span>
  </button>
);

// ── Status badge ──────────────────────────────────────────────────────────────

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const s = STATUS_STYLES[status] ?? { bg: 'bg-slate-100', text: 'text-slate-500', dot: 'bg-slate-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
      {status}
    </span>
  );
};

const PaidBadge: React.FC<{ paid: string | null }> = ({ paid }) => {
  if (!paid) return <span className="text-xs text-slate-300">—</span>;
  const s = PAID_STYLES[paid] ?? { bg: 'bg-slate-50', text: 'text-slate-400' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${s.bg} ${s.text}`}>
      {paid}
    </span>
  );
};

// ── Pagination ────────────────────────────────────────────────────────────────

const Pagination: React.FC<{
  cur: number;
  next: number | null;
  prev: number | null;
  total?: number;
  pageTotal?: number;
  received: number;
  perPage: number;
  offset: number;
  onPage: (p: number) => void;
}> = ({ cur, next, prev, total, pageTotal, received, perPage, offset, onPage }) => {
  const showing = received > 0 ? `${offset + 1}–${offset + received}` : '0';
  const ofTotal = total ? ` of ${total.toLocaleString()}` : '';
  const pages = pageTotal ?? (next ? cur + 1 : cur);

  // Show window of ±2 pages
  const window = Array.from({ length: pages }, (_, i) => i + 1).filter(
    p => p === 1 || p === pages || Math.abs(p - cur) <= 2
  );

  // Insert ellipsis markers
  const items: (number | '…')[] = [];
  window.forEach((p, i) => {
    if (i > 0 && p - window[i - 1] > 1) items.push('…');
    items.push(p);
  });

  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
      <p className="text-xs text-slate-400 font-medium">
        Showing <span className="text-slate-700 font-semibold">{showing}</span>{ofTotal}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => prev && onPage(prev)}
          disabled={!prev}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        {items.map((item, i) =>
          item === '…' ? (
            <span key={`ellipsis-${i}`} className="w-8 text-center text-xs text-slate-400">…</span>
          ) : (
            <button
              key={item}
              onClick={() => onPage(item)}
              className={`w-8 h-8 rounded-xl text-xs font-bold transition-all ${
                item === cur
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {item}
            </button>
          )
        )}
        <button
          onClick={() => next && onPage(next)}
          disabled={!next}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

const STATUS_OPTIONS = ['Approved', 'Underwriting', 'Cancelled Before Draft', 'Declined', 'Not Taken'];
const PAID_OPTIONS = ['Paid', 'Unpaid', 'N/A'];
const PER_PAGE_OPTIONS = [10, 25, 50, 100];

export const AgentPoliciesV2: React.FC = () => {
  const { currentAgentId } = useAgentContext();
  const navigate = useNavigate();

  // ── State ──
  const [data, setData] = useState<PoliciesV2Response | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);

  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [sortField, setSortField] = useState<PolicySortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');

  const [statusFilter, setStatusFilter] = useState('');
  const [paidFilter, setPaidFilter] = useState('');
  const [lockedFilter, setLockedFilter] = useState<boolean | undefined>(undefined);
  const [startDate, setStartDate] = useState<number | undefined>(undefined);
  const [endDate, setEndDate] = useState<number | undefined>(undefined);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<PolicyV2 | null>(null);

  // ── Stats (refetch only on dateRange / agent change) ──
  const [stats, setStats] = useState<PoliciesV2Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  useEffect(() => {
    if (!currentAgentId) return;
    setStatsLoading(true);
    agentPoliciesV2Api.getStats(currentAgentId, startDate, endDate)
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setStatsLoading(false));
  }, [currentAgentId, startDate, endDate]);

  // ── Debounce search ──
  useEffect(() => {
    const t = window.setTimeout(() => {
      setPage(1);
      setSearchTerm(searchInput.trim());
    }, 300);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  // ── Fetch ──
  const load = useCallback(async () => {
    if (!currentAgentId) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await agentPoliciesV2Api.getPolicies({
        agentId: currentAgentId,
        page,
        perPage,
        search: searchTerm || undefined,
        sort: { field: sortField, dir: sortDir },
        statusFilter: statusFilter || undefined,
        paidFilter: paidFilter || undefined,
        lockedFilter,
        startDate,
        endDate,
      });
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load policies');
    } finally {
      setIsLoading(false);
    }
  }, [currentAgentId, page, perPage, searchTerm, sortField, sortDir, statusFilter, paidFilter, lockedFilter, startDate, endDate]);

  useEffect(() => { load(); }, [load]);

  // ── Sort handler ──
  const handleSort = (field: PolicySortField) => {
    if (field === sortField) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir(field === 'created_at' ? 'desc' : 'asc');
    }
    setPage(1);
  };

  // ── Filter change helpers ──
  const handleStatusFilter = (v: string) => { setStatusFilter(v); setPage(1); };
  const handlePaidFilter = (v: string) => { setPaidFilter(v); setPage(1); };
  const clearFilters = () => { setStatusFilter(''); setPaidFilter(''); setLockedFilter(undefined); setStartDate(undefined); setEndDate(undefined); setPage(1); };
  const activeFilters = [statusFilter, paidFilter].filter(Boolean).length + (lockedFilter !== undefined ? 1 : 0) + (startDate !== undefined ? 1 : 0);

  const items = data?.items ?? [];

  return (
    <div className="animate-in fade-in duration-300">

      {/* ── Dev notice ───────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-5 px-4 py-3 rounded-2xl border border-violet-200/60 bg-white/50 backdrop-blur-sm">
        <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
          <Zap className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-black text-violet-700">Policies V2 — Under Active Development</p>
          <p className="text-[11px] text-slate-400 font-medium">More features coming soon — advanced filters, bulk actions, export, and more.</p>
        </div>
        <span className="shrink-0 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg text-violet-600" style={{ background: 'rgba(124,58,237,0.08)' }}>Beta</span>
      </div>

      {/* ── KPI Row ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Overview</p>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-slate-400">by created date</span>
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onChange={(s, e) => { setStartDate(s); setEndDate(e); setPage(1); }}
          />
        </div>
      </div>
      <div className="grid grid-cols-6 gap-4 mb-6">
        {(() => {
          const placementRatio = stats && stats.submittedPolicies > 0
            ? (stats.issued_placed / stats.submittedPolicies) * 100
            : 0;
          const persistency = stats && stats.issued_placed > 0
            ? (stats.active_inForce / stats.issued_placed) * 100
            : 0;
          return ([
            {
              label: 'Submitted',
              value: stats?.submittedPolicies ?? 0,
              sub: fmtCurrency(stats?.submittedPolicies_premium ?? 0),
              icon: <Send className="w-20 h-20" />,
              iconColor: 'text-sky-400/20',
            },
            {
              label: 'Issued / Placed',
              value: stats?.issued_placed ?? 0,
              sub: fmtCurrency(stats?.issued_placed_premium ?? 0),
              icon: <CheckCheck className="w-20 h-20" />,
              iconColor: 'text-emerald-400/20',
            },
            {
              label: 'Placement Ratio',
              value: `${placementRatio.toFixed(1)}%`,
              sub: `${stats?.issued_placed ?? 0} of ${stats?.submittedPolicies ?? 0}`,
              isPercent: true,
              icon: <TrendingUp className="w-20 h-20" />,
              iconColor: 'text-violet-400/25',
            },
            {
              label: 'Active In Force',
              value: stats?.active_inForce ?? 0,
              sub: fmtCurrency(stats?.active_inForce_premium ?? 0),
              icon: <Zap className="w-20 h-20" />,
              iconColor: 'text-indigo-400/20',
            },
            {
              label: 'Persistency',
              value: `${persistency.toFixed(1)}%`,
              sub: `${stats?.active_inForce ?? 0} of ${stats?.issued_placed ?? 0} issued`,
              isPercent: true,
              icon: <Activity className="w-20 h-20" />,
              iconColor: 'text-violet-400/25',
            },
            {
              label: 'Need Attention',
              value: stats?.need_attention ?? 0,
              sub: fmtCurrency(stats?.need_attention_premium ?? 0),
              alert: true,
              icon: <AlertTriangle className="w-20 h-20" />,
              iconColor: 'text-amber-400/30',
            },
          ] as { label: string; value: number | string; sub: string; isPercent?: boolean; alert?: boolean; icon: React.ReactNode; iconColor: string }[]).map(({ label, value, sub, isPercent, alert, icon, iconColor }) => {
            const isAlertActive = alert && (stats?.need_attention ?? 0) > 0;
            return (
              <div key={label} className={`
                relative overflow-hidden rounded-2xl px-5 py-4 border shadow-sm backdrop-blur-sm
                ${isAlertActive
                  ? 'bg-gradient-to-br from-amber-50/90 to-orange-50/70 border-amber-200/60'
                  : isPercent
                  ? 'bg-gradient-to-br from-white/80 to-violet-50/60 border-violet-100/60'
                  : 'bg-white/70 border-white/60'}
              `}>
                {/* Background icon */}
                <div className={`absolute -bottom-3 -right-3 ${iconColor} rotate-[-15deg] pointer-events-none select-none`}>
                  {icon}
                </div>
                {/* subtle inner glow */}
                <div className={`absolute inset-0 rounded-2xl opacity-40 ${isAlertActive ? 'bg-gradient-to-br from-amber-200/30 to-transparent' : isPercent ? 'bg-gradient-to-br from-violet-200/20 to-transparent' : 'bg-gradient-to-br from-white/60 to-transparent'}`} />
                <div className="relative">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p>
                  <p className={`text-2xl font-black leading-none ${isAlertActive ? 'text-amber-600' : isPercent ? 'text-violet-700' : 'text-slate-900'}`}>
                    {statsLoading ? '—' : value}
                  </p>
                  <p className="text-[11px] text-slate-400 font-medium mt-1">{statsLoading ? '—' : sub}</p>
                </div>
              </div>
            );
          });
        })()}
      </div>

      {/* ── Table + Detail Panel Row ───────────────────────────────────── */}
      <div className={`flex gap-4 items-start transition-all duration-300`}>

      {/* Table card */}
      <div className="flex-1 min-w-0 bg-white/80 backdrop-blur-sm rounded-3xl border border-white/60 shadow-lg shadow-slate-200/50 overflow-hidden">

        {/* Toolbar */}
        <div className="px-6 py-4 flex items-center justify-between gap-3 border-b border-slate-100/80 bg-gradient-to-r from-slate-50/60 to-white/40">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="Search client, policy #, carrier…"
                className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/20 transition-all"
              />
              {searchInput && (
                <button onClick={() => setSearchInput('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter toggle — disabled, coming soon */}
            <div className="relative group">
              <button
                disabled
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-semibold border bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed opacity-60 select-none"
              >
                <Filter className="w-3.5 h-3.5" />
                Filters
              </button>
              {/* Tooltip */}
              <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                <div className="bg-slate-900 text-white text-[11px] font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap shadow-lg">
                  Feature coming soon
                  <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900 rotate-45 rounded-sm" />
                </div>
              </div>
            </div>

            {/* Locked segmented control */}
            <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-0.5">
              {([
                { label: 'All',      value: undefined },
                { label: 'Unlocked', value: false },
                { label: 'Locked',   value: true },
              ] as { label: string; value: boolean | undefined }[]).map(({ label, value }) => {
                const active = lockedFilter === value;
                return (
                  <button
                    key={label}
                    onClick={() => { setLockedFilter(value); setPage(1); }}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      active
                        ? 'bg-white text-slate-800 shadow-sm'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Per page */}
            <select
              value={perPage}
              onChange={e => { setPerPage(Number(e.target.value)); setPage(1); }}
              className="text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-brand-400 cursor-pointer"
            >
              {PER_PAGE_OPTIONS.map(n => (
                <option key={n} value={n}>{n} / page</option>
              ))}
            </select>

            {/* Refresh */}
            <button
              onClick={load}
              disabled={isLoading}
              className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-white hover:border-slate-300 transition-all disabled:opacity-40"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* No inline filter bar — replaced by side dock below */}

        {/* Table header */}
        <div className="px-6 py-3 grid grid-cols-[2fr_1.2fr_1.5fr_1fr_1fr_1fr_1fr_1fr] gap-3 bg-slate-50/70 border-b border-slate-100">
          <SortBtn field="client" current={sortField} dir={sortDir} onSort={handleSort}>Client</SortBtn>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Policy #</span>
          <SortBtn field="carrier" current={sortField} dir={sortDir} onSort={handleSort}>Carrier / Product</SortBtn>
          <SortBtn field="initial_draft_date" current={sortField} dir={sortDir} onSort={handleSort}>Draft Date</SortBtn>
          <SortBtn field="annual_premium" current={sortField} dir={sortDir} onSort={handleSort} className="justify-end">Premium</SortBtn>
          <SortBtn field="status" current={sortField} dir={sortDir} onSort={handleSort}>Status</SortBtn>
          <SortBtn field="paid_status" current={sortField} dir={sortDir} onSort={handleSort}>Paid</SortBtn>
          <SortBtn field="source_name" current={sortField} dir={sortDir} onSort={handleSort}>Source</SortBtn>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-24 gap-3 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm font-medium">Loading policies…</span>
          </div>
        )}

        {/* Error */}
        {error && !isLoading && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-400" />
            </div>
            <p className="text-sm font-bold text-slate-700">Failed to load policies</p>
            <p className="text-xs text-slate-400 max-w-xs text-center">{error}</p>
            <button onClick={load} className="mt-1 px-4 py-2 text-xs font-bold rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-colors">
              Retry
            </button>
          </div>
        )}

        {/* Empty */}
        {!isLoading && !error && items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-600">No policies found</p>
            {(searchTerm || activeFilters > 0) && (
              <p className="text-xs">Try adjusting your search or filters</p>
            )}
          </div>
        )}

        {/* Rows */}
        {!isLoading && !error && items.length > 0 && (
          <div>
            {items.map((policy, idx) => {
              const isSelected = selectedPolicy?.policy_id === policy.policy_id;
              return (
              <div
                key={policy.policy_id}
                onClick={() => setSelectedPolicy(isSelected ? null : policy)}
                className={`px-6 py-4 grid grid-cols-[2fr_1.2fr_1.5fr_1fr_1fr_1fr_1fr_1fr] gap-3 items-center border-b border-slate-50 transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 text-white'
                    : idx % 2 === 0 ? 'hover:bg-slate-50/60' : 'bg-slate-50/20 hover:bg-slate-50/60'
                }`}
              >
                {/* Client */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="shrink-0">
                    {policy.isLocked
                      ? <Lock className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-300' : 'text-amber-400'}`} />
                      : <Unlock className={`w-3.5 h-3.5 ${isSelected ? 'text-white/40' : 'text-slate-300'}`} />
                    }
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold truncate ${isSelected ? 'text-white' : 'text-slate-800'}`}>{policy.client}</p>
                    <p className={`text-[11px] font-medium truncate ${isSelected ? 'text-white/60' : 'text-slate-400'}`}>{policy.agent_name}</p>
                  </div>
                </div>

                {/* Policy # */}
                <p className={`text-xs font-mono truncate ${isSelected ? 'text-white/70' : 'text-slate-500'}`}>{policy.policy_number ?? '—'}</p>

                {/* Carrier / Product */}
                <div className="min-w-0">
                  <p className={`text-xs font-semibold truncate ${isSelected ? 'text-white' : 'text-slate-700'}`}>{policy.carrier}</p>
                  <p className={`text-[11px] truncate ${isSelected ? 'text-white/60' : 'text-slate-400'}`}>{policy.carrier_product}</p>
                </div>

                {/* Draft Date */}
                <p className={`text-xs font-medium ${isSelected ? 'text-white/80' : 'text-slate-500'}`}>{fmtDate(policy.initial_draft_date)}</p>

                {/* Premium */}
                <p className={`text-sm font-bold text-right tabular-nums ${isSelected ? 'text-white' : 'text-slate-800'}`}>{fmtCurrency(policy.annual_premium)}</p>

                {/* Status */}
                <div>{isSelected
                  ? <span className="text-[11px] font-bold text-white/90">{policy.status}</span>
                  : <StatusBadge status={policy.status} />}
                </div>

                {/* Paid */}
                <div>{isSelected
                  ? <span className={`text-[11px] font-bold ${policy.paid_status === 'Paid' ? 'text-green-300' : policy.paid_status === 'Unpaid' ? 'text-amber-300' : 'text-white/50'}`}>{policy.paid_status ?? '—'}</span>
                  : <PaidBadge paid={policy.paid_status} />}
                </div>

                {/* Source */}
                <p className={`text-[11px] font-medium truncate ${isSelected ? 'text-white/60' : 'text-slate-400'}`}>{policy.source_name}</p>
              </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {!isLoading && !error && data && (data.nextPage || data.prevPage || data.curPage > 1) && (
          <Pagination
            cur={data.curPage}
            next={data.nextPage}
            prev={data.prevPage}
            total={data.itemsTotal}
            pageTotal={data.pageTotal}
            received={data.itemsReceived}
            perPage={perPage}
            offset={data.offset}
            onPage={p => setPage(p)}
          />
        )}
      </div>{/* end table card */}

        {/* ── Policy Detail Panel ──────────────────────────────────────── */}
        <div className={`shrink-0 transition-all duration-300 ease-in-out overflow-hidden ${
          selectedPolicy ? 'w-72 opacity-100' : 'w-0 opacity-0 pointer-events-none'
        }`}>
          {selectedPolicy && (
            <div className="w-72 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              {/* Panel header */}
              <div className="bg-slate-900 px-5 py-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/50">Selected Policy</p>
                  <button
                    onClick={() => setSelectedPolicy(null)}
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-lg font-black text-white leading-tight">{selectedPolicy.client}</p>
                <p className="text-[11px] text-white/50 font-medium mt-0.5">{selectedPolicy.carrier_product}</p>
                {selectedPolicy.policy_number && (
                  <div className="mt-3">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-white/10 text-white text-[11px] font-bold font-mono">
                      {selectedPolicy.policy_number}
                    </span>
                  </div>
                )}
              </div>

              {/* Premium highlight */}
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Annual Premium</p>
                  <p className="text-2xl font-black text-slate-900">{fmtCurrency(selectedPolicy.annual_premium)}</p>
                </div>
                <div className="text-right">
                  <StatusBadge status={selectedPolicy.status} />
                  <div className="mt-1.5"><PaidBadge paid={selectedPolicy.paid_status} /></div>
                </div>
              </div>

              {/* Detail rows */}
              <div className="px-5 py-4 space-y-3">
                {[
                  { icon: <User className="w-3.5 h-3.5" />, label: 'Agent', value: selectedPolicy.agent_name },
                  { icon: <Tag className="w-3.5 h-3.5" />, label: 'Carrier', value: selectedPolicy.carrier },
                  { icon: <Calendar className="w-3.5 h-3.5" />, label: 'Draft Date', value: fmtDate(selectedPolicy.initial_draft_date) },
                  { icon: <Calendar className="w-3.5 h-3.5" />, label: 'Submitted', value: fmtTs(selectedPolicy.created_at) },
                  { icon: <MapPin className="w-3.5 h-3.5" />, label: 'Source', value: selectedPolicy.source_name },
                ].map(({ icon, label, value }) => (
                  <div key={label} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                      {icon}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
                      <p className="text-xs font-semibold text-slate-700 truncate">{value}</p>
                    </div>
                  </div>
                ))}

                {/* Locked status */}
                <div className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                    selectedPolicy.isLocked ? 'bg-amber-50' : 'bg-slate-100'
                  }`}>
                    {selectedPolicy.isLocked
                      ? <Lock className="w-3.5 h-3.5 text-amber-500" />
                      : <Unlock className="w-3.5 h-3.5 text-slate-400" />}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Lock Status</p>
                    <p className={`text-xs font-bold ${
                      selectedPolicy.isLocked ? 'text-amber-600' : 'text-slate-500'
                    }`}>{selectedPolicy.isLocked ? 'Locked' : 'Unlocked'}</p>
                  </div>
                </div>
              </div>

              {/* View Full Details button */}
              <div className="px-5 pb-5">
                <button
                  onClick={() => navigate('/policies/details', { state: { queue: [selectedPolicy.policy_id], startIndex: 0 } })}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-700 transition-colors"
                >
                  View Full Details
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

      </div>{/* end flex row */}

      {/* ── Filter Side Dock ───────────────────────────────────────────── */}
      {/* Backdrop */}
      {showFilters && (
        <div
          className="fixed inset-0 z-[110] bg-black/20 backdrop-blur-[1px]"
          onClick={() => setShowFilters(false)}
        />
      )}

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 z-[120] h-full w-80 bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
          showFilters ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Dock header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center">
              <Filter className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-black text-slate-900">Filters</p>
              {activeFilters > 0 && (
                <p className="text-[11px] text-slate-400 font-medium">{activeFilters} active</p>
              )}
            </div>
          </div>
          <button
            onClick={() => setShowFilters(false)}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter sections */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">

          {/* Status */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Policy Status</p>
            <div className="space-y-1.5">
              {(['', ...STATUS_OPTIONS] as string[]).map(opt => {
                const style = opt ? STATUS_STYLES[opt] : null;
                const isSelected = statusFilter === opt;
                return (
                  <button
                    key={opt || '__all__'}
                    onClick={() => handleStatusFilter(opt)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all border ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${style?.dot ?? 'bg-slate-300'}`} />
                    {opt || 'All Statuses'}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Paid Status */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Paid Status</p>
            <div className="space-y-1.5">
              {(['', ...PAID_OPTIONS] as string[]).map(opt => {
                const isSelected = paidFilter === opt;
                return (
                  <button
                    key={opt || '__all__'}
                    onClick={() => handlePaidFilter(opt)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all border ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${
                      opt === 'Paid' ? 'bg-green-500' :
                      opt === 'Unpaid' ? 'bg-amber-500' :
                      opt === 'N/A' ? 'bg-slate-300' :
                      'bg-slate-300'
                    }`} />
                    {opt || 'All Paid Statuses'}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Dock footer */}
        {activeFilters > 0 && (
          <div className="px-5 py-4 border-t border-slate-100">
            <button
              onClick={clearFilters}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-red-500 hover:bg-red-50 border border-red-100 hover:border-red-200 transition-all"
            >
              <X className="w-3.5 h-3.5" />
              Clear all filters
            </button>
          </div>
        )}
      </div>

    </div>
  );
};

export default AgentPoliciesV2;
