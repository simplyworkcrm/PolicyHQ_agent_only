import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  Check,
  TrendingUp,
  Zap,
  Activity,
  AlertTriangle,
  Info,
} from 'lucide-react';
import {
  agentPoliciesV2Api,
  PolicyV2,
  PoliciesV2Response,
  PolicyFilterOption,
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
        <div className="absolute top-full left-0 mt-2 z-[200] bg-white rounded-2xl border border-slate-200 shadow-xl p-4 w-72 max-w-[calc(100vw-3rem)]">
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
  onPerPage: (n: number) => void;
}> = ({ cur, next, prev, total, pageTotal, received, perPage, offset, onPage, onPerPage }) => {
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
      <div className="flex items-center gap-3">
        <p className="text-xs text-slate-400 font-medium">
          Showing <span className="text-slate-700 font-semibold">{showing}</span>{ofTotal}
        </p>
        <select
          value={perPage}
          onChange={e => onPerPage(Number(e.target.value))}
          className="text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-brand-400 cursor-pointer"
        >
          {PER_PAGE_OPTIONS.map(n => (
            <option key={n} value={n}>{n} / page</option>
          ))}
        </select>
      </div>
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
type PoliciesTimeframe = 'all' | 'today' | 'weekly' | 'monthly' | 'yearly' | 'custom';
const TIMEFRAME_OPTIONS: { label: string; value: PoliciesTimeframe }[] = [
  { label: 'All Time', value: 'all' },
  { label: 'Today', value: 'today' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Yearly', value: 'yearly' },
  { label: 'Custom', value: 'custom' },
];

const toRequestDate = (ts: number | undefined) => {
  if (ts === undefined) return null;
  const date = new Date(ts);
  return `${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}-${date.getUTCFullYear()}`;
};

const SORT_FIELD_TO_API: Partial<Record<PolicySortField, string>> = {
  client: 'client',
  policy_number: 'policy_number',
  carrier_product: 'carrier_product',
  carrier: 'ref_carrier_name',
  status: 'ref_policyStatus_name',
  annual_premium: 'annual_premium',
  created_at: 'created_at',
  initial_draft_date: 'initial_draft_date',
  source_name: 'ref_metacontactsource_name',
  paid_status: 'meta_policy_paidstatus_name',
};

type PolicySortConfig = { key: PolicySortField; direction: SortDirection };

const ALLOWED_POLICY_SORT_KEYS: PolicySortField[] = [
  'client',
  'created_at',
  'policy_number',
  'carrier_product',
  'initial_draft_date',
  'annual_premium',
];

const normalizePolicySortConfig = (sortConfig: any): PolicySortConfig | null => {
  if (
    !sortConfig ||
    !ALLOWED_POLICY_SORT_KEYS.includes(sortConfig.key) ||
    (sortConfig.direction !== 'asc' && sortConfig.direction !== 'desc')
  ) {
    return null;
  }

  return { key: sortConfig.key, direction: sortConfig.direction };
};

type PolicyFilterOp = '==' | '!=' | 'ilike' | 'not ilike' | 'between' | '>=' | '<=' | 'is null' | 'is not null';
type PolicyFilterFieldKey = 'client' | 'policy_number' | 'ref_agent_owner' | 'ref_carrier_id' | 'carrier_product' | 'ref_policyStatus_id' | 'meta_policy_paidstatus_id' | 'initial_draft_date' | 'isLocked';
type PolicyFilterFieldType = 'text' | 'remote-select' | 'boolean-select' | 'date-range' | 'null-check';

interface DateRange {
  start: number | null;
  end: number | null;
  label: string;
}

interface PolicyFilterField {
  key: PolicyFilterFieldKey;
  label: string;
  type: PolicyFilterFieldType;
}

interface PolicyFilterRow {
  id: string;
  field: PolicyFilterFieldKey | '';
  op: PolicyFilterOp;
  value: string;
  displayValue?: string;
  dateRange?: DateRange | null;
}

interface PolicyFilterGroup {
  id: string;
  rows: PolicyFilterRow[];
}

const POLICY_FILTER_FIELDS: PolicyFilterField[] = [
  { key: 'client', label: 'Client', type: 'text' },
  { key: 'policy_number', label: 'Policy Number', type: 'null-check' },
  { key: 'ref_agent_owner', label: 'Agent', type: 'remote-select' },
  { key: 'ref_carrier_id', label: 'Carrier', type: 'remote-select' },
  { key: 'carrier_product', label: 'Product', type: 'text' },
  { key: 'ref_policyStatus_id', label: 'Policy Status', type: 'remote-select' },
  { key: 'meta_policy_paidstatus_id', label: 'Paid Status', type: 'remote-select' },
  { key: 'isLocked', label: 'Lock Status', type: 'boolean-select' },
  { key: 'initial_draft_date', label: 'Effective Date', type: 'date-range' },
];

const TEXT_FILTER_OPS: Array<{ op: PolicyFilterOp; label: string }> = [
  { op: 'ilike', label: 'contains' },
  { op: 'not ilike', label: 'does not contain' },
  { op: '==', label: 'equals' },
  { op: '!=', label: 'does not equal' },
];

const EXACT_FILTER_OPS: Array<{ op: PolicyFilterOp; label: string }> = [
  { op: '==', label: 'equals' },
  { op: '!=', label: 'does not equal' },
];

const DATE_FILTER_OPS: Array<{ op: PolicyFilterOp; label: string }> = [
  { op: 'between', label: 'is between' },
];

const NULL_FILTER_OPS: Array<{ op: PolicyFilterOp; label: string }> = [
  { op: 'is null', label: 'is empty' },
  { op: 'is not null', label: 'is not empty' },
];

const LOCK_STATUS_OPTIONS: PolicyFilterOption[] = [
  { id: 'true', label: 'Locked' },
  { id: 'false', label: 'Unlocked' },
];


const makePolicyFilterRow = (): PolicyFilterRow => ({
  id: crypto.randomUUID(),
  field: '',
  op: 'ilike',
  value: '',
});

const makePolicyFilterGroup = (): PolicyFilterGroup => ({
  id: crypto.randomUUID(),
  rows: [makePolicyFilterRow()],
});

const makePresetPolicyFilterRow = (row: Omit<PolicyFilterRow, 'id'>): PolicyFilterRow => ({
  id: crypto.randomUUID(),
  ...row,
});

const getPolicyFilterField = (key: PolicyFilterFieldKey | '') => POLICY_FILTER_FIELDS.find(field => field.key === key);

const getPolicyFilterOps = (fieldKey: PolicyFilterFieldKey | '') => {
  const field = getPolicyFilterField(fieldKey);
  if (field?.type === 'date-range') return DATE_FILTER_OPS;
  if (field?.type === 'null-check') return NULL_FILTER_OPS;
  return field?.type === 'remote-select' || field?.type === 'boolean-select' ? EXACT_FILTER_OPS : TEXT_FILTER_OPS;
};

const isFilterRowComplete = (row: PolicyFilterRow) => {
  const field = getPolicyFilterField(row.field);
  if (!row.field) return false;
  if (field?.type === 'null-check') return row.op === 'is null' || row.op === 'is not null';
  if (field?.type === 'date-range') return row.dateRange?.start != null && row.dateRange?.end != null;
  return Boolean(row.value.trim());
};

const getPolicyFilterOperand = (row: PolicyFilterRow) => {
  const value = row.value.trim();
  return row.op === 'ilike' || row.op === 'not ilike' ? `%${value}%` : value;
};

const getCompleteFilterGroups = (groups: PolicyFilterGroup[]) => groups
  .map(group => ({
    ...group,
    rows: group.rows.filter(isFilterRowComplete),
  }))
  .filter(group => group.rows.length > 0);

const buildPolicyFilterStatements = (row: PolicyFilterRow) => {
  const field = getPolicyFilterField(row.field);

  if (field?.type === 'date-range' && row.dateRange?.start != null && row.dateRange?.end != null) {
    return [
      {
        or: false,
        type: 'statement',
        statement: {
          left: { tag: 'col', operand: 'initial_draft_date' },
          op: '>=',
          right: { operand: row.dateRange.start },
        },
      },
      {
        or: false,
        type: 'statement',
        statement: {
          left: { tag: 'col', operand: 'initial_draft_date' },
          op: '<=',
          right: { operand: row.dateRange.end },
        },
      },
    ];
  }

  if (field?.type === 'null-check') {
    return [{
      or: false,
      type: 'statement',
      statement: {
        left: { tag: 'col', operand: row.field },
        op: row.op === 'is null' ? '==' : '!=',
        right: { operand: null },
      },
    }];
  }

  if (field?.type === 'boolean-select') {
    return [{
      or: false,
      type: 'statement',
      statement: {
        left: { tag: 'col', operand: row.field },
        op: row.op,
        right: { operand: row.value === 'true' },
      },
    }];
  }

  return [{
    or: false,
    type: 'statement',
    statement: {
      left: { tag: 'col', operand: row.field },
      op: row.op,
      right: { operand: getPolicyFilterOperand(row) },
    },
  }];
};

const buildPolicyFilterExpression = (groups: PolicyFilterGroup[]): Record<string, unknown> => {
  const completeGroups = getCompleteFilterGroups(groups);
  if (completeGroups.length === 0) return { expression: [] };

  return {
    expression: completeGroups.map((group, groupIndex) => ({
      or: groupIndex > 0,
      type: 'group',
      group: {
        expression: group.rows.flatMap(buildPolicyFilterStatements),
      },
    })),
  };
};

const buildFilterExpression = (
  statusFilter: string,
  paidFilter: string,
  lockedFilter: boolean | undefined
): Record<string, unknown> | null => {
  const expression: unknown[] = [];

  if (statusFilter) {
    expression.push({
      or: false,
      type: 'statement',
      statement: {
        left: { tag: 'col', operand: 'ref_policyStatus_name' },
        op: '==',
        right: { operand: statusFilter },
      },
    });
  }

  if (paidFilter) {
    expression.push({
      or: false,
      type: 'statement',
      statement: {
        left: { tag: 'col', operand: 'meta_policy_paidstatus_name' },
        op: '==',
        right: { operand: paidFilter },
      },
    });
  }

  if (lockedFilter !== undefined) {
    expression.push({
      or: false,
      type: 'statement',
      statement: {
        left: { tag: 'col', operand: 'isLocked' },
        op: '==',
        right: { operand: lockedFilter },
      },
    });
  }

  return expression.length > 0 ? { expression } : null;
};

const PolicyDateRangeFilter: React.FC<{
  timeframe: PoliciesTimeframe;
  startDate: number | undefined;
  endDate: number | undefined;
  onTimeframeChange: (timeframe: PoliciesTimeframe) => void;
  onDateChange: (start: number | undefined, end: number | undefined) => void;
}> = ({ timeframe, startDate, endDate, onTimeframeChange, onDateChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = TIMEFRAME_OPTIONS.find(option => option.value === timeframe) || TIMEFRAME_OPTIONS[0];

  useEffect(() => {
    if (!open) return;
    const handle = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  const selectTimeframe = (next: PoliciesTimeframe) => {
    onTimeframeChange(next);
    if (next !== 'custom') setOpen(false);
  };

  return (
    <div className="relative flex items-center gap-4" ref={ref}>
      <div className="text-right">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Policy Date Range</p>
        <p className="text-[11px] font-semibold text-slate-500">Controls records loaded from the API</p>
      </div>
      <button
        onClick={() => setOpen(value => !value)}
        className="h-11 min-w-32 px-4 rounded-full bg-white border border-slate-100 shadow-sm flex items-center justify-between gap-3 text-sm font-black text-slate-800 hover:border-slate-200 transition-all"
      >
        <Calendar className="w-4 h-4 text-brand-500" />
        <span className="flex-1 text-left">{selected.label}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-3 z-[220] w-72 rounded-[1.35rem] bg-white border border-slate-100 shadow-2xl shadow-slate-300/50 overflow-hidden p-2">
          {TIMEFRAME_OPTIONS.filter(option => option.value !== 'custom').map(option => {
            const active = timeframe === option.value;
            return (
              <button
                key={option.value}
                onClick={() => selectTimeframe(option.value)}
                className={`w-full flex items-center justify-between px-5 py-3 rounded-xl text-sm font-black transition-all ${
                  active ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                <span>{option.label}</span>
                {active && <CheckCheck className="w-4 h-4 text-brand-500" />}
              </button>
            );
          })}
          <div className="h-px bg-slate-100 my-2" />
          <button
            onClick={() => selectTimeframe('custom')}
            className={`w-full flex items-center justify-between px-5 py-3 rounded-xl text-sm font-black transition-all ${
              timeframe === 'custom' ? 'bg-slate-900 text-white' : 'text-orange-600 hover:bg-orange-50'
            }`}
          >
            <span>Custom Range</span>
            <Calendar className="w-4 h-4 text-orange-500" />
          </button>
          {timeframe === 'custom' && (
            <div className="mt-2 px-2 pb-1 flex justify-end">
              <DateRangePicker startDate={startDate} endDate={endDate} onChange={onDateChange} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const StyledSelect: React.FC<{
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  placeholder?: string;
}> = ({ value, options, onChange, placeholder = 'Select' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find(option => option.value === value);

  useEffect(() => {
    if (!isOpen) return;
    const handle = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [isOpen]);

  return (
    <div ref={ref} className="relative min-w-0">
      <button
        type="button"
        onClick={() => setIsOpen(current => !current)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500"
      >
        <span className={`truncate ${selected ? 'text-slate-800' : 'text-slate-400'}`}>{selected?.label || placeholder}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="absolute z-[230] top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-[1.25rem] shadow-2xl shadow-slate-200/70 overflow-hidden p-1">
          {options.map(option => (
            <button
              key={option.value}
              type="button"
              onClick={() => { onChange(option.value); setIsOpen(false); }}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-left text-xs font-bold transition-all ${option.value === value ? 'bg-brand-50 text-brand-800' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
            >
              <span className="truncate">{option.label}</span>
              {option.value === value && <Check className="w-3.5 h-3.5 text-brand-500" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const QuickSearchFilterSelect: React.FC<{
  value: string;
  displayValue?: string;
  options: PolicyFilterOption[];
  placeholder: string;
  loading?: boolean;
  onChange: (option: PolicyFilterOption) => void;
}> = ({ value, displayValue, options, placeholder, loading, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const selectedOption = options.find(option => option.id === value);
  const selectedLabel = displayValue || selectedOption?.label || '';

  useEffect(() => {
    if (!isOpen) return;
    const handle = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [isOpen]);

  const filteredOptions = options.filter(option => option.label.toLowerCase().includes(search.toLowerCase())).slice(0, 50);

  return (
    <div ref={ref} className="relative min-w-0">
      <button
        type="button"
        disabled={loading}
        onClick={() => setIsOpen(current => !current)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 disabled:bg-slate-50 disabled:text-slate-400"
      >
        <span className={`truncate ${selectedLabel ? 'text-slate-800' : 'text-slate-400'}`}>{loading ? 'Loading options...' : selectedLabel || placeholder}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="absolute z-[240] top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-[1.25rem] shadow-2xl shadow-slate-200/70 overflow-hidden">
          <div className="p-2 border-b border-slate-50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Quick search..."
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500"
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto p-1">
            {filteredOptions.length > 0 ? filteredOptions.map(option => (
              <button
                key={option.id}
                type="button"
                onClick={() => { onChange(option); setSearch(''); setIsOpen(false); }}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-left text-xs font-bold transition-all ${option.id === value ? 'bg-brand-50 text-brand-800' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
              >
                <span className="truncate">{option.label}</span>
                {option.id === value && <Check className="w-3.5 h-3.5 text-brand-500" />}
              </button>
            )) : (
              <div className="py-5 text-center text-[10px] font-black text-slate-300 uppercase tracking-widest">No options found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const SortableTableHeader: React.FC<{
  label: string;
  options: Array<{ key: PolicySortField; label: string }>;
  sortConfig: PolicySortConfig | null;
  onSort: (key: PolicySortField) => void;
  onSelectSort: (key: PolicySortField) => void;
  onSetSort: (key: PolicySortField, direction: SortDirection) => void;
  className?: string;
}> = ({ label, options, sortConfig, onSort, onSelectSort, onSetSort, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const activeOption = options.find(option => option.key === sortConfig?.key) || options[0];
  const isActive = Boolean(sortConfig && options.some(option => option.key === sortConfig.key));
  const activeDirection = isActive ? sortConfig?.direction || 'asc' : 'asc';

  useEffect(() => {
    if (!isOpen) return;
    const handle = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [isOpen]);

  return (
    <div ref={ref} className={`relative inline-flex min-w-0 ${className}`}>
      <button
        type="button"
        onClick={() => { if (options.length > 1) setIsOpen(current => !current); else onSort(activeOption.key); }}
        className={`min-w-0 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider hover:text-slate-900 transition-colors ${isActive ? 'text-slate-900' : 'text-slate-400'}`}
      >
        <span className="truncate">{label}</span>
        <ChevronDown className={`w-3.5 h-3.5 ${isActive ? 'text-brand-500' : 'text-slate-300'}`} />
        {isActive && <span className="text-[9px] text-brand-600">{sortConfig?.direction === 'asc' ? 'ASC' : 'DESC'}</span>}
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-52 rounded-2xl border border-slate-100 bg-white p-2 shadow-2xl shadow-slate-200/70 z-[80]">
          <div className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-300">Sort by</div>
          <div className="space-y-2">
            <StyledSelect
              value={activeOption.key}
              options={options.map(option => ({ value: option.key, label: option.label }))}
              onChange={value => { onSelectSort(value as PolicySortField); onSetSort(value as PolicySortField, activeDirection); }}
            />
            <StyledSelect
              value={activeDirection}
              options={[{ value: 'asc', label: 'Ascending' }, { value: 'desc', label: 'Descending' }]}
              onChange={value => onSetSort(activeOption.key, value as SortDirection)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

interface AgentPoliciesV2Props {
  agentIdsOverride?: string[];
  headingTitle?: string;
  headingSubtitle?: string;
  variant?: 'default' | 'downline';
  readOnlyRows?: boolean;
}

export const AgentPoliciesV2: React.FC<AgentPoliciesV2Props> = ({
  agentIdsOverride,
  headingTitle = 'Policy Records',
  headingSubtitle = 'Review policies across your selected workspace access.',
  variant = 'default',
  readOnlyRows = false,
}) => {
  const { currentAgentId, selectedAgentIds, subAgents, viewingAgentName } = useAgentContext();
  const navigate = useNavigate();

  // ── State ──
  const [data, setData] = useState<PoliciesV2Response | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);

  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [sortConfig, setSortConfig] = useState<PolicySortConfig | null>(normalizePolicySortConfig({ key: 'created_at', direction: 'desc' }));
  const [filterGroups, setFilterGroups] = useState<PolicyFilterGroup[]>([makePolicyFilterGroup()]);
  const [carrierOptions, setCarrierOptions] = useState<PolicyFilterOption[]>([]);
  const [policyStatusOptions, setPolicyStatusOptions] = useState<PolicyFilterOption[]>([]);
  const [paidStatusOptions, setPaidStatusOptions] = useState<PolicyFilterOption[]>([]);
  const [filterOptionsLoading, setFilterOptionsLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [timeframe, setTimeframe] = useState<PoliciesTimeframe>('all');
  const [startDate, setStartDate] = useState<number | undefined>(undefined);
  const [endDate, setEndDate] = useState<number | undefined>(undefined);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<PolicyV2 | null>(null);
  const effectiveAgentIds = useMemo(
    () => (agentIdsOverride && agentIdsOverride.length > 0 ? agentIdsOverride : selectedAgentIds).filter(Boolean),
    [agentIdsOverride, selectedAgentIds],
  );

  const agentOptions = useMemo<PolicyFilterOption[]>(() => {
    const options = effectiveAgentIds.map(agentId => {
      const subAgent = subAgents.find(agent => agent.agentId === agentId);
      return {
        id: agentId,
        label: subAgent?.name || (agentId === currentAgentId ? viewingAgentName : agentId),
      };
    });
    return options.filter((option, index, all) => all.findIndex(item => item.id === option.id) === index);
  }, [effectiveAgentIds, subAgents, currentAgentId, viewingAgentName]);

  useEffect(() => {
    let cancelled = false;
    setFilterOptionsLoading(true);
    Promise.all([
      agentPoliciesV2Api.getCarrierOptions(),
      agentPoliciesV2Api.getPolicyStatusOptions(),
      agentPoliciesV2Api.getPolicyPaidStatusOptions(),
    ])
      .then(([carriers, statuses, paidStatuses]) => {
        if (cancelled) return;
        setCarrierOptions(carriers);
        setPolicyStatusOptions(statuses);
        setPaidStatusOptions(paidStatuses);
      })
      .catch(() => {
        if (cancelled) return;
        setCarrierOptions([]);
        setPolicyStatusOptions([]);
        setPaidStatusOptions([]);
      })
      .finally(() => {
        if (!cancelled) setFilterOptionsLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

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
    const agentIds = effectiveAgentIds;
    if (agentIds.length === 0) return;
    if (timeframe === 'custom' && (startDate === undefined || endDate === undefined)) {
      setData(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await agentPoliciesV2Api.getPolicies({
        agentIds,
        page,
        perPage,
        search: searchTerm,
        sort: sortConfig ? { [SORT_FIELD_TO_API[sortConfig.key] || sortConfig.key]: sortConfig.direction } : {},
        filter: buildPolicyFilterExpression(filterGroups),
        timeframe: timeframe === 'all' ? null : timeframe,
        startDate: timeframe === 'custom' ? toRequestDate(startDate) : null,
        endDate: timeframe === 'custom' ? toRequestDate(endDate) : null,
      });
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load policies');
    } finally {
      setIsLoading(false);
    }
  }, [effectiveAgentIds, page, perPage, searchTerm, sortConfig, filterGroups, timeframe, startDate, endDate]);

  useEffect(() => { load(); }, [load]);

  const handleTimeframeChange = (next: PoliciesTimeframe) => {
    setTimeframe(next);
    setPage(1);
  };

  // ── Sort handler ──
  const handleSort = (field: PolicySortField) => {
    setSortConfig(current => ({
      key: field,
      direction: current?.key === field && current.direction === 'asc' ? 'desc' : 'asc',
    }));
    setPage(1);
  };

  const handleSelectSortField = (field: PolicySortField) => {
    setSortConfig(current => ({
      key: field,
      direction: current?.key === field ? current.direction : 'asc',
    }));
    setPage(1);
  };

  const handleSetSort = (field: PolicySortField, direction: SortDirection) => {
    setSortConfig({ key: field, direction });
    setPage(1);
  };

  // ── Filter change helpers ──
  const clearFilters = () => { setFilterGroups([makePolicyFilterGroup()]); setPage(1); };
  const activeFilters = getCompleteFilterGroups(filterGroups).reduce((total, group) => total + group.rows.length, 0);

  const items = data?.items ?? [];
  const stats = data?.policy_stats ?? null;
  const statsLoading = false;
  const isPageSelected = items.length > 0 && items.every(policy => selectedIds.has(policy.selectionKey));
  const isDownlineVariant = variant === 'downline';
  const tableGridClass = readOnlyRows
    ? 'grid-cols-[2fr_1.2fr_1.5fr_1fr_1fr_1fr_1fr_1fr]'
    : 'grid-cols-[36px_2fr_1.2fr_1.5fr_1fr_1fr_1fr_1fr_1fr]';

  const getRemoteOptions = (fieldKey: PolicyFilterFieldKey | '') => {
    if (fieldKey === 'ref_agent_owner') return agentOptions;
    if (fieldKey === 'ref_carrier_id') return carrierOptions;
    if (fieldKey === 'ref_policyStatus_id') return policyStatusOptions;
    if (fieldKey === 'meta_policy_paidstatus_id') return paidStatusOptions;
    if (fieldKey === 'isLocked') return LOCK_STATUS_OPTIONS;
    return [];
  };

  const updateFilterRow = (groupId: string, rowId: string, updates: Partial<PolicyFilterRow>) => {
    setFilterGroups(current => current.map(group => group.id !== groupId ? group : {
      ...group,
      rows: group.rows.map(row => row.id !== rowId ? row : { ...row, ...updates }),
    }));
  };

  const addFilterRow = (groupId: string) => {
    setFilterGroups(current => current.map(group => group.id !== groupId ? group : {
      ...group,
      rows: [...group.rows, makePolicyFilterRow()],
    }));
  };

  const removeFilterRow = (groupId: string, rowId: string) => {
    setFilterGroups(current => current.map(group => group.id !== groupId ? group : {
      ...group,
      rows: group.rows.length > 1 ? group.rows.filter(row => row.id !== rowId) : [makePolicyFilterRow()],
    }));
  };

  const duplicateFilterGroup = (group: PolicyFilterGroup) => {
    setFilterGroups(current => [
      ...current,
      {
        id: crypto.randomUUID(),
        rows: group.rows.map(row => ({ ...row, id: crypto.randomUUID() })),
      },
    ]);
  };

  const removeFilterGroup = (groupId: string) => {
    setFilterGroups(current => current.length > 1 ? current.filter(group => group.id !== groupId) : [makePolicyFilterGroup()]);
  };

  const applyFilters = () => {
    setPage(1);
    setShowFilters(false);
  };

  const findOptionByLabel = (options: PolicyFilterOption[], labels: string[]) => {
    const normalizedLabels = labels.map(label => label.toLowerCase());
    return options.find(option => normalizedLabels.includes(option.label.toLowerCase()));
  };

  const applyIssuedPlacedFilter = () => {
    const issuedPlacedStatuses = ['Approved', 'Funding Pending', 'Issued']
      .map(label => findOptionByLabel(policyStatusOptions, [label]))
      .filter((option): option is PolicyFilterOption => Boolean(option));

    if (issuedPlacedStatuses.length === 0) return;

    setFilterGroups(issuedPlacedStatuses.map(option => ({
      id: crypto.randomUUID(),
      rows: [makePresetPolicyFilterRow({
        field: 'ref_policyStatus_id',
        op: '==',
        value: option.id,
        displayValue: option.label,
      })],
    })));
    setSearchInput('');
    setSearchTerm('');
    setSelectedPolicy(null);
    setPage(1);
    setShowFilters(false);
  };

  const applyActiveInForceFilter = () => {
    const funded = findOptionByLabel(policyStatusOptions, ['Funded']);
    const approved = findOptionByLabel(policyStatusOptions, ['Approved']);
    const paid = findOptionByLabel(paidStatusOptions, ['Paid']);
    const groups: PolicyFilterGroup[] = [];

    if (funded) {
      groups.push({
        id: crypto.randomUUID(),
        rows: [makePresetPolicyFilterRow({
          field: 'ref_policyStatus_id',
          op: '==',
          value: funded.id,
          displayValue: funded.label,
        })],
      });
    }

    if (approved && paid) {
      groups.push({
        id: crypto.randomUUID(),
        rows: [
          makePresetPolicyFilterRow({
            field: 'ref_policyStatus_id',
            op: '==',
            value: approved.id,
            displayValue: approved.label,
          }),
          makePresetPolicyFilterRow({
            field: 'meta_policy_paidstatus_id',
            op: '==',
            value: paid.id,
            displayValue: paid.label,
          }),
        ],
      });
    }

    if (groups.length === 0) return;

    setFilterGroups(groups);
    setSearchInput('');
    setSearchTerm('');
    setSelectedPolicy(null);
    setPage(1);
    setShowFilters(false);
  };

  const applySubmittedFilter = () => {
    clearFilters();
    setSelectedPolicy(null);
    setShowFilters(false);
  };

  const applyNeedAttentionFilter = () => {
    const attentionStatuses = [
      'Cancelled before Draft',
      'Follow Up',
      'Declined',
      'Lapsed Pending',
      'Lapsed',
      'Not Taken',
      'Chargeback',
    ]
      .map(label => findOptionByLabel(policyStatusOptions, [label]))
      .filter((option): option is PolicyFilterOption => Boolean(option));
    const paidStatusNa = findOptionByLabel(paidStatusOptions, ['N/A', 'NA']);
    const groups: PolicyFilterGroup[] = attentionStatuses.map(option => ({
      id: crypto.randomUUID(),
      rows: [makePresetPolicyFilterRow({
        field: 'ref_policyStatus_id',
        op: '==',
        value: option.id,
        displayValue: option.label,
      })],
    }));

    if (paidStatusNa) {
      groups.push({
        id: crypto.randomUUID(),
        rows: [makePresetPolicyFilterRow({
          field: 'meta_policy_paidstatus_id',
          op: '==',
          value: paidStatusNa.id,
          displayValue: paidStatusNa.label,
        })],
      });
    }

    if (groups.length === 0) return;

    setFilterGroups(groups);
    setSearchInput('');
    setSearchTerm('');
    setSelectedPolicy(null);
    setPage(1);
    setShowFilters(false);
  };

  return (
    <div className={`animate-in fade-in duration-300 ${isDownlineVariant ? 'rounded-[2rem] border border-amber-100/80 bg-[#fffaf0] p-5 shadow-inner shadow-amber-900/5' : ''}`}>

      {/* ── Dev notice ───────────────────────────────────────────────────── */}
      <div className={`flex flex-col lg:flex-row lg:items-center justify-between gap-5 mb-6 ${isDownlineVariant ? 'rounded-[1.5rem] border border-white bg-white/80 px-5 py-4 shadow-sm' : ''}`}>
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl ${isDownlineVariant ? 'bg-[#d49b17] text-slate-950 shadow-amber-900/10' : 'bg-slate-900 text-white shadow-slate-900/10'}`}>
            <FileText className="w-5 h-5" />
          </div>
          <div>
            {isDownlineVariant && (
              <p className="mb-1 text-[9px] font-black uppercase tracking-[0.28em] text-amber-700">Scoped Agent Production</p>
            )}
            <h2 className={`${isDownlineVariant ? 'text-2xl' : 'text-3xl'} font-black tracking-tight text-slate-900`}>{headingTitle}</h2>
            <p className="text-sm font-bold text-slate-500">{headingSubtitle}</p>
          </div>
        </div>
        <div className="hidden">
          <p className="text-xs font-black text-violet-700">Policies V2 — Under Active Development</p>
          <p className="text-[11px] text-slate-400 font-medium">More features coming soon — advanced filters, bulk actions, export, and more.</p>
        </div>
        <span className="hidden">Beta</span>
        <PolicyDateRangeFilter
          timeframe={timeframe}
          startDate={startDate}
          endDate={endDate}
          onTimeframeChange={handleTimeframeChange}
          onDateChange={(s, e) => { setStartDate(s); setEndDate(e); setPage(1); }}
        />
      </div>

      {/* ── KPI Row ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Overview</p>
      </div>
      <div className={`grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6 ${isDownlineVariant ? 'px-1' : ''}`}>
        {(() => {
          const placementRatio = stats && stats.submittedPolicies > 0
            ? (stats.issued_placed / stats.submittedPolicies) * 100
            : 0;
          const persistencyBase = stats
            ? (stats.active_inForce ?? 0) + (stats.failed_inforce ?? 0)
            : 0;
          const persistency = stats && persistencyBase > 0
            ? (stats.active_inForce / persistencyBase) * 100
            : 0;
          return ([
            {
              label: 'Submitted',
              value: stats?.submittedPolicies ?? 0,
              sub: fmtCurrency(stats?.submittedPolicies_premium ?? 0),
              description: 'Total number of applications submitted in the selected time frame. This includes all policies that have been started and sent in.',
              icon: <Send className="w-5 h-5" />,
              tone: 'dark',
              onClick: applySubmittedFilter,
            },
            {
              label: 'Issued / Placed',
              value: stats?.issued_placed ?? 0,
              sub: fmtCurrency(stats?.issued_placed_premium ?? 0),
              description: 'Policies that have been approved by the carrier and officially issued. This is the point where the application has passed underwriting.',
              icon: <CheckCheck className="w-5 h-5" />,
              tone: 'gold',
              onClick: applyIssuedPlacedFilter,
            },
            {
              label: 'Placement Ratio',
              value: `${placementRatio.toFixed(1)}%`,
              sub: `${stats?.issued_placed ?? 0} of ${stats?.submittedPolicies ?? 0}`,
              isPercent: true,
              description: 'The percentage of submitted applications that were successfully issued and placed. It measures how many submissions moved forward to approval.',
              icon: <TrendingUp className="w-5 h-5" />,
              tone: 'white',
            },
            {
              label: 'Active In Force',
              value: stats?.active_inForce ?? 0,
              sub: fmtCurrency(stats?.active_inForce_premium ?? 0),
              description: 'Number of policies that are currently active and being paid. These are in-force policies with ongoing premium payments.',
              icon: <Zap className="w-5 h-5" />,
              tone: 'white',
              onClick: applyActiveInForceFilter,
            },
            {
              label: 'Persistency',
              value: `${persistency.toFixed(1)}%`,
              sub: `${stats?.active_inForce ?? 0} of ${persistencyBase} paid`,
              isPercent: true,
              description: 'The percentage of paid policies that remain active over time. It shows how many policies stayed in force after their initial payment.',
              icon: <Activity className="w-5 h-5" />,
              tone: 'gold-soft',
            },
            {
              label: 'Need Attention',
              value: stats?.need_attention ?? 0,
              sub: fmtCurrency(stats?.need_attention_premium ?? 0),
              description: 'Policies that require follow-up. This could be due to missed payments, pending tasks, or policies at risk of lapsing.',
              alert: true,
              icon: <AlertTriangle className="w-5 h-5" />,
              tone: 'alert',
              onClick: applyNeedAttentionFilter,
            },
          ] as { label: string; value: number | string; sub: string; description: string; alert?: boolean; icon: React.ReactNode; tone: 'dark' | 'gold' | 'gold-soft' | 'white' | 'alert'; onClick?: () => void }[]).map(({ label, value, sub, description, alert, icon, tone, onClick }) => {
            const isAlertActive = alert && (stats?.need_attention ?? 0) > 0;
            const isDark = tone === 'dark';
            const isGold = tone === 'gold' || tone === 'gold-soft' || (tone === 'alert' && isAlertActive);
            const cardClass = isDark
              ? 'bg-slate-950 border-slate-950 text-white shadow-xl shadow-slate-900/15'
              : tone === 'gold'
              ? 'bg-[#d49b17] border-[#d49b17] text-slate-950 shadow-xl shadow-amber-900/10'
              : isAlertActive
              ? 'bg-amber-50 border-[#d49b17] text-slate-950 shadow-xl shadow-amber-900/10'
              : 'bg-white border-white/80 text-slate-950 shadow-sm';
            const labelClass = isDark ? 'text-white/45' : isGold ? 'text-slate-950/55' : 'text-slate-400';
            const subClass = isDark ? 'text-white/55' : isGold ? 'text-slate-950/65' : 'text-slate-500';
            const iconClass = isDark
              ? 'bg-[#d49b17] text-slate-950'
              : isGold
              ? 'bg-slate-950 text-white'
              : 'bg-slate-950 text-[#d49b17]';
            return (
              <button
                key={label}
                type="button"
                onClick={onClick}
                aria-disabled={!onClick}
                className={`group relative overflow-visible rounded-2xl border px-4 py-4 text-left ${cardClass} ${onClick ? 'cursor-pointer transition-all hover:-translate-y-0.5 hover:z-50 hover:shadow-2xl focus:z-50 focus:outline-none focus:ring-4 focus:ring-brand-500/15' : 'cursor-default hover:z-50 focus:z-50 focus:outline-none'}`}
              >
                <div className={`absolute left-0 top-0 h-full w-1.5 ${isDark ? 'bg-[#d49b17]' : isGold ? 'bg-slate-950' : 'bg-[#d49b17]'}`} />
                <div className="relative flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mb-2 flex items-center gap-1.5">
                      <p className={`text-[10px] font-black uppercase tracking-widest ${labelClass}`}>{label}</p>
                      <div className="relative shrink-0">
                        <span
                          aria-label={`About ${label}`}
                          className={`inline-flex rounded-full transition-colors ${isDark ? 'text-white/35 group-hover:text-white/60' : isGold ? 'text-slate-950/45 group-hover:text-slate-950/70' : 'text-slate-300 group-hover:text-slate-500'}`}
                        >
                          <Info className="w-3.5 h-3.5" />
                        </span>
                        <div className={`pointer-events-none absolute left-0 top-full z-[80] mt-2 w-64 rounded-2xl border px-3 py-2 text-[11px] font-semibold normal-case tracking-normal shadow-xl opacity-0 translate-y-1 transition-all duration-150 group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:translate-y-0 ${isDark ? 'border-slate-200 bg-white text-slate-700' : 'border-slate-900 bg-slate-950 text-white'}`}>
                          {description}
                        </div>
                      </div>
                    </div>
                    <p className={`text-2xl font-black leading-none tracking-tight ${isAlertActive ? 'text-[#9a5c00]' : isDark ? 'text-white' : 'text-slate-950'}`}>
                      {statsLoading ? 'â€”' : value}
                    </p>
                    <p className={`text-[11px] font-bold mt-2 truncate ${subClass}`}>{statsLoading ? 'â€”' : sub}</p>
                  </div>
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${iconClass}`}>
                    {icon}
                  </div>
                </div>
                <div className={`absolute bottom-0 right-0 h-10 w-16 border-t border-l rounded-tl-[2rem] ${isDark ? 'border-white/10' : 'border-slate-950/5'}`} />
                <div className="hidden">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p>
                  <p className={`text-2xl font-black leading-none ${isAlertActive ? 'text-amber-600' : 'text-slate-900'}`}>
                    {statsLoading ? '—' : value}
                  </p>
                  <p className="text-[11px] text-slate-400 font-medium mt-1">{statsLoading ? '—' : sub}</p>
                </div>
              </button>
            );
          });
        })()}
      </div>

      {/* ── Table + Detail Panel Row ───────────────────────────────────── */}
      <div className={`flex gap-4 items-start transition-all duration-300`}>

      {/* Table card */}
      <div className={`flex-1 min-w-0 bg-white border shadow-sm overflow-hidden relative min-h-[600px] flex flex-col ${isDownlineVariant ? 'rounded-[1.75rem] border-amber-100' : 'rounded-[2.5rem] border-slate-100'}`}>

        <div className="p-5 border-b border-slate-50 flex flex-col xl:flex-row xl:items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-brand-50 rounded-2xl text-brand-600 border border-brand-100 shadow-sm">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">Policy Records</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                {(data?.itemsTotal ?? items.length).toLocaleString()} records matching current view
              </p>
            </div>
          </div>
          <div className="flex flex-col lg:flex-row lg:items-center gap-3 flex-1 min-w-0 xl:max-w-4xl">
            <div className="relative flex-1 min-w-60 group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none group-focus-within:text-brand-500 transition-colors" />
              <input
                type="text"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="Search client, policy #, carrier..."
                className="w-full pl-11 pr-3 py-4 text-sm rounded-2xl bg-slate-50 border border-slate-100 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all font-bold"
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
                onClick={() => setShowFilters(true)}
                className={`flex items-center gap-3 px-5 py-4 rounded-2xl border text-xs font-black uppercase tracking-widest transition-all ${
                  activeFilters > 0
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xl shadow-slate-900/10'
                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Filter className="w-4 h-4" />
                Advanced Filter
                {activeFilters > 0 && (
                  <span className="min-w-6 h-6 px-2 rounded-full bg-brand-500 text-slate-900 flex items-center justify-center text-[10px] font-black">
                    {activeFilters}
                  </span>
                )}
              </button>
            </div>

            {(searchTerm || activeFilters > 0) && (
              <button
                onClick={() => { setSearchInput(''); setSearchTerm(''); clearFilters(); }}
                className="px-5 py-4 rounded-2xl bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 text-xs font-black uppercase tracking-widest transition-all"
              >
                Reset View
              </button>
            )}
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
        <div className={`px-6 py-3 grid ${tableGridClass} gap-3 bg-slate-50/70 border-b border-slate-100 items-center`}>
          {!readOnlyRows && (
            <button
              type="button"
              onClick={() => {
                setSelectedIds(current => {
                  const next = new Set(current);
                  if (isPageSelected) items.forEach(policy => next.delete(policy.selectionKey));
                  else items.forEach(policy => next.add(policy.selectionKey));
                  return next;
                });
              }}
              className={`w-5 h-5 rounded border transition-all flex items-center justify-center ${isPageSelected ? 'bg-brand-500 border-brand-500 text-white' : 'border-slate-300 bg-white hover:border-brand-300'}`}
            >
              {isPageSelected && <Check className="w-3.5 h-3.5" />}
            </button>
          )}
          <SortableTableHeader label="Client & Created" options={[{ key: 'client', label: 'Client' }, { key: 'created_at', label: 'Created' }]} sortConfig={sortConfig} onSort={handleSort} onSelectSort={handleSelectSortField} onSetSort={handleSetSort} />
          <SortableTableHeader label="Policy Number" options={[{ key: 'policy_number', label: 'Policy #' }]} sortConfig={sortConfig} onSort={handleSort} onSelectSort={handleSelectSortField} onSetSort={handleSetSort} />
          <SortableTableHeader label="Carrier / Product" options={[{ key: 'carrier_product', label: 'Product' }]} sortConfig={sortConfig} onSort={handleSort} onSelectSort={handleSelectSortField} onSetSort={handleSetSort} />
          <SortableTableHeader label="Effective Date" options={[{ key: 'initial_draft_date', label: 'Eff. Date' }]} sortConfig={sortConfig} onSort={handleSort} onSelectSort={handleSelectSortField} onSetSort={handleSetSort} />
          <SortableTableHeader label="Premium" options={[{ key: 'annual_premium', label: 'Premium' }]} sortConfig={sortConfig} onSort={handleSort} onSelectSort={handleSelectSortField} onSetSort={handleSetSort} className="justify-end" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Status</span>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Paid</span>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Source</span>
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
              const isChecked = selectedIds.has(policy.selectionKey);
              return (
              <div
                key={policy.policy_id}
                onClick={() => {
                  if (!readOnlyRows) setSelectedPolicy(isSelected ? null : policy);
                }}
                className={`px-6 py-4 grid ${tableGridClass} gap-3 items-center border-b border-slate-50 transition-colors ${
                  readOnlyRows
                    ? (idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/20')
                    : isSelected
                    ? 'bg-slate-900 text-white'
                    : idx % 2 === 0 ? 'hover:bg-slate-50/60' : 'bg-slate-50/20 hover:bg-slate-50/60'
                } ${readOnlyRows ? 'cursor-default' : 'cursor-pointer'}`}
              >
                {!readOnlyRows && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedIds(current => {
                        const next = new Set(current);
                        if (next.has(policy.selectionKey)) next.delete(policy.selectionKey);
                        else next.add(policy.selectionKey);
                        return next;
                      });
                    }}
                    className={`w-5 h-5 rounded border transition-all flex items-center justify-center ${isChecked ? 'bg-brand-500 border-brand-500 text-white' : 'border-slate-300 bg-white hover:border-brand-300'}`}
                  >
                    {isChecked && <Check className="w-3.5 h-3.5" />}
                  </button>
                )}

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
        {!isLoading && !error && data && (
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
            onPerPage={n => { setPerPage(n); setPage(1); }}
          />
        )}
      </div>{/* end table card */}

        {/* ── Policy Detail Panel ──────────────────────────────────────── */}
        {!readOnlyRows && (
        <div className={`shrink-0 transition-all duration-300 ease-in-out overflow-hidden ${
          selectedPolicy ? 'w-1/3 min-w-96 max-w-[32rem] opacity-100' : 'w-0 opacity-0 pointer-events-none'
        }`}>
          {selectedPolicy && (
            <div className="w-full bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
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
        )}

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
        className={`fixed top-0 right-0 z-[120] h-full w-96 max-w-[calc(100vw-2rem)] bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
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

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
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
                const field = getPolicyFilterField(row.field);
                const ops = getPolicyFilterOps(row.field);
                return (
                  <div key={row.id} className="rounded-2xl bg-white border border-slate-100 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">{rowIndex === 0 ? 'Where' : 'And'}</span>
                      <button onClick={() => removeFilterRow(group.id, row.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <StyledSelect
                      value={row.field}
                      placeholder="Choose field"
                      options={POLICY_FILTER_FIELDS.map(option => ({ value: option.key, label: option.label }))}
                      onChange={value => {
                        const nextField = value as PolicyFilterFieldKey;
                        const nextOps = getPolicyFilterOps(nextField);
                        updateFilterRow(group.id, row.id, {
                          field: nextField,
                          op: nextOps[0]?.op || '==',
                          value: '',
                          displayValue: '',
                          dateRange: null,
                        });
                      }}
                    />

                    {row.field && (
                      <StyledSelect
                        value={row.op}
                        options={ops.map(option => ({ value: option.op, label: option.label }))}
                        onChange={value => updateFilterRow(group.id, row.id, { op: value as PolicyFilterOp })}
                      />
                    )}

                    {field?.type === 'text' && (
                      <input
                        value={row.value}
                        onChange={event => updateFilterRow(group.id, row.id, { value: event.target.value })}
                        placeholder="Enter value..."
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500"
                      />
                    )}

                    {(field?.type === 'remote-select' || field?.type === 'boolean-select') && (
                      <QuickSearchFilterSelect
                        value={row.value}
                        displayValue={row.displayValue}
                        options={getRemoteOptions(row.field)}
                        loading={filterOptionsLoading}
                        placeholder={`Select ${field.label.toLowerCase()}`}
                        onChange={option => updateFilterRow(group.id, row.id, { value: option.id, displayValue: option.label })}
                      />
                    )}

                    {field?.type === 'date-range' && (
                      <DateRangePicker
                        startDate={row.dateRange?.start ?? undefined}
                        endDate={row.dateRange?.end ?? undefined}
                        onChange={(start, end) => updateFilterRow(group.id, row.id, {
                          value: start && end ? `${start}-${end}` : '',
                          dateRange: {
                            start: start ?? null,
                            end: end ?? null,
                            label: start && end ? `${fmtTs(start)} - ${fmtTs(end)}` : 'Custom Range',
                          },
                        })}
                      />
                    )}
                  </div>
                );
              })}

              <button onClick={() => addFilterRow(group.id)} className="w-full py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-black text-slate-500 hover:text-slate-900 hover:border-slate-300 transition-all">
                Add AND Condition
              </button>
            </div>
          ))}

          <button onClick={() => setFilterGroups(current => [...current, makePolicyFilterGroup()])} className="w-full py-3 rounded-2xl border border-dashed border-slate-300 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 hover:border-slate-400 transition-all">
            Add OR Group
          </button>
        </div>

        <div className="px-5 py-4 border-t border-slate-100 grid grid-cols-2 gap-3">
          <button
            onClick={clearFilters}
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-red-500 hover:bg-red-50 border border-red-100 hover:border-red-200 transition-all"
          >
            <X className="w-3.5 h-3.5" />
            Clear
          </button>
          <button
            onClick={applyFilters}
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black text-white bg-slate-900 hover:bg-slate-800 transition-all"
          >
            Apply
          </button>
        </div>
      </div>

    </div>
  );
};

export default AgentPoliciesV2;
