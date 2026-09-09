import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ChevronDown, Database, Loader2, RotateCcw, Search, X } from 'lucide-react';
import { buildHcmsFilter, HcmsListResponse, HcmsQuickFilter, HcmsRecord, hcmsApi } from '../services/hcmsApi';
import { QuickEditMenu } from './QuickEditMenu';

type SortField = 'name' | 'npn' | 'team' | 'status' | 'compensation' | 'contracted_on';
type SortDirection = 'asc' | 'desc';

const EMPTY_FILTER: HcmsQuickFilter = { name: '', status: '', team: '', npn: '', primaryUpline: '', productionUpline: '' };
const EMPTY_RESPONSE: HcmsListResponse = {
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

const formatDate = (value: string | null) => {
  if (!value) return '—';
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
};

const HeaderButton = ({ field, label, sortField, direction, onSort }: {
  field: SortField;
  label: string;
  sortField: SortField;
  direction: SortDirection;
  onSort: (field: SortField) => void;
}) => (
  <button type="button" onClick={() => onSort(field)} className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-[0.12em] text-slate-400 transition hover:text-slate-800">
    {label}
    <span className={`rounded-full px-1.5 py-0.5 text-[7px] ${sortField === field ? 'bg-amber-100 text-amber-700' : 'text-slate-300'}`}>
      {sortField === field ? direction.toUpperCase() : <ChevronDown className="h-3 w-3" />}
    </span>
  </button>
);

const UplineCell = ({ name, npn }: { name: string | null; npn: number | null }) => (
  <div className="min-w-0">
    <p className="truncate text-[10px] font-black text-slate-700">{name || '—'}</p>
    <p className="mt-0.5 text-[8px] font-semibold text-slate-400">{npn ? `NPN ${npn}` : 'No NPN'}</p>
  </div>
);

export const HcmsResourceWorkspace: React.FC = () => {
  const [data, setData] = useState<HcmsListResponse>(EMPTY_RESPONSE);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [draftFilter, setDraftFilter] = useState<HcmsQuickFilter>(EMPTY_FILTER);
  const [appliedFilter, setAppliedFilter] = useState<HcmsQuickFilter>(EMPTY_FILTER);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [teamOptions, setTeamOptions] = useState<string[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<HcmsRecord | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void hcmsApi.getTeamOptions(true, controller.signal)
      .then(setTeamOptions)
      .catch(requestError => {
        if ((requestError as { name?: string })?.name !== 'AbortError') setTeamOptions([]);
      });
    return () => controller.abort();
  }, []);

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
    void hcmsApi.list({
      is_staff: true,
      page,
      per_page: perPage,
      search: debouncedSearch || null,
      filter: buildHcmsFilter(appliedFilter),
      sort: { [sortField]: sortDirection },
    }, controller.signal)
      .then(setData)
      .catch((requestError: unknown) => {
        if ((requestError as { name?: string })?.name === 'AbortError') return;
        setError(requestError instanceof Error ? requestError.message : 'HCMS resources could not be loaded.');
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
    <div className="min-h-0 space-y-4 pb-8 font-sans">
      <section className="flex flex-col justify-between gap-4 rounded-[2rem] bg-slate-950 px-6 py-5 text-white shadow-lg sm:flex-row sm:items-center">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.22em] text-amber-300">Internal tools · HCMS</p>
          <h1 className="mt-1 text-2xl font-black">HCMS resource directory</h1>
          <p className="mt-1 text-xs font-medium text-slate-400">Search and reference contracting, hierarchy, and carrier information. This view is read-only.</p>
        </div>
        <span className="inline-flex items-center gap-2 self-start rounded-xl bg-white/10 px-3 py-2 text-[9px] font-black uppercase tracking-[0.14em] text-slate-300 sm:self-auto">
          <Database className="h-4 w-4 text-amber-300" />Resource view
        </span>
      </section>

      <div className="flex min-w-0 items-start gap-5">
      <section className="min-w-0 flex-1 overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-slate-100">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-600">HCMS records</p>
            <div className="mt-1 flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-950">{loading && !data.itemsTotal ? 'Loading resources…' : `${data.itemsTotal.toLocaleString()} agents matching current view`}</h2>
              {activeFilterCount > 0 && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[9px] font-black text-amber-700 ring-1 ring-amber-200">{activeFilterCount} filtered</span>}
            </div>
          </div>
          <label className="relative block min-w-[280px]">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search HCMS resources…" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-xs font-bold text-slate-800 outline-none transition focus:border-amber-300 focus:bg-white focus:ring-4 focus:ring-amber-50" />
          </label>
        </div>

        {error && <div className="mx-5 mt-4 flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800"><span className="flex items-center gap-2"><AlertCircle className="h-4 w-4" />{error}</span><button type="button" onClick={() => setReloadKey(value => value + 1)} className="inline-flex items-center gap-1.5 font-black"><RotateCcw className="h-3.5 w-3.5" />Retry</button></div>}

        <div className="overflow-x-auto border-b border-slate-100 bg-white px-5 py-3">
          <div className="grid min-w-[1450px] grid-cols-[minmax(150px,1fr)_180px_180px_150px_150px_190px_190px_142px] items-center overflow-visible rounded-[1.35rem] border border-slate-200 bg-slate-50/70 shadow-sm focus-within:border-amber-300 focus-within:bg-white">
            <div className="flex h-full items-center gap-2 border-r border-slate-200 px-4 py-3 text-[9px] font-black uppercase tracking-[0.16em] text-slate-500"><span className="h-2 w-2 rounded-full bg-amber-400" />Quick filter</div>
            <div className="border-r border-slate-200 px-2 py-2"><input aria-label="Filter HCMS by agent" value={draftFilter.name} onChange={event => setDraftFilter(current => ({ ...current, name: event.target.value }))} placeholder="Agent" className="min-h-8 w-full rounded-full bg-white px-3 py-2 text-[10px] font-black text-slate-700 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-amber-300" /></div>
            <div className="border-r border-slate-200 px-2 py-2"><QuickEditMenu ariaLabel="Choose HCMS team filter" value={draftFilter.team} placeholder="Team" options={[{ value: '', label: 'All teams' }, ...teamOptions.map(team => ({ value: team, label: team }))]} showDots={false} searchable onChange={team => setDraftFilter(current => ({ ...current, team }))} /></div>
            <div className="border-r border-slate-200 px-2 py-2"><QuickEditMenu ariaLabel="Choose HCMS status filter" value={draftFilter.status} placeholder="Status" options={[{ value: '', label: 'All statuses', tone: 'bg-white text-slate-700 ring-slate-200', dot: 'bg-slate-300' }, { value: 'active', label: 'Active', tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500' }, { value: 'inactive', label: 'Inactive', tone: 'bg-slate-100 text-slate-600 ring-slate-200', dot: 'bg-slate-400' }]} triggerTone={draftFilter.status === 'active' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : draftFilter.status === 'inactive' ? 'bg-slate-100 text-slate-600 ring-slate-200' : undefined} onChange={status => setDraftFilter(current => ({ ...current, status }))} /></div>
            <div className="border-r border-slate-200 px-2 py-2"><input aria-label="Filter HCMS by NPN" value={draftFilter.npn} onChange={event => setDraftFilter(current => ({ ...current, npn: event.target.value }))} inputMode="numeric" placeholder="NPN" className="min-h-8 w-full rounded-full bg-white px-3 py-2 text-[10px] font-black text-slate-700 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-amber-300" /></div>
            <div className="border-r border-slate-200 px-2 py-2"><input aria-label="Filter HCMS by primary upline" value={draftFilter.primaryUpline} onChange={event => setDraftFilter(current => ({ ...current, primaryUpline: event.target.value }))} placeholder="Primary upline" className="min-h-8 w-full rounded-full bg-white px-3 py-2 text-[10px] font-black text-slate-700 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-amber-300" /></div>
            <div className="border-r border-slate-200 px-2 py-2"><input aria-label="Filter HCMS by production upline" value={draftFilter.productionUpline} onChange={event => setDraftFilter(current => ({ ...current, productionUpline: event.target.value }))} placeholder="Production upline" className="min-h-8 w-full rounded-full bg-white px-3 py-2 text-[10px] font-black text-slate-700 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-amber-300" /></div>
            <div className="flex items-center gap-1.5 px-2"><button type="button" onClick={clearFilters} className="inline-flex flex-1 items-center justify-center rounded-full bg-white px-3 py-2 text-[10px] font-black text-slate-500 ring-1 ring-slate-200 transition hover:bg-slate-100 hover:text-slate-900">Clear</button><button type="button" onClick={applyFilters} className="inline-flex flex-1 items-center justify-center rounded-full bg-slate-950 px-3 py-2 text-[10px] font-black text-white transition hover:-translate-y-px hover:bg-amber-400 hover:text-slate-950 hover:shadow-md">Apply</button></div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1020px] w-full table-fixed border-collapse">
            <thead><tr className="border-b border-slate-100 bg-white text-left">
              <th className="w-[210px] px-5 py-3"><HeaderButton field="name" label="Agent" sortField={sortField} direction={sortDirection} onSort={changeSort} /></th>
              <th className="w-[105px] px-3 py-3"><HeaderButton field="npn" label="NPN" sortField={sortField} direction={sortDirection} onSort={changeSort} /></th>
              <th className="w-[165px] px-3 py-3"><HeaderButton field="team" label="Team" sortField={sortField} direction={sortDirection} onSort={changeSort} /></th>
              <th className="w-[95px] px-3 py-3"><HeaderButton field="status" label="Status" sortField={sortField} direction={sortDirection} onSort={changeSort} /></th>
              <th className="w-[100px] px-3 py-3"><HeaderButton field="compensation" label="Comp" sortField={sortField} direction={sortDirection} onSort={changeSort} /></th>
              <th className="w-[130px] px-3 py-3"><HeaderButton field="contracted_on" label="Contracted" sortField={sortField} direction={sortDirection} onSort={changeSort} /></th>
              <th className="w-[170px] px-3 py-3 text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">Primary upline</th>
              <th className="w-[170px] px-3 py-3 text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">Production upline</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {loading && !data.items.length ? <tr><td colSpan={8} className="h-56 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-amber-500" /><p className="mt-3 text-xs font-bold text-slate-400">Loading HCMS resources…</p></td></tr>
              : data.items.length ? data.items.map((record: HcmsRecord) => <tr key={record.id} tabIndex={0} aria-label={`Open details for ${record.name}`} onClick={() => setSelectedRecord(record)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedRecord(record); } }} className={`cursor-pointer transition hover:bg-amber-50/50 focus:bg-amber-50/50 focus:outline-none ${selectedRecord?.id === record.id ? 'bg-amber-50/70' : ''}`}>
                <td className="px-5 py-3"><p className="truncate text-[11px] font-black text-slate-800" title={record.name}>{record.name}</p><p className="mt-0.5 text-[9px] font-semibold text-slate-400">{record.phone || 'No phone'}</p></td>
                <td className="px-3 py-3 text-[10px] font-bold text-slate-600">{record.npn || '—'}</td>
                <td className="px-3 py-3"><p className="line-clamp-2 text-[10px] font-bold leading-4 text-slate-600" title={record.team || ''}>{record.team || '—'}</p></td>
                <td className="px-3 py-3"><span className={`inline-flex rounded-full px-2.5 py-1 text-[8px] font-black uppercase ring-1 ${record.status?.toLowerCase() === 'active' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-slate-100 text-slate-500 ring-slate-200'}`}>{record.status || 'Unknown'}</span></td>
                <td className="px-3 py-3 text-[10px] font-black text-slate-700">{record.compensation == null ? '—' : `${record.compensation}%`}</td>
                <td className="px-3 py-3 text-[10px] font-bold text-slate-500">{formatDate(record.contracted_on)}</td>
                <td className="px-3 py-3"><UplineCell name={record.primaryUpline_name} npn={record.primaryUpline_npn} /></td>
                <td className="px-3 py-3"><UplineCell name={record.productionUpline_name} npn={record.productionUpline_npn} /></td>
              </tr>) : <tr><td colSpan={8} className="h-56 text-center"><p className="text-sm font-black text-slate-700">No HCMS records match this view</p><p className="mt-1 text-xs font-medium text-slate-400">Try clearing the search or quick filters.</p></td></tr>}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 text-[10px] font-bold text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>Showing {showingStart.toLocaleString()}–{showingEnd.toLocaleString()} of {data.itemsTotal.toLocaleString()}</span>
          <div className="flex items-center gap-3"><label className="flex items-center gap-2">Rows per page<select value={perPage} onChange={event => { setPerPage(Number(event.target.value)); setPage(1); }} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[10px] font-black"><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option></select></label><button type="button" disabled={data.prevPage == null || loading} onClick={() => setPage(current => Math.max(1, current - 1))} className="rounded-lg border border-slate-200 px-3 py-1.5 font-black disabled:opacity-40">Previous</button><span>Page {data.curPage} of {data.pageTotal}</span><button type="button" disabled={data.nextPage == null || loading} onClick={() => setPage(current => current + 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 font-black disabled:opacity-40">Next</button></div>
        </div>
      </section>
      <div className={`shrink-0 self-start transition-all duration-300 ease-in-out ${selectedRecord ? 'w-[40%] min-w-0 max-w-[40rem] opacity-100' : 'pointer-events-none w-0 opacity-0'}`}>
        {selectedRecord && <aside aria-label={`HCMS details for ${selectedRecord.name}`} className="flex max-h-[calc(100vh-6rem)] min-h-[620px] w-full flex-col overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-slate-100">
          <header className="shrink-0 border-b border-slate-100 px-6 py-5">
            <div className="flex items-start justify-between gap-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><span className="rounded-lg bg-slate-950 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-white">HCMS agent</span><span className={`rounded-full px-2.5 py-1 text-[8px] font-black uppercase ring-1 ${selectedRecord.status?.toLowerCase() === 'active' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-slate-100 text-slate-500 ring-slate-200'}`}>{selectedRecord.status || 'Unknown'}</span></div>
                <h2 className="mt-4 truncate text-2xl font-black tracking-tight text-slate-950">{selectedRecord.name}</h2>
                <p className="mt-2 text-[10px] font-bold text-slate-400">NPN {selectedRecord.npn || '—'} · {selectedRecord.team || 'No team'}</p>
              </div>
              <button type="button" onClick={() => setSelectedRecord(null)} aria-label="Close HCMS agent details" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500 transition hover:bg-slate-950 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
          </header>
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto bg-slate-50/60 px-6 py-6">
            <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">Agent details</p>
              <div className="mt-4 grid grid-cols-2 gap-3 text-[10px]"><div><p className="font-bold text-slate-400">Phone</p><p className="mt-1 font-black text-slate-800">{selectedRecord.phone || '—'}</p></div><div><p className="font-bold text-slate-400">Compensation</p><p className="mt-1 font-black text-slate-800">{selectedRecord.compensation == null ? '—' : `${selectedRecord.compensation}%`}</p></div><div><p className="font-bold text-slate-400">Contracted</p><p className="mt-1 font-black text-slate-800">{formatDate(selectedRecord.contracted_on)}</p></div><div><p className="font-bold text-slate-400">Agent ID</p><p className="mt-1 truncate font-black text-slate-800" title={selectedRecord.agent_id || ''}>{selectedRecord.agent_id || '—'}</p></div></div>
            </section>
            <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">Hierarchy</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-slate-50 p-3"><p className="text-[8px] font-black uppercase tracking-wider text-slate-400">Primary upline</p><div className="mt-2"><UplineCell name={selectedRecord.primaryUpline_name} npn={selectedRecord.primaryUpline_npn} /></div></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-[8px] font-black uppercase tracking-wider text-slate-400">Production upline</p><div className="mt-2"><UplineCell name={selectedRecord.productionUpline_name} npn={selectedRecord.productionUpline_npn} /></div></div></div>
            </section>
            <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
              <div className="flex items-center justify-between gap-3"><div><p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">Carrier contracts</p><p className="mt-1 text-xs font-black text-slate-800">{selectedRecord.carriers.length} carrier{selectedRecord.carriers.length === 1 ? '' : 's'}</p></div></div>
              <div className="mt-4 space-y-2">{selectedRecord.carriers.length ? selectedRecord.carriers.map(carrier => <div key={carrier.meta_policy_carrier_id || `${carrier.carrier}-${carrier.upline_npn || ''}`} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"><p className="text-[11px] font-black text-slate-900">{carrier.carrier}</p><div className="mt-2 flex items-center justify-between gap-4 text-[9px]"><span className="font-semibold text-slate-400">Carrier upline</span><span className="min-w-0 text-right font-black text-slate-700"><span className="block truncate">{carrier.upline_name || '—'}</span><span className="mt-0.5 block text-[8px] text-slate-400">{carrier.upline_npn ? `NPN ${carrier.upline_npn}` : 'No NPN'}</span></span></div></div>) : <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-[10px] font-bold text-slate-400">No carrier contracts listed</div>}</div>
            </section>
          </div>
        </aside>}
      </div>
      </div>
    </div>
  );
};
