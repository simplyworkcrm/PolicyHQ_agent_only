export interface LeadServiceFilters {
  reference: string;
  requester: string[];
  requestedFor: string[];
  leadType: string;
  delivery: string[];
  status: string[];
}

export const apiLeadStatus = (status: string) => status === 'complete' ? 'completed' : status === 'completed-incomplete' ? 'completed - incomplete' : status;

export const emptyLeadServiceFilters = (status = ''): LeadServiceFilters => ({
  reference: '', requester: [], requestedFor: [], leadType: '', delivery: [], status: status ? [apiLeadStatus(status)] : [],
});

export const buildLeadServiceFilter = (filter: LeadServiceFilters): Record<string, unknown> => {
  const reference = filter.reference.trim().replace(/^#/, '').replace(/^LS-/i, '').trim();
  const groups = [
    { field: 'reference_number', values: reference ? [reference] : [], op: '==' },
    { field: 'createdBy_ghl_user_id', values: filter.requester, op: '==' },
    { field: 'createdFor_agent_id', values: filter.requestedFor, op: '==' },
    { field: 'lead_type', values: filter.leadType.trim() ? [`%${filter.leadType.trim()}%`] : [], op: 'ilike' },
    { field: 'delivery_option', values: filter.delivery, op: '==' },
    { field: 'status', values: filter.status, op: '==' },
  ].filter(group => group.values.length);
  const expression = groups.map(group => {
    const statements = group.values.map((value, index) => ({
      or: index > 0, type: 'statement',
      statement: { left: { tag: 'col', operand: group.field }, op: group.op, right: { operand: value } },
    }));
    return statements.length === 1 ? statements[0] : { or: false, type: 'group', group: { expression: statements } };
  });
  return expression.length ? { expression: [{ or: false, type: 'group', group: { expression } }] } : {};
};
