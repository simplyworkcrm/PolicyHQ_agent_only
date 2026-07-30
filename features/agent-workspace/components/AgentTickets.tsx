import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Filter, 
  MessageSquare, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  MoreHorizontal, 
  Send, 
  Paperclip, 
  ChevronLeft, 
  FileText, 
  User,
  Ticket,
  Calendar,
  Tag,
  X,
  Loader2,
  ChevronDown,
  Check
} from 'lucide-react';
import { useAgentContext } from '../context/AgentContext';
import { agentTicketsApi, CreateTicketInput } from '../services/agentTicketsApi';
import { useAuth } from '../../../context/AuthContext';

// --- MOCK DATA ---
interface Comment {
  id: string;
  author: string;
  role: 'Agent' | 'Support';
  message: string;
  timestamp: string;
  avatar?: string;
}

interface TicketData {
  id: string;
  ticketNumber: string;
  subject: string;
  status: 'To Do' | 'In Progress' | 'Needs Attention' | 'Completed' | 'Completed - Incomplete';
  priority: 'Low' | 'Intermediate' | 'High';
  category: string;
  created_at: string;
  last_update: string;
  description: string;
  comments: Comment[];
}

const getStatusColor = (status: string) => {
  // Normalize status for case-insensitive matching
  const s = (status || '').toLowerCase();
  if (s === 'completed') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (s.includes('incomplete')) return 'bg-slate-100 text-slate-500 border-slate-200';
  if (s === 'in progress') return 'bg-blue-100 text-blue-700 border-blue-200';
  if (s === 'needs attention') return 'bg-amber-100 text-amber-700 border-amber-200';
  if (s === 'to do') return 'bg-indigo-50 text-indigo-600 border-indigo-100';
  return 'bg-slate-100 text-slate-600 border-slate-200';
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'High': return 'text-red-600 bg-red-50 border-red-100';
    case 'Intermediate': return 'text-blue-600 bg-blue-50 border-blue-100';
    case 'Low': return 'text-slate-500 bg-slate-50 border-slate-100';
    default: return 'text-slate-500';
  }
};

const getPriorityDotColor = (priority: string) => {
  switch (priority) {
    case 'High': return 'bg-red-500 shadow-red-500/50';
    case 'Intermediate': return 'bg-blue-500 shadow-blue-500/50';
    case 'Low': return 'bg-slate-400 shadow-slate-400/50';
    default: return 'bg-slate-300';
  }
};

// --- HELPER COMPONENTS ---

