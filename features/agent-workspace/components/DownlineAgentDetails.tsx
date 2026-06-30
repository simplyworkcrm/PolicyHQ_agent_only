import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowUpDown,
  Briefcase,
  Building2,
  ChevronRight,
  Hash,
  Loader2,
  Phone,
  Search,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { agentDownlineApi, DownlineAgent, DownlineHierarchy } from '../services/agentDownlineApi';
import { agentProfileApi, AgentProfile } from '../services/agentProfileApi';
import { PolicyV2 } from '../services/agentPoliciesV2Api';
import { AgentPoliciesV2 } from './AgentPoliciesV2';

type DetailTab = 'overview' | 'downlines' | 'policies' | 'production';
type DownlineSortKey = 'first_name' | 'ref_ffl_agency_name' | 'phone' | 'npn' | 'direct_downlines' | 'status';
type DownlineSortConfig = { key: DownlineSortKey; direction: 'asc' | 'desc' };

const DOWNLINE_SORT_FIELDS: Record<DownlineSortKey, string> = {
  first_name: 'first_name',
  ref_ffl_agency_name: 'ref_ffl_agency_name',
  phone: 'phone',
  npn: 'npn',
  direct_downlines: 'direct_downlines',
  status: 'status',
};

interface DownlineBreadcrumb {
  agent_id: string;
  first_name: string;
  last_name: string;
  profile_url?: string | null;
}

const encodeTrail = (trail: DownlineBreadcrumb[]) => encodeURIComponent(JSON.stringify(trail));

const decodeTrail = (value: string | null): DownlineBreadcrumb[] => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(decodeURIComponent(value));
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item: any) => ({
        agent_id: String(item.agent_id || ''),
        first_name: String(item.first_name || ''),
        last_name: String(item.last_name || ''),
        profile_url: item.profile_url || null,
      }))
      .filter(item => item.agent_id);
  } catch {
    return [];
  }
};

