import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, Building2, ChevronDown, ChevronUp, Columns3, Eye, EyeOff, GripVertical, Loader2, RotateCcw, Search, X } from 'lucide-react';
import { buildSwcrmFilter, SwcrmListResponse, SwcrmLocation, SwcrmQuickFilter, SWCRM_NULL_FILTER_VALUE, swcrmApi } from '../services/swcrmApi';
import { QuickEditMenu } from './QuickEditMenu';

type SwcrmColumnKey = keyof SwcrmLocation;
type SortField = SwcrmColumnKey;
type SortDirection = 'asc' | 'desc';

const COLUMN_OPTIONS: Array<{ value: SwcrmColumnKey; label: string; width: number }> = [
  { value: 'id', label: 'id', width: 260 },
  { value: 'created_at', label: 'created_at', width: 170 },
  { value: 'account_type', label: 'account_type', width: 140 },
  { value: 'location_id', label: 'location_id', width: 210 },
  { value: 'name', label: 'name', width: 230 },
  { value: 'email', label: 'email', width: 230 },
  { value: 'saas_mode', label: 'saas_mode', width: 145 },
  { value: 'stripe_customerId', label: 'stripe_customerId', width: 180 },
  { value: 'subscription_plan', label: 'subscription_plan', width: 220 },
  { value: 'subscription_status', label: 'subscription_status', width: 165 },
  { value: 'isPaused', label: 'isPaused', width: 110 },
  { value: 'pause_message', label: 'pause_message', width: 260 },
  { value: 'PIT', label: 'PIT', width: 180 },
  { value: 'pit_status', label: 'pit_status', width: 115 },
  { value: 'pit_message', label: 'pit_message', width: 260 },
  { value: 'lastUpdated', label: 'lastUpdated', width: 170 },
];
const DEFAULT_VISIBLE_COLUMNS: SwcrmColumnKey[] = ['name', 'email', 'account_type', 'saas_mode', 'subscription_plan', 'subscription_status', 'isPaused', 'pit_status', 'lastUpdated'];
const COLUMN_STORAGE_KEY = 'swcrm_visible_columns';
const COLUMN_ORDER_STORAGE_KEY = 'swcrm_column_order';

const DEFAULT_ACCOUNT_TYPE_OPTIONS = [SWCRM_NULL_FILTER_VALUE, 'agency', 'agent secondary', 'individual', 'lead hub'];
const DEFAULT_SAAS_MODE_OPTIONS = [SWCRM_NULL_FILTER_VALUE, 'activated', 'not_activated', 'setup_pending'];
const DEFAULT_SUBSCRIPTION_PLAN_OPTIONS = [SWCRM_NULL_FILTER_VALUE, 'Activation Set Up', 'Phone Maintenance Plan ($10)', 'Simplywork CRM - Eliteone', 'SimplyWork CRM - Legacy', 'Simplywork CRM - MAIN', 'The Dollar Menu Edition (McDonalds)'];
const emptyFilter = (): SwcrmQuickFilter => ({ locationId: '', accountType: [], saasMode: [], subscriptionPlan: [], paused: '', pitStatus: '' });
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

