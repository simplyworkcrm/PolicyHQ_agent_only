import { describe, expect, it } from 'vitest';
import { buildLeadServiceFilter, emptyLeadServiceFilters } from './leadServiceFilters';

describe('lead service filters', () => {
  it('clears to an unfiltered request', () => {
    expect(buildLeadServiceFilter(emptyLeadServiceFilters())).toEqual({});
  });
  it('uses partial lead type matching and OR within dropdowns, AND between fields', () => {
    const result = buildLeadServiceFilter({
      ...emptyLeadServiceFilters(), reference: 'LS-2', leadType: ' MP ',
      requester: ['user-id'], requestedFor: ['agent-id'],
      delivery: ['mailer_csv', 'csv_only'], status: ['completed - incomplete'],
    }) as any;
    const fields = result.expression[0].group.expression;
    expect(fields.map((field: any) => field.or)).toEqual([false, false, false, false, false, false]);
    expect(fields[0].statement.right.operand).toBe('2');
    expect(fields[1].statement.left.operand).toBe('createdBy_ghl_user_id');
    expect(fields[2].statement.left.operand).toBe('createdFor_agent_id');
    expect(fields[3].statement).toEqual({ left: { tag: 'col', operand: 'lead_type' }, op: 'ilike', right: { operand: '%MP%' } });
    expect(fields[4].group.expression.map((field: any) => [field.or, field.statement.right.operand])).toEqual([[false, 'mailer_csv'], [true, 'csv_only']]);
    expect(fields[5].statement.right.operand).toBe('completed - incomplete');
  });
  it('maps dashboard status labels to backend statuses', () => {
    expect(emptyLeadServiceFilters('complete').status).toEqual(['completed']);
    expect(emptyLeadServiceFilters('completed-incomplete').status).toEqual(['completed - incomplete']);
  });
});
