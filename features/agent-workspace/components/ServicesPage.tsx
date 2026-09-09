import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle, ArrowRight, Bot, CalendarDays, CheckCircle2, ChevronLeft,
  ChevronRight, CircleDollarSign, ClipboardCheck, FileSpreadsheet, Lightbulb,
  Clock3, FileText, Inbox, LayoutDashboard, Loader2, Mail, MessageSquareText,
  Paperclip, PhoneOff, Plus, RefreshCw, Send, Sparkles, Users, X,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { QuickEditMenu } from './QuickEditMenu';
import { LeadQuantityEdit } from './LeadQuantityEdit';
import { buildLeadServiceFilter, emptyLeadServiceFilters } from '../services/leadServiceFilters';
import { useAgentContext } from '../context/AgentContext';
import {
  leadServiceApi,
  type LeadServiceDashboardResponse,
  type LeadServiceRecord,
  type LeadServiceStatus,
} from '../services/leadServiceApi';

type PlanId = 'mailer' | 'mailer-csv' | 'csv';
type ContinuousStep = 'date' | 'quantity' | 'lead-type' | 'delivery' | 'files' | 'comments' | 'review' | 'success';
type EditableField = Exclude<ContinuousStep, 'review' | 'success'>;
type ServiceView = 'home' | 'request' | 'dashboard' | 'requests';
type ServiceId = 'lead-servicing' | 'training' | 'agent-assist' | 'staff';

const plans = [
  { id: 'mailer' as PlanId, name: 'Mailer only', detail: 'Prepared mailer output', price: 0.50, icon: Mail },
  { id: 'mailer-csv' as PlanId, name: 'Mailer + CSV', detail: 'Mailer output and scrubbed CSV', price: 0.25, icon: FileSpreadsheet },
  { id: 'csv' as PlanId, name: 'CSV only', detail: 'Scrubbed lead file as a CSV', price: 0.10, icon: ClipboardCheck },
];

const pad = (value: number) => String(value).padStart(2, '0');
const dateKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const parseDate = (value: string) => { const [y, m, d] = value.split('-').map(Number); return new Date(y, m - 1, d); };
const tomorrow = () => { const date = new Date(); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() + 1); return date; };
const displayDate = (value: string) => value ? new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' }).format(parseDate(value)) : 'Choose a start date';
const money = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(value);

const Hint = ({ text }: { text: string }) => (
  <span className="group relative inline-flex">
    <Lightbulb className="h-4 w-4 text-amber-500" aria-label={text} />
    <span role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden w-56 -translate-x-1/2 rounded-xl bg-slate-950 px-3 py-2 text-[10px] font-semibold normal-case leading-4 tracking-normal text-white shadow-xl group-hover:block">{text}</span>
  </span>
);

const Label = ({ children, hint }: { children: React.ReactNode; hint?: string }) => (
  <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{children}{hint && <Hint text={hint} />}</span>
);

const AssistantMessage = ({ children }: { children: React.ReactNode }) => (
  <div className="flex max-w-3xl items-start gap-3">
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-amber-300"><Bot className="h-4 w-4" /></span>
    <div className="rounded-2xl rounded-tl-sm border border-slate-100 bg-white px-4 py-3 text-sm font-semibold leading-6 text-slate-600 shadow-sm">{children}</div>
  </div>
);

const Answer = ({ label, children, onEdit }: { label: string; children: React.ReactNode; onEdit?: () => void }) => {
  const content = <><span><span className="block text-[8px] font-black uppercase tracking-[0.18em] text-amber-300">{label}</span><span className="mt-1 block text-sm font-black">{children}</span></span>{onEdit && <span className="text-[9px] font-black uppercase tracking-wider text-white/45 group-hover:text-amber-300">Edit</span>}</>;
  return onEdit
    ? <button type="button" onClick={onEdit} className="group ml-12 flex w-full max-w-2xl items-center justify-between rounded-2xl rounded-tr-sm bg-slate-950 px-4 py-3 text-left text-white shadow-sm transition hover:-translate-y-0.5 hover:ring-2 hover:ring-amber-300">{content}</button>
    : <div className="ml-12 flex max-w-2xl items-center justify-between rounded-2xl rounded-tr-sm bg-slate-950 px-4 py-3 text-white shadow-sm">{content}</div>;
};

