import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { MessageSquare, User, Trash2, X, Clock, CheckCheck, Inbox, Search } from 'lucide-react';
import { useRealtime } from '../../context/RealtimeContext';

type ReadFilter = 'all' | 'unread';

const isRealtimeStatusNotification = (content: string) => {
  try {
    const parsed = JSON.parse(content);
    return parsed?.status === 'connected' || parsed?.status === 'disconnected';
  } catch {
    return false;
  }
};

export const NotificationDirect: React.FC = () => {
  const { notifications, setNotifications, markAsRead, markAllAsRead } = useRealtime();
  const [isOpen, setIsOpen] = useState(false);
  const [readFilter, setReadFilter] = useState<ReadFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const type = 'direct';

  const handleToggle = () => {
      setIsOpen(!isOpen);
      if (!isOpen) {
          setSearchQuery('');
      }
  };

  const handleClose = () => setIsOpen(false);

  const handleClear = () => {
      setNotifications(prev => prev.filter(n => n.type !== type));
  };

  const unreadCount = useMemo(() => 
    notifications.filter(n => n.type === type && !n.isRead && !isRealtimeStatusNotification(n.content)).length, 
    [notifications]
  );

  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
        const matchesType = n.type === type;
        const matchesRead = readFilter === 'all' || !n.isRead;
        const matchesSearch = n.content.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesType && matchesRead && matchesSearch && !isRealtimeStatusNotification(n.content);
    });
  }, [notifications, readFilter, searchQuery]);

  return (
    <>
      <button 
        onClick={handleToggle}
        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-sm border relative group z-50
            ${isOpen ? 'bg-slate-900 text-white border-slate-900' : 'bg-white hover:bg-slate-50 text-slate-400 hover:text-slate-900 border-slate-200/50'}
        `}
        title="Direct Messages"
      >
        <MessageSquare className={`w-5 h-5 ${unreadCount > 0 ? 'animate-swing' : ''}`} />
        {unreadCount > 0 && (
            <div className="absolute top-3 right-3 w-4 h-4 bg-red-500 rounded-full border-2 border-white flex items-center justify-center">
                <span className="text-[8px] font-black text-white">{unreadCount}</span>
            </div>
        )}
      </button>

      {isOpen && createPortal(
          <div className="fixed inset-0 z-[9999] flex justify-end items-stretch font-sans p-4 sm:p-6">
              <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity animate-in fade-in duration-300" onClick={handleClose} />
              
              <div className="relative w-full max-w-sm bg-[#F8F9FC] shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col border border-slate-100 rounded-[2.5rem] overflow-hidden ring-1 ring-slate-900/5">
                  <div className="px-6 py-5 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-3">
                          <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
                             <User className="w-5 h-5" />
                          </div>
                          <h3 className="font-black text-slate-900 text-lg tracking-tight">Direct Inbox</h3>
                      </div>
                      <div className="flex items-center gap-2">
                          {notifications.some(n => n.type === type && !n.isRead) && (
                              <button onClick={() => markAllAsRead(type)} className="p-2 hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 rounded-xl transition-colors" title="Mark all as read">
                                  <CheckCheck className="w-4 h-4" />
                              </button>
                          )}
                          <button onClick={handleClear} className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl transition-colors" title="Clear inbox">
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
                                    <button onClick={() => setReadFilter('all')} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${readFilter === 'all' ? 'bg-white text-slate-900 shadow-sm border border-slate-100' : 'text-slate-400'}`}>All</button>
                                    <button onClick={() => setReadFilter('unread')} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${readFilter === 'unread' ? 'bg-white text-slate-900 shadow-sm border border-slate-100' : 'text-slate-400'}`}>Unread</button>
                              </div>
                          </div>
                          <div className="relative">
                              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search messages..." className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2.5 pl-10 pr-9 text-[11px] font-bold text-slate-700 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-brand-500/10 focus:border-brand-200 transition-all shadow-inner" />
                              {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors"><X className="w-3 h-3" /></button>}
                          </div>
                      </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-slate-200">
                      {filteredNotifications.length > 0 ? (
                          filteredNotifications.map((notif) => (
                              <div key={notif.id} onClick={() => !notif.isRead && markAsRead(notif.id)} className={`group relative bg-white p-4 rounded-[1.5rem] border transition-all duration-300 overflow-hidden cursor-pointer ${notif.isRead ? 'border-slate-100 opacity-70 grayscale-[0.3]' : 'border-brand-100 shadow-lg shadow-brand-500/5 ring-1 ring-brand-50/50'}`}>
                                  <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                                  <div className="flex gap-4">
                                      <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 bg-emerald-100 text-emerald-600"><User className="w-5 h-5" /></div>
                                      <div className="flex-1 min-w-0">
                                          <div className="flex justify-between items-start mb-1.5">
                                              <div className="flex items-center gap-2">
                                                  <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg border bg-emerald-50 text-emerald-700 border-emerald-100">Direct</span>
                                                  {!notif.isRead && <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>}
                                              </div>
                                              <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3" />{notif.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                          </div>
                                          <p className={`text-xs leading-relaxed break-words ${notif.isRead ? 'text-slate-500 font-medium' : 'text-slate-800 font-bold'}`}>{notif.content}</p>
                                      </div>
                                  </div>
                              </div>
                          ))
                      ) : (
                          <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4 opacity-60">
                              <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center"><Inbox className="w-7 h-7 text-slate-200" /></div>
                              <p className="text-xs font-bold uppercase tracking-wider">{searchQuery ? `No results for "${searchQuery}"` : 'No messages'}</p>
                          </div>
                      )}
                  </div>
              </div>
          </div>,
          document.body
      )}
    </>
  );
};
