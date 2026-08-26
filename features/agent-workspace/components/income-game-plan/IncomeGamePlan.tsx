import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowDown, ArrowRight, Bot, CalendarDays, Check, CheckCircle2, ChevronDown, ChevronRight,
  CircleDollarSign, ClipboardCheck, Lightbulb, Loader2, RefreshCw,
  Rocket, Sparkles, Target, TrendingDown, TrendingUp, X,
} from 'lucide-react';
import { useAgentContext } from '../../context/AgentContext';
import { createIncomePlanPublishedSnapshot, getDefaultIncomePlanAssumptions, IncomePlanHistoryItem, IncomePlanHistoryResponse, incomePlanService, publishedIncomePlanApi } from '../../services/incomeGamePlanApi';
import { incomeCoachApi } from '../../services/incomeCoachApi';
import {
  IncomePlanAssumptions, IncomePlanChatResponse, IncomePlanResults,
  IncomePlanPublishedSnapshot, IncomePlanScoreboard, IncomePlanStage,
} from '../../types/incomeGamePlan';

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const currencyExact = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const date = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const STEP_BY_STAGE: Partial<Record<IncomePlanStage, number>> = {
  welcome: 1, goal_period: 1, production_profile: 2, conversion_summary: 2,
  business_costs: 3, review: 4, calculating: 5, results: 5, commitment: 5, published: 5,
};

type ConversationItem = IncomePlanChatResponse & {
  id: string;
  values?: Partial<IncomePlanAssumptions>;
  aiFeedback?: string;
  aiFeedbackLoading?: boolean;
  aiFeedbackUnavailable?: boolean;
};

const INCOME_PLAN_FEEDBACK_PROMPT = `Explain this completed income plan conversationally.

Do not recalculate or modify any supplied number. Treat the results as authoritative.

Explain:
1. What the agent wants to accomplish
2. How many applications and issued policies are required
3. The exact and practical daily pace
4. The planned business investment
5. The most important action the agent should focus on

Use plain language at approximately a ninth-grade reading level. Be concise, practical, and encouraging. Do not guarantee income.`;

const publishedPlanToAssumptions = (plan: IncomePlanPublishedSnapshot): IncomePlanAssumptions => ({
  ...getDefaultIncomePlanAssumptions(),
  desired_income_goal: Number(plan.desired_income_goal),
  expected_working_days: Number(plan.expected_working_days),
  commission_level: Number(plan.commission_level),
  average_annual_premium: Number(plan.average_annual_premium),
  placement_rate: Number(plan.placement_rate),
  marketing_cost_per_application: Number(plan.marketing_cost_per_application),
  start_date: plan.plan_start_date,
  end_date: plan.plan_end_date,
});

const publishedPlanToResults = (plan: IncomePlanPublishedSnapshot): IncomePlanResults => ({
  deposit_goal: Number(plan.desired_income_goal),
  issued_policies: Number(plan.issued_policies),
  placed_applications: Number(plan.placed_applications),
  submitted_applications: Number(plan.submitted_applications),
  submitted_ap: Number(plan.monthly_ap_target),
  issued_ap: Number(plan.issued_policies) * Number(plan.average_annual_premium),
  marketing_budget: Number(plan.estimated_acquisition_budget),
  technology_costs: 0,
  total_business_expenses: Number(plan.estimated_acquisition_budget),
  estimated_deposits: Number(plan.estimated_deposit),
  estimated_net: Number(plan.estimated_deposit) - Number(plan.estimated_acquisition_budget),
  weekly_application_target: Math.ceil(Number(plan.submitted_applications) / Math.max(1, Math.ceil(Number(plan.expected_working_days) / 5))),
  practical_daily_target: Number(plan.daily_submitted_applications),
  explanation: plan.ai_feedback,
});

const changedPublishedPlanFields = (
  previous: IncomePlanPublishedSnapshot,
  next: IncomePlanPublishedSnapshot,
): Partial<IncomePlanPublishedSnapshot> => {
  const changes: Partial<IncomePlanPublishedSnapshot> = {};
  (Object.keys(next) as Array<keyof IncomePlanPublishedSnapshot>).forEach(key => {
    if (key !== 'id' && key !== 'agent_id' && next[key] !== previous[key]) {
      (changes as Record<string, unknown>)[key] = next[key];
    }
  });
  return changes;
};