const CalendarPicker = ({ value, onChange }: { value: string; onChange: (value: string) => void }) => {
  const earliest = useMemo(tomorrow, []);
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => new Date(earliest.getFullYear(), earliest.getMonth(), 1));
  const offset = month.getDay();
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = Array.from({ length: offset + days }, (_, index) => index < offset ? null : index - offset + 1);
  const canGoBack = month.getFullYear() > earliest.getFullYear() || month.getMonth() > earliest.getMonth();
  const select = (day: number) => {
    const candidate = new Date(month.getFullYear(), month.getMonth(), day);
    if (candidate < earliest) return;
    onChange(dateKey(candidate)); setOpen(false);
  };
  return (
    <div className="relative mt-2">
      <button type="button" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(current => !current)} className={`flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl border bg-white px-4 text-left transition ${open ? 'border-amber-400 ring-4 ring-amber-100' : 'border-slate-200 hover:border-amber-300'}`}>
        <span className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600"><CalendarDays className="h-4 w-4" /></span><span><span className={`block text-sm font-black ${value ? 'text-slate-900' : 'text-slate-400'}`}>{displayDate(value)}</span><span className="block text-[10px] font-semibold text-slate-400">Available dates begin tomorrow</span></span></span>
        <ChevronRight className={`h-4 w-4 text-slate-400 transition ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && <div role="dialog" aria-label="Choose campaign start date" className="absolute left-0 top-[calc(100%+0.6rem)] z-40 w-full min-w-[19rem] rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl sm:w-[22rem]">
        <div className="flex items-center justify-between"><button type="button" disabled={!canGoBack} onClick={() => setMonth(current => new Date(current.getFullYear(), current.getMonth() - 1, 1))} aria-label="Previous month" className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 disabled:opacity-25"><ChevronLeft className="h-4 w-4" /></button><p className="text-sm font-black text-slate-900">{new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(month)}</p><button type="button" onClick={() => setMonth(current => new Date(current.getFullYear(), current.getMonth() + 1, 1))} aria-label="Next month" className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"><ChevronRight className="h-4 w-4" /></button></div>
        <div className="mt-3 grid grid-cols-7 gap-1 text-center">{['Su','Mo','Tu','We','Th','Fr','Sa'].map(day => <span key={day} className="py-1 text-[9px] font-black text-slate-400">{day}</span>)}{cells.map((day, index) => {
          if (!day) return <span key={`blank-${index}`} />;
          const candidate = new Date(month.getFullYear(), month.getMonth(), day); const key = dateKey(candidate); const disabled = candidate < earliest; const selected = key === value;
          return <button key={key} type="button" disabled={disabled} onClick={() => select(day)} className={`aspect-square rounded-xl text-xs font-black transition ${selected ? 'bg-slate-950 text-amber-300' : disabled ? 'cursor-not-allowed text-slate-200' : 'text-slate-600 hover:bg-amber-50 hover:text-amber-800'}`}>{day}</button>;
        })}</div>
      </div>}
    </div>
  );
};

const ScopePanel = () => (
  <aside className="rounded-[2rem] bg-slate-950 p-6 text-white shadow-lg lg:sticky lg:top-24">
    <p className="text-[9px] font-black uppercase tracking-[0.22em] text-amber-300">What happens next</p><h2 className="mt-2 text-xl font-black">A thorough compliance review</h2><p className="mt-2 text-xs font-semibold leading-5 text-slate-400">We review aged lead records before they return to your campaign.</p>
    <ol className="mt-6 space-y-5 border-l border-white/15 pl-5">{[
      ['01','Thorough scrubbing','Each uploaded record is reviewed for authenticity and relevance.'],
      ['02','Compliance checks','Leads are checked against federal and applicable state Do-Not-Call registries.'],
      ['03','Landline and mobile ID','Phone types are identified to support more targeted calling.'],
      ['04','Litigator identification','Known high-risk litigators are flagged and removed from the usable list.'],
    ].map(([number, title, detail]) => <li key={number} className="relative"><span className="absolute -left-[2.15rem] flex h-7 w-7 items-center justify-center rounded-lg bg-amber-400 text-[9px] font-black text-slate-950 ring-4 ring-slate-950">{number}</span><h3 className="text-xs font-black">{title}</h3><p className="mt-1 text-[10px] font-semibold leading-4 text-slate-400">{detail}</p></li>)}</ol>
    <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-[10px] font-black text-amber-300">Important notice</p><p className="mt-2 text-[10px] font-medium leading-4 text-slate-300">Scrubbing helps reduce compliance risk, but it cannot eliminate it. You remain responsible for the lawful use of your lead data and outreach.</p></div>
  </aside>
);

const FilePicker = ({ label, accept, files, onChange }: { label: string; accept: string; files: File[]; onChange: (files: File[]) => void }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4">
    <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-black text-slate-900">{label}</p><p className="mt-1 text-[10px] font-semibold text-slate-400">Required · multiple files allowed</p></div><label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-slate-950 px-3 py-2.5 text-[10px] font-black text-white transition hover:bg-amber-400 hover:text-slate-950"><Paperclip className="h-3.5 w-3.5" />Choose files<input type="file" accept={accept} multiple className="hidden" onChange={event => { const selected = Array.from(event.target.files || []); onChange([...files, ...selected.filter(file => !files.some(existing => existing.name === file.name && existing.size === file.size))]); event.currentTarget.value = ''; }} /></label></div>
    {files.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{files.map(file => <span key={`${file.name}-${file.size}`} className="inline-flex max-w-full items-center gap-2 rounded-full bg-slate-100 py-1.5 pl-3 pr-1.5 text-[10px] font-bold text-slate-600"><span className="max-w-48 truncate">{file.name}</span><button type="button" onClick={() => onChange(files.filter(item => item !== file))} aria-label={`Remove ${file.name}`} className="flex h-5 w-5 items-center justify-center rounded-full text-slate-400 hover:bg-rose-100 hover:text-rose-600"><X className="h-3 w-3" /></button></span>)}</div>}
  </div>
);

const LeadRequestContinuous = ({ onBack }: { onBack: () => void }) => {
  const { currentAgentId } = useAgentContext();
  const [step, setStep] = useState<ContinuousStep>('date');
  const [furthestStep, setFurthestStep] = useState(0);
  const [editMode, setEditMode] = useState<'menu' | EditableField | null>(null);
  const [lastEdited, setLastEdited] = useState('');
  const [startDate, setStartDate] = useState('');
  const [quantity, setQuantity] = useState('');
  const [leadType, setLeadType] = useState('');
  const [planId, setPlanId] = useState<PlanId | ''>('');
  const [csvFiles, setCsvFiles] = useState<File[]>([]);
  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [comments, setComments] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const order: ContinuousStep[] = ['date', 'quantity', 'lead-type', 'delivery', 'files', 'comments', 'review', 'success'];
  const labels: Record<EditableField, string> = { date: 'Start date', quantity: 'Quantity', 'lead-type': 'Lead type', delivery: 'Delivery option', files: 'Uploaded files', comments: 'Additional comments' };
  const stepIndex = order.indexOf(step);
  const count = Number(quantity);
  const plan = plans.find(item => item.id === planId);
  const estimate = plan && Number.isInteger(count) && count > 0 ? plan.price * count : null;
  const needsCsv = planId === 'mailer-csv' || planId === 'csv';
  const needsPdf = planId === 'mailer-csv' || planId === 'mailer';
  const reviewVisible = step === 'review' || step === 'success';
  const reached = (index: number) => furthestStep >= index || reviewVisible || editMode !== null;
  const advance = (next: ContinuousStep) => { setStep(next); setFurthestStep(current => Math.max(current, order.indexOf(next))); setError(''); };
  const finishEdit = () => { const field = editMode && editMode !== 'menu' ? labels[editMode] : 'response'; setLastEdited(field); setEditMode(null); setError(''); };

  const validateQuantity = (editing = false) => { if (!Number.isInteger(count) || count < 1) { setError('Enter a whole-number quantity greater than zero.'); return; } editing ? finishEdit() : advance('lead-type'); };
  const validateLeadType = (editing = false) => { if (!leadType.trim()) { setError('Enter the source or type of leads.'); return; } editing ? finishEdit() : advance('delivery'); };
  const validateFiles = (editing = false) => { if ((needsCsv && !csvFiles.length) || (needsPdf && !pdfFiles.length)) { setError(`Add ${needsCsv && needsPdf ? 'at least one CSV and one PDF' : needsCsv ? 'at least one CSV' : 'at least one PDF'} to continue.`); return; } editing ? finishEdit() : advance('comments'); };
  const submit = async () => {
    if (!plan || estimate === null) return;
    if (!currentAgentId) { setError('Your agent profile could not be identified. Refresh the page and try again.'); return; }
    setSubmitting(true); setError('');
    try {
      await leadServiceApi.create({
        start_date: startDate,
        quantity: count,
        lead_type: leadType.trim(),
        delivery_option: plan.id === 'mailer' ? 'mailer_only' : plan.id === 'mailer-csv' ? 'mailer_csv' : 'csv_only',
        additional_comments: comments.trim() || null,
        agent_id: currentAgentId,
        csv_files: csvFiles,
        pdf_files: pdfFiles,
      });
      setStep('success'); setFurthestStep(7);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'The request could not be submitted. Please try again.'); }
    finally { setSubmitting(false); }
  };

  const editor = (field: EditableField, editing = false) => {
    if (field === 'date') return <div className="max-w-2xl rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><CalendarPicker value={startDate} onChange={value => { setStartDate(value); editing ? finishEdit() : advance('quantity'); }} /></div>;
    if (field === 'quantity') return <div className="flex max-w-xl gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><label className="min-w-0 flex-1"><Label>Quantity of leads</Label><input autoFocus type="number" min="1" step="1" inputMode="numeric" value={quantity} onChange={event => setQuantity(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') validateQuantity(editing); }} placeholder="e.g. 500" className="mt-2 h-12 w-full rounded-xl bg-slate-50 px-4 text-sm font-black outline-none focus:ring-2 focus:ring-amber-300" /></label><button type="button" onClick={() => validateQuantity(editing)} aria-label="Save quantity" className="mt-5 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-950 text-white hover:bg-amber-400 hover:text-slate-950"><ArrowRight className="h-4 w-4" /></button></div>;
    if (field === 'lead-type') return <div className="flex max-w-xl gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><label className="min-w-0 flex-1"><Label>Type of leads</Label><input autoFocus value={leadType} onChange={event => setLeadType(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') validateLeadType(editing); }} placeholder="e.g. Aged MP, GOAT FEX" className="mt-2 h-12 w-full rounded-xl bg-slate-50 px-4 text-sm font-black outline-none focus:ring-2 focus:ring-amber-300" /></label><button type="button" onClick={() => validateLeadType(editing)} aria-label="Save lead type" className="mt-5 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-950 text-white hover:bg-amber-400 hover:text-slate-950"><ArrowRight className="h-4 w-4" /></button></div>;
    if (field === 'delivery') return <div className="grid max-w-3xl gap-3 md:grid-cols-3">{plans.map(item => { const Icon = item.icon; return <button key={item.id} type="button" onClick={() => { setPlanId(item.id); if (item.id === 'mailer') setCsvFiles([]); if (item.id === 'csv') setPdfFiles([]); if (editing) { setLastEdited('Delivery option'); setEditMode('files'); } else { advance('files'); } }} className={`rounded-2xl border bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-amber-300 ${item.id === planId ? 'border-amber-400 ring-2 ring-amber-100' : 'border-slate-200'}`}><Icon className="h-5 w-5 text-amber-600" /><p className="mt-3 text-xs font-black text-slate-900">{item.name}</p><p className="mt-1 text-[10px] font-semibold leading-4 text-slate-400">{item.detail}</p><p className="mt-3 text-sm font-black text-slate-950">{money(item.price)} <span className="text-[9px] text-slate-400">/ lead</span></p></button>; })}</div>;
    if (field === 'files') return <div className="max-w-3xl space-y-3">{needsCsv && <FilePicker label="CSV lead files" accept=".csv,text/csv" files={csvFiles} onChange={setCsvFiles} />}{needsPdf && <FilePicker label="PDF mailer files" accept=".pdf,application/pdf" files={pdfFiles} onChange={setPdfFiles} />}<div className="flex justify-end"><button type="button" onClick={() => validateFiles(editing)} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-xs font-black text-white hover:bg-amber-400 hover:text-slate-950">{editing ? 'Save files' : 'Continue'}<ArrowRight className="h-4 w-4" /></button></div></div>;
    return <div className="max-w-2xl rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><label className="block"><Label>Additional comments <span className="normal-case tracking-normal text-slate-300">(optional)</span></Label><textarea autoFocus value={comments} onChange={event => setComments(event.target.value)} rows={4} placeholder="Share file details, campaign notes, or special handling requests..." className="mt-2 w-full resize-none rounded-xl bg-slate-50 px-4 py-3 text-sm font-semibold leading-6 outline-none focus:ring-2 focus:ring-amber-300" /></label><div className="mt-3 flex justify-end"><button type="button" onClick={() => editing ? finishEdit() : advance('review')} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-xs font-black text-white hover:bg-amber-400 hover:text-slate-950">{editing ? 'Save comments' : comments.trim() ? 'Review request' : 'Skip & review'}<ArrowRight className="h-4 w-4" /></button></div></div>;
  };

  const answerFiles = [...csvFiles, ...pdfFiles].map(file => file.name).join(', ');
  const promptFor = (field: EditableField) => ({ date: 'What should the campaign start date be?', quantity: 'What quantity should I use?', 'lead-type': 'What lead type should I use?', delivery: 'Which delivery option should I use?', files: 'Which files should be attached?', comments: 'What comments should I include?' }[field]);
  const currentProgress = Math.min(stepIndex + 1, 7);

  return <div className="h-[calc(100vh-10rem)] min-h-[36rem] overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-slate-100"><div className="grid h-full min-h-0 lg:grid-cols-[minmax(0,1fr)_280px]">
    <section className="flex min-h-0 flex-col overflow-hidden border-b border-slate-100 lg:border-b-0 lg:border-r"><header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-100 px-5 sm:px-7"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-amber-300"><Bot className="h-4 w-4" /></span><div><h2 className="text-xs font-black text-slate-950">Lead Servicing Assistant</h2><p className="text-[9px] font-semibold text-slate-400">Building a compliance service request</p></div></div><div className="flex items-center gap-3"><span className="hidden text-[9px] font-black uppercase tracking-wider text-slate-400 sm:inline">Step {currentProgress} of 7</span><button type="button" onClick={onBack} aria-label="Close assistant" className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-4 w-4" /></button></div></header>
      <div role="log" aria-live="polite" className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain bg-slate-50/45 px-5 py-6 [scrollbar-gutter:stable] sm:px-8">
        <AssistantMessage><p>Hi — I’ll help build your lead servicing request.</p><p className="mt-2">I’ll ask for one detail at a time, then let you review everything before submitting.</p></AssistantMessage>
        <AssistantMessage><span className="inline-flex items-center gap-2">When would you like the initial campaign to start?<Hint text="When would you like the initial campaign to start?" /></span></AssistantMessage>{step === 'date' && !editMode ? <div className="ml-11">{editor('date')}</div> : reached(1) && <Answer label="Start date">{displayDate(startDate)}</Answer>}
        {reached(1) && <><AssistantMessage>How many leads would you like us to service?</AssistantMessage>{step === 'quantity' && !editMode ? <div className="ml-11">{editor('quantity')}</div> : reached(2) && <Answer label="Quantity">{count.toLocaleString()} leads</Answer>}</>}
        {reached(2) && <><AssistantMessage><span className="inline-flex items-center gap-2">What type of leads are these?<Hint text="Use the lead age or source plus product type, such as Aged MP or GOAT FEX." /></span></AssistantMessage>{step === 'lead-type' && !editMode ? <div className="ml-11">{editor('lead-type')}</div> : reached(3) && <Answer label="Lead type">{leadType}</Answer>}</>}
        {reached(3) && <><AssistantMessage>How would you like the serviced leads delivered?</AssistantMessage>{step === 'delivery' && !editMode ? <div className="ml-11">{editor('delivery')}</div> : reached(4) && plan && <Answer label="Delivery">{plan.name} · {money(plan.price)} per lead</Answer>}</>}
        {reached(4) && plan && estimate !== null && <><AssistantMessage><span><span className="font-black text-slate-900">Your estimated service charge is {money(estimate)}.</span><br />That’s {money(plan.price)} × {count.toLocaleString()} leads. The invoice will be included in your next billing cycle.</span></AssistantMessage><AssistantMessage>Please upload the files needed for {plan.name.toLowerCase()}.</AssistantMessage>{step === 'files' && !editMode ? <div className="ml-11">{editor('files')}</div> : reached(5) && <Answer label="Uploaded files">{answerFiles}</Answer>}</>}
        {reached(5) && <><AssistantMessage>Would you like to add any comments before review?</AssistantMessage>{step === 'comments' && !editMode ? <div className="ml-11">{editor('comments')}</div> : reached(6) && <Answer label="Additional comments">{comments.trim() || 'No additional comments.'}</Answer>}</>}
        {error && !editMode && !reviewVisible && <p role="alert" className="ml-11 max-w-xl rounded-xl bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700">{error}</p>}
        {reviewVisible && plan && estimate !== null && <><AssistantMessage>{lastEdited ? `${lastEdited} updated. Here’s the revised request.` : step === 'success' ? 'Your lead servicing request is in. The team can follow up through the ticket.' : 'Here’s the request I’m ready to send. Please review it before submitting.'}</AssistantMessage><div className="ml-11 max-w-2xl overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm"><div className="bg-slate-950 px-5 py-4 text-white"><p className="text-[8px] font-black uppercase tracking-[0.2em] text-amber-300">Lead servicing request</p><p className="mt-2 text-sm font-black">{count.toLocaleString()} {leadType.trim()} leads</p></div><div className="grid gap-px bg-slate-100 sm:grid-cols-3"><div className="bg-white p-4"><p className="text-[8px] font-black uppercase text-slate-400">Start date</p><p className="mt-1 text-xs font-black text-slate-800">{displayDate(startDate)}</p></div><div className="bg-white p-4"><p className="text-[8px] font-black uppercase text-slate-400">Delivery</p><p className="mt-1 text-xs font-black text-slate-800">{plan.name}</p></div><div className="bg-white p-4"><p className="text-[8px] font-black uppercase text-slate-400">Estimate</p><p className="mt-1 text-xs font-black text-slate-800">{money(estimate)}</p></div></div><div className="p-5"><p className="text-[8px] font-black uppercase text-slate-400">Files</p><p className="mt-1 text-xs font-semibold text-slate-600">{answerFiles}</p>{error && <p role="alert" className="mt-3 rounded-xl bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700">{error}</p>}<div className="mt-5 flex justify-end gap-2">{step === 'success' ? <button type="button" onClick={onBack} className="rounded-xl bg-slate-950 px-5 py-3 text-xs font-black text-white">Back to services</button> : <><button type="button" onClick={() => { setEditMode('menu'); setLastEdited(''); }} className="rounded-xl px-4 py-3 text-xs font-black text-slate-500 hover:bg-slate-100">Go back or edit</button><button type="button" onClick={() => void submit()} disabled={submitting} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-xs font-black text-white hover:bg-amber-400 hover:text-slate-950 disabled:opacity-50">{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{submitting ? 'Submitting…' : 'Submit request'}</button></>}</div></div></div></>}
        {editMode === 'menu' && <><AssistantMessage>Which response would you like to edit?</AssistantMessage><div className="ml-11 flex max-w-2xl flex-wrap gap-2">{(Object.keys(labels) as EditableField[]).map(field => <button key={field} type="button" onClick={() => setEditMode(field)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-600 shadow-sm hover:border-amber-300 hover:bg-amber-50">{labels[field]}</button>)}</div></>}
        {editMode && editMode !== 'menu' && <><AssistantMessage>{promptFor(editMode)}</AssistantMessage><div className="ml-11">{editor(editMode, true)}</div>{error && <p role="alert" className="ml-11 max-w-xl rounded-xl bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700">{error}</p>}</>}
      </div>
    </section><aside className="hidden min-h-0 overflow-y-auto bg-white p-5 lg:block"><ScopePanel /></aside>
  </div></div>;
};

const leadStatusMeta: Record<LeadServiceStatus, { label: string; note: string; tone: string; dot: string }> = {
  waiting: { label: 'Waiting', note: 'Received and queued', tone: 'bg-amber-50 text-amber-700 ring-amber-200', dot: 'bg-amber-500' },
  'in progress': { label: 'In Progress', note: 'Currently being serviced', tone: 'bg-blue-50 text-blue-700 ring-blue-200', dot: 'bg-blue-500' },
  'needs attention': { label: 'Needs Attention', note: 'A response is needed', tone: 'bg-rose-50 text-rose-700 ring-rose-200', dot: 'bg-rose-500' },
  complete: { label: 'Complete', note: 'Successfully delivered', tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500' },
  'completed-incomplete': { label: 'Completed—Incomplete', note: 'Closed with an issue', tone: 'bg-slate-100 text-slate-600 ring-slate-200', dot: 'bg-slate-400' },
};

const leadStatuses = Object.keys(leadStatusMeta) as LeadServiceStatus[];

const leadFilterStatusTone = (value: string) => {
  const status: LeadServiceStatus = value.includes('incomplete') ? 'completed-incomplete' : value === 'completed' ? 'complete' : value.includes('attention') ? 'needs attention' : value.includes('progress') ? 'in progress' : 'waiting';
  const { tone, dot } = leadStatusMeta[status];
  return { tone, dot };
};
const deliveryLabel = (value: string) => ({ mailer_only: 'Mailer only', mailer_csv: 'Mailer + CSV', csv_only: 'CSV only' }[value] || value || '—');
const deliveryPrice = (value: string) => ({ mailer_only: 0.50, mailer_csv: 0.25, csv_only: 0.10 }[value] || 0);
const shortDate = (value: string) => {
  if (!value) return '—';
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? parseDate(value) : new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
};

const LeadServiceNav = ({ active, onChange }: { active: Exclude<ServiceView, 'home'>; onChange: (view: Exclude<ServiceView, 'home'>) => void }) => (
  <nav aria-label="Lead servicing navigation" className="flex max-w-full items-center gap-1 overflow-x-auto rounded-2xl bg-white p-2 shadow-sm ring-1 ring-slate-100">
    {[
      { key: 'request' as const, label: 'New Request', icon: Plus },
      { key: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
      { key: 'requests' as const, label: 'All Requests', icon: FileText },
    ].map(item => <button key={item.key} type="button" onClick={() => onChange(item.key)} className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black transition ${active === item.key ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}><item.icon className={`h-4 w-4 ${active === item.key ? 'text-amber-300' : 'text-slate-400'}`} />{item.label}</button>)}
  </nav>
);

const serviceCatalog = [
  { id: 'lead-servicing' as ServiceId, label: 'Lead Servicing', description: 'TCPA-focused lead preparation and delivery.', icon: PhoneOff, available: true },
  { id: 'training' as ServiceId, label: 'Training Services', description: 'Sales, product, leadership, and agency-growth coaching.', icon: Users, available: false },
  { id: 'agent-assist' as ServiceId, label: 'Agent Assist', description: 'Hands-on help from licensed agents in your network.', icon: MessageSquareText, available: false },
  { id: 'staff' as ServiceId, label: 'Staff Services', description: 'Direct project staff for operational and specialized work.', icon: Sparkles, available: false },
];

const ServiceCategoryNav = ({ active, onChange }: { active: ServiceId; onChange: (service: ServiceId) => void }) => (
  <nav aria-label="PolicyHQ service categories" className="flex max-w-full items-center overflow-x-auto border-b border-slate-300 bg-transparent">
    {serviceCatalog.map(service => <button key={service.id} type="button" onClick={() => onChange(service.id)} className={`relative inline-flex shrink-0 items-center gap-2 px-5 py-3 text-xs font-black transition ${active === service.id ? 'text-slate-950' : 'text-slate-400 hover:text-slate-700'}`}><service.icon className="h-4 w-4" />{service.label}{active === service.id && <span className="absolute inset-x-2 bottom-[-1px] h-0.5 bg-amber-400" />}</button>)}
  </nav>
);

const LeadStatusBadge = ({ status }: { status: LeadServiceStatus }) => {
  const meta = leadStatusMeta[status];
  return <span className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-2 text-[10px] font-black ring-1 ${meta.tone}`}><span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />{meta.label}</span>;
};

