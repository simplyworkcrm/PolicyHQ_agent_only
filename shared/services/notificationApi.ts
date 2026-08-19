const NOTIFICATION_URL = 'https://api1.simplyworkcrm.com/api:SZgR1JsR/notification';
const NOTIFICATION_COUNT_URL = 'https://api1.simplyworkcrm.com/api:SZgR1JsR/notification/count';
const MARK_READ_URL = 'https://api1.simplyworkcrm.com/api:SZgR1JsR/notification/mark_read';

export interface StoredNotification {
  id: string;
  created_at: number;
  notification_id: string;
  is_read: boolean;
  receiver_ghl_user_id: string;
  data?: NotificationData | string | { data?: NotificationData | string } | null;
  // Some older persisted rows were returned with the event fields at the top
  // level instead of inside `data`. Keep these optional fields while those
  // records still exist.
  title?: string;
  description?: string;
  event_type?: string;
  made_by?: NotificationData['made_by'];
  action?: NotificationData['action'];
}

export interface NotificationData {
    id: string;
    created_at: number;
    title?: string;
    description?: string;
    event_type?: string;
    made_by?: string | { first_name?: string; last_name?: string; name?: { first_name?: string; last_name?: string } };
    action?: {
      route?: string;
      entity_type?: string;
      entity_id?: string;
      tab?: string;
    };
}

export interface NotificationPage {
  itemsReceived: number;
  curPage: number;
  nextPage: number | null;
  prevPage: number | null;
  offset: number;
  itemsTotal: number;
  pageTotal: number;
  items: StoredNotification[];
}

const headers = () => ({
  Authorization: `Bearer ${localStorage.getItem('authToken') || ''}`,
  'Content-Type': 'application/json',
});

const readStateFilter = (isRead: boolean) => ({
  expression: [{
    or: false,
    type: 'statement',
    statement: {
      left: { tag: 'col', operand: 'is_read' },
      op: '==',
      right: { operand: isRead },
    },
  }],
});

export const notificationApi = {
  count: async (): Promise<number> => {
    const response = await fetch(NOTIFICATION_COUNT_URL, {
      method: 'GET',
      headers: headers(),
    });
    if (!response.ok) throw new Error(`Unable to load notification count (${response.status})`);
    const count = Number((await response.text()).trim());
    if (!Number.isFinite(count) || count < 0) throw new Error('The notification count response was invalid.');
    return Math.floor(count);
  },

  list: async (page: number, perPage: number, isRead: boolean): Promise<NotificationPage> => {
    const response = await fetch(NOTIFICATION_URL, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        page,
        per_page: perPage,
        filter: readStateFilter(isRead),
      }),
    });
    if (!response.ok) throw new Error(`Unable to load notifications (${response.status})`);
    return response.json() as Promise<NotificationPage>;
  },

  markRead: async (notificationId: string): Promise<void> => {
    const response = await fetch(MARK_READ_URL, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ notification_id: notificationId }),
    });
    if (!response.ok) throw new Error(`Unable to mark notification as read (${response.status})`);
  },
};
