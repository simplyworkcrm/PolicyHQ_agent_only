import React from 'react';
import { CircleAlert, Loader2, Menu, RefreshCcw } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useAgentContext } from '../context/AgentContext';
import { aetnaPoliciesApi, aflacPoliciesApi, AetnaAgentProfile } from '../services/aetnaPoliciesApi';
import { agentPoliciesV2Api, PolicyFilterOption } from '../services/agentPoliciesV2Api';
import { AmericoPoliciesWorkspace, AmericoProfileStatus } from './AmericoPoliciesWorkspace';
import { PolicyDateRangeFilter, PolicySourceDropdown, PoliciesTimeframe } from './AgentPoliciesV2';
import { WorkspaceToolbarPortal } from './WorkspaceToolbarPortal';

const AETNA_STATUS_OPTIONS = [
  'Active',
  'Closed',
  'Decline',
  'Issued Not In Force',
  'Not Taken',
  'Pending',
  'Withdrawn',
];

type SimilarCarrierPoliciesApi = typeof aetnaPoliciesApi;

interface SimilarCarrierBusinessPoliciesProps {
  toolbarSlotId: string;
  carrierName: 'Aetna' | 'Aflac';
  carrierSlug: 'aetna' | 'aflac';
  policiesApi: SimilarCarrierPoliciesApi;
}