const RequestDetail = ({ request: summary, isStaff, onSaved, onClose }: { request: LeadServiceRecord; isStaff: boolean; onSaved: () => Promise<void>; onClose: () => void }) => {
  const [detailTab, setDetailTab] = useState<'details' | 'activity' | 'comments'>('details');
  const [activity, setActivity] = useState<Awaited<ReturnType<typeof leadServiceApi.getActivity>>>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState('');
  const [activityAttempt, setActivityAttempt] = useState(0);
  const [detail, setDetail] = useState<LeadServiceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (detailTab !== 'activity') return;
    const controller = new AbortController();
    setActivityLoading(true); setActivityError(''); setActivity([]);
    leadServiceApi.getActivity(summary.id, controller.signal)
      .then(rows => { if (!controller.signal.aborted) setActivity(rows); })
      .catch(caught => { if (!controller.signal.aborted) setActivityError(caught instanceof Error ? caught.message : 'Could not load activity.'); })
      .finally(() => { if (!controller.signal.aborted) setActivityLoading(false); });
    return () => controller.abort();
  }, [summary, detailTab, activityAttempt, attempt]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setDetail(null);
    leadServiceApi.getDetails(summary.id, controller.signal)
      .then(value => { if (!controller.signal.aborted) setDetail(value); })
      .catch(caught => { if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : 'Could not load request details.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [summary, attempt]);
  const request = detail || summary;
  const [statusOptions, setStatusOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [statusError, setStatusError] = useState('');
  const [statusAttempt, setStatusAttempt] = useState(0);
  const [savingStatus, setSavingStatus] = useState(false);
  const statusPending = useRef(false);
  useEffect(() => {
    let active = true;
    setStatusOptions([]); setStatusError('');
    if (isStaff) leadServiceApi.getStatusOptions()
      .then(options => { if (active) setStatusOptions(options); })
      .catch(() => { if (active) setStatusError('Status options could not be loaded.'); });
    return () => { active = false; };
  }, [isStaff, statusAttempt]);
  const saveStatus = async (status: string) => {
    if (!isStaff || statusPending.current) return;
    statusPending.current = true; setSavingStatus(true); setStatusError('');
    try {
      await leadServiceApi.update({ id: summary.id, status, log: `Status updated from ${leadStatusMeta[request.status].label} to ${status}.` });
      const normalized = status === 'completed' ? 'complete' : status === 'completed - incomplete' ? 'completed-incomplete' : status as LeadServiceStatus;
      setDetail(current => ({ ...(current || summary), status: normalized }));
      setAttempt(value => value + 1);
      await onSaved();
    } catch (caught) {
      setStatusError(caught instanceof Error ? caught.message : 'Could not save status.');
    } finally { statusPending.current = false; setSavingStatus(false); }
  };
  const fileCount = request.csv_files.length + request.pdf_files.length;
  const estimate = request.quantity * deliveryPrice(request.delivery_option);
  return <aside aria-labelledby="lead-request-title" className="w-full min-w-0 shrink-0 overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-slate-100 lg:sticky lg:top-4 lg:w-[35%]">
    <section className="flex max-h-[calc(100vh-6rem)] min-h-[620px] flex-col">
      <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5 text-slate-950"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-amber-300">{request.reference.replace(/^LS-/i, '')}</p><h2 id="lead-request-title" className="mt-2 text-lg font-black">{request.quantity.toLocaleString()} {request.lead_type || 'leads'}</h2><div className="mt-3">{isStaff ? <QuickEditMenu ariaLabel="Edit request status" value={request.status === 'complete' ? 'completed' : request.status === 'completed-incomplete' ? 'completed - incomplete' : request.status} placeholder={leadStatusMeta[request.status].label} options={statusOptions.map(option => ({ ...option, ...leadFilterStatusTone(option.value) }))} triggerTone={leadStatusMeta[request.status].tone} disabled={loading || savingStatus || !statusOptions.length} onChange={value => void saveStatus(value)} /> : <LeadStatusBadge status={request.status} />}{savingStatus && <span role="status" className="mt-2 block text-xs text-slate-400">Saving status…</span>}{statusError && <div role="alert" className="mt-2 text-xs text-rose-600">{statusError}{!statusOptions.length && <button type="button" onClick={() => setStatusAttempt(value => value + 1)} className="ml-2 font-black">Retry options</button>}</div>}</div></div><button type="button" onClick={onClose} aria-label="Close request details" className="rounded-xl bg-slate-50 p-2.5 text-slate-400 hover:bg-slate-100 hover:text-slate-900"><X className="h-5 w-5" /></button></header>
      <div className="shrink-0 border-b border-slate-100 px-6 py-3"><div role="tablist" aria-label="Lead service details" className="inline-flex rounded-xl bg-slate-50 p-1">{(['details', 'activity', 'comments'] as const).map(tab => <button key={tab} id={`lead-tab-${tab}`} type="button" role="tab" aria-selected={detailTab === tab} aria-controls={`lead-panel-${tab}`} onClick={() => setDetailTab(tab)} className={`rounded-lg px-3 py-2 text-[10px] font-black transition ${detailTab === tab ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}>{tab === 'details' ? 'Details' : tab === 'activity' ? 'Activity' : 'Comments'}</button>)}</div></div>
      <div role="tabpanel" id={`lead-panel-${detailTab}`} aria-labelledby={`lead-tab-${detailTab}`} className="min-h-0 flex-1 space-y-6 overflow-y-auto p-6">
        {detailTab === 'activity' ? <>{activityLoading ? <div role="status" className="flex items-center justify-center gap-2 py-10 text-xs text-slate-400"><Loader2 className="h-5 w-5 animate-spin text-amber-500" />Loading activity…</div> : activityError ? <div role="alert" className="rounded-xl bg-rose-50 p-4 text-xs text-rose-700">{activityError}<button type="button" onClick={() => setActivityAttempt(value => value + 1)} className="mt-3 block font-black">Retry activity</button></div> : activity.length ? <ol className="ml-2 border-l border-slate-200">{activity.map(entry => <li key={entry.id} className="relative pb-6 pl-5 last:pb-0"><span className="absolute -left-1.5 top-1 h-3 w-3 rounded-full bg-amber-400 ring-4 ring-white" /><p className="whitespace-pre-wrap text-xs font-semibold leading-5 text-slate-700">{entry.log}</p><div className="mt-2 flex flex-wrap gap-x-2 text-[10px] text-slate-400">{entry.name && <span className="font-bold">{entry.name}</span>}{entry.createdAt && <time dateTime={entry.createdAt}>{new Date(entry.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</time>}</div></li>)}</ol> : <div className="py-10 text-center"><Clock3 className="mx-auto h-6 w-6 text-slate-300" /><p className="mt-3 text-xs font-bold text-slate-500">No activity yet.</p></div>}</> : detailTab === 'comments' ? <div className="py-10 text-center"><MessageSquareText className="mx-auto h-6 w-6 text-slate-300" /><h3 className="mt-3 text-xs font-black text-slate-700">Comments unavailable</h3><p className="mt-2 text-xs leading-5 text-slate-400">Comments are not connected yet.</p></div> : <>
        {loading ? <div role="status" className="flex items-center justify-center gap-2 py-12 text-xs font-bold text-slate-400"><Loader2 className="h-5 w-5 animate-spin text-amber-500" />Loading request details…</div> : error ? <div role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}<button type="button" onClick={() => setAttempt(value => value + 1)} className="mt-3 block font-black">Retry</button></div> : <>
        <section>
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">Request overview</p>
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-5">
            {[
              ['Start date', shortDate(request.start_date)], ['Delivery', deliveryLabel(request.delivery_option)],
              ['Lead type', request.lead_type || '—'], ['Quantity', request.quantity.toLocaleString()],
            ].map(([label, value]) => <div key={label}><dt className="text-[10px] font-semibold text-slate-400">{label}</dt><dd className="mt-1 break-words text-xs font-black text-slate-800">{value}</dd></div>)}
          </dl>
        </section>
        <section className="flex items-center justify-between gap-4 border-y border-slate-100 py-4"><div><h3 className="text-xs font-black text-slate-800">Estimated charge</h3><p className="mt-1 text-[10px] font-medium text-slate-400">{request.quantity.toLocaleString()} leads × {money(deliveryPrice(request.delivery_option))} per lead</p></div><p className="text-xl font-black tracking-tight text-slate-950">{money(estimate)}</p></section>
        <section><h3 className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">Additional comments</h3><p className="mt-3 whitespace-pre-wrap border-l-2 border-amber-200 pl-3 text-xs font-medium leading-6 text-slate-600">{request.additional_comments || 'No additional comments provided.'}</p></section>
        <section><div className="flex items-center gap-2"><h3 className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">Attachments</h3><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-500">{fileCount}</span></div>
        {fileCount === 0 && <p className="mt-3 text-xs text-slate-400">No files attached.</p>}
        {[{ label: 'CSV', files: request.csv_files }, { label: 'PDF', files: request.pdf_files }].filter(group => group.files.length).map(group => <div key={group.label} className="mt-3"><p className="text-[9px] font-bold text-slate-400">{group.label}</p><div className="divide-y divide-slate-100">{group.files.map((file, index) => {
          const attachment = file && typeof file === 'object' ? file as Record<string, unknown> : {};
          const name = String(attachment.name || `Attachment ${index + 1}`);
          let url = '';
          try { const parsed = new URL(String(attachment.url || '')); if (parsed.protocol === 'https:' || parsed.protocol === 'http:') url = parsed.href; } catch { /* Missing or invalid attachment URL. */ }
          return <div key={index} className="flex items-center gap-3 py-3"><Paperclip className="h-4 w-4 shrink-0 text-amber-500" /><div className="min-w-0">{url ? <a href={url} target="_blank" rel="noopener noreferrer" className="block break-words text-xs font-bold text-slate-700 hover:underline">{name}</a> : <span className="block break-words text-xs font-bold text-slate-500">{name} — unavailable</span>}{typeof attachment.size === 'number' && <span className="text-[10px] text-slate-400">{(attachment.size / 1024).toFixed(1)} KB</span>}</div></div>;
        })}</div></div>)}
        </section>
        <footer className="flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-100 pt-4 text-[9px] font-medium text-slate-400"><span>Created {shortDate(request.created_at)}</span><span>Updated {shortDate(request.updated_at)}</span></footer>
        </>}
        </>}
      </div>
    </section>
  </aside>;
};

const LeadServiceDashboard = ({ agentId, isStaff, onNewRequest, onSeeAll }: { agentId: string; isStaff: boolean; onNewRequest: () => void; onSeeAll: (status?: LeadServiceStatus) => void }) => {
  const [data, setData] = useState<LeadServiceDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<LeadServiceRecord | null>(null);
  const load = async () => {
    setLoading(true); setError('');
    try { setData(await leadServiceApi.getDashboard(agentId, isStaff)); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'The dashboard could not be loaded.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [agentId, isStaff]);
  const total = leadStatuses.reduce((sum, status) => sum + (data?.counts[status] || 0), 0);
  return <div className="space-y-5 animate-in fade-in duration-300">
    <section className="flex flex-col justify-between gap-4 rounded-[2rem] bg-slate-950 px-6 py-6 text-white shadow-lg sm:flex-row sm:items-center"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-amber-300">Lead servicing dashboard</p><h1 className="mt-2 text-2xl font-black">Your service requests</h1><p className="mt-1 text-sm font-semibold text-slate-400">Track each lead file from submission through completion.</p></div><button type="button" onClick={onNewRequest} className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-amber-300"><Plus className="h-4 w-4" />New request</button></section>
    {error && <div role="alert" className="flex flex-col justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 sm:flex-row sm:items-center"><span className="flex items-center gap-2"><AlertCircle className="h-4 w-4" />{error}</span><button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 font-black"><RefreshCw className="h-4 w-4" />Retry</button></div>}
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{leadStatuses.map(status => { const meta = leadStatusMeta[status]; return <button key={status} type="button" onClick={() => onSeeAll(status)} className="flex items-center gap-4 rounded-[1.5rem] bg-white p-5 text-left shadow-sm ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:ring-slate-300 hover:shadow-md"><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1 ${meta.tone}`}>{status === 'needs attention' ? <AlertCircle className="h-5 w-5" /> : status === 'in progress' ? <Clock3 className="h-5 w-5" /> : status === 'waiting' ? <Inbox className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}</span><span><span className="block text-2xl font-black text-slate-950">{loading ? '—' : data?.counts[status] || 0}</span><span className="block text-sm font-black text-slate-800">{meta.label}</span><span className="mt-0.5 block text-xs font-semibold text-slate-400">{meta.note}</span></span></button>; })}</section>
    <div className="flex min-w-0 flex-col items-start gap-4 lg:flex-row">
    <section className="w-full min-w-0 flex-1 rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-100"><div className="flex items-center justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-amber-600">Most recent</p><h2 className="mt-1 text-xl font-black text-slate-950">Latest requests</h2></div><button type="button" onClick={() => onSeeAll()} className="inline-flex items-center gap-1 text-sm font-black text-slate-500 hover:text-slate-900">See all ({loading ? '—' : total})<ChevronRight className="h-4 w-4" /></button></div>
      <div className="mt-5 divide-y divide-slate-100">{loading ? <div className="flex h-36 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-amber-500" /></div> : data?.latest_requests.length ? data.latest_requests.map(request => <button key={request.id} type="button" onClick={() => setSelected(request)} className="flex w-full items-center gap-4 py-4 text-left hover:bg-slate-50"><span className={`h-2.5 w-2.5 shrink-0 rounded-full ${leadStatusMeta[request.status].dot}`} /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-black text-slate-800">{request.quantity.toLocaleString()} {request.lead_type || 'leads'}</span><span className="mt-1 block text-xs font-semibold text-slate-400">{request.reference.replace(/^LS-/i, '')} · {deliveryLabel(request.delivery_option)} · Starts {shortDate(request.start_date)}</span></span><LeadStatusBadge status={request.status} /><span className="hidden text-xs font-bold text-slate-400 md:block">{shortDate(request.updated_at)}</span><ChevronRight className="h-4 w-4 text-slate-300" /></button>) : <div className="py-14 text-center"><FileSpreadsheet className="mx-auto h-7 w-7 text-slate-300" /><p className="mt-3 text-sm font-black text-slate-700">No lead service requests yet</p><p className="mt-1 text-sm font-medium text-slate-400">New submissions will appear here.</p></div>}</div>
    </section>{selected && <RequestDetail key={selected.id} request={selected} isStaff={isStaff} onSaved={load} onClose={() => setSelected(null)} />}</div>
  </div>;
};

const LeadServiceList = ({ agentId, isStaff, initialStatus, onNewRequest }: { agentId: string; isStaff: boolean; initialStatus: LeadServiceStatus | ''; onNewRequest: () => void }) => {
  const emptyFilter = emptyLeadServiceFilters(initialStatus);
  const [quickFilter, setQuickFilter] = useState(emptyFilter);
  const [appliedFilter, setAppliedFilter] = useState(emptyFilter);
  const [items, setItems] = useState<LeadServiceRecord[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [pageTotal, setPageTotal] = useState(1);
  const [total, setTotal] = useState(0);
  const [itemsReceived, setItemsReceived] = useState(0);
  const requestSequence = useRef(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<LeadServiceRecord | null>(null);
  const [filterOptions, setFilterOptions] = useState<Awaited<ReturnType<typeof leadServiceApi.getFilterOptions>>>({ requester: [], requestedFor: [], delivery: [], status: [] });
  const [schemaError, setSchemaError] = useState('');
  const [schemaLoading, setSchemaLoading] = useState(true);
  const [schemaAttempt, setSchemaAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setSchemaLoading(true); setSchemaError('');
    leadServiceApi.getFilterOptions(isStaff).then(options => { if (active) setFilterOptions(options); })
      .catch(() => { if (active) setSchemaError('Filter options could not be loaded.'); })
      .finally(() => { if (active) setSchemaLoading(false); });
    return () => { active = false; };
  }, [agentId, isStaff, schemaAttempt]);
  useEffect(() => { const next = emptyLeadServiceFilters(initialStatus); setQuickFilter(next); setAppliedFilter(next); setPage(1); }, [initialStatus]);
  const load = async () => {
    const sequence = ++requestSequence.current;
    setLoading(true); setError('');
    try { const response = await leadServiceApi.list({ is_staff: isStaff, agent_id: agentId, filter: buildLeadServiceFilter({ ...appliedFilter, requester: isStaff ? appliedFilter.requester : [], requestedFor: isStaff ? appliedFilter.requestedFor : [] }), page, per_page: String(pageSize), sort: { created_at: 'desc' } }); if (sequence !== requestSequence.current) return; setItems(response.items); setTotal(response.itemsTotal); setPageTotal(response.pageTotal); setItemsReceived(response.itemsReceived); setOffset(response.offset); }
    catch (caught) { if (sequence === requestSequence.current) { setItems([]); setError(caught instanceof Error ? caught.message : 'Lead servicing requests could not be loaded.'); } }
    finally { if (sequence === requestSequence.current) setLoading(false); }
  };
  useEffect(() => { void load(); return () => { requestSequence.current++; }; }, [agentId, isStaff, appliedFilter, page, pageSize]);
  const [handlerOptions, setHandlerOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [handlerError, setHandlerError] = useState('');
  const [handlerAttempt, setHandlerAttempt] = useState(0);
  const [saving, setSaving] = useState<string[]>([]);
  const pendingEdits = useRef(new Set<string>());
  const [editError, setEditError] = useState('');
  useEffect(() => {
    let active = true;
    setHandlerOptions([]); setHandlerError('');
    if (isStaff) leadServiceApi.getHandlerOptions()
      .then(options => { if (active) setHandlerOptions(options.map(option => ({ value: option.id, label: option.label }))); })
      .catch(() => { if (active) setHandlerError('Handler options could not be loaded.'); });
    return () => { active = false; };
  }, [isStaff, handlerAttempt]);
  const saveEdit = async (request: LeadServiceRecord, field: 'status' | 'assigned_ghl_user_id' | 'quantity' | 'delivery_option', value: string | number): Promise<boolean> => {
    if (!isStaff || pendingEdits.current.has(request.id)) return false;
    pendingEdits.current.add(request.id); setSaving(current => [...current, request.id]); setEditError('');
    try {
      const change = field === 'quantity' ? { id: request.id, quantity: Number(value) }
        : field === 'status' ? { id: request.id, status: String(value) }
        : field === 'delivery_option' ? { id: request.id, delivery_option: String(value) }
        : { id: request.id, assigned_ghl_user_id: String(value) };
      const fieldLabel = { quantity: 'Quantity', status: 'Status', delivery_option: 'Delivery', assigned_ghl_user_id: 'Handler' }[field];
      const oldValue = field === 'quantity' ? request.quantity : field === 'status' ? leadStatusMeta[request.status].label : field === 'delivery_option' ? deliveryLabel(request.delivery_option) : request.handler_name || 'Unassigned';
      const newValue = field === 'assigned_ghl_user_id' ? handlerOptions.find(option => option.value === value)?.label || String(value) : field === 'delivery_option' ? deliveryLabel(String(value)) : value;
      await leadServiceApi.update({ ...change, log: `${fieldLabel} updated from ${oldValue} to ${newValue}.` });
      const status = value === 'completed' ? 'complete' : value === 'completed - incomplete' ? 'completed-incomplete' : value;
      const patch = field === 'quantity' ? { quantity: Number(value) }
        : field === 'status' ? { status: status as LeadServiceStatus }
        : field === 'delivery_option' ? { delivery_option: value as LeadServiceRecord['delivery_option'] }
        : { handler_id: String(value), handler_name: handlerOptions.find(option => option.value === value)?.label || '' };
      setItems(current => current.map(item => item.id === request.id ? { ...item, ...patch } : item));
      setSelected(current => current?.id === request.id ? { ...current, ...patch } : current);
      await load();
      return true;
    } catch (caught) {
      setEditError(caught instanceof Error ? caught.message : 'Could not save the change.');
      return false;
    } finally {
      pendingEdits.current.delete(request.id); setSaving(current => current.filter(id => id !== request.id));
    }
  };

  const applyFilter = () => { setAppliedFilter({ ...quickFilter }); setPage(1); };
  const clearFilter = () => { const next = emptyLeadServiceFilters(); setQuickFilter(next); setAppliedFilter(next); setPage(1); };
  return <div className="space-y-5 animate-in fade-in duration-300">
    <section className="flex flex-col justify-between gap-4 rounded-[2rem] bg-slate-950 p-6 text-white shadow-sm sm:flex-row sm:items-center"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-amber-300">All requests</p><h1 className="mt-1 text-xl font-black">Request history</h1><p className="mt-1 text-sm font-semibold text-slate-400">Filter lead servicing requests and open one to review its details.</p></div><button type="button" onClick={onNewRequest} className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-amber-300"><Plus className="h-4 w-4" />New request</button></section>
    <div className="flex min-w-0 flex-col items-start gap-4 lg:flex-row">
    <section className="w-full min-w-0 flex-1 overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-slate-100">
      <div className="border-b border-slate-100 p-5"><p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-600">Lead service records</p>
      <h2 className="mt-1 text-xl font-black text-slate-950">{loading ? 'Loading requests…' : `${total.toLocaleString()} requests matching current view`}</h2></div>
      {schemaError && <div role="alert" className="flex items-center justify-between bg-amber-50 px-5 py-3 text-xs text-amber-900">{schemaError}<button type="button" onClick={() => setSchemaAttempt(value => value + 1)} className="font-black">Retry options</button></div>}
      <div className="overflow-x-auto border-b border-slate-100 bg-white px-5 py-3"><form onSubmit={event => { event.preventDefault(); applyFilter(); }} className={`grid ${isStaff ? 'min-w-[1250px] grid-cols-[120px_145px_180px_180px_minmax(170px,1fr)_170px_180px_142px]' : 'min-w-[890px] grid-cols-[120px_145px_minmax(170px,1fr)_170px_180px_142px]'} items-center rounded-[1.35rem] border border-slate-200 bg-slate-50/70 shadow-sm transition focus-within:border-amber-300 focus-within:bg-white focus-within:shadow-md`}>
        <div className="flex h-full items-center gap-2 border-r border-slate-200 px-4 py-3 text-[9px] font-black uppercase tracking-[0.16em] text-slate-500"><span className="h-2 w-2 rounded-full bg-amber-400" />Quick filter</div>
        <div className="border-r border-slate-200 px-2 py-2"><input aria-label="Filter by reference" value={quickFilter.reference} onChange={event => setQuickFilter(current => ({ ...current, reference: event.target.value }))} placeholder="Reference" className="min-h-8 w-full rounded-full bg-white px-3 py-2 text-[10px] font-black text-slate-700 outline-none ring-1 ring-slate-200 transition focus:ring-2 focus:ring-amber-300" /></div>
        {isStaff && <div className="border-r border-slate-200 px-2 py-2"><QuickEditMenu ariaLabel="Filter by requester" value="" values={quickFilter.requester} multiple placeholder="Requester" options={filterOptions.requester} disabled={schemaLoading || Boolean(schemaError)} showDots={false} searchable={true} onValuesChange={values => setQuickFilter(current => ({ ...current, requester: values }))} /></div>}
        {isStaff && <div className="border-r border-slate-200 px-2 py-2"><QuickEditMenu ariaLabel="Filter by requested for" value="" values={quickFilter.requestedFor} multiple placeholder="Requested for" options={filterOptions.requestedFor} disabled={schemaLoading || Boolean(schemaError)} showDots={false} searchable={true} onValuesChange={values => setQuickFilter(current => ({ ...current, requestedFor: values }))} /></div>}
        <div className="border-r border-slate-200 px-2 py-2"><input aria-label="Filter by lead type" value={quickFilter.leadType} onChange={event => setQuickFilter(current => ({ ...current, leadType: event.target.value }))} placeholder="Lead type" className="min-h-8 w-full rounded-full bg-white px-3 py-2 text-[10px] font-black text-slate-700 outline-none ring-1 ring-slate-200 transition focus:ring-2 focus:ring-amber-300" /></div>
        <div className="border-r border-slate-200 px-2 py-2"><QuickEditMenu ariaLabel="Filter by delivery" value="" values={quickFilter.delivery} multiple placeholder="Delivery" options={filterOptions.delivery} disabled={schemaLoading || Boolean(schemaError)} showDots={false} searchable={false} onValuesChange={values => setQuickFilter(current => ({ ...current, delivery: values }))} /></div>
        <div className="border-r border-slate-200 px-2 py-2"><QuickEditMenu ariaLabel="Filter by status" value="" values={quickFilter.status} multiple placeholder="Status" options={filterOptions.status.map(option => ({ ...option, ...leadFilterStatusTone(option.value) }))} triggerTone={quickFilter.status.length === 1 ? leadFilterStatusTone(quickFilter.status[0]).tone : undefined} disabled={schemaLoading || Boolean(schemaError)} showDots={true} searchable={false} onValuesChange={values => setQuickFilter(current => ({ ...current, status: values }))} /></div>
        <div className="flex items-center gap-1.5 px-2"><button type="button" onClick={clearFilter} className="flex-1 rounded-full bg-white px-3 py-2 text-[10px] font-black text-slate-500 ring-1 ring-slate-200">Clear</button><button type="submit" className="flex-1 rounded-full bg-slate-950 px-3 py-2 text-[10px] font-black text-white">Apply</button></div>
      </form></div>
      {error && <div role="alert" className="mt-4 flex flex-col justify-between gap-3 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 sm:flex-row sm:items-center"><span className="flex items-center gap-2"><AlertCircle className="h-4 w-4" />{error}</span><button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 font-black"><RefreshCw className="h-4 w-4" />Retry</button></div>}
      {editError && <div role="alert" className="border-b border-rose-100 bg-rose-50 px-5 py-3 text-xs font-bold text-rose-700">{editError}</div>}
      {isStaff && handlerError && <div role="alert" className="flex justify-between bg-amber-50 px-5 py-3 text-xs text-amber-900">{handlerError}<button type="button" onClick={() => setHandlerAttempt(value => value + 1)} className="font-black">Retry handlers</button></div>}
      <div className="overflow-x-auto"><table className="w-full min-w-[1500px] border-collapse text-left"><thead><tr className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">{['Ref','Created','Start date','Requester','Requested for','Lead type','Quantity','Delivery','Estimate','Status','Handler','Updated'].map(label => <th key={label} className="border-b border-slate-100 px-3 py-4">{label}</th>)}</tr></thead><tbody>{loading ? <tr><td colSpan={12} className="h-40 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-amber-500" /></td></tr> : items.length ? items.map(request => <tr key={request.id} onClick={() => setSelected(request)} tabIndex={0} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelected(request); } }} className={`cursor-pointer text-xs text-slate-600 transition hover:bg-amber-50/50 focus:bg-amber-50/50 focus:outline-none ${selected?.id === request.id ? 'bg-amber-50/60' : ''}`}><td className="border-b border-slate-100 px-3 py-4 font-mono text-[10px] font-bold text-slate-500">{request.reference.replace(/^LS-/i, '')}</td><td className="whitespace-nowrap border-b border-slate-100 px-3 py-4 font-semibold text-slate-600">{shortDate(request.created_at)}</td><td className="border-b border-slate-100 px-3 py-4 font-semibold text-slate-600">{shortDate(request.start_date)}</td><td className="border-b border-slate-100 px-3 py-4 font-black text-slate-800"><span className="block whitespace-nowrap">{request.requester_name || '—'}</span>{isStaff && request.requester_email && <span className="mt-0.5 block max-w-[170px] truncate text-[9px] font-semibold text-slate-400" title={request.requester_email}>{request.requester_email}</span>}</td><td className="border-b border-slate-100 px-3 py-4 font-black text-slate-800">{request.agent_name || '—'}</td><td className="max-w-[220px] truncate border-b border-slate-100 px-3 py-4 font-black text-slate-800">{request.lead_type || '—'}</td><td className="border-b border-slate-100 px-3 py-4 font-semibold text-slate-600">{isStaff ? <LeadQuantityEdit value={request.quantity} disabled={saving.includes(request.id)} onSave={value => saveEdit(request, 'quantity', value)} /> : request.quantity.toLocaleString()}</td><td className="border-b border-slate-100 px-3 py-4 font-semibold text-slate-600">{isStaff ? <QuickEditMenu ariaLabel={`Edit delivery for ${request.reference}`} value={request.delivery_option} placeholder={deliveryLabel(request.delivery_option)} options={filterOptions.delivery} showDots={false} disabled={schemaLoading || Boolean(schemaError) || saving.includes(request.id)} onChange={value => void saveEdit(request, 'delivery_option', value)} /> : (<span className="inline-flex whitespace-nowrap rounded-full bg-slate-50 px-3 py-2 text-[10px] font-black text-slate-600 ring-1 ring-slate-200">{deliveryLabel(request.delivery_option)}</span>)}</td><td className="border-b border-slate-100 px-3 py-4 font-black text-slate-800">{money(request.quantity * deliveryPrice(request.delivery_option))}</td><td className="border-b border-slate-100 px-3 py-4">{isStaff ? <QuickEditMenu ariaLabel={`Edit status for ${request.reference}`} value={request.status === 'complete' ? 'completed' : request.status === 'completed-incomplete' ? 'completed - incomplete' : request.status} placeholder={leadStatusMeta[request.status].label} options={filterOptions.status.map(option => ({ ...option, ...leadFilterStatusTone(option.value) }))} triggerTone={leadStatusMeta[request.status].tone} disabled={schemaLoading || Boolean(schemaError) || saving.includes(request.id)} onChange={value => void saveEdit(request, 'status', value)} /> : <LeadStatusBadge status={request.status} />}</td><td className="border-b border-slate-100 px-3 py-4">{isStaff ? <QuickEditMenu ariaLabel={`Edit handler for ${request.reference}`} value={request.handler_id} placeholder={request.handler_name || 'Unassigned'} options={handlerOptions} showDots={false} searchable disabled={!handlerOptions.length || saving.includes(request.id)} onChange={value => void saveEdit(request, 'assigned_ghl_user_id', value)} /> : (<span className="inline-flex whitespace-nowrap rounded-full bg-slate-50 px-3 py-2 text-[10px] font-black text-slate-600 ring-1 ring-slate-200">{request.handler_name || 'Unassigned'}</span>)}</td><td className="border-b border-slate-100 px-3 py-4 font-semibold text-slate-400">{shortDate(request.updated_at)}</td></tr>) : <tr><td colSpan={12} className="py-16 text-center"><FileText className="mx-auto h-7 w-7 text-slate-300" /><p className="mt-3 text-sm font-black text-slate-700">No matching requests</p><p className="mt-1 text-sm font-medium text-slate-400">Adjust or clear your filters.</p></td></tr>}</tbody></table></div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4"><p className="text-xs font-semibold text-slate-400">{loading ? 'Loading…' : `Showing ${total ? offset + 1 : 0}–${Math.min(offset + itemsReceived, total)} of ${total}`}</p><div className="flex items-center gap-2"><select aria-label="Rows per page" value={pageSize} onChange={event => { setPageSize(Number(event.target.value)); setPage(1); }} className="rounded-xl border border-slate-200 p-2 text-xs font-semibold">{[10,25,50,100].map(size => <option key={size} value={size}>{size} per page</option>)}</select><button type="button" disabled={loading || page <= 1} onClick={() => setPage(current => current - 1)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-black text-slate-600 disabled:opacity-40">Previous</button><span className="text-xs text-slate-500">Page {page} of {pageTotal}</span><button type="button" disabled={loading || page >= pageTotal} onClick={() => setPage(current => current + 1)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-black text-slate-600 disabled:opacity-40">Next</button></div></div>
    </section>{selected && <RequestDetail key={selected.id} request={selected} isStaff={isStaff} onSaved={load} onClose={() => setSelected(null)} />}</div>
  </div>;
};

const ServicesShell = ({ activeService, onServiceChange, children }: { activeService: ServiceId; onServiceChange: (service: ServiceId) => void; children: React.ReactNode }) => (
  <div className="space-y-5 animate-in fade-in duration-300">
    <section className="overflow-hidden rounded-[2rem] bg-slate-950 px-6 py-7 text-white shadow-lg sm:px-8"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-amber-300">PolicyHQ services</p><h1 className="mt-2 text-3xl font-black tracking-tight">One place to move your business forward.</h1><p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-400">Choose a service, submit a request, and track the work from one place.</p></div><span className="inline-flex items-center gap-2 self-start rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black sm:self-auto"><CheckCircle2 className="h-5 w-5 text-emerald-300" />Lead Servicing available</span></div></section>
    <ServiceCategoryNav active={activeService} onChange={onServiceChange} />
    {children}
  </div>
);

const ComingSoonService = ({ service }: { service: (typeof serviceCatalog)[number] }) => {
  const Icon = service.icon;
  return <section className="flex min-h-[24rem] items-center justify-center rounded-[2rem] border border-slate-100 bg-white p-8 text-center shadow-sm"><div className="max-w-lg"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-amber-300"><Icon className="h-6 w-6" /></span><p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-amber-600">Coming soon</p><h2 className="mt-2 text-2xl font-black text-slate-950">{service.label}</h2><p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{service.description}</p></div></section>;
};

export const ServicesPage: React.FC = () => {
  const { currentAgentId } = useAgentContext();
  const { isStaff } = useAuth();
  const [activeService, setActiveService] = useState<ServiceId>('lead-servicing');
  const [view, setView] = useState<ServiceView>('home');
  const [requestFilter, setRequestFilter] = useState<LeadServiceStatus | ''>('');
  const openRequests = (status: LeadServiceStatus | '' = '') => { setRequestFilter(status); setView('requests'); };
  const selectService = (service: ServiceId) => { setActiveService(service); setView('home'); };
  const shell = (content: React.ReactNode) => <ServicesShell activeService={activeService} onServiceChange={selectService}>{content}</ServicesShell>;
  if (activeService !== 'lead-servicing') {
    const service = serviceCatalog.find(item => item.id === activeService) || serviceCatalog[1];
    return shell(<ComingSoonService service={service} />);
  }
  const subNav = <LeadServiceNav active={view === 'home' ? 'request' : view} onChange={setView} />;
  if (view === 'request') return shell(<>{subNav}<LeadRequestContinuous onBack={() => setView('home')} /></>);
  if (view === 'dashboard') return shell(<>{subNav}{currentAgentId ? <LeadServiceDashboard agentId={currentAgentId} isStaff={isStaff} onNewRequest={() => setView('request')} onSeeAll={openRequests} /> : <div role="alert" className="rounded-2xl bg-amber-50 p-5 text-sm font-bold text-amber-900">Your agent profile could not be identified.</div>}</>);
  if (view === 'requests') return shell(<>{subNav}{currentAgentId ? <LeadServiceList agentId={currentAgentId} isStaff={isStaff} initialStatus={requestFilter} onNewRequest={() => setView('request')} /> : <div role="alert" className="rounded-2xl bg-amber-50 p-5 text-sm font-bold text-amber-900">Your agent profile could not be identified.</div>}</>);
  return shell(<>{subNav}<section className="overflow-hidden rounded-[2rem] border border-amber-200 bg-white shadow-sm"><div className="grid lg:grid-cols-[minmax(0,1fr)_20rem]"><div className="p-6 sm:p-8"><div className="flex gap-2"><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black uppercase text-emerald-700">Available</span><span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black uppercase text-amber-700">TCPA support</span></div><span className="mt-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-amber-300"><PhoneOff className="h-6 w-6" /></span><h2 className="mt-5 text-2xl font-black text-slate-950">Lead Servicing Request</h2><p className="mt-2 max-w-xl text-sm font-semibold leading-6 text-slate-500">Prepare aged leads for outreach with federal and applicable state DNC screening, opt-out suppression, phone-type identification, and known-litigator filtering.</p><div className="mt-6 flex flex-wrap gap-2">{['DNC screening','Litigator removal','Line-type ID','CSV or mailer'].map(item => <span key={item} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-black text-slate-600">{item}</span>)}</div><button type="button" onClick={() => setView('request')} className="mt-7 inline-flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-3.5 text-sm font-black text-slate-950 shadow-lg shadow-amber-200 hover:-translate-y-0.5 hover:bg-amber-300">Start a request<ArrowRight className="h-4 w-4" /></button></div><div className="flex flex-col justify-between bg-slate-50 p-6"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Delivery options</p><div className="mt-4 space-y-3">{plans.map(item => <div key={item.id} className="flex items-center justify-between rounded-xl bg-white px-3 py-3 ring-1 ring-slate-100"><span className="text-xs font-black text-slate-600">{item.name}</span><span className="text-sm font-black text-slate-950">{money(item.price)}<small className="text-slate-400"> / lead</small></span></div>)}</div></div><div className="mt-6 rounded-2xl bg-amber-50 p-4"><CircleDollarSign className="h-5 w-5 text-amber-600" /><p className="mt-2 text-sm font-black text-amber-950">Clear cost estimate</p><p className="mt-1 text-xs font-semibold leading-5 text-amber-800">See the estimated charge before you submit.</p></div></div></div></section></>);
};

export default ServicesPage;
