import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, BarChart3, Loader2, MapPinned, RotateCcw } from 'lucide-react';
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from 'recharts';
import { useAgentContext } from '../context/AgentContext';
import {
  myBusinessOverviewApi,
  MyBusinessOverviewResponse,
} from '../services/myBusinessOverviewApi';
import {
  PolicyDateRangeFilter,
  PoliciesTimeframe,
  toPolicyRequestDate,
} from './AgentPoliciesV2';

type OverviewMode = 'business' | 'agency';

interface BusinessOverviewDashboardProps {
  mode: OverviewMode;
  scopeEyebrow: string;
  overviewEyebrow: string;
  title: string;
  subtitlePrefix: string;
  loadingLabel: string;
  initialTimeframe?: PoliciesTimeframe;
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const compactCurrencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
});

const chartColors = ['#0f172a', '#d49b17', '#10b981', '#64748b', '#f97316', '#3b82f6'];

const stateNameToCode: Record<string, string> = {
  Alabama: 'AL', Alaska: 'AK', Arizona: 'AZ', Arkansas: 'AR', California: 'CA', Colorado: 'CO', Connecticut: 'CT', Delaware: 'DE',
  Florida: 'FL', Georgia: 'GA', Hawaii: 'HI', Idaho: 'ID', Illinois: 'IL', Indiana: 'IN', Iowa: 'IA', Kansas: 'KS',
  Kentucky: 'KY', Louisiana: 'LA', Maine: 'ME', Maryland: 'MD', Massachusetts: 'MA', Michigan: 'MI', Minnesota: 'MN', Mississippi: 'MS',
  Missouri: 'MO', Montana: 'MT', Nebraska: 'NE', Nevada: 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM',
  'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', Ohio: 'OH', Oklahoma: 'OK', Oregon: 'OR', Pennsylvania: 'PA',
  'Rhode Island': 'RI', 'South Carolina': 'SC', 'South Dakota': 'SD', Tennessee: 'TN', Texas: 'TX', Utah: 'UT', Vermont: 'VT',
  Virginia: 'VA', Washington: 'WA', 'West Virginia': 'WV', Wisconsin: 'WI', Wyoming: 'WY',
};

const stateTileRows = [
  ['AK', '', '', '', '', '', '', '', '', '', 'ME'],
  ['', '', '', '', '', '', '', '', '', 'VT', 'NH'],
  ['WA', 'ID', 'MT', 'ND', 'MN', 'IL', 'WI', 'MI', 'NY', 'MA', 'RI'],
  ['OR', 'NV', 'WY', 'SD', 'IA', 'IN', 'OH', 'PA', 'NJ', 'CT', ''],
  ['CA', 'UT', 'CO', 'NE', 'MO', 'KY', 'WV', 'VA', 'MD', 'DE', ''],
  ['', 'AZ', 'NM', 'KS', 'AR', 'TN', 'NC', 'SC', '', '', ''],
  ['', '', 'OK', 'LA', 'MS', 'AL', 'GA', '', '', '', ''],
  ['HI', '', 'TX', '', '', '', 'FL', '', '', '', ''],
];

