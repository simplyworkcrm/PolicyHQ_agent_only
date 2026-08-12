import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { calculateIncomePlanResults, getDefaultIncomePlanAssumptions, MOCK_INCOME_PLAN_RESULTS, MockIncomePlanService } from '../../services/incomeGamePlanApi';
import { BusinessCostsCard, CommitmentCard, ConversionSummaryCard, GoalPeriodCard, IncomePlanScoreboardView, ProductionCard, ResultsCard, ReviewCard } from './IncomeGamePlan';

describe('Income Game Plan', () => {
  it('renders the goal stage and submits its defaults', () => {
    const onContinue = vi.fn();
    render(<GoalPeriodCard initial={getDefaultIncomePlanAssumptions()} onContinue={onContinue} />);
    expect(screen.getByLabelText('Desired income goal')).toHaveValue(20000);
    expect(screen.queryByLabelText('Goal type')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Start date')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('End date')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Expected working days')).toHaveAttribute('max', '29');
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(onContinue).toHaveBeenCalledWith(expect.objectContaining({ desired_income_goal: 20000, expected_working_days: 20, goal_type: 'gross_commission_deposits', start_date: expect.any(String), end_date: expect.any(String) }));
  });

  it('collects only the editable per-submission cost estimate', () => {
    const onContinue = vi.fn();
    render(<BusinessCostsCard initial={getDefaultIncomePlanAssumptions()} onContinue={onContinue} />);
    expect(screen.getByLabelText('Marketing cost / submitted app')).toBeVisible();
    expect(screen.queryByLabelText('Monthly CRM cost')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Other monthly technology')).not.toBeInTheDocument();
    expect(screen.getByText(/rough per-submission estimate/i)).toBeVisible();
  });

  it('uses the organization placement benchmark and renders the conversion summary', () => {
    const assumptions = { ...getDefaultIncomePlanAssumptions(), placement_rate: 80 };
    const production = render(<ProductionCard initial={getDefaultIncomePlanAssumptions()} onContinue={vi.fn()} />);
    expect(screen.getByLabelText('Placement rate')).toHaveValue(60);
    expect(screen.queryByLabelText('Issue rate after placement')).not.toBeInTheDocument();
    expect(screen.getByText(/organization-wide production analysis/i)).toBeVisible();
    production.unmount();

    render(<ConversionSummaryCard assumptions={assumptions} onContinue={vi.fn()} />);
    expect(screen.getByText(/\$1,190\.00 in commission per issued policy/i)).toBeVisible();
    expect(screen.getByText('$20,230.00')).toBeVisible();
    expect(screen.getByText('22')).toBeVisible();
    expect(screen.getByText('20')).toBeVisible();
    expect(screen.getByText('17')).toBeVisible();
  });

  it('renders a read-only review without edit controls', () => {
    render(<ReviewCard assumptions={getDefaultIncomePlanAssumptions()} onBuild={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
    expect(screen.getByText('Your conversion path is ready.')).toBeVisible();
  });

  it('calculates the conversion path and daily pace from accepted inputs', () => {
    const assumptions = getDefaultIncomePlanAssumptions();
    const results = calculateIncomePlanResults(assumptions);
    expect(results).toEqual(expect.objectContaining({ submitted_applications: 29, placed_applications: 23, issued_policies: 17, practical_daily_target: 2, submitted_ap: 28000 }));
    render(<ResultsCard results={results} assumptions={assumptions} onContinue={vi.fn()} />);
    expect(screen.getByText('Daily submitted applications')).toBeVisible();
    expect(screen.getByText('29 applications ÷ 20 working days')).toBeVisible();
    expect(screen.getByText('Daily target')).toBeVisible();
    expect(screen.getByText('Monthly target')).toBeVisible();
    expect(screen.getByText("This month's AP target")).toBeVisible();
    expect(screen.getByText('$1,400 average AP × 20 working days')).toBeVisible();
    expect(screen.getByText('$28,000')).toBeVisible();
    expect(screen.queryByText('Technology costs')).not.toBeInTheDocument();
    expect(screen.getByText(results.explanation)).toBeVisible();
  });

  it('rounds a fractional monthly AP target up to the next whole dollar', () => {
    const assumptions = { ...getDefaultIncomePlanAssumptions(), average_annual_premium: 1400.01 };
    expect(calculateIncomePlanResults(assumptions).submitted_ap).toBe(28001);
  });

  it('keeps the completed conversion plan visible with live AI feedback', () => {
    const assumptions = getDefaultIncomePlanAssumptions();
    const results = calculateIncomePlanResults(assumptions);
    render(<ResultsCard results={results} assumptions={assumptions} aiFeedback="Focus first on maintaining the daily application pace." />);
    expect(screen.getByText('Your conversion plan')).toBeVisible();
    expect(screen.getByText('AI feedback')).toBeVisible();
    expect(screen.getByText(/focus first on maintaining/i)).toBeVisible();
    expect(screen.queryByRole('button', { name: /review commitment/i })).not.toBeInTheDocument();
  });

  it('formats a longer Income Coach response into readable guidance', () => {
    const assumptions = getDefaultIncomePlanAssumptions();
    const results = calculateIncomePlanResults(assumptions);
    render(<ResultsCard
      results={results}
      assumptions={assumptions}
      aiFeedback={'Your plan at a glance:\n\n- Submit 2 applications each working day.\n- Protect the $4,254.88 acquisition budget.\n\nMost important action:\nMaintain the daily pace before increasing spend.'}
    />);
    expect(screen.getByText('Your plan at a glance')).toBeVisible();
    expect(screen.getByText('Submit 2 applications each working day.')).toBeVisible();
    expect(screen.getByText('Most important action')).toBeVisible();
    expect(screen.getByText(/maintain the daily pace/i)).toBeVisible();
  });

  it('offers an in-conversation restart and publish action without manager delivery', () => {
    const onRestart = vi.fn();
    const onPublish = vi.fn();
    render(<CommitmentCard onRestart={onRestart} onPublish={onPublish} />);
    fireEvent.click(screen.getByRole('button', { name: /restart plan/i }));
    fireEvent.click(screen.getByRole('button', { name: /publish my goal/i }));
    expect(onRestart).toHaveBeenCalledOnce();
    expect(onPublish).toHaveBeenCalledOnce();
    expect(screen.queryByRole('button', { name: /send to manager/i })).not.toBeInTheDocument();
  });

  it('publishes only after the explicit service action and renders the official scoreboard', async () => {
    const service = new MockIncomePlanService();
    const assumptions = getDefaultIncomePlanAssumptions();
    const scoreboard = await service.publish('test-agent', assumptions, MOCK_INCOME_PLAN_RESULTS);
    render(<MemoryRouter><IncomePlanScoreboardView scoreboard={scoreboard} /></MemoryRouter>);
    expect(screen.getByText('Official Income Game Plan')).toBeVisible();
    expect(screen.getByText('AI coaching')).toBeVisible();
    expect(await service.getScoreboard('test-agent')).toEqual(expect.objectContaining({ status: 'official' }));
  });
});