const ColumnVisibilityMenu = ({ visible, order, onChange, onOrderChange }: {
  visible: SwcrmColumnKey[];
  order: SwcrmColumnKey[];
  onChange: (columns: SwcrmColumnKey[]) => void;
  onOrderChange: (columns: SwcrmColumnKey[]) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [draggedColumn, setDraggedColumn] = useState<SwcrmColumnKey | null>(null);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const openMenu = () => {
    if (!anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    setPosition({ top: rect.bottom + 8, left: Math.max(12, Math.min(rect.right - 300, window.innerWidth - 312)) });
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!menuRef.current?.contains(target) && !anchorRef.current?.contains(target)) setOpen(false);
    };
    const closeEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    const closePositionChange = () => setOpen(false);
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeEscape);
    window.addEventListener('resize', closePositionChange);
    window.addEventListener('scroll', closePositionChange, true);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeEscape);
      window.removeEventListener('resize', closePositionChange);
      window.removeEventListener('scroll', closePositionChange, true);
    };
  }, [open]);

  const moveColumn = (column: SwcrmColumnKey, direction: -1 | 1) => {
    const currentIndex = order.indexOf(column);
    const nextIndex = currentIndex + direction;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= order.length) return;
    const nextOrder = [...order];
    [nextOrder[currentIndex], nextOrder[nextIndex]] = [nextOrder[nextIndex], nextOrder[currentIndex]];
    onOrderChange(nextOrder);
  };

  const dropColumn = (target: SwcrmColumnKey) => {
    if (!draggedColumn || draggedColumn === target) return setDraggedColumn(null);
    const nextOrder = order.filter(column => column !== draggedColumn);
    nextOrder.splice(nextOrder.indexOf(target), 0, draggedColumn);
    onOrderChange(nextOrder);
    setDraggedColumn(null);
  };

  return <>
    <button ref={anchorRef} type="button" aria-haspopup="dialog" aria-expanded={open} onClick={() => open ? setOpen(false) : openMenu()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-[10px] font-black text-slate-600 transition hover:border-violet-300 hover:bg-violet-50"><Columns3 className="h-4 w-4" />Columns</button>
    {open && createPortal(<div ref={menuRef} role="dialog" aria-label="Visible SWCRM columns" style={{ position: 'fixed', top: position.top, left: position.left, width: 300 }} className="z-[1500] max-h-[70vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-900/15">
      <div className="flex items-center justify-between px-3 pb-1 pt-1"><p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">Payload columns</p><div className="flex gap-2"><button type="button" onClick={() => onChange(COLUMN_OPTIONS.map(column => column.value))} className="text-[8px] font-black uppercase text-violet-600 hover:text-violet-800">All</button><button type="button" onClick={() => { onChange(DEFAULT_VISIBLE_COLUMNS); onOrderChange(COLUMN_OPTIONS.map(column => column.value)); }} className="text-[8px] font-black uppercase text-slate-400 hover:text-slate-700">Default</button></div></div>
      <p className="px-3 pb-2 text-[8px] font-semibold text-slate-400">Drag rows or use the arrows to reorder.</p>
      <div className="space-y-0.5">{order.map((columnKey, index) => {
        const column = COLUMN_OPTIONS.find(option => option.value === columnKey)!;
        const shown = visible.includes(columnKey);
        const lastVisible = shown && visible.length === 1;
        return <div key={columnKey} onDragOver={event => event.preventDefault()} onDrop={() => dropColumn(columnKey)} className={`flex items-center rounded-xl transition ${draggedColumn === columnKey ? 'bg-violet-50 ring-1 ring-violet-200' : 'hover:bg-slate-50'}`}>
          <span draggable onDragStart={event => { event.dataTransfer.effectAllowed = 'move'; setDraggedColumn(columnKey); }} onDragEnd={() => setDraggedColumn(null)} title={`Drag ${column.label} to reorder`} className="ml-1 flex cursor-grab items-center justify-center rounded-lg p-1.5 text-slate-300 hover:bg-white hover:text-violet-500 active:cursor-grabbing"><GripVertical className="h-3.5 w-3.5" /></span>
          <button type="button" aria-pressed={shown} disabled={lastVisible} title={lastVisible ? 'At least one column must remain visible' : undefined} onClick={() => onChange(shown ? visible.filter(value => value !== columnKey) : [...visible, columnKey])} className={`flex min-w-0 flex-1 items-center gap-2.5 px-1.5 py-2 text-left text-[10px] font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${shown ? 'text-slate-800' : 'text-slate-400'}`}>{shown ? <Eye className="h-3.5 w-3.5 shrink-0" /> : <EyeOff className="h-3.5 w-3.5 shrink-0" />}<span className="truncate">{column.label}</span></button>
          <button type="button" disabled={index === 0} onClick={() => moveColumn(columnKey, -1)} aria-label={`Move ${column.label} up`} title="Move up" className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-violet-600 disabled:opacity-20"><ChevronUp className="h-3.5 w-3.5" /></button>
          <button type="button" disabled={index === order.length - 1} onClick={() => moveColumn(columnKey, 1)} aria-label={`Move ${column.label} down`} title="Move down" className="mr-1 rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-violet-600 disabled:opacity-20"><ChevronDown className="h-3.5 w-3.5" /></button>
        </div>;
      })}</div>
    </div>, document.body)}
  </>;
};

