import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Phone,
  Loader2,
  RefreshCw,
  AlertCircle,
  PhoneIncoming,
  CheckCircle,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Users,
  BarChart3,
  Search,
  TrendingUp,
  CreditCard,
} from 'lucide-react';
import {
  callReportCallxApi,
  CallxCallEntry,
  getCurrentWeekStart,
  toDateStr,
} from '../services/callReportCallxApi';

// ── Date Range Picker ─────────────────────────────────────────────────────────

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_LABELS = ['Su','Mo','Tu','We','Th','Fr','Sa'];

const fmtDisplay = (dateStr: string): string => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${MONTHS[m - 1].slice(0, 3)} ${d}, ${y}`;
};

const fmtShort = (dateStr: string): string => {
  const [, m, d] = dateStr.split('-').map(Number);
  return `${MONTHS[m - 1].slice(0, 3)} ${d}`;
};

const dateStrFromParts = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

const DateRangePicker: React.FC<{
  startDate: string;
  endDate: string;
  onChange: (start: string, end: string) => void;
}> = ({ startDate, endDate, onChange }) => {
  const [open, setOpen] = useState(false);
  const [tempStart, setTempStart] = useState(startDate);
  const [tempEnd, setTempEnd] = useState(endDate);
  const [selecting, setSelecting] = useState<'start' | 'end'>('start');
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const [viewYear, setViewYear] = useState(() => parseInt(startDate.split('-')[0]));
  const [viewMonth, setViewMonth] = useState(() => parseInt(startDate.split('-')[1]) - 1);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const todayStr = toDateStr(new Date());

  const handleDayClick = (d: string) => {
    if (selecting === 'start' || d < tempStart) {
      setTempStart(d); setTempEnd(d); setSelecting('end');
    } else {
      setTempEnd(d); setSelecting('start');
    }
  };

  const effectiveEnd = selecting === 'end' && hoverDate && hoverDate >= tempStart ? hoverDate : tempEnd;
  const inRange = (d: string) => d > tempStart && d < effectiveEnd;

  const applyPreset = (s: string, e: string) => {
    setTempStart(s); setTempEnd(e); setSelecting('start');
    const [y, m] = s.split('-').map(Number);
    setViewYear(y); setViewMonth(m - 1);
  };

  const now = new Date();
  const wkStart = toDateStr(getCurrentWeekStart());
  const wkEnd = (() => { const d = new Date(getCurrentWeekStart()); d.setDate(d.getDate() + 6); return toDateStr(d); })();
  const mtdStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const ytdStart = `${now.getFullYear()}-01-01`;

  const presets = [
    { label: 'This Week', s: wkStart, e: wkEnd },
    { label: 'MTD', s: mtdStart, e: todayStr },
    { label: 'YTD', s: ytdStart, e: todayStr },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setTempStart(startDate); setTempEnd(endDate); setSelecting('start'); setOpen(o => !o); }}
        className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-700 hover:border-brand-300 hover:shadow-md transition-all group"
      >
        <Calendar className="w-3.5 h-3.5 text-brand-500 shrink-0" />
        <span className="text-slate-900">{fmtShort(startDate)}</span>
        <span className="text-slate-300 font-normal">–</span>
        <span className="text-slate-900">{fmtShort(endDate)}</span>
        <ChevronDown className={`w-3 h-3 text-slate-400 ml-0.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 bg-white rounded-3xl shadow-2xl shadow-slate-900/10 border border-slate-100 p-5 w-72">
          <div className="flex gap-1.5 mb-4">
            {presets.map(p => (
              <button
                key={p.label}
                onClick={() => applyPreset(p.s, p.e)}
                className={`flex-1 py-1.5 rounded-xl text-[10px] font-bold transition-all ${
                  tempStart === p.s && tempEnd === p.e
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between mb-3">
            <button onClick={prevMonth} className="w-7 h-7 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
              <ChevronLeft className="w-3.5 h-3.5 text-slate-600" />
            </button>
            <span className="text-sm font-black text-slate-900">{MONTHS[viewMonth]} {viewYear}</span>
            <button onClick={nextMonth} className="w-7 h-7 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            </button>
          </div>

          <div className="grid grid-cols-7 mb-1">
            {DAY_LABELS.map(d => (
              <div key={d} className="text-center text-[10px] font-black text-slate-400 py-0.5">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-0.5">
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const d = dateStrFromParts(viewYear, viewMonth, day);
              const isStart = d === tempStart;
              const isEnd = d === tempEnd || (selecting === 'end' && hoverDate === d && d >= tempStart);
              const inR = inRange(d);
              const isToday = d === todayStr;
              return (
                <button
                  key={day}
                  onClick={() => handleDayClick(d)}
                  onMouseEnter={() => { if (selecting === 'end') setHoverDate(d); }}
                  onMouseLeave={() => setHoverDate(null)}
                  className={[
                    'h-8 w-full text-xs font-bold transition-all',
                    isStart || isEnd ? 'bg-slate-900 text-white rounded-xl shadow-md shadow-slate-900/20 z-10 relative' : '',
                    inR && !isStart && !isEnd ? 'bg-brand-500/10 text-brand-700' : '',
                    !isStart && !isEnd && !inR ? 'text-slate-600 hover:bg-slate-100 rounded-xl' : '',
                    isToday && !isStart && !isEnd ? 'ring-1 ring-inset ring-brand-400 rounded-xl' : '',
                  ].filter(Boolean).join(' ')}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold text-slate-400 truncate">
              {fmtDisplay(tempStart)} – {fmtDisplay(tempEnd)}
            </span>
            <button
              onClick={() => { onChange(tempStart, tempEnd); setOpen(false); }}
              className="shrink-0 px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-colors"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const AVATAR_COLORS = [
  'bg-violet-900/40 text-violet-300',
  'bg-sky-900/40 text-sky-300',
  'bg-emerald-900/40 text-emerald-300',
  'bg-amber-900/40 text-amber-300',
  'bg-rose-900/40 text-rose-300',
  'bg-indigo-900/40 text-indigo-300',
  'bg-teal-900/40 text-teal-300',
  'bg-orange-900/40 text-orange-300',
];

const AgentAvatar = ({ name, index }: { name: string; index: number }) => {
  const initials = name.trim().split(' ').filter(Boolean).map(w => w[0].toUpperCase()).slice(0, 2).join('');
  const color = AVATAR_COLORS[index % AVATAR_COLORS.length];
  return (
    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${color}`}>
      {initials}
    </div>
  );
};

const getDefaultDates = () => {
  const fri = getCurrentWeekStart();
  const thu = new Date(fri);
  thu.setDate(fri.getDate() + 6);
  return { start: toDateStr(fri), end: toDateStr(thu) };
};

export const CallReportCallx: React.FC = () => {
  const defaults = getDefaultDates();
  const [startDate, setStartDate] = useState(defaults.start);
  const [endDate, setEndDate] = useState(defaults.end);
  const [entries, setEntries] = useState<CallxCallEntry[]>([]);
  const [agentSearch, setAgentSearch] = useState('');
  const [sortKey, setSortKey] = useState<'name' | 'calls_received' | 'valid_calls' | 'paid_calls' | 'submitted' | 'submitted_premium' | 'totalSpend' | 'scpa' | 'close' | 'roas'>('valid_calls');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async (s = startDate, e = endDate) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await callReportCallxApi.getCallReport(s, e);
      setEntries(data);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load call report');
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { load(startDate, endDate); }, []); // eslint-disable-line

  const handleDateChange = (s: string, e: string) => {
    setStartDate(s);
    setEndDate(e);
    load(s, e);
  };

  const totalCalls = entries.reduce((s, e) => s + (e.calls_received ?? 0), 0);
  const totalValid = entries.reduce((s, e) => s + (e.valid_calls ?? 0), 0);
  const totalPaid = entries.reduce((s, e) => s + (e.paid_calls ?? 0), 0);
  const totalSubmitted = entries.reduce((s, e) => s + (e.submitted ?? 0), 0);
  const totalSpend = entries.reduce((s, e) => s + (e.totalSpend ?? 0), 0);
  const totalSubmittedPremium = entries.reduce((s, e) => s + (e.submitted_premium ?? 0), 0);

  return (
    <div className="animate-in fade-in duration-300 -mx-6 -mt-4 -mb-12">
      <div style={{ background: 'linear-gradient(160deg, #0e0e1c 0%, #08080f 100%)', minHeight: '100%' }} className="px-8 pt-7 pb-16">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2.5 mb-0.5">
                <h1 className="text-2xl font-black text-white tracking-tight">Activity Dashboard</h1>
                <span
                  className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg"
                  style={{ background: 'rgba(249,115,22,0.15)', color: '#fb923c', border: '1px solid rgba(249,115,22,0.2)' }}
                >
                  CallX
                </span>
              </div>
              <p className="text-xs font-medium mt-0.5" style={{ color: '#4b5563' }}>
                {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Loading data...'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: '#374151' }}>UTC</span>
            <DateRangePicker startDate={startDate} endDate={endDate} onChange={handleDateChange} />
            <button
              onClick={() => load(startDate, endDate)}
              disabled={isLoading}
              className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all disabled:opacity-40"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: '#6b7280' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.1)'; (e.currentTarget as HTMLButtonElement).style.color = '#fff'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLButtonElement).style.color = '#6b7280'; }}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* ── KPI Pills ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-6 gap-3 mb-8">
          {/* Cost / Call */}
          <div className="rounded-2xl px-4 py-3.5 flex items-center gap-3" style={{ background: '#b45309', boxShadow: '0 8px 28px rgba(180,83,9,0.4)' }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(0,0,0,0.2)' }}>
              <Phone className="w-4 h-4 text-amber-100" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-widest leading-none mb-1 text-amber-200">Cost / Call</p>
              <p className="text-base font-black text-white leading-none">
                {totalCalls > 0 && totalSpend > 0 ? `$${(totalSpend / totalCalls).toFixed(2)}` : '—'}
              </p>
            </div>
          </div>
          {/* SCPA */}
          <div className="rounded-2xl px-4 py-3.5 flex items-center gap-3" style={{ background: '#7c3aed', boxShadow: '0 8px 28px rgba(124,58,237,0.45)' }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(0,0,0,0.2)' }}>
              <BarChart3 className="w-4 h-4 text-purple-100" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-widest leading-none mb-1 text-purple-200">SCPA</p>
              <p className="text-base font-black text-white leading-none">
                {totalSubmitted > 0 && totalSpend > 0 ? `$${(totalSpend / totalSubmitted).toFixed(2)}` : '—'}
              </p>
            </div>
          </div>
          {/* ROAS */}
          <div className="rounded-2xl px-4 py-3.5 flex items-center gap-3" style={{ background: '#059669', boxShadow: '0 8px 28px rgba(5,150,105,0.45)' }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(0,0,0,0.2)' }}>
              <TrendingUp className="w-4 h-4 text-emerald-100" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-widest leading-none mb-1 text-emerald-200">ROAS</p>
              <p className="text-base font-black text-white leading-none">
                {totalSpend > 0 ? `${(totalSubmittedPremium / totalSpend).toFixed(2)}×` : '—'}
              </p>
            </div>
          </div>
          {/* Paid Calls */}
          <div className="rounded-2xl px-4 py-3.5 flex items-center gap-3" style={{ background: '#0284c7', boxShadow: '0 8px 28px rgba(2,132,199,0.45)' }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(0,0,0,0.2)' }}>
              <CreditCard className="w-4 h-4 text-sky-100" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-widest leading-none mb-1 text-sky-200">Paid Calls</p>
              <p className="text-base font-black text-white leading-none">{totalPaid.toLocaleString()}</p>
            </div>
          </div>
          {/* Submitted */}
          <div className="rounded-2xl px-4 py-3.5 flex items-center gap-3" style={{ background: '#e11d48', boxShadow: '0 8px 28px rgba(225,29,72,0.45)' }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(0,0,0,0.2)' }}>
              <CheckCircle className="w-4 h-4 text-rose-100" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-widest leading-none mb-1 text-rose-200">Submitted</p>
              <p className="text-base font-black text-white leading-none">{totalSubmitted}</p>
            </div>
          </div>
          {/* Close % */}
          <div className="rounded-2xl px-4 py-3.5 flex items-center gap-3" style={{ background: '#2563eb', boxShadow: '0 8px 28px rgba(37,99,235,0.45)' }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(0,0,0,0.2)' }}>
              <Users className="w-4 h-4 text-blue-100" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-widest leading-none mb-1 text-blue-200">Close %</p>
              <p className="text-base font-black text-white leading-none">
                {totalValid > 0 ? `${((totalSubmitted / totalValid) * 100).toFixed(1)}%` : '—'}
              </p>
            </div>
          </div>
        </div>

        {/* ── Main Dark Card ─────────────────────────────────────────────── */}
        <div className="rounded-3xl overflow-hidden" style={{ background: '#0d0d1a', border: '1px solid rgba(255,255,255,0.06)' }}>

          {/* Summary Stats Strip */}
          <div className="grid grid-cols-4 divide-x divide-white/5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="px-7 py-5">
              <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: '#4b5563' }}>ROAS</p>
              <p className="text-3xl font-black text-white leading-none">
                {totalSpend > 0 ? `${(totalSubmittedPremium / totalSpend).toFixed(2)}×` : '—'}
              </p>
              {totalSpend > 0 && totalSubmittedPremium > 0 && (
                <p className="text-xs font-bold mt-1.5" style={{ color: '#10b981' }}>
                  from ${totalSubmittedPremium.toLocaleString(undefined, { maximumFractionDigits: 0 })} premium
                </p>
              )}
            </div>
            <div className="px-7 py-5">
              <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: '#4b5563' }}>Submitted Premium</p>
              <p className="text-3xl font-black text-white leading-none">
                ${totalSubmittedPremium.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="px-7 py-5">
              <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: '#4b5563' }}>Total Spend</p>
              <p className="text-3xl font-black text-white leading-none">
                ${totalSpend.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
              {totalSubmitted > 0 && (
                <p className="text-xs font-bold mt-1.5" style={{ color: '#f472b6' }}>
                  ${(totalSpend / totalSubmitted).toFixed(2)} SCPA
                </p>
              )}
            </div>
            <div className="px-7 py-5">
              <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: '#4b5563' }}>Submitted</p>
              <p className="text-3xl font-black text-white leading-none">{totalSubmitted}</p>
              {totalValid > 0 && (
                <p className="text-xs font-bold mt-1.5" style={{ color: '#60a5fa' }}>
                  {((totalSubmitted / totalValid) * 100).toFixed(1)}% close rate
                </p>
              )}
            </div>
          </div>

          {/* Toolbar */}
          <div className="px-7 py-4 flex items-center justify-between gap-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: '#4b5563' }} />
              <input
                type="text"
                value={agentSearch}
                onChange={e => setAgentSearch(e.target.value)}
                placeholder="Search agents…"
                className="pl-8 pr-3 py-2 text-xs rounded-xl text-white placeholder:text-slate-600 focus:outline-none w-44 transition-all"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              />
            </div>
            <span className="text-xs font-bold px-3 py-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)', color: '#4b5563' }}>
              {entries.length} agents
            </span>
          </div>

          {/* Table Column Headers */}
          {!isLoading && !error && entries.length > 0 && (() => {
            const toggleSort = (key: typeof sortKey) => {
              if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
              else { setSortKey(key); setSortDir('desc'); }
            };
            const SortIcon = ({ col }: { col: typeof sortKey }) => sortKey === col
              ? <ChevronUp className={`inline w-2.5 h-2.5 ml-0.5 transition-transform ${sortDir === 'asc' ? '' : 'rotate-180'}`} />
              : <ChevronUp className="inline w-2.5 h-2.5 ml-0.5 opacity-0 group-hover:opacity-30" />;
            return (
              <div className="px-7 py-3 grid grid-cols-[1fr_5rem_4rem_4rem_4rem_6rem_5rem_5.5rem_5.5rem_5rem] gap-3 text-[10px] font-black uppercase tracking-wider" style={{ background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid rgba(255,255,255,0.04)', color: '#374151' }}>
                <button onClick={() => toggleSort('name')} className="group flex items-center gap-0.5 text-left hover:text-slate-400 transition-colors">Agent<SortIcon col="name" /></button>
                <button onClick={() => toggleSort('calls_received')} className="group flex items-center justify-end gap-0.5 hover:text-slate-400 transition-colors">Total<SortIcon col="calls_received" /></button>
                <button onClick={() => toggleSort('valid_calls')} className="group flex items-center justify-end gap-0.5 hover:text-slate-400 transition-colors">Valid<SortIcon col="valid_calls" /></button>
                <button onClick={() => toggleSort('paid_calls')} className="group flex items-center justify-end gap-0.5 hover:text-slate-400 transition-colors">Paid<SortIcon col="paid_calls" /></button>
                <button onClick={() => toggleSort('submitted')} className="group flex items-center justify-end gap-0.5 hover:text-slate-400 transition-colors">Subs<SortIcon col="submitted" /></button>
                <button onClick={() => toggleSort('submitted_premium')} className="group flex items-center justify-end gap-0.5 hover:text-slate-400 transition-colors">Premium<SortIcon col="submitted_premium" /></button>
                <button onClick={() => toggleSort('close')} className="group flex items-center justify-end gap-0.5 hover:text-slate-400 transition-colors">Close%<SortIcon col="close" /></button>
                <button onClick={() => toggleSort('totalSpend')} className="group flex items-center justify-end gap-0.5 hover:text-slate-400 transition-colors">Spend<SortIcon col="totalSpend" /></button>
                <button onClick={() => toggleSort('scpa')} className="group flex items-center justify-end gap-0.5 hover:text-slate-400 transition-colors">SCPA<SortIcon col="scpa" /></button>
                <button onClick={() => toggleSort('roas')} className="group flex items-center justify-end gap-0.5 hover:text-slate-400 transition-colors">ROAS<SortIcon col="roas" /></button>
              </div>
            );
          })()}

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-20 gap-3" style={{ color: '#374151' }}>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm font-medium">Loading activity data...</span>
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.1)' }}>
                <AlertCircle className="w-6 h-6" style={{ color: '#ef4444' }} />
              </div>
              <p className="text-sm font-bold text-white">Unable to load data</p>
              <p className="text-xs max-w-xs text-center" style={{ color: '#4b5563' }}>{error}</p>
              <button
                onClick={() => load()}
                className="mt-2 px-4 py-2 text-xs font-bold rounded-xl transition-colors text-white"
                style={{ background: 'rgba(255,255,255,0.08)' }}
              >
                Retry
              </button>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && entries.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <Phone className="w-6 h-6" style={{ color: '#1f2937' }} />
              </div>
              <p className="text-sm font-bold" style={{ color: '#374151' }}>No data for this period</p>
            </div>
          )}

          {/* Data Rows + Totals */}
          {!isLoading && !error && entries.length > 0 && (
            <>
              <div>
                {[...entries]
                  .filter(e => e.name?.toLowerCase().includes(agentSearch.toLowerCase()))
                  .sort((a, b) => {
                    let av: number, bv: number;
                    if (sortKey === 'name') { av = a.name?.localeCompare(b.name ?? '') ?? 0; return sortDir === 'asc' ? av : -av; }
                    if (sortKey === 'scpa') { av = (a.submitted ?? 0) > 0 ? (a.totalSpend ?? 0) / (a.submitted ?? 1) : 0; bv = (b.submitted ?? 0) > 0 ? (b.totalSpend ?? 0) / (b.submitted ?? 1) : 0; }
                    else if (sortKey === 'close') { av = a.valid_calls > 0 ? ((a.submitted ?? 0) / a.valid_calls) * 100 : 0; bv = b.valid_calls > 0 ? ((b.submitted ?? 0) / b.valid_calls) * 100 : 0; }
                    else if (sortKey === 'roas') { av = (a.totalSpend ?? 0) > 0 ? (a.submitted_premium ?? 0) / (a.totalSpend ?? 1) : 0; bv = (b.totalSpend ?? 0) > 0 ? (b.submitted_premium ?? 0) / (b.totalSpend ?? 1) : 0; }
                    else { av = (a[sortKey as keyof typeof a] as number) ?? 0; bv = (b[sortKey as keyof typeof b] as number) ?? 0; }
                    return sortDir === 'desc' ? bv - av : av - bv;
                  })
                  .map((entry, idx) => {
                    const scpa = (entry.submitted ?? 0) > 0 ? (entry.totalSpend ?? 0) / (entry.submitted ?? 1) : null;
                    const closePct = entry.valid_calls > 0 ? ((entry.submitted ?? 0) / entry.valid_calls) * 100 : null;
                    const roas = (entry.totalSpend ?? 0) > 0 ? (entry.submitted_premium ?? 0) / (entry.totalSpend ?? 1) : null;
                    return (
                      <div
                        key={entry.id}
                        className="px-7 py-3.5 grid grid-cols-[1fr_5rem_4rem_4rem_4rem_6rem_5rem_5.5rem_5.5rem_5rem] gap-3 items-center transition-colors cursor-default"
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <AgentAvatar name={entry.name} index={idx} />
                          <p className="text-sm font-semibold text-white truncate capitalize">{entry.name}</p>
                        </div>
                        <p className="text-sm text-right tabular-nums" style={{ color: '#4b5563' }}>{entry.calls_received ?? 0}</p>
                        <p className="text-sm font-bold text-white text-right tabular-nums">{entry.valid_calls ?? 0}</p>
                        <p className="text-sm font-bold text-right tabular-nums" style={{ color: '#38bdf8' }}>{entry.paid_calls ?? 0}</p>
                        <p className="text-sm font-bold text-right tabular-nums" style={{ color: '#a78bfa' }}>{entry.submitted ?? 0}</p>
                        <p className="text-xs font-bold text-right tabular-nums" style={{ color: '#a3e635' }}>{(entry.submitted_premium ?? 0) > 0 ? `$${(entry.submitted_premium).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—'}</p>
                        <p className="text-xs font-bold text-right tabular-nums" style={{ color: '#34d399' }}>{closePct !== null ? `${closePct.toFixed(1)}%` : '—'}</p>
                        <p className="text-xs font-bold text-right tabular-nums" style={{ color: '#e879f9' }}>{(entry.totalSpend ?? 0) > 0 ? `$${(entry.totalSpend).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—'}</p>
                        <p className="text-xs font-bold text-right tabular-nums" style={{ color: '#f472b6' }}>{scpa !== null ? `$${scpa.toFixed(2)}` : '—'}</p>
                        <p className="text-xs font-bold text-right tabular-nums" style={{ color: '#fbbf24' }}>{roas !== null ? `${roas.toFixed(2)}×` : '—'}</p>
                      </div>
                    );
                  })}
              </div>

              {/* Totals Row */}
              <div
                className="px-7 py-4 grid grid-cols-[1fr_5rem_4rem_4rem_4rem_6rem_5rem_5.5rem_5.5rem_5rem] gap-3 items-center"
                style={{ background: 'rgba(255,255,255,0.03)', borderTop: '1px solid rgba(255,255,255,0.08)' }}
              >
                <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#4b5563' }}>TOTAL</p>
                <p className="text-sm font-black text-white text-right tabular-nums">{totalCalls.toLocaleString()}</p>
                <p className="text-sm font-black text-white text-right tabular-nums">{totalValid.toLocaleString()}</p>
                <p className="text-sm font-black text-right tabular-nums" style={{ color: '#38bdf8' }}>{totalPaid.toLocaleString()}</p>
                <p className="text-sm font-black text-right tabular-nums" style={{ color: '#a78bfa' }}>{totalSubmitted}</p>
                <p className="text-xs font-black text-right tabular-nums" style={{ color: '#a3e635' }}>
                  {totalSubmittedPremium > 0 ? `$${totalSubmittedPremium.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—'}
                </p>
                <p className="text-xs font-black text-right tabular-nums" style={{ color: '#34d399' }}>
                  {totalValid > 0 ? `${((totalSubmitted / totalValid) * 100).toFixed(1)}%` : '—'}
                </p>
                <p className="text-xs font-black text-right tabular-nums" style={{ color: '#e879f9' }}>
                  {totalSpend > 0 ? `$${totalSpend.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—'}
                </p>
                <p className="text-xs font-black text-right tabular-nums" style={{ color: '#f472b6' }}>
                  {totalSubmitted > 0 ? `$${(totalSpend / totalSubmitted).toFixed(2)}` : '—'}
                </p>
                <p className="text-xs font-black text-right tabular-nums" style={{ color: '#fbbf24' }}>
                  {totalSpend > 0 ? `${(totalSubmittedPremium / totalSpend).toFixed(2)}×` : '—'}
                </p>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
};

export default CallReportCallx;