const SimilarCarrierBusinessPolicies: React.FC<SimilarCarrierBusinessPoliciesProps> = ({
  toolbarSlotId,
  carrierName,
  carrierSlug,
  policiesApi,
}) => {
  const { user } = useAuth();
  const { currentAgentId, isImpersonating, viewingAgentName } = useAgentContext();
  const [profile, setProfile] = React.useState<AetnaAgentProfile | null>(null);
  const [profileLoading, setProfileLoading] = React.useState(false);
  const [profileError, setProfileError] = React.useState<string | null>(null);
  const [loadedAgentId, setLoadedAgentId] = React.useState<string | null>(null);
  const [profileOpen, setProfileOpen] = React.useState(false);
  const [profileRefreshKey, setProfileRefreshKey] = React.useState(0);
  const [carrierOptions, setCarrierOptions] = React.useState<PolicyFilterOption[]>([]);
  const [carriersLoading, setCarriersLoading] = React.useState(false);
  const [timeframe, setTimeframe] = React.useState<PoliciesTimeframe>('all');
  const [startDate, setStartDate] = React.useState<number | undefined>();
  const [endDate, setEndDate] = React.useState<number | undefined>();

  React.useEffect(() => {
    let cancelled = false;
    setCarriersLoading(true);
    agentPoliciesV2Api.getCarrierOptions()
      .then(options => { if (!cancelled) setCarrierOptions(options); })
      .catch(() => { if (!cancelled) setCarrierOptions([]); })
      .finally(() => { if (!cancelled) setCarriersLoading(false); });
    return () => { cancelled = true; };
  }, []);

  React.useEffect(() => {
    if (!currentAgentId) {
      setProfile(null);
      setProfileError(null);
      setLoadedAgentId(null);
      return;
    }
    const controller = new AbortController();
    setProfile(null);
    setProfileError(null);
    setLoadedAgentId(null);
    setProfileLoading(true);
    policiesApi.getProfile(currentAgentId, controller.signal)
      .then(nextProfile => {
        setProfile(nextProfile);
        setLoadedAgentId(currentAgentId);
      })
      .catch(error => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setProfile(null);
        setLoadedAgentId(currentAgentId);
        setProfileError(error instanceof Error ? error.message : `Failed to load ${carrierName} producer profile`);
      })
      .finally(() => { if (!controller.signal.aborted) setProfileLoading(false); });
    return () => controller.abort();
  }, [carrierName, currentAgentId, policiesApi, profileRefreshKey]);

  const fallbackName = isImpersonating ? viewingAgentName : user?.name || viewingAgentName;
  const profileStatus: AmericoProfileStatus = !currentAgentId || profileLoading || loadedAgentId !== currentAgentId
    ? 'checking'
    : profileError
      ? 'error'
      : profile
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
          <PolicySourceDropdown carrierOptions={carrierOptions} loading={carriersLoading} currentSource={carrierSlug} />
        </div>
      </WorkspaceToolbarPortal>

      <section className="relative z-40 rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex min-h-14 items-center justify-between gap-3 px-3 py-2.5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-xs font-black text-sky-300">A</div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-sky-700">{carrierName} Producer</p>
                {profile && (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[8px] font-black uppercase tracking-wide text-emerald-700">{profile.status}</span>
                )}
              </div>
              <h2 className="mt-0.5 truncate text-sm font-black tracking-tight text-slate-950">{profile?.name || fallbackName}</h2>
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] font-semibold text-slate-500">
                <span>{profile?.uplineName ? `Upline: ${profile.uplineName}` : profileStatus === 'missing' ? `Contracted with ${carrierName}? Contact support to connect your profile.` : 'Carrier profile and contract details'}</span>
                {profile?.carrierAgentNumber && <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[8px] font-black text-slate-600">{profile.carrierAgentNumber}</span>}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {profileLoading && <Loader2 className="h-4 w-4 animate-spin text-sky-500" />}
            <button
              type="button"
              onClick={() => setProfileOpen(open => !open)}
              aria-expanded={profileOpen}
              aria-controls={`business-${carrierSlug}-profile-details`}
              title={profileOpen ? `Close ${carrierName} profile` : `Open ${carrierName} profile`}
              className={`inline-flex h-9 items-center gap-2 rounded-full border px-2 transition ${profileOpen ? 'border-sky-200 bg-sky-50 text-sky-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              <Menu className="h-3.5 w-3.5" />
              <span className="h-5 w-5 rounded-full border-2 border-white bg-[conic-gradient(from_30deg,#1e40af,#38bdf8,#e2e8f0,#1e40af)] shadow-sm" />
            </button>
          </div>
        </div>

        {profileOpen && (
          <div id={`business-${carrierSlug}-profile-details`} className="border-t border-slate-100 p-3 animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">{carrierName} contract</p>
              <button type="button" onClick={() => setProfileRefreshKey(key => key + 1)} disabled={profileLoading || !currentAgentId} aria-label={`Refresh ${carrierName} profile`} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 disabled:opacity-50">
                <RefreshCcw className={`h-3.5 w-3.5 ${profileLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            {profileError ? (
              <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-[10px] font-bold text-red-700"><CircleAlert className="h-4 w-4" />{profileError}</div>
            ) : profile ? (
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  ['Producer number', profile.carrierAgentNumber || '—'],
                  ['Commission level', profile.carrierCommissionLevel || '—'],
                  ['Contracted', profile.contractedOn || '—'],
                  ['Upline producer', profile.carrierAgentUplineNumber || '—'],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2">
                    <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">{label}</p>
                    <p className="mt-1 truncate text-[11px] font-black text-slate-800">{value}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-xl bg-slate-50 px-3 py-4 text-center text-[10px] font-bold text-slate-500">{profileLoading ? `Loading ${carrierName} profile...` : `No ${carrierName} profile found for this agent.`}</p>
            )}
          </div>
        )}
      </section>

      <AmericoPoliciesWorkspace
        agentId={currentAgentId}
        profileStatus={profileStatus}
        profileErrorMessage={profileError}
        timeframe={timeframe}
        startDate={startDate}
        endDate={endDate}
        carrierName={carrierName}
        loadPolicies={policiesApi.getPolicies}
        statusOptions={AETNA_STATUS_OPTIONS}
      />
    </div>
  );
};

export const AetnaBusinessPolicies: React.FC<{ toolbarSlotId: string }> = ({ toolbarSlotId }) => (
  <SimilarCarrierBusinessPolicies
    toolbarSlotId={toolbarSlotId}
    carrierName="Aetna"
    carrierSlug="aetna"
    policiesApi={aetnaPoliciesApi}
  />
);

export const AflacBusinessPolicies: React.FC<{ toolbarSlotId: string }> = ({ toolbarSlotId }) => (
  <SimilarCarrierBusinessPolicies
    toolbarSlotId={toolbarSlotId}
    carrierName="Aflac"
    carrierSlug="aflac"
    policiesApi={aflacPoliciesApi}
  />
);
