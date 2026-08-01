import React from 'react';
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  FileText,
  Filter,
  Link2,
  Loader2,
  RefreshCcw,
  Search,
  X,
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

type AmericoFilterFieldKey =
  | 'product'
  | 'status'
  | 'hq_match'
  | 'received_date'
  | 'effective_date'
  | 'terminated_date';
type AmericoFilterFieldType = 'text' | 'select' | 'boolean' | 'number' | 'date-range' | 'nullable-date';
type AmericoFilterOp = 'ilike' | 'not ilike' | '==' | '!=' | '>' | '>=' | '<' | '<=' | 'between' | 'is null' | 'is not null';

interface AmericoFilterField {
  key: AmericoFilterFieldKey;
  label: string;
  type: AmericoFilterFieldType;
}

interface AmericoFilterRow {
  id: string;
  field: AmericoFilterFieldKey | '';
  op: AmericoFilterOp;
  value: string;
  endValue?: string;
}

interface AmericoFilterGroup {
  id: string;
  rows: AmericoFilterRow[];
}

const AMERICO_FILTER_FIELDS: AmericoFilterField[] = [
  { key: 'product', label: 'Product', type: 'text' },
  { key: 'status', label: 'Policy Status', type: 'select' },
  { key: 'hq_match', label: 'HQ Match', type: 'boolean' },
  { key: 'received_date', label: 'Received Date', type: 'date-range' },
  { key: 'effective_date', label: 'Effective Date', type: 'date-range' },
  { key: 'terminated_date', label: 'Terminated Date', type: 'nullable-date' },
];

const AMERICO_STATUS_OPTIONS = [
  'Active (inforce)',
  'Applied For',
  'Issued, not paid',
  'Lapse Pending',
  'Lapsed',
  'Canceled',
  'Cancelled',
  'Incomplete',
  'DNQ',
  'Carrier declined to issue',
  'Internal replacement',
];

const TEXT_FILTER_OPS: Array<{ op: AmericoFilterOp; label: string }> = [
  { op: 'ilike', label: 'contains' },
  { op: 'not ilike', label: 'does not contain' },
  { op: '==', label: 'equals' },
  { op: '!=', label: 'does not equal' },
];
const EXACT_FILTER_OPS: Array<{ op: AmericoFilterOp; label: string }> = [
  { op: '==', label: 'equals' },
  { op: '!=', label: 'does not equal' },
];
const NUMBER_FILTER_OPS: Array<{ op: AmericoFilterOp; label: string }> = [
  { op: '==', label: 'equals' },
  { op: '>=', label: 'is at least' },
  { op: '<=', label: 'is at most' },
  { op: '>', label: 'is greater than' },
  { op: '<', label: 'is less than' },
];
const DATE_FILTER_OPS: Array<{ op: AmericoFilterOp; label: string }> = [
  { op: 'between', label: 'is between' },
];
const NULLABLE_DATE_FILTER_OPS: Array<{ op: AmericoFilterOp; label: string }> = [
  { op: 'between', label: 'is between' },
  { op: 'is null', label: 'is empty' },
  { op: 'is not null', label: 'is not empty' },
];

const makeAmericoFilterRow = (): AmericoFilterRow => ({
  id: crypto.randomUUID(),
  field: '',
  op: 'ilike',
  value: '',
  endValue: '',
});

const makeAmericoFilterGroup = (): AmericoFilterGroup => ({
  id: crypto.randomUUID(),
  rows: [makeAmericoFilterRow()],
});

const getAmericoFilterField = (key: AmericoFilterFieldKey | '') => AMERICO_FILTER_FIELDS.find(field => field.key === key);

const getAmericoFilterOps = (key: AmericoFilterFieldKey | '') => {
  const field = getAmericoFilterField(key);
  if (field?.type === 'date-range') return DATE_FILTER_OPS;
  if (field?.type === 'nullable-date') return NULLABLE_DATE_FILTER_OPS;
  if (field?.type === 'number') return NUMBER_FILTER_OPS;
  if (field?.type === 'select' || field?.type === 'boolean') return EXACT_FILTER_OPS;
  return TEXT_FILTER_OPS;
};

