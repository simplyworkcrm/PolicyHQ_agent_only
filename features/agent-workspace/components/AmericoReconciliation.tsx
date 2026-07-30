import React from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Building2,
  CheckCircle2,
  CircleAlert,
  Clock3,
  FileText,
  Loader2,
  Menu,
  Network,
  RefreshCcw,
  Search,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useAgentContext } from '../context/AgentContext';
import {
  americoReconciliationApi,
  AmericoAgentProfile,
} from '../services/americoReconciliationApi';
import { AmericoPoliciesWorkspace } from './AmericoPoliciesWorkspace';

export { AmericoPoliciesWorkspace as PoliciesWorkspace } from './AmericoPoliciesWorkspace';

type AmericoView = 'team' | 'policies';
type AmericoTeamSource = 'hq-agency' | 'portal-team' | 'portal-direct';

const formatCarrierName = (value: string) => {
  const [lastName, firstName] = value.split(',').map(part => part.trim());
  return firstName && lastName ? `${firstName} ${lastName}` : value;
};

const formatContractDate = (value: string | null) => {
  if (!value) return 'Not provided';
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const MetricCard = ({
  label,
  value,
  detail,
  icon,
  tone = 'slate',
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
  tone?: 'slate' | 'emerald' | 'amber' | 'violet';
}) => {
  const tones = {
    slate: 'border-slate-200/80 bg-white text-slate-700',
    emerald: 'border-emerald-100 bg-emerald-50/70 text-emerald-700',
    amber: 'border-amber-100 bg-amber-50/70 text-amber-700',
    violet: 'border-violet-100 bg-violet-50/70 text-violet-700',
  };

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${tones[tone]}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.18em] opacity-70">{label}</p>
          <p className="mt-2 text-2xl font-black tracking-tight text-slate-950">{value}</p>
          <p className="mt-1 text-[11px] font-semibold text-slate-500">{detail}</p>
        </div>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-current/10 bg-white/80">
          {icon}
        </span>
      </div>
    </div>
  );
};

const teamSourceContent: Record<AmericoTeamSource, {
  eyebrow: string;
  label: string;
  emptyTitle: string;
  emptyDetail: string;
}> = {
  'hq-agency': {
    eyebrow: 'HQ',
    label: 'My Agency',
    emptyTitle: 'HQ agency roster is ready to connect',
    emptyDetail: 'Use this for an agent without an Americo contract whose agency members are contracted.',
  },
  'portal-team': {
    eyebrow: 'Americo Portal',
    label: 'My Team',
    emptyTitle: 'Americo portal team is ready to connect',
    emptyDetail: 'Load the contracted agent’s Americo team roster directly from the carrier portal.',
  },
  'portal-direct': {
    eyebrow: 'Americo Portal',
    label: 'Direct Downlines',
    emptyTitle: 'Direct downlines are ready to connect',
    emptyDetail: 'Load only the contracted agent’s first-level Americo downlines.',
  },
};

