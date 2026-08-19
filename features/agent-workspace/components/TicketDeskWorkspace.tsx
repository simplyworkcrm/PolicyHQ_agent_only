import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  Columns3,
  Download,
  Eye,
  EyeOff,
  FileText,
  ImagePlus,
  Inbox,
  LayoutDashboard,
  Link2,
  Loader2,
  MessageCircleQuestion,
  MessageSquare,
  Paperclip,
  Plus,
  RotateCcw,
  Search,
  Send,
  Sparkles,
  Tag,
  TicketCheck,
  X,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { agentTicketsApi, CreateTicketInput, ImageMetadata, TicketSchemaOption } from '../services/agentTicketsApi';

type TicketStatus = 'Waiting' | 'On it' | 'Resolved' | 'Incomplete';
type TicketPriority = 'Low' | 'Intermediate' | 'High';
type TicketFilter = 'all' | 'attention' | 'open' | 'closed';
type TicketScope = 'all' | 'mine' | 'handling' | 'cohandling';
type DetailTab = 'overview' | 'conversation' | 'activity' | 'notes';
type TicketSortDirection = 'asc' | 'desc';
type TicketSortField = 'ticket_reference' | 'created_at' | 'createdBy_ghl_user_name' | 'name' | 'category' | 'priority' | 'status' | 'assigned_ghl_user_name' | 'cohandler_ghl_user_name' | 'updated_at';

interface PendingTicketCompletion {
  ticket: TicketRecord;
  status: string;
}

interface TicketSortConfig {
  key: TicketSortField;
  direction: TicketSortDirection;
}

interface TicketQuickFilter {
  reference: string;
  requesterId: string[];
  category: string[];
  priority: string[];
  handler: string[];
  cohandler: string[];
  status: string[];
}

const TICKET_SCOPE_FIELDS: Record<Exclude<TicketScope, 'all'>, string> = {
  mine: 'createdBy_ghl_user_id',
  handling: 'assigned_ghl_user_id',
  cohandling: 'cohandler_ghl_user_id',
};

const EMPTY_QUICK_FILTER: TicketQuickFilter = {
  reference: '',
  requesterId: [],
  category: [],
  priority: [],
  handler: [],
  cohandler: [],
  status: [],
};

const buildTicketFilter = (scope: TicketScope, quickFilter: TicketQuickFilter, userId?: string, isStaff = false, staleOnly = false): Record<string, unknown> => {
  const normalizedReference = quickFilter.reference.trim().replace(/^#/, '').trim();
  const filterGroups = [
    ...(scope !== 'all' && userId ? [{ field: TICKET_SCOPE_FIELDS[scope], values: [userId] }] : []),
    ...(normalizedReference ? [{ field: 'ticket_reference', values: [normalizedReference] }] : []),
    ...(isStaff && quickFilter.requesterId.length ? [{ field: 'createdBy_ghl_user_id', values: quickFilter.requesterId }] : []),
    ...(quickFilter.category.length ? [{ field: 'category', values: quickFilter.category }] : []),
    ...(quickFilter.priority.length ? [{ field: 'priority', values: quickFilter.priority }] : []),
    ...(quickFilter.status.length ? [{ field: 'status', values: quickFilter.status }] : []),
    ...(quickFilter.handler.length ? [{ field: 'assigned_ghl_user_id', values: quickFilter.handler }] : []),
    ...(quickFilter.cohandler.length ? [{ field: 'cohandler_ghl_user_id', values: quickFilter.cohandler }] : []),
  ];
  const statement = (field: string, value: string, or = false) => ({
    or,
    type: 'statement',
    statement: {
      left: { tag: 'col', operand: field },
      op: '==',
      right: { operand: value },
    },
  });
  const expression: Record<string, unknown>[] = filterGroups.map(filterGroup => filterGroup.values.length === 1
    ? statement(filterGroup.field, filterGroup.values[0])
    : {
        or: false,
        type: 'group',
        group: {
          expression: filterGroup.values.map((value, index) => statement(filterGroup.field, value, index > 0)),
        },
      });
  if (staleOnly) {
    expression.push(
      {
        or: false,
        type: 'statement',
        statement: {
          left: { tag: 'col', operand: 'created_at' },
          op: '<',
          right: { operand: Date.now() - SLA_LIMIT_MS },
        },
      },
      {
        or: false,
        type: 'statement',
        statement: {
          left: { tag: 'col', operand: 'status' },
          op: '!=',
          right: { operand: 'completed' },
        },
      },
      {
        or: false,
        type: 'statement',
        statement: {
          left: { tag: 'col', operand: 'status' },
          op: '!=',
          right: { operand: 'completed - incomplete' },
        },
      },
    );
  }
  if (!expression.length) return {};
  return {
    expression: [{
      or: false,
      type: 'group',
      group: {
        expression,
      },
    }],
  };
};

interface TicketComment {
  id: string;
  authorId: string;
  author: string;
  role: 'Agent' | 'Support';
  message: string;
  timestamp: string;
  screenshots: TicketMediaItem[];
}

interface TicketMediaItem {
  label: string;
  url: string;
}

interface TicketActivity {
  id: string;
  createdAt: string;
  log: string;
  updatedById: string;
  updatedByName: string;
}

interface TicketResolution {
  resolvedById: string;
  solution: string;
  firstName: string;
  lastName: string;
  resolvedByName: string;
}

interface TicketRecord {
  id: string;
  reference: string;
  subject: string;
  description: string;
  status: TicketStatus;
  statusValue: string;
  priority: TicketPriority;
  priorityValue: string;
  category: string;
  createdAt: string;
  updatedAt: string;
  commentCount: number;
  comments: TicketComment[];
  needsAttention: boolean;
  requesterName: string;
  requesterEmail: string;
  agency: string;
  handler: string;
  handlerId: string;
  coHandler: string;
  coHandlerId: string;
  resolution: TicketResolution | null;
  looms: TicketMediaItem[];
  screenshots: TicketMediaItem[];
}

interface QuickEditOption {
  value: string;
  label: string;
  tone?: string;
  dot?: string;
}

type TicketColumnKey = 'reference' | 'sla' | 'requester' | 'question' | 'category' | 'priority' | 'status' | 'handler' | 'cohandler' | 'created' | 'updated' | 'resolution' | 'replies';

const ticketColumnOptions: Array<{ value: TicketColumnKey; label: string }> = [
  { value: 'reference', label: 'Ref' },
  { value: 'sla', label: 'SLA' },
  { value: 'requester', label: 'Requester' },
  { value: 'question', label: 'Question' },
  { value: 'category', label: 'Category' },
  { value: 'priority', label: 'Priority' },
  { value: 'status', label: 'Status' },
  { value: 'handler', label: 'Handler' },
  { value: 'cohandler', label: 'Co-handler' },
  { value: 'created', label: 'Created' },
  { value: 'updated', label: 'Updated' },
  { value: 'resolution', label: 'Resolution' },
  { value: 'replies', label: 'Replies' },
];

const includeCurrentQuickOption = (options: QuickEditOption[], value: string, label: string, appearance: Pick<QuickEditOption, 'tone' | 'dot'> = {}) => (
  value && !options.some(option => option.value === value)
    ? [{ value, label, ...appearance }, ...options]
    : options
);

const dateValue = (value: unknown) => {
  const normalizedValue = typeof value === 'string' && /^\d+$/.test(value.trim())
    ? Number(value)
    : value;
  const date = normalizedValue ? new Date(normalizedValue as string | number) : new Date();
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
};

const normalizeStatus = (value: unknown): TicketStatus => {
  const status = String(value || '').trim().toLowerCase();
  if (status.includes('complete') && status.includes('incomplete')) return 'Incomplete';
  if (status === 'completed' || status === 'complete' || status === 'closed' || status === 'resolved') return 'Resolved';
  if (status === 'in progress' || status === 'on it' || status === 'working') return 'On it';
  return 'Waiting';
};

const isCompletionStatus = (value: unknown) => {
  const status = String(value || '').trim().toLowerCase();
  return status === 'completed' || status === 'completed - incomplete';
};

const normalizePriority = (value: unknown): TicketPriority => {
  const priority = String(value || '').toLowerCase();
  if (priority === 'urgent' || priority === 'high') return 'High';
  if (priority === 'low') return 'Low';
  return 'Intermediate';
};

const unwrapRows = (payload: unknown): any[] => {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  const record = payload as Record<string, unknown>;
  for (const key of ['items', 'tickets', 'data', 'records']) {
    if (Array.isArray(record[key])) return record[key] as any[];
  }
  return [];
};

const unwrapTicketDetail = (payload: any) => payload?.data?.ticket
  || payload?.data?.item
  || payload?.data
  || payload?.ticket
  || payload?.item
  || payload;

const normalizeMediaItems = (value: unknown, kind: 'loom' | 'screenshot'): TicketMediaItem[] => {
  let source = value;
  if (typeof source === 'string') {
    try {
      source = JSON.parse(source);
    } catch {
      source = [source];
    }
  }
  if (source && !Array.isArray(source) && typeof source === 'object') {
    const record = source as Record<string, unknown>;
    source = record.items || record.data || record[kind === 'loom' ? 'looms' : 'screenshots'] || [source];
  }
  if (!Array.isArray(source)) return [];

  return source.map((item, index) => {
    if (typeof item === 'string') {
      const isUrl = /^(https?:|data:|blob:)/i.test(item.trim());
      return {
        label: isUrl ? `${kind === 'loom' ? 'Loom recording' : 'Screenshot'} ${index + 1}` : item,
        url: isUrl ? item.trim() : '',
      };
    }
    const record = item && typeof item === 'object' ? item as Record<string, unknown> : {};
    const urlCandidates = kind === 'loom'
      ? [record.url, record.link, record.loom_url, record.video_url, record.embed_url]
      : [record.url, record.src, record.image_url, record.public_url, record.download_url, record.file_url];
    const url = String(urlCandidates.find(candidate => typeof candidate === 'string' && /^(https?:|data:|blob:)/i.test(candidate)) || '');
    const label = String(record.name || record.filename || record.title || record.label || record.full_path || `${kind === 'loom' ? 'Loom recording' : 'Screenshot'} ${index + 1}`);
    return { label, url };
  }).filter(item => item.label || item.url);
};

const mapComment = (comment: any, index: number, currentUserId?: string): TicketComment => {
  const authorId = String(comment?.commentedBy_ghl_user_id || comment?._commentby?.id || comment?.user_id || '').trim();
  const firstName = String(comment?.name?.first_name || comment?._commentby?.first_name || '').trim();
  const lastName = String(comment?.name?.last_name || comment?._commentby?.last_name || '').trim();
  const suppliedAuthorName = String(comment?.commentedBy_ghl_user_name || comment?.author || '').trim();

  return {
    id: String(comment?.id || `comment-${index}-${comment?.created_at || Date.now()}`),
    authorId,
    author: [firstName, lastName].filter(Boolean).join(' ') || suppliedAuthorName,
    role: authorId === String(currentUserId || '') ? 'Agent' : 'Support',
    message: String(comment?.message || comment?.content || ''),
    timestamp: dateValue(comment?.created_at || comment?.timestamp),
    screenshots: normalizeMediaItems(comment?.screenshots, 'screenshot'),
  };
};

const normalizeResolution = (raw: any): TicketResolution | null => {
  const source = raw?.resolution && typeof raw.resolution === 'object' ? raw.resolution : {};
  const name = source?.name && typeof source.name === 'object' ? source.name : {};
  const firstName = String(name?.first_name || source?.first_name || raw?.resolvedBy_first_name || '').trim();
  const lastName = String(name?.last_name || source?.last_name || raw?.resolvedBy_last_name || '').trim();
  const resolvedById = String(source?.resolvedBy_ghl_user_id || raw?.resolvedBy_ghl_user_id || '').trim();
  const solution = String(source?.solution || raw?.resolution_solution || raw?.solution || '').trim();
  const resolvedByName = [firstName, lastName].filter(Boolean).join(' ');

  return solution || resolvedById || resolvedByName
    ? { resolvedById, solution, firstName, lastName, resolvedByName }
    : null;
};

const mapTicket = (raw: any, needsAttention = false): TicketRecord => {
  const rawComments = Array.isArray(raw?.comment)
    ? raw.comment
    : Array.isArray(raw?.comments)
      ? raw.comments
      : [];
  const commentsCount = Number(raw?.comments_count ?? raw?.comment_count ?? raw?.commentsCount);
  const reference = raw?.ticket_reference ?? raw?.reference ?? raw?.ticket_number ?? raw?.id ?? '—';
  const latestCommentAt = rawComments.reduce((latest: number, comment: any) => Math.max(latest, Number(comment?.created_at || 0)), 0);
  return {
    id: String(raw?.id ?? reference),
    reference: `#${String(reference).replace(/^#/, '')}`,
    subject: String(raw?.subject || raw?.name || raw?.question || 'Untitled request'),
    description: String(raw?.description || raw?.message || ''),
    status: normalizeStatus(raw?.status),
    statusValue: String(raw?.status || '').trim(),
    priority: normalizePriority(raw?.priority),
    priorityValue: String(raw?.priority || '').trim(),
    category: String(raw?.category || 'General'),
    createdAt: dateValue(raw?.created_at),
    updatedAt: dateValue(raw?.updated_at || raw?.last_update || latestCommentAt || raw?.created_at),
    commentCount: Number.isFinite(commentsCount) ? commentsCount : rawComments.length,
    comments: rawComments.map((comment: any, index: number) => mapComment(comment, index)),
    needsAttention,
    requesterName: String(raw?.createdBy_ghl_user_name || raw?.agent_name || raw?.requester_name || raw?._user?.name || [raw?._user?.first_name, raw?._user?.last_name].filter(Boolean).join(' ') || '').trim(),
    requesterEmail: String(raw?.createdBy_ghl_user_email || raw?.agent_email || raw?.requester_email || raw?._user?.email || '').trim(),
    agency: String(raw?.agency || raw?.agency_name || raw?._agency?.name || ''),
    handler: String(raw?.assigned_ghl_user_name || raw?.handler || raw?.handler_name || raw?._handler?.name || [raw?._handler?.first_name, raw?._handler?.last_name].filter(Boolean).join(' ') || '').trim(),
    handlerId: String(raw?.assigned_ghl_user_id || raw?.handler_id || raw?._handler?.id || '').trim(),
    coHandler: String(raw?.cohandler_ghl_user_name || raw?.co_handler || raw?.cohandler || raw?.co_handler_name || raw?._co_handler?.name || [raw?._co_handler?.first_name, raw?._co_handler?.last_name].filter(Boolean).join(' ') || '').trim(),
    coHandlerId: String(raw?.cohandler_ghl_user_id || raw?.co_handler_id || raw?._co_handler?.id || '').trim(),
    resolution: normalizeResolution(raw),
    looms: normalizeMediaItems(raw?.looms, 'loom'),
    screenshots: normalizeMediaItems(raw?.screenshots, 'screenshot'),
  };
};

const formatDate = (value: string) => new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: new Date(value).getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
}).format(new Date(value));

const formatTime = (value: string) => new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
}).format(new Date(value));

const formatMountainDateTime = (value: string) => new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Denver',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZoneName: 'short',
}).format(new Date(value));

const originalRequestBody = (ticket: TicketRecord) => {
  let value = ticket.description.trim();
  if (value.toLowerCase().startsWith(ticket.subject.trim().toLowerCase())) {
    value = value.slice(ticket.subject.trim().length).trim();
  }
  value = value.replace(/^[-–—:|\s]+/, '').replace(/^additional details\s*:\s*/i, '').trim();
  return value || 'No additional details were provided.';
};