export const BusinessOverviewDashboard: React.FC<BusinessOverviewDashboardProps> = ({
  mode,
  scopeEyebrow,
  overviewEyebrow,
  title,
  subtitlePrefix,
  loadingLabel,
  initialTimeframe = 'all',
}) => {
  const { currentAgentId, selectedAgentIds, subAgents, viewingAgentName } = useAgentContext();
  const [timeframe, setTimeframe] = useState<PoliciesTimeframe>(initialTimeframe);
  const [startDate, setStartDate] = useState<number | undefined>(undefined);
  const [endDate, setEndDate] = useState<number | undefined>(undefined);
  const [selectedAgentId, setSelectedAgentId] = useState<string>(currentAgentId);
  const [data, setData] = useState<MyBusinessOverviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const agentOptions = useMemo(() => (
    (selectedAgentIds.length > 0 ? selectedAgentIds : [currentAgentId])
      .filter(Boolean)
      .filter((agentId, index, all) => all.indexOf(agentId) === index)
      .map(agentId => {
        const subAgent = subAgents.find(agent => agent.agentId === agentId);
        return {
          id: agentId,
          label: subAgent?.name || (agentId === currentAgentId ? viewingAgentName : agentId),
        };
      })
  ), [currentAgentId, selectedAgentIds, subAgents, viewingAgentName]);

  useEffect(() => {
    const nextSelectedId = agentOptions.some(agent => agent.id === selectedAgentId)
      ? selectedAgentId
      : (agentOptions[0]?.id || currentAgentId);

    if (nextSelectedId && nextSelectedId !== selectedAgentId) {
      setSelectedAgentId(nextSelectedId);
    }
  }, [agentOptions, currentAgentId, selectedAgentId]);

  const selectedAgentLabel = agentOptions.find(agent => agent.id === selectedAgentId)?.label || viewingAgentName || 'Selected Agent';

  useEffect(() => {
    if (!selectedAgentId) {
      setData(null);
      return;
    }
    if (timeframe === 'custom' && (startDate === undefined || endDate === undefined)) {
      setData(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    myBusinessOverviewApi.getOverview({
      mode,
      agentId: selectedAgentId,
      timeframe: timeframe === 'all' ? null : timeframe,
      startDate: timeframe === 'custom' ? toPolicyRequestDate(startDate) : null,
      endDate: timeframe === 'custom' ? toPolicyRequestDate(endDate) : null,
    })
      .then(result => {
        if (!cancelled) setData(result);
      })
      .catch(err => {
        if (!cancelled) setError(err instanceof Error ? err.message : `Failed to load ${mode} overview.`);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [endDate, mode, selectedAgentId, startDate, timeframe]);

  const states = useMemo(() => (
    [...(data?.by_state || [])]
      .filter(item => item.state)
      .map(item => ({
        ...item,
        records: Number(item.records) || 0,
        total_ap: Number(item.total_ap) || 0,
        code: stateNameToCode[item.state] || item.state.slice(0, 2).toUpperCase(),
      }))
      .sort((a, b) => b.total_ap - a.total_ap)
  ), [data]);

  const sources = useMemo(() => (
    [...(data?.by_source || [])]
      .map(item => ({
        ...item,
        label: item.source_name || item.name || item.source || 'Unknown Source',
        records: Number(item.records) || 0,
        total_ap: Number(item.total_ap) || 0,
      }))
      .filter(item => item.label)
      .sort((a, b) => b.total_ap - a.total_ap)
  ), [data]);

  const policyStatuses = useMemo(() => (
    [...(data?.by_policyStatus || [])]
      .map(item => ({
        label: item.policy_status_name || item.policy_status || item.status || item.name || 'Unknown Status',
        records: Number(item.policy_count ?? item.records) || 0,
        total_ap: Number(item.total_ap) || 0,
      }))
      .filter(item => item.label && (item.records > 0 || item.total_ap > 0))
      .sort((a, b) => b.total_ap - a.total_ap)
  ), [data]);

  const totals = useMemo(() => {
    const records = states.reduce((sum, item) => sum + item.records, 0);
    const annualPremium = states.reduce((sum, item) => sum + item.total_ap, 0);
    return {
      records,
      annualPremium,
      stateCount: states.length,
      averagePremium: records > 0 ? annualPremium / records : 0,
      topState: states[0],
    };
  }, [states]);

  const maxStatePremium = Math.max(...states.map(item => item.total_ap), 1);
  const maxPolicyStatusPremium = Math.max(...policyStatuses.map(item => item.total_ap), 1);
  const statesByCode = useMemo(() => new Map(states.map(item => [item.code, item])), [states]);

  const topSourceChartData = useMemo(() => (
    sources.slice(0, 6).map(item => ({
      name: item.label,
      records: item.records,
      annualPremium: item.total_ap,
    }))
  ), [sources]);

  const sourceTotals = useMemo(() => ({
    records: sources.reduce((sum, item) => sum + item.records, 0),
    annualPremium: sources.reduce((sum, item) => sum + item.total_ap, 0),
  }), [sources]);

  const stateTileClass = (amount: number) => {
    if (amount <= 0) return 'border-slate-100 bg-slate-100 text-slate-300';
    const intensity = amount / maxStatePremium;
    if (intensity > 0.75) return 'border-slate-950 bg-slate-950 text-white shadow-lg shadow-slate-200';
    if (intensity > 0.45) return 'border-amber-400 bg-amber-400 text-slate-950 shadow-md shadow-amber-100';
    if (intensity > 0.2) return 'border-amber-200 bg-amber-100 text-amber-900';
    return 'border-slate-200 bg-white text-slate-500';
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">{scopeEyebrow}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {agentOptions.map(agent => {
              const active = agent.id === selectedAgentId;
              return (
                <button
                  key={agent.id}
                  type="button"
                  onClick={() => setSelectedAgentId(agent.id)}
                  className={`rounded-2xl px-4 py-2.5 text-xs font-black transition-all ${
                    active
                      ? 'bg-slate-950 text-white shadow-lg shadow-slate-900/15'
                      : 'border border-slate-100 bg-white text-slate-500 hover:border-slate-200 hover:text-slate-950'
                  }`}
                >
                  {agent.label}
                </button>
              );
            })}
          </div>
        </div>

        <PolicyDateRangeFilter
          timeframe={timeframe}
          startDate={startDate}
          endDate={endDate}
          onTimeframeChange={setTimeframe}
          onDateChange={(start, end) => {
            setStartDate(start);
            setEndDate(end);
          }}
        />
      </div>

      <section className="overflow-hidden rounded-[2rem] border border-white/80 bg-white shadow-sm">
        <div className="flex flex-col gap-5 border-b border-slate-100 p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-amber-300 shadow-lg shadow-slate-200">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">{overviewEyebrow}</p>
              <h2 className="text-2xl font-black tracking-tight text-slate-950">{title}</h2>
              <p className="text-sm font-semibold text-slate-500">{subtitlePrefix} {selectedAgentLabel}.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setTimeframe('all');
              setStartDate(undefined);
              setEndDate(undefined);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-500 transition-all hover:bg-white hover:text-slate-950"
          >
            <RotateCcw className="h-4 w-4" />
            Reset Range
          </button>
        </div>

        {error ? (
          <div className="p-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-500">
              <AlertCircle className="h-5 w-5" />
            </div>
            <p className="mt-4 text-sm font-black text-slate-950">Failed to load overview</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">{error}</p>
          </div>
        ) : isLoading ? (
          <div className="flex min-h-72 items-center justify-center gap-3 p-10 text-sm font-bold text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
            {loadingLabel}
          </div>
        ) : (
          <div className="space-y-6 bg-slate-50/70 p-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="relative overflow-hidden rounded-[1.75rem] bg-slate-950 p-6 text-white shadow-xl shadow-slate-200">
                <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full border border-white/10" />
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-400 text-slate-950">
                  <MapPinned className="h-5 w-5" />
                </div>
                <p className="mt-8 text-[10px] font-black uppercase tracking-[0.26em] text-white/45">Total Annual Premium</p>
                <p className="mt-2 text-4xl font-black tracking-tight">{compactCurrencyFormatter.format(totals.annualPremium)}</p>
                <p className="mt-1 text-xs font-bold text-white/55">{currencyFormatter.format(totals.annualPremium)} exact</p>
              </div>

              <div className="rounded-[1.75rem] border border-slate-100 bg-white p-6 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Submitted Records</p>
                <p className="mt-4 text-4xl font-black tracking-tight text-slate-950">{totals.records.toLocaleString()}</p>
                <p className="mt-2 text-xs font-bold text-slate-500">Across the selected scope and date range.</p>
              </div>

              <div className="rounded-[1.75rem] border border-slate-100 bg-white p-6 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Market Coverage</p>
                <p className="mt-4 text-4xl font-black tracking-tight text-slate-950">{totals.stateCount.toLocaleString()}</p>
                <p className="mt-2 text-xs font-bold text-slate-500">States with production returned.</p>
              </div>

              <div className="rounded-[1.75rem] border border-amber-200 bg-amber-50 p-6 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-700">Lead Sources</p>
                <p className="mt-4 text-4xl font-black tracking-tight text-slate-950">{sources.length.toLocaleString()}</p>
                <p className="mt-2 text-xs font-bold text-amber-800/70">
                  Avg AP / record: {currencyFormatter.format(totals.averagePremium)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <section className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
                <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">State Heat Map</p>
                    <h3 className="text-2xl font-black tracking-tight text-slate-950">Production by state</h3>
                    <p className="mt-1 text-sm font-semibold text-slate-500">Darker states carry higher annual premium.</p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Top State</p>
                    <p className="text-sm font-black text-slate-950">{totals.topState?.state || 'No state data'}</p>
                  </div>
                </div>

                {states.length === 0 ? (
                  <div className="flex h-80 items-center justify-center rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 text-sm font-bold text-slate-400">
                    No state production returned for this range.
                  </div>
                ) : (
                  <div className="grid grid-cols-11 gap-2 rounded-[1.5rem] bg-slate-50 p-5">
                    {stateTileRows.flatMap((row, rowIndex) => row.map((code, colIndex) => {
                      const state = code ? statesByCode.get(code) : null;
                      const stateTitle = state ? `${state.state}: ${currencyFormatter.format(state.total_ap)} - ${state.records} records` : code;
                      return code ? (
                        <div
                          key={`${code}-${rowIndex}-${colIndex}`}
                          title={stateTitle}
                          className={`flex aspect-square min-h-9 items-center justify-center rounded-xl border text-[10px] font-black transition-all ${stateTileClass(state?.total_ap || 0)}`}
                        >
                          {code}
                        </div>
                      ) : (
                        <div key={`empty-${rowIndex}-${colIndex}`} className="aspect-square min-h-9" />
                      );
                    }))}
                  </div>
                )}
              </section>

              <section className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">State Rundown</p>
                <h3 className="text-2xl font-black tracking-tight text-slate-950">Top markets</h3>
                <div className="mt-5 max-h-[24rem] space-y-3 overflow-y-auto pr-2">
                  {states.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm font-bold text-slate-400">No state data.</div>
                  ) : states.slice(0, 12).map((item, index) => {
                    const percent = Math.max(4, (item.total_ap / maxStatePremium) * 100);
                    return (
                      <div key={`${item.state}-rundown-${index}`} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-slate-950">{index + 1}. {item.state}</p>
                            <p className="mt-1 text-xs font-bold text-slate-400">{item.records.toLocaleString()} records</p>
                          </div>
                          <p className="text-sm font-black text-slate-950">{currencyFormatter.format(item.total_ap)}</p>
                        </div>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                          <div className="h-full rounded-full bg-gradient-to-r from-slate-950 to-amber-400" style={{ width: `${percent}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <section className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
                <div className="mb-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Policy Status</p>
                  <h3 className="text-2xl font-black tracking-tight text-slate-950">Status breakdown</h3>
                </div>
                <div className="max-h-80 space-y-3 overflow-y-auto pr-2">
                  {policyStatuses.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm font-bold text-slate-400">No policy status data returned yet.</div>
                  ) : policyStatuses.map((item, index) => {
                    const percent = Math.max(4, (item.total_ap / maxPolicyStatusPremium) * 100);
                    return (
                      <div key={`${item.label}-${index}`} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-slate-950">{item.label}</p>
                            <p className="mt-1 text-xs font-bold text-slate-400">{item.records.toLocaleString()} policies</p>
                          </div>
                          <p className="text-sm font-black text-slate-950">{currencyFormatter.format(item.total_ap)}</p>
                        </div>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                          <div className="h-full rounded-full bg-amber-400" style={{ width: `${percent}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
                <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Lead Source Mix</p>
                    <h3 className="text-2xl font-black tracking-tight text-slate-950">Source performance</h3>
                  </div>
                  <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Source AP</p>
                    <p className="text-sm font-black text-slate-950">{currencyFormatter.format(sourceTotals.annualPremium)}</p>
                  </div>
                </div>

                {topSourceChartData.length === 0 ? (
                  <div className="flex h-80 items-center justify-center rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 text-sm font-bold text-slate-400">
                    No source production returned for this range.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-5 lg:grid-cols-[0.9fr_1.1fr]">
                    <div className="relative h-72 min-w-0 rounded-[1.5rem] border border-slate-100 bg-slate-50 p-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart margin={{ top: 18, right: 18, bottom: 18, left: 18 }}>
                          <Pie
                            data={topSourceChartData}
                            dataKey="annualPremium"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={58}
                            outerRadius={94}
                            paddingAngle={4}
                            cornerRadius={12}
                          >
                            {topSourceChartData.map((entry, index) => (
                              <Cell key={`${entry.name}-${index}`} fill={chartColors[index % chartColors.length]} />
                            ))}
                          </Pie>
                          <RechartsTooltip
                            formatter={(value: number | string) => currencyFormatter.format(Number(value) || 0)}
                            labelStyle={{ color: '#0f172a', fontWeight: 800 }}
                            contentStyle={{ borderRadius: 16, border: '1px solid #e2e8f0' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <p className="text-3xl font-black tracking-tight text-slate-950">{sourceTotals.records.toLocaleString()}</p>
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Records</p>
                        </div>
                      </div>
                    </div>

                    <div className="max-h-72 space-y-3 overflow-y-auto pr-2">
                      {sources.slice(0, 8).map((item, index) => (
                        <div key={`${item.label}-source-${index}`} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span
                                  className="h-2.5 w-2.5 rounded-full"
                                  style={{ backgroundColor: chartColors[index % chartColors.length] }}
                                />
                                <p className="truncate text-sm font-black text-slate-950">{item.label}</p>
                              </div>
                              <p className="mt-2 text-lg font-black text-slate-950">{currencyFormatter.format(item.total_ap)}</p>
                            </div>
                            <span className="rounded-xl bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-500">
                              {item.records.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