const getInitials = (firstName?: string, lastName?: string) => (
  `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || 'AG'
);

const formatCurrency = (value?: number | null) => (
  `$${Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
);

const formatDate = (date?: string | number | null) => {
  if (!date) return 'N/A';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return 'N/A';
  return parsed.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
};

const getStatusStyles = (status?: string | null) => {
  const normalized = String(status || '').toLowerCase();
  if (normalized.includes('approve') || normalized.includes('active')) return 'bg-emerald-50 text-emerald-700 border-emerald-100';
  if (normalized.includes('underwrit')) return 'bg-sky-50 text-sky-700 border-sky-100';
  if (normalized.includes('decline') || normalized.includes('cancel')) return 'bg-rose-50 text-rose-700 border-rose-100';
  return 'bg-slate-50 text-slate-600 border-slate-100';
};

const getPolicyStatusStyles = (status?: string | null) => {
  const normalized = String(status || '').toLowerCase();
  if (normalized.includes('approve')) return 'bg-emerald-50 text-emerald-700 border-emerald-100';
  if (normalized.includes('underwrit')) return 'bg-sky-50 text-sky-700 border-sky-100';
  if (normalized.includes('decline') || normalized.includes('cancel')) return 'bg-rose-50 text-rose-700 border-rose-100';
  if (normalized.includes('taken')) return 'bg-slate-50 text-slate-600 border-slate-100';
  return 'bg-amber-50 text-amber-700 border-amber-100';
};

const StatTile = ({
  label,
  value,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
}) => (
  <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
        <div className="mt-2 text-xl font-black text-slate-900">{value}</div>
      </div>
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
        {icon}
      </div>
    </div>
  </div>
);

const DownlineSortableHeader = ({
  label,
  sortKey,
  sortConfig,
  onSort,
}: {
  label: string;
  sortKey: DownlineSortKey;
  sortConfig: DownlineSortConfig | null;
  onSort: (key: DownlineSortKey) => void;
}) => {
  const isActive = sortConfig?.key === sortKey;

  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest transition-colors ${
        isActive ? 'text-slate-900' : 'text-slate-400 hover:text-slate-700'
      }`}
    >
      {label}
      <ArrowUpDown className={`h-3 w-3 ${isActive ? 'text-amber-500' : 'text-slate-300'}`} />
      {isActive && <span className="text-[9px] text-amber-600">{sortConfig?.direction === 'asc' ? 'ASC' : 'DESC'}</span>}
    </button>
  );
};

export const DownlineAgentDetails: React.FC = () => {
  const { agentId = '' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const routeState = location.state as { agent?: DownlineAgent; trail?: DownlineBreadcrumb[] } | null;

  const [profile, setProfile] = useState<AgentProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [hierarchy, setHierarchy] = useState<DownlineHierarchy | null>(null);
  const [downlinesLoading, setDownlinesLoading] = useState(false);
  const [downlineSearch, setDownlineSearch] = useState('');
  const [debouncedDownlineSearch, setDebouncedDownlineSearch] = useState('');
  const [downlinePage, setDownlinePage] = useState(1);
  const [downlinePerPage, setDownlinePerPage] = useState(25);
  const [downlineSortConfig, setDownlineSortConfig] = useState<DownlineSortConfig | null>(null);
  const activeTab = (searchParams.get('tab') as DetailTab) || 'overview';
  const safeTab: DetailTab = ['overview', 'downlines', 'policies', 'production'].includes(activeTab) ? activeTab : 'overview';

  const fallbackAgent = routeState?.agent;
  const firstName = profile?.first_name || fallbackAgent?.first_name || '';
  const lastName = profile?.last_name || fallbackAgent?.last_name || '';
  const displayName = `${firstName} ${lastName}`.trim() || 'Downline Agent';
  const profileUrl = profile?.profile_url || fallbackAgent?.profile_url || null;
  const agencyName = profile?.ref_ffl_agency_name || fallbackAgent?.ref_ffl_agency_name || 'Not set';
  const phone = profile?.phone || fallbackAgent?.phone || 'Not set';
  const npn = profile?.npn || fallbackAgent?.npn || 'Not set';
  const status = profile?.status || fallbackAgent?.status || 'Active';
  const currentCrumb: DownlineBreadcrumb = {
    agent_id: agentId,
    first_name: firstName || 'Downline',
    last_name: lastName || 'Agent',
    profile_url: profileUrl,
  };
  const urlTrail = decodeTrail(searchParams.get('trail'));
  const breadcrumbTrail = ((routeState?.trail && routeState.trail.length > 0) ? routeState.trail : urlTrail).filter((crumb, index, trail) => (
    crumb.agent_id && crumb.agent_id !== agentId && trail.findIndex(item => item.agent_id === crumb.agent_id) === index
  ));
  const previousCrumb = breadcrumbTrail[breadcrumbTrail.length - 1];

  useEffect(() => {
    if (!agentId) return;
    let isMounted = true;
    setProfileLoading(true);
    setProfileError(null);
    agentProfileApi.getProfile(agentId)
      .then(data => {
        if (isMounted) setProfile(data);
      })
      .catch(error => {
        console.error('Failed to fetch downline agent profile', error);
        if (isMounted) setProfileError('Unable to load full profile.');
      })
      .finally(() => {
        if (isMounted) setProfileLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [agentId]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedDownlineSearch(downlineSearch.trim());
      setDownlinePage(1);
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [downlineSearch]);

  useEffect(() => {
    setDownlineSearch('');
    setDebouncedDownlineSearch('');
    setDownlinePage(1);
  }, [agentId]);

  useEffect(() => {
    if (!agentId || safeTab !== 'downlines') return;
    let isMounted = true;
    setDownlinesLoading(true);
    agentDownlineApi.getHierarchy(agentId, {
      page: downlinePage,
      perPage: downlinePerPage,
      search: debouncedDownlineSearch,
      filter: null,
      sort: downlineSortConfig ? { [DOWNLINE_SORT_FIELDS[downlineSortConfig.key]]: downlineSortConfig.direction } : null,
    })
      .then(data => {
        if (isMounted) setHierarchy(data);
      })
      .catch(error => {
        console.error('Failed to fetch downline details hierarchy', error);
        if (isMounted) setHierarchy(null);
      })
      .finally(() => {
        if (isMounted) setDownlinesLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [agentId, debouncedDownlineSearch, downlinePage, downlinePerPage, downlineSortConfig, safeTab]);

  const filteredDownlines = useMemo(() => hierarchy?.direct_downlines || [], [hierarchy]);
  const downlineTotal = hierarchy?.itemsTotal ?? filteredDownlines.length;
  const downlinePageTotal = hierarchy?.pageTotal ?? 1;
  const downlineCurrentPage = hierarchy?.curPage ?? downlinePage;
  const downlinePageStart = downlineTotal === 0 ? 0 : ((downlineCurrentPage - 1) * downlinePerPage) + 1;
  const downlinePageEnd = downlineTotal === 0 ? 0 : Math.min(downlinePageStart + filteredDownlines.length - 1, downlineTotal);

  const handleDownlineSort = (key: DownlineSortKey) => {
    setDownlineSortConfig(current => ({
      key,
      direction: current?.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
    setDownlinePage(1);
  };

  const changeTab = (tab: DetailTab) => {
    setSearchParams({ tab });
  };

  const navigateToCrumb = (crumb: DownlineBreadcrumb, index: number) => {
    const nextTrail = breadcrumbTrail.slice(0, index);
    const trailParam = nextTrail.length > 0 ? `&trail=${encodeTrail(nextTrail)}` : '';
    navigate(`/downlines/${crumb.agent_id}?tab=downlines${trailParam}`, {
      state: {
        agent: {
          agent_id: crumb.agent_id,
          first_name: crumb.first_name,
          last_name: crumb.last_name,
          directDownline_count: 0,
          profile_url: crumb.profile_url,
        },
        trail: nextTrail,
      },
    });
  };

  const openNestedDownline = (agent: DownlineAgent) => {
    const nextTrail = [...breadcrumbTrail, currentCrumb];
    navigate(`/downlines/${agent.agent_id}?tab=overview&trail=${encodeTrail(nextTrail)}`, {
      state: {
        agent,
        trail: nextTrail,
      },
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <section className="overflow-hidden rounded-[2.5rem] border border-slate-100 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-950 px-7 py-7 text-white">
          <div className="mb-6 flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
            <button
              type="button"
              onClick={() => previousCrumb ? navigateToCrumb(previousCrumb, breadcrumbTrail.length - 1) : navigate('/downlines')}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-950 transition-all hover:bg-amber-100"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {previousCrumb ? `Back to ${previousCrumb.first_name}` : 'Back to Downlines'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/downlines')}
              className="rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white/45 transition-colors hover:bg-white/10 hover:text-white"
            >
              Downlines
            </button>
            {[...breadcrumbTrail, currentCrumb].map((crumb, index, all) => {
              const isCurrent = index === all.length - 1;
              return (
                <React.Fragment key={`${crumb.agent_id}-${index}`}>
                  <ChevronRight className="h-3.5 w-3.5 text-white/25" />
                  <button
                    type="button"
                    disabled={isCurrent}
                    onClick={() => navigateToCrumb(crumb, index)}
                    className={`rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-colors ${
                      isCurrent
                        ? 'cursor-default bg-amber-500 text-slate-950'
                        : 'text-white/65 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {`${crumb.first_name} ${crumb.last_name}`.trim()}
                  </button>
                </React.Fragment>
              );
            })}
          </div>

          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-5">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-3xl border border-white/10 bg-white/10 text-xl font-black text-amber-300 flex items-center justify-center">
                {profileUrl ? (
                  <img src={profileUrl} alt={displayName} className="h-full w-full object-cover" />
                ) : (
                  getInitials(firstName, lastName)
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-400">Downline Profile</p>
                <h1 className="mt-1 truncate text-3xl font-black tracking-tight">{displayName}</h1>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center rounded-xl border px-3 py-1.5 text-[10px] font-black uppercase tracking-wider ${getStatusStyles(status)}`}>
                    {status}
                  </span>
                  {profileLoading && (
                    <span className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-300">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Loading profile
                    </span>
                  )}
                  {profileError && (
                    <span className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-amber-200">
                      {profileError}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 rounded-2xl bg-white/5 p-1">
              {[
                { key: 'overview', label: 'Overview' },
                { key: 'downlines', label: 'Direct Downlines' },
                { key: 'policies', label: 'Policies' },
                { key: 'production', label: 'Team Production' },
              ].map(tab => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => changeTab(tab.key as DetailTab)}
                  className={`rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all ${
                    safeTab === tab.key
                      ? 'bg-white text-slate-950 shadow-lg shadow-black/20'
                      : 'text-slate-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {safeTab === 'overview' && (
          <div className="p-7">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatTile label="Agency" value={<span className="truncate block">{agencyName}</span>} icon={<Building2 className="h-5 w-5" />} />
              <StatTile label="NPN" value={npn} icon={<Hash className="h-5 w-5" />} />
              <StatTile label="Phone" value={<span className="truncate block">{phone}</span>} icon={<Phone className="h-5 w-5" />} />
              <StatTile label="Direct Downlines" value={fallbackAgent?.directDownline_count ?? hierarchy?.direct_downlines?.length ?? '--'} icon={<Users className="h-5 w-5" />} />
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-3xl border border-slate-100 bg-slate-50/60 p-6">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-900 shadow-sm">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Agent Overview</h3>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Profile identity</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <ProfileField label="First Name" value={firstName || 'Not set'} />
                  <ProfileField label="Last Name" value={lastName || 'Not set'} />
                  <ProfileField label="Work Email" value={profile?.email || 'Not set'} />
                  <ProfileField label="Direct Upline" value={profile?.ref_agent_upline_name || 'Not set'} />
                  <ProfileField label="Created" value={formatDate(profile?.created_at)} />
                </div>
              </div>

              <div className="rounded-3xl border border-slate-100 bg-white p-6">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                    <Briefcase className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Quick Actions</h3>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Open scoped views</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <button onClick={() => changeTab('downlines')} className="rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4 text-left transition-all hover:border-amber-200 hover:bg-amber-50">
                    <p className="text-sm font-black text-slate-900">View Direct Downlines</p>
                    <p className="mt-1 text-xs font-semibold text-slate-400">Load this agent's immediate team.</p>
                  </button>
                  <button onClick={() => changeTab('policies')} className="rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4 text-left transition-all hover:border-amber-200 hover:bg-amber-50">
                    <p className="text-sm font-black text-slate-900">View Policies</p>
                    <p className="mt-1 text-xs font-semibold text-slate-400">Show policies owned by this agent.</p>
                  </button>
                  <button onClick={() => changeTab('production')} className="rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4 text-left transition-all hover:border-amber-200 hover:bg-amber-50">
                    <p className="text-sm font-black text-slate-900">View Team Production</p>
                    <p className="mt-1 text-xs font-semibold text-slate-400">Show this agent and their downline production.</p>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {safeTab === 'downlines' && (
          <div>
            <div className="flex flex-col gap-4 border-b border-slate-100 p-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900">Direct Downlines</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {downlinesLoading ? 'Loading team...' : `${downlineTotal.toLocaleString()} agents matching current view`}
                </p>
              </div>
              <div className="relative w-full lg:w-80">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={downlineSearch}
                  onChange={event => setDownlineSearch(event.target.value)}
                  placeholder="Search agent, agency, phone..."
                  className="w-full rounded-2xl border border-slate-100 bg-slate-50 py-3 pl-11 pr-4 text-sm font-bold text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-amber-300 focus:bg-white focus:ring-4 focus:ring-amber-500/10"
                />
              </div>
            </div>
            <DownlineTable
              agents={filteredDownlines}
              loading={downlinesLoading}
              onOpenAgent={openNestedDownline}
              sortConfig={downlineSortConfig}
              onSort={handleDownlineSort}
              currentPage={downlineCurrentPage}
              pageTotal={downlinePageTotal}
              pageStart={downlinePageStart}
              pageEnd={downlinePageEnd}
              total={downlineTotal}
              perPage={downlinePerPage}
              onPage={setDownlinePage}
              onPerPage={(nextPerPage) => {
                setDownlinePerPage(nextPerPage);
                setDownlinePage(1);
              }}
            />
          </div>
        )}

        {safeTab === 'policies' && (
          <div className="bg-slate-50/70 p-6">
            <AgentPoliciesV2
              agentIdsOverride={[agentId]}
              headingTitle="Policy Records"
              headingSubtitle={`Review policies owned by ${displayName}.`}
              variant="downline"
              readOnlyRows
            />
          </div>
        )}

        {safeTab === 'production' && (
          <div className="bg-slate-50/70 p-6">
            <AgentPoliciesV2
              agentIdsOverride={[agentId]}
              dataSource="team"
              headingTitle="Team Production"
              headingSubtitle={`Aggregated policies for ${displayName} and their downline tree.`}
              variant="downline"
            />
          </div>
        )}
      </section>
    </div>
  );
};

const ProfileField = ({ label, value, muted = false }: { label: string; value: React.ReactNode; muted?: boolean }) => (
  <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3">
    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</p>
    <p className={`mt-1 truncate text-sm font-black ${muted ? 'font-mono text-[11px] text-slate-500' : 'text-slate-900'}`}>{value}</p>
  </div>
);

const DownlineTable = ({
  agents,
  loading,
  onOpenAgent,
  sortConfig,
  onSort,
  currentPage,
  pageTotal,
  pageStart,
  pageEnd,
  total,
  perPage,
  onPage,
  onPerPage,
}: {
  agents: DownlineAgent[];
  loading: boolean;
  onOpenAgent: (agent: DownlineAgent) => void;
  sortConfig: DownlineSortConfig | null;
  onSort: (key: DownlineSortKey) => void;
  currentPage: number;
  pageTotal: number;
  pageStart: number;
  pageEnd: number;
  total: number;
  perPage: number;
  onPage: (page: number) => void;
  onPerPage: (perPage: number) => void;
}) => (
  <div>
    <div className="overflow-x-auto">
      <table className="w-full min-w-[920px] text-left">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/60">
            <th className="px-6 py-4"><DownlineSortableHeader label="Agent Name" sortKey="first_name" sortConfig={sortConfig} onSort={onSort} /></th>
            <th className="px-4 py-4"><DownlineSortableHeader label="Agency" sortKey="ref_ffl_agency_name" sortConfig={sortConfig} onSort={onSort} /></th>
            <th className="px-4 py-4"><DownlineSortableHeader label="Phone" sortKey="phone" sortConfig={sortConfig} onSort={onSort} /></th>
            <th className="px-4 py-4"><DownlineSortableHeader label="NPN" sortKey="npn" sortConfig={sortConfig} onSort={onSort} /></th>
            <th className="px-4 py-4"><DownlineSortableHeader label="Direct Downlines" sortKey="direct_downlines" sortConfig={sortConfig} onSort={onSort} /></th>
            <th className="px-4 py-4"><DownlineSortableHeader label="Status" sortKey="status" sortConfig={sortConfig} onSort={onSort} /></th>
            <th className="px-4 py-4"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {loading ? (
            <tr>
              <td colSpan={7} className="py-12 text-center text-slate-400">
                <div className="inline-flex items-center gap-2 text-sm font-bold">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading downlines...
                </div>
              </td>
            </tr>
          ) : agents.length > 0 ? agents.map(agent => (
            <tr key={agent.agent_id} onClick={() => onOpenAgent(agent)} className="cursor-pointer transition-all hover:bg-amber-50/30">
              <td className="px-6 py-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-100 bg-slate-50 text-xs font-black text-slate-500">
                    {agent.profile_url ? (
                      <img src={agent.profile_url} alt={`${agent.first_name} ${agent.last_name}`} className="h-full w-full object-cover" />
                    ) : (
                      getInitials(agent.first_name, agent.last_name)
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900">{agent.first_name} {agent.last_name}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Open profile</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-5 text-xs font-bold text-slate-600">{agent.ref_ffl_agency_name || 'Not set'}</td>
              <td className="px-4 py-5 text-xs font-bold text-slate-600">{agent.phone || 'Not set'}</td>
              <td className="px-4 py-5 text-xs font-bold text-slate-600">{agent.npn || 'Not set'}</td>
              <td className="px-4 py-5 text-sm font-black text-slate-900">{agent.directDownline_count}</td>
              <td className="px-4 py-5">
                <span className={`inline-flex rounded-xl border px-3 py-1.5 text-[10px] font-black uppercase tracking-wider ${getStatusStyles(agent.status || 'Active')}`}>
                  {agent.status || 'Active'}
                </span>
              </td>
              <td className="px-4 py-5 text-right text-slate-300">
                <ChevronRight className="ml-auto h-4 w-4" />
              </td>
            </tr>
          )) : (
            <tr>
              <td colSpan={7} className="py-12 text-center text-sm font-bold text-slate-400">No direct downlines found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
    <div className="flex flex-col gap-3 border-t border-slate-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
        <span>Showing {pageStart.toLocaleString()}-{pageEnd.toLocaleString()} of {total.toLocaleString()}</span>
        <select
          value={perPage}
          onChange={event => onPerPage(Number(event.target.value))}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 outline-none"
        >
          {[10, 25, 50, 100].map(size => (
            <option key={size} value={size}>{size} / page</option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={currentPage <= 1 || loading}
          onClick={() => onPage(Math.max(1, currentPage - 1))}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Prev
        </button>
        <span className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-black text-white">
          {currentPage} / {Math.max(pageTotal, 1)}
        </span>
        <button
          type="button"
          disabled={currentPage >= pageTotal || loading}
          onClick={() => onPage(Math.min(pageTotal, currentPage + 1))}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  </div>
);

const PoliciesTable = ({ policies, loading }: { policies: PolicyV2[]; loading: boolean }) => (
  <div className="overflow-x-auto">
    <table className="w-full min-w-[980px] text-left">
      <thead>
        <tr className="border-b border-slate-100 bg-slate-50/60 text-[10px] font-black uppercase tracking-widest text-slate-400">
          <th className="px-6 py-4">Client & Created</th>
          <th className="px-4 py-4">Policy Number</th>
          <th className="px-4 py-4">Carrier / Product</th>
          <th className="px-4 py-4">Effective Date</th>
          <th className="px-4 py-4">Premium</th>
          <th className="px-4 py-4">Status</th>
          <th className="px-4 py-4">Paid</th>
          <th className="px-4 py-4">Source</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-50">
        {loading ? (
          <tr>
            <td colSpan={8} className="py-12 text-center text-slate-400">
              <div className="inline-flex items-center gap-2 text-sm font-bold">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading policies...
              </div>
            </td>
          </tr>
        ) : policies.length > 0 ? policies.map(policy => (
          <tr key={policy.selectionKey || policy.policy_id} className="transition-all hover:bg-slate-50/70">
            <td className="px-6 py-5">
              <p className="text-sm font-black text-slate-900">{policy.client}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{formatDate(policy.created_at)}</p>
            </td>
            <td className="px-4 py-5">
              <span className="rounded-lg border border-slate-100 bg-slate-50 px-2 py-1 font-mono text-[11px] font-black text-slate-500">
                {policy.policy_number || 'No policy #'}
              </span>
            </td>
            <td className="px-4 py-5">
              <p className="text-xs font-black text-slate-900">{policy.carrier || 'N/A'}</p>
              <p className="text-[10px] font-semibold text-slate-400">{policy.carrier_product || 'N/A'}</p>
            </td>
            <td className="px-4 py-5 text-xs font-bold text-slate-600">{formatDate(policy.initial_draft_date)}</td>
            <td className="px-4 py-5 text-sm font-black text-slate-900">{formatCurrency(policy.annual_premium)}</td>
            <td className="px-4 py-5">
              <span className={`inline-flex rounded-xl border px-3 py-1.5 text-[10px] font-black uppercase tracking-wider ${getPolicyStatusStyles(policy.status)}`}>
                {policy.status || 'N/A'}
              </span>
            </td>
            <td className="px-4 py-5 text-xs font-black text-slate-600">{policy.paid_status || 'N/A'}</td>
            <td className="px-4 py-5 text-xs font-bold text-slate-500">{policy.source_name || 'N/A'}</td>
          </tr>
        )) : (
          <tr>
            <td colSpan={8} className="py-12 text-center text-sm font-bold text-slate-400">No policies found for this agent.</td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
);
