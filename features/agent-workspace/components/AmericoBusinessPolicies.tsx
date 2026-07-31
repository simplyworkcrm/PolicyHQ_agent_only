import React from 'react';
import {
  CircleAlert,
  Loader2,
  Menu,
  RefreshCcw,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useAgentContext } from '../context/AgentContext';
import {
  americoReconciliationApi,
  AmericoAgentProfile,
} from '../services/americoReconciliationApi';
import {
  agentPoliciesV2Api,
  PolicyFilterOption,
} from '../services/agentPoliciesV2Api';
import { AmericoPoliciesWorkspace } from './AmericoPoliciesWorkspace';
import {
  PolicyDateRangeFilter,
  PolicySourceDropdown,
  PoliciesTimeframe,
} from './AgentPoliciesV2';
import { WorkspaceToolbarPortal } from './WorkspaceToolbarPortal';

const formatCarrierName = (value: string) => {
  const [lastName, firstName] = value.split(',').map(part => part.trim());
  return firstName && lastName ? `${firstName} ${lastName}` : value;
};

export const AmericoBusinessPolicies: React.FC<{ toolbarSlotId: string }> = ({ toolbarSlotId }) => {
  const { user } = useAuth();
  const { currentAgentId, isImpersonating, viewingAgentName } = useAgentContext();
  const [profiles, setProfiles] = React.useState<AmericoAgentProfile[]>([]);
  const [profilesLoading, setProfilesLoading] = React.useState(false);
  const [profilesError, setProfilesError] = React.useState<string | null>(null);
  const [profilesAgentId, setProfilesAgentId] = React.useState<string | null>(null);
  const [profileRefreshKey, setProfileRefreshKey] = React.useState(0);
  const [profileOpen, setProfileOpen] = React.useState(false);
  const [carrierOptions, setCarrierOptions] = React.useState<PolicyFilterOption[]>([]);
  const [carriersLoading, setCarriersLoading] = React.useState(false);
  const [timeframe, setTimeframe] = React.useState<PoliciesTimeframe>('all');
  const [startDate, setStartDate] = React.useState<number | undefined>();
  const [endDate, setEndDate] = React.useState<number | undefined>();

  React.useEffect(() => {
    let cancelled = false;
    setCarriersLoading(true);
    agentPoliciesV2Api.getCarrierOptions()
      .then(options => {
        if (!cancelled) setCarrierOptions(options);
      })
      .catch(() => {
        if (!cancelled) setCarrierOptions([]);
      })
      .finally(() => {
        if (!cancelled) setCarriersLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  React.useEffect(() => {
    if (!currentAgentId) {
      setProfiles([]);
      setProfilesError(null);
      setProfilesAgentId(null);
      return;
    }

    const controller = new AbortController();
    setProfiles([]);
    setProfilesAgentId(null);
    setProfilesLoading(true);
    setProfilesError(null);
    americoReconciliationApi.getProfiles(currentAgentId, controller.signal)
      .then(nextProfiles => {
        setProfiles(nextProfiles);
        setProfilesAgentId(currentAgentId);
      })
      .catch(error => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setProfiles([]);
        setProfilesAgentId(currentAgentId);
        setProfilesError(error instanceof Error ? error.message : 'Failed to load Americo producer profiles');
      })
      .finally(() => {
        if (!controller.signal.aborted) setProfilesLoading(false);
      });

    return () => controller.abort();
  }, [currentAgentId, profileRefreshKey]);

  const agentName = isImpersonating ? viewingAgentName : user?.name || viewingAgentName;
  const carrierAgentName = profiles[0]?.name ? formatCarrierName(profiles[0].name) : agentName;
  const sharedUpline = profiles.find(profile => profile.agentUplineName)?.agentUplineName || '';
  const activeProfileCount = profiles.filter(profile => profile.status.toLowerCase() === 'active').length;
  const producerNumbers = profiles.map(profile => profile.carrierAgentNumber).filter(Boolean);
  const profileStatus = !currentAgentId || profilesLoading || profilesAgentId !== currentAgentId
    ? 'checking'
    : profilesError
      ? 'error'
      : profiles.length > 0
        ? 'available'
        : 'missing';

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <WorkspaceToolbarPortal slotId={toolbarSlotId} fallbackClassName="flex justify-start">
        <div className="flex w-full flex-wrap items-center gap-3">
          <PolicyDateRangeFilter
            timeframe={timeframe}
            startDate={startDate}
            endDate={endDate}
            onTimeframeChange={next => {
              setTimeframe(next);
              if (next !== 'custom') {
                setStartDate(undefined);
                setEndDate(undefined);
              }
            }}
            onDateChange={(start, end) => {
              setStartDate(start);
              setEndDate(end);
            }}
            variant="inline"
          />
          <PolicySourceDropdown
            carrierOptions={carrierOptions}
            loading={carriersLoading}
            currentSource="americo"
          />
        </div>
      </WorkspaceToolbarPortal>

      <section className="relative z-40 rounded-2xl border border-slate-200/80 bg-white shadow-sm">
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
                  {sharedUpline
                    ? `Upline: ${formatCarrierName(sharedUpline)}`
                    : profileStatus === 'missing'
                      ? 'Contracted with Americo? Contact support to connect your profile.'
                      : 'Carrier profile and contract details'}
                </p>
                {producerNumbers.map(agentNumber => (
                  <span key={agentNumber} className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[8px] font-black text-slate-600">
                    {agentNumber}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {profilesLoading && <Loader2 className="h-4 w-4 animate-spin text-amber-500" />}
            {!profilesLoading && profiles.length > 0 && (
              <span className="hidden rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[9px] font-black text-slate-600 sm:inline-flex">
                {profiles.length} {profiles.length === 1 ? 'profile' : 'profiles'}
              </span>
            )}
            <button
              type="button"
              onClick={() => setProfileOpen(open => !open)}
              aria-expanded={profileOpen}
              aria-controls="business-americo-profile-details"
              title={profileOpen ? 'Close Americo profiles' : 'Open Americo profiles'}
              className={`inline-flex h-9 items-center gap-2 rounded-full border px-2 transition ${
                profileOpen
                  ? 'border-violet-200 bg-violet-50 text-violet-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Menu className="h-3.5 w-3.5" />
              <span className="h-5 w-5 rounded-full border-2 border-white bg-[conic-gradient(from_30deg,#fb7185,#facc15,#4ade80,#60a5fa,#a78bfa,#fb7185)] shadow-sm" />
            </button>
          </div>
        </div>

        {profileOpen && (
          <div id="business-americo-profile-details" className="border-t border-slate-100 p-3 animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">Americo contracts</p>
              <button
                type="button"
                onClick={() => setProfileRefreshKey(key => key + 1)}
                disabled={profilesLoading || !currentAgentId}
                aria-label="Refresh Americo profiles"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:text-slate-950 disabled:opacity-50"
              >
                <RefreshCcw className={`h-3.5 w-3.5 ${profilesLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {profilesError ? (
              <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-[10px] font-bold text-red-700">
                <CircleAlert className="h-4 w-4 shrink-0" />
                {profilesError}
              </div>
            ) : profiles.length === 0 ? (
              <p className="rounded-xl bg-slate-50 px-3 py-4 text-center text-[10px] font-bold text-slate-500">
                {profilesLoading ? 'Loading Americo profiles...' : 'No Americo profile found for this agent.'}
              </p>
            ) : (
              <div className="grid gap-2 xl:grid-cols-2">
                {profiles.map(profile => (
                  <div key={profile.id || profile.carrierAgentNumber} className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-mono text-sm font-black text-slate-950">{profile.carrierAgentNumber || 'No producer number'}</p>
                        <p className="mt-1 text-[9px] font-bold text-slate-500">
                          {profile.lineOfBusiness.join(' · ') || 'No lines of business listed'}
                        </p>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-[8px] font-black uppercase ${
                        profile.status.toLowerCase() === 'active'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {profile.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      <AmericoPoliciesWorkspace
        agentId={currentAgentId}
        profileStatus={profileStatus}
        profileErrorMessage={profilesError}
        timeframe={timeframe}
        startDate={startDate}
        endDate={endDate}
      />
    </div>
  );
};