const SLA_LIMIT_MS = 24 * 60 * 60 * 1000;

const isSlaBreached = (ticket: TicketRecord, now = Date.now()) => (
  ticket.status !== 'Resolved'
  && now - new Date(ticket.createdAt).getTime() > SLA_LIMIT_MS
);

const statusStyles: Record<TicketStatus, string> = {
  Waiting: 'bg-amber-50 text-amber-700 ring-amber-200',
  'On it': 'bg-blue-50 text-blue-700 ring-blue-200',
  Resolved: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Incomplete: 'bg-slate-100 text-slate-600 ring-slate-200',
};

const priorityStyles: Record<TicketPriority, string> = {
  Low: 'text-slate-500',
  Intermediate: 'text-blue-600',
  High: 'text-rose-600',
};

const priorityQuickTone = (value: string) => {
  const rawPriority = String(value).trim().toLowerCase();
  if (rawPriority === 'urgent') return { tone: 'bg-red-50 text-red-800 ring-red-200', dot: 'bg-red-600' };
  const priority = normalizePriority(value);
  if (priority === 'High') return { tone: 'bg-rose-50 text-rose-700 ring-rose-200', dot: 'bg-rose-500' };
  if (priority === 'Low') return { tone: 'bg-sky-50 text-sky-700 ring-sky-200', dot: 'bg-sky-500' };
  return { tone: 'bg-indigo-50 text-indigo-700 ring-indigo-200', dot: 'bg-indigo-500' };
};

