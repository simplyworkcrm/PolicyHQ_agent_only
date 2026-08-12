import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Info,
  Search,
  Target,
} from 'lucide-react';
import {
  bookOfBusinessApi,
  BookOfBusinessMonthlyPerformance,
  BookOfBusinessPolicy,
  BookOfBusinessSummary,
} from '../services/bookOfBusinessApi';
import { MyBusinessAgencyProfile, MyBusinessSourceBreakdown, myBusinessOverviewApi, MyBusinessStateBreakdown } from '../services/myBusinessOverviewApi';
import { PolicyV2 } from '../services/agentPoliciesV2Api';
import { AgentPoliciesV2 } from './AgentPoliciesV2';
import { StateProductionPanels } from './StateProductionPanels';
import { useAgentContext } from '../context/AgentContext';

type CalendarMetric = 'submitted' | 'issued';

type DayPerformance = {
  date: string;
  day: number;
  inMonth: boolean;
  submittedAp: number;
  submittedPolicies: number;
  issuedAp: number;
  issuedPolicies: number;
  policyIds: string[];
};

type AttentionPolicy = {
  policy: PolicyV2;
  reasons: Array<'Missing policy number' | 'Duplicate policy number'>;
};

type MockPolicy = {
  client: string;
  number: string;
  carrier: string;
  product: string;
  status: string;
  source: string;
  sourceCost: string;
  submitted: string;
  draftDate: string;
  draftNote?: string;
  annualPremium: number;
};

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const compactUsd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
});

const pipeline = [
  { label: 'Submitted', policies: 2, ap: 1047, color: '#94A3B8' },
  { label: 'Underwriting', policies: 6, ap: 7009, color: '#3B82F6' },
  { label: 'Approved', policies: 12, ap: 12334, color: '#34D399' },
  { label: 'Issued & Paid', policies: 71, ap: 76121, color: '#10B981' },
  { label: 'Needs Action', policies: 13, ap: 14432, color: '#F59E0B' },
  { label: 'Lost', policies: 2, ap: 2062, color: '#F43F5E' },
];

const leadSources = [
  { name: 'Facebook — Direct Mail Reply', vendor: 'Redbird Agents', policies: 17, spend: '$578 spend', ap: '$19,716', efficiency: '34.1x AP/$', persistency: '83%' },
  { name: 'Referral', vendor: 'Organic', policies: 11, spend: 'no cost', ap: '$17,584', efficiency: 'organic', persistency: '75%' },
  { name: 'Live Transfer', vendor: 'Prospect Nation', policies: 11, spend: '$748 spend', ap: '$17,187', efficiency: '23.0x AP/$', persistency: '90%' },
  { name: 'Orphan / Book Re-work', vendor: 'In-House', policies: 11, spend: 'no cost', ap: '$17,021', efficiency: 'organic', persistency: '90%' },
  { name: 'TikTok Form', vendor: 'Sunrise Media', policies: 17, spend: '$306 spend', ap: '$11,769', efficiency: '38.5x AP/$', persistency: '88%' },
  { name: 'Direct Mail Card', vendor: 'Need-A-Lead', policies: 10, spend: '$410 spend', ap: '$11,249', efficiency: '27.4x AP/$', persistency: '75%' },
  { name: 'Facebook — Instant Form', vendor: 'Lead Heroes', policies: 14, spend: '$308 spend', ap: '$9,878', efficiency: '32.1x AP/$', persistency: '75%' },
  { name: 'Aged Internet (90d)', vendor: 'Lead Heroes', policies: 15, spend: '$90 spend', ap: '$8,602', efficiency: '95.6x AP/$', persistency: '80%' },
];

const bookPolicies: MockPolicy[] = [
  { client: 'Bernice Fairchild', number: 'AET-492486', carrier: 'Aetna / CVS', product: 'Protection Series', status: 'Approved', source: 'Referral', sourceCost: 'no cost', submitted: 'Jul 31', draftDate: 'Aug 15', draftNote: 'pushed 1x', annualPremium: 1415 },
  { client: 'Jermaine Sinclair', number: 'PRO-492555', carrier: 'Prosperity', product: 'New Vista Graded', status: 'Needs Action', source: 'Referral', sourceCost: 'no cost', submitted: 'Jul 31', draftDate: 'Aug 1', annualPremium: 932 },
  { client: 'Beatrice Pemberton', number: 'PRO-492263', carrier: 'Prosperity', product: 'New Vista Level', status: 'Needs Action', source: 'Aged Internet (90d)', sourceCost: '$6 CPL', submitted: 'Jul 30', draftDate: 'Aug 1', annualPremium: 448 },
  { client: 'Ruthie Cardwell', number: 'FOR-492377', carrier: 'Foresters', product: 'PlanRight Preferred', status: 'Approved', source: 'Orphan / Book Re-work', sourceCost: 'no cost', submitted: 'Jul 30', draftDate: 'Sep 6', draftNote: 'pushed 2x', annualPremium: 1374 },
  { client: 'Tameka Winslow', number: 'SBL-492036', carrier: 'SBLI', product: 'Living Legacy', status: 'Paid', source: 'Direct Mail Card', sourceCost: '$41 CPL', submitted: 'Jul 29', draftDate: 'Aug 1', annualPremium: 720 },
  { client: 'Priscilla Rutherford', number: 'MUT-492180', carrier: 'Mutual of Omaha', product: 'Living Promise Level', status: 'Paid', source: 'Facebook — Instant Form', sourceCost: '$22 CPL', submitted: 'Jul 29', draftDate: 'Aug 1', annualPremium: 726 },
  { client: 'Deborah Loving', number: 'MUT-491963', carrier: 'Mutual of Omaha', product: 'Living Promise Graded', status: 'Paid', source: 'Live Transfer', sourceCost: '$68 CPL', submitted: 'Jul 28', draftDate: 'Aug 1', annualPremium: 1865 },
  { client: 'Eugene Fairchild', number: 'PRO-491857', carrier: 'Prosperity', product: 'New Vista Level', status: 'Approved', source: 'Direct Mail Card', sourceCost: '$41 CPL', submitted: 'Jul 27', draftDate: 'Sep 2', draftNote: 'pushed 1x', annualPremium: 1430 },
  { client: 'Vanessa Ashworth', number: 'AET-491752', carrier: 'Aetna / CVS', product: 'Protection Series', status: 'Paid', source: 'Referral', sourceCost: 'no cost', submitted: 'Jul 24', draftDate: 'Aug 1', annualPremium: 2439 },
  { client: 'Horace Ashworth', number: 'FOR-491688', carrier: 'Foresters', product: 'Strong Foundation', status: 'Lost', source: 'Facebook — Instant Form', sourceCost: '$22 CPL', submitted: 'Jul 23', draftDate: 'Aug 23', draftNote: 'pushed 1x', annualPremium: 992 },
  { client: 'Ezekiel Pemberton', number: 'TRA-491440', carrier: 'Transamerica', product: 'Final Expense Solution', status: 'Underwriting', source: 'Aged Internet (90d)', sourceCost: '$6 CPL', submitted: 'Jul 22', draftDate: 'Sep 9', draftNote: 'pushed 1x', annualPremium: 431 },
  { client: 'Cornelius Kimbrough', number: 'COR-491598', carrier: 'Corebridge', product: 'Select-a-Term', status: 'Paid', source: 'Live Transfer', sourceCost: '$68 CPL', submitted: 'Jul 22', draftDate: 'Aug 1', annualPremium: 790 },
  { client: 'Willie Fairchild', number: 'AET-491349', carrier: 'Aetna / CVS', product: 'Accendo Level', status: 'Needs Action', source: 'Orphan / Book Re-work', sourceCost: 'no cost', submitted: 'Jul 21', draftDate: 'Aug 1', annualPremium: 1912 },
  { client: 'Loretta Ashworth', number: 'FOR-491131', carrier: 'Foresters', product: 'PlanRight Basic', status: 'Paid', source: 'TikTok Form', sourceCost: '$18 CPL', submitted: 'Jul 20', draftDate: 'Aug 1', annualPremium: 555 },
  { client: 'Yolanda Pemberton', number: 'AET-489070', carrier: 'Aetna / CVS', product: 'Protection Series', status: 'Underwriting', source: 'Facebook — Direct Mail Reply', sourceCost: '$34 CPL', submitted: 'Jul 1', draftDate: 'Aug 21', draftNote: 'pushed 1x', annualPremium: 1585 },
  { client: 'Marcus Kimbrough', number: 'AET-487924', carrier: 'Aetna / CVS', product: 'Protection Series', status: 'Submitted', source: 'Aged Internet (90d)', sourceCost: '$6 CPL', submitted: 'Jun 24', draftDate: 'Sep 8', draftNote: 'pushed 2x', annualPremium: 614 },
];

