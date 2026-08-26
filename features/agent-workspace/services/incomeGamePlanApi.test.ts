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
      daily_ap_target: 2800,
      daily_marketing_spend: 212,
      monthly_ap_target: 30415,
      ai_feedback: 'Saved coaching',
      formula_version: 2,
    }));
  });

  it('returns null when an agent has no published plan', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 404 }));
    await expect(publishedIncomePlanApi.get('agent-123')).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/income_calculator\/agent-123\?start_date=&end_date=$/),
      expect.any(Object),
    );
  });

  it('passes an explicit plan period to the income calculator', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 404 }));

    await publishedIncomePlanApi.get('agent/123', {
      start_date: '2026-09-01',
      end_date: '2026-09-30',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/income_calculator\/agent%2F123\?start_date=2026-09-01&end_date=2026-09-30$/),
      expect.any(Object),
    );
  });

  it('loads the agent Income Game Plan history', async () => {
    const history = { itemsReceived: 1, curPage: 1, nextPage: null, prevPage: null, offset: 0, perPage: 25, itemsTotal: 1, pageTotal: 1, items: [{ id: 'plan-1' }] };
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(history), { status: 200 }));

    await expect(publishedIncomePlanApi.getHistory('agent/123', 2)).resolves.toEqual(history);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/income_calculator\/agent%2F123\/history\?page=2$/),
      expect.any(Object),
    );
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

  it('accepts an agent-specific response that does not repeat the agent id', async () => {
    const assumptions = getDefaultIncomePlanAssumptions();
    const snapshot = createIncomePlanPublishedSnapshot('agent-123', assumptions, calculateIncomePlanResults(assumptions), 'Saved coaching');
    const { agent_id: _agentId, ...responsePlan } = snapshot;
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(responsePlan), { status: 200 }));

    await expect(publishedIncomePlanApi.get('agent-123')).resolves.toEqual(snapshot);
  });
});
