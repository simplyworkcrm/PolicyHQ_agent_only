import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Bell, Trash2, X, Clock, Check, CheckCheck, Search, Megaphone, Ticket, Loader2, AlertCircle } from 'lucide-react';
import { Notification, useRealtime } from '../../context/RealtimeContext';
import { notificationApi, NotificationData, StoredNotification } from '../services/notificationApi';

type ReadFilter = 'unread' | 'read';

const isRealtimeStatusNotification = (content: string) => {
  try {
    const parsed = JSON.parse(content);
    return parsed?.status === 'connected' || parsed?.status === 'disconnected';
  } catch {
    return false;
  }
};

const parseStoredValue = (value: unknown): unknown => {
  let parsed = value;
  for (let attempt = 0; attempt < 3 && typeof parsed === 'string'; attempt += 1) {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return {};
    }
  }
  return parsed;
};

const hasNotificationFields = (value: Record<string, unknown>) => Boolean(
  value.title || value.description || value.event_type || value.action || value.made_by,
);

const decodeStoredData = (stored: StoredNotification): Partial<NotificationData> => {
  let candidate = parseStoredValue(stored.data);

  // Xano has returned both the event object itself and the realtime envelope
  // `{ data: event }` for previously persisted notifications.
  for (let depth = 0; depth < 3; depth += 1) {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) break;
    const record = candidate as Record<string, unknown>;
    if (hasNotificationFields(record)) return record as Partial<NotificationData>;
    if (!('data' in record)) break;
    candidate = parseStoredValue(record.data);
  }

  // Legacy rows may expose the event fields on the notification record.
  const topLevel = stored as unknown as Record<string, unknown>;
  if (hasNotificationFields(topLevel)) return topLevel as Partial<NotificationData>;

  return candidate && typeof candidate === 'object' && !Array.isArray(candidate)
    ? candidate as Partial<NotificationData>
    : {};
};