const ColumnValue = ({ location, column, accountTypeOptions, updatingAccountType, onAccountTypeChange, onVerifyPit }: {
  location: SwcrmLocation;
  column: SwcrmColumnKey;
  accountTypeOptions: string[];
  updatingAccountType: boolean;
  onAccountTypeChange: (location: SwcrmLocation, value: string) => void;
  onVerifyPit: (location: SwcrmLocation) => void;
}) => {
  if (column === 'created_at' || column === 'lastUpdated') return <span className="text-[9px] font-bold text-slate-500">{formatDateTime(location[column])}</span>;
  if (column === 'saas_mode') return <StatusPill value={location.saas_mode} kind="saas" />;
  if (column === 'subscription_status') return <StatusPill value={location.subscription_status} />;
  if (column === 'isPaused') return <span className={`inline-flex rounded-full px-2.5 py-1 text-[8px] font-black uppercase ring-1 ${location.isPaused ? 'bg-amber-50 text-amber-700 ring-amber-200' : 'bg-emerald-50 text-emerald-700 ring-emerald-200'}`}>{location.isPaused ? 'True' : 'False'}</span>;
  if (column === 'pit_status') return <span className={`inline-flex rounded-full px-2.5 py-1 text-[8px] font-black uppercase ring-1 ${location.pit_status ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-slate-100 text-slate-500 ring-slate-200'}`}>{location.pit_status ? 'True' : 'False'}</span>;
  if (column === 'PIT') return <button type="button" onClick={event => { event.stopPropagation(); onVerifyPit(location); }} className="block w-full truncate rounded-lg px-2 py-1 text-left text-[10px] font-bold text-violet-700 transition hover:bg-violet-50 hover:text-violet-900" title={location.PIT || 'Add and verify PIT'}>{location.PIT || 'Add PIT'}</button>;
  if (column === 'account_type') return <QuickEditMenu ariaLabel={`Edit account type for ${location.name}`} value={location.account_type || SWCRM_NULL_FILTER_VALUE} placeholder="Account type" options={accountTypeOptions.map(value => ({ value, label: value === SWCRM_NULL_FILTER_VALUE ? 'Null' : humanize(value) }))} disabled={updatingAccountType} title={updatingAccountType ? 'Saving account type…' : 'Edit account type'} showDots={false} onChange={value => onAccountTypeChange(location, value)} />;
  const value = location[column];
  return <span className={`block truncate text-[10px] text-slate-600 ${column === 'name' ? 'font-black text-slate-800' : 'font-bold'}`} title={value == null ? '' : String(value)}>{value == null || value === '' ? '—' : String(value)}</span>;
};

