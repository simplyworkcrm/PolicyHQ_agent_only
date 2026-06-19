import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
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

type DetailTab = 'overview' | 'downlines' | 'policies';

interface DownlineBreadcrumb {
  agent_id: string;
  first_name: string;
  last_name: string;
  profile_url?: string | null;
}

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
  const activeTab = (searchParams.get('tab') as DetailTab) || 'overview';
  const safeTab: DetailTab = ['overview', 'downlines', 'policies'].includes(activeTab) ? activeTab : 'overview';

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
  const breadcrumbTrail = (routeState?.trail || []).filter((crumb, index, trail) => (
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
    if (!agentId || safeTab !== 'downlines') return;
    let isMounted = true;
    setDownlinesLoading(true);
    agentDownlineApi.getHierarchy(agentId)
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
  }, [agentId, safeTab]);

  const filteredDownlines = useMemo(() => {
    const search = downlineSearch.toLowerCase();
    return (hierarchy?.direct_downlines || []).filter(agent => [
      agent.first_name,
      agent.last_name,
      agent.ref_ffl_agency_name,
      agent.phone,
      agent.npn,
    ].some(value => String(value || '').toLowerCase().includes(search)));
  }, [hierarchy, downlineSearch]);

  const changeTab = (tab: DetailTab) => {
    setSearchParams({ tab });
  };

  const navigateToCrumb = (crumb: DownlineBreadcrumb, index: number) => {
    navigate(`/downlines/${crumb.agent_id}?tab=downlines`, {
      state: {
        agent: {
          agent_id: crumb.agent_id,
          first_name: crumb.first_name,
          last_name: crumb.last_name,
          directDownline_count: 0,
          profile_url: crumb.profile_url,
        },
        trail: breadcrumbTrail.slice(0, index),
      },
    });
  };

  const openNestedDownline = (agent: DownlineAgent) => {
    navigate(`/downlines/${agent.agent_id}?tab=overview`, {
      state: {
        agent,
        trail: [...breadcrumbTrail, currentCrumb],
      },
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col gap-3 rounded-3xl border border-slate-100 bg-white px-5 py-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => previousCrumb ? navigateToCrumb(previousCrumb, breadcrumbTrail.length - 1) : navigate('/downlines')}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black uppercase tracking-widest text-slate-500 transition-all hover:border-slate-300 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            {previousCrumb ? `Back to ${previousCrumb.first_name}` : 'Back to Downlines'}
          </button>
          <div className="h-6 w-px bg-slate-100" />
          <button
            type="button"
            onClick={() => navigate('/downlines')}
            className="rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-700"
          >
            Downlines
          </button>
          {[...breadcrumbTrail, currentCrumb].map((crumb, index, all) => {
            const isCurrent = index === all.length - 1;
            return (
              <React.Fragment key={`${crumb.agent_id}-${index}`}>
                <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
                <button
                  type="button"
                  disabled={isCurrent}
                  onClick={() => navigateToCrumb(crumb, index)}
                  className={`rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-colors ${
                    isCurrent
                      ? 'cursor-default bg-slate-900 text-white'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  {`${crumb.first_name} ${crumb.last_name}`.trim()}
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <section className="overflow-hidden rounded-[2.5rem] border border-slate-100 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-950 px-7 py-7 text-white">
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
                  {downlinesLoading ? 'Loading team...' : `${filteredDownlines.length} agents loaded`}
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
}: {
  agents: DownlineAgent[];
  loading: boolean;
  onOpenAgent: (agent: DownlineAgent) => void;
}) => (
  <div className="overflow-x-auto">
    <table className="w-full min-w-[920px] text-left">
      <thead>
        <tr className="border-b border-slate-100 bg-slate-50/60 text-[10px] font-black uppercase tracking-widest text-slate-400">
          <th className="px-6 py-4">Agent Name</th>
          <th className="px-4 py-4">Agency</th>
          <th className="px-4 py-4">Phone</th>
          <th className="px-4 py-4">NPN</th>
          <th className="px-4 py-4">Direct Downlines</th>
          <th className="px-4 py-4">Status</th>
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
