import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Building2, ChevronDown, Loader2, RotateCcw, Search, X } from 'lucide-react';
import { buildSwcrmFilter, SwcrmListResponse, SwcrmLocation, SwcrmQuickFilter, swcrmApi } from '../services/swcrmApi';
import { QuickEditMenu } from './QuickEditMenu';

type SortField = 'name' | 'account_type' | 'saas_mode' | 'subscription_status' | 'isPaused' | 'created_at' | 'lastUpdated';
type SortDirection = 'asc' | 'desc';

const EMPTY_FILTER: SwcrmQuickFilter = { accountType: '', saasMode: '', subscriptionStatus: '', paused: '' };
const EMPTY_RESPONSE: SwcrmListResponse = {
  itemsReceived: 0,
  curPage: 1,
  nextPage: null,
  prevPage: null,
  offset: 0,
  perPage: 25,
  itemsTotal: 0,
  pageTotal: 1,
  items: [],
};

const formatDateTime = (value: number | null) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  }).format(date);
};

const humanize = (value: string | null) => value ? value.replaceAll('_', ' ') : '—';

const HeaderButton = ({ field, label, sortField, direction, onSort }: {
  field: SortField;
  label: string;
  sortField: SortField;
  direction: SortDirection;
  onSort: (field: SortField) => void;
}) => (
  <button type="button" onClick={() => onSort(field)} className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-[0.12em] text-slate-400 transition hover:text-slate-800">
    {label}
    <span className={`rounded-full px-1.5 py-0.5 text-[7px] ${sortField === field ? 'bg-violet-100 text-violet-700' : 'text-slate-300'}`}>
      {sortField === field ? direction.toUpperCase() : <ChevronDown className="h-3 w-3" />}
    </span>
  </button>
);