export const NotificationBell: React.FC = () => {
  const navigate = useNavigate();
  const { notifications, setNotifications, markAsRead } = useRealtime();
  const [isOpen, setIsOpen] = useState(false);
  const [readFilter, setReadFilter] = useState<ReadFilter>('unread');
  const [searchQuery, setSearchQuery] = useState('');
  const [nextPage, setNextPage] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const requestVersion = useRef(0);
  const countRequestVersion = useRef(0);

  const type = 'broadcast';

  const refreshUnreadCount = useCallback(async () => {
    const version = ++countRequestVersion.current;
    try {
      const count = await notificationApi.count();
      if (version === countRequestVersion.current) setUnreadCount(count);
    } catch {
      // Keep the last confirmed count when the count endpoint is unavailable.
    }
  }, []);

  const handleToggle = () => {
      setIsOpen(!isOpen);
      if (!isOpen) {
          setSearchQuery('');
          void refreshUnreadCount();
      }
  };

  const handleClose = () => setIsOpen(false);

  const handleClear = () => {
      setNotifications(prev => prev.filter(n => n.type !== type));
  };

  const mapStoredNotification = useCallback((stored: StoredNotification): Notification => {
    const data = decodeStoredData(stored);
    const rawMadeBy = data.made_by;
    const madeBy = typeof rawMadeBy === 'string'
      ? rawMadeBy.trim()
      : [
          rawMadeBy?.first_name ?? rawMadeBy?.name?.first_name,
          rawMadeBy?.last_name ?? rawMadeBy?.name?.last_name,
        ].filter(Boolean).join(' ').trim();
    const description = String(data.description || '')
      .replace(/\s*(Category\s*:|Subject\s*:)/gi, '\n$1')
      .trim();

    return {
      id: stored.id,
      serverId: stored.id,
      notificationId: stored.notification_id || data.id,
      content: description || data.title || 'Notification',
      title: data.title || undefined,
      description: description || undefined,
      madeBy: madeBy || undefined,
      eventType: data.event_type || undefined,
      action: data.action?.route ? {
        route: data.action.route,
        entityType: data.action.entity_type,
        entityId: data.action.entity_id,
        tab: data.action.tab,
      } : undefined,
      timestamp: new Date(Number(data.created_at || stored.created_at || Date.now())),
      type: 'broadcast',
      isRead: Boolean(stored.is_read),
    };
  }, []);

  const loadNotificationPage = useCallback(async (page: number, replace: boolean) => {
    if (isLoading && !replace) return;
    const version = replace ? ++requestVersion.current : requestVersion.current;
    setIsLoading(true);
    setLoadError('');
    try {
      const result = await notificationApi.list(page, 25, readFilter === 'read');
      if (version !== requestVersion.current) return;
      const incoming = result.items.map(mapStoredNotification);
      setNotifications(previous => {
        const otherTypes = previous.filter(notification => notification.type !== type);
        const current = replace ? [] : previous.filter(notification => notification.type === type);
        const unique = new Map<string, Notification>();
        [...current, ...incoming].forEach(notification => {
          const key = notification.serverId || notification.notificationId || String(notification.id);
          unique.set(key, notification);
        });
        return [...otherTypes, ...unique.values()];
      });
      setNextPage(result.nextPage);
    } catch (error) {
      if (version === requestVersion.current) {
        setLoadError(error instanceof Error ? error.message : 'Unable to load notifications.');
      }
    } finally {
      if (version === requestVersion.current) setIsLoading(false);
    }
  }, [isLoading, mapStoredNotification, readFilter, setNotifications]);

  useEffect(() => {
    if (!isOpen) return;
    setNextPage(null);
    void loadNotificationPage(1, true);
  // A new request version is created by loadNotificationPage when either value changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, readFilter]);

  useEffect(() => {
    void refreshUnreadCount();
  }, [notifications, refreshUnreadCount]);

  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
        const matchesType = n.type === type;
        const matchesRead = readFilter === 'read' ? n.isRead : !n.isRead;
        const searchableText = `${n.title || ''} ${n.description || ''} ${n.madeBy || ''} ${n.content}`.toLowerCase();
        const matchesSearch = searchableText.includes(searchQuery.toLowerCase());
        return matchesType && matchesRead && matchesSearch && !isRealtimeStatusNotification(n.content);
    });
  }, [notifications, readFilter, searchQuery]);

  const markNotificationRead = async (notification: Notification) => {
      if (notification.isRead) return;
      if (notification.serverId) await notificationApi.markRead(notification.serverId);
      markAsRead(notification.id);
      if (readFilter === 'unread') {
        setNotifications(previous => previous.filter(item => item.id !== notification.id));
      }
  };

  const handleMarkAllRead = async () => {
    const unread = notifications.filter(notification => notification.type === type && !notification.isRead);
    const unreadIds = new Set(unread.map(notification => notification.id));
    await Promise.allSettled(unread.map(notification => notification.serverId
      ? notificationApi.markRead(notification.serverId)
      : Promise.resolve()));
    unread.forEach(notification => markAsRead(notification.id));
    if (readFilter === 'unread') {
      setNotifications(previous => previous.filter(notification => !unreadIds.has(notification.id)));
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
      try {
        await markNotificationRead(notification);
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
      if (!notification.action?.route) return;

      const params = new URLSearchParams();
      if (notification.action.entityType && notification.action.entityId) {
          params.set(`${notification.action.entityType}_id`, notification.action.entityId);
      }
      if (notification.action.tab) params.set('tab', notification.action.tab);
      // A notification can target the ticket that is already open. Give every
      // click a unique load key so the destination refreshes the full entity.
      params.set('load', String(Date.now()));
      setIsOpen(false);
      navigate(`${notification.action.route}${params.size ? `?${params.toString()}` : ''}`);
  };

  const handleListScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    const isNearBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 180;
    if (isNearBottom && nextPage !== null && !isLoading) {
      void loadNotificationPage(nextPage, false);
    }
  };

  return (
    <>
      <button 
        onClick={handleToggle}
        className={`relative z-50 flex h-10 w-10 items-center justify-center rounded-full border border-transparent shadow-sm transition-all hover:-translate-y-px hover:shadow-md
            ${isOpen ? 'bg-slate-900 text-white' : 'bg-white text-slate-400 hover:text-slate-700'}
        `}
        title="Internal notification"
        aria-label={unreadCount > 0 ? `Internal notification, ${unreadCount} unread` : 'Internal notification'}
      >
        <Bell className="h-4 w-4" strokeWidth={2} />
        {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-500 px-1 text-[9px] font-black leading-none text-white ring-2 ring-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
        )}
      </button>

      {isOpen && createPortal(
          <div className="fixed inset-0 z-[9999] flex justify-end items-stretch font-sans p-4 sm:p-6">
              <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity animate-in fade-in duration-300" onClick={handleClose} />
              
              <div className="relative w-full max-w-sm bg-[#F8F9FC] shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col border border-slate-100 rounded-[2.5rem] overflow-hidden ring-1 ring-slate-900/5">
                  <div className="px-6 py-5 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
                             <Megaphone className="w-5 h-5" />
                          </div>
                          <h3 className="font-black text-slate-900 text-lg tracking-tight">Internal notification</h3>
                      </div>
                      <div className="flex items-center gap-2">
                          {notifications.some(n => n.type === type && !n.isRead) && (
                              <button onClick={() => void handleMarkAllRead()} className="p-2 hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 rounded-xl transition-colors" title="Mark loaded notifications as read">
                                  <CheckCheck className="w-4 h-4" />
                              </button>
                          )}
                          <button onClick={handleClear} className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl transition-colors" title="Clear internal notifications">
                              <Trash2 className="w-4 h-4" />
                          </button>
                          <button onClick={handleClose} className="p-2 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-xl transition-colors">
                              <X className="w-5 h-5" />
                          </button>
                      </div>
                  </div>

                  <div className="px-6 py-4 bg-white border-b border-slate-50 shadow-sm shrink-0 z-10 space-y-4">
                      <div className="space-y-3">
                          <div className="flex justify-center">
                              <div className="flex p-1 bg-slate-50 rounded-xl border border-slate-100">
                                    <button onClick={() => setReadFilter('unread')} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${readFilter === 'unread' ? 'bg-white text-slate-900 shadow-sm border border-slate-100' : 'text-slate-400'}`}>Unread</button>
                                    <button onClick={() => setReadFilter('read')} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${readFilter === 'read' ? 'bg-white text-slate-900 shadow-sm border border-slate-100' : 'text-slate-400'}`}>Read</button>
                              </div>
                          </div>
                          <div className="relative">
                              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search internal notifications..." className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2.5 pl-10 pr-9 text-[11px] font-bold text-slate-700 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-brand-500/10 focus:border-brand-200 transition-all shadow-inner" />
                              {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors"><X className="w-3 h-3" /></button>}
                          </div>
                      </div>
                  </div>

                  <div onScroll={handleListScroll} className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-slate-200">
                      {filteredNotifications.length > 0 ? (
                          filteredNotifications.map((notif) => {
                            const isTicket = notif.action?.entityType?.toLowerCase() === 'ticket';
                            const isTicketUpdated = isTicket && notif.eventType?.toLowerCase() === 'ticket.updated';
                            const EntityIcon = isTicket ? Ticket : Megaphone;
                            return (
                              <div key={notif.id} className={`group relative overflow-hidden rounded-[1.75rem] border bg-white p-4 transition-all duration-300 ${notif.isRead ? 'border-slate-100 opacity-70' : isTicketUpdated ? 'border-orange-200 shadow-lg shadow-orange-500/10 ring-1 ring-orange-100' : isTicket ? 'border-emerald-100 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-50' : 'border-brand-100 shadow-lg shadow-brand-500/5 ring-1 ring-brand-50/50'}`}>
                                  <div className="flex items-start gap-3">
                                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${isTicketUpdated ? 'bg-orange-50 text-orange-600' : isTicket ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}><EntityIcon className="h-5 w-5" /></div>
                                      <div className="min-w-0 flex-1 pt-0.5">
                                          <div className="flex items-start justify-between gap-2">
                                              <div className="min-w-0">
                                                  {notif.title && <p className="truncate text-sm font-black text-slate-900">{notif.title}</p>}
                                                  {notif.madeBy && <p className="mt-0.5 truncate text-[10px] font-normal text-slate-400">By {notif.madeBy}</p>}
                                              </div>
                                              {!notif.isRead && <span className={`mt-1 h-2 w-2 shrink-0 rounded-full animate-pulse ${isTicketUpdated ? 'bg-orange-500' : isTicket ? 'bg-emerald-500' : 'bg-blue-500'}`}></span>}
                                          </div>
                                      </div>
                                  </div>

                                  <div className="mt-3 space-y-2 pl-1">
                                      <div className="flex items-start gap-2 text-[11px] font-semibold leading-relaxed text-slate-500">
                                          <Ticket className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                                          <p className="whitespace-pre-line break-words">{notif.description || notif.content}</p>
                                      </div>
                                      <div className="flex items-center gap-2 text-[10px] font-normal text-slate-400">
                                          <Clock className="h-3.5 w-3.5" />
                                          <span>{notif.timestamp.toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}</span>
                                      </div>
                                  </div>

                                  {notif.action?.route && <div className="mt-4 flex items-center gap-2">
                                      <button type="button" onClick={() => void handleNotificationClick(notif)} className={`flex h-11 flex-1 items-center overflow-hidden rounded-full font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${isTicketUpdated ? 'bg-orange-500' : isTicket ? 'bg-emerald-500' : 'bg-blue-600'}`}>
                                          <span className={`flex h-11 w-11 items-center justify-center rounded-full ring-1 ring-white/25 ${isTicketUpdated ? 'bg-orange-400' : isTicket ? 'bg-emerald-400' : 'bg-blue-500'}`}><ArrowRight className="h-4 w-4" /></span>
                                          <span className="flex-1 pr-4 text-center text-xs">{isTicket ? 'Open ticket' : 'Open notification'}</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => void markNotificationRead(notif).catch(error => console.error('Failed to mark notification as read:', error))}
                                        disabled={notif.isRead}
                                        aria-label={notif.isRead ? 'Notification is read' : 'Mark notification as read'}
                                        title={notif.isRead ? 'Read' : 'Mark as read'}
                                        className={`flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400 transition disabled:cursor-default ${isTicketUpdated ? 'hover:bg-orange-50 hover:text-orange-600 disabled:text-orange-500' : 'hover:bg-emerald-50 hover:text-emerald-600 disabled:text-emerald-500'}`}
                                      ><Check className="h-4 w-4" /></button>
                                  </div>}
                              </div>
                            );
                          })
                      ) : (
                          <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4 opacity-60">
                              <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center"><Megaphone className="w-7 h-7 text-slate-200" /></div>
                              <p className="text-xs font-bold uppercase tracking-wider">{searchQuery ? `No results for "${searchQuery}"` : 'No internal notifications'}</p>
                          </div>
                      )}
                      {loadError && (
                        <button type="button" onClick={() => void loadNotificationPage(nextPage || 1, nextPage === null)} className="mx-auto flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50">
                          <AlertCircle className="h-4 w-4" /> {loadError} Try again
                        </button>
                      )}
                      {isLoading && <div className="flex justify-center py-4 text-slate-400"><Loader2 className="h-5 w-5 animate-spin" /></div>}
                      {!isLoading && !loadError && nextPage === null && filteredNotifications.length > 0 && (
                        <p className="py-2 text-center text-[10px] font-semibold text-slate-400">You’re all caught up.</p>
                      )}
                  </div>
              </div>
          </div>,
          document.body
      )}
    </>
  );
};