export const SwcrmWorkspace: React.FC = () => {
  const [data, setData] = useState<SwcrmListResponse>(EMPTY_RESPONSE);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [draftFilter, setDraftFilter] = useState<SwcrmQuickFilter>(emptyFilter);
  const [appliedFilter, setAppliedFilter] = useState<SwcrmQuickFilter>(emptyFilter);
  const [accountTypeOptions, setAccountTypeOptions] = useState(DEFAULT_ACCOUNT_TYPE_OPTIONS);
  const [saasModeOptions, setSaasModeOptions] = useState(DEFAULT_SAAS_MODE_OPTIONS);
  const [subscriptionPlanOptions, setSubscriptionPlanOptions] = useState(DEFAULT_SUBSCRIPTION_PLAN_OPTIONS);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedLocation, setSelectedLocation] = useState<SwcrmLocation | null>(null);
  const [pitEditorLocation, setPitEditorLocation] = useState<SwcrmLocation | null>(null);
  const [pitDraft, setPitDraft] = useState('');
  const [pitVerifying, setPitVerifying] = useState(false);
  const [pitVerificationError, setPitVerificationError] = useState('');
  const [pitVerificationSuccess, setPitVerificationSuccess] = useState(false);
  const [updatingAccountTypeId, setUpdatingAccountTypeId] = useState<string | null>(null);
  const [visibleColumns, setVisibleColumns] = useState<SwcrmColumnKey[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(COLUMN_STORAGE_KEY) || '[]');
      const validKeys = new Set(COLUMN_OPTIONS.map(column => column.value));
      const validSaved = Array.isArray(saved) ? saved.filter((value): value is SwcrmColumnKey => validKeys.has(value)) : [];
      return validSaved.length ? validSaved : DEFAULT_VISIBLE_COLUMNS;
    } catch {
      return DEFAULT_VISIBLE_COLUMNS;
    }
  });
  const [columnOrder, setColumnOrder] = useState<SwcrmColumnKey[]>(() => {
    const defaultOrder = COLUMN_OPTIONS.map(column => column.value);
    try {
      const saved = JSON.parse(localStorage.getItem(COLUMN_ORDER_STORAGE_KEY) || '[]');
      const validKeys = new Set(defaultOrder);
      const validSaved = Array.isArray(saved) ? saved.filter((value): value is SwcrmColumnKey => validKeys.has(value)) : [];
      return [...new Set([...validSaved, ...defaultOrder])];
    } catch {
      return defaultOrder;
    }
  });

  useEffect(() => {
    const controller = new AbortController();
    void Promise.all([
      swcrmApi.getAccountTypeOptions(true, controller.signal),
      swcrmApi.getSaasModeOptions(true, controller.signal),
      swcrmApi.getSubscriptionPlanOptions(true, controller.signal),
    ]).then(([accountTypes, saasModes, subscriptionPlans]) => {
      if (accountTypes.length) setAccountTypeOptions(accountTypes);
      if (saasModes.length) setSaasModeOptions(saasModes);
      if (subscriptionPlans.length) setSubscriptionPlanOptions(subscriptionPlans);
    }).catch((requestError: unknown) => {
      if ((requestError as { name?: string })?.name !== 'AbortError') {
        setAccountTypeOptions(DEFAULT_ACCOUNT_TYPE_OPTIONS);
        setSaasModeOptions(DEFAULT_SAAS_MODE_OPTIONS);
        setSubscriptionPlanOptions(DEFAULT_SUBSCRIPTION_PLAN_OPTIONS);
      }
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

  useEffect(() => {
    localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  useEffect(() => {
    localStorage.setItem(COLUMN_ORDER_STORAGE_KEY, JSON.stringify(columnOrder));
  }, [columnOrder]);

  const activeFilterCount = useMemo(() => Object.values(appliedFilter).filter(value => Array.isArray(value) ? value.length > 0 : Boolean(value)).length, [appliedFilter]);
  const showingStart = data.itemsTotal ? data.offset + 1 : 0;
  const showingEnd = Math.min(data.offset + data.itemsReceived, data.itemsTotal);
  const renderedColumns = columnOrder
    .filter(column => visibleColumns.includes(column))
    .map(column => COLUMN_OPTIONS.find(option => option.value === column)!);
  const tableMinWidth = Math.max(720, renderedColumns.reduce((total, column) => total + column.width, 0));

  const applyFilters = () => {
    setPage(1);
    setAppliedFilter({ ...draftFilter, accountType: [...(draftFilter.accountType || [])], saasMode: [...draftFilter.saasMode], subscriptionPlan: [...draftFilter.subscriptionPlan] });
  };
  const clearFilters = () => {
    setPage(1);
    setDraftFilter(emptyFilter());
    setAppliedFilter(emptyFilter());
  };
  const changeSort = (field: SortField) => {
    setPage(1);
    if (sortField === field) setSortDirection(current => current === 'asc' ? 'desc' : 'asc');
    else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const openPitEditor = (location: SwcrmLocation) => {
    setPitEditorLocation(location);
    setPitDraft(location.PIT || '');
    setPitVerificationError('');
    setPitVerificationSuccess(false);
  };

  const closePitEditor = () => {
    if (pitVerifying) return;
    setPitEditorLocation(null);
    setPitDraft('');
    setPitVerificationError('');
    setPitVerificationSuccess(false);
  };

  const verifyPit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!pitEditorLocation || !pitDraft.trim() || pitVerifying) return;
    setPitVerifying(true);
    setPitVerificationError('');
    setPitVerificationSuccess(false);
    try {
      const result = await swcrmApi.verifyPit({ is_staff: true, location_id: pitEditorLocation.location_id, pit: pitDraft.trim() });
      const updateLocation = (location: SwcrmLocation) => location.location_id === result.location_id
        ? { ...location, PIT: result.PIT, pit_status: result.pit_status, pit_message: result.pit_message }
        : location;
      setData(current => ({ ...current, items: current.items.map(updateLocation) }));
      setSelectedLocation(current => current ? updateLocation(current) : current);
      setPitEditorLocation(current => current ? updateLocation(current) : current);
      if (result.pit_status) setPitVerificationSuccess(true);
      else setPitVerificationError(result.pit_message || 'PIT verification was unsuccessful.');
    } catch (requestError) {
      setPitVerificationError(requestError instanceof Error ? requestError.message : 'PIT verification could not be completed.');
    } finally {
      setPitVerifying(false);
    }
  };

  const updateAccountType = async (location: SwcrmLocation, value: string) => {
    if (updatingAccountTypeId) return;
    const accountType = value === SWCRM_NULL_FILTER_VALUE ? null : value;
    if (accountType === location.account_type) return;
    setUpdatingAccountTypeId(location.id);
    setError('');
    try {
      await swcrmApi.updateLocation({ id: location.id, account_type: accountType });
      const updateLocation = (current: SwcrmLocation) => current.id === location.id ? { ...current, account_type: accountType } : current;
      setData(current => ({ ...current, items: current.items.map(updateLocation) }));
      setSelectedLocation(current => current ? updateLocation(current) : current);
      setPitEditorLocation(current => current ? updateLocation(current) : current);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'The account type could not be updated.');
    } finally {
      setUpdatingAccountTypeId(null);
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
            <div className="flex items-center gap-2">
              <label className="relative block min-w-[280px]">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search SWCRM locations…" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-xs font-bold text-slate-800 outline-none transition focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-50" />
              </label>
              <ColumnVisibilityMenu visible={visibleColumns} order={columnOrder} onChange={setVisibleColumns} onOrderChange={setColumnOrder} />
            </div>
          </div>

          {error && <div className="mx-5 mt-4 flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800"><span className="flex items-center gap-2"><AlertCircle className="h-4 w-4" />{error}</span><button type="button" onClick={() => setReloadKey(value => value + 1)} className="inline-flex items-center gap-1.5 font-black"><RotateCcw className="h-3.5 w-3.5" />Retry</button></div>}

          <div className="overflow-x-auto border-b border-slate-100 bg-white px-5 py-3">
            <div className="grid min-w-[1395px] grid-cols-[140px_190px_165px_165px_230px_145px_150px_142px] items-center gap-2 overflow-visible rounded-[1.35rem] border border-slate-200 bg-slate-50/70 p-1.5 shadow-sm transition focus-within:border-violet-300 focus-within:bg-white">
              <div className="flex h-full items-center gap-2 rounded-2xl px-3 text-[9px] font-black uppercase tracking-[0.16em] text-slate-500"><span className="h-2 w-2 rounded-full bg-violet-500" />Quick filter</div>
              <div className="min-w-0"><input aria-label="Filter SWCRM by location ID" value={draftFilter.locationId} onChange={event => setDraftFilter(current => ({ ...current, locationId: event.target.value }))} placeholder="Location ID equals" className="min-h-8 w-full rounded-full bg-white px-3 py-2 text-[10px] font-black text-slate-700 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-violet-300" /></div>
              <div className="min-w-0"><QuickEditMenu ariaLabel="Choose SWCRM account type filters" value="" values={draftFilter.accountType || []} multiple placeholder="Account type" options={accountTypeOptions.map(value => ({ value, label: value === SWCRM_NULL_FILTER_VALUE ? 'Null' : humanize(value) }))} showDots={false} onValuesChange={accountType => setDraftFilter(current => ({ ...current, accountType }))} /></div>
              <div className="min-w-0"><QuickEditMenu ariaLabel="Choose SWCRM SaaS mode filters" value="" values={draftFilter.saasMode} multiple placeholder="SaaS mode" options={saasModeOptions.map(value => ({ value, label: value === SWCRM_NULL_FILTER_VALUE ? 'Null' : humanize(value) }))} showDots={false} onValuesChange={saasMode => setDraftFilter(current => ({ ...current, saasMode }))} /></div>
              <div className="min-w-0 [&>button]:max-w-none"><QuickEditMenu ariaLabel="Choose SWCRM subscription plan filters" value="" values={draftFilter.subscriptionPlan} multiple searchable placeholder="Subscription plan" options={subscriptionPlanOptions.map(value => ({ value, label: value === SWCRM_NULL_FILTER_VALUE ? 'Null' : value }))} showDots={false} onValuesChange={subscriptionPlan => setDraftFilter(current => ({ ...current, subscriptionPlan }))} /></div>
              <div className="min-w-0"><QuickEditMenu ariaLabel="Choose SWCRM pause filter" value={draftFilter.paused} placeholder="Pause state" options={[{ value: '', label: 'Any pause state' }, { value: 'false', label: 'Running' }, { value: 'true', label: 'Paused' }]} showDots={false} onChange={paused => setDraftFilter(current => ({ ...current, paused: paused as SwcrmQuickFilter['paused'] }))} /></div>
              <div className="min-w-0"><QuickEditMenu ariaLabel="Choose SWCRM PIT status filter" value={draftFilter.pitStatus} placeholder="PIT status" options={[{ value: '', label: 'Any PIT status' }, { value: 'true', label: 'Connected' }, { value: 'false', label: 'Disconnected' }]} showDots={false} onChange={pitStatus => setDraftFilter(current => ({ ...current, pitStatus: pitStatus as SwcrmQuickFilter['pitStatus'] }))} /></div>
              <div className="flex items-center gap-1.5"><button type="button" onClick={clearFilters} className="inline-flex flex-1 items-center justify-center rounded-full bg-white px-3 py-2 text-[10px] font-black text-slate-500 ring-1 ring-slate-200 transition hover:bg-slate-100 hover:text-slate-900">Clear</button><button type="button" onClick={applyFilters} className="inline-flex flex-1 items-center justify-center rounded-full bg-slate-950 px-3 py-2 text-[10px] font-black text-white transition hover:-translate-y-px hover:bg-violet-500 hover:shadow-md">Apply</button></div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full table-fixed border-collapse" style={{ minWidth: tableMinWidth }}>
              <thead><tr className="border-b border-slate-100 bg-white text-left">
                {renderedColumns.map((column, index) => <th key={column.value} className={`${index === 0 ? 'px-5' : 'px-3'} py-3`} style={{ width: column.width }}><HeaderButton field={column.value} label={column.label} sortField={sortField} direction={sortDirection} onSort={changeSort} /></th>)}
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {loading && !data.items.length ? <tr><td colSpan={renderedColumns.length} className="h-56 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-violet-500" /><p className="mt-3 text-xs font-bold text-slate-400">Loading SWCRM locations…</p></td></tr>
                : data.items.length ? data.items.map(location => <tr key={location.id} tabIndex={0} aria-label={`Open details for ${location.name}`} onClick={() => setSelectedLocation(location)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedLocation(location); } }} className={`cursor-pointer transition hover:bg-violet-50/50 focus:bg-violet-50/50 focus:outline-none ${selectedLocation?.id === location.id ? 'bg-violet-50/70' : ''}`}>
                  {renderedColumns.map((column, index) => <td key={column.value} className={`${index === 0 ? 'px-5' : 'px-3'} py-3`}><ColumnValue location={location} column={column.value} accountTypeOptions={accountTypeOptions} updatingAccountType={updatingAccountTypeId === location.id} onAccountTypeChange={updateAccountType} onVerifyPit={openPitEditor} /></td>)}
                </tr>) : <tr><td colSpan={renderedColumns.length} className="h-56 text-center"><p className="text-sm font-black text-slate-700">No SWCRM locations match this view</p><p className="mt-1 text-xs font-medium text-slate-400">Try clearing the search or quick filters.</p></td></tr>}
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
              <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100"><p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">PIT</p><div className="mt-4 grid grid-cols-2 gap-4"><Detail label="PIT" value={selectedLocation.PIT} title={selectedLocation.PIT || ''} /><Detail label="PIT status" value={selectedLocation.pit_status ? 'Active' : 'Inactive'} /></div>{selectedLocation.pit_message && <div className={`mt-4 rounded-xl p-3 text-[10px] font-bold leading-4 ring-1 ${selectedLocation.pit_status ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : 'bg-slate-50 text-slate-700 ring-slate-200'}`}>{selectedLocation.pit_message}</div>}</section>
            </div>
          </aside>}
        </div>
      </div>
      {pitEditorLocation && createPortal(<div role="dialog" aria-modal="true" aria-label={`Verify PIT for ${pitEditorLocation.name}`} className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-950/45 p-5 backdrop-blur-sm" onMouseDown={event => { if (event.target === event.currentTarget) closePitEditor(); }}>
        <form onSubmit={verifyPit} className="w-full max-w-lg overflow-hidden rounded-[2rem] bg-white shadow-2xl shadow-slate-950/30 ring-1 ring-white/40">
          <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
            <div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-[0.18em] text-violet-600">SWCRM · PIT verification</p><h2 className="mt-1 truncate text-xl font-black text-slate-950">{pitEditorLocation.name}</h2><p className="mt-1 truncate text-[10px] font-bold text-slate-400">{pitEditorLocation.location_id}</p></div>
            <button type="button" disabled={pitVerifying} onClick={closePitEditor} aria-label="Close PIT verification" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500 transition hover:bg-slate-950 hover:text-white disabled:opacity-40"><X className="h-4 w-4" /></button>
          </header>
          <div className="space-y-4 px-6 py-6">
            <label className="block"><span className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">Private integration token</span><input autoFocus value={pitDraft} onChange={event => { setPitDraft(event.target.value); setPitVerificationError(''); setPitVerificationSuccess(false); }} placeholder="pit-…" aria-label="PIT value" className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none transition focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-50" /></label>
            {pitVerificationSuccess && <div className="rounded-xl bg-emerald-50 px-4 py-3 text-xs font-black text-emerald-800 ring-1 ring-emerald-200">PIT verified successfully.</div>}
            {pitVerificationError && <div className="rounded-xl bg-rose-50 px-4 py-3 text-xs font-bold text-rose-800 ring-1 ring-rose-200">{pitVerificationError}</div>}
          </div>
          <footer className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/70 px-6 py-4"><button type="button" disabled={pitVerifying} onClick={closePitEditor} className="rounded-xl bg-white px-4 py-2.5 text-xs font-black text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-100 disabled:opacity-40">Cancel</button><button type="submit" disabled={pitVerifying || !pitDraft.trim()} className="inline-flex min-w-28 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white transition hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-40">{pitVerifying && <Loader2 className="h-4 w-4 animate-spin" />}{pitVerifying ? 'Verifying…' : 'Verify'}</button></footer>
        </form>
      </div>, document.body)}
    </div>
  );
};
