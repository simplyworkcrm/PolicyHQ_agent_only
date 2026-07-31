import React from 'react';
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  FileText,
  Loader2,
  RefreshCcw,
  Search,
} from 'lucide-react';
import { useAgentContext } from '../context/AgentContext';
import {
  americoReconciliationApi,
  AmericoPoliciesResponse,
  AmericoPoliciesTimeframe,
  AmericoPolicy,
} from '../services/americoReconciliationApi';

type SortField = 'received_date' | 'effective_date' | 'annual_premium' | 'client' | 'policy_number';
export type AmericoProfileStatus = 'checking' | 'available' | 'missing' | 'error';

const formatCarrierName = (value: string) => {
  const [lastName, firstName] = value.split(',').map(part => part.trim());
  return firstName && lastName ? `${firstName} ${lastName}` : value;
};

const formatMoney = (value: number) => value.toLocaleString('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const formatPolicyDate = (value: string | null) => {
  if (!value) return '—';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const toRequestDate = (value: number | undefined) => {
  if (value === undefined) return null;
  const date = new Date(value);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
};

const statusTone = (status: string) => {
  const normalized = status.toLowerCase();
  if (normalized.includes('active') || normalized.includes('inforce')) return 'bg-emerald-50 text-emerald-700 ring-emerald-600/10';
  if (normalized.includes('pending') || normalized.includes('incomplete')) return 'bg-amber-50 text-amber-700 ring-amber-600/10';
  if (normalized.includes('lapse') || normalized.includes('cancel') || normalized.includes('declin') || normalized === 'dnq') {
    return 'bg-rose-50 text-rose-700 ring-rose-600/10';
  }
  return 'bg-slate-100 text-slate-600 ring-slate-500/10';
};

const writingAgentLabel = (policy: AmericoPolicy) => {
  const names = policy.agents.map(agent => formatCarrierName(agent.name)).filter(Boolean);
  return names.join(', ') || 'Not provided';
};

export const AmericoPoliciesWorkspace: React.FC<{
  agentId?: string;
  timeframe?: AmericoPoliciesTimeframe;
  startDate?: number;
  endDate?: number;
  profileStatus?: AmericoProfileStatus;
  profileErrorMessage?: string | null;
}> = ({
  agentId,
  timeframe = 'all',
  startDate,
  endDate,
  profileStatus,
  profileErrorMessage,
}) => {
  const { currentAgentId } = useAgentContext();
  const effectiveAgentId = agentId || currentAgentId;
  const [localProfileStatus, setLocalProfileStatus] = React.useState<AmericoProfileStatus>('checking');
  const [data, setData] = React.useState<AmericoPoliciesResponse | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(25);
  const [searchInput, setSearchInput] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');
  const [sortField, setSortField] = React.useState<SortField>('received_date');
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('desc');
  const [refreshKey, setRefreshKey] = React.useState(0);
  const resolvedProfileStatus = profileStatus ?? localProfileStatus;

  React.useEffect(() => {
    if (profileStatus !== undefined) return;
    if (!effectiveAgentId) {
      setLocalProfileStatus('missing');
      return;
    }

    const controller = new AbortController();
    setLocalProfileStatus('checking');
    americoReconciliationApi.getProfiles(effectiveAgentId, controller.signal)
      .then(profiles => setLocalProfileStatus(profiles.length > 0 ? 'available' : 'missing'))
      .catch(profileError => {
        if (profileError instanceof DOMException && profileError.name === 'AbortError') return;
        setLocalProfileStatus('error');
      });

    return () => controller.abort();
  }, [effectiveAgentId, profileStatus]);

  React.useEffect(() => {
    const timeout = window.setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  React.useEffect(() => {
    setPage(1);
  }, [effectiveAgentId, timeframe, startDate, endDate, statusFilter, sortField, sortDirection, perPage]);

  React.useEffect(() => {
    if (!effectiveAgentId || resolvedProfileStatus !== 'available') {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }
    if (timeframe === 'custom' && (startDate === undefined || endDate === undefined)) {
      setData(null);
      setError(null);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);
    americoReconciliationApi.getPolicies({
      agentId: effectiveAgentId,
      page,
      perPage,
      search,
      sort: { [sortField]: sortDirection },
      filter: statusFilter ? { status: statusFilter } : {},
      timeframe,
      startDate: toRequestDate(startDate),
      endDate: toRequestDate(endDate),
    }, controller.signal)
      .then(setData)
      .catch(fetchError => {
        if (fetchError instanceof DOMException && fetchError.name === 'AbortError') return;
        setData(null);
        setError(fetchError instanceof Error ? fetchError.message : 'Failed to load Americo policies');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [
    effectiveAgentId, page, perPage, search, sortField, sortDirection,
    statusFilter, timeframe, startDate, endDate, refreshKey, resolvedProfileStatus,
  ]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDirection(direction => direction === 'asc' ? 'desc' : 'asc');
    else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const totalPremium = React.useMemo(
    () => (data?.items || []).reduce((sum, policy) => sum + policy.annualPremium, 0),
    [data],
  );
  const currentPage = data?.curPage || page;
  const totalPages = Math.max(data?.pageTotal || 1, 1);

  const headerButton = (label: string, field: SortField) => (
    <button
      type="button"
      onClick={() => toggleSort(field)}
      className={`inline-flex items-center gap-1 text-left transition hover:text-slate-800 ${sortField === field ? 'text-slate-800' : 'text-slate-400'}`}
    >
      {label}
      <ArrowUpDown className="h-3 w-3" />
    </button>
  );

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
            <FileText className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h3 className="text-sm font-black tracking-tight text-slate-950">Americo Policies</h3>
              <span className="text-[9px] font-black uppercase tracking-[0.14em] text-violet-600">
                {(data?.itemsTotal || 0).toLocaleString()} records
              </span>
            </div>
            <p className="mt-0.5 truncate text-[10px] font-semibold text-slate-500">
              Page premium {formatMoney(totalPremium)} · Live carrier records for the selected agent
            </p>
          </div>
        </div>

        <div className="flex w-full flex-col gap-2 sm:flex-row xl:w-auto">
          <label className="relative block min-w-0 flex-1 xl:w-80">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchInput}
              onChange={event => setSearchInput(event.target.value)}
              disabled={resolvedProfileStatus !== 'available'}
              placeholder="Search client, policy, or agent..."
              aria-label="Search Americo policies"
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-xs font-semibold text-slate-900 outline-none transition focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-100"
            />
          </label>
          <select
            value={statusFilter}
            onChange={event => setStatusFilter(event.target.value)}
            disabled={resolvedProfileStatus !== 'available'}
            aria-label="Filter Americo policies by status"
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
          >
            <option value="">All statuses</option>
            <option value="Active (inforce)">Active (inforce)</option>
            <option value="Lapse Pending">Lapse Pending</option>
            <option value="Lapsed">Lapsed</option>
            <option value="Canceled">Canceled</option>
            <option value="Incomplete">Incomplete</option>
            <option value="DNQ">DNQ</option>
            <option value="Carrier declined to issue">Carrier declined</option>
          </select>
          <button
            type="button"
            onClick={() => setRefreshKey(key => key + 1)}
            disabled={loading || !effectiveAgentId || resolvedProfileStatus !== 'available'}
            aria-label="Refresh Americo policies"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-950 disabled:opacity-50"
          >
            <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[1050px]">
          <div className="grid grid-cols-[1.15fr_.9fr_1.25fr_1.25fr_.75fr_.85fr_1fr] gap-4 border-b border-slate-100 bg-slate-50/80 px-5 py-3 text-[9px] font-black uppercase tracking-[0.14em]">
            <span>{headerButton('Client', 'client')}</span>
            <span>{headerButton('Policy', 'policy_number')}</span>
            <span className="text-slate-400">Writing Agent</span>
            <span className="text-slate-400">Product</span>
            <span>{headerButton('Annual Premium', 'annual_premium')}</span>
            <span>{headerButton('Effective', 'effective_date')}</span>
            <span className="text-slate-400">Status</span>
          </div>

          {resolvedProfileStatus === 'checking' ? (
            <div className="flex min-h-64 items-center justify-center gap-2 text-sm font-bold text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin text-violet-500" />
              Checking Americo profile...
            </div>
          ) : resolvedProfileStatus === 'missing' ? (
            <div className="flex min-h-64 items-center justify-center p-8">
              <div className="max-w-sm text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-100 bg-amber-50 text-amber-600">
                  <CircleAlert className="h-5 w-5" />
                </div>
                <h4 className="mt-3 text-sm font-black text-slate-950">No Americo producer profile</h4>
                <p className="mt-1.5 text-xs font-semibold text-slate-500">
                  Policies are not requested until this agent has an Americo profile. If you are contracted with Americo, please contact support so we can connect your producer profile.
                </p>
                <a
                  href="#/tickets"
                  className="mt-4 inline-flex rounded-xl bg-slate-950 px-4 py-2 text-xs font-black text-white transition hover:bg-slate-800"
                >
                  Contact Support
                </a>
              </div>
            </div>
          ) : resolvedProfileStatus === 'error' ? (
            <div className="flex min-h-64 items-center justify-center p-8">
              <div className="max-w-sm text-center">
                <CircleAlert className="mx-auto h-7 w-7 text-rose-500" />
                <h4 className="mt-3 text-sm font-black text-slate-950">Americo profile could not be checked</h4>
                <p className="mt-1.5 text-xs font-semibold text-slate-500">
                  {profileErrorMessage || 'The policy request was skipped to prevent an invalid carrier lookup.'}
                </p>
              </div>
            </div>
          ) : loading && !data ? (
            <div className="flex min-h-64 items-center justify-center gap-2 text-sm font-bold text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin text-violet-500" />
              Loading Americo policies...
            </div>
          ) : error ? (
            <div className="flex min-h-64 items-center justify-center p-8">
              <div className="max-w-sm text-center">
                <CircleAlert className="mx-auto h-7 w-7 text-rose-500" />
                <h4 className="mt-3 text-sm font-black text-slate-950">Americo policies could not be loaded</h4>
                <p className="mt-1.5 text-xs font-semibold text-slate-500">{error}</p>
                <button type="button" onClick={() => setRefreshKey(key => key + 1)} className="mt-4 rounded-xl bg-slate-950 px-4 py-2 text-xs font-black text-white">
                  Try again
                </button>
              </div>
            </div>
          ) : data?.items.length ? (
            <div className={loading ? 'opacity-60' : ''}>
              {data.items.map(policy => (
                <div key={policy.id} className="grid grid-cols-[1.15fr_.9fr_1.25fr_1.25fr_.75fr_.85fr_1fr] items-center gap-4 border-b border-slate-100 px-5 py-3 text-xs transition last:border-b-0 hover:bg-slate-50/70">
                  <div className="min-w-0">
                    <p className="truncate font-black text-slate-900">{policy.client || 'Unnamed client'}</p>
                    <p className="mt-0.5 text-[9px] font-bold text-slate-400">Received {formatPolicyDate(policy.receivedDate)}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-mono text-[11px] font-black text-slate-700">{policy.policyNumber || '—'}</p>
                    {policy.hqPolicies.length > 0 && <span className="mt-1 inline-flex rounded-full bg-violet-50 px-1.5 py-0.5 text-[8px] font-black uppercase text-violet-700">HQ matched</span>}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-bold text-slate-700" title={writingAgentLabel(policy)}>{writingAgentLabel(policy)}</p>
                    <p className="mt-0.5 truncate font-mono text-[9px] font-bold text-slate-400">{policy.agentNumbers.join(' · ') || '—'}</p>
                  </div>
                  <p className="min-w-0 truncate font-bold text-slate-700" title={policy.product}>{policy.product || '—'}</p>
                  <p className="font-black text-slate-900">{formatMoney(policy.annualPremium)}</p>
                  <p className="font-bold text-slate-600">{formatPolicyDate(policy.effectiveDate)}</p>
                  <div className="min-w-0">
                    <span className={`inline-flex max-w-full truncate rounded-full px-2 py-1 text-[9px] font-black ring-1 ring-inset ${statusTone(policy.status)}`} title={policy.status}>{policy.status}</span>
                    {policy.terminatedDate && <p className="mt-1 text-[8px] font-bold text-slate-400">Ended {formatPolicyDate(policy.terminatedDate)}</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex min-h-64 items-center justify-center p-8">
              <div className="max-w-sm text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-100 bg-violet-50 text-violet-500"><FileText className="h-5 w-5" /></div>
                <h4 className="mt-3 text-sm font-black text-slate-950">No Americo policies found</h4>
                <p className="mt-1.5 text-xs font-semibold text-slate-500">Try a different date range, status, or search.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
          <span>{(data?.itemsTotal || 0).toLocaleString()} total</span>
          <span className="text-slate-300">·</span>
          <label className="flex items-center gap-2">
            Per page
            <select value={perPage} onChange={event => setPerPage(Number(event.target.value))} className="h-8 rounded-lg border border-slate-200 bg-white px-2 font-black text-slate-700 outline-none">
              {[10, 25, 50, 100].map(option => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setPage(data?.prevPage || Math.max(1, page - 1))} disabled={!data?.prevPage || loading} aria-label="Previous Americo policy page" className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:text-slate-950 disabled:opacity-30">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-24 text-center text-[10px] font-black text-slate-600">Page {currentPage} of {totalPages}</span>
          <button type="button" onClick={() => setPage(data?.nextPage || Math.min(totalPages, page + 1))} disabled={!data?.nextPage || loading} aria-label="Next Americo policy page" className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:text-slate-950 disabled:opacity-30">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
};

export default AmericoPoliciesWorkspace;