const CustomDropdown = ({ 
  label, 
  value, 
  options, 
  onChange, 
  renderItem,
  placeholder = "Select..."
}: { 
  label: string; 
  value: string; 
  options: string[]; 
  onChange: (val: string) => void;
  renderItem?: (item: string) => React.ReactNode; 
  placeholder?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="space-y-2" ref={containerRef}>
      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">{label}</label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all ${isOpen ? 'ring-2 ring-brand-500/20 border-brand-500 bg-white' : ''}`}
        >
          <span className="flex items-center gap-2 truncate">
            {renderItem ? renderItem(value) : (value || <span className="text-slate-400 font-medium">{placeholder}</span>)}
          </span>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 w-full mt-2 bg-white border border-slate-100 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="max-h-60 overflow-y-auto p-1 space-y-0.5 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
              {options.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    onChange(opt);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2.5 text-sm font-bold rounded-lg transition-colors flex items-center justify-between group ${value === opt ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
                >
                  <span className="flex items-center gap-2">
                    {renderItem ? renderItem(opt) : opt}
                  </span>
                  {value === opt && <Check className="w-4 h-4 text-brand-500" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// --- CREATE TICKET MODAL ---
const CreateTicketModal = ({ 
  isOpen, 
  onClose, 
  onSubmit 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSubmit: (ticket: CreateTicketInput) => Promise<void>; 
}) => {
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('Technical');
  const [priority, setPriority] = useState<'Low' | 'Intermediate' | 'High'>('Intermediate');
  const [description, setDescription] = useState('');
  const [screenshots, setScreenshots] = useState<File[]>([]);
  const [urlInput, setUrlInput] = useState('');
  const [urls, setUrls] = useState<string[]>([]);
  const [urlError, setUrlError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const addUrl = () => {
    const candidate = urlInput.trim();
    if (!candidate) return;

    try {
      const parsed = new URL(candidate);
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Unsupported protocol');
      if (!urls.includes(parsed.toString())) setUrls(current => [...current, parsed.toString()]);
      setUrlInput('');
      setUrlError('');
    } catch {
      setUrlError('Enter a valid http:// or https:// link.');
    }
  };

  const addScreenshots = (files: FileList | null) => {
    if (!files) return;
    const images = Array.from(files).filter(file => file.type.startsWith('image/'));
    setScreenshots(current => {
      const existing = new Set(current.map(file => `${file.name}-${file.size}-${file.lastModified}`));
      return [
        ...current,
        ...images.filter(file => !existing.has(`${file.name}-${file.size}-${file.lastModified}`)),
      ];
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !description || !category || !priority) return;
    
    setIsSubmitting(true);
    try {
        await onSubmit({ subject, category, priority, description, screenshots, urls });
        onClose();
        // Reset form
        setSubject('');
        setDescription('');
        setCategory('Technical');
        setPriority('Intermediate');
        setScreenshots([]);
        setUrlInput('');
        setUrls([]);
        setUrlError('');
    } catch (error) {
        console.error("Error submitting ticket:", error);
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
        <div className="relative flex max-h-[calc(100vh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                    <h3 className="text-xl font-black text-slate-900">New Ticket</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Submit a support request</p>
                </div>
                <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                    <X className="w-5 h-5" />
                </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6 overflow-y-auto p-8">
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Subject</label>
                    <input 
                        type="text" 
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="Brief summary of the issue..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-slate-400"
                        autoFocus
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <CustomDropdown
                        label="Category"
                        value={category}
                        onChange={setCategory}
                        options={['Technical', 'Finance', 'Contracting', 'Marketing', 'Compliance', 'Other']}
                    />
                    
                    <CustomDropdown
                        label="Priority"
                        value={priority}
                        onChange={(val) => setPriority(val as any)}
                        options={['Low', 'Intermediate', 'High']}
                        renderItem={(item) => (
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full shadow-sm ${getPriorityDotColor(item)}`}></div>
                                <span>{item}</span>
                            </div>
                        )}
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Description</label>
                    <textarea 
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Describe the issue in detail..."
                        rows={5}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-slate-400 resize-none"
                    />
                </div>

                <div className="space-y-3">
                    <label className="ml-1 text-xs font-bold uppercase tracking-wider text-slate-500">Related links <span className="normal-case text-slate-300">(optional)</span></label>
                    <div className="flex gap-2">
                        <input
                            type="url"
                            value={urlInput}
                            onChange={(event) => {
                              setUrlInput(event.target.value);
                              if (urlError) setUrlError('');
                            }}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                event.preventDefault();
                                addUrl();
                              }
                            }}
                            placeholder="https://example.com/page"
                            className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition-all placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                        />
                        <button
                            type="button"
                            onClick={addUrl}
                            disabled={!urlInput.trim()}
                            className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white transition-colors hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label="Add link"
                        >
                            <Plus className="h-4 w-4" />
                        </button>
                    </div>
                    {urlError && <p className="px-1 text-xs font-semibold text-red-500">{urlError}</p>}
                    {urls.length > 0 && (
                      <div className="space-y-2">
                        {urls.map(url => (
                          <div key={url} className="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2">
                            <span className="min-w-0 flex-1 truncate text-xs font-bold text-blue-700">{url}</span>
                            <button type="button" onClick={() => setUrls(current => current.filter(item => item !== url))} className="text-blue-400 hover:text-red-500" aria-label={`Remove ${url}`}>
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                </div>

                <div className="space-y-3">
                    <label className="ml-1 text-xs font-bold uppercase tracking-wider text-slate-500">Screenshots <span className="normal-case text-slate-300">(optional)</span></label>
                    <label className="flex cursor-pointer items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-5 py-5 text-center transition-colors hover:border-brand-300 hover:bg-brand-50/30">
                        <Paperclip className="h-5 w-5 text-slate-400" />
                        <span>
                          <span className="block text-sm font-black text-slate-700">Attach image files</span>
                          <span className="block text-xs font-semibold text-slate-400">Choose one or multiple screenshots</span>
                        </span>
                        <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="sr-only"
                            onChange={(event) => {
                              addScreenshots(event.target.files);
                              event.target.value = '';
                            }}
                        />
                    </label>
                    {screenshots.length > 0 && (
                      <div className="space-y-2">
                        {screenshots.map((file, index) => (
                          <div key={`${file.name}-${file.size}-${file.lastModified}`} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                              <FileText className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-black text-slate-700">{file.name}</p>
                              <p className="text-[10px] font-semibold text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
                            </div>
                            <button type="button" onClick={() => setScreenshots(current => current.filter((_, itemIndex) => itemIndex !== index))} className="text-slate-400 hover:text-red-500" aria-label={`Remove ${file.name}`}>
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                </div>

                <div className="pt-2 flex gap-3">
                    <button 
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-3.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        type="submit"
                        disabled={!subject || !description || !category || !priority || isSubmitting}
                        className="flex-1 py-3.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-brand-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-slate-900/20 flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Ticket'}
                    </button>
                </div>
            </form>
        </div>
    </div>
  );
};

export const AgentTickets: React.FC = () => {
  const { viewingAgentName, hasAgentProfile } = useAgentContext();
  const { user } = useAuth();
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  
  // Updated filter state type and default
  const [filter, setFilter] = useState<'Attention Required' | 'Open' | 'Closed'>('Attention Required');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingComment, setSendingComment] = useState(false);
  
  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Helper to title case statuses from API
  const formatStatus = (status: string): any => {
    if (!status) return 'To Do';
    const lower = status.toLowerCase();
    if (lower === 'to do') return 'To Do';
    if (lower === 'in progress') return 'In Progress';
    if (lower === 'needs attention') return 'Needs Attention';
    if (lower === 'completed') return 'Completed';
    return status;
  };

  useEffect(() => {
    const fetchTickets = async () => {
        setLoading(true);
        try {
            const rawData = await agentTicketsApi.getTickets(filter);
            
            // Map JSON response to TicketData interface
            const mappedTickets: TicketData[] = rawData.map((t: any) => ({
                id: t.id,
                ticketNumber: `#${t.ticket_reference}`,
                subject: t.subject,
                description: t.description,
                status: formatStatus(t.status),
                category: t.category || 'General',
                priority: 'Intermediate', // Defaulting as API doesn't return priority
                created_at: new Date(t.created_at).toISOString(),
                last_update: new Date(t.created_at).toISOString(), // Defaulting update time
                // Populate dummy comments based on count to show badge number
                comments: Array.from({ length: t.comments || 0 }).map((_, i) => ({
                    id: `dummy-${i}`,
                    author: 'System',
                    role: 'Support',
                    message: 'Comment history not loaded in list view.',
                    timestamp: new Date(t.created_at).toISOString()
                }))
            }));

            setTickets(mappedTickets);
            
            // Auto-select first ticket if available
            if (mappedTickets.length > 0) {
                setSelectedTicketId(mappedTickets[0].id);
            } else {
                setSelectedTicketId(null);
            }

        } catch (error) {
            console.error("Error loading tickets:", error);
            setTickets([]);
        } finally {
            setLoading(false);
        }
    };

    fetchTickets();
  }, [filter]);

  // Fetch Ticket Details when ID changes
  useEffect(() => {
    if (!selectedTicketId) return;

    const fetchTicketDetails = async () => {
        try {
            const detailData = await agentTicketsApi.getTicketDetails(selectedTicketId);
            
            const mappedComments: Comment[] = (detailData.comment || []).map((c: any, index: number) => ({
                id: `msg-${index}-${c.created_at}`,
                author: `${c._commentby?.first_name || ''} ${c._commentby?.last_name || ''}`.trim(),
                role: c._commentby?.id === user?.id ? 'Agent' : 'Support',
                message: c.message,
                timestamp: new Date(c.created_at).toISOString()
            }));

            setTickets(prev => prev.map(t => {
                if (t.id === selectedTicketId) {
                    return {
                        ...t,
                        // Merge details. API uses 'name' for subject in detail view
                        subject: detailData.name || t.subject,
                        description: detailData.description || t.description,
                        status: formatStatus(detailData.status),
                        priority: detailData.priority ? (detailData.priority.charAt(0).toUpperCase() + detailData.priority.slice(1)) as any : t.priority,
                        category: detailData.category ? (detailData.category.charAt(0).toUpperCase() + detailData.category.slice(1)) : t.category,
                        comments: mappedComments
                    };
                }
                return t;
            }));

        } catch (error) {
            console.error("Error fetching details:", error);
        }
    };

    fetchTicketDetails();
  }, [selectedTicketId, user?.id]);

  const selectedTicket = tickets.find(t => t.id === selectedTicketId);

  const filteredTickets = tickets.filter(t => {
    // Only filter by search text locally, API handles the status filtering
    const matchesSearch = t.subject.toLowerCase().includes(searchQuery.toLowerCase()) || t.ticketNumber.includes(searchQuery);
    return matchesSearch;
  });

  const handleCreateTicket = async (newTicketData: CreateTicketInput) => {
    try {
        const createdTicket = await agentTicketsApi.createTicket(newTicketData);
        
        // Ensure the returned object conforms to TicketData for local state update
        const formattedTicket: TicketData = {
            ...createdTicket,
            status: createdTicket.status || 'To Do', // Default to To Do
            comments: createdTicket.comments || [],
            created_at: createdTicket.created_at || new Date().toISOString(),
            last_update: createdTicket.last_update || new Date().toISOString()
        };

        // Optionally fetch list again or prepend locally. 
        // Prepending locally requires matching the current filter, so we just check if it matches current view roughly.
        if (filter === 'Open') {
             setTickets(prev => [formattedTicket, ...prev]);
             setSelectedTicketId(formattedTicket.id);
        }
    } catch (error) {
        console.error("Failed to create ticket via API", error);
    }
  };

  const handleSendComment = async () => {
    if (!newComment.trim() || !selectedTicketId) return;
    
    setSendingComment(true);
    try {
        const data = await agentTicketsApi.addComment(selectedTicketId, newComment);
        
        const newCommentObj: Comment = {
            id: `new-${data.created_at}`,
            author: `${data._commentby?.first_name || ''} ${data._commentby?.last_name || ''}`.trim(),
            role: data._commentby?.id === user?.id ? 'Agent' : 'Support',
            message: data.message,
            timestamp: new Date(data.created_at).toISOString()
        };

        setTickets(prev => prev.map(t => {
            if (t.id === selectedTicketId) {
                return {
                    ...t,
                    comments: [...t.comments, newCommentObj]
                };
            }
            return t;
        }));
        
        setNewComment('');
    } catch (error) {
        console.error("Failed to send comment:", error);
    } finally {
        setSendingComment(false);
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col xl:flex-row gap-6 font-sans relative">
      
      <CreateTicketModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        onSubmit={handleCreateTicket} 
      />

      {/* LEFT COLUMN: TICKET LIST */}
      <div className="w-full xl:w-[400px] flex flex-col bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden shrink-0">
        
        {/* Header & Controls */}
        <div className="p-6 border-b border-slate-50 bg-white z-10">
          <div className="flex items-center justify-between mb-6">
            <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">My Tickets</h2>
                {!hasAgentProfile && <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Employee Workspace</p>}
            </div>
            <button 
                onClick={() => setIsCreateModalOpen(true)}
                className="w-10 h-10 bg-slate-900 hover:bg-brand-500 text-white rounded-xl flex items-center justify-center transition-colors shadow-lg shadow-slate-900/20 hover:shadow-brand-500/30"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search tickets..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border-transparent focus:bg-white border focus:border-brand-200 rounded-xl text-sm font-bold text-slate-700 placeholder:text-slate-400 focus:outline-none transition-all"
              />
            </div>
            
            <div className="flex p-1 bg-slate-50 rounded-xl">
              {(['Attention Required', 'Open', 'Closed'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`flex-1 py-2 rounded-lg text-[10px] font-bold transition-all ${filter === f ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Ticket List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide bg-slate-50/50">
          {loading ? (
             <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-3">
               <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
               <p className="text-xs font-bold uppercase tracking-wide">Loading Tickets...</p>
             </div>
          ) : filteredTickets.length > 0 ? (
            filteredTickets.map(ticket => {
              const isActive = selectedTicketId === ticket.id;
              return (
                <div 
                  key={ticket.id}
                  onClick={() => setSelectedTicketId(ticket.id)}
                  className={`
                    p-5 rounded-2xl cursor-pointer transition-all border group relative overflow-hidden
                    ${isActive 
                      ? 'bg-white border-brand-200 shadow-xl shadow-brand-900/5 ring-1 ring-brand-100' 
                      : 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-md'
                    }
                  `}
                >
                  {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-500"></div>}
                  
                  <div className="flex justify-between items-start mb-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wide border ${getStatusColor(ticket.status)}`}>
                      {ticket.status}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">
                      {new Date(ticket.last_update).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <h3 className={`text-sm font-bold mb-1 line-clamp-1 ${isActive ? 'text-slate-900' : 'text-slate-700'}`}>
                    {ticket.subject}
                  </h3>
                  
                  <p className="text-xs text-slate-500 line-clamp-2 mb-3 leading-relaxed">
                    {ticket.description}
                  </p>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                    <div className="flex items-center gap-2">
                      <span className="bg-slate-100 text-slate-500 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded">
                        {ticket.ticketNumber}
                      </span>
                      {ticket.priority === 'High' && <AlertCircle className="w-3.5 h-3.5 text-orange-500" />}
                    </div>
                    <div className="flex items-center gap-1 text-slate-400">
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold">{ticket.comments.length}</span>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400">
              <Ticket className="w-10 h-10 mb-2 opacity-20" />
              <p className="text-xs font-bold uppercase tracking-wide">No tickets found</p>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: TICKET DETAILS */}
      <div className="flex-1 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col relative">
        {selectedTicket ? (
          <>
            {/* Detail Header */}
            <div className="px-8 py-6 border-b border-slate-50 flex flex-col sm:flex-row sm:items-start justify-between gap-4 bg-white z-20">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <span className="bg-slate-900 text-white text-xs font-mono font-bold px-2 py-1 rounded-lg">
                    {selectedTicket.ticketNumber}
                  </span>
                  <div className="flex gap-2">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide border ${getStatusColor(selectedTicket.status)}`}>
                      {selectedTicket.status}
                    </span>
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide border ${getPriorityColor(selectedTicket.priority)}`}>
                      {selectedTicket.priority} Priority
                    </span>
                  </div>
                </div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-tight mb-2">
                  {selectedTicket.subject}
                </h1>
                <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" />
                    <span>{selectedTicket.category}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Created {new Date(selectedTicket.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              
              <button className="p-2 rounded-xl text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors">
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto scrollbar-hide bg-slate-50/30">
              <div className="p-8 max-w-4xl mx-auto space-y-8">
                
                {/* Description Card */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                  <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-3">Description</h3>
                  <p className="text-slate-700 text-sm leading-7 whitespace-pre-wrap">
                    {selectedTicket.description}
                  </p>
                </div>

                {/* Timeline / Comments */}
                <div>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="h-px bg-slate-200 flex-1"></div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Activity Log</span>
                    <div className="h-px bg-slate-200 flex-1"></div>
                  </div>

                  <div className="space-y-6">
                    {selectedTicket.comments.length > 0 ? (
                      selectedTicket.comments.map((comment, index) => (
                        <div key={index} className={`flex gap-4 ${comment.role === 'Agent' ? 'flex-row-reverse' : ''}`}>
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black shadow-sm shrink-0 border-2 ${comment.role === 'Agent' ? 'bg-brand-50 border-brand-100 text-brand-600' : 'bg-white border-slate-100 text-slate-500'}`}>
                            {comment.author.split(' ').map(n=>n[0]).join('').substring(0,2)}
                          </div>
                          <div className={`flex flex-col max-w-[80%] ${comment.role === 'Agent' ? 'items-end' : 'items-start'}`}>
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="text-xs font-bold text-slate-900">{comment.author}</span>
                              <span className="text-[10px] font-bold text-slate-400">{new Date(comment.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            </div>
                            <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${comment.role === 'Agent' ? 'bg-brand-500 text-white rounded-tr-none' : 'bg-white border border-slate-100 text-slate-600 rounded-tl-none'}`}>
                              {comment.message}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-10">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                          <MessageSquare className="w-6 h-6 text-slate-300" />
                        </div>
                        <p className="text-slate-400 text-xs font-bold">No activity yet. Start the conversation.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Comment Input */}
            <div className="p-6 bg-white border-t border-slate-100 shrink-0 z-20">
              <div className="max-w-4xl mx-auto relative group">
                <div className="absolute left-3 top-3 flex items-center gap-2">
                   <button className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                      <Paperclip className="w-4 h-4" />
                   </button>
                </div>
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendComment();
                    }
                  }}
                  placeholder="Type your reply here..."
                  className="w-full bg-slate-50 border-0 rounded-2xl py-3.5 pl-12 pr-14 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-4 focus:ring-slate-100 transition-all shadow-inner resize-none h-14 min-h-[56px] focus:h-24"
                />
                <div className="absolute right-2 top-2">
                  <button 
                    disabled={!newComment.trim() || sendingComment}
                    onClick={handleSendComment}
                    className="p-2.5 rounded-xl text-white bg-slate-900 hover:bg-brand-50 disabled:opacity-20 disabled:hover:bg-slate-900 disabled:cursor-not-allowed transition-all shadow-md flex items-center justify-center"
                  >
                    {sendingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-slate-50/50">
            <div className="w-24 h-24 bg-white rounded-[2rem] shadow-sm border border-slate-100 flex items-center justify-center mb-6">
              <Ticket className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2">Select a Ticket</h3>
            <p className="text-slate-500 max-w-xs mx-auto">Choose a ticket from the list to view details, updates, and communicate with support.</p>
          </div>
        )}
      </div>
    </div>
  );
};