const StatusPill = ({ value, kind = 'default' }: { value: string | null; kind?: 'default' | 'saas' }) => {
  const normalized = value?.toLowerCase() || '';
  const positive = normalized === 'active' || normalized === 'activated';
  const pending = normalized.includes('pending');
  const tone = positive
    ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
    : pending
      ? 'bg-amber-50 text-amber-700 ring-amber-200'
      : normalized === 'canceled' || (kind === 'saas' && normalized === 'not_activated')
        ? 'bg-rose-50 text-rose-700 ring-rose-200'
        : 'bg-slate-100 text-slate-500 ring-slate-200';
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[8px] font-black uppercase ring-1 ${tone}`}>{humanize(value)}</span>;
};

const Detail = ({ label, value, title }: { label: string; value: React.ReactNode; title?: string }) => (
  <div className="min-w-0">
    <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">{label}</p>
    <p className="mt-1 break-words text-[10px] font-black text-slate-800" title={title}>{value || '—'}</p>
  </div>
);

export const SwcrmWorkspace: React.FC = () => {
  const [data, setData] = useState<SwcrmListResponse>(EMPTY_RESPONSE);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [draftFilter, setDraftFilter] = useState<SwcrmQuickFilter>(EMPTY_FILTER);
  const [appliedFilter, setAppliedFilter] = useState<SwcrmQuickFilter>(EMPTY_FILTER);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedLocation, setSelectedLocation] = useState<SwcrmLocation | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);
      setDebouncedSearch(search.trim());
    }, 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    void swcrmApi.list({
      is_staff: true,
      page,
      per_page: perPage,
      sort: { [sortField]: sortDirection },
      filter: buildSwcrmFilter(appliedFilter),
      search: debouncedSearch || null,
    }, controller.signal)
      .then(setData)
      .catch((requestError: unknown) => {
        if ((requestError as { name?: string })?.name === 'AbortError') return;
        setError(requestError instanceof Error ? requestError.message : 'SWCRM locations could not be loaded.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [appliedFilter, debouncedSearch, page, perPage, reloadKey, sortDirection, sortField]);

  const activeFilterCount = useMemo(() => Object.values(appliedFilter).filter(Boolean).length, [appliedFilter]);
  const showingStart = data.itemsTotal ? data.offset + 1 : 0;
  const showingEnd = Math.min(data.offset + data.itemsReceived, data.itemsTotal);

  const applyFilters = () => {
    setPage(1);
    setAppliedFilter({ ...draftFilter });
  };
  const clearFilters = () => {
    setPage(1);
    setDraftFilter({ ...EMPTY_FILTER });
    setAppliedFilter({ ...EMPTY_FILTER });
  };
  const changeSort = (field: SortField) => {
    setPage(1);
    if (sortField === field) setSortDirection(current => current === 'asc' ? 'desc' : 'asc');
    else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-[#111126] to-violet-950 px-6 py-5 text-white shadow-xl shadow-slate-300/30">
        <p className="text-[9px] font-black uppercase tracking-[0.22em] text-violet-300">Internal tools · SWCRM</p>
        <h1 className="mt-1 text-2xl font-black">Location directory</h1>
        <p className="mt-1 text-xs font-semibold text-slate-400">Review account, SaaS, subscription, and pause status across SimplyWork CRM locations.</p>
      </section>

      <div className="flex min-w-0 items-start gap-5">
        <section className="min-w-0 flex-1 overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-slate-100">
          <div className="flex flex-col gap-4 border-b border-slate-100 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-violet-600">SWCRM locations</p>
              <div className="mt-1 flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-950">{loading && !data.itemsTotal ? 'Loading locations…' : `${data.itemsTotal.toLocaleString()} locations matching current view`}</h2>
                {activeFilterCount > 0 && <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[9px] font-black text-violet-700 ring-1 ring-violet-200">{activeFilterCount} filtered</span>}
              </div>
            </div>
            <label className="relative block min-w-[280px]">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search SWCRM locations…" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-xs font-bold text-slate-800 outline-none transition focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-50" />
            </label>
          </div>

          {error && <div className="mx-5 mt-4 flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800"><span className="flex items-center gap-2"><AlertCircle className="h-4 w-4" />{error}</span><button type="button" onClick={() => setReloadKey(value => value + 1)} className="inline-flex items-center gap-1.5 font-black"><RotateCcw className="h-3.5 w-3.5" />Retry</button></div>}

          <div className="overflow-x-auto border-b border-slate-100 bg-white px-5 py-3">
            <div className="grid min-w-[1020px] grid-cols-[150px_190px_190px_190px_150px_1fr_142px] items-center overflow-visible rounded-[1.35rem] border border-slate-200 bg-slate-50/70 shadow-sm focus-within:border-violet-300 focus-within:bg-white">
              <div className="flex h-full items-center gap-2 border-r border-slate-200 px-4 py-3 text-[9px] font-black uppercase tracking-[0.16em] text-slate-500"><span className="h-2 w-2 rounded-full bg-violet-500" />Quick filter</div>
              <div className="border-r border-slate-200 px-2 py-2"><input aria-label="Filter SWCRM by account type" value={draftFilter.accountType} onChange={event => setDraftFilter(current => ({ ...current, accountType: event.target.value }))} placeholder="Account type" className="min-h-8 w-full rounded-full bg-white px-3 py-2 text-[10px] font-black text-slate-700 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-violet-300" /></div>
              <div className="border-r border-slate-200 px-2 py-2"><QuickEditMenu ariaLabel="Choose SWCRM SaaS mode filter" value={draftFilter.saasMode} placeholder="SaaS mode" options={[{ value: '', label: 'All SaaS modes' }, { value: 'activated', label: 'Activated' }, { value: 'not_activated', label: 'Not activated' }, { value: 'setup_pending', label: 'Setup pending' }]} showDots={false} onChange={saasMode => setDraftFilter(current => ({ ...current, saasMode }))} /></div>
              <div className="border-r border-slate-200 px-2 py-2"><QuickEditMenu ariaLabel="Choose SWCRM subscription status filter" value={draftFilter.subscriptionStatus} placeholder="Subscription" options={[{ value: '', label: 'All subscriptions' }, { value: 'active', label: 'Active' }, { value: 'canceled', label: 'Canceled' }]} showDots={false} onChange={subscriptionStatus => setDraftFilter(current => ({ ...current, subscriptionStatus }))} /></div>
              <div className="border-r border-slate-200 px-2 py-2"><QuickEditMenu ariaLabel="Choose SWCRM pause filter" value={draftFilter.paused} placeholder="Pause state" options={[{ value: '', label: 'Any pause state' }, { value: 'false', label: 'Running' }, { value: 'true', label: 'Paused' }]} showDots={false} onChange={paused => setDraftFilter(current => ({ ...current, paused: paused as SwcrmQuickFilter['paused'] }))} /></div>
              <div />
              <div className="flex items-center gap-1.5 px-2"><button type="button" onClick={clearFilters} className="inline-flex flex-1 items-center justify-center rounded-full bg-white px-3 py-2 text-[10px] font-black text-slate-500 ring-1 ring-slate-200 transition hover:bg-slate-100 hover:text-slate-900">Clear</button><button type="button" onClick={applyFilters} className="inline-flex flex-1 items-center justify-center rounded-full bg-slate-950 px-3 py-2 text-[10px] font-black text-white transition hover:-translate-y-px hover:bg-violet-500 hover:shadow-md">Apply</button></div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[1120px] w-full table-fixed border-collapse">
              <thead><tr className="border-b border-slate-100 bg-white text-left">
                <th className="w-[225px] px-5 py-3"><HeaderButton field="name" label="Location" sortField={sortField} direction={sortDirection} onSort={changeSort} /></th>
                <th className="w-[130px] px-3 py-3"><HeaderButton field="account_type" label="Account type" sortField={sortField} direction={sortDirection} onSort={changeSort} /></th>
                <th className="w-[145px] px-3 py-3"><HeaderButton field="saas_mode" label="SaaS mode" sortField={sortField} direction={sortDirection} onSort={changeSort} /></th>
                <th className="w-[205px] px-3 py-3 text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">Plan</th>
                <th className="w-[125px] px-3 py-3"><HeaderButton field="subscription_status" label="Subscription" sortField={sortField} direction={sortDirection} onSort={changeSort} /></th>
                <th className="w-[95px] px-3 py-3"><HeaderButton field="isPaused" label="State" sortField={sortField} direction={sortDirection} onSort={changeSort} /></th>
                <th className="w-[155px] px-3 py-3"><HeaderButton field="lastUpdated" label="Updated" sortField={sortField} direction={sortDirection} onSort={changeSort} /></th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {loading && !data.items.length ? <tr><td colSpan={7} className="h-56 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-violet-500" /><p className="mt-3 text-xs font-bold text-slate-400">Loading SWCRM locations…</p></td></tr>
                : data.items.length ? data.items.map(location => <tr key={location.id} tabIndex={0} aria-label={`Open details for ${location.name}`} onClick={() => setSelectedLocation(location)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedLocation(location); } }} className={`cursor-pointer transition hover:bg-violet-50/50 focus:bg-violet-50/50 focus:outline-none ${selectedLocation?.id === location.id ? 'bg-violet-50/70' : ''}`}>
                  <td className="px-5 py-3"><p className="truncate text-[11px] font-black text-slate-800" title={location.name}>{location.name}</p><p className="mt-0.5 truncate text-[9px] font-semibold text-slate-400" title={location.email || location.location_id}>{location.email || location.location_id}</p></td>
                  <td className="px-3 py-3 text-[10px] font-bold capitalize text-slate-600">{humanize(location.account_type)}</td>
                  <td className="px-3 py-3"><StatusPill value={location.saas_mode} kind="saas" /></td>
                  <td className="px-3 py-3"><p className="line-clamp-2 text-[10px] font-bold leading-4 text-slate-600" title={location.subscription_plan || ''}>{location.subscription_plan || '—'}</p></td>
                  <td className="px-3 py-3"><StatusPill value={location.subscription_status} /></td>
                  <td className="px-3 py-3"><span className={`inline-flex rounded-full px-2.5 py-1 text-[8px] font-black uppercase ring-1 ${location.isPaused ? 'bg-amber-50 text-amber-700 ring-amber-200' : 'bg-emerald-50 text-emerald-700 ring-emerald-200'}`}>{location.isPaused ? 'Paused' : 'Running'}</span></td>
                  <td className="px-3 py-3 text-[9px] font-bold text-slate-500">{formatDateTime(location.lastUpdated)}</td>
                </tr>) : <tr><td colSpan={7} className="h-56 text-center"><p className="text-sm font-black text-slate-700">No SWCRM locations match this view</p><p className="mt-1 text-xs font-medium text-slate-400">Try clearing the search or quick filters.</p></td></tr>}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 text-[10px] font-bold text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <span>Showing {showingStart.toLocaleString()}–{showingEnd.toLocaleString()} of {data.itemsTotal.toLocaleString()}</span>
            <div className="flex items-center gap-3"><label className="flex items-center gap-2">Rows per page<select value={perPage} onChange={event => { setPerPage(Number(event.target.value)); setPage(1); }} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[10px] font-black"><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option></select></label><button type="button" disabled={data.prevPage == null || loading} onClick={() => setPage(data.prevPage || 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 font-black disabled:opacity-40">Previous</button><span>Page {data.curPage} of {data.pageTotal}</span><button type="button" disabled={data.nextPage == null || loading} onClick={() => setPage(data.nextPage || page)} className="rounded-lg border border-slate-200 px-3 py-1.5 font-black disabled:opacity-40">Next</button></div>
          </div>
        </section>

        <div className={`shrink-0 self-start transition-all duration-300 ease-in-out ${selectedLocation ? 'w-[36%] min-w-0 max-w-[34rem] opacity-100' : 'pointer-events-none w-0 opacity-0'}`}>
          {selectedLocation && <aside aria-label={`SWCRM details for ${selectedLocation.name}`} className="flex max-h-[calc(100vh-6rem)] min-h-[560px] w-full flex-col overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-slate-100">
            <header className="shrink-0 border-b border-slate-100 px-6 py-5">
              <div className="flex items-start justify-between gap-5">
                <div className="min-w-0"><div className="flex items-center gap-2"><span className="rounded-lg bg-violet-600 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-white">SWCRM location</span>{selectedLocation.isPaused && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[8px] font-black uppercase text-amber-700 ring-1 ring-amber-200">Paused</span>}</div><h2 className="mt-4 text-2xl font-black tracking-tight text-slate-950">{selectedLocation.name}</h2><p className="mt-2 break-all text-[10px] font-bold text-slate-400">{selectedLocation.location_id}</p></div>
                <button type="button" onClick={() => setSelectedLocation(null)} aria-label="Close SWCRM location details" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500 transition hover:bg-slate-950 hover:text-white"><X className="h-5 w-5" /></button>
              </div>
            </header>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-slate-50/60 px-6 py-6">
              <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100"><p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">Account</p><div className="mt-4 grid grid-cols-2 gap-4"><Detail label="Account type" value={humanize(selectedLocation.account_type)} /><Detail label="Email" value={selectedLocation.email} title={selectedLocation.email} /><Detail label="Created" value={formatDateTime(selectedLocation.created_at)} /><Detail label="Last updated" value={formatDateTime(selectedLocation.lastUpdated)} /></div></section>
              <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100"><p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">Subscription</p><div className="mt-4 grid grid-cols-2 gap-4"><Detail label="SaaS mode" value={humanize(selectedLocation.saas_mode)} /><Detail label="Status" value={humanize(selectedLocation.subscription_status)} /><Detail label="Plan" value={selectedLocation.subscription_plan} /><Detail label="Stripe customer" value={selectedLocation.stripe_customerId} title={selectedLocation.stripe_customerId || ''} /></div></section>
              <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100"><div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-violet-500" /><p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">Location state</p></div><div className="mt-4 grid grid-cols-2 gap-4"><Detail label="Paused" value={selectedLocation.isPaused ? 'Yes' : 'No'} /><Detail label="Record ID" value={selectedLocation.id} title={selectedLocation.id} /></div>{selectedLocation.pause_message && <div className="mt-4 rounded-xl bg-amber-50 p-3 text-[10px] font-bold leading-4 text-amber-800 ring-1 ring-amber-200">{selectedLocation.pause_message}</div>}</section>
            </div>
          </aside>}
        </div>
      </div>
    </div>
  );
};
