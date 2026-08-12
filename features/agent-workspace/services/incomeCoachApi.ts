import { ApiError } from '../../../services/api';

const INCOME_COACH_API_BASE = import.meta.env.DEV
  ? '/xano-api/api:SZgR1JsR'
  : 'https://api1.simplyworkcrm.com/api:SZgR1JsR';

const INCOME_COACH_URL = `${INCOME_COACH_API_BASE}/ai/income_coach`;

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('authToken') || ''}`,
  'Content-Type': 'application/json',
});

const extractText = (payload: unknown): string => {
  if (typeof payload === 'string') return payload.trim();
  if (!payload || typeof payload !== 'object') return '';

  // Xano currently returns the generated answer as a one-item JSON array.
  // Keep array handling general so content-part arrays from AI providers also work.
  if (Array.isArray(payload)) {
    return payload.map(extractText).filter(Boolean).join('\n\n').trim();
  }

  const record = payload as Record<string, unknown>;
  for (const key of ['response', 'result', 'output_text', 'text', 'content', 'answer', 'output', 'data']) {
    const text = extractText(record[key]);
    if (text) return text;
  }

  const message = extractText(record.message);
  if (message) return message;

  return '';
};

export const incomeCoachApi = {
  async getFeedback(result: string): Promise<string> {
    const response = await fetch(INCOME_COACH_URL, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ result }),
    });

    const raw = await response.text();
    let payload: unknown = raw;
    try {
      payload = JSON.parse(raw);
    } catch {
      // The Income Coach may return its answer as plain text.
    }

    if (!response.ok) {
      throw new ApiError(extractText(payload) || 'Unable to load Income Coach feedback.', response.status);
    }

    const feedback = extractText(payload);
    if (!feedback) throw new ApiError('Income Coach returned an empty response.', response.status);
    return feedback;
  },
};
