import React, { useEffect, useState } from 'react';
import { Check, Loader2, Pencil, X } from 'lucide-react';

export const LeadQuantityEdit = ({ value, disabled, onSave }: { value: number; disabled: boolean; onSave: (value: number) => Promise<boolean> }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  useEffect(() => { if (!editing) setDraft(String(value)); }, [value, editing]);
  const valid = /^\d+$/.test(draft) && Number.isSafeInteger(Number(draft));
  const save = async () => {
    if (!valid || disabled) return;
    if (Number(draft) === value || await onSave(Number(draft))) setEditing(false);
  };
  return <div onClick={event => event.stopPropagation()} onKeyDown={event => event.stopPropagation()}>
    {editing ? <div className="flex items-center gap-1">
      <input autoFocus aria-label="Lead quantity" inputMode="numeric" value={draft} disabled={disabled} aria-invalid={!valid}
        onChange={event => setDraft(event.target.value)}
        onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); void save(); } if (event.key === 'Escape') setEditing(false); }}
        className="w-20 rounded-full px-3 py-2 text-[10px] font-black outline-none ring-1 ring-slate-200 focus:ring-amber-300" />
      <button type="button" aria-label="Save quantity" disabled={!valid || disabled} onClick={() => void save()} className="rounded-full p-2 text-emerald-600 disabled:opacity-40">{disabled ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}</button>
      <button type="button" aria-label="Cancel quantity edit" disabled={disabled} onClick={() => setEditing(false)} className="rounded-full p-2 text-slate-400"><X className="h-3 w-3" /></button>
    </div> : <button type="button" aria-label="Edit quantity" disabled={disabled} onClick={() => setEditing(true)} className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-[10px] font-black text-slate-700 ring-1 ring-slate-200 hover:ring-amber-300 disabled:opacity-50">{value.toLocaleString()}<Pencil className="h-3 w-3 text-slate-400" /></button>}
    {editing && !valid && <p className="mt-1 text-[9px] text-rose-600">Enter a non-negative whole number.</p>}
  </div>;
};
