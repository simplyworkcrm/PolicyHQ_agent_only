import React, { useMemo } from 'react';
import { MyBusinessStateBreakdown } from '../services/myBusinessOverviewApi';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const stateNameToCode: Record<string, string> = {
  Alabama: 'AL', Alaska: 'AK', Arizona: 'AZ', Arkansas: 'AR', California: 'CA', Colorado: 'CO', Connecticut: 'CT', Delaware: 'DE', Florida: 'FL', Georgia: 'GA',
  Hawaii: 'HI', Idaho: 'ID', Illinois: 'IL', Indiana: 'IN', Iowa: 'IA', Kansas: 'KS', Kentucky: 'KY', Louisiana: 'LA', Maine: 'ME', Maryland: 'MD',
  Massachusetts: 'MA', Michigan: 'MI', Minnesota: 'MN', Mississippi: 'MS', Missouri: 'MO', Montana: 'MT', Nebraska: 'NE', Nevada: 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
  'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', Ohio: 'OH', Oklahoma: 'OK', Oregon: 'OR', Pennsylvania: 'PA', 'Rhode Island': 'RI',
  'South Carolina': 'SC', 'South Dakota': 'SD', Tennessee: 'TN', Texas: 'TX', Utah: 'UT', Vermont: 'VT', Virginia: 'VA', Washington: 'WA', 'West Virginia': 'WV', Wisconsin: 'WI', Wyoming: 'WY',
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

type StateProductionPanelsProps = {
  states: MyBusinessStateBreakdown[];
  loading?: boolean;
  error?: boolean;
  sidePanel?: React.ReactNode;
  compact?: boolean;
};

export const StateProductionPanels: React.FC<StateProductionPanelsProps> = ({
  states: rawStates,
  loading = false,
  error = false,
  sidePanel,
  compact = false,
}) => {
  const states = useMemo(() => (
    [...rawStates]
      .filter(item => item.state)
      .map(item => ({
        state: item.state,
        records: Number(item.records) || 0,
        total_ap: Number(item.total_ap) || 0,
        code: stateNameToCode[item.state] || item.state.slice(0, 2).toUpperCase(),
      }))
      .sort((a, b) => b.total_ap - a.total_ap)
  ), [rawStates]);

  const maxStatePremium = Math.max(...states.map(item => item.total_ap), 1);
  const statesByCode = useMemo(() => new Map(states.map(item => [item.code, item])), [states]);

  const stateTileClass = (amount: number) => {
    if (amount <= 0) return 'border-slate-100 bg-slate-100 text-slate-300';
    const intensity = amount / maxStatePremium;
    if (intensity > 0.75) return 'border-slate-950 bg-slate-950 text-white shadow-lg shadow-slate-200';
    if (intensity > 0.45) return 'border-amber-400 bg-amber-400 text-slate-950 shadow-md shadow-amber-100';
    if (intensity > 0.2) return 'border-amber-200 bg-amber-100 text-amber-900';
    return 'border-slate-200 bg-white text-slate-500';
  };

  const emptyMessage = loading ? 'Loading state production…' : error ? 'State production is temporarily unavailable.' : 'No state production returned.';

  return (
    <div className={`grid grid-cols-1 gap-4 ${sidePanel ? 'xl:grid-cols-[1.05fr_0.7fr_0.95fr]' : 'xl:grid-cols-[1.2fr_0.8fr]'}`}>
      <section className={`rounded-[2rem] border border-slate-100 bg-white shadow-sm ${compact ? 'p-4' : 'p-6'}`}>
        <div className={`flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between ${compact ? 'mb-4' : 'mb-6'}`}>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">State Heat Map</p>
            <h3 className={`${compact ? 'text-lg' : 'text-2xl'} font-black tracking-tight text-slate-950`}>Production by state</h3>
            <p className={`${compact ? 'text-xs' : 'mt-1 text-sm'} font-semibold text-slate-500`}>Darker states carry higher annual premium.</p>
          </div>
          <div className={`border border-slate-100 bg-slate-50 text-right ${compact ? 'rounded-xl px-3 py-2' : 'rounded-2xl px-4 py-3'}`}>
            <p className={`${compact ? 'text-[9px]' : 'text-[10px]'} font-black uppercase tracking-widest text-slate-400`}>Top State</p>
            <p className={`${compact ? 'text-xs' : 'text-sm'} font-black text-slate-950`}>{states[0]?.state || (loading ? 'Loading…' : 'No state data')}</p>
          </div>
        </div>

        {states.length === 0 ? (
          <div className="flex h-80 items-center justify-center rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 px-6 text-center text-sm font-bold text-slate-400">
            {emptyMessage}
          </div>
        ) : (
          <div className={`grid grid-cols-11 bg-slate-50 ${compact ? 'gap-1.5 rounded-xl p-3' : 'gap-2 rounded-[1.5rem] p-5'}`}>
            {stateTileRows.flatMap((row, rowIndex) => row.map((code, colIndex) => {
              const state = code ? statesByCode.get(code) : null;
              const title = state ? `${state.state}: ${currencyFormatter.format(state.total_ap)} · ${state.records} records` : code;
              return code ? (
                <div
                  key={`${code}-${rowIndex}-${colIndex}`}
                  title={title}
                  className={`flex aspect-square items-center justify-center border font-black transition-all ${compact ? 'min-h-7 rounded-lg text-[9px]' : 'min-h-9 rounded-xl text-[10px]'} ${stateTileClass(state?.total_ap || 0)}`}
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

      <section className={`flex min-h-0 flex-col overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-sm ${sidePanel ? 'xl:h-0 xl:min-h-full' : ''} ${compact ? 'p-4' : 'p-6'}`}>
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">State Rundown</p>
        <h3 className={`${compact ? 'text-lg' : 'text-2xl'} font-black tracking-tight text-slate-950`}>Top markets</h3>
        <div className={`${sidePanel ? 'min-h-0 flex-1' : compact ? 'max-h-[20rem]' : 'max-h-[24rem]'} ${compact ? 'mt-3 pr-1' : 'mt-5 space-y-3 pr-2'} overflow-y-auto`}>
          {states.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm font-bold text-slate-400">{emptyMessage}</div>
          ) : states.slice(0, 12).map((item, index) => {
            const percent = Math.max(4, (item.total_ap / maxStatePremium) * 100);
            return (
              <div key={`${item.state}-rundown-${index}`} className={compact ? 'border-b border-slate-100 px-1 py-2.5 last:border-b-0' : 'rounded-2xl border border-slate-100 bg-slate-50 p-4'}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className={`truncate font-semibold text-slate-800 ${compact ? 'text-[10px]' : 'text-sm'}`}>{item.state}</p>
                    <p className={`${compact ? 'mt-0.5 text-[8px]' : 'mt-1 text-xs'} font-bold text-slate-400`}>{item.records.toLocaleString()} records</p>
                  </div>
                  <p className={`font-semibold tabular-nums text-slate-800 ${compact ? 'text-[10px]' : 'text-sm'}`}>{currencyFormatter.format(item.total_ap)}</p>
                </div>
                {!compact && (
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                    <div className="h-full rounded-full bg-gradient-to-r from-slate-950 to-amber-400" style={{ width: `${percent}%` }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
      {sidePanel}
    </div>
  );
};
