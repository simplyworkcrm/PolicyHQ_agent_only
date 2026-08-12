import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  calculateIncomePlanResults,
  createIncomePlanPublishedSnapshot,
  getDefaultIncomePlanAssumptions,
  publishedIncomePlanApi,
} from './incomeGamePlanApi';

describe('published Income Game Plan API', () => {
  afterEach(() => vi.restoreAllMocks());

  it('builds the complete locked-plan snapshot', () => {
    const assumptions = getDefaultIncomePlanAssumptions();
    const results = calculateIncomePlanResults(assumptions);
    const snapshot = createIncomePlanPublishedSnapshot('agent-123', assumptions, results, 'Saved coaching');

    expect(snapshot).toEqual(expect.objectContaining({
      agent_id: 'agent-123',
      desired_income_goal: 20000,
      submitted_applications: 29,
      placed_applications: 23,
      issued_policies: 17,
      commission_per_issued_policy: 1190,
      estimated_deposit: 20230,
      exact_daily_application_pace: 1.45,
      daily_submitted_applications: 2,
      estimated_acquisition_budget: 4254.88,
      daily_ap_target: 1400,
      daily_marketing_spend: 212,
      monthly_ap_target: 28000,
      ai_feedback: 'Saved coaching',
      formula_version: 1,
    }));
  });

  it('returns null when an agent has no published plan', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 404 }));
    await expect(publishedIncomePlanApi.get('agent-123')).resolves.toBeNull();
  });

  it('reads a wrapped published plan and posts the same snapshot shape', async () => {
    const assumptions = getDefaultIncomePlanAssumptions();
    const snapshot = createIncomePlanPublishedSnapshot('agent-123', assumptions, calculateIncomePlanResults(assumptions), 'Saved coaching');
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: snapshot }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(snapshot), { status: 200 }));

    await expect(publishedIncomePlanApi.get('agent-123')).resolves.toEqual(snapshot);
    await expect(publishedIncomePlanApi.publish(snapshot)).resolves.toEqual(snapshot);
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual(snapshot);
  });
});