const isAmericoFilterRowComplete = (row: AmericoFilterRow) => {
  if (!row.field) return false;
  if (row.op === 'is null' || row.op === 'is not null') return true;
  if (row.op === 'between') return Boolean(row.value && row.endValue);
  return Boolean(row.value.trim());
};

const getCompleteAmericoFilterGroups = (groups: AmericoFilterGroup[]) => groups
  .map(group => ({ ...group, rows: group.rows.filter(isAmericoFilterRowComplete) }))
  .filter(group => group.rows.length > 0);

const buildAmericoFilterStatements = (row: AmericoFilterRow) => {
  if (row.op === 'between') {
    return [
      {
        or: false,
        type: 'statement',
        statement: { left: { tag: 'col', operand: row.field }, op: '>=', right: { operand: row.value } },
      },
      {
        or: false,
        type: 'statement',
        statement: { left: { tag: 'col', operand: row.field }, op: '<=', right: { operand: row.endValue } },
      },
    ];
  }

  const field = getAmericoFilterField(row.field);
  const operand = row.op === 'is null' || row.op === 'is not null'
    ? null
    : field?.type === 'number'
      ? Number(row.value)
      : field?.type === 'boolean'
        ? row.value === 'true'
        : row.op === 'ilike' || row.op === 'not ilike'
          ? `%${row.value.trim()}%`
          : row.value.trim();

  return [{
    or: false,
    type: 'statement',
    statement: {
      left: { tag: 'col', operand: row.field },
      op: row.op === 'is null' ? '==' : row.op === 'is not null' ? '!=' : row.op,
      right: { operand },
    },
  }];
};

const buildAmericoFilterExpression = (groups: AmericoFilterGroup[]): Record<string, unknown> => ({
  expression: getCompleteAmericoFilterGroups(groups).map((group, groupIndex) => ({
    or: groupIndex > 0,
    type: 'group',
    group: { expression: group.rows.flatMap(buildAmericoFilterStatements) },
  })),
});

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

