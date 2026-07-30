import { BASE_URL, ApiError } from '../../../services/api';

const CREATE_TICKET_URL = 'https://api1.simplyworkcrm.com/api:SZgR1JsR/ticket';

const getAuthToken = () => localStorage.getItem('authToken');

const authHeader = () => ({
  'Authorization': `Bearer ${getAuthToken()}`,
  'Content-Type': 'application/json',
});

const authOnlyHeader = () => ({
  'Authorization': `Bearer ${getAuthToken()}`,
});

export interface CreateTicketInput {
  subject: string;
  category: string;
  priority: string;
  description: string;
  screenshots: File[];
  urls: string[];
}

export const agentTicketsApi = {
  /**
   * Fetches tickets based on filter status
   */
  getTickets: async (filter: 'Attention Required' | 'Open' | 'Closed') => {
    let endpoint = '';
    if (filter === 'Attention Required') endpoint = '/tickets/important';
    else if (filter === 'Open') endpoint = '/tickets/open';
    else if (filter === 'Closed') endpoint = '/tickets/closed';

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: authHeader(),
    });

    if (!response.ok) throw new ApiError('Failed to fetch tickets', response.status);
    return response.json();
  },

  /**
   * Fetches details for a specific ticket
   */
  getTicketDetails: async (ticketId: string) => {
    const response = await fetch(`${BASE_URL}/tickets/${ticketId}/details`, {
        method: 'GET',
        headers: authHeader(),
    });

    if (!response.ok) throw new ApiError('Failed to fetch ticket details', response.status);
    return response.json();
  },

  /**
   * Creates a new support ticket
   */
  createTicket: async (ticketData: CreateTicketInput) => {
    const formData = new FormData();
    formData.append('subject', ticketData.subject);
    formData.append('category', ticketData.category);
    formData.append('priority', ticketData.priority);
    formData.append('description', ticketData.description);
    ticketData.urls.forEach(url => formData.append('urls[]', url));
    ticketData.screenshots.forEach(file => formData.append('screenshots[]', file, file.name));

    const response = await fetch(CREATE_TICKET_URL, {
      method: 'POST',
      headers: authOnlyHeader(),
      body: formData,
    });

    if (!response.ok) throw new ApiError('Failed to create ticket', response.status);
    return response.json();
  },

  /**
   * Adds a comment to a ticket
   */
  addComment: async (ticketId: string, message: string) => {
    const response = await fetch(`${BASE_URL}/tickets/${ticketId}/comments`, {
        method: 'POST',
        headers: authHeader(),
        body: JSON.stringify({ message }),
    });

    if (!response.ok) throw new ApiError('Failed to send comment', response.status);
    return response.json();
  }
};