const cashFlowWeeks = [
  { label: 'Jul 1–7', paid: 4820, scheduled: 1280, pastDue: 740 },
  { label: 'Jul 8–14', paid: 5260, scheduled: 2180, pastDue: 1160 },
  { label: 'Jul 15–21', paid: 6110, scheduled: 2940, pastDue: 1740 },
  { label: 'Jul 22–28', paid: 3737, scheduled: 4210, pastDue: 2087 },
  { label: 'Jul 29–Aug 4', paid: 0, scheduled: 5237, pastDue: 2220 },
];

const LeadSourcesPanel: React.FC<{ sources: MyBusinessSourceBreakdown[]; loading: boolean; error: boolean }> = ({ sources: rawSources, loading, error }) => {
  const sources = [...rawSources]
    .map(source => ({
      name: source.source_name || source.name || source.source || 'Unknown Source',
      records: Number(source.records) || 0,
      annualPremium: Number(source.total_ap) || 0,
    }))
    .filter(source => source.name)
    .sort((a, b) => b.annualPremium - a.annualPremium);
  const totalAnnualPremium = sources.reduce((total, source) => total + source.annualPremium, 0);
  const totalRecords = sources.reduce((total, source) => total + source.records, 0);
  const emptyMessage = loading ? 'Loading lead sources…' : error ? 'Lead-source data is temporarily unavailable.' : 'No lead-source data returned.';

  return (
    <section className="flex min-h-0 flex-col overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-sm xl:h-0 xl:min-h-full">
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Lead Sources</p>
          <h2 className="mt-1 text-lg font-black tracking-tight text-slate-950">Where the book came from</h2>
        </div>
        <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-right">
          <p className="text-[8px] font-black uppercase tracking-widest text-amber-700">Source AP</p>
          <p className="text-[11px] font-black text-slate-950">{loading ? 'Loading…' : usd.format(totalAnnualPremium)}</p>
          {!loading && <p className="mt-0.5 text-[8px] font-bold text-slate-400">{totalRecords.toLocaleString()} records</p>}
        </div>
      </div>
      <div className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto">
        {sources.length === 0 ? (
          <p className="px-5 py-6 text-[10px] font-bold text-slate-400">{emptyMessage}</p>
        ) : sources.map(source => (
          <div key={source.name} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-5 py-3">
            <div className="min-w-0">
              <p className="truncate text-[10px] font-semibold text-slate-800">{source.name}</p>
              <p className="mt-0.5 text-[8px] font-semibold text-slate-400">{source.records.toLocaleString()} {source.records === 1 ? 'record' : 'records'}</p>
            </div>
            <p className="text-[10px] font-semibold tabular-nums text-slate-800">{usd.format(source.annualPremium)}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

const dayFormatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  timeZone: 'UTC',
});

const monthFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

const monthDayFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});

const toDateKey = (date: Date) => date.toISOString().slice(0, 10);
const toLocalDateKey = (date: Date) => [
  date.getFullYear(),
  String(date.getMonth() + 1).padStart(2, '0'),
  String(date.getDate()).padStart(2, '0'),
].join('-');

const getMetric = (day: DayPerformance, metric: CalendarMetric) => metric === 'submitted'
  ? { ap: day.submittedAp, policies: day.submittedPolicies }
  : { ap: day.issuedAp, policies: day.issuedPolicies };

const getDayTone = (day: DayPerformance, metric: CalendarMetric, dailyGoal: number | null, isPlanDate: boolean) => {
  const { ap } = getMetric(day, metric);
  if (!day.inMonth) return 'border-transparent bg-white/45 text-slate-300';
  if (ap === 0) return 'border-slate-100 bg-white text-slate-300';
  if (metric !== 'submitted' || !dailyGoal || !isPlanDate) return 'border-slate-200 bg-slate-50 text-slate-800';
  if (ap >= dailyGoal) return 'border-emerald-200 bg-emerald-50/80 text-emerald-900';
  return 'border-rose-200 bg-rose-50/75 text-rose-800';
};

type BookOfBusinessDashboardProps = {
  agentId: string;
  scope?: 'agent' | 'agency';
};

export const BookOfBusinessDashboard: React.FC<BookOfBusinessDashboardProps> = ({ agentId, scope = 'agent' }) => {
  const isAgencyScope = scope === 'agency';
  const { incomePlan, incomePlanLoading, incomePlanError } = useAgentContext();
  const activeIncomePlan = isAgencyScope ? null : incomePlan;
  const dailyGoal = activeIncomePlan ? Number(activeIncomePlan.daily_ap_target) : null;
  const monthlyGoal = activeIncomePlan ? Number(activeIncomePlan.monthly_ap_target) : null;
  const isWithinPlan = (date: string) => Boolean(activeIncomePlan
    && (!activeIncomePlan.plan_start_date || date >= activeIncomePlan.plan_start_date)
    && (!activeIncomePlan.plan_end_date || date <= activeIncomePlan.plan_end_date));
  const [metric, setMetric] = useState<CalendarMetric>('submitted');
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const today = new Date();
    return new Date(Date.UTC(today.getFullYear(), today.getMonth(), 1));
  });
  const [selectedDate, setSelectedDate] = useState(() => toLocalDateKey(new Date()));
  const [activeStage, setActiveStage] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [summary, setSummary] = useState<BookOfBusinessSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState(false);
  const [monthlyPerformance, setMonthlyPerformance] = useState<BookOfBusinessMonthlyPerformance[]>([]);
  const [monthlyLoading, setMonthlyLoading] = useState(true);
  const [monthlyError, setMonthlyError] = useState(false);
  const [selectedPolicies, setSelectedPolicies] = useState<BookOfBusinessPolicy[]>([]);
  const [selectedPoliciesLoading, setSelectedPoliciesLoading] = useState(false);
  const [selectedPoliciesError, setSelectedPoliciesError] = useState(false);
  const [stateProduction, setStateProduction] = useState<MyBusinessStateBreakdown[]>([]);
  const [leadSourceProduction, setLeadSourceProduction] = useState<MyBusinessSourceBreakdown[]>([]);
  const [stateProductionLoading, setStateProductionLoading] = useState(true);
  const [stateProductionError, setStateProductionError] = useState(false);
  const [agencyProfile, setAgencyProfile] = useState<MyBusinessAgencyProfile | null>(null);
  const [canEditAgencyGoal, setCanEditAgencyGoal] = useState(false);
  const [attentionPolicies, setAttentionPolicies] = useState<AttentionPolicy[]>([]);
  const [attentionPoliciesLoading, setAttentionPoliciesLoading] = useState(true);
  const [attentionPoliciesError, setAttentionPoliciesError] = useState(false);

  const monthRange = useMemo(() => {
    const year = visibleMonth.getUTCFullYear();
    const month = visibleMonth.getUTCMonth();
    const firstWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay();
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const totalCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
    const firstCellDate = new Date(Date.UTC(year, month, 1 - firstWeekday));
    const lastCellDate = new Date(firstCellDate);
    lastCellDate.setUTCDate(firstCellDate.getUTCDate() + totalCells - 1);

    return {
      startDate: toDateKey(new Date(Date.UTC(year, month, 1))),
      endDate: toDateKey(new Date(Date.UTC(year, month + 1, 0))),
      requestStartDate: toDateKey(firstCellDate),
      requestEndDate: toDateKey(lastCellDate),
    };
  }, [visibleMonth]);

  useEffect(() => {
    const controller = new AbortController();
    setSummary(null);
    setSummaryError(false);

    if (!agentId) {
      setSummaryLoading(false);
      return () => controller.abort();
    }

    setSummaryLoading(true);
    const summaryRequest = isAgencyScope
      ? bookOfBusinessApi.getAgencySummary(agentId, controller.signal)
      : bookOfBusinessApi.getSummary(agentId, controller.signal);

    summaryRequest
      .then(setSummary)
      .catch(error => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        console.error(`Unable to load ${isAgencyScope ? 'Agency ' : ''}Book of Business summary`, error);
        setSummaryError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setSummaryLoading(false);
      });

    return () => controller.abort();
  }, [agentId, isAgencyScope]);

  useEffect(() => {
    let cancelled = false;
    setStateProduction([]);
    setLeadSourceProduction([]);
    setStateProductionError(false);
    if (isAgencyScope) {
      setAgencyProfile(null);
      setCanEditAgencyGoal(false);
    }

    if (!agentId) {
      setStateProductionLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setStateProductionLoading(true);
    myBusinessOverviewApi.getOverview({
      agentId,
      timeframe: 'yearly',
      startDate: null,
      endDate: null,
      mode: isAgencyScope ? 'agency' : 'business',
    })
      .then(result => {
        if (!cancelled) {
          setStateProduction(result.by_state || []);
          setLeadSourceProduction(result.by_source || []);
          if (isAgencyScope) {
            setAgencyProfile(result.ffl_agency || null);
            setCanEditAgencyGoal(result.isAgency_manager === true);
          }
        }
      })
      .catch(error => {
        if (cancelled) return;
        console.error('Unable to load Book of Business state production', error);
        setStateProductionError(true);
      })
      .finally(() => {
        if (!cancelled) setStateProductionLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [agentId, isAgencyScope]);

  const agencyLogoUrl = typeof agencyProfile?.logo === 'string'
    ? agencyProfile.logo
    : agencyProfile?.logo?.url || '';

  useEffect(() => {
    const controller = new AbortController();
    const today = new Date();
    const todayKey = toLocalDateKey(today);
    const currentMonthStart = `${todayKey.slice(0, 7)}-01`;
    const isCurrentMonth = monthRange.startDate === currentMonthStart;
    const defaultSelectedDate = isCurrentMonth ? todayKey : monthRange.startDate;
    setMonthlyPerformance([]);
    setMonthlyError(false);
    setSelectedDate(defaultSelectedDate);

    if (!agentId) {
      setMonthlyLoading(false);
      return () => controller.abort();
    }

    setMonthlyLoading(true);
    const monthlyRequest = isAgencyScope
      ? bookOfBusinessApi.getAgencyMonthlyPerformance({
          agentId,
          startDate: monthRange.requestStartDate,
          endDate: monthRange.requestEndDate,
          scope: metric === 'issued' ? 'issued_paid' : 'submitted',
        }, controller.signal)
      : bookOfBusinessApi.getMonthlyPerformance({
      agentId,
      startDate: monthRange.requestStartDate,
      endDate: monthRange.requestEndDate,
      scope: metric === 'issued' ? 'issued_paid' : 'submitted',
        }, controller.signal);

    monthlyRequest
      .then(rows => {
        setMonthlyPerformance(rows);
        if (!isCurrentMonth) {
          const firstActiveDay = rows.find(row => (
            row.count > 0
            && row.submitted_date >= monthRange.startDate
            && row.submitted_date <= monthRange.endDate
          ))?.submitted_date;
          if (firstActiveDay) setSelectedDate(firstActiveDay);
        }
      })
      .catch(error => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        console.error(`Unable to load monthly ${isAgencyScope ? 'Agency ' : ''}Book of Business performance`, error);
        setMonthlyError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setMonthlyLoading(false);
      });

    return () => controller.abort();
  }, [agentId, isAgencyScope, metric, monthRange.endDate, monthRange.requestEndDate, monthRange.requestStartDate, monthRange.startDate]);

  const bookKpis = useMemo(() => {
    const pendingValue = summaryLoading ? 'Loading...' : '—';
    const pendingHelper = summaryError ? 'Unable to load' : summaryLoading ? 'Fetching live totals' : 'No data';
    const value = (amount: number | undefined) => amount === undefined ? pendingValue : usd.format(amount);

    return [
      {
        label: 'Gross AP',
        value: value(summary?.gross.ap),
        helper: summary ? `${summary.gross.count.toLocaleString()} policies written` : pendingHelper,
        note: 'Total annual premium from all policies submitted during the current calendar year, regardless of their current status.',
        tone: 'text-slate-950',
      },
      {
        label: 'Issued & Paid',
        value: value(summary?.issued_paid.paid.ap),
        helper: summary
          ? `${summary.issued_paid.paid.count.toLocaleString()} paid/in force · ${usd.format(Math.max(0, summary.issued_paid.ap - summary.issued_paid.paid.ap))} pending (${Math.max(0, summary.issued_paid.count - summary.issued_paid.paid.count).toLocaleString()})`
          : pendingHelper,
        note: 'Annual premium from policies approved by the carrier. The highlighted amount is paid and in force; pending represents approved premium awaiting payment.',
        tone: 'text-emerald-600',
      },
      { label: 'Avg AP / Policy', value: value(summary?.average), helper: 'Average written premium', note: null, tone: 'text-amber-600' },
    ];
  }, [summary, summaryError, summaryLoading]);

  const calendarDays = useMemo<DayPerformance[]>(() => {
    const year = visibleMonth.getUTCFullYear();
    const month = visibleMonth.getUTCMonth();
    const firstWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay();
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const totalCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
    const firstCellDate = new Date(Date.UTC(year, month, 1 - firstWeekday));
    const performanceByDate = new Map(monthlyPerformance.map(row => [row.submitted_date, row]));

    return Array.from({ length: totalCells }, (_, index) => {
      const cellDate = new Date(firstCellDate);
      cellDate.setUTCDate(firstCellDate.getUTCDate() + index);
      const date = toDateKey(cellDate);
      const inMonth = cellDate.getUTCMonth() === month;
      const record = performanceByDate.get(date);
      const ap = record?.total_annual_premium || 0;
      const policies = record?.count || 0;

      return {
        date,
        day: cellDate.getUTCDate(),
        inMonth,
        submittedAp: metric === 'submitted' ? ap : 0,
        submittedPolicies: metric === 'submitted' ? policies : 0,
        issuedAp: metric === 'issued' ? ap : 0,
        issuedPolicies: metric === 'issued' ? policies : 0,
        policyIds: record?.policy_ids || [],
      };
    });
  }, [metric, monthlyPerformance, visibleMonth]);

  const inMonthDays = calendarDays.filter(day => day.inMonth);
  const selectedDay = calendarDays.find(day => day.date === selectedDate) || inMonthDays[0];
  const selectedMetric = getMetric(selectedDay, metric);
  const monthlyAp = inMonthDays.reduce((total, day) => total + getMetric(day, metric).ap, 0);
  const planDays = inMonthDays.filter(day => isWithinPlan(day.date));
  const planPeriodAp = planDays.reduce((total, day) => total + getMetric(day, metric).ap, 0);
  const daysWorked = planDays.filter(day => getMetric(day, metric).ap > 0).length;
  const hasSubmittedGoal = metric === 'submitted' && Boolean(dailyGoal && monthlyGoal && planDays.length);
  const daysHit = hasSubmittedGoal ? planDays.filter(day => getMetric(day, metric).ap >= Number(dailyGoal)).length : 0;
  const goalAttainment = hasSubmittedGoal ? Math.round((planPeriodAp / Number(monthlyGoal)) * 100) : null;
  const selectedDateHasGoal = metric === 'submitted' && Boolean(dailyGoal) && isWithinPlan(selectedDay.date);
  const bestDay = inMonthDays.reduce(
    (best, day) => getMetric(day, metric).ap > getMetric(best, metric).ap ? day : best,
    inMonthDays[0],
  );
  const selectedPolicyIdsKey = selectedDay.policyIds.join(',');

  useEffect(() => {
    const controller = new AbortController();
    setSelectedPolicies([]);
    setSelectedPoliciesError(false);

    if (!agentId || !selectedDay.policyIds.length) {
      setSelectedPoliciesLoading(false);
      return () => controller.abort();
    }

    setSelectedPoliciesLoading(true);
    bookOfBusinessApi.getPoliciesByIds(agentId, selectedDay.policyIds, controller.signal)
      .then(setSelectedPolicies)
      .catch(error => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        console.error('Unable to load selected-day policy details', error);
        setSelectedPoliciesError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setSelectedPoliciesLoading(false);
      });

    return () => controller.abort();
  }, [agentId, selectedPolicyIdsKey]);

  const filteredPolicies = useMemo(() => {
    const query = search.trim().toLowerCase();
    return bookPolicies.filter(policy => {
      const stageMatch = !activeStage
        || (activeStage === 'Issued & Paid' ? policy.status === 'Paid' : policy.status === activeStage);
      const searchMatch = !query || [policy.client, policy.number, policy.carrier, policy.product, policy.source, policy.status]
        .some(value => value.toLowerCase().includes(query));
      return stageMatch && searchMatch;
    });
  }, [activeStage, search]);

  return (
    <div className="animate-in fade-in duration-300">
      {isAgencyScope && agencyProfile && (
        <section className="mb-4 rounded-2xl border border-slate-100/80 bg-white/55 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-white text-slate-400">
                {agencyLogoUrl ? (
                  <img src={agencyLogoUrl} alt={agencyProfile.name || 'Agency'} className="h-full w-full object-cover" />
                ) : (
                  <Building2 className="h-4 w-4" />
                )}
              </div>
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <div className="min-w-0">
                  <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-slate-400">Agency</p>
                  <p className="truncate text-sm font-semibold text-slate-700">{agencyProfile.name || 'Agency'}</p>
                </div>
                {canEditAgencyGoal && (
                  <span className="inline-flex rounded-full border border-amber-100 bg-amber-50 px-2 py-1 text-[8px] font-bold uppercase tracking-[0.1em] text-amber-700">
                    Manager
                  </span>
                )}
              </div>
          </div>
        </section>
      )}

      <section className="mb-5 grid grid-cols-1 overflow-visible rounded-[2rem] border border-white bg-white shadow-sm sm:grid-cols-2 xl:grid-cols-3">
        {bookKpis.map((kpi, index) => (
          <div key={kpi.label} className={`px-6 py-5 ${index > 0 ? 'xl:border-l xl:border-slate-100' : ''} ${index > 1 ? 'sm:border-t xl:border-t-0' : ''}`}>
            <div className="flex items-center gap-1.5">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">{kpi.label}</p>
              {kpi.note && (
                <div className="group relative inline-flex">
                  <button
                    type="button"
                    aria-label={`About ${kpi.label}`}
                    className="inline-flex h-4 w-4 items-center justify-center rounded-full text-slate-300 transition hover:bg-slate-100 hover:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  >
                    <Info className="h-3 w-3" />
                  </button>
                  <div
                    role="tooltip"
                    className="pointer-events-none invisible absolute left-1/2 top-6 z-30 w-64 -translate-x-1/2 rounded-xl bg-slate-950 px-3.5 py-3 text-left text-[11px] font-semibold normal-case leading-relaxed tracking-normal text-white opacity-0 shadow-xl transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
                  >
                    {kpi.note}
                  </div>
                </div>
              )}
            </div>
            <p className={`mt-2 text-2xl font-black tracking-tight ${kpi.tone}`}>{kpi.value}</p>
            <p className="mt-1 text-[10px] font-semibold text-slate-400">{kpi.helper}</p>
          </div>
        ))}
      </section>

      <section className="hidden overflow-hidden rounded-[2rem] border border-white bg-white shadow-sm">
        <div className="px-6 pb-5 pt-6 sm:px-7">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Pipeline</p>
          <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Where the book sits right now</h2>

          <div className="mt-6 flex h-3 overflow-hidden rounded-full bg-slate-100">
            {pipeline.map((stage, index) => (
              <button
                type="button"
                key={stage.label}
                onClick={() => setActiveStage(current => current === stage.label ? null : stage.label)}
                className={`h-full border-r-2 border-white transition last:border-r-0 ${activeStage && activeStage !== stage.label ? 'opacity-25' : 'opacity-100'}`}
                style={{ backgroundColor: stage.color, flex: index === 3 ? 8 : index === 4 ? 2 : 1 }}
                aria-label={`${stage.label} — ${stage.policies} policies`}
              />
            ))}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
            {pipeline.map(stage => (
              <button
                type="button"
                key={stage.label}
                onClick={() => setActiveStage(current => current === stage.label ? null : stage.label)}
                className={`min-w-0 rounded-xl p-2 text-left transition hover:bg-slate-50 ${activeStage === stage.label ? 'bg-slate-100 ring-1 ring-slate-200' : ''}`}
              >
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: stage.color }} />
                  <p className="truncate text-xs font-bold text-slate-500">{stage.label}</p>
                </div>
                <p className="mt-1 text-xl font-black tracking-tight text-slate-950">{usd.format(stage.ap)}</p>
                <p className="mt-0.5 text-[11px] font-semibold text-slate-400">{stage.policies} policies</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="mt-5 grid grid-cols-1 gap-4 xl:items-stretch xl:grid-cols-[minmax(0,1fr)_25vw]">
        <section className="overflow-hidden rounded-[2rem] border border-white bg-white shadow-sm">
          <div className="border-b border-emerald-100 bg-gradient-to-r from-emerald-50 via-teal-50 to-white px-6 py-3 sm:px-7">
            <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-800">
              <Target className="h-3.5 w-3.5" /> Looking back — what you put on the board, day by day
            </p>
          </div>

          <div className="flex flex-col gap-5 border-b border-slate-100 px-6 py-5 lg:flex-row lg:items-center lg:justify-between sm:px-7">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Daily performance</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">How each day went</h2>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex rounded-full bg-slate-100 p-1" role="tablist" aria-label="Calendar metric">
                <button
                  type="button"
                  role="tab"
                  aria-selected={metric === 'submitted'}
                  onClick={() => setMetric('submitted')}
                  className={`rounded-full px-4 py-2 text-xs font-black transition ${metric === 'submitted' ? 'bg-slate-950 text-white shadow-md' : 'text-slate-500 hover:text-slate-950'}`}
                >
                  Submitted · Date Created
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={metric === 'issued'}
                  onClick={() => setMetric('issued')}
                  className={`rounded-full px-4 py-2 text-xs font-black transition ${metric === 'issued' ? 'bg-slate-950 text-white shadow-md' : 'text-slate-500 hover:text-slate-950'}`}
                >
                  Effective Draft Date
                </button>
              </div>

              <p className="max-w-xs text-[9px] font-semibold leading-4 text-slate-400">
                {metric === 'submitted'
                  ? 'Policies are grouped by the date the record was created.'
                  : 'Policies are grouped by their initial draft date.'}
              </p>

              <div className="flex items-center gap-3 rounded-full border border-slate-100 bg-white px-3 py-2 shadow-sm">
                <button
                  type="button"
                  onClick={() => setVisibleMonth(current => new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() - 1, 1)))}
                  className="text-slate-400 transition hover:text-slate-950"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <p className="min-w-24 text-center text-sm font-black text-slate-950">{monthFormatter.format(visibleMonth)}</p>
                <button
                  type="button"
                  onClick={() => setVisibleMonth(current => new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + 1, 1)))}
                  className="text-slate-400 transition hover:text-slate-950"
                  aria-label="Next month"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 border-b border-slate-100 sm:grid-cols-4">
            {[
              { label: 'Month AP', value: monthlyLoading ? 'Loading...' : monthlyError ? '—' : usd.format(monthlyAp), helper: metric === 'submitted' ? 'premium by date created' : 'premium by initial draft date' },
              { label: 'Goal attainment', value: monthlyLoading || incomePlanLoading || goalAttainment === null ? '—' : `${goalAttainment}%`, helper: incomePlanError ? 'goal temporarily unavailable' : hasSubmittedGoal ? `against ${usd.format(Number(monthlyGoal))} monthly target` : 'set an Income Game Plan', accent: true },
              { label: 'Days hit', value: monthlyLoading || incomePlanLoading || !hasSubmittedGoal ? '—' : `${daysHit} / ${daysWorked}`, helper: incomePlanError ? 'goal temporarily unavailable' : hasSubmittedGoal ? 'goal days / production days' : 'set an Income Game Plan' },
              { label: 'Best day', value: monthlyLoading || !monthlyAp ? '—' : compactUsd.format(getMetric(bestDay, metric).ap), helper: monthlyError ? 'Unable to load' : monthlyAp ? monthDayFormatter.format(new Date(`${bestDay.date}T00:00:00Z`)) : 'No production yet' },
            ].map((stat, index) => (
              <div key={stat.label} className={`px-6 py-5 ${index > 0 ? 'border-l border-slate-100' : ''}`}>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{stat.label}</p>
                <p className={`mt-1 text-2xl font-black ${stat.accent ? 'text-emerald-600' : 'text-slate-950'}`}>{stat.value}</p>
                <p className="mt-0.5 text-[10px] font-semibold text-slate-400">{stat.helper}</p>
              </div>
            ))}
          </div>

          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-7 px-1 pb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <p key={day} className="text-center text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">{day}</p>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {calendarDays.map(day => {
                const value = getMetric(day, metric);
                const selected = selectedDate === day.date;
                const dayHasGoal = metric === 'submitted' && Boolean(dailyGoal) && isWithinPlan(day.date);
                const percent = dayHasGoal ? Math.round((value.ap / Number(dailyGoal)) * 100) : null;
                return (
                  <button
                    key={day.date}
                    type="button"
                    onClick={() => setSelectedDate(day.date)}
                    className={`relative min-h-[5.4rem] rounded-xl border p-2 text-left transition hover:-translate-y-0.5 hover:shadow-md ${getDayTone(day, metric, dailyGoal, dayHasGoal)} ${selected ? 'ring-2 ring-amber-400 ring-offset-2' : ''}`}
                    aria-label={`${day.date}: ${usd.format(value.ap)}`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-black opacity-70">{day.day}</span>
                      {value.policies > 0 && (
                        <span className={`flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[8px] font-black text-white ${dayHasGoal ? value.ap >= Number(dailyGoal) ? 'bg-emerald-500' : 'bg-rose-400' : 'bg-slate-400'}`}>{value.policies}</span>
                      )}
                    </div>
                    <p className={`mt-2 text-sm font-black ${value.ap === 0 ? 'text-slate-300' : ''}`}>{value.ap ? compactUsd.format(value.ap) : '—'}</p>
                    {value.ap > 0 && percent !== null && <p className="mt-0.5 text-[8px] font-bold opacity-55">{percent}% of goal</p>}
                    {value.ap > 0 && dayHasGoal && (
                      <span className={`absolute inset-x-2 bottom-1.5 h-0.5 rounded-full ${value.ap >= Number(dailyGoal) ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <aside className="h-fit overflow-hidden rounded-[2rem] border border-white bg-white shadow-sm xl:flex xl:h-0 xl:min-h-full xl:flex-col">
          <div className="shrink-0 border-b border-slate-100 p-6">
            <p className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">
              <CalendarDays className="h-3.5 w-3.5" /> {metric === 'submitted' ? 'Date created' : 'Initial draft date'} · {dayFormatter.format(new Date(`${selectedDay.date}T00:00:00Z`))}
            </p>
            <p className="mt-4 text-4xl font-black tracking-tight text-slate-950">{usd.format(selectedMetric.ap)}</p>
            <p className="mt-1 text-xs font-semibold text-slate-400">{selectedMetric.policies} {selectedMetric.policies === 1 ? 'policy' : 'policies'}{selectedDateHasGoal ? ` · goal ${usd.format(Number(dailyGoal))}` : ''}</p>
          </div>

          <div className="p-6 xl:flex xl:min-h-0 xl:flex-1 xl:flex-col">
            <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${selectedDateHasGoal && selectedMetric.ap >= Number(dailyGoal) ? 'bg-emerald-100 text-emerald-600' : selectedDateHasGoal && selectedMetric.ap > 0 ? 'bg-rose-100 text-rose-500' : 'bg-slate-100 text-slate-400'}`}>
              {selectedMetric.ap > 0 ? <CircleDollarSign className="h-5 w-5" /> : <BookOpen className="h-5 w-5" />}
            </div>
            <p className="mt-4 text-sm font-black text-slate-950">
              {selectedDateHasGoal && selectedMetric.ap >= Number(dailyGoal) ? 'Daily goal cleared' : selectedDateHasGoal && selectedMetric.ap > 0 ? `${usd.format(Number(dailyGoal) - selectedMetric.ap)} short of goal` : selectedMetric.ap > 0 ? 'Business recorded' : 'No business recorded'}
            </p>
            <p className="mt-2 text-xs font-semibold leading-5 text-slate-400">
              {selectedMetric.ap > 0
                ? `${selectedMetric.policies} ${selectedMetric.policies === 1 ? 'policy contributed' : 'policies contributed'} to this day’s total.`
                : 'A blank day, not a bad day — nothing was written here.'}
            </p>

            {selectedDay.policyIds.length > 0 && (
              <div className="mt-5 space-y-2 border-t border-slate-100 pt-4 xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:pr-2">
                {selectedPoliciesLoading && (
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Loading policy details…</p>
                  </div>
                )}

                {!selectedPoliciesLoading && selectedPoliciesError && (
                  <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4">
                    <p className="text-[10px] font-black text-rose-600">Policy details are temporarily unavailable.</p>
                  </div>
                )}

                {!selectedPoliciesLoading && !selectedPoliciesError && selectedPolicies.map(policy => {
                  const paidStatus = policy.paidStatus.toLowerCase();
                  const paidStatusTone = paidStatus.includes('paid') || paidStatus.includes('in force')
                    ? 'bg-emerald-100 text-emerald-700'
                    : paidStatus.includes('chargeback') || paidStatus.includes('lapse')
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-slate-100 text-slate-600';

                  return (
                    <div key={policy.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-black text-slate-900" title={policy.client}>{policy.client || 'Unnamed client'}</p>
                          <p className="mt-1 truncate text-[9px] font-semibold text-slate-400" title={[policy.carrier, policy.product].filter(Boolean).join(' · ')}>
                            {[policy.carrier, policy.product].filter(Boolean).join(' · ') || 'Policy details'}
                          </p>
                          {isAgencyScope && policy.agentName && (
                            <p className="mt-1 truncate text-[8px] font-semibold uppercase tracking-[0.08em] text-amber-700" title={policy.agentName}>
                              Agent · {policy.agentName}
                            </p>
                          )}
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-xs font-black text-slate-900">{usd.format(policy.annualPremium)}</p>
                          <p className="mt-0.5 text-[8px] font-bold text-slate-400">{usd.format(policy.monthlyPremium)}/mo</p>
                        </div>
                      </div>

                      <div className="mt-3 flex items-end justify-between gap-3 border-t border-slate-200/70 pt-3">
                        <div className="min-w-0">
                          <p className="truncate text-[9px] font-bold text-slate-500" title={policy.source}>{policy.source || 'Source unavailable'}</p>
                          {policy.policyNumber && <p className="mt-0.5 truncate text-[8px] font-semibold text-slate-400" title={policy.policyNumber}>{policy.policyNumber}</p>}
                        </div>
                        <div className="flex shrink-0 flex-wrap justify-end gap-1">
                          {policy.policyStatus && <span className="rounded-full bg-blue-100 px-2 py-1 text-[8px] font-black text-blue-700">{policy.policyStatus}</span>}
                          {policy.paidStatus && <span className={`rounded-full px-2 py-1 text-[8px] font-black ${paidStatusTone}`}>{policy.paidStatus}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>
      </div>

      <div className="mt-5">
        <StateProductionPanels
          states={stateProduction}
          loading={stateProductionLoading}
          error={stateProductionError}
          compact
          sidePanel={(
            <LeadSourcesPanel
              sources={leadSourceProduction}
              loading={stateProductionLoading}
              error={stateProductionError}
            />
          )}
        />
      </div>

      <div className="hidden">
        <section className="rounded-[2rem] border border-white bg-white p-6 shadow-sm sm:p-7">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Cash Flow</p>
          <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Advance dollars by week</h2>
          <p className="mt-1 text-xs font-semibold text-slate-400">75% advance on expected commission, bucketed by draft week</p>

          <div className="mt-6 grid grid-cols-3 gap-3">
            {[
              { label: 'Already paid', value: '$19,927', tone: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
              { label: 'Scheduled ahead', value: '$15,847', tone: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
              { label: 'Past due', value: '$7,947', tone: 'bg-rose-50 text-rose-700', dot: 'bg-rose-500' },
            ].map(item => (
              <div key={item.label} className={`rounded-2xl p-3 ${item.tone}`}>
                <div className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${item.dot}`} /><p className="text-[9px] font-black uppercase tracking-wide opacity-65">{item.label}</p></div>
                <p className="mt-2 text-lg font-black">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-7 space-y-4">
            {cashFlowWeeks.map(week => {
              const total = week.paid + week.scheduled + week.pastDue;
              return (
                <div key={week.label}>
                  <div className="mb-2 flex items-center justify-between text-[10px] font-bold text-slate-400">
                    <span>{week.label}</span><span>{usd.format(total)}</span>
                  </div>
                  <div className="flex h-7 overflow-hidden rounded-lg bg-slate-100">
                    <div className="bg-emerald-500" style={{ width: `${(week.paid / Math.max(total, 1)) * 100}%` }} />
                    <div className="bg-blue-500" style={{ width: `${(week.scheduled / Math.max(total, 1)) * 100}%` }} />
                    <div className="bg-rose-400" style={{ width: `${(week.pastDue / Math.max(total, 1)) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="overflow-hidden rounded-[2rem] border border-white bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-6 sm:px-7">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Lead Sources</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Where the book came from</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {leadSources.map(source => (
              <div key={source.name} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-4 px-6 py-3.5 sm:px-7">
                <div className="min-w-0">
                  <p className="truncate text-xs font-black text-slate-950">{source.name}</p>
                  <p className="mt-0.5 truncate text-[9px] font-semibold text-slate-400">{source.vendor} · {source.policies} policies · {source.spend}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black text-slate-950">{source.ap}</p>
                  <p className="text-[9px] font-bold text-emerald-600">{source.efficiency}</p>
                </div>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-950 text-[9px] font-black text-white">{source.persistency}</span>
              </div>
            ))}
          </div>
          <p className="border-t border-slate-100 bg-slate-50 px-6 py-3 text-[9px] font-semibold leading-4 text-slate-400 sm:px-7">Right-hand percentage is persistency — of the drafts that came due, how many actually paid.</p>
        </section>
      </div>

      <div className="mt-5">
        <AgentPoliciesV2
          agentIdsOverride={[agentId]}
          dataSource={isAgencyScope ? 'team' : 'policies'}
          hideHeader
          enableNeedAttention
          needAttentionScope={isAgencyScope ? 'agency' : 'business'}
          initialWorkspaceView="attention"
          attentionOnly
          initialTimeframe="all"
          viewOnly={isAgencyScope}
          showClientPhone={!isAgencyScope || canEditAgencyGoal}
        />
      </div>

      <section className="hidden">
        <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 ring-1 ring-amber-100">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.24em] text-slate-400">Policy Review</p>
              <h2 className="mt-0.5 flex flex-wrap items-center gap-2 text-xl font-black tracking-tight text-slate-950">
                Needs attention
                {!attentionPoliciesLoading && (
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-amber-700 ring-1 ring-amber-100">
                    {attentionPolicies.length} open
                  </span>
                )}
              </h2>
              <p className="mt-1 text-[9px] font-semibold text-slate-400">Policies with missing or duplicate policy numbers.</p>
            </div>
          </div>
          <a href="#/business/policies" className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-500 transition hover:text-slate-950">
            Open policy review
          </a>
        </div>

        {attentionPoliciesLoading ? (
          <div className="px-7 py-12 text-center text-[10px] font-bold text-slate-400">Loading policies that need attention...</div>
        ) : attentionPoliciesError ? (
          <div className="px-7 py-12 text-center text-[10px] font-bold text-rose-500">The attention queue is temporarily unavailable.</div>
        ) : attentionPolicies.length === 0 ? (
          <div className="px-7 py-12 text-center">
            <p className="text-sm font-black text-slate-800">Nothing needs attention</p>
            <p className="mt-1 text-[9px] font-semibold text-slate-400">No missing or duplicate policy numbers were found.</p>
          </div>
        ) : (
          <div className="max-h-[30rem] overflow-auto">
            <div className="min-w-[62rem]">
              <div className="grid grid-cols-[1.35fr_1.15fr_1.25fr_.8fr_.8fr_1fr] gap-4 border-b border-slate-100 bg-slate-50/70 px-7 py-3 text-[8px] font-black uppercase tracking-[0.17em] text-slate-400">
                <span>Client &amp; created</span>
                <span>Attention</span>
                <span>Carrier / product</span>
                <span>Effective</span>
                <span>Status</span>
                <span className="text-right">Annual premium</span>
              </div>
              <div className="divide-y divide-slate-100">
                {attentionPolicies.map(({ policy, reasons }) => {
                  const createdAt = policy.created_at
                    ? new Date(policy.created_at < 1_000_000_000_000 ? policy.created_at * 1000 : policy.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : 'Date unavailable';
                  const statusTone = /paid|in force/i.test(policy.status)
                    ? 'bg-emerald-50 text-emerald-700'
                    : /approved/i.test(policy.status)
                      ? 'bg-teal-50 text-teal-700'
                      : /underwriting|submitted|pending/i.test(policy.status)
                        ? 'bg-blue-50 text-blue-700'
                        : /cancel|lapse|chargeback|decline/i.test(policy.status)
                          ? 'bg-rose-50 text-rose-700'
                          : 'bg-slate-100 text-slate-600';

                  return (
                    <div key={policy.policy_id || policy.selectionKey} className="grid grid-cols-[1.35fr_1.15fr_1.25fr_.8fr_.8fr_1fr] items-center gap-4 px-7 py-3.5 transition hover:bg-amber-50/30">
                      <div className="min-w-0">
                        <p className="truncate text-[11px] font-black text-slate-950">{policy.client || 'Unnamed client'}</p>
                        <p className="mt-0.5 text-[8px] font-semibold text-slate-400">{createdAt}</p>
                      </div>
                      <div className="flex min-w-0 flex-wrap gap-1.5">
                        {reasons.map(reason => (
                          <span key={reason} className={`rounded-md px-2 py-1 text-[8px] font-black uppercase tracking-[0.06em] ${reason.startsWith('Missing') ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-700'}`}>
                            {reason}
                          </span>
                        ))}
                        {policy.policy_number && <p className="w-full truncate text-[8px] font-semibold text-slate-400">#{policy.policy_number}</p>}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[10px] font-black text-slate-800">{policy.carrier || 'Carrier unavailable'}</p>
                        <p className="mt-0.5 truncate text-[8px] font-semibold text-slate-400">{policy.carrier_product || 'Product unavailable'}</p>
                      </div>
                      <p className="text-[9px] font-bold text-slate-600">{policy.initial_draft_date || '—'}</p>
                      <div><span className={`inline-flex rounded-full px-2.5 py-1 text-[8px] font-black ${statusTone}`}>{policy.status || 'Unknown'}</span></div>
                      <div className="text-right">
                        <p className="text-[11px] font-black text-slate-950">{usd.format(policy.annual_premium || 0)}</p>
                        <p className="mt-0.5 truncate text-[8px] font-semibold text-slate-400">{policy.source_name || 'Source unavailable'}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="hidden">
        <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-6 lg:flex-row lg:items-center lg:justify-between sm:px-7">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Full Book</p>
            <h2 className="mt-1 flex items-center gap-2 text-2xl font-black tracking-tight text-slate-950">
              Every policy
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-slate-500">{filteredPolicies.length} shown</span>
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {activeStage && (
              <button type="button" onClick={() => setActiveStage(null)} className="rounded-full bg-slate-950 px-3 py-2 text-[9px] font-black text-white">{activeStage} ×</button>
            )}
            <label className="relative block min-w-64 flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Client, carrier, policy #, lead source…"
                className="h-10 w-full rounded-full border border-slate-200 bg-slate-50 pl-10 pr-4 text-xs font-semibold text-slate-800 outline-none transition focus:border-amber-300 focus:bg-white"
              />
            </label>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[70rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">
                <th className="px-6 py-3">Client</th>
                <th className="px-4 py-3">Carrier / Product</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Lead Source</th>
                <th className="px-4 py-3">Submitted</th>
                <th className="px-4 py-3">Draft Date</th>
                <th className="px-6 py-3 text-right">Annual Premium</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPolicies.map(policy => (
                <tr key={policy.number} className="transition hover:bg-amber-50/35">
                  <td className="px-6 py-3.5"><p className="text-xs font-black text-slate-950">{policy.client}</p><p className="mt-0.5 text-[9px] font-semibold text-slate-400">{policy.number}</p></td>
                  <td className="px-4 py-3.5"><p className="text-xs font-bold text-slate-800">{policy.carrier}</p><p className="mt-0.5 text-[9px] font-semibold text-slate-400">{policy.product}</p></td>
                  <td className="px-4 py-3.5">
                    <span className={`rounded-full px-2.5 py-1.5 text-[9px] font-black ${
                      policy.status === 'Paid' ? 'bg-emerald-100 text-emerald-700'
                        : policy.status === 'Approved' ? 'bg-teal-100 text-teal-700'
                          : policy.status === 'Underwriting' ? 'bg-blue-100 text-blue-700'
                            : policy.status === 'Lost' ? 'bg-rose-100 text-rose-700'
                              : policy.status === 'Needs Action' ? 'bg-amber-100 text-amber-700'
                                : 'bg-slate-100 text-slate-600'
                    }`}>{policy.status}</span>
                  </td>
                  <td className="px-4 py-3.5"><p className="max-w-48 truncate text-xs font-bold text-slate-700">{policy.source}</p><p className="mt-0.5 text-[9px] font-semibold text-slate-400">{policy.sourceCost}</p></td>
                  <td className="px-4 py-3.5 text-xs font-bold text-slate-600">{policy.submitted}</td>
                  <td className="px-4 py-3.5"><p className="text-xs font-bold text-slate-600">{policy.draftDate}</p>{policy.draftNote && <p className="mt-0.5 text-[9px] font-semibold text-amber-600">{policy.draftNote}</p>}</td>
                  <td className="px-6 py-3.5 text-right"><p className="text-xs font-black text-slate-950">{usd.format(policy.annualPremium)}</p><p className="mt-0.5 text-[9px] font-semibold text-slate-400">{usd.format(policy.annualPremium / 12)}/mo</p></td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredPolicies.length === 0 && <div className="p-12 text-center text-sm font-bold text-slate-400">No mock policies match this view.</div>}
        </div>
      </section>

    </div>
  );
};