const agentInitials = (name: string) => {
  const formattedName = formatCarrierName(name).trim();
  const parts = formattedName.split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const agentAvatarTones = [
  'bg-amber-400 text-slate-950',
  'bg-sky-600 text-white',
  'bg-violet-600 text-white',
  'bg-emerald-600 text-white',
];

export const AmericoPoliciesWorkspace: React.FC<{
  agentId?: string;
  timeframe?: AmericoPoliciesTimeframe;
  startDate?: number;
  endDate?: number;
  profileStatus?: AmericoProfileStatus;
  profileErrorMessage?: string | null;
  carrierName?: string;
  loadPolicies?: typeof americoReconciliationApi.getPolicies;
  statusOptions?: string[];
}> = ({
  agentId,
  timeframe = 'all',
  startDate,
  endDate,
  profileStatus,
  profileErrorMessage,
  carrierName = 'Americo',
  loadPolicies = americoReconciliationApi.getPolicies,
  statusOptions = AMERICO_STATUS_OPTIONS,
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
  const [filterGroups, setFilterGroups] = React.useState<AmericoFilterGroup[]>([makeAmericoFilterGroup()]);
  const [appliedFilterGroups, setAppliedFilterGroups] = React.useState<AmericoFilterGroup[]>([]);
  const [showFilters, setShowFilters] = React.useState(false);
  const [sortField, setSortField] = React.useState<SortField>('received_date');
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('desc');
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [drawerPolicy, setDrawerPolicy] = React.useState<AmericoPolicy | null>(null);
  const [drawerVisible, setDrawerVisible] = React.useState(false);
  const drawerRef = React.useRef<HTMLElement>(null);
  const drawerCloseTimerRef = React.useRef<number | null>(null);
  const resolvedProfileStatus = profileStatus ?? localProfileStatus;

  const openHqPolicyDrawer = (policy: AmericoPolicy) => {
    if (drawerCloseTimerRef.current !== null) {
      window.clearTimeout(drawerCloseTimerRef.current);
      drawerCloseTimerRef.current = null;
    }
    setDrawerPolicy(policy);
    window.requestAnimationFrame(() => setDrawerVisible(true));
  };

  const closeHqPolicyDrawer = React.useCallback(() => {
    if (drawerCloseTimerRef.current !== null) window.clearTimeout(drawerCloseTimerRef.current);
    setDrawerVisible(false);
    drawerCloseTimerRef.current = window.setTimeout(() => {
      setDrawerPolicy(null);
      drawerCloseTimerRef.current = null;
    }, 300);
  }, []);

  React.useEffect(() => {
    if (!drawerPolicy) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeHqPolicyDrawer();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [drawerPolicy, closeHqPolicyDrawer]);

  React.useEffect(() => {
    if (!drawerPolicy || !drawerVisible) return;
    const handleOutsidePointer = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (drawerRef.current?.contains(target)) return;
      if (target.closest('[data-hq-policy-trigger="true"]')) return;
      closeHqPolicyDrawer();
    };
    document.addEventListener('pointerdown', handleOutsidePointer);
    return () => document.removeEventListener('pointerdown', handleOutsidePointer);
  }, [drawerPolicy, drawerVisible, closeHqPolicyDrawer]);

  React.useEffect(() => () => {
    if (drawerCloseTimerRef.current !== null) window.clearTimeout(drawerCloseTimerRef.current);
  }, []);

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
  }, [effectiveAgentId, timeframe, startDate, endDate, appliedFilterGroups, sortField, sortDirection, perPage]);

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
    loadPolicies({
      agentId: effectiveAgentId,
      page,
      perPage,
      search,
      sort: { [sortField]: sortDirection },
      filter: buildAmericoFilterExpression(appliedFilterGroups),
      timeframe,
      startDate: toRequestDate(startDate),
      endDate: toRequestDate(endDate),
    }, controller.signal)
      .then(setData)
      .catch(fetchError => {
        if (fetchError instanceof DOMException && fetchError.name === 'AbortError') return;
        setData(null);
        setError(fetchError instanceof Error ? fetchError.message : `Failed to load ${carrierName} policies`);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [
    effectiveAgentId, page, perPage, search, sortField, sortDirection,
    appliedFilterGroups, timeframe, startDate, endDate, refreshKey, resolvedProfileStatus, loadPolicies, carrierName,
  ]);

  const activeFilters = getCompleteAmericoFilterGroups(appliedFilterGroups)
    .reduce((total, group) => total + group.rows.length, 0);

  const updateFilterRow = (groupId: string, rowId: string, updates: Partial<AmericoFilterRow>) => {
    setFilterGroups(current => current.map(group => group.id !== groupId ? group : {
      ...group,
      rows: group.rows.map(row => row.id !== rowId ? row : { ...row, ...updates }),
    }));
  };

  const addFilterRow = (groupId: string) => {
    setFilterGroups(current => current.map(group => group.id !== groupId ? group : {
      ...group,
      rows: [...group.rows, makeAmericoFilterRow()],
    }));
  };

  const removeFilterRow = (groupId: string, rowId: string) => {
    setFilterGroups(current => current.map(group => group.id !== groupId ? group : {
      ...group,
      rows: group.rows.length > 1 ? group.rows.filter(row => row.id !== rowId) : [makeAmericoFilterRow()],
    }));
  };

  const duplicateFilterGroup = (group: AmericoFilterGroup) => {
    setFilterGroups(current => [...current, {
      id: crypto.randomUUID(),
      rows: group.rows.map(row => ({ ...row, id: crypto.randomUUID() })),
    }]);
  };

  const removeFilterGroup = (groupId: string) => {
    setFilterGroups(current => current.length > 1
      ? current.filter(group => group.id !== groupId)
      : [makeAmericoFilterGroup()]);
  };

  const clearFilters = () => {
    setFilterGroups([makeAmericoFilterGroup()]);
    setAppliedFilterGroups([]);
    setPage(1);
  };

  const applyFilters = () => {
    setAppliedFilterGroups(getCompleteAmericoFilterGroups(filterGroups));
    setPage(1);
    setShowFilters(false);
  };

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
    <div
      className={`grid items-start gap-4 transition-[grid-template-columns] duration-300 ease-out ${
        drawerPolicy
          ? 'xl:grid-cols-[minmax(0,1fr)_24rem]'
          : 'xl:grid-cols-[minmax(0,1fr)_0rem]'
      }`}
    >
      <section className="min-w-0 overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
            <FileText className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h3 className="text-sm font-black tracking-tight text-slate-950">{carrierName} Policies</h3>
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
              aria-label={`Search ${carrierName} policies`}
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-xs font-semibold text-slate-900 outline-none transition focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-100"
            />
          </label>
          <button
            type="button"
            onClick={() => setShowFilters(true)}
            disabled={resolvedProfileStatus !== 'available'}
            aria-label={`Open advanced filters for ${carrierName} policies`}
            className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border px-3 text-[9px] font-black uppercase tracking-widest transition-all disabled:opacity-50 ${
              activeFilters > 0
                ? 'border-slate-950 bg-slate-950 text-white shadow-lg shadow-slate-950/10'
                : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-950'
            }`}
          >
            <Filter className="h-4 w-4" />
            Advanced Filter
            {activeFilters > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-violet-500 px-1.5 text-[9px] text-white">
                {activeFilters}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setRefreshKey(key => key + 1)}
            disabled={loading || !effectiveAgentId || resolvedProfileStatus !== 'available'}
            aria-label={`Refresh ${carrierName} policies`}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-950 disabled:opacity-50"
          >
            <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[1160px]">
          <div className="grid grid-cols-[1.15fr_.9fr_1.2fr_1.2fr_.75fr_.8fr_.85fr_1fr] gap-4 border-b border-slate-100 bg-slate-50/80 px-5 py-3 text-[9px] font-black uppercase tracking-[0.14em]">
            <span>{headerButton('Client', 'client')}</span>
            <span>{headerButton('Policy', 'policy_number')}</span>
            <span className="text-slate-400">Writing Agent</span>
            <span className="text-slate-400">Product</span>
            <span>{headerButton('Annual Premium', 'annual_premium')}</span>
            <span>{headerButton('Effective', 'effective_date')}</span>
            <span className="text-slate-400">Termination</span>
            <span className="text-slate-400">Status</span>
          </div>

          {resolvedProfileStatus === 'checking' ? (
            <div className="flex min-h-64 items-center justify-center gap-2 text-sm font-bold text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin text-violet-500" />
              Checking {carrierName} profile...
            </div>
          ) : resolvedProfileStatus === 'missing' ? (
            <div className="flex min-h-64 items-center justify-center p-8">
              <div className="max-w-sm text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-100 bg-amber-50 text-amber-600">
                  <CircleAlert className="h-5 w-5" />
                </div>
                <h4 className="mt-3 text-sm font-black text-slate-950">No {carrierName} producer profile</h4>
                <p className="mt-1.5 text-xs font-semibold text-slate-500">
                  Policies are not requested until this agent has a {carrierName} profile. If you are contracted with {carrierName}, please contact support so we can connect your producer profile.
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
                <h4 className="mt-3 text-sm font-black text-slate-950">{carrierName} profile could not be checked</h4>
                <p className="mt-1.5 text-xs font-semibold text-slate-500">
                  {profileErrorMessage || 'The policy request was skipped to prevent an invalid carrier lookup.'}
                </p>
              </div>
            </div>
          ) : loading && !data ? (
            <div className="flex min-h-64 items-center justify-center gap-2 text-sm font-bold text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin text-violet-500" />
              Loading {carrierName} policies...
            </div>
          ) : error ? (
            <div className="flex min-h-64 items-center justify-center p-8">
              <div className="max-w-sm text-center">
                <CircleAlert className="mx-auto h-7 w-7 text-rose-500" />
                <h4 className="mt-3 text-sm font-black text-slate-950">{carrierName} policies could not be loaded</h4>
                <p className="mt-1.5 text-xs font-semibold text-slate-500">{error}</p>
                <button type="button" onClick={() => setRefreshKey(key => key + 1)} className="mt-4 rounded-xl bg-slate-950 px-4 py-2 text-xs font-black text-white">
                  Try again
                </button>
              </div>
            </div>
          ) : data?.items.length ? (
            <div className={loading ? 'opacity-60' : ''}>
              {data.items.map(policy => (
                <div key={policy.id} className="grid grid-cols-[1.15fr_.9fr_1.2fr_1.2fr_.75fr_.8fr_.85fr_1fr] items-center gap-4 border-b border-slate-100 px-5 py-3 text-xs transition last:border-b-0 hover:bg-slate-50/70">
                  <div className="min-w-0">
                    <p className="truncate font-black text-slate-900">{policy.client || 'Unnamed client'}</p>
                    <p className="mt-0.5 text-[9px] font-bold text-slate-400">Received {formatPolicyDate(policy.receivedDate)}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-mono text-[11px] font-black text-slate-700">{policy.policyNumber || '—'}</p>
                    {policy.hqPolicies.length > 0 && (
                      <button
                        type="button"
                        onClick={() => openHqPolicyDrawer(policy)}
                        data-hq-policy-trigger="true"
                        aria-label={`View ${policy.hqPolicies.length} HQ matched ${policy.hqPolicies.length === 1 ? 'policy' : 'policies'} for ${policy.client}`}
                        className="mt-1 inline-flex items-center gap-1 rounded-full bg-violet-50 px-1.5 py-0.5 text-[8px] font-black uppercase text-violet-700 ring-1 ring-inset ring-violet-200 transition hover:bg-violet-100"
                      >
                        <Link2 className="h-2.5 w-2.5" />
                        HQ matched
                        <span className="rounded-full bg-violet-600 px-1 text-[7px] text-white">{policy.hqPolicies.length}</span>
                      </button>
                    )}
                  </div>
                  <div className="min-w-0">
                    {policy.agents.length ? (
                      <div className="flex min-h-8 items-center -space-x-2 pl-1" aria-label={`Writing agents: ${writingAgentLabel(policy)}`}>
                        {policy.agents.slice(0, 4).map((agent, index) => {
                          const fullName = formatCarrierName(agent.name) || 'Unknown agent';
                          const producerNumber = agent.carrierAgentNumber || policy.agentNumbers[index] || 'No producer number';
                          return (
                            <span
                              key={`${agent.carrierAgentNumber || agent.name}-${index}`}
                              className="group relative inline-flex shrink-0 hover:z-30 focus-within:z-30"
                            >
                              <button
                                type="button"
                                aria-label={`${fullName}, ${producerNumber}`}
                                className={`flex h-8 w-8 items-center justify-center rounded-full text-[9px] font-black ring-2 ring-white shadow-sm transition hover:-translate-y-0.5 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-violet-400 ${agentAvatarTones[index % agentAvatarTones.length]}`}
                              >
                                {agentInitials(agent.name)}
                              </button>
                              <span className="pointer-events-none absolute bottom-full left-1/2 z-40 mb-2 w-max max-w-52 -translate-x-1/2 translate-y-1 rounded-xl bg-slate-950 px-3 py-2 text-left opacity-0 shadow-xl transition-all duration-150 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100">
                                <span className="block truncate text-[10px] font-black text-white">{fullName}</span>
                                <span className="mt-0.5 block font-mono text-[8px] font-bold text-slate-300">{producerNumber}</span>
                                {agent.splitLevel && <span className="mt-1 block text-[8px] font-bold text-slate-300">Level {agent.splitLevel}</span>}
                                {agent.split !== null && agent.split !== undefined && <span className="block text-[8px] font-bold text-slate-300">Split {agent.split}%</span>}
                              </span>
                            </span>
                          );
                        })}
                        {policy.agents.length > 4 && (
                          <span className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-[9px] font-black text-slate-600 ring-2 ring-white">
                            +{policy.agents.length - 4}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-400">Not provided</span>
                    )}
                    <p className="mt-0.5 truncate font-mono text-[9px] font-bold text-slate-400">{policy.agentNumbers.join(' · ') || '—'}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-bold text-slate-700" title={policy.product}>{policy.product || '—'}</p>
                    {policy.productDescription && policy.productDescription !== policy.product && (
                      <p className="mt-0.5 truncate text-[9px] font-bold text-slate-400" title={policy.productDescription}>{policy.productDescription}</p>
                    )}
                  </div>
                  <p className="font-black text-slate-900">{formatMoney(policy.annualPremium)}</p>
                  <p className="font-bold text-slate-600">{formatPolicyDate(policy.effectiveDate)}</p>
                  <div className="min-w-0">
                    {policy.terminatedDate ? (
                      <span className="inline-flex max-w-full rounded-lg bg-rose-50 px-2 py-1 text-[9px] font-black text-rose-700 ring-1 ring-inset ring-rose-200">
                        {formatPolicyDate(policy.terminatedDate)}
                      </span>
                    ) : (
                      <span className="font-bold text-slate-300">&mdash;</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className={`inline-flex max-w-full truncate rounded-full px-2 py-1 text-[9px] font-black ring-1 ring-inset ${statusTone(policy.status)}`} title={policy.status}>{policy.status}</span>
                    {policy.paidToDate && <p className="mt-1 text-[8px] font-bold text-emerald-600">Paid through {formatPolicyDate(policy.paidToDate)}</p>}
                    {policy.statusDescription && policy.statusDescription !== policy.status && (
                      <p className="mt-1 truncate text-[8px] font-bold text-slate-400" title={policy.statusDescription}>{policy.statusDescription}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex min-h-64 items-center justify-center p-8">
              <div className="max-w-sm text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-100 bg-violet-50 text-violet-500"><FileText className="h-5 w-5" /></div>
                <h4 className="mt-3 text-sm font-black text-slate-950">No {carrierName} policies found</h4>
                <p className="mt-1.5 text-xs font-semibold text-slate-500">Try a different date range, filter, or search.</p>
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
          <button type="button" onClick={() => setPage(data?.prevPage || Math.max(1, page - 1))} disabled={!data?.prevPage || loading} aria-label={`Previous ${carrierName} policy page`} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:text-slate-950 disabled:opacity-30">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-24 text-center text-[10px] font-black text-slate-600">Page {currentPage} of {totalPages}</span>
          <button type="button" onClick={() => setPage(data?.nextPage || Math.min(totalPages, page + 1))} disabled={!data?.nextPage || loading} aria-label={`Next ${carrierName} policy page`} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:text-slate-950 disabled:opacity-30">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      </section>

      <div className="sticky top-20 min-w-0 self-start">
        {drawerPolicy && (
          <aside
            ref={drawerRef}
            className={`flex max-h-[calc(100vh-6rem)] min-h-[32rem] w-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 shadow-xl transition-all duration-300 ease-out ${
              drawerVisible ? 'translate-x-0' : 'translate-x-full'
            }`}
            role="complementary"
            aria-label={`HQ matched policies for ${drawerPolicy.client}`}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-950 px-6 py-5 text-white">
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-violet-300">Policy Match</p>
                <h3 className="mt-1 truncate text-lg font-black">HQ policy details</h3>
                <p className="mt-1 text-xs font-semibold text-slate-300">
                  {drawerPolicy.hqPolicies.length} {drawerPolicy.hqPolicies.length === 1 ? 'record' : 'records'} linked to {drawerPolicy.policyNumber}
                </p>
              </div>
              <button
                type="button"
                onClick={closeHqPolicyDrawer}
                aria-label="Close HQ policy drawer"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/20"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="border-b border-slate-200 bg-white px-6 py-4">
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">{carrierName} record</p>
              <div className="mt-2 grid grid-cols-2 gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-wide text-amber-700">Client</p>
                  <p className="mt-1 truncate text-sm font-black text-slate-950">{drawerPolicy.client}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-wide text-amber-700">Policy</p>
                  <p className="mt-1 font-mono text-sm font-black text-slate-950">{drawerPolicy.policyNumber}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-wide text-amber-700">Annual premium</p>
                  <p className="mt-1 text-sm font-black text-slate-950">{formatMoney(drawerPolicy.annualPremium)}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-wide text-amber-700">Status</p>
                  <p className="mt-1 truncate text-sm font-black text-slate-950">{drawerPolicy.status}</p>
                </div>
              </div>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.16em] text-violet-600">PolicyHQ records</p>
                  <h4 className="mt-1 text-sm font-black text-slate-950">Matched policies</h4>
                </div>
                <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[9px] font-black text-violet-700">
                  {drawerPolicy.hqPolicies.length} matched
                </span>
              </div>

              {drawerPolicy.hqPolicies.map((hqPolicy, index) => (
                <article key={hqPolicy.id || `${hqPolicy.policyNumber}-${index}`} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-slate-950">{hqPolicy.client || drawerPolicy.client}</p>
                      <p className="mt-1 font-mono text-[10px] font-bold text-slate-500">{hqPolicy.policyNumber || 'No policy number'}</p>
                    </div>
                    <span className={`inline-flex max-w-44 truncate rounded-full px-2 py-1 text-[8px] font-black ring-1 ring-inset ${statusTone(hqPolicy.status)}`}>
                      {hqPolicy.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-5 gap-y-4 p-4 text-xs">
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-wide text-slate-400">Carrier / product</p>
                      <p className="mt-1 font-bold text-slate-800">{hqPolicy.carrier}{hqPolicy.carrierProduct ? ` · ${hqPolicy.carrierProduct}` : ''}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-wide text-slate-400">Annual premium</p>
                      <p className="mt-1 font-black text-slate-950">{formatMoney(hqPolicy.annualPremium)}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-wide text-slate-400">Writing agent</p>
                      <p className="mt-1 font-bold text-slate-800">{hqPolicy.agentName || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-wide text-slate-400">Initial draft</p>
                      <p className="mt-1 font-bold text-slate-800">{formatPolicyDate(hqPolicy.initialDraftDate)}</p>
                    </div>
                    <div className={`rounded-xl px-3 py-2 ring-1 ring-inset ${
                      hqPolicy.paidStatus?.trim().toLowerCase() === 'paid'
                        ? 'bg-emerald-50 ring-emerald-200'
                        : 'bg-slate-50 ring-slate-200'
                    }`}>
                      <p className="text-[8px] font-black uppercase tracking-wide text-slate-400">Paid status</p>
                      <p className={`mt-1 font-black ${
                        hqPolicy.paidStatus?.trim().toLowerCase() === 'paid'
                          ? 'text-emerald-700'
                          : 'text-slate-700'
                      }`}>
                        {hqPolicy.paidStatus || 'Not set'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-wide text-slate-400">Lead source</p>
                      <p className="mt-1 font-bold text-slate-800">{hqPolicy.sourceName || 'Not provided'}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </aside>
        )}
      </div>

      {showFilters && (
        <div
          className="fixed inset-0 z-[150] bg-slate-950/20 backdrop-blur-[1px]"
          onClick={() => setShowFilters(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 right-0 z-[160] flex w-96 max-w-[calc(100vw-2rem)] flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out ${
          showFilters ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label={`Advanced filters for ${carrierName} policies`}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-950 text-white">
              <Filter className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-black text-slate-950">Advanced Filter</p>
              <p className="text-[10px] font-semibold text-slate-400">{carrierName} policy fields</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowFilters(false)}
            aria-label={`Close ${carrierName} policy filters`}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          {filterGroups.map((group, groupIndex) => (
            <div key={group.id} className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {groupIndex === 0 ? 'Filter Group' : 'Or Group'}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => duplicateFilterGroup(group)}
                    className="rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-black text-slate-500 transition hover:bg-white hover:text-slate-900"
                  >
                    Duplicate
                  </button>
                  <button
                    type="button"
                    onClick={() => removeFilterGroup(group.id)}
                    aria-label="Remove filter group"
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition hover:bg-white hover:text-rose-500"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {group.rows.map((row, rowIndex) => {
                const field = getAmericoFilterField(row.field);
                const ops = getAmericoFilterOps(row.field);
                const needsValue = row.op !== 'is null' && row.op !== 'is not null';
                return (
                  <div key={row.id} className="space-y-2 rounded-2xl border border-slate-100 bg-white p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                        {rowIndex === 0 ? 'Where' : 'And'}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFilterRow(group.id, row.id)}
                        aria-label="Remove filter condition"
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 transition hover:bg-rose-50 hover:text-rose-500"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <select
                      value={row.field}
                      onChange={event => {
                        const nextField = event.target.value as AmericoFilterFieldKey;
                        const nextOps = getAmericoFilterOps(nextField);
                        updateFilterRow(group.id, row.id, {
                          field: nextField,
                          op: nextOps[0]?.op || '==',
                          value: '',
                          endValue: '',
                        });
                      }}
                      aria-label={`${carrierName} policy filter field`}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
                    >
                      <option value="">Choose field</option>
                      {AMERICO_FILTER_FIELDS.map(option => <option key={option.key} value={option.key}>{option.label}</option>)}
                    </select>

                    {row.field && (
                      <select
                        value={row.op}
                        onChange={event => updateFilterRow(group.id, row.id, {
                          op: event.target.value as AmericoFilterOp,
                          value: '',
                          endValue: '',
                        })}
                        aria-label={`${carrierName} policy filter operator`}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
                      >
                        {ops.map(option => <option key={option.op} value={option.op}>{option.label}</option>)}
                      </select>
                    )}

                    {needsValue && field?.type === 'select' && (
                      <select
                        value={row.value}
                        onChange={event => updateFilterRow(group.id, row.id, { value: event.target.value })}
                        aria-label={`${carrierName} policy status filter value`}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
                      >
                        <option value="">Choose status</option>
                        {statusOptions.map(status => <option key={status} value={status}>{status}</option>)}
                      </select>
                    )}

                    {needsValue && field?.type === 'boolean' && (
                      <select
                        value={row.value}
                        onChange={event => updateFilterRow(group.id, row.id, { value: event.target.value })}
                        aria-label={`${carrierName} policy HQ match filter value`}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
                      >
                        <option value="">Choose boolean</option>
                        <option value="true">True</option>
                        <option value="false">False</option>
                      </select>
                    )}

                    {needsValue && (field?.type === 'text' || field?.type === 'number') && (
                      <input
                        type={field.type === 'number' ? 'number' : 'text'}
                        min={field.type === 'number' ? 0 : undefined}
                        step={field.type === 'number' ? '0.01' : undefined}
                        value={row.value}
                        onChange={event => updateFilterRow(group.id, row.id, { value: event.target.value })}
                        placeholder={field.type === 'number' ? 'Enter amount...' : 'Enter value...'}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
                      />
                    )}

                    {needsValue && (field?.type === 'date-range' || field?.type === 'nullable-date') && (
                      <div className="grid grid-cols-2 gap-2">
                        <label className="space-y-1">
                          <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">From</span>
                          <input
                            type="date"
                            value={row.value}
                            onChange={event => updateFilterRow(group.id, row.id, { value: event.target.value })}
                            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-2 text-[10px] font-bold text-slate-700 outline-none focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
                          />
                        </label>
                        <label className="space-y-1">
                          <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">To</span>
                          <input
                            type="date"
                            value={row.endValue || ''}
                            onChange={event => updateFilterRow(group.id, row.id, { endValue: event.target.value })}
                            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-2 text-[10px] font-bold text-slate-700 outline-none focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
                          />
                        </label>
                      </div>
                    )}
                  </div>
                );
              })}

              <button
                type="button"
                onClick={() => addFilterRow(group.id)}
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-black text-slate-500 transition hover:border-slate-300 hover:text-slate-950"
              >
                Add AND Condition
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={() => setFilterGroups(current => [...current, makeAmericoFilterGroup()])}
            className="w-full rounded-2xl border border-dashed border-slate-300 py-3 text-xs font-black uppercase tracking-widest text-slate-500 transition hover:border-slate-400 hover:text-slate-950"
          >
            Add OR Group
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-slate-100 px-5 py-4">
          <button
            type="button"
            onClick={clearFilters}
            className="flex items-center justify-center gap-2 rounded-xl border border-rose-100 py-2.5 text-sm font-bold text-rose-500 transition hover:border-rose-200 hover:bg-rose-50"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </button>
          <button
            type="button"
            onClick={applyFilters}
            className="rounded-xl bg-slate-950 py-2.5 text-sm font-black text-white transition hover:bg-slate-800"
          >
            Apply Filters
          </button>
        </div>
      </aside>
    </div>
  );
};

export default AmericoPoliciesWorkspace;
