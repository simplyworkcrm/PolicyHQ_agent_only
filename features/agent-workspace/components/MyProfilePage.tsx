import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  Loader2,
  TrendingUp,
  Calendar,
  Star,
  Zap,
  FileCheck,
  Search,
  ChevronLeft as PrevIcon,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { agentleaderboardRealtimeApi, AgentDetailsResponse } from '../services/agentleaderboardRealtimeApi';
import { agentPoliciesApi } from '../services/agentPoliciesApi';
import { Policy } from '../../../shared/types/index';
import { formatCurrencyCompact } from './overview/utils';

// ─── helpers ────────────────────────────────────────────────────────────────

const BAND_CONFIG = [
  { key: 'today',     label: 'Today',      icon: Zap,        bg: 'bg-amber-50',   text: 'text-amber-600' },
  { key: 'this_week', label: 'This Week',  icon: TrendingUp, bg: 'bg-blue-50',    text: 'text-blue-600'  },
  { key: 'mtd',       label: 'MTD',        icon: Calendar,   bg: 'bg-emerald-50', text: 'text-emerald-600'},
  { key: 'this_year', label: 'This Year',  icon: Star,       bg: 'bg-purple-50',  text: 'text-purple-600' },
] as const;

const DATE_PRESETS = [
  { label: 'Today',  days: 0  },
  { label: 'Week',   days: 7  },
  { label: 'Month',  days: 30 },
  { label: 'Year',   days: 365},
  { label: 'All',    days: -1 },
] as const;

function getRange(days: number): { start: number; end: number } {
  const now = Date.now();
  if (days < 0) return { start: 0, end: now };
  const start = new Date();
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);
  return { start: start.getTime(), end: now };
}

function fmt(val: string | undefined) {
  if (!val) return 'N/A';
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
    const [y, m, d] = val.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  }
  return new Date(val).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
}

const STATUS_COLORS: Record<string, string> = {
  Approved:     'bg-emerald-100 text-emerald-700',
  Underwriting: 'bg-amber-100 text-amber-700',
  Declined:     'bg-red-100 text-red-700',
  Lapsed:       'bg-slate-100 text-slate-500',
  Cancelled:    'bg-red-100 text-red-600',
};