const cleanFeedbackLine = (line: string) => line
  .replace(/^#{1,6}\s*/, '')
  .replace(/\*\*(.*?)\*\*/g, '$1')
  .replace(/__(.*?)__/g, '$1')
  .trim();

const AiFeedbackContent = ({ text }: { text: string }) => {
  const lines = text.replace(/\r\n/g, '\n').split('\n').map(line => line.trim()).filter(Boolean);
  return <div className="mt-3 space-y-2 border-t border-amber-100 pt-3">
    {lines.map((rawLine, index) => {
      const bullet = rawLine.match(/^[-*•]\s+(.+)/);
      const numbered = rawLine.match(/^\d+[.)]\s+(.+)/);
      const line = cleanFeedbackLine(bullet?.[1] || numbered?.[1] || rawLine);
      const isHeading = !bullet && !numbered && (/^#{1,6}\s/.test(rawLine) || (line.length < 56 && (line.endsWith(':') || /^[A-Z][A-Z\s&/-]+$/.test(line))));

      if (bullet || numbered) return <div key={`${index}-${line}`} className="flex items-start gap-2 pl-1">
        <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
        <p className="text-[11px] font-medium leading-5 text-slate-600">{line}</p>
      </div>;
      if (isHeading) return <p key={`${index}-${line}`} className="pt-1 text-[9px] font-black uppercase tracking-[0.14em] text-slate-800">{line.replace(/:$/, '')}</p>;
      return <p key={`${index}-${line}`} className="text-[11px] font-medium leading-5 text-slate-600">{line}</p>;
    })}
  </div>;
};

const HelpLightbulb = ({ label, children }: { label: string; children: React.ReactNode }) => {
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const show = (element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    const width = 224;
    setPosition({ left: Math.max(12, Math.min(window.innerWidth - width - 12, rect.left + (rect.width / 2) - (width / 2))), top: rect.top - 8 });
  };
  return <span className="ml-1.5 inline-flex align-middle">
    <button type="button" aria-label={`Help: ${label}`} onMouseEnter={event => show(event.currentTarget)} onMouseLeave={() => setPosition(null)} onFocus={event => show(event.currentTarget)} onBlur={() => setPosition(null)} className="inline-flex h-4 w-4 items-center justify-center rounded-full text-amber-500 transition hover:bg-amber-50 hover:text-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-200">
      <Lightbulb className="h-3 w-3" />
    </button>
    {position && createPortal(<span role="tooltip" style={{ left: position.left, top: position.top, width: 224, transform: 'translateY(-100%)' }} className="pointer-events-none fixed z-[400] rounded-xl bg-slate-950 px-3 py-2 text-left text-[10px] font-medium normal-case leading-4 tracking-normal text-white shadow-2xl">{children}</span>, document.body)}
  </span>;
};

const LabelWithHelp = ({ label, help }: { label: string; help?: React.ReactNode }) => (
  <span className="inline-flex items-center">
    {label}
    {help && <HelpLightbulb label={label}>{help}</HelpLightbulb>}
  </span>
);

const Field = ({ label, help, value, onChange, type = 'number', prefix, suffix, min, max, step }: {
  label: string; value: string | number; onChange: (value: string) => void; type?: string;
  help?: React.ReactNode; prefix?: string; suffix?: string; min?: number; max?: number; step?: number;
}) => (
  <label className="block min-w-0">
    <span className="mb-2 block text-[9px] font-black uppercase tracking-[0.18em] text-slate-400"><LabelWithHelp label={label} help={help} /></span>
    <span className="flex h-11 items-center rounded-xl border border-slate-200 bg-white px-3 transition focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-100">
      {prefix && <span className="mr-1 text-xs font-bold text-slate-400">{prefix}</span>}
      <input
        aria-label={label}
        type={type}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-w-0 flex-1 border-0 bg-transparent text-sm font-bold text-slate-900 outline-none"
      />
      {suffix && <span className="ml-2 text-xs font-bold text-slate-400">{suffix}</span>}
    </span>
  </label>
);

const StageCard = ({ children }: { children: React.ReactNode }) => (
  <div className="mt-4 rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div className="p-4 sm:p-5">{children}</div>
  </div>
);

const PrimaryButton = ({ children, onClick, disabled, secondary = false }: {
  children: React.ReactNode; onClick: () => void; disabled?: boolean; secondary?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black transition focus:outline-none focus:ring-2 focus:ring-amber-300 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 ${secondary ? 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50' : 'bg-slate-950 text-white shadow-md hover:bg-slate-800'}`}
  >
    {children}
  </button>
);

const MonthPicker = ({ id, value, months, onChange }: {
  id: string;
  value: string;
  months: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = months.find(month => month.value === value);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  return <div ref={rootRef} className="relative mt-2">
    <button id={id} type="button" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(current => !current)} className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border px-3 text-left transition ${open ? 'border-amber-400 bg-slate-900 ring-2 ring-amber-400/15' : 'border-slate-700 bg-slate-900 hover:border-slate-500'}`}>
      <span className="flex min-w-0 items-center gap-2.5"><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${selected ? 'bg-amber-400 text-slate-950' : 'bg-white/5 text-slate-400'}`}><CalendarDays className="h-3.5 w-3.5" /></span><span className={`truncate text-xs font-bold ${selected ? 'text-white' : 'text-slate-400'}`}>{selected?.label || 'Select a future month'}</span></span>
      <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
    </button>
    {open && <div role="listbox" aria-labelledby={id} className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 max-h-64 overflow-y-auto rounded-2xl border border-slate-700 bg-slate-950 p-2 shadow-2xl shadow-slate-950/40">
      <p className="px-3 pb-2 pt-1 text-[8px] font-black uppercase tracking-[0.18em] text-slate-500">Available months</p>
      {months.map(month => { const active = month.value === value; return <button key={month.value} type="button" role="option" aria-selected={active} onClick={() => { onChange(month.value); setOpen(false); }} className={`flex min-h-10 w-full items-center justify-between rounded-xl px-3 text-left text-[11px] font-bold transition ${active ? 'bg-amber-400 text-slate-950' : 'text-slate-200 hover:bg-white/10 hover:text-white'}`}><span>{month.label}</span>{active && <Check className="h-3.5 w-3.5" />}</button>; })}
    </div>}
  </div>;
};

const getPlanMonthDayCount = (startDate?: string, endDate?: string) => {
  const periodDate = startDate || endDate;
  const [year, month] = String(periodDate || '').split('-').map(Number);
  if (Number.isInteger(year) && Number.isInteger(month) && month >= 1 && month <= 12) {
    return new Date(year, month, 0).getDate();
  }
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
};

export const GoalPeriodCard = ({ initial, onContinue }: { initial: IncomePlanAssumptions; onContinue: (values: Partial<IncomePlanAssumptions>) => void }) => {
  const defaults = useMemo(getDefaultIncomePlanAssumptions, []);
  const maxWorkingDays = useMemo(() => getPlanMonthDayCount(initial.start_date, initial.end_date), [initial.start_date, initial.end_date]);
  const [values, setValues] = useState({ ...initial, expected_working_days: Math.min(initial.expected_working_days, maxWorkingDays), goal_type: 'gross_commission_deposits' as const });
  const set = (key: keyof IncomePlanAssumptions, value: string | number) => setValues(current => ({ ...current, [key]: value }));
  const valid = values.desired_income_goal > 0 && values.expected_working_days > 0 && values.expected_working_days <= maxWorkingDays;
  return (
    <StageCard>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Desired income goal" help="The amount of income you want this plan to help you earn during the selected period." prefix="$" value={values.desired_income_goal} min={1} onChange={v => set('desired_income_goal', Number(v))} />
        <Field label="Expected working days" help={`How many days you expect to actively work toward this goal. This plan month has ${maxWorkingDays} calendar days.`} value={values.expected_working_days} min={1} max={maxWorkingDays} onChange={v => set('expected_working_days', Math.min(maxWorkingDays, Number(v)))} />
      </div>
      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <PrimaryButton secondary onClick={() => setValues({ ...defaults, start_date: initial.start_date, end_date: initial.end_date, expected_working_days: Math.min(defaults.expected_working_days, maxWorkingDays), goal_type: 'gross_commission_deposits' })}>Use Defaults</PrimaryButton>
        <PrimaryButton disabled={!valid} onClick={() => onContinue(values)}>Continue <ArrowRight className="h-3.5 w-3.5" /></PrimaryButton>
      </div>
    </StageCard>
  );
};

export const ProductionCard = ({ initial, onContinue }: { initial: IncomePlanAssumptions; onContinue: (values: Partial<IncomePlanAssumptions>) => void }) => {
  const [values, setValues] = useState(initial);
  const set = (key: keyof IncomePlanAssumptions, value: string) => setValues(current => ({ ...current, [key]: Number(value) }));
  return (
    <StageCard>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Commission level" help="The percentage of a policy's premium that you earn as commission. For example, an 85% level pays $850 on $1,000 of premium before other adjustments." suffix="%" value={values.commission_level} min={0} onChange={v => set('commission_level', v)} />
        <Field label="Average annual premium" help="The average amount of premium each customer pays for one full year of coverage." prefix="$" value={values.average_annual_premium} min={0} onChange={v => set('average_annual_premium', v)} />
        <Field label="Placement rate" help="The percentage of submitted applications that are approved by the carrier and move forward. A 60% rate means about 6 out of 10 applications are placed." suffix="%" value={values.placement_rate} min={0} onChange={v => set('placement_rate', v)} />
      </div>
      <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2.5 text-[10px] font-semibold leading-5 text-amber-900">Based on organization-wide production analysis, PolicyHQ uses a 60% placement rate as the standard benchmark. You may adjust it to reflect your historical performance.</p>
      <div className="mt-4 flex justify-end"><PrimaryButton onClick={() => onContinue(values)}>Continue <ArrowRight className="h-3.5 w-3.5" /></PrimaryButton></div>
    </StageCard>
  );
};

export const ConversionSummaryCard = ({ assumptions, onContinue, onRedo }: { assumptions: IncomePlanAssumptions; onContinue?: () => void; onRedo?: () => void }) => {
  const commissionPerIssuedPolicy = assumptions.average_annual_premium * (assumptions.commission_level / 100);
  const issuedPoliciesNeeded = commissionPerIssuedPolicy > 0
    ? Math.ceil(assumptions.desired_income_goal / commissionPerIssuedPolicy)
    : 0;
  const placementRate = assumptions.placement_rate / 100;
  const submittedApplicationsNeeded = placementRate > 0
    ? Math.ceil(issuedPoliciesNeeded / placementRate)
    : 0;
  const placedApplications = Math.ceil((submittedApplicationsNeeded + issuedPoliciesNeeded) / 2);
  const estimatedDeposit = issuedPoliciesNeeded * commissionPerIssuedPolicy;
  const metrics = [
    ['Estimated deposit', currencyExact.format(estimatedDeposit), 'Projected from issued policies', 'The estimated commission deposit from the policies that become active.'],
    ['Submitted applications needed', number.format(submittedApplicationsNeeded), 'Required application volume', 'How many completed applications you need to send to carriers to have a reasonable chance of reaching the goal.'],
    ['Placed applications', number.format(placedApplications), 'Expected midpoint', 'The number of submitted policies expected to be approved by the carrier and move toward being issued.'],
    ['Issued policies needed', number.format(issuedPoliciesNeeded), 'Required issued volume', 'How many policies need to be approved, issued, and put in force to reach the income goal.'],
  ];

  return (
    <div className="mt-4 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-white shadow-sm">
      <div className="flex items-start gap-3 border-b border-amber-100 px-4 py-4 sm:px-5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-amber-300"><Bot className="h-4 w-4" /></span>
        <div>
          <p className="text-xs font-black text-slate-950">Your conversion path is ready.</p>
          <p className="mt-1 text-[10px] font-semibold leading-5 text-slate-500">At {currencyExact.format(commissionPerIssuedPolicy)} in commission per issued policy, this is the volume required to reach your income goal.</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-px bg-slate-100 sm:grid-cols-4">
        {metrics.map(([label, value, helper, help]) => <div key={label} className="bg-white px-4 py-4"><p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-400"><LabelWithHelp label={label} help={help} /></p><p className="mt-1.5 text-xl font-black tracking-tight text-slate-950">{value}</p><p className="mt-1 text-[9px] font-semibold text-slate-400">{helper}</p></div>)}
      </div>
      {(onRedo || onContinue) && <div className="flex flex-wrap justify-end gap-2 px-4 py-4 sm:px-5">{onRedo && <PrimaryButton secondary onClick={onRedo}><RefreshCw className="h-3.5 w-3.5" /> Redo</PrimaryButton>}{onContinue && <PrimaryButton onClick={onContinue}>Continue <ArrowRight className="h-3.5 w-3.5" /></PrimaryButton>}</div>}
    </div>
  );
};

export const BusinessCostsCard = ({ initial, onContinue }: { initial: IncomePlanAssumptions; onContinue: (values: Partial<IncomePlanAssumptions>) => void }) => {
  const [values, setValues] = useState(initial);
  const set = (key: keyof IncomePlanAssumptions, value: string) => setValues(current => ({ ...current, [key]: Number(value) }));
  return (
    <StageCard>
      <div className="grid grid-cols-1 gap-4">
        <Field label="Marketing cost / submitted app" help="Your estimated cost to create one result. For example, $500 in lead cost divided by 6 sales is $83.33 per sale. Use your closest reliable acquisition-cost estimate here." prefix="$" step={0.01} value={values.marketing_cost_per_application} min={0} onChange={v => set('marketing_cost_per_application', v)} />
      </div>
      <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2.5 text-[10px] font-semibold leading-5 text-amber-900">This is a rough per-submission estimate based on organization-wide analysis. Adjust it to reflect your actual acquisition cost when more accurate figures are available.</p>
      <div className="mt-4 flex justify-end"><PrimaryButton onClick={() => onContinue(values)}>Continue <ArrowRight className="h-3.5 w-3.5" /></PrimaryButton></div>
    </StageCard>
  );
};

const CompletedAnswerCard = ({ stage, values }: { stage: IncomePlanStage; values: Partial<IncomePlanAssumptions> }) => {
  const rows = stage === 'goal_period'
    ? [['Income goal', currency.format(Number(values.desired_income_goal || 0))], ['Working days', `${values.expected_working_days || 0} days`]]
    : stage === 'production_profile'
      ? [['Commission', `${values.commission_level || 0}%`], ['Average AP', currency.format(Number(values.average_annual_premium || 0))], ['Placement', `${values.placement_rate || 0}%`]]
      : stage === 'business_costs'
        ? [['Cost per submitted app', currencyExact.format(Number(values.marketing_cost_per_application || 0))]]
        : [];
  if (!rows.length) return null;
  return <div className="mt-3 ml-auto max-w-xl rounded-2xl rounded-tr-md bg-slate-900 px-4 py-3 text-white shadow-sm"><p className="text-[8px] font-black uppercase tracking-[0.18em] text-amber-300">Your answer</p><div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">{rows.map(([label, value]) => <div key={label}><p className="text-[8px] font-bold uppercase tracking-wider text-white/40">{label}</p><p className="mt-0.5 text-xs font-black">{value}</p></div>)}</div></div>;
};

export const ReviewCard = ({ assumptions, onBuild, onRedo }: { assumptions: IncomePlanAssumptions; onBuild: () => void; onRedo?: () => void }) => {
  const sections = [
    { title: 'Income goal', value: `${currency.format(assumptions.desired_income_goal)} · ${assumptions.expected_working_days} working days` },
    { title: 'Production assumptions', value: `${assumptions.commission_level}% commission · ${currency.format(assumptions.average_annual_premium)} avg AP · ${assumptions.placement_rate}% placement` },
    { title: 'Cost estimate', value: `${currencyExact.format(assumptions.marketing_cost_per_application)} per submitted application` },
  ];
  return <StageCard>
    <div className="divide-y divide-slate-100">{sections.map(section => <div key={section.title} className="py-3 first:pt-0 last:pb-0"><p className="text-xs font-black text-slate-900">{section.title}</p><p className="mt-1 text-[10px] font-semibold leading-4 text-slate-500">{section.value}</p></div>)}</div>
    <ConversionSummaryCard assumptions={assumptions} />
    <div className="mt-5 flex flex-wrap justify-end gap-2">{onRedo && <PrimaryButton secondary onClick={onRedo}><RefreshCw className="h-3.5 w-3.5" /> Redo</PrimaryButton>}<PrimaryButton onClick={onBuild}><Sparkles className="h-4 w-4 text-amber-300" /> Build My Plan</PrimaryButton></div>
  </StageCard>;
};

const RedoChoiceCard = ({ onChoose }: { onChoose: (stage: 'goal_period' | 'production_profile' | 'business_costs') => void }) => (
  <StageCard>
    <p className="text-xs font-black text-slate-950">Which part would you like to change?</p>
    <p className="mt-1 text-[10px] font-semibold leading-5 text-slate-500">I’ll keep the rest of your answers and recalculate the plan after your update.</p>
    <div className="mt-4 grid gap-2 sm:grid-cols-3">
      <button type="button" onClick={() => onChoose('goal_period')} className="rounded-xl border border-slate-200 p-3 text-left transition hover:border-amber-300 hover:bg-amber-50"><p className="text-[10px] font-black text-slate-900">Income goal</p><p className="mt-1 text-[9px] font-semibold text-slate-400">Goal and working days</p></button>
      <button type="button" onClick={() => onChoose('production_profile')} className="rounded-xl border border-slate-200 p-3 text-left transition hover:border-amber-300 hover:bg-amber-50"><p className="text-[10px] font-black text-slate-900">Production profile</p><p className="mt-1 text-[9px] font-semibold text-slate-400">Commission, AP, placement</p></button>
      <button type="button" onClick={() => onChoose('business_costs')} className="rounded-xl border border-slate-200 p-3 text-left transition hover:border-amber-300 hover:bg-amber-50"><p className="text-[10px] font-black text-slate-900">Business costs</p><p className="mt-1 text-[9px] font-semibold text-slate-400">Cost per submitted app</p></button>
    </div>
  </StageCard>
);

const CalculationCard = () => {
  const steps = ['Reviewing your goal', 'Calculating your production targets', 'Building your weekly pace', 'Creating your business plan'];
  const [active, setActive] = useState(0);
  useEffect(() => { const timer = window.setInterval(() => setActive(current => Math.min(current + 1, steps.length - 1)), 350); return () => window.clearInterval(timer); }, []);
  return <StageCard><div aria-live="polite" className="space-y-3">{steps.map((step, index) => <div key={step} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition ${index <= active ? 'bg-amber-50 text-slate-900' : 'text-slate-300'}`}>{index < active ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : index === active ? <Loader2 className="h-4 w-4 animate-spin text-amber-500" /> : <span className="h-4 w-4 rounded-full border border-slate-200" />}<span className="text-xs font-bold">{step}</span></div>)}</div></StageCard>;
};

export const ResultsCard = ({ results, assumptions, publishedSnapshot, onContinue, onRedo, aiFeedback, aiFeedbackLoading = false, aiFeedbackUnavailable = false }: {
  results: IncomePlanResults;
  assumptions: IncomePlanAssumptions;
  publishedSnapshot?: IncomePlanPublishedSnapshot;
  onContinue?: () => void;
  onRedo?: () => void;
  aiFeedback?: string;
  aiFeedbackLoading?: boolean;
  aiFeedbackUnavailable?: boolean;
}) => {
  const workingDays = Math.max(1, assumptions.expected_working_days);
  const dailySubmittedApplications = publishedSnapshot?.daily_submitted_applications ?? Math.ceil(results.submitted_applications / workingDays);
  const submittedApplicationAp = assumptions.average_annual_premium * results.submitted_applications;
  const monthlyApTarget = publishedSnapshot?.monthly_ap_target ?? Math.ceil((results.estimated_deposits + submittedApplicationAp) / 2);
  const dailyApTarget = publishedSnapshot?.daily_ap_target ?? Math.ceil(assumptions.average_annual_premium * dailySubmittedApplications);
  const dailyMarketingSpend = publishedSnapshot?.daily_marketing_spend ?? Math.trunc(results.marketing_budget / workingDays);
  const commissionPerIssuedPolicy = publishedSnapshot?.commission_per_issued_policy ?? assumptions.average_annual_premium * (assumptions.commission_level / 100);
  const path = [
    { label: 'Submitted applications', value: number.format(results.submitted_applications), helper: 'Required volume' },
    { label: 'Placed applications', value: number.format(results.placed_applications), helper: 'Expected midpoint' },
    { label: 'Issued policies', value: number.format(results.issued_policies), helper: 'Required issues' },
    { label: 'Estimated deposit', value: currencyExact.format(results.estimated_deposits), helper: 'Projected from issues' },
  ];
  const metrics = [
    ['Daily submitted applications', number.format(dailySubmittedApplications), `${results.submitted_applications} applications ÷ ${assumptions.expected_working_days} working days`],
    ['Commission per issued policy', currencyExact.format(commissionPerIssuedPolicy), `${currency.format(assumptions.average_annual_premium)} AP at ${assumptions.commission_level}%`],
    ['Cost per submitted application', currencyExact.format(assumptions.marketing_cost_per_application), 'Your planning estimate'],
    ['Estimated acquisition budget', currencyExact.format(results.marketing_budget), `${results.submitted_applications} applications at ${currencyExact.format(assumptions.marketing_cost_per_application)} each`],
  ];
  return <StageCard>
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-950 px-4 py-4 text-white"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-slate-950"><Target className="h-4 w-4" /></span><div><p className="text-sm font-black">Your conversion plan</p><p className="mt-0.5 text-[9px] font-semibold text-white/50">The production volume required to reach a {currency.format(results.deposit_goal)} income goal.</p></div></div>
      <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 sm:grid-cols-4 sm:divide-y-0">{path.map(item => <div key={item.label} className="min-w-0 px-4 py-4"><p className="text-[8px] font-black uppercase tracking-[0.15em] text-slate-400">{item.label}</p><p className="mt-2 text-xl font-black tracking-tight text-slate-950">{item.value}</p><p className="mt-1 text-[9px] font-semibold text-slate-400">{item.helper}</p></div>)}</div>
    </div>
    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">{metrics.map(([label, value, helper], index) => <div key={label} className={`rounded-xl border px-4 py-3 ${index === 0 ? 'border-emerald-200 bg-emerald-50' : 'border-slate-100 bg-slate-50'}`}><div className="flex items-center justify-between gap-4"><p className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">{label}</p><p className={`text-lg font-black ${index === 0 ? 'text-emerald-700' : 'text-slate-900'}`}>{value}</p></div><p className="mt-1 text-[9px] font-semibold text-slate-400">{helper}</p></div>)}</div>
    <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-4 py-3"><p className="text-[8px] font-black uppercase tracking-[0.18em] text-amber-600">Production targets</p><p className="mt-1 text-[10px] font-semibold text-slate-500">The daily pace and monthly volume needed to support this conversion plan.</p></div>
      <div className="grid grid-cols-1 divide-y divide-slate-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        <div className="p-4"><p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">Daily target</p><div className="mt-3 space-y-3">
          <div className="flex items-end justify-between gap-4"><div><p className="text-[9px] font-bold text-slate-500">Submitted applications</p><p className="mt-0.5 text-[8px] font-semibold text-slate-400">Per working day</p></div><p className="text-xl font-black text-emerald-700">{number.format(dailySubmittedApplications)}</p></div>
          <div className="flex items-end justify-between gap-4 border-t border-slate-100 pt-3"><div><p className="text-[9px] font-bold text-slate-500">Daily AP target</p><p className="mt-0.5 text-[8px] font-semibold text-slate-400">{currency.format(assumptions.average_annual_premium)} AP per sale × {number.format(dailySubmittedApplications)} daily target</p></div><p className="text-lg font-black text-slate-950">{currency.format(dailyApTarget)}</p></div>
          <div className="flex items-end justify-between gap-4 border-t border-slate-100 pt-3"><div><p className="text-[9px] font-bold text-slate-500">Marketing spend</p><p className="mt-0.5 text-[8px] font-semibold text-slate-400">Estimated per working day</p></div><p className="text-lg font-black text-slate-950">{currency.format(dailyMarketingSpend)}</p></div>
        </div></div>
        <div className="p-4"><p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">Monthly target</p><div className="mt-3 space-y-3">
          <div className="flex items-end justify-between gap-4"><div><p className="text-[9px] font-bold text-slate-500">Submitted applications</p><p className="mt-0.5 text-[8px] font-semibold text-slate-400">Required monthly volume</p></div><p className="text-xl font-black text-slate-950">{number.format(results.submitted_applications)}</p></div>
          <div className="flex items-end justify-between gap-4 border-t border-slate-100 pt-3"><div><p className="text-[9px] font-bold text-slate-500">This month&apos;s AP target</p><p className="mt-0.5 text-[8px] font-semibold text-slate-400">Midpoint of estimated deposit and {currency.format(assumptions.average_annual_premium)} × {number.format(results.submitted_applications)} applications</p></div><p className="text-lg font-black text-amber-600">{currency.format(monthlyApTarget)}</p></div>
        </div></div>
      </div>
    </div>
    <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
      <div className="flex gap-3">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">{aiFeedbackLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}</span>
        <div className="min-w-0 flex-1"><p className="text-[8px] font-black uppercase tracking-[0.18em] text-amber-700">AI feedback</p>{aiFeedbackLoading ? <p className="mt-1 text-[11px] font-semibold leading-5 text-slate-600">Reviewing your completed plan and preparing practical guidance…</p> : <AiFeedbackContent text={aiFeedback || results.explanation} />}{aiFeedbackUnavailable && <p className="mt-3 border-t border-amber-100 pt-2 text-[9px] font-semibold text-slate-400">Live Income Coach feedback is temporarily unavailable, so PolicyHQ is showing the saved plan guidance.</p>}</div>
      </div>
    </div>
    {(onRedo || onContinue) && <div className="mt-4 flex flex-wrap justify-end gap-2">{onRedo && <PrimaryButton secondary onClick={onRedo}><RefreshCw className="h-3.5 w-3.5" /> Redo plan</PrimaryButton>}{onContinue && <PrimaryButton onClick={onContinue}>Review commitment <ArrowRight className="h-3.5 w-3.5" /></PrimaryButton>}</div>}
  </StageCard>;
};

export const CommitmentCard = ({ onRestart, onPublish }: { onRestart: () => void; onPublish: () => void }) => (
  <StageCard>
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
      <PrimaryButton secondary onClick={onRestart}><RefreshCw className="h-4 w-4" /> Redo part of plan</PrimaryButton>
      <PrimaryButton onClick={onPublish}><Rocket className="h-4 w-4 text-amber-300" /> Publish My Goal</PrimaryButton>
    </div>
  </StageCard>
);

const StatusPill = ({ status }: { status: IncomePlanScoreboard['metrics'][number]['status'] }) => {
  const copy = status === 'ahead' ? 'Ahead of pace' : status === 'on_pace' ? 'On pace' : 'Behind pace';
  return <span className={`rounded-full px-2 py-1 text-[8px] font-black uppercase tracking-wider ${status === 'ahead' ? 'bg-emerald-100 text-emerald-700' : status === 'on_pace' ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'}`}>{copy}</span>;
};

export const IncomePlanScoreboardView = ({ scoreboard, compact = false }: { scoreboard: IncomePlanScoreboard; compact?: boolean }) => (
  <section className="overflow-hidden rounded-[2rem] border border-white bg-white shadow-sm">
    <div className="bg-slate-950 px-5 py-5 text-white sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-[9px] font-black uppercase tracking-[0.22em] text-amber-300">Official Income Game Plan</p><p className="mt-2 text-3xl font-black tracking-tight">{currency.format(scoreboard.income_goal)}</p><p className="mt-1 text-[10px] font-semibold text-white/50">{date.format(new Date(`${scoreboard.start_date}T12:00:00`))} – {date.format(new Date(`${scoreboard.end_date}T12:00:00`))}</p></div>
        <div className="grid grid-cols-2 gap-2"><div className="rounded-xl bg-white/5 px-3 py-2"><p className="text-[8px] font-bold uppercase text-white/40">Status</p><p className="mt-1 text-xs font-black text-emerald-300">Official</p></div><div className="rounded-xl bg-white/5 px-3 py-2"><p className="text-[8px] font-bold uppercase text-white/40">Workdays left</p><p className="mt-1 text-xs font-black">{scoreboard.working_days_remaining}</p></div></div>
      </div>
    </div>
    <div className="grid grid-cols-1 divide-y divide-slate-100 lg:grid-cols-[minmax(0,1fr)_300px] lg:divide-x lg:divide-y-0">
      <div className="p-5 sm:p-6"><div className="grid grid-cols-[minmax(0,1fr)_repeat(3,70px)] gap-2 border-b border-slate-100 pb-2 text-[8px] font-black uppercase tracking-wider text-slate-400"><span>Metric</span><span className="text-right">Plan</span><span className="text-right">Actual</span><span className="text-right">Pace</span></div>{scoreboard.metrics.map(metric => <div key={metric.id} className="grid grid-cols-[minmax(0,1fr)_repeat(3,70px)] items-center gap-2 border-b border-slate-50 py-3 last:border-0"><div className="min-w-0"><p className="truncate text-[10px] font-bold text-slate-700">{metric.label}</p><div className="mt-1"><StatusPill status={metric.status} /></div></div>{[metric.plan, metric.actual, metric.pace].map((value, index) => <span key={index} className="text-right text-[10px] font-black text-slate-900">{metric.format === 'currency' ? currency.format(value) : number.format(value)}</span>)}</div>)}</div>
      <div className="bg-amber-50/60 p-5 sm:p-6"><p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-700">AI coaching</p>{[['What is happening', scoreboard.coaching.what_is_happening], ['Why it matters', scoreboard.coaching.why_it_matters], ['What to do next', scoreboard.coaching.what_to_do_next]].map(([label, copy]) => <div key={label} className="mt-4"><p className="text-[8px] font-black uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 text-[10px] font-semibold leading-5 text-slate-600">{copy}</p></div>)}{!compact && <div className="mt-5 grid grid-cols-2 gap-2"><div className="rounded-xl bg-white p-3"><p className="text-[8px] font-bold uppercase text-slate-400">Projection</p><p className="mt-1 text-lg font-black text-slate-900">{currency.format(scoreboard.current_projection)}</p></div><div className="rounded-xl bg-white p-3"><p className="text-[8px] font-bold uppercase text-slate-400">Variance</p><p className={`mt-1 text-lg font-black ${scoreboard.variance_from_plan >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{currency.format(scoreboard.variance_from_plan)}</p></div></div>}</div>
    </div>
  </section>
);

export const IncomeGamePlanEntryCard = ({ agentId }: { agentId: string }) => {
  const navigate = useNavigate();
  const [scoreboard, setScoreboard] = useState<IncomePlanScoreboard | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { const controller = new AbortController(); setLoading(true); incomePlanService.getScoreboard(agentId, controller.signal).then(setScoreboard).finally(() => setLoading(false)); return () => controller.abort(); }, [agentId]);
  if (loading) return <div className="mb-5 h-28 animate-pulse rounded-[2rem] bg-white/70" />;
  if (scoreboard) return <div className="mb-5"><IncomePlanScoreboardView scoreboard={scoreboard} compact /></div>;
  return <section className="mb-5 overflow-hidden rounded-[2rem] border border-amber-100 bg-gradient-to-r from-white via-white to-amber-50 shadow-sm">
    <div className="flex flex-col gap-5 px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-7">
      <div className="flex min-w-0 gap-4"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-amber-300"><Target className="h-5 w-5" /></span><div><p className="text-[9px] font-black uppercase tracking-[0.22em] text-amber-600">Income planning</p><h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Build Your Income Game Plan</h2><p className="mt-2 max-w-2xl text-[11px] font-semibold leading-5 text-slate-500">Turn your income goal into clear monthly, weekly, and daily production targets with help from the PolicyHQ AI assistant.</p></div></div>
      <button type="button" onClick={() => navigate('/business/income-game-plan')} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-xs font-black text-white shadow-lg hover:bg-slate-800">Build My Plan <ArrowRight className="h-4 w-4" /></button>
    </div>
  </section>;
};

export const IncomeGamePlanPage = () => {
  const { currentAgentId, viewingAgentName, incomePlan, incomePlanLoading, incomePlanError, refreshIncomePlan } = useAgentContext();
  const navigate = useNavigate();
  const [assumptions, setAssumptions] = useState(getDefaultIncomePlanAssumptions);
  const [conversation, setConversation] = useState<ConversationItem[]>([]);
  const [stage, setStage] = useState<IncomePlanStage>('welcome');
  const [results, setResults] = useState<IncomePlanResults | null>(null);
  const [publishedPlan, setPublishedPlan] = useState<IncomePlanPublishedSnapshot | null>(null);
  const [planBeingEdited, setPlanBeingEdited] = useState<IncomePlanPublishedSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [choosingRedo, setChoosingRedo] = useState(false);
  const [editingStage, setEditingStage] = useState<'goal_period' | 'production_profile' | 'business_costs' | null>(null);
  const [plannerView, setPlannerView] = useState<'current' | 'upcoming' | 'history'>('current');
  const [planHistory, setPlanHistory] = useState<IncomePlanHistoryItem[]>([]);
  const [planHistoryMeta, setPlanHistoryMeta] = useState<Pick<IncomePlanHistoryResponse, 'curPage' | 'nextPage' | 'prevPage' | 'itemsTotal' | 'pageTotal'>>({ curPage: 1, nextPage: null, prevPage: null, itemsTotal: 0, pageTotal: 1 });
  const [planHistoryPage, setPlanHistoryPage] = useState(1);
  const [savedPlanMonths, setSavedPlanMonths] = useState<string[]>([]);
  const [planHistoryRefreshKey, setPlanHistoryRefreshKey] = useState(0);
  const [planHistoryLoading, setPlanHistoryLoading] = useState(false);
  const [planHistoryError, setPlanHistoryError] = useState<string | null>(null);
  const [historyDetail, setHistoryDetail] = useState<IncomePlanPublishedSnapshot | null>(null);
  const [historyDetailLoading, setHistoryDetailLoading] = useState(false);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [futurePlanMonth, setFuturePlanMonth] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const current = conversation[conversation.length - 1];
  const step = STEP_BY_STAGE[stage] || 1;

  const boot = async () => {
    if (!currentAgentId || incomePlanLoading || incomePlanError) return;
    setLoading(true); setError(null); setConversation([]); setResults(null); setPublishedPlan(null); setPlanBeingEdited(null);
    try {
      const official = incomePlan;
      if (official) {
        setPublishedPlan(official);
        setAssumptions(publishedPlanToAssumptions(official));
        setResults(publishedPlanToResults(official));
        setStage('published');
        return;
      }
      const response = await incomePlanService.start(currentAgentId);
      setConversation([{ ...response, id: `welcome-${Date.now()}` }]); setStage(response.stage);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to start your Income Game Plan.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void boot(); }, [currentAgentId, incomePlan, incomePlanLoading, incomePlanError]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [conversation, sending]);
  useEffect(() => {
    if (!currentAgentId) return;
    const controller = new AbortController();
    setPlanHistoryLoading(true);
    setPlanHistoryError(null);
    publishedIncomePlanApi.getHistory(currentAgentId, planHistoryPage, controller.signal)
      .then(async response => {
        setPlanHistory(response.items);
        setPlanHistoryMeta({ curPage: response.curPage, nextPage: response.nextPage, prevPage: response.prevPage, itemsTotal: response.itemsTotal, pageTotal: response.pageTotal });
        const otherPages = Array.from({ length: response.pageTotal }, (_, index) => index + 1).filter(page => page !== response.curPage);
        const otherResponses = await Promise.all(otherPages.map(page => publishedIncomePlanApi.getHistory(currentAgentId, page, controller.signal)));
        if (!controller.signal.aborted) {
          const allItems = [...response.items, ...otherResponses.flatMap(page => page.items)];
          setSavedPlanMonths([...new Set(allItems.map(item => item.plan_start_date.slice(0, 7)))]);
        }
      })
      .catch(caught => {
        if (caught instanceof DOMException && caught.name === 'AbortError') return;
        setPlanHistoryError(caught instanceof Error ? caught.message : 'Unable to load plan history.');
      })
      .finally(() => { if (!controller.signal.aborted) setPlanHistoryLoading(false); });
    return () => controller.abort();
  }, [currentAgentId, planHistoryPage, planHistoryRefreshKey]);
  useEffect(() => { setPlanHistoryPage(1); setSavedPlanMonths([]); }, [currentAgentId]);
  useEffect(() => {
    if (futurePlanMonth && savedPlanMonths.includes(futurePlanMonth)) setFuturePlanMonth('');
  }, [futurePlanMonth, savedPlanMonths]);

  const generateAiFeedback = async (itemId: string, planResults: IncomePlanResults, planAssumptions: IncomePlanAssumptions) => {
    const workingDays = Math.max(1, planAssumptions.expected_working_days);
    const exactDailyPace = planResults.submitted_applications / workingDays;
    const practicalDailyPace = Math.ceil(exactDailyPace);
    const submittedApplicationAp = planAssumptions.average_annual_premium * planResults.submitted_applications;
    const monthlyApTarget = Math.ceil((planResults.estimated_deposits + submittedApplicationAp) / 2);
    const commissionPerIssuedPolicy = planAssumptions.average_annual_premium * (planAssumptions.commission_level / 100);
    const dailyMarketingSpend = Math.trunc(planResults.marketing_budget / workingDays);
    const dailyApTarget = Math.ceil(planAssumptions.average_annual_premium * practicalDailyPace);
    const resultBrief = [
      INCOME_PLAN_FEEDBACK_PROMPT,
      '',
      'AUTHORITATIVE COMPLETED INCOME PLAN',
      'Every number below is final. Explain these values without recalculating, replacing, or modifying them.',
      '',
      'GOAL',
      `Desired income goal: ${currencyExact.format(planAssumptions.desired_income_goal)}`,
      `Expected working days: ${workingDays}`,
      '',
      'PRODUCTION ASSUMPTIONS',
      `Commission level: ${planAssumptions.commission_level}%`,
      `Average annual premium per submitted application: ${currencyExact.format(planAssumptions.average_annual_premium)}`,
      `Placement rate: ${planAssumptions.placement_rate}%`,
      `Commission per issued policy: ${currencyExact.format(commissionPerIssuedPolicy)}`,
      '',
      'AUTHORITATIVE CONVERSION RESULTS',
      `Submitted applications required: ${planResults.submitted_applications}`,
      `Placed applications expected: ${planResults.placed_applications}`,
      `Issued policies required: ${planResults.issued_policies}`,
      `Estimated deposit: ${currencyExact.format(planResults.estimated_deposits)}`,
      '',
      'DAILY TARGETS',
      `Exact submitted-application pace: ${exactDailyPace.toFixed(2)} per working day`,
      `Practical submitted-application target: ${practicalDailyPace} per working day`,
      `Daily AP target: ${currencyExact.format(dailyApTarget)}`,
      `Estimated daily marketing spend: ${currencyExact.format(dailyMarketingSpend)}`,
      '',
      'MONTHLY TARGETS AND BUSINESS INVESTMENT',
      `Monthly submitted-application target: ${planResults.submitted_applications}`,
      `Monthly AP target: ${currencyExact.format(monthlyApTarget)}`,
      `Estimated cost per submitted application: ${currencyExact.format(planAssumptions.marketing_cost_per_application)}`,
      `Planned acquisition budget: ${currencyExact.format(planResults.marketing_budget)}`,
    ].join('\n');

    setConversation(items => items.map(item => item.id === itemId ? { ...item, aiFeedbackLoading: true, aiFeedbackUnavailable: false } : item));
    try {
      const feedback = await incomeCoachApi.getFeedback(resultBrief);
      setConversation(items => items.map(item => item.id === itemId ? { ...item, aiFeedback: feedback || planResults.explanation, aiFeedbackLoading: false } : item));
    } catch {
      setConversation(items => items.map(item => item.id === itemId ? { ...item, aiFeedback: planResults.explanation, aiFeedbackLoading: false, aiFeedbackUnavailable: true } : item));
    }
  };

  const sendTurn = async (values?: Partial<IncomePlanAssumptions>, actionId?: string) => {
    if (!currentAgentId || sending) return;
    const merged = { ...assumptions, ...values }; setAssumptions(merged); setSending(true); setError(null);
    const priorStage = stage;
    if (values) setConversation(items => items.map((item, index) => index === items.length - 1 ? { ...item, values } : item));
    if (stage === 'review') setStage('calculating');
    try {
      const response = await incomePlanService.sendTurn({ agent_id: currentAgentId, stage: priorStage, action_id: actionId, values, accepted_values: merged });
      const nextResults = response.results || results;
      const itemId = `${response.stage}-${Date.now()}`;
      setResults(nextResults); setStage(response.stage);
      setConversation(items => [...items, { ...response, accepted_values: response.accepted_values || merged, id: itemId }]);
      if (response.stage === 'results' && nextResults) void generateAiFeedback(itemId, nextResults, merged);
    } catch (caught) { setStage(priorStage); setError(caught instanceof Error ? caught.message : 'Unable to continue.'); }
    finally { setSending(false); }
  };
  const publish = async () => {
    if (!currentAgentId || !results) return;
    setSending(true); setError(null);
    try {
      const aiFeedback = [...conversation].reverse().find(item => item.aiFeedback)?.aiFeedback || results.explanation;
      const snapshot = createIncomePlanPublishedSnapshot(currentAgentId, assumptions, results, aiFeedback);
      let official: IncomePlanPublishedSnapshot;
      if (planBeingEdited) {
        if (!planBeingEdited.id) throw new Error('This plan cannot be updated because its plan ID is missing.');
        const changes = changedPublishedPlanFields(planBeingEdited, snapshot);
        official = Object.keys(changes).length
          ? await publishedIncomePlanApi.update(planBeingEdited.id, changes, currentAgentId)
          : planBeingEdited;
      } else {
        official = await publishedIncomePlanApi.publish(snapshot);
      }
      void refreshIncomePlan();
      setPlanHistoryRefreshKey(value => value + 1);
      setPublishedPlan(official);
      setPlanBeingEdited(null);
      setAssumptions(publishedPlanToAssumptions(official));
      setResults(publishedPlanToResults(official));
      setStage('published');
      setConfirmPublish(false);
    }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to publish your plan.'); }
    finally { setSending(false); }
  };
  const requestRedo = () => {
    const redoPrompt: ConversationItem = {
      id: `redo-prompt-${Date.now()}`,
      stage,
      assistant_message: 'Of course — we do not need to restart everything. Which part of the plan would you like to redo?',
      accepted_values: assumptions,
      validation_error: null,
      quick_replies: [],
      requested_action: 'collect_input',
      plan: null,
      results,
    };
    setError(null);
    setChoosingRedo(true);
    setConversation(items => [...items, redoPrompt]);
  };
  const chooseRedo = (targetStage: 'goal_period' | 'production_profile' | 'business_costs') => {
    const copy = targetStage === 'goal_period'
      ? 'Let’s update your income goal or working days. I kept your current answers ready for editing.'
      : targetStage === 'production_profile'
        ? 'Let’s update your production assumptions. Your current commission, average premium, and placement rate are ready.'
        : 'Let’s update your business cost estimate. I kept the rest of your plan unchanged.';
    const restartItem: ConversationItem = {
      id: `${targetStage}-redo-${Date.now()}`,
      stage: targetStage,
      assistant_message: copy,
      accepted_values: assumptions,
      validation_error: null,
      quick_replies: [],
      requested_action: 'collect_input',
      plan: null,
      results: null,
    };
    setError(null);
    setConfirmPublish(false);
    setChoosingRedo(false);
    setEditingStage(targetStage);
    setStage(targetStage);
    setConversation(items => [...items, restartItem]);
  };
  const finishRedo = (values: Partial<IncomePlanAssumptions>) => {
    const merged = { ...assumptions, ...values };
    const reviewItem: ConversationItem = {
      id: `review-redo-${Date.now()}`,
      stage: 'review',
      assistant_message: 'Perfect — I updated only that part. Please review the plan inputs below, and I’ll recalculate everything when you build the plan.',
      accepted_values: merged,
      validation_error: null,
      quick_replies: [],
      requested_action: 'confirm',
      plan: null,
      results: null,
    };
    setAssumptions(merged);
    setConversation(items => [...items.map((item, index) => index === items.length - 1 ? { ...item, values } : item), reviewItem]);
    setEditingStage(null);
    setStage('review');
  };

  const openHistoryPlan = async (item: IncomePlanHistoryItem) => {
    setPlannerView('history');
    setSelectedHistoryId(item.id);
    setHistoryDetail(null);
    setHistoryDetailLoading(true);
    setPlanHistoryError(null);
    try {
      const detail = await publishedIncomePlanApi.get(currentAgentId, { start_date: item.plan_start_date, end_date: item.plan_end_date });
      if (!detail) throw new Error('This saved plan could not be loaded.');
      setHistoryDetail(detail);
    } catch (caught) {
      setPlanHistoryError(caught instanceof Error ? caught.message : 'Unable to load this saved plan.');
    } finally {
      setHistoryDetailLoading(false);
    }
  };

  const isFuturePlan = (plan: IncomePlanPublishedSnapshot) => {
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return new Date(`${plan.plan_start_date}T00:00:00`) > currentMonth;
  };

  const editSavedFuturePlan = (plan: IncomePlanPublishedSnapshot) => {
    const editAssumptions = publishedPlanToAssumptions(plan);
    const editResults = publishedPlanToResults(plan);
    const redoPrompt: ConversationItem = {
      id: `future-redo-${Date.now()}`,
      stage: 'published',
      assistant_message: 'This future plan is ready to edit. Which part would you like to update?',
      accepted_values: editAssumptions,
      validation_error: null,
      quick_replies: [],
      requested_action: 'collect_input',
      plan: null,
      results: editResults,
    };
    setPlanBeingEdited(plan);
    setAssumptions(editAssumptions);
    setResults(editResults);
    setPublishedPlan(null);
    setPlannerView('current');
    setError(null);
    setConfirmPublish(false);
    setChoosingRedo(true);
    setStage('published');
    setConversation([redoPrompt]);
  };

  const availableFutureMonths = Array.from({ length: 12 }, (_, index) => {
    const now = new Date();
    const date = new Date(now.getFullYear(), now.getMonth() + index + 1, 1);
    return {
      value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      label: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    };
  }).filter(month => !savedPlanMonths.includes(month.value));

  const startSelectedFuturePlan = async () => {
    if (!futurePlanMonth) return;
    const [year, month] = futurePlanMonth.split('-').map(Number);
    const endDay = new Date(year, month, 0).getDate();
    setAssumptions({ ...getDefaultIncomePlanAssumptions(), start_date: `${futurePlanMonth}-01`, end_date: `${futurePlanMonth}-${String(endDay).padStart(2, '0')}` });
    setResults(null);
    setPublishedPlan(null);
    setLoading(true);
    setError(null);
    try {
      const response = await incomePlanService.start(currentAgentId);
      setConversation([{ ...response, id: `future-${Date.now()}` }]);
      setStage(response.stage);
      setPlannerView('current');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to start the future plan.');
    } finally {
      setLoading(false);
    }
  };

  if (incomePlanLoading || (loading && !incomePlanError)) return <div className="flex min-h-[65vh] items-center justify-center"><div className="text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-amber-500" /><p className="mt-3 text-xs font-bold text-slate-500">Preparing your Income Game Plan…</p></div></div>;
  if (incomePlanError) return <div className="flex min-h-[65vh] items-center justify-center"><div className="max-w-md rounded-[2rem] border border-rose-100 bg-white p-8 text-center shadow-sm"><p className="text-sm font-black text-slate-950">Unable to check your current plan</p><p className="mt-2 text-xs font-semibold leading-5 text-slate-500">PolicyHQ could not verify whether a plan is already locked in, so planning is temporarily disabled.</p><button type="button" onClick={() => void refreshIncomePlan()} className="mt-5 rounded-xl bg-slate-950 px-5 py-3 text-xs font-black text-white">Try Again</button></div></div>;
  if (publishedPlan && results) {
    const planDate = new Date(`${publishedPlan.plan_start_date}T00:00:00`);
    const currentPeriod = planDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const nextPeriodDate = new Date(planDate.getFullYear(), planDate.getMonth() + 1, 1);
    const nextPeriod = nextPeriodDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const futurePlanMonths = Array.from({ length: 12 }, (_, index) => {
      const date = new Date(nextPeriodDate.getFullYear(), nextPeriodDate.getMonth() + index, 1);
      return {
        value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
        label: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      };
    }).filter(month => !savedPlanMonths.includes(month.value));
    const editCurrentPlan = () => {
      setPlanBeingEdited(publishedPlan);
      setPublishedPlan(null);
      requestRedo();
    };
    const startFuturePlan = async () => {
      if (!futurePlanMonth) return;
      const [year, month] = futurePlanMonth.split('-').map(Number);
      const selectedStart = new Date(year, month - 1, 1);
      const currentStart = new Date(planDate.getFullYear(), planDate.getMonth(), 1);
      if (selectedStart <= currentStart) {
        setPlanHistoryError('Choose a month after the current plan.');
        return;
      }
      const endDay = new Date(year, month, 0).getDate();
      setAssumptions({ ...getDefaultIncomePlanAssumptions(), start_date: `${futurePlanMonth}-01`, end_date: `${futurePlanMonth}-${String(endDay).padStart(2, '0')}` });
      setResults(null);
      setPublishedPlan(null);
      setPlanBeingEdited(null);
      setLoading(true);
      setPlanHistoryError(null);
      try {
        const response = await incomePlanService.start(currentAgentId);
        setConversation([{ ...response, id: `future-${Date.now()}` }]);
        setStage(response.stage);
        setPlannerView('current');
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Unable to start the future plan.');
      } finally {
        setLoading(false);
      }
    };
    const historyAssumptions = historyDetail ? publishedPlanToAssumptions(historyDetail) : null;
    const historyResults = historyDetail ? publishedPlanToResults(historyDetail) : null;

    return <div className="w-full min-w-0">
      <div className="grid w-full min-w-0 gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="h-fit overflow-hidden rounded-[2rem] border border-white bg-white shadow-sm lg:sticky lg:top-4">
          <div className="border-b border-slate-100 bg-slate-950 p-5 text-white">
            <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-400 text-slate-950"><Bot className="h-5 w-5" /></span><div><p className="text-sm font-black">Income Coach</p><p className="text-[9px] font-semibold text-slate-400">Plan workspace</p></div></div>
            <button type="button" onClick={() => { setPlannerView('upcoming'); setSelectedHistoryId(null); setHistoryDetail(null); setPlanHistoryError(null); }} className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-amber-400 px-4 text-[10px] font-black text-slate-950 hover:bg-amber-300"><Sparkles className="h-4 w-4" /> Add new plan</button>
          </div>
          <nav aria-label="Income plans" className="p-3">
            <button type="button" onClick={() => { setPlannerView('current'); setSelectedHistoryId(null); setHistoryDetail(null); setPlanHistoryError(null); }} className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left ${plannerView === 'current' ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-50'}`}><CalendarDays className={`h-4 w-4 ${plannerView === 'current' ? 'text-amber-300' : 'text-slate-400'}`} /><span><span className="block text-[10px] font-black">Current plan</span><span className={`block text-[8px] font-semibold ${plannerView === 'current' ? 'text-slate-400' : 'text-slate-400'}`}>{currentPeriod}</span></span></button>
            <div className="mt-5 flex items-center justify-between px-3"><p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400">Plan history</p><span className="text-[8px] font-black text-slate-400">{planHistoryMeta.itemsTotal}</span></div>
            <div className="mt-2 space-y-1">
              {planHistoryLoading && <div className="flex items-center gap-2 px-3 py-4 text-[9px] font-bold text-slate-400"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading history…</div>}
              {!planHistoryLoading && planHistory.map(item => {
                const periodLabel = new Date(`${item.plan_start_date}T00:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                const savedLabel = new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                return <button key={item.id} type="button" onClick={() => void openHistoryPlan(item)} className={`flex w-full items-center justify-between gap-2 rounded-2xl px-3 py-3 text-left transition ${selectedHistoryId === item.id ? 'bg-amber-50 text-slate-950 ring-1 ring-amber-200' : 'text-slate-600 hover:bg-slate-50'}`}><span className="min-w-0"><span className="block truncate text-[10px] font-black">{periodLabel}</span><span className="block text-[8px] font-semibold text-slate-400">Saved {savedLabel}</span></span><ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300" /></button>;
              })}
              {!planHistoryLoading && planHistory.length === 0 && !planHistoryError && <p className="px-3 py-4 text-[9px] font-semibold text-slate-400">No saved plans yet.</p>}
            </div>
            {planHistoryMeta.pageTotal > 1 && <div className="mt-3 flex items-center justify-between border-t border-slate-100 px-2 pt-3"><button type="button" disabled={!planHistoryMeta.prevPage || planHistoryLoading} onClick={() => setPlanHistoryPage(planHistoryMeta.prevPage || 1)} className="rounded-lg px-2 py-1.5 text-[8px] font-black text-slate-500 disabled:opacity-30">Previous</button><span className="text-[8px] font-bold text-slate-400">{planHistoryMeta.curPage}/{planHistoryMeta.pageTotal}</span><button type="button" disabled={!planHistoryMeta.nextPage || planHistoryLoading} onClick={() => setPlanHistoryPage(planHistoryMeta.nextPage || planHistoryPage + 1)} className="rounded-lg px-2 py-1.5 text-[8px] font-black text-slate-500 disabled:opacity-30">Next</button></div>}
          </nav>
        </aside>

        <main className="min-w-0 space-y-5">
          <section className="flex flex-col gap-4 rounded-[2rem] border border-white bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700"><Sparkles className="h-5 w-5" /></span><div><p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-600">AI planning workspace</p><h1 className="mt-1 text-xl font-black text-slate-950">{plannerView === 'upcoming' ? 'Create a future plan' : plannerView === 'history' ? 'Review saved plan' : `Your plan for ${currentPeriod}`}</h1></div></div>
            <button type="button" onClick={() => navigate('/business/overview')} className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 px-4 text-[9px] font-black text-slate-500 hover:bg-slate-50">Back to My Business</button>
          </section>

          {planHistoryError && <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-[10px] font-bold text-rose-700">{planHistoryError}</div>}
          {plannerView === 'current' && <div className="space-y-4"><section className="flex flex-col gap-4 rounded-[2rem] border border-emerald-100 bg-gradient-to-r from-white to-emerald-50/60 p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-600">Current period</p><span className="rounded-full bg-emerald-100 px-2 py-1 text-[8px] font-black text-emerald-700">Active</span></div><p className="mt-2 text-[11px] font-semibold text-slate-500">Review your targets or ask the coach to revise one part.</p></div><button type="button" onClick={editCurrentPlan} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-xs font-black text-white"><Sparkles className="h-4 w-4 text-amber-300" /> Edit with Income Coach</button></section><ResultsCard results={results} assumptions={assumptions} publishedSnapshot={publishedPlan} aiFeedback={publishedPlan.ai_feedback} /></div>}

          {plannerView === 'upcoming' && <section className="overflow-visible rounded-[2rem] border border-white bg-white shadow-sm"><div className="grid gap-6 p-6 md:grid-cols-[minmax(0,1fr)_300px]"><div><p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-600">New conversation</p><h2 className="mt-2 text-2xl font-black text-slate-950">Plan ahead with your coach</h2><p className="mt-2 max-w-xl text-[11px] font-semibold leading-5 text-slate-500">Choose a future month. The AI coach will then guide you through the goal, production assumptions, and investment needed for that period.</p></div><div className="rounded-2xl bg-slate-950 p-5 text-white"><label htmlFor="future-plan-month" className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-400">Plan month</label><MonthPicker id="future-plan-month" value={futurePlanMonth} months={futurePlanMonths} onChange={setFuturePlanMonth} /><button type="button" disabled={!futurePlanMonth} onClick={() => void startFuturePlan()} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 text-[10px] font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"><Bot className="h-4 w-4" /> Start with AI Coach</button><p className="mt-3 text-[8px] font-semibold leading-4 text-slate-500">Suggested next period: {nextPeriod}</p></div></div></section>}

          {plannerView === 'history' && <div>{historyDetailLoading && <section className="flex min-h-64 items-center justify-center rounded-[2rem] border border-white bg-white shadow-sm"><div className="text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-amber-500" /><p className="mt-3 text-[10px] font-bold text-slate-400">Loading plan details…</p></div></section>}{!historyDetailLoading && historyDetail && historyAssumptions && historyResults && <div className="space-y-4"><section className="flex flex-col gap-4 rounded-[2rem] border border-amber-100 bg-amber-50/60 p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-700">Saved plan</p><h2 className="mt-2 text-lg font-black text-slate-950">{new Date(`${historyDetail.plan_start_date}T00:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2><p className="mt-1 text-[10px] font-semibold text-slate-500">{isFuturePlan(historyDetail) ? 'Future plan ready to review or revise.' : 'Historical snapshot loaded from the selected period.'}</p></div>{isFuturePlan(historyDetail) && <button type="button" onClick={() => editSavedFuturePlan(historyDetail)} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-[10px] font-black text-white shadow-sm transition hover:bg-slate-800"><Sparkles className="h-4 w-4 text-amber-400" /> Edit with Income Coach</button>}</section><ResultsCard results={historyResults} assumptions={historyAssumptions} publishedSnapshot={historyDetail} aiFeedback={historyDetail.ai_feedback} /></div>}{!historyDetailLoading && !historyDetail && !planHistoryError && <section className="rounded-[2rem] border border-dashed border-slate-200 bg-white p-10 text-center"><RefreshCw className="mx-auto h-5 w-5 text-slate-300" /><p className="mt-3 text-sm font-black text-slate-800">Choose a saved plan</p><p className="mt-1 text-[10px] font-semibold text-slate-400">Select a period from the history navigation to load its details.</p></section>}</div>}
        </main>
      </div>
    </div>;
  }

  const currentPeriod = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const historyAssumptions = historyDetail ? publishedPlanToAssumptions(historyDetail) : null;
  const historyResults = historyDetail ? publishedPlanToResults(historyDetail) : null;

  return <div className="grid h-[calc(100dvh-6rem)] min-h-0 w-full grid-cols-1 gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
    <aside className="h-fit overflow-hidden rounded-[2rem] border border-white bg-white shadow-sm lg:sticky lg:top-4">
      <div className="border-b border-slate-100 bg-slate-950 p-5 text-white">
        <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-400 text-slate-950"><Bot className="h-5 w-5" /></span><div><p className="text-sm font-black">Income Coach</p><p className="text-[9px] font-semibold text-slate-400">Plan workspace</p></div></div>
        <button type="button" onClick={() => { setPlannerView('upcoming'); setSelectedHistoryId(null); setHistoryDetail(null); setPlanHistoryError(null); }} className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-amber-400 px-4 text-[10px] font-black text-slate-950 hover:bg-amber-300"><Sparkles className="h-4 w-4" /> Add new plan</button>
      </div>
      <nav aria-label="Income plans" className="p-3">
        <button type="button" onClick={() => { setPlannerView('current'); setSelectedHistoryId(null); setHistoryDetail(null); }} className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left ${plannerView === 'current' ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-50'}`}><CalendarDays className={`h-4 w-4 ${plannerView === 'current' ? 'text-amber-300' : 'text-slate-400'}`} /><span><span className="block text-[10px] font-black">Current plan</span><span className="block text-[8px] font-semibold text-slate-400">{currentPeriod} · Not set</span></span></button>
        <div className="mt-5 flex items-center justify-between px-3"><p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400">Plan history</p><span className="text-[8px] font-black text-slate-400">{planHistoryMeta.itemsTotal}</span></div>
        <div className="mt-2 space-y-1">
          {planHistoryLoading && <div className="flex items-center gap-2 px-3 py-4 text-[9px] font-bold text-slate-400"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading history…</div>}
          {!planHistoryLoading && planHistory.map(item => <button key={item.id} type="button" onClick={() => void openHistoryPlan(item)} className={`flex w-full items-center justify-between gap-2 rounded-2xl px-3 py-3 text-left transition ${selectedHistoryId === item.id ? 'bg-amber-50 text-slate-950 ring-1 ring-amber-200' : 'text-slate-600 hover:bg-slate-50'}`}><span className="min-w-0"><span className="block truncate text-[10px] font-black">{new Date(`${item.plan_start_date}T00:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span><span className="block text-[8px] font-semibold text-slate-400">Saved {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span></span><ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300" /></button>)}
          {!planHistoryLoading && planHistory.length === 0 && !planHistoryError && <p className="px-3 py-4 text-[9px] font-semibold text-slate-400">No saved plans yet.</p>}
        </div>
        {planHistoryMeta.pageTotal > 1 && <div className="mt-3 flex items-center justify-between border-t border-slate-100 px-2 pt-3"><button type="button" disabled={!planHistoryMeta.prevPage || planHistoryLoading} onClick={() => setPlanHistoryPage(planHistoryMeta.prevPage || 1)} className="rounded-lg px-2 py-1.5 text-[8px] font-black text-slate-500 disabled:opacity-30">Previous</button><span className="text-[8px] font-bold text-slate-400">{planHistoryMeta.curPage}/{planHistoryMeta.pageTotal}</span><button type="button" disabled={!planHistoryMeta.nextPage || planHistoryLoading} onClick={() => setPlanHistoryPage(planHistoryMeta.nextPage || planHistoryPage + 1)} className="rounded-lg px-2 py-1.5 text-[8px] font-black text-slate-500 disabled:opacity-30">Next</button></div>}
      </nav>
    </aside>
    <div className="min-h-0 min-w-0">
    {plannerView === 'upcoming' ? <section className="relative z-20 overflow-visible rounded-[2rem] border border-white bg-white shadow-sm">
      <div className="grid gap-6 p-6 md:grid-cols-[minmax(0,1fr)_320px]">
        <div><p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-600">New plan</p><h1 className="mt-2 text-2xl font-black text-slate-950">Choose a future month</h1><p className="mt-2 max-w-xl text-[11px] font-semibold leading-5 text-slate-500">Select the month you want to plan. Income Coach will open a new guided conversation for that period.</p></div>
        <div className="rounded-2xl bg-slate-950 p-5 text-white"><label htmlFor="empty-future-plan-month" className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-400">Plan month</label><MonthPicker id="empty-future-plan-month" value={futurePlanMonth} months={availableFutureMonths} onChange={setFuturePlanMonth} /><button type="button" disabled={!futurePlanMonth || loading} onClick={() => void startSelectedFuturePlan()} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 text-[10px] font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-40">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />} Start with AI Coach</button></div>
      </div>
    </section> : plannerView === 'history' ? <div className="space-y-4">
      {planHistoryError && <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-[10px] font-bold text-rose-700">{planHistoryError}</div>}
      {historyDetailLoading && <section className="flex min-h-64 items-center justify-center rounded-[2rem] border border-white bg-white shadow-sm"><Loader2 className="h-5 w-5 animate-spin text-amber-500" /></section>}
      {!historyDetailLoading && historyDetail && historyAssumptions && historyResults && <><section className="flex flex-col gap-4 rounded-[2rem] border border-amber-100 bg-amber-50/60 p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-700">Saved plan</p><h1 className="mt-2 text-xl font-black text-slate-950">{new Date(`${historyDetail.plan_start_date}T00:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h1><p className="mt-1 text-[10px] font-semibold text-slate-500">{isFuturePlan(historyDetail) ? 'Future plan ready to review or revise.' : 'Historical snapshot loaded from the selected period.'}</p></div>{isFuturePlan(historyDetail) && <button type="button" onClick={() => editSavedFuturePlan(historyDetail)} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-[10px] font-black text-white shadow-sm transition hover:bg-slate-800"><Sparkles className="h-4 w-4 text-amber-400" /> Edit with Income Coach</button>}</section><ResultsCard results={historyResults} assumptions={historyAssumptions} publishedSnapshot={historyDetail} aiFeedback={historyDetail.ai_feedback} /></>}
    </div> : <div className="grid h-full min-h-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_220px]">
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-[2rem] border border-white bg-white shadow-sm">
      <header className="sticky top-0 z-10 border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur sm:px-6">
        <div className="flex items-center justify-between gap-4"><div className="flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-amber-300"><Bot className="h-5 w-5" /></span><div className="min-w-0"><p className="truncate text-sm font-black text-slate-950">PolicyHQ Income Coach</p><p className="text-[9px] font-semibold text-slate-400">Building a plan for {viewingAgentName}</p></div></div><div className="text-right"><p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-400">Step {step} of 5</p><div className="mt-2 flex gap-1">{Array.from({ length: 5 }, (_, index) => <span key={index} className={`h-1.5 w-5 rounded-full ${index < step ? 'bg-amber-400' : 'bg-slate-100'}`} />)}</div></div></div>
      </header>
      <div role="log" aria-live="polite" className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain bg-slate-50/50 px-4 py-5 sm:px-6">
        {conversation.map((item, index) => <div key={item.id} className="animate-in fade-in slide-in-from-bottom-2 duration-300"><div className="flex items-start gap-3"><span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><Sparkles className="h-3.5 w-3.5" /></span><div className="min-w-0 max-w-[760px] flex-1"><p className="whitespace-pre-line text-sm font-semibold leading-6 text-slate-700">{item.assistant_message}</p>{item.values && <CompletedAnswerCard stage={item.stage} values={item.values} />}{item.stage === 'conversion_summary' && index < conversation.length - 1 && <ConversionSummaryCard assumptions={item.accepted_values as IncomePlanAssumptions} />}{item.stage === 'results' && (item.results || results) && !choosingRedo && <ResultsCard results={(item.results || results) as IncomePlanResults} assumptions={{ ...assumptions, ...(item.accepted_values || {}) }} aiFeedback={item.aiFeedback} aiFeedbackLoading={item.aiFeedbackLoading} aiFeedbackUnavailable={item.aiFeedbackUnavailable} onRedo={index === conversation.length - 1 && stage === 'results' ? requestRedo : undefined} onContinue={index === conversation.length - 1 && stage === 'results' ? () => void sendTurn() : undefined} />}{index === conversation.length - 1 && <>
          {choosingRedo && <RedoChoiceCard onChoose={chooseRedo} />}
          {stage === 'welcome' && <button type="button" onClick={() => void sendTurn(undefined, 'start')} className="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-xs font-black text-white shadow-lg hover:bg-slate-800">Let&apos;s Get Started <ArrowRight className="h-4 w-4" /></button>}
          {!choosingRedo && stage === 'goal_period' && <GoalPeriodCard initial={assumptions} onContinue={values => editingStage === 'goal_period' ? finishRedo(values) : void sendTurn(values)} />}
          {!choosingRedo && stage === 'production_profile' && <ProductionCard initial={assumptions} onContinue={values => editingStage === 'production_profile' ? finishRedo(values) : void sendTurn(values)} />}
          {!choosingRedo && stage === 'conversion_summary' && <ConversionSummaryCard assumptions={assumptions} onRedo={requestRedo} onContinue={() => void sendTurn()} />}
          {!choosingRedo && stage === 'business_costs' && <BusinessCostsCard initial={assumptions} onContinue={values => editingStage === 'business_costs' ? finishRedo(values) : void sendTurn(values)} />}
          {!choosingRedo && stage === 'review' && <ReviewCard assumptions={assumptions} onRedo={requestRedo} onBuild={() => void sendTurn()} />}
          {!choosingRedo && stage === 'commitment' && <CommitmentCard onRestart={requestRedo} onPublish={() => setConfirmPublish(true)} />}
        </>}</div></div></div>)}
        {(stage === 'calculating' || (sending && stage === 'review')) && <div className="ml-10 max-w-[760px]"><CalculationCard /></div>}
        {sending && stage !== 'calculating' && stage !== 'review' && <div className="ml-10 flex items-center gap-2 text-[10px] font-bold text-slate-400"><Loader2 className="h-3.5 w-3.5 animate-spin" /> PolicyHQ AI is thinking…</div>}
        {error && <div className="ml-10 flex max-w-[760px] items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3"><p className="text-[10px] font-bold text-rose-700">{error}</p><button type="button" onClick={() => setError(null)} className="shrink-0 rounded-lg bg-white px-3 py-1.5 text-[9px] font-black text-rose-700">Dismiss</button></div>}
        <div ref={endRef} />
      </div>
    </section>
    <aside className="hidden h-fit rounded-[2rem] border border-white bg-white p-5 shadow-sm xl:block"><p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Plan progress</p><div className="mt-5 space-y-4">{[['Goal', 1], ['Production profile', 2], ['Business costs', 3], ['Review', 4], ['Your plan', 5]].map(([label, position]) => <div key={String(label)} className="flex items-center gap-3"><span className={`flex h-7 w-7 items-center justify-center rounded-full text-[9px] font-black ${Number(position) < step ? 'bg-emerald-100 text-emerald-700' : Number(position) === step ? 'bg-amber-400 text-slate-950' : 'bg-slate-100 text-slate-400'}`}>{Number(position) < step ? <Check className="h-3.5 w-3.5" /> : position}</span><span className={`text-[10px] font-bold ${Number(position) <= step ? 'text-slate-700' : 'text-slate-300'}`}>{label}</span></div>)}</div><div className="mt-6 rounded-2xl bg-slate-950 p-4 text-white"><Target className="h-4 w-4 text-amber-300" /><p className="mt-3 text-[8px] font-black uppercase tracking-wider text-white/40">Income goal</p><p className="mt-1 text-xl font-black">{currency.format(assumptions.desired_income_goal)}</p><p className="mt-1 text-[9px] font-semibold text-white/45">{assumptions.expected_working_days} working days</p></div></aside>
    {confirmPublish && <div className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm" onClick={() => setConfirmPublish(false)}><div role="dialog" aria-modal="true" aria-labelledby="publish-title" onClick={e => e.stopPropagation()} className="w-full max-w-md rounded-[2rem] bg-white p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700"><Rocket className="h-5 w-5" /></span><button type="button" onClick={() => setConfirmPublish(false)} aria-label="Close" className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button></div><h2 id="publish-title" className="mt-5 text-2xl font-black text-slate-950">Publish this goal?</h2><p className="mt-2 text-xs font-semibold leading-5 text-slate-500">This will lock in your plan. Once published, you cannot submit another plan.</p><div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><PrimaryButton secondary onClick={() => setConfirmPublish(false)}>Keep Reviewing</PrimaryButton><PrimaryButton disabled={sending} onClick={() => void publish()}>{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 text-emerald-300" />} Confirm & Publish</PrimaryButton></div></div></div>}
    </div>}
    </div>
  </div>;
};

export const IncomeGamePlanManagerView = ({ agentId }: { agentId: string }) => {
  const [scoreboard, setScoreboard] = useState<IncomePlanScoreboard | null>(null);
  const [notes, setNotes] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [reviewed, setReviewed] = useState<'approve' | 'request_changes' | null>(null);
  useEffect(() => { const controller = new AbortController(); incomePlanService.getManagerScoreboard(agentId, controller.signal).then(setScoreboard); return () => controller.abort(); }, [agentId]);
  const review = async (decision: 'approve' | 'request_changes') => {
    setReviewing(true);
    try { await incomePlanService.reviewManagerPlan(agentId, decision, notes); setReviewed(decision); }
    finally { setReviewing(false); }
  };
  if (!scoreboard) return <div className="rounded-[2rem] bg-white p-8 text-center text-xs font-bold text-slate-400">No submitted Income Game Plan is available for this agent.</div>;
  return <div className="space-y-5"><IncomePlanScoreboardView scoreboard={scoreboard} /><section className="grid grid-cols-1 gap-4 rounded-[2rem] bg-white p-6 shadow-sm lg:grid-cols-2"><div><p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Original assumptions</p><div className="mt-3 grid grid-cols-2 gap-2">{[['Commission', `${scoreboard.assumptions.commission_level}%`], ['Average AP', currency.format(scoreboard.assumptions.average_annual_premium)], ['Placement', `${scoreboard.assumptions.placement_rate}%`], ['Issue rate', `${scoreboard.assumptions.issue_rate_after_placement}%`]].map(([label, value]) => <div key={label} className="rounded-xl bg-slate-50 p-3"><p className="text-[8px] font-bold uppercase text-slate-400">{label}</p><p className="mt-1 text-sm font-black text-slate-900">{value}</p></div>)}</div><p className="mt-4 text-[9px] font-black uppercase tracking-wider text-slate-400">Version history</p><div className="mt-2 rounded-xl border border-slate-100 p-3 text-[10px] font-semibold text-slate-500">Version {scoreboard.version} · Official plan</div></div><div><label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Manager notes</label><textarea value={notes} onChange={e => setNotes(e.target.value)} rows={5} className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-xs font-semibold outline-none focus:border-amber-400" placeholder="Add coaching notes…" />{reviewed && <p role="status" className="mt-2 text-[10px] font-bold text-emerald-600">{reviewed === 'approve' ? 'Plan approved.' : 'Change request sent.'}</p>}<div className="mt-3 flex justify-end gap-2"><PrimaryButton secondary disabled={reviewing} onClick={() => void review('request_changes')}>Request Changes</PrimaryButton><PrimaryButton disabled={reviewing} onClick={() => void review('approve')}>Approve Plan</PrimaryButton></div></div></section></div>;
};

export const IncomeGamePlanManagerPage = () => {
  const { agentId = '' } = useParams();
  return <IncomeGamePlanManagerView agentId={agentId} />;
};
