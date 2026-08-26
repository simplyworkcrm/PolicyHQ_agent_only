import { ApiError } from '../../../services/api';
import {
  DEFAULT_INCOME_PLAN_ASSUMPTIONS,
  IncomePlanAssumptions,
  IncomePlanChatResponse,
  IncomePlanResults,
  IncomePlanPublishedSnapshot,
  IncomePlanScoreboard,
  IncomePlanTurnRequest,
} from '../types/incomeGamePlan';

const INCOME_CALCULATOR_API_BASE = import.meta.env.DEV
  ? '/xano-api/api:SZgR1JsR/income_calculator'
  : 'https://api1.simplyworkcrm.com/api:SZgR1JsR/income_calculator';

const incomePlanAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('authToken') || ''}`,
  'Content-Type': 'application/json',
});

export interface IncomePlanHistoryItem {
  id: string;
  created_at: number;
  plan_start_date: string;
  plan_end_date: string;
  agent_id: string;
  desired_income_goal: number;
  expected_working_days: number;
  daily_submitted_applications: number;
  daily_ap_target: number;
  monthly_submitted_applications: number;
  monthly_ap_target: number;
  ai_feedback: string;
}

export interface IncomePlanHistoryResponse {
  itemsReceived: number;
  curPage: number;
  nextPage: number | null;
  prevPage: number | null;
  offset: number;
  perPage: number;
  itemsTotal: number;
  pageTotal: number;
  items: IncomePlanHistoryItem[];
}

const unwrapPublishedPlan = (payload: unknown, fallbackAgentId = ''): IncomePlanPublishedSnapshot | null => {
  if (Array.isArray(payload)) return payload.length ? unwrapPublishedPlan(payload[0], fallbackAgentId) : null;
  if (!payload || typeof payload !== 'object') return null;
  const record = payload as Record<string, unknown>;
  for (const key of ['item', 'data', 'result', 'record']) {
    if (record[key] !== undefined) {
      const nested = unwrapPublishedPlan(record[key], fallbackAgentId);
      if (nested) return nested;
    }
  }
  const hasPlanFields = record.desired_income_goal !== undefined
    || record.daily_ap_target !== undefined
    || record.monthly_ap_target !== undefined;
  if (!hasPlanFields) return null;
  return {
    ...record,
    agent_id: String(record.agent_id || fallbackAgentId),
  } as unknown as IncomePlanPublishedSnapshot;
};

export const createIncomePlanPublishedSnapshot = (
  agentId: string,
  assumptions: IncomePlanAssumptions,
  results: IncomePlanResults,
  aiFeedback: string,
): IncomePlanPublishedSnapshot => {
  const workingDays = Math.max(1, assumptions.expected_working_days);
  const submittedApplicationAp = assumptions.average_annual_premium * results.submitted_applications;
  const monthlyApTarget = Math.ceil((results.estimated_deposits + submittedApplicationAp) / 2);
  const dailyApplicationPace = results.submitted_applications / workingDays;
  return {
    agent_id: agentId,
    desired_income_goal: assumptions.desired_income_goal,
    expected_working_days: assumptions.expected_working_days,
    commission_level: assumptions.commission_level,
    average_annual_premium: assumptions.average_annual_premium,
    placement_rate: assumptions.placement_rate,
    marketing_cost_per_application: assumptions.marketing_cost_per_application,
    commission_per_issued_policy: assumptions.average_annual_premium * (assumptions.commission_level / 100),
    submitted_applications: results.submitted_applications,
    placed_applications: results.placed_applications,
    issued_policies: results.issued_policies,
    estimated_deposit: results.estimated_deposits,
    exact_daily_application_pace: Number(dailyApplicationPace.toFixed(2)),
    daily_submitted_applications: Math.ceil(dailyApplicationPace),
    estimated_acquisition_budget: results.marketing_budget,
    daily_ap_target: Math.ceil(assumptions.average_annual_premium * Math.ceil(dailyApplicationPace)),
    daily_marketing_spend: Math.trunc(results.marketing_budget / workingDays),
    monthly_submitted_applications: results.submitted_applications,
    monthly_ap_target: monthlyApTarget,
    ai_feedback: aiFeedback,
    plan_start_date: assumptions.start_date,
    plan_end_date: assumptions.end_date,
    formula_version: 2,
  };
};

export const publishedIncomePlanApi = {
  async get(
    agentId: string,
    period: { start_date?: string | null; end_date?: string | null } = {},
    signal?: AbortSignal,
  ): Promise<IncomePlanPublishedSnapshot | null> {
    const query = new URLSearchParams({
      start_date: period.start_date || '',
      end_date: period.end_date || '',
    });
    const response = await fetch(`${INCOME_CALCULATOR_API_BASE}/${encodeURIComponent(agentId)}?${query.toString()}`, {
      headers: incomePlanAuthHeaders(),
      signal,
    });
    if (response.status === 404 || response.status === 204) return null;
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new ApiError((payload as { error?: string } | null)?.error || 'Unable to check for a published Income Game Plan.', response.status);
    return unwrapPublishedPlan(payload, agentId);
  },

  async publish(snapshot: IncomePlanPublishedSnapshot): Promise<IncomePlanPublishedSnapshot> {
    const response = await fetch(INCOME_CALCULATOR_API_BASE, {
      method: 'POST',
      headers: incomePlanAuthHeaders(),
      body: JSON.stringify(snapshot),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new ApiError((payload as { error?: string } | null)?.error || 'Unable to publish your Income Game Plan.', response.status);
    return unwrapPublishedPlan(payload, snapshot.agent_id) || snapshot;
  },

  async update(
    planId: string,
    changes: Partial<IncomePlanPublishedSnapshot>,
    fallbackAgentId = '',
  ): Promise<IncomePlanPublishedSnapshot> {
    const response = await fetch(`${INCOME_CALCULATOR_API_BASE}/${encodeURIComponent(planId)}`, {
      method: 'PATCH',
      headers: incomePlanAuthHeaders(),
      body: JSON.stringify(changes),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new ApiError((payload as { error?: string } | null)?.error || 'Unable to update your Income Game Plan.', response.status);
    const updated = unwrapPublishedPlan(payload, fallbackAgentId);
    if (!updated) throw new ApiError('The updated Income Game Plan response was incomplete.', response.status);
    return updated;
  },

  async getHistory(agentId: string, page = 1, signal?: AbortSignal): Promise<IncomePlanHistoryResponse> {
    const query = new URLSearchParams({ page: String(Math.max(1, page)) });
    const response = await fetch(`${INCOME_CALCULATOR_API_BASE}/${encodeURIComponent(agentId)}/history?${query.toString()}`, {
      headers: incomePlanAuthHeaders(),
      signal,
    });
    const payload = await response.json().catch(() => null) as IncomePlanHistoryResponse | { error?: string } | null;
    if (!response.ok) throw new ApiError((payload as { error?: string } | null)?.error || 'Unable to load Income Game Plan history.', response.status);
    const history = payload as IncomePlanHistoryResponse;
    return {
      ...history,
      items: Array.isArray(history?.items) ? history.items : [],
    };
  },
};

export interface IncomePlanService {
  start(agentId: string, signal?: AbortSignal): Promise<IncomePlanChatResponse>;
  sendTurn(request: IncomePlanTurnRequest, signal?: AbortSignal): Promise<IncomePlanChatResponse>;
  getScoreboard(agentId: string, signal?: AbortSignal): Promise<IncomePlanScoreboard | null>;
  publish(agentId: string, assumptions: IncomePlanAssumptions, results: IncomePlanResults): Promise<IncomePlanScoreboard>;
  sendToManager(agentId: string, assumptions: IncomePlanAssumptions, results: IncomePlanResults): Promise<void>;
  getManagerScoreboard(agentId: string, signal?: AbortSignal): Promise<IncomePlanScoreboard | null>;
  reviewManagerPlan(agentId: string, decision: 'approve' | 'request_changes', notes: string): Promise<void>;
}

const getMonthDefaults = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return { start_date: dateKey(start), end_date: dateKey(end) };
};

export const getDefaultIncomePlanAssumptions = (): IncomePlanAssumptions => ({
  ...DEFAULT_INCOME_PLAN_ASSUMPTIONS,
  ...getMonthDefaults(),
});

export const calculateIncomePlanResults = (assumptions: IncomePlanAssumptions): IncomePlanResults => {
  const commissionPerIssuedPolicy = assumptions.average_annual_premium * (assumptions.commission_level / 100);
  const issuedPolicies = commissionPerIssuedPolicy > 0 ? Math.ceil(assumptions.desired_income_goal / commissionPerIssuedPolicy) : 0;
  const submittedApplications = assumptions.placement_rate > 0 ? Math.ceil(issuedPolicies / (assumptions.placement_rate / 100)) : 0;
  const placedApplications = Math.ceil((submittedApplications + issuedPolicies) / 2);
  const workingDays = Math.max(1, assumptions.expected_working_days);
  const practicalDailyTarget = Math.ceil(submittedApplications / workingDays);
  const marketingBudget = submittedApplications * assumptions.marketing_cost_per_application;
  const estimatedDeposits = issuedPolicies * commissionPerIssuedPolicy;
  const submittedApplicationAp = assumptions.average_annual_premium * submittedApplications;
  const monthlyApTarget = Math.ceil((estimatedDeposits + submittedApplicationAp) / 2);

  return {
    deposit_goal: assumptions.desired_income_goal,
    issued_policies: issuedPolicies,
    placed_applications: placedApplications,
    submitted_applications: submittedApplications,
    submitted_ap: monthlyApTarget,
    issued_ap: issuedPolicies * assumptions.average_annual_premium,
    marketing_budget: marketingBudget,
    technology_costs: 0,
    total_business_expenses: marketingBudget,
    estimated_deposits: estimatedDeposits,
    estimated_net: estimatedDeposits - marketingBudget,
    weekly_application_target: Math.ceil(submittedApplications / Math.max(1, Math.ceil(workingDays / 5))),
    practical_daily_target: practicalDailyTarget,
    explanation: `A pace of ${practicalDailyTarget} submitted ${practicalDailyTarget === 1 ? 'application' : 'applications'} per working day supports the ${submittedApplications}-application target needed to reach your income goal.`,
  };
};

export const MOCK_INCOME_PLAN_RESULTS: IncomePlanResults = calculateIncomePlanResults({
  ...DEFAULT_INCOME_PLAN_ASSUMPTIONS,
  start_date: '2026-08-01',
  end_date: '2026-08-31',
});

const stageCopy: Record<string, Pick<IncomePlanChatResponse, 'assistant_message' | 'requested_action'>> = {
  goal_period: { assistant_message: 'What do you want to earn during this period?', requested_action: 'collect_input' },
  production_profile: { assistant_message: 'Let\'s use numbers that match your business.', requested_action: 'collect_input' },
  conversion_summary: { assistant_message: 'Here is the production path your current assumptions create.', requested_action: 'show_results' },
  business_costs: { assistant_message: 'What will it cost to produce the business?', requested_action: 'collect_input' },
  review: { assistant_message: 'Review the assumptions we\'ll use to build your plan.', requested_action: 'show_review' },
  results: { assistant_message: 'Here\'s your game plan.', requested_action: 'show_results' },
  commitment: { assistant_message: 'Are you comfortable committing to this plan?', requested_action: 'publish' },
};

const makeResponse = (
  stage: IncomePlanChatResponse['stage'],
  acceptedValues: Partial<IncomePlanAssumptions> = {},
  results: IncomePlanResults | null = null,
): IncomePlanChatResponse => ({
  stage,
  assistant_message: stageCopy[stage]?.assistant_message || '',
  accepted_values: acceptedValues,
  validation_error: null,
  quick_replies: [],
  requested_action: stageCopy[stage]?.requested_action || 'wait',
  plan: null,
  results,
});

const scoreboardStorageKey = (agentId: string) => `income_game_plan_scoreboard_${agentId}`;

export class MockIncomePlanService implements IncomePlanService {
  async start(): Promise<IncomePlanChatResponse> {
    return {
      stage: 'welcome',
      assistant_message: 'Let\'s build your monthly game plan.\n\nI\'ll ask a few quick questions, calculate the numbers behind the scenes, and show you exactly what it will take to reach your goal.',
      accepted_values: {},
      validation_error: null,
      quick_replies: [{ id: 'start', label: 'Let\'s Get Started' }],
      requested_action: 'wait',
      plan: null,
      results: null,
    };
  }

  async sendTurn(request: IncomePlanTurnRequest): Promise<IncomePlanChatResponse> {
    const accepted = { ...request.accepted_values, ...request.values };
    const nextStage = {
      welcome: 'goal_period',
      goal_period: 'production_profile',
      production_profile: 'conversion_summary',
      conversion_summary: 'business_costs',
      business_costs: 'review',
      review: 'results',
      results: 'commitment',
      commitment: 'commitment',
      calculating: 'results',
      published: 'published',
    }[request.stage] as IncomePlanChatResponse['stage'];
    const resultAssumptions = { ...getDefaultIncomePlanAssumptions(), ...accepted } as IncomePlanAssumptions;
    const response = makeResponse(nextStage, accepted, nextStage === 'results' || nextStage === 'commitment' ? calculateIncomePlanResults(resultAssumptions) : null);
    if (request.stage === 'goal_period') response.assistant_message = `Got it — you're targeting ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(accepted.desired_income_goal || 0))} over ${accepted.expected_working_days} working days.\n\nNow let’s use numbers that match your business.`;
    if (request.stage === 'production_profile') response.assistant_message = 'Thanks — I’ll use your commission level, average annual premium, and placement rate to map the production required to reach your goal.';
    if (request.stage === 'conversion_summary') response.assistant_message = 'That gives us your required production path.\n\nNow let’s estimate what each submitted application costs to generate.';
    if (request.stage === 'business_costs') response.assistant_message = 'Thanks — I’ve added your estimated cost per submitted application.\n\nReview the assumptions and conversion targets below before I build your plan.';
    return response;
  }

  async getScoreboard(agentId: string): Promise<IncomePlanScoreboard | null> {
    const stored = localStorage.getItem(scoreboardStorageKey(agentId));
    return stored ? JSON.parse(stored) as IncomePlanScoreboard : null;
  }

  async publish(agentId: string, assumptions: IncomePlanAssumptions, results: IncomePlanResults): Promise<IncomePlanScoreboard> {
    const metrics: IncomePlanScoreboard['metrics'] = [
      ['submitted_applications', 'Submitted applications', results.submitted_applications, 18, 'number'],
      ['placed_applications', 'Placed applications', results.placed_applications, 15, 'number'],
      ['issued_policies', 'Issued policies', results.issued_policies, 10, 'number'],
      ['submitted_ap', 'Submitted AP', results.submitted_ap, 25_200, 'currency'],
      ['issued_ap', 'Issued AP', results.issued_ap, 14_000, 'currency'],
      ['marketing_spend', 'Marketing spend', results.marketing_budget, 2_480, 'currency'],
      ['deposits', 'Deposits', results.estimated_deposits, 8_550, 'currency'],
    ].map(([id, label, plan, actual, format]) => ({
      id: String(id), label: String(label), plan: Number(plan), actual: Number(actual), pace: Number(plan) * 0.4,
      format: format as 'number' | 'currency', status: Number(actual) >= Number(plan) * 0.4 ? 'on_pace' : 'behind',
    }));
    const scoreboard: IncomePlanScoreboard = {
      id: `mock-${Date.now()}`, agent_id: agentId, status: 'official',
      income_goal: assumptions.desired_income_goal, start_date: assumptions.start_date, end_date: assumptions.end_date,
      working_days_remaining: 12, current_projection: 19_480, variance_from_plan: -520,
      metrics,
      coaching: {
        what_is_happening: 'Application volume is close to plan, while issued production is slightly behind the required pace.',
        why_it_matters: 'A small issue-rate gap compounds quickly as the end of the planning period approaches.',
        what_to_do_next: 'Protect three submissions per workday and review every outstanding requirement before noon.',
      }, assumptions, results, version: 1,
    };
    localStorage.setItem(scoreboardStorageKey(agentId), JSON.stringify(scoreboard));
    return scoreboard;
  }

  async sendToManager(): Promise<void> { return Promise.resolve(); }
  async getManagerScoreboard(agentId: string): Promise<IncomePlanScoreboard | null> { return this.getScoreboard(agentId); }
  async reviewManagerPlan(): Promise<void> { return Promise.resolve(); }
}