const TeamWorkspace = ({
  source,
  onSourceChange,
}: {
  source: AmericoTeamSource;
  onSourceChange: (source: AmericoTeamSource) => void;
}) => (
  <div>
    <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-100 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-violet-600">Team Directory</p>
          <h3 className="mt-1 text-lg font-black tracking-tight text-slate-950">Americo writing team</h3>
          <p className="mt-1 text-xs font-semibold text-slate-500">Producer identities and carrier appointment status.</p>
        </div>
        <label className="relative block w-full lg:w-80">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Search agent or producer number..."
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-xs font-semibold text-slate-900 outline-none transition focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-100"
          />
        </label>
      </div>

      <div className="flex flex-col gap-2.5 border-b border-slate-100 bg-slate-50/60 px-5 py-2.5 sm:flex-row sm:items-center">
        <span className="shrink-0 text-[8px] font-black uppercase tracking-[0.16em] text-slate-400">Load from</span>
        <div className="flex min-w-0 flex-wrap gap-1.5">
          {(Object.keys(teamSourceContent) as AmericoTeamSource[]).map(option => {
            const content = teamSourceContent[option];
            const active = option === source;
            const Icon = option === 'hq-agency' ? Building2 : Network;
            return (
              <button
                key={option}
                type="button"
                onClick={() => onSourceChange(option)}
                aria-pressed={active}
                className={`inline-flex h-8 items-center gap-2 rounded-lg border px-2.5 transition ${
                  active
                    ? 'border-violet-200 bg-white text-violet-700 shadow-sm'
                    : 'border-transparent text-slate-500 hover:border-slate-200 hover:bg-white hover:text-slate-800'
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="text-left leading-none">
                  <span className="block text-[7px] font-black uppercase tracking-[0.12em] opacity-60">{content.eyebrow}</span>
                  <span className="mt-1 block text-[10px] font-black">{content.label}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[760px]">
          <div className="grid grid-cols-[1.4fr_1fr_1.2fr_1fr_1fr_40px] gap-4 border-b border-slate-100 bg-slate-50/80 px-5 py-3 text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
            <span>Agent</span>
            <span>Producer Number</span>
            <span>Agency / Upline</span>
            <span>Appointment</span>
            <span>Last Sync</span>
            <span />
          </div>
          <div className="flex min-h-64 items-center justify-center p-8">
            <div className="max-w-sm text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-100 bg-violet-50 text-violet-500">
                <Users className="h-6 w-6" />
              </div>
              <h4 className="mt-4 text-sm font-black text-slate-950">{teamSourceContent[source].emptyTitle}</h4>
              <p className="mt-1.5 text-xs font-semibold leading-5 text-slate-500">
                {teamSourceContent[source].emptyDetail}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
);

const LegacyPoliciesWorkspace = () => (
  <div className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="Total Policies" value="—" detail="Policies in the current carrier scope" icon={<FileText className="h-4 w-4" />} tone="violet" />
      <MetricCard label="Matched" value="—" detail="Connected to an agent profile" icon={<CheckCircle2 className="h-4 w-4" />} tone="emerald" />
      <MetricCard label="Needs Attention" value="—" detail="Records requiring reconciliation" icon={<ShieldCheck className="h-4 w-4" />} tone="amber" />
      <MetricCard label="Last Sync" value="—" detail="No carrier sync received yet" icon={<Clock3 className="h-4 w-4" />} />
    </div>

    <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-100 p-5 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-violet-600">Policy Reconciliation</p>
          <h3 className="mt-1 text-lg font-black tracking-tight text-slate-950">Americo policy records</h3>
          <p className="mt-1 text-xs font-semibold text-slate-500">Carrier policies matched against your workspace agents.</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row xl:w-auto">
          <label className="relative block min-w-0 flex-1 xl:w-80">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="Search policy, client, or agent..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-xs font-semibold text-slate-900 outline-none transition focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-100"
            />
          </label>
          <button
            type="button"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-600 transition hover:border-slate-300 hover:text-slate-950"
          >
            <RefreshCcw className="h-4 w-4" />
            Filters
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[980px]">
          <div className="grid grid-cols-[1.2fr_1fr_1fr_1.2fr_.8fr_1fr_1fr_40px] gap-4 border-b border-slate-100 bg-slate-50/80 px-5 py-3 text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
            <span>Policyholder</span>
            <span>Policy Number</span>
            <span>Writing Agent</span>
            <span>Product</span>
            <span>Premium</span>
            <span>Effective Date</span>
            <span>Status</span>
            <span />
          </div>
          <div className="flex min-h-64 items-center justify-center p-8">
            <div className="max-w-sm text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-100 bg-violet-50 text-violet-500">
                <FileText className="h-6 w-6" />
              </div>
              <h4 className="mt-4 text-sm font-black text-slate-950">Policy data is ready to connect</h4>
              <p className="mt-1.5 text-xs font-semibold leading-5 text-slate-500">
                Americo policy records will populate this workspace when the policy endpoint is connected.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
);

export const AmericoReconciliation: React.FC = () => {
  const { user } = useAuth();
  const { currentAgentId, isImpersonating, viewingAgentName } = useAgentContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const [profiles, setProfiles] = React.useState<AmericoAgentProfile[]>([]);
  const [profilesLoading, setProfilesLoading] = React.useState(false);
  const [profilesError, setProfilesError] = React.useState<string | null>(null);
  const [profileRefreshKey, setProfileRefreshKey] = React.useState(0);
  const profileFlyoutRef = React.useRef<HTMLElement>(null);
  const requestedView = searchParams.get('view');
  const activeView: AmericoView = requestedView === 'policies' ? 'policies' : 'team';
  const requestedTeamSource = searchParams.get('source');
  const activeTeamSource: AmericoTeamSource =
    requestedTeamSource === 'hq-agency' ||
    requestedTeamSource === 'portal-team' ||
    requestedTeamSource === 'portal-direct'
      ? requestedTeamSource
      : profiles.length > 0
        ? 'portal-team'
        : 'hq-agency';
  const profileFlyoutOpen = searchParams.get('profile') === 'open';
  const agentName = isImpersonating ? viewingAgentName : user?.name || viewingAgentName;
  const carrierAgentName = profiles[0]?.name ? formatCarrierName(profiles[0].name) : agentName;
  const sharedUpline = profiles.find(profile => profile.agentUplineName)?.agentUplineName || '';
  const activeProfileCount = profiles.filter(profile => profile.status.toLowerCase() === 'active').length;
  const setProfileFlyout = React.useCallback((open: boolean) => {
    const next = new URLSearchParams(searchParams);
    if (open) next.set('profile', 'open');
    else next.delete('profile');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  React.useEffect(() => {
    if (!currentAgentId) {
      setProfiles([]);
      setProfilesError(null);
      return;
    }

    const controller = new AbortController();
    setProfilesLoading(true);
    setProfilesError(null);

    americoReconciliationApi.getProfiles(currentAgentId, controller.signal)
      .then(setProfiles)
      .catch(error => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setProfiles([]);
        setProfilesError(error instanceof Error ? error.message : 'Failed to load Americo producer profiles');
      })
      .finally(() => {
        if (!controller.signal.aborted) setProfilesLoading(false);
      });

    return () => controller.abort();
  }, [currentAgentId, profileRefreshKey]);

  React.useEffect(() => {
    if (!profileFlyoutOpen) return;

    const closeOnPointerDown = (event: MouseEvent) => {
      if (profileFlyoutRef.current && !profileFlyoutRef.current.contains(event.target as Node)) {
        setProfileFlyout(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setProfileFlyout(false);
    };

    document.addEventListener('mousedown', closeOnPointerDown);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnPointerDown);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [profileFlyoutOpen, setProfileFlyout]);

  const selectView = (view: AmericoView) => {
    const next = new URLSearchParams(searchParams);
    next.set('view', view);
    setSearchParams(next, { replace: true });
  };

  const selectTeamSource = (source: AmericoTeamSource) => {
    const next = new URLSearchParams(searchParams);
    next.set('view', 'team');
    next.set('source', source);
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <section ref={profileFlyoutRef} className="relative z-40 rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex min-h-14 items-center justify-between gap-3 px-3 py-2.5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-xs font-black text-amber-300">
              A
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-600">Americo Producer</p>
                {!profilesLoading && profiles.length > 0 && (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[8px] font-black uppercase tracking-wide text-emerald-700">
                    {activeProfileCount} active
                  </span>
                )}
              </div>
              <h2 className="mt-0.5 truncate text-sm font-black tracking-tight text-slate-950">{carrierAgentName}</h2>
              <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                <p className="truncate text-[10px] font-semibold text-slate-500">
                  {sharedUpline ? `Upline: ${formatCarrierName(sharedUpline)}` : 'Carrier profile and contract details'}
                </p>
                {profiles.map(profile => profile.carrierAgentNumber).filter(Boolean).map(agentNumber => (
                  <span key={agentNumber} className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[8px] font-black text-slate-600">
                    {agentNumber}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {!profilesLoading && profiles.length > 0 && (
              <span className="hidden rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[9px] font-black text-slate-600 sm:inline-flex">
                {profiles.length} {profiles.length === 1 ? 'profile' : 'profiles'}
              </span>
            )}
            <button
              type="button"
              onMouseDown={event => event.stopPropagation()}
              onPointerDown={event => {
                event.stopPropagation();
                setProfileFlyout(!profileFlyoutOpen);
              }}
              aria-expanded={profileFlyoutOpen}
              aria-controls="americo-profile-flyout"
              title={profileFlyoutOpen ? 'Close Americo profiles' : 'Open Americo profiles'}
              className={`inline-flex h-9 items-center gap-2 rounded-full border px-2 transition ${
                profileFlyoutOpen
                  ? 'border-violet-200 bg-violet-50 text-violet-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Menu className="h-3.5 w-3.5" />
              <span className="h-5 w-5 rounded-full border-2 border-white bg-[conic-gradient(from_30deg,#fb7185,#facc15,#4ade80,#60a5fa,#a78bfa,#fb7185)] shadow-sm" />
            </button>
          </div>
        </div>

        {profileFlyoutOpen && (
        <div
          id="americo-profile-flyout"
          className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 max-h-[min(70vh,620px)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl shadow-slate-900/15 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="mb-3 flex items-center justify-between gap-3 px-1">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">Americo contracts</p>
              <p className="mt-0.5 text-xs font-bold text-slate-700">
                {sharedUpline ? `Shared upline: ${formatCarrierName(sharedUpline)}` : 'Carrier profile details'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setProfileRefreshKey(key => key + 1)}
              disabled={profilesLoading || !currentAgentId}
              title="Refresh Americo profiles"
              aria-label="Refresh Americo profiles"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCcw className={`h-3.5 w-3.5 ${profilesLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {profilesLoading ? (
            <div className="flex h-20 items-center justify-center gap-2 text-xs font-bold text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
              Loading Americo profiles...
            </div>
          ) : profilesError ? (
            <div className="flex min-h-20 items-center gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
              <CircleAlert className="h-5 w-5 shrink-0 text-red-500" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black text-red-900">Americo profiles could not be loaded</p>
                <p className="mt-0.5 text-[10px] font-semibold text-red-600">{profilesError}</p>
              </div>
              <button
                type="button"
                onClick={() => setProfileRefreshKey(key => key + 1)}
                className="shrink-0 rounded-lg bg-white px-3 py-2 text-[10px] font-black text-red-700 shadow-sm"
              >
                Retry
              </button>
            </div>
          ) : profiles.length === 0 ? (
            <div className="flex h-20 items-center justify-center text-center">
              <div>
                <p className="text-xs font-black text-slate-800">No Americo profile found</p>
                <p className="mt-1 text-[10px] font-semibold text-slate-500">No carrier contracts are linked to this agent.</p>
              </div>
            </div>
          ) : (
            <div className="grid gap-2 xl:grid-cols-2">
              {profiles.map(profile => (
                <div key={profile.id || profile.carrierAgentNumber} className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-sm font-black text-slate-950">{profile.carrierAgentNumber || 'No producer number'}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {profile.lineOfBusiness.length > 0 ? profile.lineOfBusiness.map(line => (
                          <span key={line} className="rounded-md bg-violet-50 px-2 py-1 text-[8px] font-black uppercase tracking-wide text-violet-700">
                            {line}
                          </span>
                        )) : (
                          <span className="text-[9px] font-semibold text-slate-400">No lines of business listed</span>
                        )}
                      </div>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-1 text-[8px] font-black uppercase tracking-wide ${
                      profile.status.toLowerCase() === 'active'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {profile.status}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3">
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-wide text-slate-400">Commission</p>
                      <p className="mt-1 truncate text-[10px] font-black text-slate-700">
                        {profile.carrierCommissionLevel ? `Level ${profile.carrierCommissionLevel}` : 'Not provided'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-wide text-slate-400">Advance</p>
                      <p className="mt-1 truncate text-[10px] font-black text-slate-700" title={profile.advanceType}>
                        {profile.advanceType || 'Not provided'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-wide text-slate-400">Contracted</p>
                      <p className="mt-1 truncate text-[10px] font-black text-slate-700">{formatContractDate(profile.contractedOn)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        )}
      </section>

      <div className="flex items-center border-b border-slate-200/80">
        <div className="inline-flex items-center gap-5">
          <button
            type="button"
            onClick={() => selectView('team')}
            className={`relative inline-flex h-9 items-center justify-center gap-1.5 px-1 text-[11px] font-black transition ${
              activeView === 'team'
                ? 'text-slate-950 after:absolute after:inset-x-0 after:bottom-[-1px] after:h-0.5 after:rounded-full after:bg-violet-500'
                : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            My Team
          </button>
          <button
            type="button"
            onClick={() => selectView('policies')}
            className={`relative inline-flex h-9 items-center justify-center gap-1.5 px-1 text-[11px] font-black transition ${
              activeView === 'policies'
                ? 'text-slate-950 after:absolute after:inset-x-0 after:bottom-[-1px] after:h-0.5 after:rounded-full after:bg-violet-500'
                : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            Policies
          </button>
        </div>
      </div>

      {activeView === 'team' ? (
        <TeamWorkspace source={activeTeamSource} onSourceChange={selectTeamSource} />
      ) : (
        <AmericoPoliciesWorkspace />
      )}
    </div>
  );
};

export default AmericoReconciliation;