function ProgressBar({ value, max, colorClass }: { value: number; max: number; colorClass: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-700 ${colorClass}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ─── component ──────────────────────────────────────────────────────────────

export const MyProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Always the primary logged-in agent — never impersonated
  const myAgentId = user?.agentAccess?.[0]?.agentId ?? '';

  // Production data
  const [prodData,    setProdData]    = useState<AgentDetailsResponse | null>(null);
  const [prodLoading, setProdLoading] = useState(true);
  const [prodError,   setProdError]   = useState(false);

  // Policies data
  const [policies,      setPolicies]      = useState<Policy[]>([]);
  const [polLoading,    setPolLoading]    = useState(false);
  const [presetIdx,     setPresetIdx]     = useState(2); // default: Month
  const [search,        setSearch]        = useState('');
  const [page,          setPage]          = useState(1);
  const ROWS = 10;

  // Fetch production
  useEffect(() => {
    if (!myAgentId) return;
    setProdLoading(true);
    setProdError(false);
    agentleaderboardRealtimeApi.getAgentDetails(myAgentId)
      .then(setProdData)
      .catch(() => setProdError(true))
      .finally(() => setProdLoading(false));
  }, [myAgentId]);

  // Fetch policies — always using myAgentId directly
  useEffect(() => {
    if (!myAgentId) return;
    setPolLoading(true);
    setPage(1);
    const { start, end } = getRange(DATE_PRESETS[presetIdx].days);
    agentPoliciesApi.getPolicies(myAgentId, start, end)
      .then(setPolicies)
      .catch(console.error)
      .finally(() => setPolLoading(false));
  }, [myAgentId, presetIdx]);

  const filtered = useMemo(() => {
    if (!search.trim()) return policies;
    const q = search.toLowerCase();
    return policies.filter(p =>
      p.client?.toLowerCase().includes(q) ||
      p.carrier?.toLowerCase().includes(q) ||
      p.status?.toLowerCase().includes(q) ||
      p.policy_number?.toLowerCase().includes(q)
    );
  }, [policies, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS));
  const pageRows   = filtered.slice((page - 1) * ROWS, page * ROWS);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-12">

      <div className="flex items-center">
        <button
          onClick={() => navigate(-1)}
          className="p-3 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-slate-900 shadow-sm transition-all hover:shadow-md active:scale-95"
          aria-label="Go back"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      </div>

      {/* ── Production ── */}
      {prodLoading ? (
        <div className="h-48 flex flex-col items-center justify-center gap-4 text-slate-400">
          <Loader2 className="w-10 h-10 animate-spin text-brand-500" />
          <p className="text-[10px] font-black uppercase tracking-widest">Loading Production Data…</p>
        </div>
      ) : prodError || !prodData ? (
        <div className="h-48 flex flex-col items-center justify-center gap-3 text-slate-400">
          <p className="text-sm font-bold">Could not load production data.</p>
          <button
            onClick={() => { setProdLoading(true); setProdError(false); agentleaderboardRealtimeApi.getAgentDetails(myAgentId).then(setProdData).catch(() => setProdError(true)).finally(() => setProdLoading(false)); }}
            className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-brand-500 transition-all"
          >Retry</button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {BAND_CONFIG.map(({ key, label, icon: Icon, bg, text }) => {
              const band = prodData.production[key];
              return (
                <div key={key} className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm hover:shadow-xl transition-all">
                  <div className="flex items-center justify-between mb-5">
                    <div className={`p-2.5 ${bg} rounded-xl`}><Icon className={`w-5 h-5 ${text}`} /></div>
                    <span className={`text-[9px] font-black uppercase tracking-widest ${text}`}>{label}</span>
                  </div>
                  <p className="text-2xl font-black text-slate-900 tracking-tighter">{formatCurrencyCompact(band.premium)}</p>
                  <p className="text-[10px] font-bold text-slate-400 mt-1">{band.apps} app{band.apps !== 1 ? 's' : ''}</p>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sources */}
            <div className="bg-white rounded-[2rem] p-7 border border-slate-100 shadow-sm">
              <h3 className="text-base font-black text-slate-900 uppercase tracking-widest mb-6">Lead Sources</h3>
              {prodData.sources.length === 0 ? <p className="text-sm text-slate-400">No source data.</p> : (
                <div className="space-y-4">
                  {prodData.sources.map(s => {
                    const mx = Math.max(...prodData.sources.map(x => x.premium));
                    return (
                      <div key={s.name}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-slate-700 truncate max-w-[60%]">{s.name}</span>
                          <div className="flex gap-3 text-[10px] font-black text-slate-500">
                            <span>{s.apps} apps</span>
                            <span className="text-indigo-600">{formatCurrencyCompact(s.premium)}</span>
                          </div>
                        </div>
                        <ProgressBar value={s.premium} max={mx} colorClass="bg-indigo-500" />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Carriers */}
            <div className="bg-white rounded-[2rem] p-7 border border-slate-100 shadow-sm">
              <h3 className="text-base font-black text-slate-900 uppercase tracking-widest mb-6">Carriers</h3>
              {prodData.carrier.length === 0 ? <p className="text-sm text-slate-400">No carrier data.</p> : (
                <div className="space-y-4">
                  {prodData.carrier.map(c => {
                    const mx = Math.max(...prodData.carrier.map(x => x.premium));
                    return (
                      <div key={c.name}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-slate-700 truncate max-w-[60%]">{c.name}</span>
                          <div className="flex gap-3 text-[10px] font-black text-slate-500">
                            <span>{c.apps} apps</span>
                            <span className="text-emerald-600">{formatCurrencyCompact(c.premium)}</span>
                          </div>
                        </div>
                        <ProgressBar value={c.premium} max={mx} colorClass="bg-emerald-500" />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Policies ── */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-slate-200" />
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 flex items-center gap-2">
          <FileCheck className="w-3.5 h-3.5" /> Policies
        </span>
        <div className="flex-1 h-px bg-slate-200" />
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
        {/* toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5 border-b border-slate-100">
          {/* date presets */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
            {DATE_PRESETS.map((p, i) => (
              <button
                key={p.label}
                onClick={() => setPresetIdx(i)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  presetIdx === i ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >{p.label}</button>
            ))}
          </div>

          {/* search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search policies…"
              className="pl-9 pr-4 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 w-56"
            />
          </div>
        </div>

        {/* table */}
        {polLoading ? (
          <div className="h-40 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center text-slate-400 gap-2">
            <FileCheck className="w-8 h-8 opacity-30" />
            <p className="text-xs font-bold">No policies found</p>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  {['Client', 'Carrier', 'Product', 'Status', 'Premium', 'Date'].map(h => (
                    <th key={h} className="text-left px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map(p => (
                  <tr key={p.policy_id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3.5">
                      <span className="font-bold text-slate-800">{p.client}</span>
                      {p.policy_number && <span className="block text-[10px] text-slate-400 font-medium">{p.policy_number}</span>}
                    </td>
                    <td className="px-6 py-3.5 text-slate-600 font-medium text-xs">{p.carrier}</td>
                    <td className="px-6 py-3.5 text-slate-500 font-medium text-xs max-w-[180px] truncate">{p.carrier_product}</td>
                    <td className="px-6 py-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide ${STATUS_COLORS[p.status] ?? 'bg-slate-100 text-slate-600'}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 font-black text-slate-900">{formatCurrencyCompact(p.annual_premium)}</td>
                    <td className="px-6 py-3.5 text-slate-400 text-xs font-medium">{fmt(p.initial_draft_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {filtered.length} policies · page {page} of {totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  ><PrevIcon className="w-4 h-4" /></button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  ><ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

    </div>
  );
};