export class XanoIncomePlanService implements IncomePlanService {
  private baseUrl = String(import.meta.env.VITE_INCOME_PLAN_XANO_BASE_URL || '').replace(/\/$/, '');
  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    if (!this.baseUrl) throw new ApiError('Income Game Plan Xano API is not configured.');
    const token = localStorage.getItem('authToken');
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...init.headers },
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new ApiError(data?.error || 'Income Game Plan request failed.', response.status);
    return data as T;
  }
  start(agentId: string, signal?: AbortSignal) { return this.request<IncomePlanChatResponse>('/chat/start', { method: 'POST', signal, body: JSON.stringify({ agent_id: agentId }) }); }
  sendTurn(request: IncomePlanTurnRequest, signal?: AbortSignal) { return this.request<IncomePlanChatResponse>('/chat/turn', { method: 'POST', signal, body: JSON.stringify(request) }); }
  getScoreboard(agentId: string, signal?: AbortSignal) { return this.request<IncomePlanScoreboard | null>(`/scoreboard?agent_id=${encodeURIComponent(agentId)}`, { signal }); }
  publish(agentId: string, assumptions: IncomePlanAssumptions, results: IncomePlanResults) { return this.request<IncomePlanScoreboard>('/publish', { method: 'POST', body: JSON.stringify({ agent_id: agentId, assumptions, results }) }); }
  async sendToManager(agentId: string, assumptions: IncomePlanAssumptions, results: IncomePlanResults) { await this.request('/submit-to-manager', { method: 'POST', body: JSON.stringify({ agent_id: agentId, assumptions, results }) }); }
  getManagerScoreboard(agentId: string, signal?: AbortSignal) { return this.request<IncomePlanScoreboard | null>(`/manager?agent_id=${encodeURIComponent(agentId)}`, { signal }); }
  async reviewManagerPlan(agentId: string, decision: 'approve' | 'request_changes', notes: string) { await this.request('/manager/review', { method: 'POST', body: JSON.stringify({ agent_id: agentId, decision, notes }) }); }
}

export const incomePlanService: IncomePlanService = import.meta.env.VITE_INCOME_PLAN_SERVICE === 'xano'
  ? new XanoIncomePlanService()
  : new MockIncomePlanService();
