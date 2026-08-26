export type IncomePlanStage =
  | 'welcome'
  | 'goal_period'
  | 'production_profile'
  | 'conversion_summary'
  | 'commission_mix'
  | 'business_costs'
  | 'review'
  | 'calculating'
  | 'results'
  | 'commitment'
  | 'published';

export type IncomePlanStatus = 'draft' | 'pending_manager' | 'official';

export type IncomePlanRequestedAction =
  | 'wait'
  | 'collect_input'
  | 'show_review'
  | 'calculate'
  | 'show_results'
  | 'submit_to_manager'
  | 'publish'
  | 'show_scoreboard';

export type IncomePlanAction = {
  id: string;
  label: string;
  intent?: 'primary' | 'secondary' | 'danger';
};

export type IncomePlanAssumptions = {
  desired_income_goal: number;
  goal_type: 'gross_commission_deposits' | 'net_income_after_expenses';
  start_date: string;
  end_date: string;
  expected_working_days: number;
  commission_level: number;
  average_annual_premium: number;
  placement_rate: number;
  issue_rate_after_placement: number;
  nine_month_advance: number;
  six_month_advance: number;
  as_earned: number;
  marketing_cost_per_application: number;
  monthly_crm_cost: number;
  other_monthly_technology_costs: number;
};

export type IncomePlanResults = {
  deposit_goal: number;
  issued_policies: number;
  placed_applications: number;
  submitted_applications: number;
  submitted_ap: number;
  issued_ap: number;
  marketing_budget: number;
  technology_costs: number;
  total_business_expenses: number;
  estimated_deposits: number;
  estimated_net: number;
  weekly_application_target: number;
  practical_daily_target: number;
  explanation: string;
};

export type IncomePlanPublishedSnapshot = {
  id?: string;
  agent_id: string;
  desired_income_goal: number;
  expected_working_days: number;
  commission_level: number;
  average_annual_premium: number;
  placement_rate: number;
  marketing_cost_per_application: number;
  commission_per_issued_policy: number;
  submitted_applications: number;
  placed_applications: number;
  issued_policies: number;
  estimated_deposit: number;
  exact_daily_application_pace: number;
  daily_submitted_applications: number;
  estimated_acquisition_budget: number;
  daily_ap_target: number;
  daily_marketing_spend: number;
  monthly_submitted_applications: number;
  monthly_ap_target: number;
  ai_feedback: string;
  plan_start_date: string;
  plan_end_date: string;
  formula_version: number;
};

export type IncomePlanMetric = {
  id: string;
  label: string;
  plan: number;
  actual: number;
  pace: number;
  format: 'number' | 'currency';
  status: 'ahead' | 'on_pace' | 'behind';
};

export type IncomePlanScoreboard = {
  id: string;
  agent_id: string;
  status: IncomePlanStatus;
  income_goal: number;
  start_date: string;
  end_date: string;
  working_days_remaining: number;
  current_projection: number;
  variance_from_plan: number;
  metrics: IncomePlanMetric[];
  coaching: {
    what_is_happening: string;
    why_it_matters: string;
    what_to_do_next: string;
  };
  assumptions: IncomePlanAssumptions;
  results: IncomePlanResults;
  version: number;
};

export type IncomePlanChatResponse = {
  stage: IncomePlanStage;
  assistant_message: string;
  accepted_values: Partial<IncomePlanAssumptions>;
  validation_error: string | null;
  quick_replies: Array<{ id: string; label: string }>;
  requested_action: IncomePlanRequestedAction;
  plan: IncomePlanScoreboard | null;
  results: IncomePlanResults | null;
};

export type IncomePlanTurnRequest = {
  agent_id: string;
  stage: IncomePlanStage;
  action_id?: string;
  values?: Partial<IncomePlanAssumptions>;
  accepted_values: Partial<IncomePlanAssumptions>;
};

export const DEFAULT_INCOME_PLAN_ASSUMPTIONS: IncomePlanAssumptions = {
  desired_income_goal: 20_000,
  goal_type: 'gross_commission_deposits',
  start_date: '',
  end_date: '',
  expected_working_days: 20,
  commission_level: 85,
  average_annual_premium: 1_400,
  placement_rate: 60,
  issue_rate_after_placement: 75,
  nine_month_advance: 75,
  six_month_advance: 20,
  as_earned: 5,
  marketing_cost_per_application: 146.72,
  monthly_crm_cost: 147,
  other_monthly_technology_costs: 0,
};
