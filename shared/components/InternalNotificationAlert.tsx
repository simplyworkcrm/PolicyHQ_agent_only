import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Clock, ExternalLink, Megaphone, Ticket, X } from 'lucide-react';
import { useRealtime } from '../../context/RealtimeContext';

export const InternalNotificationAlert: React.FC = () => {
  const navigate = useNavigate();
  const { latestInternalNotification, setLatestInternalNotification, markAsRead } = useRealtime();
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!latestInternalNotification) return;

    setMounted(true);
    const frame = requestAnimationFrame(() => setVisible(true));
    const timer = window.setTimeout(() => setVisible(false), 8000);
    const cleanup = window.setTimeout(() => {
      setMounted(false);
      setLatestInternalNotification(null);
    }, 8500);

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      window.clearTimeout(cleanup);
    };
  }, [latestInternalNotification, setLatestInternalNotification]);

  if (!latestInternalNotification && !mounted) return null;

  const notification = latestInternalNotification;
  if (!notification) return null;
  const isTicket = notification.action?.entityType?.toLowerCase() === 'ticket';
  const EntityIcon = isTicket ? Ticket : Megaphone;

  const close = (event?: React.MouseEvent) => {
    event?.stopPropagation();
    setVisible(false);
    window.setTimeout(() => {
      setMounted(false);
      setLatestInternalNotification(null);
    }, 500);
  };

  const openNotification = () => {
    if (!notification.isRead) markAsRead(notification.id);
    if (!notification.action?.route) return;

    const params = new URLSearchParams();
    if (notification.action.entityType && notification.action.entityId) {
      params.set(`${notification.action.entityType}_id`, notification.action.entityId);
    }
    if (notification.action.tab) params.set('tab', notification.action.tab);
    navigate(`${notification.action.route}${params.size ? `?${params.toString()}` : ''}`);
    close();
  };

  return (
    <div
      className={`fixed right-4 top-4 z-[10000] w-[calc(100vw-2rem)] max-w-sm transition-all duration-500 ease-out sm:right-7 sm:top-7 ${
        visible ? 'translate-x-0 opacity-100' : 'translate-x-[120%] opacity-0'
      }`}
      role="status"
      aria-live="polite"
    >
      <div
        onClick={openNotification}
        className={`group relative overflow-hidden rounded-[1.75rem] border bg-white p-4 shadow-2xl ring-1 transition-all ${
          notification.action?.route ? 'cursor-pointer hover:-translate-y-0.5' : ''
        } ${isTicket ? 'border-emerald-100 shadow-emerald-950/15 ring-emerald-50' : 'border-blue-100 shadow-blue-950/15 ring-blue-50'}`}
      >
        <button
          type="button"
          onClick={close}
          className="absolute right-3 top-3 z-10 rounded-full p-1.5 text-slate-300 transition hover:bg-slate-100 hover:text-slate-600"
          aria-label="Dismiss notification"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3 pr-8">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${isTicket ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
            <EntityIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="truncate text-base font-black text-slate-900">{notification.title || (isTicket ? 'Ticket notification' : 'New notification')}</p>
            {notification.madeBy && <p className="mt-0.5 truncate text-[11px] font-normal text-slate-400">By {notification.madeBy}</p>}
          </div>
          <span className={`mt-2 h-2 w-2 shrink-0 animate-pulse rounded-full ${isTicket ? 'bg-emerald-500' : 'bg-blue-500'}`} />
        </div>

        <div className="mt-3 space-y-2 pl-1">
          <div className="flex items-start gap-2 text-[11px] font-semibold leading-relaxed text-slate-500">
            <Ticket className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
            <p className="line-clamp-3 whitespace-pre-line break-words">{notification.description || notification.content}</p>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-normal text-slate-400">
            <Clock className="h-3.5 w-3.5" />
            <span>{notification.timestamp.toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}</span>
          </div>
        </div>

        {notification.action?.route && (
          <div className="mt-4 flex items-center gap-2">
            <div className={`flex h-11 flex-1 items-center overflow-hidden rounded-full font-black text-white shadow-sm transition group-hover:shadow-md ${isTicket ? 'bg-emerald-500' : 'bg-blue-600'}`}>
              <span className={`flex h-11 w-11 items-center justify-center rounded-full ring-1 ring-white/25 ${isTicket ? 'bg-emerald-400' : 'bg-blue-500'}`}>
                <ArrowRight className="h-4 w-4" />
              </span>
              <span className="flex-1 pr-4 text-center text-xs">{isTicket ? 'Open ticket' : 'Open notification'}</span>
            </div>
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400 transition group-hover:bg-slate-200 group-hover:text-slate-600">
              <ExternalLink className="h-4 w-4" />
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