const statusQuickTone = (value: string) => {
  const status = String(value).trim().toLowerCase();
  if (status === 'completed') return { tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500' };
  if (status.includes('incomplete')) return { tone: 'bg-slate-100 text-slate-600 ring-slate-200', dot: 'bg-slate-400' };
  if (status.includes('attention')) return { tone: 'bg-rose-50 text-rose-700 ring-rose-200', dot: 'bg-rose-500' };
  if (status.includes('progress')) return { tone: 'bg-blue-50 text-blue-700 ring-blue-200', dot: 'bg-blue-500' };
  return { tone: 'bg-amber-50 text-amber-700 ring-amber-200', dot: 'bg-amber-500' };
};

const quickPrompts = [
  'CRM help or setup',
  'Dialer not working',
  'Lead servicing issue',
  'Carrier appointment help',
  'Policy status question',
  'Commission question',
];

const fallbackCategoryOptions: TicketSchemaOption[] = ['Technical', 'Finance', 'Contracting', 'Marketing', 'Compliance', 'Other']
  .map(value => ({ value, label: value }));

const fallbackPriorityOptions: TicketSchemaOption[] = [
  { value: 'Low', label: 'Low', description: 'No immediate impact' },
  { value: 'Intermediate', label: 'Normal', description: 'Standard support' },
  { value: 'High', label: 'Urgent', description: 'Work is blocked' },
];

const fallbackStatusOptions: TicketSchemaOption[] = ['waiting', 'in progress', 'needs attention', 'completed']
  .map(value => ({ value, label: value.replace(/\b\w/g, character => character.toUpperCase()) }));

const screenshotKey = (file: File) => `${file.name}-${file.size}-${file.lastModified}`;

interface RequestModalProps {
  initialText: string;
  onClose: () => void;
  onCreated: () => Promise<void>;
}

const RequestModal: React.FC<RequestModalProps> = ({ initialText, onClose, onCreated }) => {
  const [subject, setSubject] = useState(initialText);
  const [description, setDescription] = useState(initialText);
  const [category, setCategory] = useState('Technical');
  const [priority, setPriority] = useState<TicketPriority>('Intermediate');
  const [linkInput, setLinkInput] = useState('');
  const [screenshots, setScreenshots] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!subject.trim() || !description.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const urls = linkInput.trim() ? [new URL(linkInput.trim()).toString()] : [];
      const screenshotMetadata = await Promise.all(screenshots.map(file => agentTicketsApi.createImageMetadata(file)));
      const payload: CreateTicketInput = {
        subject: subject.trim(),
        description: description.trim(),
        category,
        priority,
        screenshots: screenshotMetadata,
        urls,
      };
      await agentTicketsApi.createTicket(payload);
      await onCreated();
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'We could not submit this request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="new-request-title" onMouseDown={event => event.stopPropagation()} className="flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-7 py-6">
          <div className="flex items-start gap-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700"><MessageCircleQuestion className="h-5 w-5" /></span>
            <div><p className="text-[9px] font-black uppercase tracking-[0.22em] text-amber-600">New request</p><h2 id="new-request-title" className="mt-1 text-xl font-black text-slate-950">Tell us what you need</h2><p className="mt-1 text-xs font-medium text-slate-500">Your request and all replies will stay together in one ticket.</p></div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close request form" className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"><X className="h-5 w-5" /></button>
        </div>

        <form onSubmit={submit} className="space-y-5 overflow-y-auto px-7 py-6">
          <label className="block"><span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Subject</span><input autoFocus value={subject} onChange={event => setSubject(event.target.value)} placeholder="Brief summary of the issue" className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-bold text-slate-900 outline-none transition focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-100" /></label>
          <label className="block"><span className="text-[10px] font-black uppercase tracking-wider text-slate-500">What happened?</span><textarea value={description} onChange={event => setDescription(event.target.value)} rows={5} placeholder="Include anything that will help us understand and resolve the request." className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium leading-6 text-slate-800 outline-none transition focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-100" /></label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block"><span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Category</span><select value={category} onChange={event => setCategory(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-bold text-slate-800 outline-none focus:border-amber-400 focus:bg-white"><option>Technical</option><option>Finance</option><option>Contracting</option><option>Marketing</option><option>Compliance</option><option>Other</option></select></label>
            <label className="block"><span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Priority</span><select value={priority} onChange={event => setPriority(event.target.value as TicketPriority)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-bold text-slate-800 outline-none focus:border-amber-400 focus:bg-white"><option value="Low">Low</option><option value="Intermediate">Normal</option><option value="High">Urgent</option></select></label>
          </div>

          <label className="block"><span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-500"><Link2 className="h-3.5 w-3.5" /> Related link <span className="normal-case tracking-normal text-slate-300">optional</span></span><input type="url" value={linkInput} onChange={event => setLinkInput(event.target.value)} placeholder="https://example.com/page" className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium text-slate-800 outline-none focus:border-amber-400 focus:bg-white" /></label>

          <div><span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-500"><ImagePlus className="h-3.5 w-3.5" /> Screenshots <span className="normal-case tracking-normal text-slate-300">optional</span></span><label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-xs font-bold text-slate-500 transition hover:border-amber-400 hover:bg-amber-50 hover:text-amber-700"><Paperclip className="h-4 w-4" />{screenshots.length ? `${screenshots.length} image${screenshots.length === 1 ? '' : 's'} selected` : 'Attach screenshots'}<input type="file" accept="image/*" multiple className="hidden" onChange={event => setScreenshots(Array.from(event.target.files || []))} /></label></div>

          {error && <div role="alert" className="flex items-start gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}

          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end"><button type="button" onClick={onClose} className="rounded-xl px-5 py-3 text-xs font-black text-slate-500 transition hover:bg-slate-100">Cancel</button><button type="submit" disabled={submitting || !subject.trim() || !description.trim()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-xs font-black text-white shadow-lg transition hover:bg-amber-500 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-40">{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Submit request</button></div>
        </form>
      </div>
    </div>
  );
};

type AssistantPhase = 'category' | 'priority' | 'details' | 'review' | 'success';

interface RequestConversationProps {
  initialText: string;
  firstName: string;
  onBack: () => void;
  onCreated: () => Promise<void>;
  onOpenDashboard: () => void;
}

const RequestConversation: React.FC<RequestConversationProps> = ({ initialText, firstName, onBack, onCreated, onOpenDashboard }) => {
  const [phase, setPhase] = useState<AssistantPhase>('category');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState('');
  const [categoryOptions, setCategoryOptions] = useState<TicketSchemaOption[]>([]);
  const [priorityOptions, setPriorityOptions] = useState<TicketSchemaOption[]>([]);
  const [schemaLoading, setSchemaLoading] = useState(true);
  const [details, setDetails] = useState('');
  const [linkInput, setLinkInput] = useState('');
  const [links, setLinks] = useState<string[]>([]);
  const [linkError, setLinkError] = useState('');
  const [screenshots, setScreenshots] = useState<File[]>([]);
  const [screenshotMetadata, setScreenshotMetadata] = useState<Record<string, ImageMetadata>>({});
  const [uploadingScreenshots, setUploadingScreenshots] = useState<string[]>([]);
  const [screenshotUploadErrors, setScreenshotUploadErrors] = useState<Record<string, string>>({});
  const [screenshotPreviews, setScreenshotPreviews] = useState<Array<{ file: File; url: string }>>([]);
  const [openPreview, setOpenPreview] = useState<{ url: string; name: string } | null>(null);
  const [attachmentError, setAttachmentError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [thinking, setThinking] = useState(false);
  const thinkingTimer = useRef<number | null>(null);

  const phaseIndex = { category: 2, priority: 3, details: 4, review: 5, success: 6 }[phase];
  const progressSteps = ['Request', 'Category', 'Priority', 'Details', 'Review'];
  const selectedCategoryLabel = categoryOptions.find(option => option.value === category)?.label || category;
  const selectedPriorityLabel = priorityOptions.find(option => option.value === priority)?.label || priority;

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([
      agentTicketsApi.getCategoryOptions(),
      agentTicketsApi.getPriorityOptions(),
    ]).then(([categoriesResult, prioritiesResult]) => {
      if (cancelled) return;
      const categories = categoriesResult.status === 'fulfilled' ? categoriesResult.value : [];
      const priorities = prioritiesResult.status === 'fulfilled' ? prioritiesResult.value : [];
      setCategoryOptions(categories.length ? categories : fallbackCategoryOptions);
      setPriorityOptions(priorities.length ? priorities : fallbackPriorityOptions);
      setSchemaLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const previews = screenshots.map(file => ({ file, url: URL.createObjectURL(file) }));
    setScreenshotPreviews(previews);
    setOpenPreview(null);
    return () => previews.forEach(preview => URL.revokeObjectURL(preview.url));
  }, [screenshots]);

  useEffect(() => () => {
    if (thinkingTimer.current !== null) window.clearTimeout(thinkingTimer.current);
  }, []);

  const revealNextStep = (nextPhase: AssistantPhase) => {
    if (thinkingTimer.current !== null) window.clearTimeout(thinkingTimer.current);
    setThinking(true);
    thinkingTimer.current = window.setTimeout(() => {
      setPhase(nextPhase);
      setThinking(false);
      thinkingTimer.current = null;
    }, 700);
  };

  const addLink = () => {
    const candidate = linkInput.trim();
    if (!candidate) return true;
    try {
      const parsed = new URL(candidate);
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Unsupported URL protocol');
      const normalized = parsed.toString();
      setLinks(current => current.includes(normalized) ? current : [...current, normalized]);
      setLinkInput('');
      setLinkError('');
      return true;
    } catch {
      setLinkError('Enter a complete http:// or https:// link before adding it.');
      return false;
    }
  };

  const submit = async () => {
    if (!category || !priority) return;
    if (uploadingScreenshots.length) {
      setError('Please wait for the screenshots to finish processing.');
      return;
    }
    const missingMetadata = screenshots.filter(file => !screenshotMetadata[screenshotKey(file)]);
    if (missingMetadata.length) {
      setError('Remove or retry screenshots that could not be processed before submitting.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await agentTicketsApi.createTicket({
        subject: initialText.trim().slice(0, 120),
        description: [initialText.trim(), details.trim()].filter(Boolean).join('\n\nAdditional details:\n'),
        category,
        priority,
        urls: links,
        screenshots: screenshots.map(file => screenshotMetadata[screenshotKey(file)]),
      });
      await onCreated();
      setPhase('success');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'We could not create the ticket. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const removeScreenshot = (file: File) => {
    const key = screenshotKey(file);
    setScreenshots(current => current.filter(candidate => candidate !== file));
    setScreenshotMetadata(current => { const next = { ...current }; delete next[key]; return next; });
    setScreenshotUploadErrors(current => { const next = { ...current }; delete next[key]; return next; });
    setUploadingScreenshots(current => current.filter(value => value !== key));
  };

  const selectScreenshots = (files: File[]) => {
    const images = files.filter(file => file.type.toLowerCase().startsWith('image/'));
    const rejected = files.filter(file => !file.type.toLowerCase().startsWith('image/'));
    const existingKeys = new Set(screenshots.map(screenshotKey));
    const newImages = images.filter(file => !existingKeys.has(screenshotKey(file)));
    setScreenshots(current => [...current, ...newImages]);
    setAttachmentError(rejected.length ? `${rejected.map(file => file.name).join(', ')} ${rejected.length === 1 ? 'is not an image' : 'are not images'} and cannot be attached.` : '');
    newImages.forEach(file => {
      const key = screenshotKey(file);
      setUploadingScreenshots(current => [...current, key]);
      setScreenshotUploadErrors(current => { const next = { ...current }; delete next[key]; return next; });
      void agentTicketsApi.createImageMetadata(file)
        .then(metadata => setScreenshotMetadata(current => ({ ...current, [key]: metadata })))
        .catch(uploadError => setScreenshotUploadErrors(current => ({ ...current, [key]: uploadError instanceof Error ? uploadError.message : 'Could not process this image.' })))
        .finally(() => setUploadingScreenshots(current => current.filter(value => value !== key)));
    });
  };

  const AttachmentPreviews = ({ removable = false, compact = false }: { removable?: boolean; compact?: boolean }) => (
    <div className={`flex flex-wrap ${compact ? 'gap-2' : 'gap-3'}`}>
      {screenshotPreviews.map(preview => { const key = screenshotKey(preview.file); const uploading = uploadingScreenshots.includes(key); const uploadError = screenshotUploadErrors[key]; return <div key={key} className="group relative min-w-0">
        <button type="button" onClick={() => setOpenPreview({ url: preview.url, name: preview.file.name })} aria-label={`Preview ${preview.file.name}`} className={`block overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:ring-amber-400 ${compact ? 'h-12 w-12' : 'h-20 w-24'}`}>
          <img src={preview.url} alt={preview.file.name} className="h-full w-full object-cover" />
        </button>
        {uploading && <span title="Preparing image metadata" className="absolute inset-0 flex items-center justify-center rounded-xl bg-slate-950/55 text-white"><Loader2 className="h-5 w-5 animate-spin" /></span>}
        {uploadError && <span title={uploadError} className="absolute bottom-1 left-1 rounded-md bg-rose-600 px-1.5 py-1 text-[8px] font-black text-white">Failed</span>}
        {removable && <button type="button" onClick={() => removeScreenshot(preview.file)} aria-label={`Remove ${preview.file.name}`} className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-slate-950 text-white shadow-md transition hover:bg-rose-500"><X className="h-3.5 w-3.5" /></button>}
        {!compact && <p title={preview.file.name} className="mt-1.5 w-24 truncate text-[9px] font-semibold text-slate-500">{preview.file.name}</p>}
      </div>; })}
      {removable && <label aria-label="Add more screenshots" className="flex h-20 w-24 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white text-slate-400 transition hover:border-amber-400 hover:bg-amber-50 hover:text-amber-700"><Plus className="h-5 w-5" /><span className="mt-1 text-[9px] font-black">Add more</span><input type="file" accept="image/*" multiple className="hidden" onChange={event => { selectScreenshots(Array.from(event.target.files || [])); event.currentTarget.value = ''; }} /></label>}
    </div>
  );

  const AssistantMessage = ({ children }: { children: React.ReactNode }) => (
    <div className="flex items-start gap-3 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-left-2 motion-safe:duration-300">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><Sparkles className="h-4 w-4 motion-safe:animate-pulse" /></span>
      <div className="max-w-2xl pt-1 text-sm font-semibold leading-6 text-slate-700">{children}</div>
    </div>
  );

  const Answer = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="ml-auto w-[calc(100%-2.75rem)] max-w-2xl rounded-2xl rounded-tr-md bg-slate-950 px-5 py-4 text-left text-white shadow-lg motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-3 motion-safe:duration-300">
      <p className="text-[8px] font-black uppercase tracking-[0.2em] text-amber-300">{label}</p>
      <div className="mt-2 text-sm font-bold leading-6">{children}</div>
    </div>
  );

  const ThinkingIndicator = () => (
    <div role="status" aria-label="PolicyHQ is thinking" className="flex items-center gap-3 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-left-2 motion-safe:duration-200">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><Sparkles className="h-4 w-4 motion-safe:animate-pulse" /></span>
      <span className="flex items-center gap-1.5 rounded-2xl rounded-tl-md border border-slate-100 bg-white px-4 py-3 shadow-sm">
        <span className="sr-only">PolicyHQ is thinking</span>
        {[0, 1, 2].map(index => <span key={index} style={{ animationDelay: `${index * 160}ms` }} className="h-2 w-2 rounded-full bg-amber-500 motion-safe:animate-bounce" />)}
      </span>
    </div>
  );

  return (
    <div className="h-[calc(100vh-10rem)] min-h-[36rem] overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-slate-100">
      <div className="grid h-full min-h-0 lg:grid-cols-[minmax(0,1fr)_280px]">
        <section className="flex min-h-0 flex-col overflow-hidden border-b border-slate-100 lg:border-b-0 lg:border-r">
          <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-100 px-5 sm:px-7">
            <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-amber-300"><MessageCircleQuestion className="h-4 w-4" /></span><div><h2 className="text-xs font-black text-slate-950">PolicyHQ Support Assistant</h2><p className="text-[9px] font-semibold text-slate-400">Building a request for {firstName}</p></div></div>
            <div className="flex items-center gap-3"><span className="hidden text-[9px] font-black uppercase tracking-wider text-slate-400 sm:inline">Step {Math.min(phaseIndex, 5)} of 5</span><button type="button" onClick={onBack} aria-label="Close assistant" className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"><X className="h-4 w-4" /></button></div>
          </header>

          <div role="log" aria-live="polite" className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain bg-slate-50/45 px-5 py-6 [scrollbar-gutter:stable] sm:px-8">
            <AssistantMessage><p>Hi {firstName} — I’ll help turn your question into a support ticket.</p><p className="mt-2">I’ll ask a few quick questions so the right person has everything needed to help you.</p></AssistantMessage>
            <AssistantMessage>What can we help you with?</AssistantMessage>
            <Answer label="Your request">{initialText}</Answer>

            <AssistantMessage>Thanks — which area does this request relate to?</AssistantMessage>
            {category ? <Answer label="Category">{selectedCategoryLabel}</Answer> : schemaLoading ? <div className="ml-11 flex items-center gap-2 text-xs font-bold text-slate-400"><Loader2 className="h-4 w-4 animate-spin text-amber-500" />Loading categories…</div> : <div className="ml-11 flex max-w-2xl flex-wrap gap-2 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-300">{categoryOptions.map(option => <button key={option.value} type="button" disabled={thinking} onClick={() => { setCategory(option.value); revealNextStep('priority'); }} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-600 shadow-sm transition-all hover:-translate-y-0.5 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800 disabled:pointer-events-none disabled:opacity-50">{option.label}</button>)}</div>}

            {category && phase !== 'category' && <><AssistantMessage>How urgent is this?</AssistantMessage>{priority ? <Answer label="Priority">{selectedPriorityLabel}</Answer> : <div className="ml-11 grid max-w-xl gap-2 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-300 sm:grid-cols-3">{priorityOptions.map(option => { const normalized = normalizePriority(option.value); return <button key={option.value} type="button" disabled={thinking} onClick={() => { setPriority(option.value); revealNextStep('details'); }} className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-amber-300 hover:bg-amber-50 disabled:pointer-events-none disabled:opacity-50"><span className={`block text-xs font-black ${priorityStyles[normalized]}`}>{option.label}</span>{option.description && <span className="mt-1 block text-[9px] font-semibold text-slate-400">{option.description}</span>}</button>; })}</div>}</>}

            {priority && phase !== 'priority' && <><AssistantMessage>Add any details that may help us resolve this faster. Links and screenshots are optional.</AssistantMessage>{phase === 'details' ? <div className="ml-11 max-w-2xl space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-300"><textarea autoFocus value={details} onChange={event => setDetails(event.target.value)} rows={4} placeholder="What happened, what did you expect, and what have you already tried?" className="w-full resize-none rounded-xl bg-slate-50 px-4 py-3 text-sm font-medium leading-6 text-slate-800 outline-none focus:ring-2 focus:ring-amber-300" /><div className="grid gap-2 sm:grid-cols-[1fr_auto]"><div className="flex gap-2"><div className="relative min-w-0 flex-1"><Link2 className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" /><input type="url" value={linkInput} onChange={event => { setLinkInput(event.target.value); setLinkError(''); }} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); addLink(); } }} placeholder="Related link (optional)" className="w-full rounded-xl border border-slate-100 bg-slate-50 py-3 pl-9 pr-3 text-xs font-semibold outline-none focus:border-amber-300" /></div><button type="button" onClick={addLink} aria-label="Add link" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-amber-400 hover:bg-amber-50 hover:text-amber-700"><Plus className="h-4 w-4" /></button></div><label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-[10px] font-black text-slate-500 transition hover:bg-slate-50"><Paperclip className="h-3.5 w-3.5" />Add screenshots<input type="file" accept="image/*" multiple className="hidden" onChange={event => { selectScreenshots(Array.from(event.target.files || [])); event.currentTarget.value = ''; }} /></label></div>{linkError && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{linkError}</p>}{links.length > 0 && <div className="flex flex-wrap gap-2">{links.map(url => <span key={url} className="inline-flex max-w-full items-center gap-2 rounded-full bg-blue-50 py-1.5 pl-3 pr-1.5 text-[10px] font-bold text-blue-700 ring-1 ring-blue-100"><span className="max-w-[260px] truncate">{url}</span><button type="button" onClick={() => setLinks(current => current.filter(value => value !== url))} aria-label={`Remove link ${url}`} className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-blue-400 transition hover:bg-blue-100 hover:text-rose-600"><X className="h-3 w-3" /></button></span>)}</div>}{attachmentError && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{attachmentError}</p>}{screenshotPreviews.length > 0 && <div className="rounded-2xl bg-slate-50 p-3"><p className="mb-3 text-[9px] font-black uppercase tracking-wider text-slate-400">Selected screenshots</p><AttachmentPreviews removable /></div>}<div className="flex justify-end"><button type="button" onClick={() => { if (addLink()) setPhase('review'); }} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-xs font-black text-white transition hover:bg-amber-400 hover:text-slate-950">Review request<ArrowRight className="h-4 w-4" /></button></div></div> : <Answer label="Additional details"><p>{details || 'No additional details provided.'}</p>{links.length > 0 && <div className="mt-3 space-y-1">{links.map(url => <a key={url} href={url} target="_blank" rel="noreferrer" className="block truncate text-xs text-blue-300 underline decoration-blue-300/40 underline-offset-2">{url}</a>)}</div>}{screenshotPreviews.length > 0 && <div className="mt-3"><AttachmentPreviews compact /></div>}</Answer>}</>}

            {thinking && <ThinkingIndicator />}

            {(phase === 'review' || phase === 'success') && <><AssistantMessage>{phase === 'success' ? 'Your ticket is in. The support team will reply inside the ticket.' : 'Here’s the request I’m ready to send. Please review it before submitting.'}</AssistantMessage><div className="ml-11 max-w-2xl overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm"><div className="bg-slate-950 px-5 py-4 text-white"><p className="text-[8px] font-black uppercase tracking-[0.2em] text-amber-300">Support request</p><p className="mt-2 text-sm font-black">{initialText}</p></div><div className="grid gap-px bg-slate-100 sm:grid-cols-3"><div className="bg-white p-4"><p className="text-[8px] font-black uppercase text-slate-400">Category</p><p className="mt-1 text-xs font-black text-slate-800">{selectedCategoryLabel}</p></div><div className="bg-white p-4"><p className="text-[8px] font-black uppercase text-slate-400">Priority</p><p className="mt-1 text-xs font-black text-slate-800">{selectedPriorityLabel}</p></div><div className="bg-white p-4"><p className="text-[8px] font-black uppercase text-slate-400">Attachments</p>{screenshotPreviews.length ? <div className="mt-2"><AttachmentPreviews compact /></div> : <p className="mt-1 text-xs font-black text-slate-800">None</p>}</div></div><div className="p-5"><p className="text-[8px] font-black uppercase text-slate-400">Details</p><p className="mt-2 whitespace-pre-wrap text-xs font-semibold leading-5 text-slate-600">{details || 'No additional details provided.'}</p>{links.length > 0 && <div className="mt-4"><p className="text-[8px] font-black uppercase text-slate-400">Related links</p><div className="mt-2 space-y-1">{links.map(url => <a key={url} href={url} target="_blank" rel="noreferrer" className="block truncate text-xs font-semibold text-blue-600 hover:underline">{url}</a>)}</div></div>}{error && <p role="alert" className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{error}</p>}<div className="mt-5 flex flex-wrap justify-end gap-2">{phase === 'success' ? <button type="button" onClick={onOpenDashboard} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-xs font-black text-white">View my tickets<ChevronRight className="h-4 w-4" /></button> : <><button type="button" onClick={() => setPhase('details')} className="rounded-xl px-4 py-3 text-xs font-black text-slate-500 hover:bg-slate-100">Edit details</button><button type="button" onClick={() => void submit()} disabled={submitting} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-xs font-black text-white transition hover:bg-amber-400 hover:text-slate-950 disabled:opacity-50">{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Submit ticket</button></>}</div></div></div></>}
          </div>
        </section>

        <aside className="hidden min-h-0 overflow-y-auto bg-white p-5 lg:block">
          <p className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-400">Request progress</p>
          <ol className="mt-5 space-y-4">{progressSteps.map((step, index) => { const number = index + 1; const done = phaseIndex > number; const current = phaseIndex === number; return <li key={step} className="flex items-center gap-3"><span className={`flex h-7 w-7 items-center justify-center rounded-full text-[9px] font-black ${done ? 'bg-emerald-100 text-emerald-700' : current ? 'bg-amber-400 text-slate-950' : 'bg-slate-100 text-slate-400'}`}>{done ? <CheckCircle2 className="h-4 w-4" /> : number}</span><span className={`text-[10px] font-black ${current ? 'text-slate-900' : done ? 'text-emerald-700' : 'text-slate-400'}`}>{step}</span></li>; })}</ol>
          <div className="mt-8 rounded-2xl bg-slate-950 p-4 text-white"><p className="text-[8px] font-black uppercase tracking-[0.18em] text-amber-300">Your request</p><p className="mt-2 line-clamp-4 text-xs font-bold leading-5">{initialText}</p></div>
          <button type="button" onClick={onOpenDashboard} className="mt-4 flex w-full items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-[10px] font-black text-slate-600 transition hover:bg-slate-50">My ticket dashboard<ChevronRight className="h-4 w-4" /></button>
        </aside>
      </div>
      {openPreview && <div role="dialog" aria-modal="true" aria-label={`Preview ${openPreview.name}`} className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-950/80 p-6 backdrop-blur-sm" onMouseDown={() => setOpenPreview(null)}><div className="relative max-h-full max-w-5xl" onMouseDown={event => event.stopPropagation()}><img src={openPreview.url} alt={openPreview.name} className="max-h-[82vh] max-w-full rounded-2xl object-contain shadow-2xl" /><p className="mt-3 text-center text-xs font-bold text-white">{openPreview.name}</p><button type="button" onClick={() => setOpenPreview(null)} aria-label="Close image preview" className="absolute -right-3 -top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-900 shadow-lg transition hover:bg-amber-400"><X className="h-5 w-5" /></button></div></div>}
    </div>
  );
};

const QuickEditMenu: React.FC<{
  ariaLabel: string;
  value: string;
  placeholder: string;
  options: QuickEditOption[];
  disabled?: boolean;
  title?: string;
  triggerTone?: string;
  showDots?: boolean;
  searchable?: boolean;
  multiple?: boolean;
  values?: string[];
  onValuesChange?: (values: string[]) => void;
  onChange?: (value: string) => void;
}> = ({ ariaLabel, value, placeholder, options, disabled, title, triggerTone = 'bg-white text-slate-700 ring-slate-200', showDots = true, searchable = false, multiple = false, values = [], onValuesChange, onChange }) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [position, setPosition] = useState({ top: 0, left: 0, width: 190, maxHeight: 300 });
  const anchorRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const selectedValues = multiple ? values : value ? [value] : [];
  const selected = options.find(option => option.value === selectedValues[0]);
  const triggerLabel = selectedValues.length > 1 ? `${selectedValues.length} selected` : selected?.label || placeholder;
  const visibleOptions = searchable && searchQuery.trim()
    ? options.filter(option => option.label.toLowerCase().includes(searchQuery.trim().toLowerCase()))
    : options;

  const openMenu = () => {
    if (disabled || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const width = Math.max(190, rect.width);
    const estimatedHeight = Math.min(340, options.length * 42 + (searchable ? 62 : 12));
    const roomBelow = window.innerHeight - rect.bottom - 12;
    const opensAbove = roomBelow < estimatedHeight && rect.top > roomBelow;
    setPosition({
      top: opensAbove ? Math.max(10, rect.top - estimatedHeight - 7) : rect.bottom + 7,
      left: Math.min(rect.left, window.innerWidth - width - 12),
      width,
      maxHeight: Math.max(120, opensAbove ? rect.top - 18 : roomBelow),
    });
    setSearchQuery('');
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const closeForOutsideClick = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!anchorRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
    };
    const closeForEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        anchorRef.current?.focus();
      }
    };
    const closeForResize = () => setOpen(false);
    const closeForOutsideScroll = (event: Event) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', closeForOutsideClick);
    document.addEventListener('keydown', closeForEscape);
    window.addEventListener('resize', closeForResize);
    window.addEventListener('scroll', closeForOutsideScroll, true);
    return () => {
      document.removeEventListener('pointerdown', closeForOutsideClick);
      document.removeEventListener('keydown', closeForEscape);
      window.removeEventListener('resize', closeForResize);
      window.removeEventListener('scroll', closeForOutsideScroll, true);
    };
  }, [open]);

  return <>
    <button ref={anchorRef} type="button" aria-label={ariaLabel} aria-haspopup="listbox" aria-expanded={open} disabled={disabled} title={title} onClick={event => { event.stopPropagation(); open ? setOpen(false) : openMenu(); }} onKeyDown={event => event.stopPropagation()} className={`inline-flex min-h-8 w-full min-w-[96px] max-w-[165px] items-center justify-between gap-2 rounded-full px-3 py-1.5 text-left text-[10px] font-black ring-1 transition duration-200 hover:-translate-y-px hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-300 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 disabled:ring-slate-100 disabled:hover:translate-y-0 disabled:hover:shadow-none ${triggerTone}`}>
      <span className="flex min-w-0 items-center gap-2">{showDots && <span className={`h-2 w-2 shrink-0 rounded-full ${selected?.dot || 'bg-slate-400'}`} />}<span className="truncate">{triggerLabel}</span></span><ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
    </button>
    {open && createPortal(<div ref={menuRef} role="listbox" aria-label={ariaLabel} style={{ position: 'fixed', top: position.top, left: position.left, width: position.width, maxHeight: position.maxHeight }} onClick={event => event.stopPropagation()} className="z-[500] overflow-y-auto rounded-2xl border border-slate-200/80 bg-white/95 p-1.5 shadow-2xl shadow-slate-900/15 backdrop-blur-xl motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-150">
      {(searchable || (multiple && selectedValues.length > 0)) && <div className="sticky top-0 z-10 mb-1 space-y-1 rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200">
        {searchable && <label className="flex items-center gap-2 rounded-lg px-2 py-1.5"><Search className="h-3.5 w-3.5 shrink-0 text-slate-400" /><span className="sr-only">Search {ariaLabel}</span><input autoFocus value={searchQuery} onChange={event => setSearchQuery(event.target.value)} onKeyDown={event => event.stopPropagation()} placeholder="Search requesters…" className="min-w-0 flex-1 bg-transparent text-[10px] font-bold text-slate-800 outline-none placeholder:text-slate-400" /></label>}
        {multiple && selectedValues.length > 0 && <button type="button" onClick={() => onValuesChange?.([])} className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-50 px-2 py-2 text-[9px] font-black text-slate-500 transition hover:bg-rose-50 hover:text-rose-600"><X className="h-3 w-3" />Clear this filter</button>}
      </div>}
      {visibleOptions.map(option => {
        const optionSelected = selectedValues.includes(option.value);
        return <button key={option.value} type="button" role="option" aria-selected={optionSelected} onClick={() => {
          if (multiple) {
            onValuesChange?.(optionSelected ? selectedValues.filter(item => item !== option.value) : [...selectedValues, option.value]);
          } else {
            setOpen(false);
            if (option.value !== value) onChange?.(option.value);
          }
        }} className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-[10px] font-black transition hover:translate-x-0.5 ${optionSelected ? option.tone || 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'}`}><span className="flex min-w-0 items-center gap-2.5">{showDots && <span className={`h-2.5 w-2.5 shrink-0 rounded-full ring-4 ring-white ${option.dot || 'bg-slate-400'}`} />}<span className="truncate">{option.label}</span></span>{optionSelected && <Check className="h-3.5 w-3.5 shrink-0" />}</button>;
      })}
      {!visibleOptions.length && <div className="px-3 py-6 text-center text-[10px] font-bold text-slate-400">No requesters found</div>}
    </div>, document.body)}
  </>;
};

const ColumnVisibilityMenu: React.FC<{
  columns: Array<{ value: TicketColumnKey; label: string }>;
  visible: TicketColumnKey[];
  onChange: (columns: TicketColumnKey[]) => void;
}> = ({ columns, visible, onChange }) => {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const anchorRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const openMenu = () => {
    if (!anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    setPosition({ top: rect.bottom + 8, left: Math.max(12, Math.min(rect.right - 220, window.innerWidth - 232)) });
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!anchorRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
    };
    const closeEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        anchorRef.current?.focus();
      }
    };
    const closePositionChange = () => setOpen(false);
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeEscape);
    window.addEventListener('resize', closePositionChange);
    window.addEventListener('scroll', closePositionChange, true);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeEscape);
      window.removeEventListener('resize', closePositionChange);
      window.removeEventListener('scroll', closePositionChange, true);
    };
  }, [open]);

  return <>
    <button ref={anchorRef} type="button" aria-haspopup="dialog" aria-expanded={open} onClick={() => open ? setOpen(false) : openMenu()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-[10px] font-black text-slate-600 transition hover:border-amber-300 hover:bg-amber-50"><Columns3 className="h-4 w-4" />Columns</button>
    {open && createPortal(<div ref={menuRef} role="dialog" aria-label="Visible columns" style={{ position: 'fixed', top: position.top, left: position.left, width: 220 }} className="z-[500] overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-900/15 motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-150">
      <p className="px-3 pb-2 pt-1 text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">Visible columns</p>
      <div className="space-y-0.5">{columns.map(column => {
        const shown = visible.includes(column.value);
        return <button key={column.value} type="button" aria-pressed={shown} onClick={() => onChange(shown ? visible.filter(value => value !== column.value) : [...visible, column.value])} className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[10px] font-bold transition ${shown ? 'text-slate-800 hover:bg-slate-50' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}>{shown ? <Eye className="h-3.5 w-3.5 shrink-0" /> : <EyeOff className="h-3.5 w-3.5 shrink-0" />}<span>{column.label}</span></button>;
      })}</div>
    </div>, document.body)}
  </>;
};

const SortableTicketHeader: React.FC<{
  label: string;
  field: TicketSortField;
  sortConfig: TicketSortConfig;
  onSort: (field: TicketSortField) => void;
  className?: string;
}> = ({ label, field, sortConfig, onSort, className = '' }) => {
  const active = sortConfig.key === field;
  return <th aria-sort={active ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none'} className={`px-3 py-4 ${className}`}>
    <button type="button" onClick={() => onSort(field)} className="group inline-flex items-center gap-1.5 whitespace-nowrap text-left transition hover:text-slate-900" title={`Sort by ${label}`}>
      <span>{label}</span>
      <span className={`inline-flex h-4 min-w-4 items-center justify-center rounded-full text-[8px] transition ${active ? 'bg-amber-100 px-1.5 text-amber-800' : 'text-slate-300 group-hover:text-slate-500'}`}>
        {active ? (sortConfig.direction === 'asc' ? 'ASC' : 'DESC') : <ChevronDown className="h-3 w-3" />}
      </span>
    </button>
  </th>;
};

export const AgentTickets: React.FC = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const deepLinkedTicketId = searchParams.get('ticket_id');
  const deepLinkedTab = searchParams.get('tab');
  const deepLinkLoadKey = searchParams.get('load');
  const ticketDetailsRef = useRef<HTMLDivElement>(null);
  const handledDeepLinkRef = useRef('');
  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [isStaff, setIsStaff] = useState(false);
  const [staffChecked, setStaffChecked] = useState(false);
  const [staleCount, setStaleCount] = useState<number | null>(null);
  const [staleOnly, setStaleOnly] = useState(false);
  const [ticketPage, setTicketPage] = useState(1);
  const [ticketPageSize, setTicketPageSize] = useState(25);
  const [sortConfig, setSortConfig] = useState<TicketSortConfig>({ key: 'created_at', direction: 'desc' });
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [pagination, setPagination] = useState({ itemsReceived: 0, curPage: 1, nextPage: null as number | null, prevPage: null as number | null, offset: 0, perPage: 25, itemsTotal: 0, pageTotal: 1 });
  const [tableCategoryOptions, setTableCategoryOptions] = useState<TicketSchemaOption[]>(fallbackCategoryOptions);
  const [tablePriorityOptions, setTablePriorityOptions] = useState<TicketSchemaOption[]>(fallbackPriorityOptions);
  const [tableStatusOptions, setTableStatusOptions] = useState<TicketSchemaOption[]>(fallbackStatusOptions);
  const [handlerOptions, setHandlerOptions] = useState<Array<{ id: string; label: string }>>([]);
  const [requesterOptions, setRequesterOptions] = useState<Array<{ id: string; label: string }>>([]);
  const [visibleColumns, setVisibleColumns] = useState<TicketColumnKey[]>(ticketColumnOptions.map(option => option.value));
  const [quickEditing, setQuickEditing] = useState<string[]>([]);
  const [quickEditError, setQuickEditError] = useState('');
  const [pendingCompletion, setPendingCompletion] = useState<PendingTicketCompletion | null>(null);
  const [resolution, setResolution] = useState('');
  const [resolutionError, setResolutionError] = useState('');
  const [quickFilter, setQuickFilter] = useState<TicketQuickFilter>({ ...EMPTY_QUICK_FILTER });
  const [appliedQuickFilter, setAppliedQuickFilter] = useState<TicketQuickFilter>({ ...EMPTY_QUICK_FILTER });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<TicketFilter>('all');
  const [scope, setScope] = useState<TicketScope>('all');
  const [detailTab, setDetailTab] = useState<DetailTab>('overview');
  const [search, setSearch] = useState('');
  const [composerText, setComposerText] = useState('');
  const [reply, setReply] = useState('');
  const [replyScreenshots, setReplyScreenshots] = useState<File[]>([]);
  const [replyScreenshotMetadata, setReplyScreenshotMetadata] = useState<Record<string, ImageMetadata>>({});
  const [replyUploadingScreenshots, setReplyUploadingScreenshots] = useState<string[]>([]);
  const [replyScreenshotErrors, setReplyScreenshotErrors] = useState<Record<string, string>>({});
  const [replyScreenshotPreviews, setReplyScreenshotPreviews] = useState<Array<{ file: File; url: string }>>([]);
  const [replyAttachmentError, setReplyAttachmentError] = useState('');
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailRefreshKey, setDetailRefreshKey] = useState(0);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState('');
  const [ticketActivity, setTicketActivity] = useState<TicketActivity[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [view, setView] = useState<'home' | 'assistant' | 'dashboard' | 'tickets'>('home');

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const response = await agentTicketsApi.listTickets({
        is_staff: isStaff,
        filter: buildTicketFilter(scope, appliedQuickFilter, user?.id, isStaff, staleOnly),
        search: debouncedSearch || null,
        page: ticketPage,
        per_page: String(ticketPageSize),
        sort: { [sortConfig.key]: sortConfig.direction },
      });
      const next = response.items.map((raw: any) => mapTicket(raw, String(raw?.status || '').trim().toLowerCase() === 'needs attention'));
      setTickets(current => {
        const linkedTicket = deepLinkedTicketId ? current.find(ticket => ticket.id === deepLinkedTicketId) : undefined;
        return linkedTicket && !next.some(ticket => ticket.id === linkedTicket.id) ? [linkedTicket, ...next] : next;
      });
      setPagination({
        itemsReceived: response.itemsReceived,
        curPage: response.curPage,
        nextPage: response.nextPage,
        prevPage: response.prevPage,
        offset: response.offset,
        perPage: response.perPage,
        itemsTotal: response.itemsTotal,
        pageTotal: response.pageTotal,
      });
      setSelectedId(current => current && (next.some(ticket => ticket.id === current) || current === deepLinkedTicketId) ? current : null);
    } catch {
      setTickets([]);
      setSelectedId(null);
      setLoadError('Tickets could not be loaded. Check the ticket API and try again.');
    } finally {
      setLoading(false);
    }
  }, [appliedQuickFilter, debouncedSearch, deepLinkedTicketId, isStaff, scope, sortConfig, staleOnly, ticketPage, ticketPageSize, user?.id]);

  useEffect(() => {
    let cancelled = false;
    agentTicketsApi.isStaff()
      .then(result => { if (!cancelled) setIsStaff(result); })
      .catch(() => { if (!cancelled) setIsStaff(false); })
      .finally(() => { if (!cancelled) setStaffChecked(true); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setTicketPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setTicketPage(1);
  }, [scope]);

  useEffect(() => {
    if (staffChecked) void loadTickets();
  }, [loadTickets, staffChecked]);

  useEffect(() => {
    if (!deepLinkedTicketId || !staffChecked || loading) return;
    setView('tickets');
    const requestedTab: DetailTab = ['overview', 'conversation', 'activity', 'notes'].includes(String(deepLinkedTab))
      ? deepLinkedTab as DetailTab
      : 'overview';
    const safeTab = requestedTab === 'notes' && !isStaff ? 'overview' : requestedTab;
    const deepLinkKey = `${deepLinkedTicketId}:${safeTab}:${deepLinkLoadKey || ''}`;
    if (handledDeepLinkRef.current === deepLinkKey) return;
    handledDeepLinkRef.current = deepLinkKey;
    setDetailTab(safeTab);

    if (tickets.some(ticket => ticket.id === deepLinkedTicketId)) {
      setSelectedId(deepLinkedTicketId);
      setDetailRefreshKey(current => current + 1);
      return;
    }

    let cancelled = false;
    agentTicketsApi.getTicketDetails(deepLinkedTicketId)
      .then(response => {
        if (cancelled) return;
        const detail = unwrapTicketDetail(response);
        const ticket = mapTicket({ ...detail, id: detail?.id || deepLinkedTicketId });
        setTickets(current => current.some(item => item.id === ticket.id) ? current : [ticket, ...current]);
        setSelectedId(ticket.id);
      })
      .catch(() => {
        if (!cancelled) setLoadError('The ticket from this notification could not be opened.');
      });
    return () => { cancelled = true; };
  }, [deepLinkedTab, deepLinkedTicketId, deepLinkLoadKey, isStaff, loading, staffChecked, tickets]);

  useEffect(() => {
    if (!isStaff) {
      setScope('all');
      setStaleOnly(false);
      setDetailTab(current => current === 'notes' ? 'overview' : current);
    }
  }, [isStaff]);

  useEffect(() => {
    if (!staffChecked || !isStaff) {
      setStaleCount(null);
      return;
    }
    let cancelled = false;
    agentTicketsApi.getStaleCount()
      .then(count => { if (!cancelled) setStaleCount(count); })
      .catch(() => { if (!cancelled) setStaleCount(null); });
    return () => { cancelled = true; };
  }, [isStaff, staffChecked]);

  useEffect(() => {
    if (!staffChecked) return;
    let cancelled = false;
    Promise.allSettled([
      agentTicketsApi.getCategoryOptions(),
      agentTicketsApi.getPriorityOptions(),
      agentTicketsApi.getStatusOptions(),
      agentTicketsApi.getHandlerOptions(),
      isStaff ? agentTicketsApi.getRequesterOptions() : Promise.resolve([]),
    ]).then(([categories, priorities, statuses, handlers, requesters]) => {
      if (cancelled) return;
      if (categories.status === 'fulfilled' && categories.value.length) setTableCategoryOptions(categories.value);
      if (priorities.status === 'fulfilled' && priorities.value.length) setTablePriorityOptions(priorities.value);
      if (statuses.status === 'fulfilled' && statuses.value.length) setTableStatusOptions(statuses.value);
      if (handlers.status === 'fulfilled') setHandlerOptions(handlers.value.map(option => ({ id: option.id, label: option.label })));
      if (requesters.status === 'fulfilled') setRequesterOptions(requesters.value);
    });
    return () => { cancelled = true; };
  }, [isStaff, staffChecked]);

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    const loadDetail = async () => {
      setDetailLoading(true);
      try {
        const response = await agentTicketsApi.getTicketDetails(selectedId);
        if (cancelled) return;
        const detail = unwrapTicketDetail(response);
        setTickets(current => current.map(ticket => ticket.id === selectedId ? {
          ...ticket,
          subject: String(detail?.name || detail?.subject || ticket.subject),
          description: String(detail?.description || ticket.description),
          status: normalizeStatus(detail?.status || ticket.status),
          statusValue: String(detail?.status || ticket.statusValue),
          priority: normalizePriority(detail?.priority || ticket.priority),
          priorityValue: String(detail?.priority || ticket.priorityValue),
          category: String(detail?.category || ticket.category),
          updatedAt: dateValue(detail?.updated_at || detail?.last_update || ticket.updatedAt),
          looms: normalizeMediaItems(detail?.looms, 'loom'),
          screenshots: normalizeMediaItems(detail?.screenshots, 'screenshot'),
          resolution: normalizeResolution(detail) || ticket.resolution,
        } : ticket));
      } catch {
        // The list remains usable when the optional detail request fails.
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    };
    void loadDetail();
    return () => { cancelled = true; };
  }, [detailRefreshKey, selectedId]);

  const closeTicketDetails = useCallback(() => {
    setSelectedId(null);
    handledDeepLinkRef.current = '';
    if (searchParams.has('ticket_id') || searchParams.has('tab') || searchParams.has('load')) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('ticket_id');
      nextParams.delete('tab');
      nextParams.delete('load');
      setSearchParams(nextParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleDetailTabChange = useCallback((tab: DetailTab) => {
    setDetailTab(tab);
    setDetailRefreshKey(current => current + 1);
  }, []);

  useEffect(() => {
    if (!selectedId || detailTab !== 'conversation') return;
    let cancelled = false;
    const loadComments = async () => {
      setCommentsLoading(true);
      setCommentsError('');
      try {
        const response = await agentTicketsApi.getTicketComments(selectedId);
        if (cancelled) return;
        const rows = unwrapRows(response);
        const comments = rows.map((comment: any, index: number) => mapComment(comment, index, user?.id));
        setTickets(current => current.map(ticket => ticket.id === selectedId ? {
          ...ticket,
          comments,
          commentCount: comments.length,
        } : ticket));
      } catch {
        if (!cancelled) setCommentsError('Comments could not be loaded. Please try again.');
      } finally {
        if (!cancelled) setCommentsLoading(false);
      }
    };
    void loadComments();
    return () => { cancelled = true; };
  }, [detailRefreshKey, detailTab, selectedId, user?.id]);

  useEffect(() => {
    const previews = replyScreenshots.map(file => ({ file, url: URL.createObjectURL(file) }));
    setReplyScreenshotPreviews(previews);
    return () => previews.forEach(preview => URL.revokeObjectURL(preview.url));
  }, [replyScreenshots]);

  useEffect(() => {
    setReply('');
    setReplyScreenshots([]);
    setReplyScreenshotMetadata({});
    setReplyUploadingScreenshots([]);
    setReplyScreenshotErrors({});
    setReplyAttachmentError('');
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) {
      setTicketActivity([]);
      setActivityError('');
      return;
    }

    if (detailTab !== 'activity') return;
    let cancelled = false;
    const loadActivity = async () => {
      setActivityLoading(true);
      setActivityError('');
      try {
        const response = await agentTicketsApi.getTicketActivity(selectedId);
        if (cancelled) return;
        const record = response && typeof response === 'object' && !Array.isArray(response)
          ? response as Record<string, unknown>
          : null;
        const rows = Array.isArray(response)
          ? response
          : (['activity', 'items', 'data'].map(key => record?.[key]).find(Array.isArray) as unknown[] | undefined) || [];
        const normalized = rows.flatMap((raw, index) => {
          if (!raw || typeof raw !== 'object') return [];
          const item = raw as Record<string, unknown>;
          const log = String(item.log || '').trim();
          if (!log) return [];
          return [{
            id: String(item.id || `${item.created_at || 'activity'}-${index}`),
            createdAt: dateValue(item.created_at),
            log,
            updatedById: String(item.updatedBy_ghl_user_id || ''),
            updatedByName: String(item.updatedBy_ghl_user_name || 'PolicyHQ Support').trim(),
          }];
        }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setTicketActivity(normalized);
      } catch {
        if (!cancelled) {
          setTicketActivity([]);
          setActivityError('Ticket activity could not be loaded.');
        }
      } finally {
        if (!cancelled) setActivityLoading(false);
      }
    };
    void loadActivity();
    return () => { cancelled = true; };
  }, [detailRefreshKey, detailTab, selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (ticketDetailsRef.current && !ticketDetailsRef.current.contains(event.target as Node)) {
        closeTicketDetails();
      }
    };
    document.addEventListener('click', closeOnOutsideClick);
    return () => document.removeEventListener('click', closeOnOutsideClick);
  }, [closeTicketDetails, selectedId]);

  const selectedTicket = tickets.find(ticket => ticket.id === selectedId) || null;
  const counts = useMemo(() => ({
    all: tickets.length,
    attention: tickets.filter(ticket => ticket.needsAttention || ticket.priority === 'High').length,
    open: tickets.filter(ticket => ticket.status !== 'Resolved' && ticket.status !== 'Incomplete').length,
    closed: tickets.filter(ticket => ticket.status === 'Resolved' || ticket.status === 'Incomplete').length,
  }), [tickets]);

  const visibleTickets = useMemo(() => {
    const query = search.trim().toLowerCase();
    return tickets.filter(ticket => {
      const filterMatch = filter === 'all'
        || (filter === 'attention' && (ticket.needsAttention || ticket.priority === 'High'))
        || (filter === 'open' && ticket.status !== 'Resolved' && ticket.status !== 'Incomplete')
        || (filter === 'closed' && (ticket.status === 'Resolved' || ticket.status === 'Incomplete'));
      const searchMatch = !query || `${ticket.reference} ${ticket.subject} ${ticket.description} ${ticket.category}`.toLowerCase().includes(query);
      return filterMatch && searchMatch;
    });
  }, [filter, search, tickets]);

  const commenterNameById = useMemo(() => {
    const directory = new Map<string, string>();
    [...requesterOptions, ...handlerOptions].forEach(option => {
      if (option.id && option.label && option.label !== 'Unnamed requester' && option.label !== 'Unnamed handler') {
        directory.set(String(option.id), option.label);
      }
    });
    if (user?.id) {
      const currentUserName = [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim();
      if (currentUserName) directory.set(String(user.id), currentUserName);
    }
    return directory;
  }, [handlerOptions, requesterOptions, user?.first_name, user?.id, user?.last_name]);

  const commentAuthorName = useCallback((comment: TicketComment) => (
    comment.author || commenterNameById.get(comment.authorId) || 'Support'
  ), [commenterNameById]);

  const quickEditTicket = async (ticket: TicketRecord, field: 'category' | 'priority' | 'status' | 'handler' | 'cohandler', value: string) => {
    if (!isStaff || !value) return;
    if (field === 'cohandler' && !ticket.handlerId) {
      setQuickEditError('Choose a handler before adding a co-handler.');
      return;
    }
    if ((field === 'handler' && value === ticket.coHandlerId) || (field === 'cohandler' && value === ticket.handlerId)) {
      setQuickEditError('Handler and co-handler must be different people.');
      return;
    }
    const editKey = `${ticket.id}-${field}`;
    setQuickEditing(current => [...current, editKey]);
    setQuickEditError('');
    try {
      const person = handlerOptions.find(option => option.id === value);
      const fieldLabels = { category: 'Category', priority: 'Priority', status: 'Status', handler: 'Handler', cohandler: 'Co-handler' };
      const oldValues = {
        category: ticket.category || 'None',
        priority: tablePriorityOptions.find(option => option.value === ticket.priorityValue)?.label || (ticket.priority === 'Intermediate' ? 'Normal' : ticket.priority),
        status: tableStatusOptions.find(option => option.value === ticket.statusValue)?.label || ticket.status,
        handler: ticket.handler || 'Unassigned',
        cohandler: ticket.coHandler || 'None',
      };
      const newValues = {
        category: tableCategoryOptions.find(option => option.value === value)?.label || value,
        priority: tablePriorityOptions.find(option => option.value === value)?.label || value,
        status: tableStatusOptions.find(option => option.value === value)?.label || value,
        handler: person?.label || value,
        cohandler: person?.label || value,
      };
      await agentTicketsApi.quickEditTicket({
        ticket_id: ticket.id,
        category: field === 'category' ? value : ticket.category || null,
        priority: field === 'priority' ? value : ticket.priorityValue || null,
        status: field === 'status' ? value : ticket.statusValue || null,
        handler: field === 'handler' ? value : ticket.handlerId || null,
        cohandler: field === 'cohandler' ? value : ticket.coHandlerId || null,
        log: `${fieldLabels[field]} updated from ${oldValues[field]} to ${newValues[field]}.`,
      });
      setTickets(current => current.map(row => row.id !== ticket.id ? row : {
        ...row,
        ...(field === 'category' ? { category: value } : {}),
        ...(field === 'priority' ? { priorityValue: value, priority: normalizePriority(value) } : {}),
        ...(field === 'status' ? { statusValue: value, status: normalizeStatus(value), needsAttention: value.trim().toLowerCase() === 'needs attention' } : {}),
        ...(field === 'handler' ? { handlerId: value, handler: person?.label || row.handler } : {}),
        ...(field === 'cohandler' ? { coHandlerId: value, coHandler: person?.label || row.coHandler } : {}),
      }));
    } catch (editError) {
      setQuickEditError(editError instanceof Error ? editError.message : 'The ticket could not be updated.');
    } finally {
      setQuickEditing(current => current.filter(key => key !== editKey));
    }
  };

  const updateTicketStatus = (ticket: TicketRecord, status: string, resolutionText?: string) => {
    const resolvedByName = [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim();
    setTickets(current => current.map(row => row.id !== ticket.id ? row : {
      ...row,
      statusValue: status,
      status: normalizeStatus(status),
      needsAttention: status.trim().toLowerCase() === 'needs attention',
      ...(resolutionText ? {
        resolution: {
          resolvedById: String(user?.id || ''),
          solution: resolutionText,
          firstName: String(user?.first_name || ''),
          lastName: String(user?.last_name || ''),
          resolvedByName,
        },
      } : {}),
    }));
  };

  const changeTicketStatus = (ticket: TicketRecord, status: string) => {
    if (isCompletionStatus(status)) {
      setQuickEditError('');
      setResolution('');
      setResolutionError('');
      setPendingCompletion({ ticket, status });
      return;
    }
    void quickEditTicket(ticket, 'status', status);
  };

  const closeCompletionModal = () => {
    if (pendingCompletion && quickEditing.includes(`${pendingCompletion.ticket.id}-status`)) return;
    setPendingCompletion(null);
    setResolution('');
    setResolutionError('');
  };

  const submitTicketCompletion = async () => {
    if (!pendingCompletion) return;
    const resolutionText = resolution.trim();
    if (!resolutionText) {
      setResolutionError('Resolution is required.');
      return;
    }

    const { ticket, status } = pendingCompletion;
    const editKey = `${ticket.id}-status`;
    const oldStatus = tableStatusOptions.find(option => option.value === ticket.statusValue)?.label || ticket.status;
    const newStatus = tableStatusOptions.find(option => option.value === status)?.label || status;
    const log = `Status updated from ${oldStatus} to ${newStatus}.`;
    setQuickEditing(current => [...current, editKey]);
    setQuickEditError('');
    setResolutionError('');
    try {
      await agentTicketsApi.completeTicket({
        ticket_id: ticket.id,
        status,
        log,
        resolution: resolutionText,
      });
      updateTicketStatus(ticket, status, resolutionText);
      setPendingCompletion(null);
      setResolution('');
    } catch (completionError) {
      setResolutionError(completionError instanceof Error ? completionError.message : 'The ticket could not be completed.');
    } finally {
      setQuickEditing(current => current.filter(key => key !== editKey));
    }
  };

  const applyQuickFilter = () => {
    setTicketPage(1);
    setAppliedQuickFilter({ ...quickFilter });
  };

  const clearQuickFilter = () => {
    setTicketPage(1);
    setQuickFilter({ ...EMPTY_QUICK_FILTER });
    setAppliedQuickFilter({ ...EMPTY_QUICK_FILTER });
  };

  const handleTicketSort = (field: TicketSortField) => {
    setTicketPage(1);
    setSortConfig(current => ({
      key: field,
      direction: current.key === field && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const startRequest = (text = composerText) => {
    setComposerText(text);
    setView(text.trim() ? 'assistant' : 'home');
  };

  const selectReplyScreenshots = (files: File[]) => {
    const images = files.filter(file => file.type.toLowerCase().startsWith('image/'));
    const rejected = files.filter(file => !file.type.toLowerCase().startsWith('image/'));
    const existingKeys = new Set(replyScreenshots.map(screenshotKey));
    const newImages = images.filter(file => !existingKeys.has(screenshotKey(file)));
    setReplyScreenshots(current => [...current, ...newImages]);
    setReplyAttachmentError(rejected.length ? `${rejected.map(file => file.name).join(', ')} ${rejected.length === 1 ? 'is not an image' : 'are not images'} and cannot be attached.` : '');
    newImages.forEach(file => {
      const key = screenshotKey(file);
      setReplyUploadingScreenshots(current => [...current, key]);
      setReplyScreenshotErrors(current => { const next = { ...current }; delete next[key]; return next; });
      void agentTicketsApi.createImageMetadata(file)
        .then(metadata => setReplyScreenshotMetadata(current => ({ ...current, [key]: metadata })))
        .catch(uploadError => setReplyScreenshotErrors(current => ({ ...current, [key]: uploadError instanceof Error ? uploadError.message : 'Could not process this image.' })))
        .finally(() => setReplyUploadingScreenshots(current => current.filter(value => value !== key)));
    });
  };

  const removeReplyScreenshot = (file: File) => {
    const key = screenshotKey(file);
    setReplyScreenshots(current => current.filter(candidate => candidate !== file));
    setReplyScreenshotMetadata(current => { const next = { ...current }; delete next[key]; return next; });
    setReplyScreenshotErrors(current => { const next = { ...current }; delete next[key]; return next; });
    setReplyUploadingScreenshots(current => current.filter(value => value !== key));
  };

  const sendReply = async () => {
    if (!selectedTicket || (!reply.trim() && !replyScreenshots.length)) return;
    if (replyUploadingScreenshots.length) {
      setReplyAttachmentError('Please wait for the images to finish processing.');
      return;
    }
    const missingMetadata = replyScreenshots.filter(file => !replyScreenshotMetadata[screenshotKey(file)]);
    if (missingMetadata.length) {
      setReplyAttachmentError('Remove images that could not be processed before sending this reply.');
      return;
    }
    setSendingReply(true);
    setReplyAttachmentError('');
    try {
      const message = reply.trim();
      const screenshots = replyScreenshots.map(file => replyScreenshotMetadata[screenshotKey(file)]);
      const normalizedMessage = message.replace(/\s+/g, ' ').trim();
      const messageSummary = normalizedMessage.length > 140 ? `${normalizedMessage.slice(0, 137)}...` : normalizedMessage;
      const log = messageSummary
        ? `Left a comment: ${messageSummary}`
        : `Left a comment with ${screenshots.length} ${screenshots.length === 1 ? 'screenshot' : 'screenshots'}.`;
      const created = await agentTicketsApi.addComment(
        selectedTicket.id,
        message,
        log,
        screenshots,
      );
      const createdPayload = created?.comment ?? created?.data ?? created;
      const comment = mapComment({
        id: `comment-${Date.now()}`,
        created_at: Date.now(),
        commentedBy_ghl_user_id: user?.id,
        message,
        screenshots,
        ...(createdPayload && typeof createdPayload === 'object' && !Array.isArray(createdPayload) ? createdPayload : {}),
      }, selectedTicket.comments.length, user?.id);
      setTickets(current => current.map(ticket => ticket.id === selectedTicket.id ? { ...ticket, comments: [...ticket.comments, comment], commentCount: ticket.commentCount + 1, updatedAt: comment.timestamp } : ticket));
      setReply('');
      setReplyScreenshots([]);
      setReplyScreenshotMetadata({});
      setReplyScreenshotErrors({});
    } catch (sendError) {
      setReplyAttachmentError(sendError instanceof Error ? sendError.message : 'The reply could not be sent. Please try again.');
    } finally {
      setSendingReply(false);
    }
  };

  const firstName = (user?.firstName || user?.name || 'there').split(' ')[0];
  const categoryQuickOptions: QuickEditOption[] = tableCategoryOptions.map(option => ({ value: option.value, label: option.label }));
  const priorityQuickOptions: QuickEditOption[] = tablePriorityOptions.map(option => ({ ...option, ...priorityQuickTone(option.value) }));
  const statusQuickOptions: QuickEditOption[] = tableStatusOptions.map(option => ({ ...option, ...statusQuickTone(option.value) }));
  const handlerQuickOptions: QuickEditOption[] = handlerOptions.map(option => ({ value: option.id, label: option.label }));
  const requesterQuickOptions: QuickEditOption[] = requesterOptions.map(option => ({ value: option.id, label: option.label }));
  const visibleColumnSet = new Set(visibleColumns);
  const tableColumnCount = visibleColumns.length + 1;
  const SupportNav = ({ active }: { active: 'home' | 'dashboard' | 'tickets' }) => (
    <nav aria-label="Support navigation" className="flex flex-wrap items-center gap-1 rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-slate-100">
      {[
        { key: 'home' as const, label: 'Ask Support', icon: MessageCircleQuestion },
        { key: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard, disabled: true },
        { key: 'tickets' as const, label: 'All Tickets', icon: FileText },
      ].map(item => <button key={item.key} type="button" disabled={item.disabled} aria-disabled={item.disabled || undefined} title={item.disabled ? 'Dashboard coming soon' : undefined} onClick={() => { if (item.disabled) return; if (item.key === 'home') setComposerText(''); setView(item.key); }} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[10px] font-black transition ${item.disabled ? 'cursor-not-allowed text-slate-300' : active === item.key ? 'bg-slate-950 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}><item.icon className={`h-3.5 w-3.5 ${item.disabled ? 'text-slate-300' : active === item.key ? 'text-amber-300' : 'text-slate-400'}`} />{item.label}{item.disabled && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[8px] font-black uppercase tracking-wide text-amber-700 ring-1 ring-amber-200">Coming soon</span>}</button>)}
    </nav>
  );

  if (view === 'home') {
    return (
      <div className="relative flex min-h-[calc(100vh-7rem)] flex-col overflow-hidden rounded-[2rem] bg-slate-50/50 shadow-sm ring-1 ring-slate-100">
        <div className="absolute left-[38%] top-[42%] h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-200/25 blur-3xl motion-safe:animate-pulse [animation-duration:5s]" />
        <div className="absolute left-[62%] top-[58%] h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-100/30 blur-3xl motion-safe:animate-pulse [animation-delay:1.5s] [animation-duration:7s]" />
        <div className="relative z-10 p-4"><SupportNav active="home" /></div>
        <div className="relative flex flex-1 items-center justify-center px-5 py-16">
          <div className="w-full max-w-3xl text-center motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-700">
            <span className="relative mx-auto block h-12 w-12"><span className="absolute inset-0 rounded-2xl bg-amber-300/40 motion-safe:animate-ping [animation-duration:2.6s]" /><span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-amber-300 shadow-lg shadow-slate-900/20 motion-safe:animate-[bounce_3s_ease-in-out_infinite]"><MessageCircleQuestion className="h-5 w-5" /></span></span>
            <p className="mt-5 text-[9px] font-black uppercase tracking-[0.24em] text-amber-600 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500">PolicyHQ Support Assistant</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-700 sm:text-4xl">Hey, {firstName}. What’s up?</h1>
            <p className="mx-auto mt-3 max-w-xl text-sm font-medium leading-6 text-slate-500 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-700">Tell me what you need help with. I’ll ask a few questions and prepare the ticket with you.</p>
            <div className="mx-auto mt-8 flex max-w-2xl items-center rounded-[1.4rem] border border-slate-200 bg-white p-2 shadow-lg shadow-slate-200/60 ring-1 ring-white transition-all duration-300 focus-within:-translate-y-1 focus-within:border-amber-300 focus-within:shadow-2xl focus-within:shadow-amber-200/30 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:duration-700 motion-reduce:transform-none">
              <button type="button" onClick={() => startRequest('')} aria-label="Start a new request" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100"><Plus className="h-5 w-5" /></button>
              <textarea autoFocus aria-label="Ask the support assistant" value={composerText} onChange={event => setComposerText(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && composerText.trim()) { event.preventDefault(); startRequest(); } }} rows={1} placeholder="Ask anything" className="max-h-28 min-h-[40px] flex-1 resize-none bg-transparent px-2 py-2.5 text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400" />
              <button type="button" onClick={() => startRequest()} disabled={!composerText.trim()} aria-label="Send to support assistant" className="group flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white transition-all duration-300 hover:scale-105 hover:bg-amber-400 hover:text-slate-950 active:scale-95 disabled:bg-slate-100 disabled:text-slate-300"><ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-0.5" /></button>
            </div>
            <button type="button" disabled aria-disabled="true" title="Dashboard coming soon" className="mx-auto mt-5 inline-flex cursor-not-allowed items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-[10px] font-black text-slate-300 shadow-sm"><LayoutDashboard className="h-3.5 w-3.5" />Dashboard<span className="rounded-full bg-amber-50 px-2 py-0.5 text-[8px] font-black uppercase tracking-wide text-amber-700 ring-1 ring-amber-200">Coming soon</span></button>
            <div className="mx-auto mt-6 flex max-w-3xl flex-wrap justify-center gap-2">{quickPrompts.map((prompt, index) => <button key={prompt} type="button" onClick={() => startRequest(prompt)} style={{ animationDelay: `${300 + index * 65}ms`, animationFillMode: 'both' }} className="rounded-full border border-slate-200 bg-white px-3.5 py-2 text-[10px] font-bold text-slate-500 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800 hover:shadow-md active:translate-y-0 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-reduce:transform-none">{prompt}</button>)}</div>
          </div>
        </div>
        <p className="relative pb-5 text-center text-[9px] font-semibold text-slate-400">PolicyHQ Support · responses come back inside the ticket</p>
      </div>
    );
  }

  if (view === 'assistant') {
    return <div className="space-y-4"><SupportNav active="home" /><RequestConversation initialText={composerText} firstName={firstName} onBack={() => setView('home')} onCreated={loadTickets} onOpenDashboard={() => setView('tickets')} /></div>;
  }

  if (view === 'dashboard') {
    const recentTickets = tickets.slice(0, 5);
    return (
      <div className="min-h-[calc(100vh-7rem)] space-y-5 pb-8 font-sans">
        <SupportNav active="dashboard" />
        <section className="flex flex-col justify-between gap-4 rounded-[2rem] bg-slate-950 px-6 py-6 text-white shadow-lg sm:flex-row sm:items-center"><div><p className="text-[9px] font-black uppercase tracking-[0.22em] text-amber-300">Support dashboard</p><h1 className="mt-1 text-2xl font-black">How’s it looking?</h1><p className="mt-1 text-xs font-medium text-slate-400">A quick view of your current support activity.</p></div><button type="button" onClick={() => { setComposerText(''); setView('home'); }} className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-3 text-xs font-black text-slate-950 transition hover:bg-amber-300"><Plus className="h-4 w-4" />Ask for help</button></section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { key: 'attention' as const, label: 'Needs attention', value: counts.attention, note: 'Urgent or flagged', icon: AlertCircle, colors: 'bg-rose-50 text-rose-700 ring-rose-100' },
            { key: 'open' as const, label: 'Open requests', value: counts.open, note: 'Waiting or in progress', icon: Inbox, colors: 'bg-blue-50 text-blue-700 ring-blue-100' },
            { key: 'closed' as const, label: 'Completed', value: counts.closed, note: 'Resolved requests', icon: TicketCheck, colors: 'bg-emerald-50 text-emerald-700 ring-emerald-100' },
            { key: 'all' as const, label: 'All tickets', value: counts.all, note: 'Your complete history', icon: LayoutDashboard, colors: 'bg-amber-50 text-amber-700 ring-amber-100' },
          ].map(card => <button key={card.key} type="button" onClick={() => { setFilter(card.key); setView('tickets'); }} className="flex items-center gap-4 rounded-[1.5rem] bg-white p-5 text-left shadow-sm ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:ring-slate-300 hover:shadow-md"><span className={`flex h-11 w-11 items-center justify-center rounded-2xl ring-1 ${card.colors}`}><card.icon className="h-5 w-5" /></span><span><span className="block text-2xl font-black text-slate-950">{loading ? '—' : card.value}</span><span className="block text-xs font-black text-slate-800">{card.label}</span><span className="mt-0.5 block text-[10px] font-semibold text-slate-400">{card.note}</span></span></button>)}
        </section>

        {loadError && <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800 sm:flex-row sm:items-center sm:justify-between"><span className="flex items-center gap-2"><AlertCircle className="h-4 w-4 shrink-0" />{loadError}</span><button type="button" onClick={() => void loadTickets()} className="inline-flex items-center gap-1.5 font-black"><RotateCcw className="h-3.5 w-3.5" />Retry</button></div>}

        <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-100"><div className="flex items-center justify-between gap-4"><div><p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-600">Most recent</p><h2 className="mt-1 text-xl font-black text-slate-950">Latest requests</h2></div><button type="button" onClick={() => { setFilter('all'); setView('tickets'); }} className="inline-flex items-center gap-1 text-[10px] font-black text-slate-500 hover:text-slate-900">See all<ChevronRight className="h-4 w-4" /></button></div><div className="mt-5 divide-y divide-slate-100">{loading ? <div className="flex h-32 items-center justify-center text-slate-400"><Loader2 className="h-6 w-6 animate-spin text-amber-500" /></div> : recentTickets.length ? recentTickets.map(ticket => <button key={ticket.id} type="button" onClick={() => { setSelectedId(ticket.id); setView('tickets'); }} className="flex w-full items-center gap-4 py-4 text-left transition hover:bg-slate-50"><span className={`h-2.5 w-2.5 shrink-0 rounded-full ${ticket.status === 'Resolved' ? 'bg-emerald-400' : ticket.priority === 'High' ? 'bg-rose-400' : 'bg-blue-400'}`} /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-black text-slate-800">{ticket.subject}</span><span className="mt-1 block text-[10px] font-semibold text-slate-400">{ticket.reference} · {ticket.category}</span></span><span className={`rounded-full px-2.5 py-1 text-[9px] font-black ring-1 ${statusStyles[ticket.status]}`}>{ticket.status}</span><span className="hidden text-[10px] font-bold text-slate-400 sm:block">{formatDate(ticket.updatedAt)}</span><ChevronRight className="h-4 w-4 text-slate-300" /></button>) : <div className="py-14 text-center"><p className="text-sm font-black text-slate-700">No tickets yet</p><p className="mt-1 text-xs font-medium text-slate-400">Your submitted requests will appear here.</p></div>}</div></section>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-7rem)] space-y-5 pb-8 font-sans">
      <SupportNav active="tickets" />
      <section className="flex flex-col justify-between gap-4 rounded-[2rem] bg-slate-950 px-6 py-5 text-white shadow-lg sm:flex-row sm:items-center"><div><p className="text-[9px] font-black uppercase tracking-[0.22em] text-amber-300">All tickets</p><h1 className="mt-1 text-2xl font-black">Request history</h1><p className="mt-1 text-xs font-medium text-slate-400">Search tickets and open a request to see its conversation.</p></div><button type="button" onClick={() => { setComposerText(''); setView('home'); }} className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-3 text-xs font-black text-slate-950 transition hover:bg-amber-300"><Plus className="h-4 w-4" />Ask for help</button></section>

      {loadError && <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800 sm:flex-row sm:items-center sm:justify-between"><span className="flex items-center gap-2"><AlertCircle className="h-4 w-4 shrink-0" />{loadError}</span><button type="button" onClick={() => void loadTickets()} className="inline-flex items-center gap-1.5 font-black"><RotateCcw className="h-3.5 w-3.5" />Retry</button></div>}

      <div className="flex min-w-0 items-start gap-4 overflow-x-hidden transition-all duration-300">
      <section className="min-w-0 flex-1 overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-slate-100">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-600">Ticket records</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-black text-slate-950">{filter === 'all' ? pagination.itemsTotal : visibleTickets.length} tickets matching current view</h2>
              {isStaff && staleCount !== null && <button type="button" aria-pressed={staleOnly} onClick={() => { setTicketPage(1); setStaleOnly(current => !current); }} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-black ring-1 transition ${staleOnly ? 'bg-rose-600 text-white ring-rose-600 shadow-sm' : 'bg-rose-50 text-rose-600 ring-rose-200 hover:bg-rose-100'}`} title={staleOnly ? 'Show all tickets' : 'Show unresolved tickets older than 24 hours'}><AlertCircle className="h-3 w-3" />{staleCount} stale</button>}
            </div>
            {isStaff && <div className="mt-3 flex flex-wrap items-center gap-1.5">{([
              { key: 'all' as const, label: 'All' },
              { key: 'mine' as const, label: 'Mine' },
              { key: 'handling' as const, label: "I'm handling" },
              { key: 'cohandling' as const, label: 'Co-handling' },
            ]).map(item => <button key={item.key} type="button" onClick={() => setScope(item.key)} className={`rounded-full px-3 py-1.5 text-[9px] font-black ring-1 transition ${scope === item.key ? 'bg-slate-950 text-white ring-slate-950' : 'bg-white text-slate-500 ring-slate-200 hover:ring-amber-300'}`}>{item.label}</button>)}</div>}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="relative block min-w-[260px]"><Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search tickets…" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-xs font-bold text-slate-800 outline-none transition focus:border-amber-300 focus:bg-white focus:ring-4 focus:ring-amber-50" /></label>
            <ColumnVisibilityMenu columns={ticketColumnOptions} visible={visibleColumns} onChange={setVisibleColumns} />
            <button type="button" disabled title="Ticket export is not connected yet" className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-[10px] font-black text-slate-400"><Download className="h-4 w-4" />Export</button>
          </div>
        </div>

        <div className="overflow-x-auto border-b border-slate-100 bg-white px-5 py-3">
          <div className={`grid min-w-[1250px] items-center overflow-visible rounded-[1.35rem] border border-slate-200 bg-slate-50/70 shadow-sm transition focus-within:border-amber-300 focus-within:bg-white focus-within:shadow-md ${isStaff ? 'grid-cols-[120px_145px_minmax(190px,1fr)_150px_150px_160px_180px_180px_142px]' : 'grid-cols-[120px_145px_150px_160px_180px_180px_142px]'}`}>
            <div className="flex h-full items-center gap-2 border-r border-slate-200 px-4 py-3 text-[9px] font-black uppercase tracking-[0.16em] text-slate-500"><span className="h-2 w-2 rounded-full bg-amber-400" />Quick filter</div>
            <div className="border-r border-slate-200 px-2 py-2"><label className="relative block"><TicketCheck className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" /><input aria-label="Filter by ticket reference" inputMode="numeric" value={quickFilter.reference} onChange={event => setQuickFilter(current => ({ ...current, reference: event.target.value }))} onKeyDown={event => { if (event.key === 'Enter') applyQuickFilter(); }} placeholder="Reference" className="min-h-8 w-full rounded-full bg-white py-2 pl-8 pr-7 text-[10px] font-black text-slate-700 outline-none ring-1 ring-slate-200 transition placeholder:text-slate-400 focus:ring-2 focus:ring-amber-300" />{quickFilter.reference && <button type="button" onClick={() => setQuickFilter(current => ({ ...current, reference: '' }))} aria-label="Clear ticket reference filter" className="absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-800"><X className="h-3 w-3" /></button>}</label></div>
            {isStaff && <div className="border-r border-slate-200 px-2 py-2"><QuickEditMenu ariaLabel="Choose ticket requester filter" value="" values={quickFilter.requesterId} multiple placeholder="Requester" options={requesterQuickOptions} showDots={false} searchable onValuesChange={values => setQuickFilter(current => ({ ...current, requesterId: values }))} /></div>}
            <div className="border-r border-slate-200 px-2 py-2"><QuickEditMenu ariaLabel="Choose ticket category filter" value="" values={quickFilter.category} multiple placeholder="Category" options={categoryQuickOptions} showDots={false} onValuesChange={values => setQuickFilter(current => ({ ...current, category: values }))} /></div>
            <div className="border-r border-slate-200 px-2 py-2"><QuickEditMenu ariaLabel="Choose ticket priority filter" value="" values={quickFilter.priority} multiple placeholder="Priority" options={priorityQuickOptions} triggerTone={quickFilter.priority.length === 1 ? priorityQuickTone(quickFilter.priority[0]).tone : 'bg-white text-slate-700 ring-slate-200'} onValuesChange={values => setQuickFilter(current => ({ ...current, priority: values }))} /></div>
            <div className="border-r border-slate-200 px-2 py-2"><QuickEditMenu ariaLabel="Choose ticket status filter" value="" values={quickFilter.status} multiple placeholder="Status" options={statusQuickOptions} triggerTone={quickFilter.status.length === 1 ? statusQuickTone(quickFilter.status[0]).tone : 'bg-white text-slate-700 ring-slate-200'} onValuesChange={values => setQuickFilter(current => ({ ...current, status: values }))} /></div>
            <div className="border-r border-slate-200 px-2 py-2"><QuickEditMenu ariaLabel="Choose ticket handler filter" value="" values={quickFilter.handler} multiple placeholder="Handler" options={handlerQuickOptions} showDots={false} onValuesChange={values => setQuickFilter(current => ({ ...current, handler: values }))} /></div>
            <div className="border-r border-slate-200 px-2 py-2"><QuickEditMenu ariaLabel="Choose ticket co-handler filter" value="" values={quickFilter.cohandler} multiple placeholder="Co-handler" options={handlerQuickOptions} showDots={false} onValuesChange={values => setQuickFilter(current => ({ ...current, cohandler: values }))} /></div>
            <div className="flex items-center gap-1.5 px-2"><button type="button" onClick={clearQuickFilter} className="inline-flex flex-1 items-center justify-center rounded-full bg-white px-3 py-2 text-[10px] font-black text-slate-500 ring-1 ring-slate-200 transition hover:bg-slate-100 hover:text-slate-900">Clear</button><button type="button" onClick={applyQuickFilter} className="inline-flex flex-1 items-center justify-center rounded-full bg-slate-950 px-3 py-2 text-[10px] font-black text-white transition hover:-translate-y-px hover:bg-amber-400 hover:text-slate-950 hover:shadow-md active:translate-y-0">Apply</button></div>
          </div>
        </div>

        {quickEditError && <div role="alert" className="flex items-center justify-between gap-3 border-b border-rose-100 bg-rose-50 px-5 py-3 text-[10px] font-bold text-rose-700"><span className="flex items-center gap-2"><AlertCircle className="h-4 w-4 shrink-0" />{quickEditError}</span><button type="button" onClick={() => setQuickEditError('')} aria-label="Dismiss ticket update error" className="rounded-lg p-1 text-rose-500 transition hover:bg-rose-100 hover:text-rose-800"><X className="h-3.5 w-3.5" /></button></div>}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1720px] border-collapse text-left">
            <thead className="bg-white text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
              <tr className="border-b border-slate-100">
                <th className="w-12 px-5 py-4"><span className="block h-4 w-4 rounded border border-slate-200" /></th>
                {visibleColumnSet.has('reference') && <SortableTicketHeader label="Ref" field="ticket_reference" sortConfig={sortConfig} onSort={handleTicketSort} />}
                {visibleColumnSet.has('sla') && <SortableTicketHeader label="SLA" field="created_at" sortConfig={sortConfig} onSort={handleTicketSort} />}
                {visibleColumnSet.has('requester') && <SortableTicketHeader label="Requester" field="createdBy_ghl_user_name" sortConfig={sortConfig} onSort={handleTicketSort} />}
                {visibleColumnSet.has('question') && <SortableTicketHeader label="Question" field="name" sortConfig={sortConfig} onSort={handleTicketSort} className="min-w-[300px]" />}
                {visibleColumnSet.has('category') && <SortableTicketHeader label="Category" field="category" sortConfig={sortConfig} onSort={handleTicketSort} />}
                {visibleColumnSet.has('priority') && <SortableTicketHeader label="Priority" field="priority" sortConfig={sortConfig} onSort={handleTicketSort} />}
                {visibleColumnSet.has('status') && <SortableTicketHeader label="Status" field="status" sortConfig={sortConfig} onSort={handleTicketSort} />}
                {visibleColumnSet.has('handler') && <SortableTicketHeader label="Handler" field="assigned_ghl_user_name" sortConfig={sortConfig} onSort={handleTicketSort} />}
                {visibleColumnSet.has('cohandler') && <SortableTicketHeader label="Co-handler" field="cohandler_ghl_user_name" sortConfig={sortConfig} onSort={handleTicketSort} />}
                {visibleColumnSet.has('created') && <SortableTicketHeader label="Created" field="created_at" sortConfig={sortConfig} onSort={handleTicketSort} />}
                {visibleColumnSet.has('updated') && <SortableTicketHeader label="Updated" field="updated_at" sortConfig={sortConfig} onSort={handleTicketSort} />}
                {visibleColumnSet.has('resolution') && <th className="min-w-[210px] px-3 py-4">Resolution</th>}
                {visibleColumnSet.has('replies') && <th className="px-5 py-4 text-center">Replies</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan={tableColumnCount} className="h-64 text-center"><Loader2 className="mx-auto h-7 w-7 animate-spin text-amber-500" /><span className="mt-3 block text-[10px] font-black uppercase tracking-wider text-slate-400">Loading tickets</span></td></tr> : visibleTickets.length ? visibleTickets.map(ticket => <tr key={ticket.id} onClick={event => { event.stopPropagation(); setSelectedId(ticket.id); setDetailTab('overview'); }} tabIndex={0} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedId(ticket.id); setDetailTab('overview'); } }} className="cursor-pointer bg-white text-xs text-slate-600 transition hover:bg-amber-50/50 focus:bg-amber-50/50 focus:outline-none">
                <td className="px-5 py-4"><span className="block h-4 w-4 rounded border border-slate-200 bg-white" /></td>
                {visibleColumnSet.has('reference') && <td className="px-3 py-4 font-mono text-[10px] font-bold text-slate-500">{ticket.reference}</td>}
                {visibleColumnSet.has('sla') && <td className="px-3 py-4"><span aria-label={isSlaBreached(ticket) ? 'SLA breached' : 'SLA on track'} title={isSlaBreached(ticket) ? 'SLA breached: unresolved for more than 24 hours' : 'SLA on track'} className={`block h-2.5 w-2.5 rounded-full ${isSlaBreached(ticket) ? 'bg-rose-500 shadow-[0_0_0_4px_rgba(244,63,94,0.12)]' : 'bg-slate-200'}`} /></td>}
                {visibleColumnSet.has('requester') && <td className="px-3 py-4"><span className="block whitespace-nowrap font-black text-slate-800">{ticket.requesterName || 'Agent'}</span>{isStaff && <span className="mt-0.5 block max-w-[170px] truncate text-[9px] font-semibold text-slate-400" title={ticket.requesterEmail || undefined}>{ticket.requesterEmail || 'Email unavailable'}</span>}</td>}
                {visibleColumnSet.has('question') && <td className="px-3 py-4"><span className="block font-black text-slate-900">{ticket.subject}</span><span className="mt-1 block max-w-md truncate text-[10px] font-medium text-slate-400">{ticket.description || 'No additional details'}</span></td>}
                {visibleColumnSet.has('category') && <td className="px-3 py-4">{isStaff ? <QuickEditMenu ariaLabel={`Edit category for ${ticket.reference}`} value={ticket.category} placeholder={ticket.category} options={includeCurrentQuickOption(categoryQuickOptions, ticket.category, ticket.category)} disabled={quickEditing.includes(`${ticket.id}-category`)} showDots={false} onChange={value => void quickEditTicket(ticket, 'category', value)} /> : <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-black text-slate-700">{ticket.category}</span>}</td>}
                {visibleColumnSet.has('priority') && <td className="px-3 py-4">{isStaff ? <QuickEditMenu ariaLabel={`Edit priority for ${ticket.reference}`} value={ticket.priorityValue} placeholder={ticket.priority === 'Intermediate' ? 'Normal' : ticket.priority} options={includeCurrentQuickOption(priorityQuickOptions, ticket.priorityValue, ticket.priority === 'Intermediate' ? 'Normal' : ticket.priority, priorityQuickTone(ticket.priorityValue))} disabled={quickEditing.includes(`${ticket.id}-priority`)} triggerTone={priorityQuickTone(ticket.priorityValue).tone} onChange={value => void quickEditTicket(ticket, 'priority', value)} /> : <span className={`whitespace-nowrap text-[10px] font-black ${priorityStyles[ticket.priority]}`}>{ticket.priority === 'Intermediate' ? 'Normal' : ticket.priority}</span>}</td>}
                {visibleColumnSet.has('status') && <td className="px-3 py-4">{isStaff ? <QuickEditMenu ariaLabel={`Edit status for ${ticket.reference}`} value={ticket.statusValue} placeholder={ticket.status} options={includeCurrentQuickOption(statusQuickOptions, ticket.statusValue, ticket.status, statusQuickTone(ticket.statusValue))} disabled={quickEditing.includes(`${ticket.id}-status`)} triggerTone={statusQuickTone(ticket.statusValue).tone} onChange={value => changeTicketStatus(ticket, value)} /> : <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[9px] font-black ring-1 ${statusStyles[ticket.status]}`}>{ticket.status}</span>}</td>}
                {visibleColumnSet.has('handler') && <td className="px-3 py-4">{isStaff ? <QuickEditMenu ariaLabel={`Edit handler for ${ticket.reference}`} value={ticket.handlerId} placeholder={ticket.handler || 'Choose handler'} options={includeCurrentQuickOption(handlerQuickOptions.filter(option => option.value !== ticket.coHandlerId), ticket.handlerId, ticket.handler || 'Current handler')} disabled={quickEditing.includes(`${ticket.id}-handler`)} showDots={false} onChange={value => void quickEditTicket(ticket, 'handler', value)} /> : <span className="whitespace-nowrap text-[10px] font-bold text-slate-600">{ticket.handler || 'Unassigned'}</span>}</td>}
                {visibleColumnSet.has('cohandler') && <td className="px-3 py-4">{isStaff ? <QuickEditMenu ariaLabel={`Edit co-handler for ${ticket.reference}`} value={ticket.coHandlerId} placeholder={ticket.handlerId ? (ticket.coHandler || 'Add co-handler') : 'Choose handler first'} options={includeCurrentQuickOption(handlerQuickOptions.filter(option => option.value !== ticket.handlerId), ticket.coHandlerId, ticket.coHandler || 'Current co-handler')} disabled={!ticket.handlerId || quickEditing.includes(`${ticket.id}-cohandler`)} title={!ticket.handlerId ? 'Choose a handler before adding a co-handler' : undefined} showDots={false} onChange={value => void quickEditTicket(ticket, 'cohandler', value)} /> : <span className="whitespace-nowrap text-[10px] font-bold text-slate-500">{ticket.coHandler || '—'}</span>}</td>}
                {visibleColumnSet.has('created') && <td className="whitespace-nowrap px-3 py-4 text-[10px] font-bold text-slate-500">{formatMountainDateTime(ticket.createdAt)}</td>}
                {visibleColumnSet.has('updated') && <td className="whitespace-nowrap px-3 py-4 text-[10px] font-bold text-slate-500">{formatMountainDateTime(ticket.updatedAt)}</td>}
                {visibleColumnSet.has('resolution') && <td className="px-3 py-4">{ticket.resolution ? <div className="max-w-[260px]" title={[ticket.resolution.solution, ticket.resolution.resolvedByName ? `Resolved by ${ticket.resolution.resolvedByName}` : ''].filter(Boolean).join(' · ')}><span className="block truncate text-[10px] font-semibold text-slate-600">{ticket.resolution.solution || 'Resolved'}</span>{(ticket.resolution.resolvedByName || ticket.resolution.resolvedById) && <span className="mt-0.5 block truncate text-[9px] font-bold text-slate-400">Resolved by {ticket.resolution.resolvedByName || ticket.resolution.resolvedById}</span>}</div> : <span className="text-[10px] font-semibold text-slate-400">—</span>}</td>}
                {visibleColumnSet.has('replies') && <td className="px-5 py-4 text-center"><span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400"><MessageSquare className="h-3.5 w-3.5" />{ticket.commentCount}</span></td>}
              </tr>) : <tr><td colSpan={tableColumnCount} className="h-64 text-center"><FileText className="mx-auto h-7 w-7 text-slate-300" /><p className="mt-3 text-sm font-black text-slate-700">No tickets match this view</p><p className="mt-1 text-xs font-medium text-slate-400">Try another ownership, status, or search filter.</p></td></tr>}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col gap-3 border-t border-slate-100 bg-white px-5 py-4 text-[10px] font-bold text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3"><span>{pagination.itemsTotal ? `Showing ${pagination.offset + 1}–${Math.min(pagination.offset + pagination.itemsReceived, pagination.itemsTotal)} of ${pagination.itemsTotal}` : 'No tickets to show'}</span><label className="inline-flex items-center gap-2">Rows per page<select aria-label="Rows per page" value={ticketPageSize} disabled={loading} onChange={event => { setTicketPageSize(Number(event.target.value)); setTicketPage(1); }} className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[10px] font-black text-slate-700 outline-none transition focus:border-amber-300 disabled:opacity-50"><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option></select></label></div>
          <div className="flex items-center gap-2"><button type="button" onClick={() => pagination.prevPage && setTicketPage(pagination.prevPage)} disabled={!pagination.prevPage || loading} className="rounded-lg border border-slate-200 px-3 py-2 transition hover:border-amber-300 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-40">Previous</button><span className="min-w-20 text-center text-slate-700">Page {pagination.curPage} of {pagination.pageTotal}</span><button type="button" onClick={() => pagination.nextPage && setTicketPage(pagination.nextPage)} disabled={!pagination.nextPage || loading} className="rounded-lg border border-slate-200 px-3 py-2 transition hover:border-amber-300 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-40">Next</button></div>
        </div>
      </section>

      <div ref={ticketDetailsRef} className={`shrink-0 self-start transition-all duration-300 ease-in-out ${selectedTicket ? 'w-[42%] min-w-0 max-w-[42rem] opacity-100' : 'pointer-events-none w-0 opacity-0'}`}>
      {selectedTicket && <aside className="flex max-h-[calc(100vh-6rem)] min-h-[620px] w-full flex-col overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-slate-100" aria-label={`Ticket ${selectedTicket.reference}`}>
          <div className="border-b border-slate-100 px-6 py-5 sm:px-8"><div className="flex items-start justify-between gap-5"><div><div className="flex flex-wrap items-center gap-2"><span className="rounded-lg bg-slate-950 px-2.5 py-1 font-mono text-[10px] font-black text-white">{selectedTicket.reference}</span><span className={`text-[10px] font-black ${priorityStyles[selectedTicket.priority]}`}>{selectedTicket.priority === 'Intermediate' ? 'Normal priority' : `${selectedTicket.priority} priority`}</span></div><h2 className="mt-4 text-2xl font-black tracking-tight text-slate-950">{selectedTicket.subject}</h2><div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[10px] font-bold text-slate-400"><span className="flex items-center gap-1.5"><Tag className="h-3.5 w-3.5" />{selectedTicket.category}</span><span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />Created {formatDate(selectedTicket.createdAt)}</span><span className="flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" />Updated {formatDate(selectedTicket.updatedAt)}</span></div></div><button type="button" onClick={closeTicketDetails} aria-label="Close ticket details" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500 transition hover:bg-slate-950 hover:text-white"><X className="h-5 w-5" /></button></div></div>
          {isStaff && <div className="shrink-0 border-b border-slate-100 bg-white px-6 py-4 sm:px-8"><p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">Update status</p><div className="mt-2 max-w-xs"><QuickEditMenu ariaLabel={`Update status for ${selectedTicket.reference}`} value={selectedTicket.statusValue} placeholder={selectedTicket.status} options={includeCurrentQuickOption(statusQuickOptions, selectedTicket.statusValue, selectedTicket.status, statusQuickTone(selectedTicket.statusValue))} disabled={quickEditing.includes(`${selectedTicket.id}-status`)} triggerTone={statusQuickTone(selectedTicket.statusValue).tone} onChange={value => changeTicketStatus(selectedTicket, value)} /></div></div>}
          <div className="shrink-0 border-b border-slate-100 bg-white px-6 py-3 sm:px-8"><div role="tablist" aria-label="Ticket details" className="inline-flex rounded-xl bg-slate-50 p-1">{(['overview', 'conversation', 'activity', ...(isStaff ? ['notes' as const] : [])] as DetailTab[]).map(tab => <button key={tab} type="button" role="tab" aria-selected={detailTab === tab} onClick={() => handleDetailTabChange(tab)} className={`rounded-lg px-3 py-2 text-[10px] font-black transition ${detailTab === tab ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}>{tab[0].toUpperCase() + tab.slice(1)}</button>)}</div></div>
          <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/60 px-5 py-6 sm:px-8">
            {detailLoading && <div className="mb-4 flex items-center gap-2 text-[10px] font-bold text-slate-400"><Loader2 className="h-3.5 w-3.5 animate-spin" />Refreshing ticket details</div>}
            {detailTab === 'overview' && <section aria-label="Request overview" className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
              <div className="flex items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600"><FileText className="h-4 w-4" /></span><div><h3 className="text-xs font-black text-slate-900">Request details</h3><p className="mt-0.5 text-[9px] font-semibold text-slate-400">Original message and supporting attachments</p></div></div>
              <div className="mt-4 border-l-2 border-amber-300 pl-4"><p className="whitespace-pre-wrap text-xs font-medium leading-6 text-slate-700">{originalRequestBody(selectedTicket)}</p></div>
              <div className={`mt-5 rounded-xl px-4 py-3 ring-1 ${selectedTicket.resolution ? 'bg-emerald-50 ring-emerald-100' : 'bg-slate-50 ring-slate-100'}`}>
                <p className={`text-[9px] font-black uppercase tracking-[0.16em] ${selectedTicket.resolution ? 'text-emerald-700' : 'text-slate-400'}`}>Resolution</p>
                {selectedTicket.resolution ? <>
                  <p className="mt-2 whitespace-pre-wrap text-xs font-semibold leading-5 text-slate-700">{selectedTicket.resolution.solution || 'Resolved'}</p>
                  {(selectedTicket.resolution.resolvedByName || selectedTicket.resolution.resolvedById) && <p className="mt-2 text-[10px] font-bold text-emerald-700">Resolved by {selectedTicket.resolution.resolvedByName || selectedTicket.resolution.resolvedById}</p>}
                </> : <p className="mt-2 text-[11px] font-semibold text-slate-400">No resolution has been recorded yet.</p>}
              </div>
              {(selectedTicket.looms.length > 0 || selectedTicket.screenshots.length > 0) && <div className="mt-5 border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between gap-3"><p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">Attachments</p><span className="text-[9px] font-bold text-slate-400">{selectedTicket.screenshots.length + selectedTicket.looms.length} total</span></div>
                {selectedTicket.looms.length > 0 && <div className="mt-3 space-y-2"><p className="flex items-center gap-1.5 text-[10px] font-black text-slate-700"><Link2 className="h-3.5 w-3.5 text-amber-600" />Loom recordings</p>{selectedTicket.looms.map((loom, index) => loom.url ? <a key={`${loom.label}-${index}`} href={loom.url} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5 text-[10px] font-bold text-slate-700 ring-1 ring-slate-100 transition hover:bg-amber-50 hover:ring-amber-200"><span className="min-w-0 truncate">{loom.label}</span><ArrowRight className="h-3.5 w-3.5 shrink-0" /></a> : <div key={`${loom.label}-${index}`} className="rounded-xl bg-slate-50 px-3 py-2.5 text-[10px] font-bold text-slate-600 ring-1 ring-slate-100">{loom.label}</div>)}</div>}
                {selectedTicket.screenshots.length > 0 && <div className="mt-4"><p className="mb-2 flex items-center gap-1.5 text-[10px] font-black text-slate-700"><ImagePlus className="h-3.5 w-3.5 text-amber-600" />Screenshots <span className="font-bold text-slate-400">({selectedTicket.screenshots.length})</span></p><div className="flex flex-wrap gap-2">{selectedTicket.screenshots.map((screenshot, index) => screenshot.url ? <a key={`${screenshot.label}-${index}`} href={screenshot.url} target="_blank" rel="noreferrer" title={screenshot.label} aria-label={`Open screenshot ${screenshot.label}`} className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-50 ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:ring-2 hover:ring-amber-300"><img src={screenshot.url} alt={screenshot.label} loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" /><span className="absolute inset-x-0 bottom-0 h-5 bg-gradient-to-t from-slate-950/45 to-transparent opacity-0 transition group-hover:opacity-100" /></a> : <div key={`${screenshot.label}-${index}`} title={screenshot.label} className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50"><ImagePlus className="h-5 w-5 text-slate-300" /></div>)}</div></div>}
              </div>}
            </section>}
            {detailTab === 'conversation' && <div className="space-y-6">
              {commentsLoading ? <div className="flex items-center justify-center gap-2 rounded-2xl bg-white/70 py-10 text-xs font-bold text-slate-500 ring-1 ring-slate-100"><Loader2 className="h-4 w-4 animate-spin text-amber-500" />Loading conversation…</div> : commentsError ? <div className="rounded-2xl border border-rose-100 bg-rose-50 px-5 py-4 text-xs font-semibold text-rose-600">{commentsError}</div> : selectedTicket.comments.length ? <div className="space-y-5">{selectedTicket.comments.map(comment => { const authorName = commentAuthorName(comment); return <div key={comment.id} className={`flex gap-3 ${comment.role === 'Agent' ? 'flex-row-reverse' : ''}`}><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[10px] font-black ${comment.role === 'Agent' ? 'bg-slate-950 text-amber-300' : 'bg-white text-slate-500 ring-1 ring-slate-200'}`}>{authorName.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase()}</span><div className={`max-w-[82%] ${comment.role === 'Agent' ? 'text-right' : ''}`}><div className={`mb-1.5 flex items-center gap-2 text-[9px] font-bold text-slate-400 ${comment.role === 'Agent' ? 'justify-end' : ''}`}><span className="text-slate-700">{authorName}</span><span>{formatDate(comment.timestamp)} · {formatTime(comment.timestamp)}</span></div><div className={`rounded-2xl px-4 py-3 text-left text-sm font-medium leading-6 shadow-sm ${comment.role === 'Agent' ? 'rounded-tr-sm bg-slate-950 text-white' : 'rounded-tl-sm bg-white text-slate-700 ring-1 ring-slate-100'}`}><p className="whitespace-pre-wrap">{comment.message}</p>{comment.screenshots.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{comment.screenshots.map((screenshot, index) => screenshot.url ? <a key={`${screenshot.label}-${index}`} href={screenshot.url} target="_blank" rel="noreferrer" aria-label={`Open comment screenshot ${screenshot.label}`} title={screenshot.label} className="h-20 w-20 overflow-hidden rounded-xl bg-slate-100 ring-1 ring-white/20"><img src={screenshot.url} alt={screenshot.label} loading="lazy" className="h-full w-full object-cover transition duration-300 hover:scale-105" /></a> : <span key={`${screenshot.label}-${index}`} className="inline-flex max-w-48 items-center gap-1.5 truncate rounded-lg bg-slate-100 px-2.5 py-2 text-[9px] font-bold text-slate-600"><ImagePlus className="h-3.5 w-3.5 shrink-0" />{screenshot.label}</span>)}</div>}</div></div></div>; })}</div> : <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 py-10 text-center"><MessageSquare className="mx-auto h-6 w-6 text-slate-300" /><p className="mt-3 text-xs font-black text-slate-600">No replies yet</p><p className="mt-1 text-[11px] font-medium text-slate-400">Use the reply box below to start the conversation.</p></div>}
            </div>}
            {detailTab === 'activity' && (
              <div className="space-y-7">
                {activityLoading ? (
                  <div className="flex items-center gap-2 rounded-2xl bg-white/70 px-5 py-4 text-xs font-bold text-slate-500 ring-1 ring-slate-100">
                    <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
                    Loading ticket activity…
                  </div>
                ) : activityError ? (
                  <div className="rounded-2xl border border-rose-100 bg-rose-50 px-5 py-4 text-xs font-semibold text-rose-600">
                    {activityError}
                  </div>
                ) : ticketActivity.length > 0 ? (
                  <div className="space-y-7">
                    {ticketActivity.map(activity => (
                      <div key={activity.id} className="relative border-l border-slate-200 pl-7">
                        <span className="absolute -left-2 top-0 flex h-4 w-4 items-center justify-center rounded-full bg-slate-950 ring-4 ring-slate-100">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
                        </span>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs font-black text-slate-800">{activity.updatedByName}</p>
                          <p className="text-[10px] font-semibold text-slate-400">{formatMountainDateTime(activity.createdAt)}</p>
                        </div>
                        <p className="mt-3 rounded-2xl bg-white p-4 text-sm font-medium leading-6 text-slate-600 shadow-sm ring-1 ring-slate-100">
                          {activity.log}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="relative border-l border-slate-200 pl-7">
                  <span className="absolute -left-2 top-0 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 ring-4 ring-amber-50">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-950" />
                  </span>
                  <p className="text-xs font-black text-slate-800">Request submitted</p>
                  <p className="mt-1 text-[10px] font-semibold text-slate-400">{formatMountainDateTime(selectedTicket.createdAt)}</p>
                  <p className="mt-3 rounded-2xl bg-white p-4 text-sm font-medium leading-6 text-slate-600 shadow-sm ring-1 ring-slate-100">
                    {selectedTicket.subject}
                  </p>
      </div>

    </div>
            )}
            {detailTab === 'notes' && <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 px-6 py-12 text-center"><FileText className="mx-auto h-6 w-6 text-slate-300" /><p className="mt-3 text-xs font-black text-slate-700">No internal notes yet</p><p className="mx-auto mt-1 max-w-xs text-[11px] font-medium leading-5 text-slate-400">Notes will remain separate from the customer conversation. They can be connected when the notes API is ready.</p></div>}
          </div>
          {detailTab === 'conversation' && <div className="border-t border-slate-100 bg-white p-5 sm:px-8">
            {replyScreenshotPreviews.length > 0 && <div className="mb-3 flex flex-wrap gap-2">{replyScreenshotPreviews.map(preview => { const key = screenshotKey(preview.file); const uploading = replyUploadingScreenshots.includes(key); const uploadError = replyScreenshotErrors[key]; return <div key={key} className="group relative h-16 w-16 overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200"><img src={preview.url} alt={preview.file.name} className="h-full w-full object-cover" />{uploading && <span title="Preparing image metadata" className="absolute inset-0 flex items-center justify-center bg-slate-950/55 text-white"><Loader2 className="h-4 w-4 animate-spin" /></span>}{uploadError && <span title={uploadError} className="absolute inset-x-1 bottom-1 rounded bg-rose-600 px-1 py-0.5 text-center text-[7px] font-black text-white">Failed</span>}<button type="button" onClick={() => removeReplyScreenshot(preview.file)} aria-label={`Remove ${preview.file.name}`} className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-950/80 text-white opacity-0 transition group-hover:opacity-100 focus:opacity-100"><X className="h-3 w-3" /></button></div>; })}</div>}
            {replyAttachmentError && <p role="alert" className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-[10px] font-bold text-rose-700">{replyAttachmentError}</p>}
            <div className="flex items-end gap-2 rounded-2xl bg-slate-50 p-2 ring-1 ring-slate-100"><label aria-label="Attach images" title="Attach images" className="mb-0.5 flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl text-slate-400 transition hover:bg-white hover:text-amber-600 hover:shadow-sm"><Paperclip className="h-4 w-4" /><input type="file" accept="image/*" multiple className="hidden" onChange={event => { selectReplyScreenshots(Array.from(event.target.files || [])); event.currentTarget.value = ''; }} /></label><textarea value={reply} onChange={event => setReply(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && (reply.trim() || replyScreenshots.length)) { event.preventDefault(); void sendReply(); } }} rows={2} placeholder="Reply to support…" className="min-h-[48px] flex-1 resize-none bg-transparent px-2 py-2 text-sm font-medium leading-6 text-slate-800 outline-none placeholder:text-slate-400" /><button type="button" onClick={() => void sendReply()} disabled={(!reply.trim() && !replyScreenshots.length) || sendingReply || replyUploadingScreenshots.length > 0} aria-label="Send reply" className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white transition hover:bg-amber-400 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-30">{sendingReply || replyUploadingScreenshots.length > 0 ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</button></div>
          </div>}
      </aside>}
      </div>
      </div>

      {pendingCompletion && createPortal(<div className="fixed inset-0 z-[600] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" onMouseDown={closeCompletionModal}>
        <div role="dialog" aria-modal="true" aria-labelledby="complete-ticket-title" onMouseDown={event => event.stopPropagation()} className="w-full max-w-lg rounded-[2rem] bg-white p-6 shadow-2xl sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600"><CheckCircle2 className="h-6 w-6" /></span>
            <button type="button" onClick={closeCompletionModal} disabled={quickEditing.includes(`${pendingCompletion.ticket.id}-status`)} aria-label="Close resolution dialog" className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-400 transition hover:bg-slate-100 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-40"><X className="h-5 w-5" /></button>
          </div>
          <h2 id="complete-ticket-title" className="mt-5 text-2xl font-black tracking-tight text-slate-950">Resolve {pendingCompletion.ticket.reference}</h2>
          <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">Add the resolution before changing this ticket to <span className="font-black text-slate-700">{tableStatusOptions.find(option => option.value === pendingCompletion.status)?.label || pendingCompletion.status}</span>.</p>
          <label className="mt-5 block"><span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Resolution <span className="text-rose-500">*</span></span><textarea autoFocus required value={resolution} onChange={event => { setResolution(event.target.value); if (resolutionError) setResolutionError(''); }} rows={5} placeholder="Describe what was done and the outcome." className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium leading-6 text-slate-800 outline-none transition focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-100" /></label>
          {resolutionError && <p role="alert" className="mt-3 rounded-xl bg-rose-50 px-3 py-2.5 text-xs font-bold text-rose-700">{resolutionError}</p>}
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={closeCompletionModal} disabled={quickEditing.includes(`${pendingCompletion.ticket.id}-status`)} className="rounded-xl border border-slate-200 px-4 py-3 text-xs font-black text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Cancel</button>
            <button type="button" onClick={() => void submitTicketCompletion()} disabled={!resolution.trim() || quickEditing.includes(`${pendingCompletion.ticket.id}-status`)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-xs font-black text-white transition hover:bg-emerald-500 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-40">{quickEditing.includes(`${pendingCompletion.ticket.id}-status`) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Send resolution</button>
          </div>
        </div>
      </div>, document.body)}
    </div>
  );
};
